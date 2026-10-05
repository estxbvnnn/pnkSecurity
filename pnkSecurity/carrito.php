<?php

include("setup/setup.php");
session_start();

switch($_POST['op'])
{
    case "1": insertar();
        break;
    case "2": eliminaritems();
        break;
    case "3": eliminartodo();
        break;
}

function insertar()
{
    // VUL-06 (A03:2021 Inyección SQL, error-based): iditems se valida como entero
    // y la consulta es preparada; sólo se aceptan ítems existentes y visibles.
    $iditems = id_valido($_POST['iditems'] ?? null);
    if ($iditems === null) {
        return;
    }
    $filas = db_select(
        "select id, nombre, precio from items where id = ? AND visible = 1 AND eliminado IS NULL",
        "i",
        [$iditems]
    );
    if (empty($filas)) {
        return;
    }
    $datos = $filas[0];

    if (!isset($_SESSION["carrito"]) || !is_array($_SESSION["carrito"])) {
        $_SESSION["carrito"] = [];
    }
    $pos=count($_SESSION["carrito"])+1;
    $productos = array("posicion"=>$pos,"id" => $datos['id'], "nombre" =>$datos['nombre'],"precio"=>$datos['precio']);
    $_SESSION["carrito"][$pos] = $productos;
}

function eliminaritems()
{
    unset($_SESSION["carrito"][$_POST['pos']]);
}

function eliminartodo()
{
    session_destroy();
}
?>