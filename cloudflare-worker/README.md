# Capa de seguridad con Cloudflare (Workers)

Capa de seguridad en el borde (edge) delante del servidor de Producción
(`52.0.165.26`), pedida como parte de la 4ta entrega. No usa un dominio
propio: se despliega en un subdominio gratis `*.workers.dev`.

## Qué protege

1. **Protección DDoS / anti-bot de red**: automática en Cloudflare para
   todo el tráfico que pasa por su infraestructura, incluido un Worker en
   `workers.dev`. No requiere configuración.
2. **WAF ligero** (`security-proxy.js`): bloquea patrones típicos de SQL
   Injection y XSS en la URL, el query string y el body de la petición
   antes de que lleguen al servidor real.
3. **Rate limiting por IP** (Workers KV): 180 peticiones/minuto por IP en
   rutas dinámicas, y un límite más estricto (10/minuto) en `/login` para
   mitigar fuerza bruta. Los activos estáticos (`/css`, `/js`,
   `/vendors`, `/img`, `/imagenes`, `/fonts`) no cuentan para este
   límite — una sola página de menú carga 15-20 de estos archivos, y
   contarlos agotaba la cuota en pocos clics.
4. **Bloqueo de herramientas de escaneo conocidas** por User-Agent
   (sqlmap, nikto, nmap, masscan, acunetix, nessus, dirbuster, gobuster,
   wpscan).
5. **Reverse proxy transparente** hacia el origen real: todo lo que pasa
   los filtros anteriores se reenvía a `http://52.0.165.26` tal cual.

## Despliegue (vía dashboard, sin CLI)

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Create Worker**.
2. Ponle un nombre (ej. `carta-digital-security`) → **Deploy** (esto crea un worker "Hello World" de placeholder).
3. Click en **Edit code** → borra todo → pega el contenido de `security-proxy.js`.
4. Crea el KV Namespace que usa el rate limiting:
   - **Storage & Databases** → **KV** → **Create a namespace** → nómbralo `RATE_LIMIT_KV` → **Add**.
5. Vuelve al Worker → **Settings** → **Variables and Secrets** (o **Bindings**, según la versión del dashboard) → **KV Namespace Bindings** → **Add binding**:
   - Variable name: `RATE_LIMIT_KV`
   - KV namespace: el que creaste en el paso 4.
6. **Save and deploy**.
7. Tu URL pública queda como `https://carta-digital-security.<tu-usuario>.workers.dev` — pruébala, debe mostrar la app igual que `http://52.0.165.26`.

## Cómo demostrarlo

- **WAF**: `curl "https://<tu-worker>.workers.dev/restaurante/1?id=1' OR '1'='1"` → debe responder `403`.
- **Rate limiting**: hacer ~15 peticiones rápidas a `/login` desde el
  mismo IP → las últimas deben responder `429`.
- **Bot blocking**: `curl -A "sqlmap/1.7"  https://<tu-worker>.workers.dev/` → `403`.
- **DDoS/anti-bot de red**: no se "demuestra" con una petición — se
  explica que es la capa automática de la red de Cloudflare, activa
  para todo el tráfico que entra por el Worker.

## Limitaciones conocidas (para mencionar si pregunta el profesor)

- El plan gratis de Workers KV tiene una cuota diaria de escrituras
  (1,000/día) — de sobra para una demo de clase, pero no para tráfico
  real alto. En producción real se usaría el WAF nativo de Cloudflare
  (requiere tener el dominio como "zona" en Cloudflare) en vez de este
  WAF hecho a mano en el Worker.
- La conexión Worker → origen va por HTTP plano (`52.0.165.26` no tiene
  TLS propio). El tramo cliente → Worker sí es HTTPS (Cloudflare lo da
  gratis en `workers.dev`). Es el mismo modelo que "SSL flexible" de
  Cloudflare.
