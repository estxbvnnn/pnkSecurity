<?php

include("setup/setup.php");
session_start();

// VUL-14 (A01:2021 CSRF): toda operación del carrito requiere un token válido.
csrf_validar();

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
    // VUL-13 (A01:2021 Control de acceso): se vacía solo el carrito de la sesión
    // actual, sin destruir toda la sesión del usuario.
    $_SESSION["carrito"] = [];
}
?>