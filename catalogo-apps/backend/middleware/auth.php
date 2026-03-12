<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../config/config.php';

function iniciarSesionSegura(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESION_NOMBRE);
        session_set_cookie_params([
            'lifetime' => SESION_DURACION,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function requerirAuth(): array {
    iniciarSesionSegura();
    if (empty($_SESSION['usuario'])) {
        responderNoAutorizado('Sesión no iniciada o expirada');
    }
    return $_SESSION['usuario'];
}

function requerirAdmin(): array {
    $usuario = requerirAuth();
    if ($usuario['rol'] !== 'admin') {
        responderProhibido('Acción reservada para administradores');
    }
    return $usuario;
}

function iniciarSesionUsuario(array $usuario): void {
    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION['usuario'] = [
        'id'     => $usuario['id'],
        'nombre' => $usuario['nombre'],
        'correo' => $usuario['correo'],
        'rol'    => $usuario['rol'],
    ];
}

function cerrarSesion(): void {
    iniciarSesionSegura();
    $_SESSION = [];
    session_destroy();
}