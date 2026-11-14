# Load Balancer + Auto Scaling — paso a paso

Esta guía agrega un **Application Load Balancer (ALB)** y un **Auto Scaling
Group (ASG)** delante de la app de Carta Digital, sin tocar la base de datos
real ni causar downtime en el proceso.

## 1. Arquitectura actual (antes)

```
Internet → Cloudflare Worker (WAF + rate limit) → EC2 única (52.0.165.26)
                                                     ├── app-prod (Docker, puerto 80)
                                                     └── PostgreSQL nativo (127.0.0.1:5432)
```

Una sola instancia hace de app **y** de base de datos. Si se cae esa
instancia, se cae todo el sitio. No hay forma de absorber más tráfico que el
que aguante esa única máquina.

## 2. Arquitectura objetivo (después)

```
Internet → Cloudflare Worker → ALB (2 zonas de disponibilidad)
                                 ├── EC2 actual (52.0.165.26) — sigue siendo la BD + 1 réplica de la app
                                 ├── EC2 nueva (Auto Scaling)  — solo app, conecta a la BD por IP privada
                                 └── EC2 nueva (Auto Scaling)  — solo app, conecta a la BD por IP privada
                                           ↓ (todas, por la red privada de la VPC)
                                 PostgreSQL en 52.0.165.26 (172.31.27.117:5432) — sigue siendo la ÚNICA base de datos
```

Puntos clave:

- **La base de datos NO se clona ni se mueve.** Sigue viviendo en la
  instancia actual (52.0.165.26 / IP privada `172.31.27.117`). Las instancias
  nuevas del Auto Scaling Group corren *solo* el contenedor de la app y se
  conectan a esa misma base por la red privada de la VPC.
- **Las sesiones ya están en Postgres** (`connect-pg-simple`, no en memoria),
  así que no hace falta "sticky sessions" en el ALB: a cualquier instancia
  que te toque, tu sesión es la misma, porque todas leen de la misma base.
- La instancia actual queda registrada en el mismo Target Group que las
  nuevas — sigue sirviendo tráfico real desde el primer momento, cero
  downtime durante el cambio.

## 3. Qué NO cubre esta guía (a propósito, para no disparar el alcance)

- Migrar la base de datos a RDS (sería el paso natural "correcto" a futuro,
  pero no es necesario para cumplir con load balancer + auto scaling).
- HTTPS en el origen: el Cloudflare Worker ya termina TLS en el borde: el
  ALB sigue hablando HTTP puro puertas adentro, igual que hoy con la
  instancia única.
- Adaptar Jenkins para desplegar a varias instancias a la vez: las
  instancias del ASG se autoconfiguran solas al arrancar (ver el script);
  Jenkins sigue desplegando contra la instancia original como siempre.

## 4. Antes de empezar

Necesitás:

- Acceso a la consola de AWS de la cuenta donde vive `52.0.165.26` (la
  cuenta donde ya existe esa instancia).
- La contraseña real del usuario `carta_app` en Postgres y el `SESSION_SECRET`
  que ya usa producción (están en `.env.prod` de la instancia actual —
  revisalo por SSH si no los tenés a mano: `cat /opt/carta-digital/.env.prod`
  o donde esté desplegado).
- El nombre del **key pair** de AWS asociado a `/tmp/test.pem` (probablemente
  se llama `test`, pero conviene confirmarlo en EC2 → Network & Security →
  Key Pairs antes de correr el script).

Datos reales de la infraestructura actual (ya completados en el script,
tomados de los metadatos de la instancia — no hace falta volver a
averiguarlos):

| Dato | Valor |
|---|---|
| Región | `us-east-1` |
| VPC | `vpc-0952f484a5b3e1941` |
| Instancia actual | `i-0d0ad13d0090db9ac` (52.0.165.26) |
| IP privada (= host de la BD) | `172.31.27.117` |
| Security group actual | `sg-014388a03158936ad` |
| AMI (Amazon Linux 2023) | `ami-0567589d25e06853e` |
| Tipo de instancia | `t3.micro` |

## 5. Paso a paso

### Paso 1 — Abrir AWS CloudShell

En la consola de AWS, arriba a la derecha, el ícono de terminal (`>_`). Ya
viene con `aws-cli` instalado y autenticado contra la cuenta — no hace falta
configurar credenciales.

### Paso 2 — Subir el script

Opción rápida: copiá el contenido de
[`scripts/aws/setup-load-balancer-asg.sh`](../scripts/aws/setup-load-balancer-asg.sh)
y pegalo en CloudShell con:

```bash
cat > setup-load-balancer-asg.sh << 'SCRIPT_EOF'
# (pegar acá todo el contenido del archivo)
SCRIPT_EOF
chmod +x setup-load-balancer-asg.sh
```

(O subilo directo con el botón "Upload file" de CloudShell.)

### Paso 3 — Definir las variables secretas (nunca van en el repo)

```bash
export DB_PASSWORD="la-contraseña-real-de-carta_app"
export SESSION_SECRET="el-session-secret-real-de-produccion"
```

Si el key pair no se llama `test`, agregá también:

```bash
export KEY_NAME="nombre-real-del-key-pair"
```

### Paso 4 — Correr el script

```bash
./setup-load-balancer-asg.sh
```

Tarda uno o dos minutos. Al final imprime algo así:

