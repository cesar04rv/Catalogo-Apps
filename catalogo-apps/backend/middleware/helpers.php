<?php
function responder(bool $exito, mixed $datos = null, string $mensaje = '', int $codigo = 200, array $meta = []): never {
    http_response_code($codigo);
    $carga = ['exito' => $exito];
    if ($mensaje !== '') $carga['mensaje'] = $mensaje;
    if ($datos   !== null) $carga['datos'] = $datos;
    if (!empty($meta))    $carga['meta']   = $meta;
    echo json_encode($carga, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function responderOk(mixed $datos = null, string $mensaje = '', array $meta = []): never {
    responder(true, $datos, $mensaje, 200, $meta);
}

function responderCreado(mixed $datos = null, string $mensaje = 'Recurso creado'): never {
    responder(true, $datos, $mensaje, 201);
}

function responderError(string $mensaje, int $codigo = 400): never {
    responder(false, null, $mensaje, $codigo);
}

function responderNoAutorizado(string $mensaje = 'No autorizado'): never {
    responderError($mensaje, 401);
}

function responderProhibido(string $mensaje = 'Acceso denegado'): never {
    responderError($mensaje, 403);
}

function responderNoEncontrado(string $mensaje = 'No encontrado'): never {
    responderError($mensaje, 404);
}

function obtenerCuerpoJson(): array {
    $raw = file_get_contents('php://input');
    if (empty(trim($raw))) return [];
    $datos = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        responderError('JSON inválido en el cuerpo de la petición');
    }
    return $datos ?? [];
}
function sanitizar(mixed $valor): string {
    return trim(strip_tags((string)($valor ?? '')));
}