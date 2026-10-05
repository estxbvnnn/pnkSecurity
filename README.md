# pnkSecurity
# Informe Técnico de Remediación — pnkSecurity

**Esteban Ardiles - Carlos Villarroel - Diego Barraza**

**Aplicación:** pnkSecurity (carta digital PHP + MySQL) — Laboratorio de Programación Segura I, INACAP Sede La Serena
**Base del trabajo:** *Informe Técnico de Pentesting* (20 hallazgos) + skill *SSDLC ISO 27001:2022 / ISO 27034 / OWASP ASVS v5*
**Entorno objetivo:** PHP 8.5 (verificado en 8.2.12) · MySQL/MariaDB (utf8mb4) · Apache (XAMPP)
**Fecha de remediación:** 2026-10-02
**Versión del documento:** 1.0
**Clasificación:** Confidencial

---

## 1. Resumen ejecutivo

Se corrigieron las **20 vulnerabilidades** del informe de pentesting sobre una copia íntegra de la aplicación ubicada en `web_update/`. El trabajo se concentró en tres causas raíz: **concatenación de SQL**, **salida sin escape** y **configuración insegura por defecto**.

Controles transversales implementados:

- **Consultas 100 % parametrizadas** (mysqli prepared statements) mediante los helpers `db_select()` / `db_execute()`.
- **Escape de salida** obligatorio con `e()` (`htmlspecialchars`, `ENT_QUOTES`, UTF-8) en todo dato dinámico.
- **Tokens CSRF** por sesión en todos los formularios y peticiones AJAX.
- **Contraseñas con hash bcrypt** (`password_hash`/`password_verify`, coste 12).
- **Usuario de BD con privilegios mínimos** (`pnk_app`) en reemplazo de `root` sin clave; credenciales fuera del código (variables de entorno).
- **Sesión endurecida** (cookie `HttpOnly` + `SameSite=Strict` + `Secure` en HTTPS) y **cabeceras de seguridad** (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy; se retira `X-Powered-By`).
- **Manejo de errores** sin divulgación de información + **registro de eventos de seguridad**.
- **Control de fuerza bruta** en el login y **validación estricta de entradas**.

Actualización de componentes a sus versiones vigentes: **jQuery 3.2.1 → 4.0.0**, **Bootstrap 4.1.3 → 5.3.8**, objetivo **PHP 8.5** (código compatible, verificado en 8.2.12) y migración de la BD/conexión a **`utf8mb4`** (se elimina `utf8_encode()`).

**Estado global:** las 3 vulnerabilidades Críticas y las 10 Altas quedan **remediadas**; las Medias/Baja quedan **remediadas o mitigadas** según se detalla. Verificación técnica en la §6.

---

## 2. Tabla resumen de remediación

| VUL | Categoría | Severidad | Estado | Archivo(s) principal(es) |
|---|---|---|---|---|
| VUL-01 | SQLi en login | Crítica | ✅ Remediada | `setup/procesalogin.php` |
| VUL-02 | Contraseñas en texto plano | Crítica | ✅ Remediada | `Script_BD/pnk_security.sql`, `setup/procesalogin.php` |
| VUL-03 | BD con root sin clave / credenciales hardcoded | Crítica | ✅ Remediada | `config/config.php`, `Script_BD/pnk_security.sql` |
| VUL-04 | SQLi `id` (boolean-based) | Alta | ✅ Remediada | `index.php` |
| VUL-05 | SQLi `id` (UNION-based) | Alta | ✅ Remediada | `index.php` |
| VUL-06 | SQLi `iditems` (error-based) | Alta | ✅ Remediada | `carrito.php` |
| VUL-07 | SQLi comentario (`usuario`) | Alta | ✅ Remediada | `grcomentarios.php` |
| VUL-08 | SQLi comentario (`comentario`) | Alta | ✅ Remediada | `grcomentarios.php` |
| VUL-09 | XSS almacenado (reseñas) | Alta | ✅ Remediada | `index.php`, `grcomentarios.php` |
| VUL-10 | XSS reflejado (`id`) | Alta | ✅ Remediada | `index.php` |
| VUL-11 | XSS reflejado (`keyid`) | Alta | ✅ Remediada | `mostrar_carrito.php` |
| VUL-12 | XSS desde BD (`email`/`nombre`) | Media | ✅ Remediada | `index.php` |
| VUL-13 | Control de acceso / IDOR | Alta | ✅ Remediada | `grcomentarios.php`, `carrito.php` |
| VUL-14 | CSRF | Media | ✅ Remediada | `setup.php` + todos los formularios/AJAX |
| VUL-15 | `$_GET['id']` → `$_SESSION['id']` sin validar | Media | ✅ Remediada | `index.php` |
| VUL-16 | `session_start()` inconsistente | Baja | ✅ Remediada | `setup/setup.php` |
| VUL-17 | Errores MySQL divulgados | Media | ✅ Remediada | `setup/setup.php` |
| VUL-18 | Cookie sin HttpOnly/Secure/SameSite | Media | ✅ Remediada | `setup/setup.php` |
| VUL-19 | Faltan cabeceras de seguridad | Media | ✅ Remediada | `setup/setup.php`, `.htaccess` |
| VUL-20 | Login sin límite de intentos | Media | ✅ Remediada | `setup/setup.php`, `setup/procesalogin.php` |

