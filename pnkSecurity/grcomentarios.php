<?php

include("setup/setup.php");
session_start();

// VUL-13 (A01:2021 Control de acceso / IDOR): solo usuarios autenticados pueden
// comentar; un POST directo sin sesión se rechaza con 403 Forbidden.
if (!isset($_SESSION['nombre'])) {
    http_response_code(403);
    exit('Debe iniciar sesión para comentar.');
}

// VUL-07 (A03:2021 Inyección SQL): el INSERT de comentarios pasa a ser preparado;
// usuario y comentario se enlazan como parámetros y ya no se concatenan en el SQL
// (una comilla simple en el campo usuario ya no rompe ni altera la consulta).
// VUL-08 (A03:2021 / validación de entrada): el autor se toma de la SESIÓN (no de
// un campo manipulable del POST) y el comentario se valida (presencia y longitud).
$usuario    = $_SESSION['nombre'] ?? '';
$comentario = trim($_POST['comentario'] ?? '');
$idRest     = id_valido($_SESSION['id'] ?? null);

if ($idRest === null || $comentario === '' || mb_strlen($comentario) > 1000) {
    header('Location:index.php?id='.$idRest);
    exit;
}

db_execute(
    "INSERT INTO comentarios (usuario, comentario, id_restaurante) VALUES (?, ?, ?)",
    "ssi",
    [$usuario, $comentario, $idRest]
);

header('Location:index.php?id='.$idRest);

?>
