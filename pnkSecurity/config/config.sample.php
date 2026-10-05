<?php
/**
 * Plantilla de configuración. Copie este archivo como config.php y ajuste los
 * valores, o defina las variables de entorno PNK_DB_* (recomendado).
 * NUNCA versione config.php con credenciales reales.
 */

declare(strict_types=1);

define('DB_HOST', getenv('PNK_DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int) (getenv('PNK_DB_PORT') ?: 3306));
define('DB_NAME', getenv('PNK_DB_NAME') ?: 'pnk_security');
define('DB_USER', getenv('PNK_DB_USER') ?: 'pnk_app');
define('DB_PASS', getenv('PNK_DB_PASS') ?: 'DEFINA_UNA_CLAVE_FUERTE');
