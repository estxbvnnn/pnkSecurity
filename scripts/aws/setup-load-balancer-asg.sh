#!/bin/bash
# =============================================================================
# Carta Digital — Load Balancer + Auto Scaling Group para el tier de la app.
#
# Pensado para correr DESDE AWS CLOUDSHELL (ya viene con aws-cli v2 y las
# credenciales de la cuenta, no hace falta instalar ni configurar nada).
#
# QUÉ HACE (ver docs/infraestructura-load-balancer-auto-scaling.md para el
# detalle completo paso a paso y el porqué de cada decisión):
#   1. Crea un security group para el ALB (80/443 desde internet).
#   2. Crea un security group para las instancias de la app (80 solo desde
#      el ALB; 22 para poder entrar por SSH).
#   3. Abre el puerto 5432 (Postgres) en el security group de la instancia
#      ACTUAL (52.0.165.26) para que las nuevas instancias de la app puedan
#      conectarse a la base de datos real — esa instancia sigue siendo la
#      única que corre Postgres, nunca se clona la base de datos.
#   4. Crea un Target Group (HTTP:80, healthcheck en /health) y registra en
#      él la instancia actual (así el ALB ya sirve tráfico real desde el
#      primer momento, sin downtime).
#   5. Crea el Application Load Balancer, con su listener HTTP:80.
#   6. Crea un Launch Template: cada instancia nueva, al arrancar, instala
#      Docker, clona el repo (rama carta-digital-nodejs) y levanta SOLO el
#      contenedor de la app (app-prod), apuntando su Postgres a la IP
#      privada de la instancia actual — NUNCA levanta su propio Postgres.
#   7. Crea el Auto Scaling Group (min 1 / deseadas 2 / max 4, repartidas en
#      2 zonas de disponibilidad), con una política de scaling por CPU.
#
# Al final imprime el DNS del Load Balancer. Ese DNS es lo que hay que poner
# como ORIGIN en cloudflare-worker/security-proxy.js (paso manual, ver doc).
#
# Variables que hay que exportar ANTES de correr este script (nunca se
# hardcodean acá ni se suben al repo):
#   export DB_PASSWORD="la contraseña real del usuario carta_app en Postgres"
#   export SESSION_SECRET="el mismo SESSION_SECRET que ya usa producción"
# =============================================================================
set -euo pipefail

: "${DB_PASSWORD:?Definí DB_PASSWORD antes de correr el script: export DB_PASSWORD='...'}"
: "${SESSION_SECRET:?Definí SESSION_SECRET antes de correr el script: export SESSION_SECRET='...'}"

# ------------------------------------------------------------------ Config
REGION="${REGION:-us-east-1}"
VPC_ID="${VPC_ID:-vpc-0952f484a5b3e1941}"
EXISTING_INSTANCE_ID="${EXISTING_INSTANCE_ID:-i-0d0ad13d0090db9ac}"   # 52.0.165.26
EXISTING_SG_ID="${EXISTING_SG_ID:-sg-014388a03158936ad}"
# La base de datos ya no vive en la instancia principal -- migrada a RDS
# (ver scripts/aws/migrate-to-rds.sh). Borrar la instancia principal ya NO
# afecta a la base de datos.
DB_HOST="${DB_HOST:-carta-digital-db.cbeyymw84rq1.us-east-1.rds.amazonaws.com}"
AMI_ID="${AMI_ID:-ami-0567589d25e06853e}"                              # misma AMI que la instancia actual (Amazon Linux 2023)
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"
KEY_NAME="${KEY_NAME:-test}"                                           # nombre del key pair en AWS -- verificar/ajustar
GITHUB_REPO="${GITHUB_REPO:-https://github.com/estxbvnnn/pnkSecurity.git}"
GITHUB_BRANCH="${GITHUB_BRANCH:-carta-digital-nodejs}"
NAME_PREFIX="${NAME_PREFIX:-carta-digital}"

echo "== Región: $REGION | VPC: $VPC_ID =="

# --------------------------------------------------- 1) Subnets (2+ AZ)
echo "== Buscando subnets por defecto en al menos 2 zonas de disponibilidad =="
SUBNET_IDS=$(aws ec2 describe-subnets --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
  --query 'Subnets[].SubnetId' --output text)
