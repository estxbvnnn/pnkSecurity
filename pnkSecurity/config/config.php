<?php
/**
 * Configuración de pnkSecurity.
 *
 * VUL-03 (A05:2021 Configuración incorrecta): se elimina el uso de 'root' sin
 * contraseña. Las credenciales se leen desde variables de entorno (getenv); los
 * valores por defecto son solo para laboratorio local. Este archivo NO debe
 * versionarse (ver .gitignore); use config.sample.php como plantilla.
 */

declare(strict_types=1);

define('DB_HOST', getenv('PNK_DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int) (getenv('PNK_DB_PORT') ?: 3306));
define('DB_NAME', getenv('PNK_DB_NAME') ?: 'pnk_security');
define('DB_USER', getenv('PNK_DB_USER') ?: 'pnk_app');   // usuario con privilegios mínimos (NO root)
define('DB_PASS', getenv('PNK_DB_PASS') ?: 'Cambia_Esta_Clave_pnk_2026!');