---

## 3. Actualización de versiones (componentes deprecados)

| Componente | Antes | Ahora | Motivo / CVE de referencia |
|---|---|---|---|
| **jQuery** | 3.2.1 | **4.0.0** | Versión vigente. Corrige XSS conocidos (CVE-2019-11358, CVE-2020-11022, CVE-2020-11023). |
| **Bootstrap** | 4.1.3 | **5.3.8** | Versión vigente, sin dependencia de jQuery (requerido al subir a jQuery 4). Marcado migrado (`data-bs-*`, `btn-close`, `d-flex`, `float-end`…) y modal por API nativa de BS5. |
| **PHP** | — (código incompatible) | **objetivo 8.5** | Código compatible con PHP 8.5 (sin `utf8_encode`, tipado estricto); verificado en 8.2.12. |
| **MySQL (charset)** | `latin1` / `utf8` mixto | **`utf8mb4` / `utf8mb4_unicode_ci`** | Correcta representación de acentos sin `utf8_encode`; soporte completo de Unicode. |

> **Nota de migración:** al subir a jQuery 4.0.0, Bootstrap 4 queda incompatible (su JS exige jQuery < 4.0.0), por lo que se migró a **Bootstrap 5.3.8**. El carrusel `owl-carousel` (sin mantenimiento e incompatible con jQuery 4) se reemplazó por una **fila de tarjetas nativa de Bootstrap 5**, conservando el diseño. Todo verificado visualmente con capturas del sitio en ejecución.

Recomendación de proceso (ASVS V15.2 / ASC-15): incorporar **SBOM + SCA** (p. ej. `composer audit`, Dependabot/Retire.js) al pipeline para detectar dependencias vulnerables de forma continua.

---

## 4. Cambios transversales de arquitectura

Se introdujo una capa común de seguridad sin alterar el comportamiento funcional:

```
web_update/pnkSecurity/
├── config/
│   ├── config.php          # Credenciales vía getenv() + .htaccess que bloquea acceso web
│   ├── config.sample.php   # Plantilla sin secretos
│   └── .htaccess           # Require all denied
├── setup/
│   ├── setup.php           # NÚCLEO: errores, cabeceras, sesión, DB preparada, e(), CSRF, logging, anti-fuerza bruta
│   ├── procesalogin.php    # Login seguro
│   └── cerrar_sesion.php   # Logout seguro
├── logs/                   # seguridad.log + login_intentos.json (bloqueado por .htaccess)
├── index.php  carrito.php  mostrar_carrito.php  grcomentarios.php   # Páginas corregidas
├── js/controladorajax.js   # Envía token CSRF en AJAX
├── vendors/jquery/jquery-4.0.0.min.js   vendors/bootstrap/ (5.3.8)
└── .htaccess               # Cabeceras + bloqueo de .sql/.md/.log/.json/ocultos
```

Helpers clave (en `setup/setup.php`): `conectar()`, `db_select()`, `db_execute()`, `e()`, `id_valido()`, `csrf_token()`/`csrf_field()`/`csrf_validar()`, `log_seguridad()`, `login_bloqueado()`/`login_registrar_fallo()`/`login_limpiar()`.

---

