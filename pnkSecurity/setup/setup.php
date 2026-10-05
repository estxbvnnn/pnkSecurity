<?php

// VUL-17 (A05:2021 Configuración incorrecta): los errores no se muestran al cliente
// (se registran en el servidor), evitando exponer rutas, consultas y stack traces de
// MySQL. Se controla el reporte de errores de mysqli manualmente.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (function_exists('mysqli_report')) {
    mysqli_report(MYSQLI_REPORT_OFF);
}

// VUL-19 (A05:2021 Configuración incorrecta): cabeceras de seguridad HTTP
// (CSP, anti-clickjacking, nosniff, etc.) y se retira X-Powered-By.
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    header_remove('X-Powered-By');
}

// VUL-03 (A05:2021 Configuración incorrecta): las credenciales ya no están
// hardcodeadas ni usan root sin contraseña; se cargan desde config/config.php
// (variables de entorno) y se conecta con el usuario mínimo 'pnk_app'.
require_once __DIR__ . '/../config/config.php';

// VUL-16 (A05:2021 Configuración incorrecta): la sesión se inicia UNA sola vez y al
// comienzo, de forma centralizada. Se eliminan los session_start() dispersos y
// tardíos de cada página.
if (session_status() === PHP_SESSION_NONE) {
    // VUL-18 (A05:2021 Configuración incorrecta): cookie de sesión endurecida
    // (HttpOnly + SameSite=Strict + Secure bajo HTTPS) para dificultar el robo de
    // sesión vía XSS/CSRF.
    $cookieSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $cookieSecure,
        'samesite' => 'Strict',
    ]);
    session_name('PNKSESID');
    session_start();
}

function conectar()
{
    $con = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    // VUL-12 (A03:2021 XSS desde BD): conexión en utf8mb4 para mostrar acentos sin
    // utf8_encode(); la salida se escapa con e() en lugar de imprimirse en crudo.
    if ($con) {
        mysqli_set_charset($con, 'utf8mb4');
    }
    return $con;
}

// VUL-04/05 (A03:2021 Inyección SQL): validación de identificadores y helper de
// consultas preparadas, para no concatenar datos del usuario en el SQL.
function id_valido($valor)
{
    if ($valor === null || $valor === '') {
        return null;
    }
    $i = filter_var($valor, FILTER_VALIDATE_INT);
    return ($i === false || $i <= 0) ? null : (int) $i;
}

function db_select($sql, $types = '', $params = [])
{
    $con  = conectar();
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        return [];
    }
    if ($types !== '') {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        return [];
    }
    $res  = mysqli_stmt_get_result($stmt);
    $rows = $res ? mysqli_fetch_all($res, MYSQLI_ASSOC) : [];
    mysqli_stmt_close($stmt);
    return $rows;
}

// VUL-07/08 (A03:2021): helper para INSERT/UPDATE/DELETE parametrizado.
function db_execute($sql, $types = '', $params = [])
{
    $con  = conectar();
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        return 0;
    }
    if ($types !== '') {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    $ok = mysqli_stmt_execute($stmt);
    $afectadas = $ok ? mysqli_stmt_affected_rows($stmt) : 0;
    mysqli_stmt_close($stmt);
    return (int) $afectadas;
}

// VUL-09/10/12 (A03:2021 XSS): escape de salida HTML. Toda variable que se imprima
// en el HTML debe pasar por e() para neutralizar <script>, atributos, etc.
function e($valor)
{
    return htmlspecialchars((string) ($valor ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// VUL-14 (A01:2021 CSRF): token por sesión; se incrusta en formularios y se envía
// en las peticiones AJAX, y se valida en cada POST con hash_equals().
function csrf_token()
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field()
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function csrf_validar()
{
    $enviado = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($enviado) || empty($_SESSION['csrf_token'])
        || !hash_equals($_SESSION['csrf_token'], $enviado)) {
        http_response_code(403);
        exit('Token CSRF inválido o ausente.');
    }
}

// VUL-20 (A07:2021 Autenticación): control de fuerza bruta en el login. Se registran
// los intentos fallidos por clave (IP / IP+usuario); tras 5 en 15 min, se bloquea 15 min.
function _login_archivo()
{
    $dir = __DIR__ . '/../logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir . '/login_intentos.json';
}

function _login_leer()
{
    $f = _login_archivo();
    if (!is_file($f)) {
        return [];
    }
    $d = json_decode((string) @file_get_contents($f), true);
    return is_array($d) ? $d : [];
}

function login_bloqueado($clave)
{
    $k = hash('sha256', $clave);
    $data = _login_leer();
    return !empty($data[$k]['bloqueo_hasta']) && time() < $data[$k]['bloqueo_hasta'];
}

function login_registrar_fallo($clave)
{
    $k = hash('sha256', $clave);
    $data = _login_leer();
    $ahora = time();
    $reg = $data[$k] ?? ['intentos' => 0, 'inicio' => $ahora, 'bloqueo_hasta' => 0];
    if ($ahora - ($reg['inicio'] ?? $ahora) > 900) {
        $reg = ['intentos' => 0, 'inicio' => $ahora, 'bloqueo_hasta' => 0];
    }
    $reg['intentos']++;
    if ($reg['intentos'] >= 5) {
        $reg['bloqueo_hasta'] = $ahora + 900;
    }
    $data[$k] = $reg;
    @file_put_contents(_login_archivo(), json_encode($data), LOCK_EX);
}

function login_limpiar($clave)
{
    $k = hash('sha256', $clave);
    $data = _login_leer();
    if (isset($data[$k])) {
        unset($data[$k]);
        @file_put_contents(_login_archivo(), json_encode($data), LOCK_EX);
    }
}

function quitarespacios($titulo)
{
    $titulo =str_replace(" ", "", $titulo);
    $cadena =str_replace("ñ", "", $titulo);
    $cadena =str_replace("Ñ", "", $cadena);
    return $cadena;
}

function moneda_chilena($numero){
    $numero = (string)$numero;
    $puntos = floor((strlen($numero)-1)/3);
    $tmp = "";
    $pos = 1;
    for($i=strlen($numero)-1; $i>=0; $i--){
    $tmp = $tmp.substr($numero, $i, 1);
    if($pos%3==0 && $pos!=strlen($numero))
    $tmp = $tmp.".";
    $pos = $pos + 1;
    }
    $formateado = "$ ".strrev($tmp);
    return $formateado;
    }

?>