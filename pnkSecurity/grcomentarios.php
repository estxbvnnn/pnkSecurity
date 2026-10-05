<?php

include("setup/setup.php");
session_start();

// VUL-07 (A03:2021 Inyección SQL): el INSERT de comentarios pasa a ser preparado;
// usuario y comentario se enlazan como parámetros y ya no se concatenan en el SQL
// (una comilla simple en el campo usuario ya no rompe ni altera la consulta).
$usuario    = $_POST['usuario'] ?? '';
$comentario = $_POST['comentario'] ?? '';
$idRest     = id_valido($_SESSION['id'] ?? null);

db_execute(
    "INSERT INTO comentarios (usuario, comentario, id_restaurante) VALUES (?, ?, ?)",
    "ssi",
    [$usuario, $comentario, $idRest]
);

header('Location:index.php?id='.$idRest);

?>