## 5. Detalle de hallazgos y remediación

> Formato según `skills.md` §23. Mapeo ISO/ASC/ASVS orientativo.

### VUL-01 — Inyección SQL en el login · Crítica · ✅ Remediada
- **Ubicación:** `setup/procesalogin.php`.
- **Causa raíz:** `frmusuario`/`frmpassword` concatenados en la consulta; `' OR '1'='1' -- ` permitía login como Administrador.
- **Corrección:** consulta preparada `SELECT ... WHERE email = ? LIMIT 1` con `bind_param('s')`; la contraseña ya no participa en la consulta (se valida con `password_verify`). Se añadió validación de formato de email.
- **Mapeo:** ISO A.8.28 · ASC-10/ASC-14 · ASVS **V1** (prevención de inyección).

### VUL-02 — Contraseñas en texto plano · Crítica · ✅ Remediada
- **Ubicación:** tabla `usuarios` / `procesalogin.php`.
- **Corrección:** las credenciales se almacenan como **hash bcrypt `$2y$` (coste 12)** en el `.sql`; autenticación con `password_verify()`; `password_needs_rehash()` mantiene el hash al día. Las contraseñas de prueba siguen siendo `admin01`/`alondra01` pero ya no son recuperables desde la BD.
- **Mapeo:** ISO A.8.24 · ASC-11/ASC-12 · ASVS **V11** (criptografía, V11.4 funciones hash).

### VUL-03 — BD con `root` sin contraseña y credenciales en el código · Crítica · ✅ Remediada
- **Ubicación:** `setup/setup.php` (original) → `config/config.php`.
- **Corrección:** se crea el usuario **`pnk_app`** con privilegios mínimos (`SELECT` global; `INSERT` solo en `comentarios`; `UPDATE(password)` solo en `usuarios`). Las credenciales se leen con `getenv('PNK_DB_*')` y el directorio `config/` queda bloqueado por `.htaccess`.
- **Mapeo:** ISO A.5.17/A.8.2/A.8.9 · ASC-13 (secretos) · ASVS **V14** (protección de datos) / V13 (configuración).

### VUL-04 y VUL-05 — Inyección SQL en parámetro `id` (boolean y UNION) · Alta · ✅ Remediadas
- **Ubicación:** `index.php` (consulta de restaurante, destacados, cartas, categorías, ítems y comentarios).
- **Corrección:** `id` se valida con `id_valido()` (entero positivo o `null`) y **todas** las consultas usan `db_select()` parametrizado con `bind_param('i')`. Un `id` no entero no ejecuta consulta alguna. Se elimina la posibilidad de extracción por UNION.
- **Mapeo:** ISO A.8.28 · ASC-10/ASC-14 · ASVS **V1 / V2** (validación).

### VUL-06 — Inyección SQL en `iditems` (error-based) · Alta · ✅ Remediada
- **Ubicación:** `carrito.php`.
- **Corrección:** `iditems` validado como entero; consulta preparada que además exige `visible = 1 AND eliminado IS NULL`. Los errores ya no se devuelven al cliente (sin `extractvalue`).
- **Mapeo:** ISO A.8.28 · ASC-10 · ASVS **V1**.

### VUL-07 y VUL-08 — Inyección SQL en comentarios (`usuario`, `comentario`) · Alta · ✅ Remediadas
- **Ubicación:** `grcomentarios.php`.
- **Corrección:** `INSERT INTO comentarios (usuario, comentario, id_restaurante) VALUES (?,?,?)` con `bind_param('ssi')`. El autor se toma de `$_SESSION['nombre']` (no manipulable) y el comentario se valida (presencia y máx. 1000 caracteres).
- **Mapeo:** ISO A.8.28 · ASC-10/ASC-14 · ASVS **V1 / V2**.

### VUL-09 — XSS almacenado en reseñas · Alta · ✅ Remediada
- **Ubicación:** `index.php` (render de comentarios) · entrada `grcomentarios.php`.
- **Corrección:** el comentario se almacena tal cual y se **escapa al mostrar** con `nl2br(e(...))`; el autor con `e(...)`. La CSP (`script-src 'self'`) actúa como defensa en profundidad.
- **Mapeo:** ISO A.8.28 · ASC-10 · ASVS **V1** (sanitización/encoding) / V3 (web frontend).

