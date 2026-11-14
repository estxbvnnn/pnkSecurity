#!/bin/bash
# =============================================================================
# Carta Digital — runbook de operación del día a día (correr en AWS CloudShell).
#
# Un solo comando por tarea, para no tener que acordarse de AWS CLI en el
# momento en que algo se cae. Uso:
#
#   ./runbook.sh estado               -- ¿está todo sano?
#   ./runbook.sh reiniciar-app        -- la app se cuelga/anda rara (reinicia
#                                         el contenedor en la instancia principal)
#   ./runbook.sh reemplazar-instancias -- algo anda mal a nivel instancia:
#                                          las reemplaza por nuevas, sin cortar
#                                          el servicio (una por vez)
#   ./runbook.sh parar                -- apaga la capacidad extra (Auto Scaling
#                                         a 0). La instancia principal NUNCA
#                                         se apaga con esto, sigue sirviendo sola.
#   ./runbook.sh iniciar              -- vuelve a prender la capacidad extra
#   ./runbook.sh logs                 -- ver los últimos logs de la app
#
# No hace falta memorizar nada más que estos 6 comandos.
# =============================================================================
set -euo pipefail

REGION="${REGION:-us-east-1}"
ASG_NAME="${ASG_NAME:-carta-digital-asg}"
TG_NAME="${TG_NAME:-carta-digital-tg}"
MAIN_INSTANCE_IP="${MAIN_INSTANCE_IP:-52.0.165.26}"   # la instancia principal (52.0.165.26) -- app + base de datos, nunca se apaga
SSH_KEY="${SSH_KEY:-test.pem}"                         # ruta a la key en esta sesión de CloudShell (subila junto al script)

TG_ARN() {
  aws elbv2 describe-target-groups --region "$REGION" --names "$TG_NAME" \
    --query 'TargetGroups[0].TargetGroupArn' --output text
}

comando="${1:-}"

case "$comando" in

  estado)
    echo "== Auto Scaling Group =="
    aws autoscaling describe-auto-scaling-groups --region "$REGION" \
      --auto-scaling-group-names "$ASG_NAME" \
      --query 'AutoScalingGroups[0].{Minimo:MinSize,Deseadas:DesiredCapacity,Maximo:MaxSize,Instancias:Instances[].{Id:InstanceId,Estado:LifecycleState,Salud:HealthStatus}}' \
      --output table
    echo ""
    echo "== Salud en el Load Balancer (healthy = sirviendo tráfico) =="
    aws elbv2 describe-target-health --region "$REGION" --target-group-arn "$(TG_ARN)" \
      --query 'TargetHealthDescriptions[].{Instancia:Target.Id,Estado:TargetHealth.State}' \
      --output table
    ;;

  reiniciar-app)
    echo "== Reiniciando el contenedor de la app en la instancia principal ($MAIN_INSTANCE_IP) =="
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "ec2-user@$MAIN_INSTANCE_IP" \
      "cd /home/ec2-user/carta-digital-node && docker compose restart app-prod"
    echo "Listo. Probar: curl -I http://$MAIN_INSTANCE_IP/health"
    ;;

  reemplazar-instancias)
    echo "== Reemplazando las instancias del Auto Scaling Group (una por vez, sin cortar el servicio) =="
    aws autoscaling start-instance-refresh --region "$REGION" \
      --auto-scaling-group-name "$ASG_NAME" \
      --preferences '{"MinHealthyPercentage": 50, "InstanceWarmup": 90}'
    echo "Se inició el reemplazo. Ver progreso con:"
    echo "  aws autoscaling describe-instance-refreshes --region $REGION --auto-scaling-group-name $ASG_NAME"
    ;;

  parar)
    echo "== Apagando la capacidad extra (Auto Scaling a 0) =="
    echo "La instancia principal ($MAIN_INSTANCE_IP) NO se apaga -- sigue sirviendo todo el tráfico ella sola."
    aws autoscaling update-auto-scaling-group --region "$REGION" \
      --auto-scaling-group-name "$ASG_NAME" --min-size 0 --desired-capacity 0
    echo "Listo."
    ;;

  iniciar)
    echo "== Prendiendo de nuevo la capacidad extra (vuelve a 2 instancias) =="
    aws autoscaling update-auto-scaling-group --region "$REGION" \
      --auto-scaling-group-name "$ASG_NAME" --min-size 1 --desired-capacity 2
    echo "Listo. Esperá 1-2 minutos y confirmá con: ./runbook.sh estado"
    ;;

  logs)
    echo "== Últimas 100 líneas de log de la app (instancia principal) =="
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "ec2-user@$MAIN_INSTANCE_IP" \
      "cd /home/ec2-user/carta-digital-node && docker compose logs --tail=100 app-prod"
    ;;

  *)
    echo "Uso: ./runbook.sh <comando>"
    echo ""
    echo "Comandos disponibles:"
    echo "  estado                 - ver si todo está sano"
    echo "  reiniciar-app          - la app anda rara/colgada -> reiniciar el contenedor"
    echo "  reemplazar-instancias  - algo anda mal a nivel instancia -> reemplazarlas sin downtime"
    echo "  parar                  - apagar la capacidad extra (no la instancia principal)"
    echo "  iniciar                - volver a prender la capacidad extra"
    echo "  logs                   - ver los últimos logs de la app"
    exit 1
    ;;
esac