SUBNET_ARRAY=($SUBNET_IDS)
if [ "${#SUBNET_ARRAY[@]}" -lt 2 ]; then
  echo "ERROR: se encontraron menos de 2 subnets por defecto en $VPC_ID. Revisá manualmente con:" >&2
  echo "  aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID" >&2
  exit 1
fi
echo "Subnets: ${SUBNET_ARRAY[*]}"

# --------------------------------------------------- 2) Security groups
echo "== Security group del ALB (80/443 desde internet) =="
ALB_SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=group-name,Values=${NAME_PREFIX}-alb-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
if [ "$ALB_SG_ID" = "None" ] || [ -z "$ALB_SG_ID" ]; then
  ALB_SG_ID=$(aws ec2 create-security-group --region "$REGION" \
    --group-name "${NAME_PREFIX}-alb-sg" --description "ALB publico - Carta Digital" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$ALB_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$ALB_SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0
fi
echo "ALB_SG_ID=$ALB_SG_ID"

echo "== Security group de las instancias de la app (80 solo desde el ALB, 22 para SSH) =="
APP_SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=group-name,Values=${NAME_PREFIX}-app-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
if [ "$APP_SG_ID" = "None" ] || [ -z "$APP_SG_ID" ]; then
  APP_SG_ID=$(aws ec2 create-security-group --region "$REGION" \
    --group-name "${NAME_PREFIX}-app-sg" --description "Instancias de app (ASG) - Carta Digital" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$APP_SG_ID" --protocol tcp --port 80 --source-group "$ALB_SG_ID"
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$APP_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0
fi
echo "APP_SG_ID=$APP_SG_ID"

# Ya no hace falta abrir 5432 en la instancia principal -- la base de datos
# vive en RDS (ver scripts/aws/migrate-to-rds.sh), que tiene su propio
# security group.

# --------------------------------------------------- 3) Target Group
echo "== Target Group (HTTP:80, healthcheck /health) =="
TG_ARN=$(aws elbv2 describe-target-groups --region "$REGION" --names "${NAME_PREFIX}-tg" \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "None")
if [ "$TG_ARN" = "None" ] || [ -z "$TG_ARN" ]; then
  TG_ARN=$(aws elbv2 create-target-group --region "$REGION" \
    --name "${NAME_PREFIX}-tg" --protocol HTTP --port 80 --vpc-id "$VPC_ID" \
    --health-check-path /health --health-check-interval-seconds 15 \
    --healthy-threshold-count 2 --unhealthy-threshold-count 3 --target-type instance \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
fi
echo "TG_ARN=$TG_ARN"

echo "== Registrando la instancia actual en el target group (cero downtime) =="
aws elbv2 register-targets --region "$REGION" --target-group-arn "$TG_ARN" \
  --targets Id="$EXISTING_INSTANCE_ID"

# --------------------------------------------------- 4) ALB + Listener
echo "== Application Load Balancer =="
ALB_ARN=$(aws elbv2 describe-load-balancers --region "$REGION" --names "${NAME_PREFIX}-alb" \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "None")
if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer --region "$REGION" \
    --name "${NAME_PREFIX}-alb" --subnets "${SUBNET_ARRAY[@]}" \
    --security-groups "$ALB_SG_ID" --scheme internet-facing --type application \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
fi
ALB_DNS=$(aws elbv2 describe-load-balancers --region "$REGION" --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' --output text)
echo "ALB_ARN=$ALB_ARN"
echo "ALB_DNS=$ALB_DNS"

aws elbv2 create-listener --region "$REGION" --load-balancer-arn "$ALB_ARN" \
  --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn="$TG_ARN" 2>/dev/null || \
  echo "  (el listener HTTP:80 ya existia, sigo)"

# --------------------------------------------------- 5) Launch Template
echo "== Launch Template (user-data arma el contenedor de la app al arrancar) =="
USER_DATA_FILE=$(mktemp)
cat > "$USER_DATA_FILE" <<USERDATA
#!/bin/bash
set -e
dnf install -y docker git
systemctl enable --now docker
# "dnf install docker" instala el motor pero NO el plugin "docker compose"
# (no esta en los repos de Amazon Linux 2023) -- se instala el binario del
# plugin a mano, igual que en la instancia original.
mkdir -p /usr/local/lib/docker/cli-plugins
curl -sL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
rm -rf /opt/carta-digital
git clone --branch "$GITHUB_BRANCH" "$GITHUB_REPO" /opt/carta-digital
cd /opt/carta-digital
cat > .env.prod <<ENVEOF
NODE_ENV=production
PORT=80
PGHOST=$DB_HOST
PGPORT=5432
PGDATABASE=carta_digital
PGUSER=carta_app
PGPASSWORD=$DB_PASSWORD
PGSSL=true
SESSION_SECRET=$SESSION_SECRET
ENVEOF
# docker-compose.yml tambien define los servicios de Desarrollo/QA, que
# usan .env.dev/.env.qa via "env_file:" -- "docker compose" valida el
# archivo COMPLETO al arrancar, aunque solo se pida levantar app-prod, asi
# que si esos archivos no existen falla igual. Alcanza con que existan
# (no hace falta que tengan contenido real, esos servicios nunca arrancan).
touch .env.dev .env.qa
docker compose up -d --build app-prod
USERDATA

LT_NAME="${NAME_PREFIX}-lt"
aws ec2 describe-launch-templates --region "$REGION" --launch-template-names "$LT_NAME" >/dev/null 2>&1 && LT_EXISTS=1 || LT_EXISTS=0
LT_DATA=$(cat <<JSON
{
  "ImageId": "$AMI_ID",
  "InstanceType": "$INSTANCE_TYPE",
  "KeyName": "$KEY_NAME",
  "SecurityGroupIds": ["$APP_SG_ID"],
  "UserData": "$(base64 -w0 "$USER_DATA_FILE")"
}
JSON
)
if [ "$LT_EXISTS" = "1" ]; then
  aws ec2 create-launch-template-version --region "$REGION" --launch-template-name "$LT_NAME" \
    --launch-template-data "$LT_DATA" --source-version '$Latest' >/dev/null
  aws ec2 modify-launch-template --region "$REGION" --launch-template-name "$LT_NAME" \
    --default-version '$Latest' >/dev/null
else
  aws ec2 create-launch-template --region "$REGION" --launch-template-name "$LT_NAME" \
    --launch-template-data "$LT_DATA" >/dev/null
fi
rm -f "$USER_DATA_FILE"
echo "Launch Template listo: $LT_NAME"

# --------------------------------------------------- 6) Auto Scaling Group
echo "== Auto Scaling Group (min 1 / deseadas 2 / max 4) =="
ASG_NAME="${NAME_PREFIX}-asg"
if aws autoscaling describe-auto-scaling-groups --region "$REGION" --auto-scaling-group-names "$ASG_NAME" \
    --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text 2>/dev/null | grep -q "$ASG_NAME"; then
  echo "  (el ASG ya existe, no lo recreo)"
else
  aws autoscaling create-auto-scaling-group --region "$REGION" \
    --auto-scaling-group-name "$ASG_NAME" \
    --launch-template "LaunchTemplateName=$LT_NAME,Version=\$Latest" \
    --min-size 1 --max-size 4 --desired-capacity 2 \
    --vpc-zone-identifier "$(IFS=,; echo "${SUBNET_ARRAY[*]}")" \
    --target-group-arns "$TG_ARN" \
    --health-check-type ELB --health-check-grace-period 600

  aws autoscaling put-scaling-policy --region "$REGION" \
    --auto-scaling-group-name "$ASG_NAME" \
    --policy-name "${NAME_PREFIX}-cpu-target-tracking" \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
      "TargetValue": 50.0
    }' >/dev/null
fi

echo ""
echo "============================================================================="
echo " LISTO. Resumen:"
echo "   ALB DNS:        $ALB_DNS"
echo "   Target Group:   $TG_ARN"
echo "   Security groups: ALB=$ALB_SG_ID  APP=$APP_SG_ID"
echo ""
echo " PRÓXIMO PASO MANUAL (no lo hace este script):"
echo "   1. Habilitar que Postgres en la instancia actual acepte conexiones de red"
echo "      (listen_addresses + pg_hba.conf) -- ver docs/infraestructura-load-balancer-auto-scaling.md"
echo "   2. Cambiar ORIGIN en cloudflare-worker/security-proxy.js a: http://$ALB_DNS"
echo "      y volver a pegarlo en el dashboard de Cloudflare."
echo "============================================================================="