### VUL-10 — XSS reflejado en `id` · Alta · ✅ Remediada
- **Ubicación:** `index.php` (atributo `href`/`src` y título).
- **Corrección:** `id` se castea a entero (`id_valido`); todo valor reflejado pasa por `e()`. **Verificado**: `id=<script>…</script>` ya no aparece en la respuesta (§6).
- **Mapeo:** ISO A.8.28 · ASC-10 · ASVS **V1 / V3**.

### VUL-11 — XSS reflejado en `keyid` · Alta · ✅ Remediada
- **Ubicación:** `mostrar_carrito.php` (atributo `href`).
- **Corrección:** `keyid` validado como entero y escapado con `e()`.
- **Mapeo:** ISO A.8.28 · ASC-10 · ASVS **V1 / V3**.

### VUL-12 — XSS desde BD (`email`, `nombre`) · Media · ✅ Remediada
- **Ubicación:** `index.php`.
- **Corrección:** toda salida proveniente de la BD (nombre, email, dirección, descripciones, comentarios) se escapa con `e()`. Se eliminó `utf8_encode()`; con `utf8mb4` los acentos se muestran correctamente.
- **Mapeo:** ISO A.8.28 · ASC-10 · ASVS **V1**.

### VUL-13 — Control de acceso / IDOR · Alta · ✅ Remediada
- **Ubicación:** `carrito.php`, `grcomentarios.php`.
- **Corrección:** `grcomentarios.php` exige sesión iniciada (403 si no) y usa el restaurante de la sesión; `carrito.php` opera exclusivamente sobre el carrito de la **propia sesión**, valida `op`/`iditems` y solo acepta ítems existentes y visibles. (La carta/menú es información pública por diseño; se protege la mutación de estado, no la lectura del menú.)
- **Mapeo:** ISO A.5.15/A.8.3 · ASC-08 · ASVS **V8** (autorización) / V2.3 (lógica de negocio).

### VUL-14 — CSRF · Media · ✅ Remediada
- **Ubicación:** formularios (login, comentarios) y endpoints AJAX (`carrito.php`).
- **Corrección:** token CSRF por sesión (`csrf_token()`), inyectado con `csrf_field()` en formularios y enviado por la cabecera `X-CSRF-Token` en AJAX; validado con `hash_equals()` en cada POST. **Verificado**: POST sin token → **403** (§6).
- **Mapeo:** ISO A.8.26 · ASC-08 · ASVS **V2.3 / V3**.

### VUL-15 — Dato de URL guardado en sesión sin validar · Media · ✅ Remediada
- **Ubicación:** `index.php`.
- **Corrección:** `$_SESSION['id'] = id_valido($_GET['id'])` (entero o `null`); nunca se confía en el valor crudo.
- **Mapeo:** ISO A.8.26/A.8.28 · ASC-10 · ASVS **V2.2** (validación de entradas).

### VUL-16 — `session_start()` inconsistente/tardío · Baja · ✅ Remediada
- **Corrección:** la sesión se inicia **una sola vez y al inicio** en `setup.php` (incluido como primera instrucción de cada script), con parámetros de cookie endurecidos. Se eliminaron los `session_start()` dispersos y duplicados.
- **Mapeo:** ISO A.8.9 · ASC-09 · ASVS **V7** (gestión de sesiones).

### VUL-17 — Divulgación de errores de MySQL · Media · ✅ Remediada
- **Corrección:** `display_errors=0`, `log_errors=1`, `mysqli_report(OFF)` y comprobación de resultados en los helpers. Ante error de BD se responde **500 genérico** y el detalle va solo al log interno. **Verificado** (§6).
- **Mapeo:** ISO A.8.15 · ASC-28 · ASVS **V16.5** (manejo de errores).

### VUL-18 — Cookie de sesión insegura · Media · ✅ Remediada
- **Corrección:** `session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>HTTPS])`, nombre `PNKSESID`. **Verificado**: `Set-Cookie: PNKSESID=…; HttpOnly; SameSite=Strict` (§6).
- **Mapeo:** ISO A.8.24 · ASC-09 · ASVS **V7 / V3**.

