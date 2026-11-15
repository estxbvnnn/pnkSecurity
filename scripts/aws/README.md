# Scripts de AWS — guía rápida

Para correr en **AWS CloudShell**. Documentación completa:
[`docs/infraestructura-load-balancer-auto-scaling.md`](../../docs/infraestructura-load-balancer-auto-scaling.md)
y el manual en PDF (`docs/manual-implementacion.pdf`). Esto es solo el resumen
para llegar y usar.

## Orden de ejecución (primera vez)

```bash
git clone --branch carta-digital-nodejs --single-branch \
  https://github.com/estxbvnnn/pnkSecurity.git
cd pnkSecurity/scripts/aws
chmod +x *.sh

# 1) Base de datos administrada (RDS) -- tarda 5-10 min
export RDS_MASTER_PASSWORD="elegí-una-contraseña-nueva"
./migrate-to-rds.sh
# anotar el RDS_ENDPOINT que imprime al final

# 2) Load Balancer + Auto Scaling Group
export DB_PASSWORD="contraseña real del usuario carta_app"
export SESSION_SECRET="el SESSION_SECRET real de produccion"
./setup-load-balancer-asg.sh
# anotar el ALB_DNS que imprime al final
```

Después de correr `setup-load-balancer-asg.sh`:

1. Migrar los datos reales (`pg_dump` / `pg_restore` desde la instancia que
   tiene la base de datos original hacia el `RDS_ENDPOINT`) — comandos
   exactos en la guía completa, sección 5 / Paso 2.
2. Pegar el `ALB_DNS` como `ORIGIN` en `cloudflare-worker/security-proxy.js`
   y volver a pegarlo en el dashboard de Cloudflare (Workers & Pages →
   `carta-digital-security` → Edit code → Deploy) — paso manual, no hay
   forma de automatizarlo desde acá.

## Operación del día a día

```bash
./runbook.sh estado                 # ¿está todo sano?
./runbook.sh reiniciar-app          # la app se cuelga -> reinicia el contenedor
./runbook.sh reemplazar-instancias  # problema a nivel instancia -> reemplazo sin downtime
./runbook.sh parar                  # apaga la capacidad extra (no la instancia principal)
./runbook.sh iniciar                # vuelve a prender la capacidad extra
./runbook.sh logs                   # últimos logs de la app
```

## ⚠️ Si subís estos scripts a OTRO lab / otra cuenta de AWS

Los scripts **no tienen bugs** — los valores por defecto que traen adentro
(`VPC_ID`, `EXISTING_INSTANCE_ID`, `EXISTING_SG_ID`, el endpoint de RDS, el
nombre del ALB) son los de **esta** cuenta puntual, porque los tomé de la
instancia real que ya existía. En una cuenta/lab distinto no van a existir
esos recursos, así que hay que **sobreescribirlos con variables de entorno**
antes de correr el script (ningún archivo necesita editarse):

```bash
export VPC_ID="vpc-xxxxxxxx"                 # VPC de la cuenta nueva
export EXISTING_INSTANCE_ID="i-xxxxxxxx"     # instancia que ya corre la app en esa cuenta
export EXISTING_SG_ID="sg-xxxxxxxx"          # security group de esa instancia
export AMI_ID="ami-xxxxxxxx"                 # AMI base (Amazon Linux 2023) de esa región
export DB_HOST="<endpoint-rds-nuevo>"        # solo necesario si NO corrés migrate-to-rds.sh de nuevo
```

Si es una cuenta totalmente nueva (sin ninguna instancia corriendo todavía),
primero hay que desplegar la app una vez por el flujo normal (Jenkins →
una instancia) para tener algo que registrar como instancia principal;
estos scripts agregan Load Balancer + Auto Scaling + RDS **sobre** una app
que ya existe, no la crean de cero.
