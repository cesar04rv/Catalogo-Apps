<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/middleware/helpers.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/config/BaseDatos.php';


require_once __DIR__ . '/controllers/ControladorAuth.php';
require_once __DIR__ . '/controllers/ControladorUsuario.php';
require_once __DIR__ . '/controllers/ControladorProyecto.php';
require_once __DIR__ . '/controllers/ControladorTecnologia.php';
require_once __DIR__ . '/controllers/ControladorArchivo.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = preg_replace('#^.*?/backend#', '', $uri);
$uri    = rtrim($uri, '/') ?: '/';

$partes      = explode('/', ltrim($uri, '/'));
$recurso     = $partes[0] ?? '';
$id          = isset($partes[1]) && is_numeric($partes[1]) ? (int)$partes[1] : null;
$subrecurso  = $partes[2] ?? '';
$subid       = isset($partes[3]) && is_numeric($partes[3]) ? (int)$partes[3] : null;
match(true) {
    $recurso === 'auth' && $partes[1] === 'login'  && $metodo === 'POST' => ControladorAuth::login(),
    $recurso === 'auth' && $partes[1] === 'logout' && $metodo === 'POST' => ControladorAuth::logout(),
    $recurso === 'auth' && $partes[1] === 'me'     && $metodo === 'GET'  => ControladorAuth::yo(),

    $recurso === 'usuarios' && $metodo === 'GET'    && $id === null       => ControladorUsuario::listar(),
    $recurso === 'usuarios' && $metodo === 'GET'    && $id !== null       => ControladorUsuario::mostrar($id),
    $recurso === 'usuarios' && $metodo === 'POST'   && $subrecurso === '' => ControladorUsuario::crear(),
    $recurso === 'usuarios' && $metodo === 'PUT'    && $id !== null       => ControladorUsuario::actualizar($id),
    $recurso === 'usuarios' && $metodo === 'DELETE' && $id !== null       => ControladorUsuario::eliminar($id),

    $recurso === 'proyectos' && $subrecurso === 'archivos' && $metodo === 'GET'    && $id !== null => ControladorArchivo::listar($id),
    $recurso === 'proyectos' && $subrecurso === 'archivos' && $metodo === 'POST'   && $id !== null => ControladorArchivo::subir($id),
    $recurso === 'archivos'  && $metodo === 'DELETE'       && $id !== null                        => ControladorArchivo::eliminar($id),

    $recurso === 'proyectos' && $metodo === 'GET'    && $id === null       => ControladorProyecto::listar(),
    $recurso === 'proyectos' && $metodo === 'GET'    && $id !== null       => ControladorProyecto::mostrar($id),
    $recurso === 'proyectos' && $metodo === 'POST'   && $subrecurso === '' => ControladorProyecto::crear(),
    $recurso === 'proyectos' && $metodo === 'PUT'    && $id !== null       => ControladorProyecto::actualizar($id),
    $recurso === 'proyectos' && $metodo === 'DELETE' && $id !== null       => ControladorProyecto::eliminar($id),

    $recurso === 'tecnologias' && $metodo === 'GET'    && $id === null       => ControladorTecnologia::listar(),
    $recurso === 'tecnologias' && $metodo === 'GET'    && $id !== null       => ControladorTecnologia::mostrar($id),
    $recurso === 'tecnologias' && $metodo === 'POST'   && $subrecurso === '' => ControladorTecnologia::crear(),
    $recurso === 'tecnologias' && $metodo === 'PUT'    && $id !== null       => ControladorTecnologia::actualizar($id),
    $recurso === 'tecnologias' && $metodo === 'DELETE' && $id !== null       => ControladorTecnologia::eliminar($id),

$recurso === 'uploads' && $metodo === 'GET' => ControladorArchivo::descargar($partes[1] ?? ''),  
    default => responderNoEncontrado("Ruta [{$metodo} /{$recurso}] no existe"),
};