```
ALB DNS:        carta-digital-alb-123456789.us-east-1.elb.amazonaws.com
Target Group:   arn:aws:elasticloadbalancing:...
Security groups: ALB=sg-xxxx  APP=sg-yyyy
```

Guardá ese **ALB DNS** — lo necesitás en el paso 6.

### Paso 5 — Habilitar que Postgres acepte conexiones de red (manual)

Por SSH a la instancia actual (52.0.165.26):

```bash
ssh -i test.pem ec2-user@52.0.165.26
sudo -u postgres psql -c "SHOW config_file;"   # para ubicar postgresql.conf
```

En `postgresql.conf`, cambiar:

```
listen_addresses = 'localhost'
```

por:

```
listen_addresses = 'localhost,172.31.27.117'
```

En `pg_hba.conf`, agregar una línea para que solo la red privada de la VPC
(no todo internet) pueda conectarse:

```
host    carta_digital    carta_app    172.31.0.0/16    scram-sha-256
```

(ajustá el rango `172.31.0.0/16` al CIDR real de la VPC si es distinto —
`aws ec2 describe-vpcs --vpc-ids vpc-0952f484a5b3e1941` lo muestra).

Reiniciar Postgres:

```bash
sudo systemctl restart postgresql
```

Verificar que la app de esa misma instancia siga funcionando después del
reinicio (`curl http://127.0.0.1/health`) antes de seguir.

### Paso 6 — Apuntar el Worker de Cloudflare al Load Balancer

En `cloudflare-worker/security-proxy.js`, cambiar:

```js
const ORIGIN = "http://ec2-52-0-165-26.compute-1.amazonaws.com";
```

por el DNS del ALB que imprimió el script:

```js
const ORIGIN = "http://carta-digital-alb-123456789.us-east-1.elb.amazonaws.com";
```

Pegar el archivo actualizado en el dashboard de Cloudflare (Workers & Pages
→ `carta-digital-security` → Edit code → pegar → Deploy) — ver nota del
README de `cloudflare-worker/`, el deploy de esta parte siempre es manual.

### Paso 7 — Verificar

```bash
# El ALB debe responder igual que la instancia original:
curl -s http://<ALB_DNS>/health
curl -s http://<ALB_DNS>/api/restaurantes

# Ver el estado de salud de los targets (debería haber 3: la instancia
# original + 2 nuevas del ASG, todas "healthy" después de 1-2 minutos):
aws elbv2 describe-target-health --region us-east-1 \
  --target-group-arn "$(aws elbv2 describe-target-groups --region us-east-1 \
    --names carta-digital-tg --query 'TargetGroups[0].TargetGroupArn' --output text)"
```

Probar que de verdad escala/resiste la caída de una instancia: terminar una
instancia del ASG a mano (no la original) y confirmar que el sitio sigue
respondiendo sin cortes mientras el ASG levanta un reemplazo automáticamente.

## 6. Operación del día a día (si algo se cae)

Para no tener que escribir comandos de AWS CLI en el momento en que algo
falla, usar [`scripts/aws/runbook.sh`](../scripts/aws/runbook.sh) — se sube a
CloudShell igual que el script de setup, y después es un comando por tarea:

```bash
chmod +x runbook.sh
./runbook.sh estado                 # ¿está todo sano?
./runbook.sh reiniciar-app          # la app anda colgada -> reinicia el contenedor
./runbook.sh reemplazar-instancias  # algo anda mal a nivel instancia -> las reemplaza sin cortar el servicio
./runbook.sh parar                  # apaga la capacidad extra (la instancia principal NUNCA se apaga con esto)
./runbook.sh iniciar                # vuelve a prender la capacidad extra
./runbook.sh logs                   # ver los últimos logs de la app
```

`reiniciar-app` y `logs` entran por SSH a la instancia principal, así que hay
que subir también la key (`test.pem`) a CloudShell una vez (`chmod 400
test.pem` después de subirla) — CloudShell guarda los archivos de una sesión
a la otra en `$HOME`, no hace falta resubirla cada vez.

## 7. Rollback / limpieza

Si hay que volver atrás (por ejemplo, durante pruebas):

```bash
aws autoscaling delete-auto-scaling-group --region us-east-1 \
  --auto-scaling-group-name carta-digital-asg --force-delete
aws elbv2 delete-load-balancer --region us-east-1 --load-balancer-arn "<ALB_ARN>"
aws elbv2 delete-target-group --region us-east-1 --target-group-arn "<TG_ARN>"
aws ec2 delete-launch-template --region us-east-1 --launch-template-name carta-digital-lt
aws ec2 delete-security-group --region us-east-1 --group-id "<APP_SG_ID>"
aws ec2 delete-security-group --region us-east-1 --group-id "<ALB_SG_ID>"
```

Y revertir el `ORIGIN` del Worker de Cloudflare al hostname original de
`52.0.165.26`.

## 8. Qué queda pendiente para una versión "producción real"

- Mover Postgres a RDS (Multi-AZ) para que la base de datos también tenga
  alta disponibilidad, no solo la app.
- HTTPS extremo a extremo (hoy el TLS lo termina Cloudflare en el borde).
- Certificado ACM + listener HTTPS:443 en el propio ALB.
- Que Jenkins, en vez de desplegar por SSH a una sola IP fija, publique una
  nueva versión del Launch Template y dispare un *instance refresh* del ASG.
