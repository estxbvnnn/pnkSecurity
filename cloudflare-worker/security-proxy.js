// Cloudflare Worker — capa de seguridad delante de Producción (52.0.165.26).
// No requiere dominio propio: se despliega en un subdominio gratis
// *.workers.dev. Cloudflare aplica protección DDoS/anti-bot de red a TODO
// el tráfico que pasa por su infraestructura de forma automática, sin
// configuración — lo que este script agrega encima es:
//   1. WAF ligero: bloquea patrones de SQLi/XSS en URL, query y body.
//   2. Rate limiting por IP (Workers KV), con límite más estricto en
//      /login para mitigar fuerza bruta.
//   3. Bloqueo de user-agents de herramientas de escaneo conocidas
//      (sqlmap, nikto, nmap, etc.).
//   4. Reverse proxy transparente hacia el origen real.
//
// Requiere un KV Namespace llamado RATE_LIMIT_KV enlazado en
// Settings → Variables → KV Namespace Bindings (ver README.md).

// IMPORTANTE: Workers no permite que fetch() apunte directo a una IP
// literal (Cloudflare lo bloquea como "Error 1003: Direct IP Access Not
// Allowed", abuso-prevención de su red). Por eso se usa el hostname
// público que AWS asigna automáticamente a la IP elástica de la EC2
// (resuelve exactamente a la misma IP, 52.0.165.26) en vez de la IP
// cruda.
const ORIGIN = "http://ec2-52-0-165-26.compute-1.amazonaws.com";

const SQLI_XSS_PATTERNS = [
  /union(\s|\/\*.*\*\/)+select/i,
  /select\s+.+\s+from\s+/i,
  /insert\s+into/i,
  /drop\s+table/i,
  /<script/i,
  /javascript:/i,
  /onerror\s*=/i,
  /\.\.\/\.\.\//,
  /\bOR\b\s+['"]?1['"]?\s*=\s*['"]?1/i,
  /%3Cscript/i,
];

const SCANNER_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /acunetix/i,
  /nessus/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
];

const RATE_LIMITS = {
  "/login": { max: 10, windowSeconds: 60 },
  default: { max: 120, windowSeconds: 60 },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    if (await matchesWaf(request, url)) {
      return new Response("Bloqueado por el WAF: patrón sospechoso detectado.", {
        status: 403,
      });
    }

    const userAgent = request.headers.get("User-Agent") || "";
    if (SCANNER_UA_PATTERNS.some((p) => p.test(userAgent))) {
      return new Response("Acceso bloqueado.", { status: 403 });
    }

    if (await isRateLimited(env, clientIp, url.pathname)) {
      return new Response("Demasiadas peticiones. Intenta de nuevo en unos segundos.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }

    return proxyToOrigin(request, url);
  },
};

async function matchesWaf(request, url) {
  const target = decodeURIComponent(url.pathname + "?" + url.search);
  if (SQLI_XSS_PATTERNS.some((p) => p.test(target))) return true;

  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("content-type") || "";
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/json")
    ) {
      const body = await request.clone().text();
      if (SQLI_XSS_PATTERNS.some((p) => p.test(body))) return true;
    }
  }
  return false;
}

async function isRateLimited(env, ip, pathname) {
  const rule = RATE_LIMITS[pathname] || RATE_LIMITS.default;
  const bucket = RATE_LIMITS[pathname] ? pathname : "general";
  const key = `rl:${bucket}:${ip}`;

  const current = await env.RATE_LIMIT_KV.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= rule.max) return true;

  await env.RATE_LIMIT_KV.put(key, String(count + 1), {
    expirationTtl: rule.windowSeconds,
  });
  return false;
}

async function proxyToOrigin(request, url) {
  const targetUrl = ORIGIN + url.pathname + (url.search || "");

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("host");
  forwardHeaders.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
  forwardHeaders.set("X-Forwarded-Proto", "https");

  const init = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  const originResponse = await fetch(targetUrl, init);

  const responseHeaders = new Headers(originResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders,
  });
}
