#!/bin/bash
# =============================================================================
# Carta Digital — crear la instancia RDS PostgreSQL (correr en AWS CloudShell).
#
# Hoy la base de datos vive SOLO en la instancia principal (52.0.165.26): si
# esa instancia se borra, se cae todo el sitio aunque el Load Balancer y el
# Auto Scaling sigan funcionando. Este script crea una base de datos
# administrada (RDS) que es un recurso aparte, independiente de esa
# instancia -- borrar la instancia principal ya NO se lleva la base de datos.
#
# Este script SOLO crea la instancia RDS vacía (y el security group/subnet
# group que necesita). La migración real de los datos (pg_dump + restore)
# se hace aparte, desde la instancia principal (necesita estar dentro de la
# VPC para llegar a RDS) -- ver docs/infraestructura-load-balancer-auto-scaling.md.
#
# Variable que hay que exportar ANTES de correr este script (nunca se
# hardcodea ni se sube al repo):
#   export RDS_MASTER_PASSWORD="una contraseña nueva, solo para el usuario admin de RDS"
# =============================================================================
set -euo pipefail

: "${RDS_MASTER_PASSWORD:?Definí RDS_MASTER_PASSWORD antes de correr el script: export RDS_MASTER_PASSWORD='...'}"

REGION="${REGION:-us-east-1}"
VPC_ID="${VPC_ID:-vpc-0952f484a5b3e1941}"
APP_SG_ID="${APP_SG_ID:-sg-0261008102300ef2c}"          # instancias de la app (ASG)
EXISTING_SG_ID="${EXISTING_SG_ID:-sg-014388a03158936ad}" # instancia principal -- necesario para migrar los datos
DB_INSTANCE_ID="${DB_INSTANCE_ID:-carta-digital-db}"
DB_MASTER_USER="${DB_MASTER_USER:-carta_admin}"
INSTANCE_CLASS="${INSTANCE_CLASS:-db.t3.micro}"
ALLOCATED_STORAGE="${ALLOCATED_STORAGE:-20}"
MULTI_AZ="${MULTI_AZ:-false}"   # true = tambien tolera que se caiga la propia RDS (cuesta ~el doble)
NAME_PREFIX="carta-digital"

echo "== Buscando subnets de la VPC (todas las zonas) =="
SUBNET_IDS=$(aws ec2 describe-subnets --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
  --query 'Subnets[].SubnetId' --output text)
echo "Subnets: $SUBNET_IDS"

echo "== Security group de RDS (5432 solo desde las instancias de la app y la principal) =="
RDS_SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=group-name,Values=${NAME_PREFIX}-rds-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
if [ "$RDS_SG_ID" = "None" ] || [ -z "$RDS_SG_ID" ]; then
  RDS_SG_ID=$(aws ec2 create-security-group --region "$REGION" \
    --group-name "${NAME_PREFIX}-rds-sg" --description "RDS Postgres - Carta Digital" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$RDS_SG_ID" \
    --protocol tcp --port 5432 --source-group "$APP_SG_ID"
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$RDS_SG_ID" \
    --protocol tcp --port 5432 --source-group "$EXISTING_SG_ID"
fi
echo "RDS_SG_ID=$RDS_SG_ID"

echo "== DB Subnet Group =="
aws rds describe-db-subnet-groups --region "$REGION" --db-subnet-group-name "${NAME_PREFIX}-subnet-group" \
  >/dev/null 2>&1 || \
  aws rds create-db-subnet-group --region "$REGION" \
    --db-subnet-group-name "${NAME_PREFIX}-subnet-group" \
    --db-subnet-group-description "Carta Digital RDS subnets" \
    --subnet-ids $SUBNET_IDS >/dev/null

echo "== Creando la instancia RDS (tarda varios minutos) =="
# --multi-az es una bandera booleana en aws-cli (--multi-az / --no-multi-az),
# no un parametro que reciba "true"/"false" como valor.
if [ "$MULTI_AZ" = "true" ]; then MULTI_AZ_FLAG="--multi-az"; else MULTI_AZ_FLAG="--no-multi-az"; fi

if aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$DB_INSTANCE_ID" >/dev/null 2>&1; then
  echo "  (la instancia RDS ya existe, no la recreo)"
else
  aws rds create-db-instance --region "$REGION" \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --engine postgres --engine-version 17.11 \
    --db-instance-class "$INSTANCE_CLASS" \
    --allocated-storage "$ALLOCATED_STORAGE" \
    --master-username "$DB_MASTER_USER" \
    --master-user-password "$RDS_MASTER_PASSWORD" \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --db-subnet-group-name "${NAME_PREFIX}-subnet-group" \
    --no-publicly-accessible \
    "$MULTI_AZ_FLAG" \
    --backup-retention-period 7 \
    --storage-type gp3 >/dev/null
fi

echo "Esperando a que la instancia quede disponible (puede tardar 5-10 minutos)..."
aws rds wait db-instance-available --region "$REGION" --db-instance-identifier "$DB_INSTANCE_ID"

RDS_ENDPOINT=$(aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$DB_INSTANCE_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)

echo ""
echo "============================================================================="
echo " LISTO. RDS_ENDPOINT=$RDS_ENDPOINT"
echo ""
echo " PRÓXIMO PASO (no lo hace este script): migrar los datos reales desde la"
echo " instancia principal con pg_dump/psql, y después apuntar PGHOST de todas las"
echo " instancias (incluida la plantilla del Auto Scaling) a este endpoint."
echo " Ver docs/infraestructura-load-balancer-auto-scaling.md."
echo "============================================================================="
