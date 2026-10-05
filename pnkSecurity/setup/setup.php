<?php

// VUL-03 (A05:2021 Configuración incorrecta): las credenciales ya no están
// hardcodeadas ni usan root sin contraseña; se cargan desde config/config.php
// (variables de entorno) y se conecta con el usuario mínimo 'pnk_app'.
require_once __DIR__ . '/../config/config.php';

function conectar()
{
    $con = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    return $con;
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