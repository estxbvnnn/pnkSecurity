<?php

include("setup.php");

// VUL-01 (A03:2021 Inyección SQL): se reemplaza la concatenación por una
// consulta preparada con parámetros enlazados. Así, entradas como
// ' OR '1'='1' -- dejan de alterar la lógica de la consulta.
$usuario  = $_POST['frmusuario'] ?? '';
$password = $_POST['frmpassword'] ?? '';

$con  = conectar();
$stmt = mysqli_prepare($con, "SELECT nombre FROM usuarios WHERE email = ? AND password = ?");
mysqli_stmt_bind_param($stmt, "ss", $usuario, $password);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$datos  = mysqli_fetch_array($result);

if ($datos)
{
    session_start();
    $_SESSION['nombre'] = $datos['nombre'];
    header('Location:../index.php');
} else {
    header('Location:../index.php');
}

?>
