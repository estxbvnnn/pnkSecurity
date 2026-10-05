<?php

include("setup/setup.php");
session_start();

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
