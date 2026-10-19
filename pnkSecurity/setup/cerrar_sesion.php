<?php

// La sesión se inicia con el nombre PNKSESID y los parámetros correctos dentro de
// setup.php. Incluirlo garantiza que cerremos LA MISMA sesión (antes se usaba el
// nombre por defecto PHPSESSID y no se cerraba la sesión real de la app).
require_once __DIR__ . '/setup.php';

// Vaciar los datos de la sesión.
$_SESSION = [];

// Eliminar la cookie de sesión del navegador.
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $p['path'],
        'domain'   => $p['domain'],
        'secure'   => $p['secure'],
        'httponly' => $p['httponly'],
        'samesite' => $p['samesite'] ?? 'Strict',
    ]);
}

// Destruir la sesión y volver a la carta principal.
session_destroy();

header('Location:../index.php?id=1');
exit;