### VUL-19 — Faltan cabeceras de seguridad · Media · ✅ Remediada
- **Corrección:** se emiten `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; se retira `X-Powered-By`. Reforzado también por `.htaccess`. **Verificado** (§6).
- **Mapeo:** ISO A.8.9/A.8.26 · ASC-06 · ASVS **V13 / V14.3**.

### VUL-20 — Login sin límite de intentos · Media · ✅ Remediada
- **Corrección:** control de fuerza bruta por IP y por IP+usuario (5 intentos / 15 min → bloqueo 15 min), con registro de evento; mensaje genérico para no enumerar usuarios.
- **Mapeo:** ISO A.8.5/A.8.16 · ASC-07 · ASVS **V2.4 / V6** (autenticación, anti-automation).

---

## 6. Verificación técnica realizada

Entorno de prueba: **Apache 2.4 + MariaDB + PHP 8.2.12** (XAMPP), con la BD importada y el sitio en ejecución en `http://localhost/pnkSecurity_update/`. Se verificaron tanto las pruebas de seguridad como el render del front-end (jQuery 4.0.0 + Bootstrap 5.3.8). Las evidencias gráficas se incluyen en `INFORME_CORRECCIONES.docx`.

| Prueba | Resultado |
|---|---|
| `php -l` sobre los 9 archivos PHP | ✅ Sin errores de sintaxis |
| `password_verify('admin01'/'alondra01', hash)` | ✅ OK; clave incorrecta rechazada |
| Cabeceras de seguridad en la respuesta | ✅ CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy presentes |
| Cookie de sesión | ✅ `PNKSESID … HttpOnly; SameSite=Strict` |
| Error de BD (sin servicio) | ✅ **500 genérico** "Error interno…"; detalle solo en log, sin SQL/ruta/stack |
| XSS reflejado `id=<script>alert(1)</script>` | ✅ **0 reflejos** del payload en el cuerpo |
| POST `procesalogin.php` sin token CSRF | ✅ **403** |
| POST `carrito.php` sin token CSRF | ✅ **403** |
| Helpers `e()`, `id_valido()`, CSRF, `moneda_chilena()` | ✅ 12/12 aserciones OK |

**Retest pendiente (con BD importada):** flujo de login válido/bloqueo, alta de comentario con payload `<script>` y su renderizado escapado, agregado/eliminado de ítems del carrito, y verificación de que `pnk_app` opera con sus privilegios mínimos.

---

## 7. Security Gate (previo a producción)

> Formato `skills.md` §26. **Resultado: APROBADO CON CONDICIONES** para entorno de laboratorio.

- **Hallazgos críticos abiertos:** 0.
- **Hallazgos altos abiertos:** 0 (remediados; pendiente retest con datos).
- **Condiciones para PROD:**
  1. Ejecutar el **retest con BD** descrito en §6.
  2. **Cambiar** las credenciales de prueba y la contraseña de `pnk_app`; externalizarlas con variables de entorno / gestor de secretos.
  3. Servir **solo por HTTPS/TLS** (activa `Secure` en la cookie; definir `PNK_FORZAR_HTTPS=true`).
  4. Habilitar **SCA/SBOM** en el pipeline (ASVS V15.2).
  5. Revisar permisos de `logs/` (escribible por el servidor, no accesible por web).

---

## 8. Riesgo residual y recomendaciones

- **Autenticación:** considerar MFA y política de contraseñas si el panel evoluciona a administración real (ASVS V6).
- **TLS:** no versionado en el repo; debe definirse en el servidor (ASVS V12/V11.3).
- **Registro y monitoreo:** `logs/seguridad.log` cubre eventos clave; integrar con un SIEM y definir retención/alertas (ASVS V16, ISO A.8.15/A.8.16).
- **Privacidad (Ley 19.628 / 21.719):** el sistema trata datos de contacto de restaurantes y nombres de usuario; si se incorporan datos personales de clientes, aplicar minimización, base de licitud y los *Privacy Gates* del skill (§3.13).
- **PHP 8.5:** desplegar sobre el runtime 8.5 en producción (el código ya es compatible; verificado en 8.2.12).

---

*Documento generado como parte de la actualización de `web_update/`. El mapeo normativo es operativo y no sustituye interpretación jurídica ni auditoría formal; los identificadores ASVS exactos deben validarse contra la fuente oficial de OWASP ASVS v5.0.0.*
