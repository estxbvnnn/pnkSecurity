<?php

include("setup.php"); // la sesión ya se inicia dentro de setup.php (VUL-16)

// VUL-14 (A01:2021 CSRF): se valida el token de la petición antes de procesar el login.
csrf_validar();

// VUL-01 (A03:2021 Inyección SQL): se reemplaza la concatenación por una
// consulta preparada con parámetros enlazados. Así, entradas como
// ' OR '1'='1' -- dejan de alterar la lógica de la consulta.
$usuario  = $_POST['frmusuario'] ?? '';
$password = $_POST['frmpassword'] ?? '';

// VUL-20 (A07:2021 Autenticación): bloqueo por fuerza bruta (por IP e IP+usuario).
$ip    = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$clave = $ip . '|' . strtolower($usuario);
if (login_bloqueado($clave) || login_bloqueado($ip)) {
    header('Location:../index.php?login=bloqueado');
    exit;
}

$con  = conectar();
$stmt = mysqli_prepare($con, "SELECT nombre, password FROM usuarios WHERE email = ?");
mysqli_stmt_bind_param($stmt, "s", $usuario);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$datos  = mysqli_fetch_array($result);

// VUL-02 (A02:2021): la contraseña se valida contra el hash bcrypt con
// password_verify(); nunca se compara ni se almacena en texto plano.
if ($datos && password_verify($password, $datos['password']))
{
    // VUL-20: login correcto -> se limpian los contadores de intentos.
    login_limpiar($clave);
    login_limpiar($ip);
    $_SESSION['nombre'] = $datos['nombre'];
    header('Location:../index.php');
} else {
    // VUL-20: login fallido -> se registra el intento (cuenta para el bloqueo).
    login_registrar_fallo($clave);
    login_registrar_fallo($ip);
    header('Location:../index.php?login=error');
}

?>
