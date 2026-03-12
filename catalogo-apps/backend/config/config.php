<?php
define('BD_HOST',    'localhost');
define('BD_PUERTO',  '3306');
define('BD_NOMBRE',  'catalogo_apps');
define('BD_USUARIO', 'root');
define('BD_PASS',    '');
define('BD_CHARSET', 'utf8mb4');

define('SESION_DURACION', 7200);
define('SESION_NOMBRE',   'CATALOGO_SESION');

define('TAMANO_PAGINA', 20);

define('APP_ENTORNO', 'desarrollo');
define('APP_DEBUG',   APP_ENTORNO === 'desarrollo');

define('ORIGEN_PERMITIDO', '*');

define('UPLOADS_DIR', __DIR__ . '/../../uploads/');
define('UPLOADS_URL', '/catalogo-apps/uploads/');
define('MAX_TAMANO_ARCHIVO', 40 * 1024 * 1024); 