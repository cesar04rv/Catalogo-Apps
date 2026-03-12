<?php
class ControladorAuth {

    public static function login(): never {
        $cuerpo  = obtenerCuerpoJson();
        $correo  = sanitizar($cuerpo['correo'] ?? '');
        $pass    = (string)($cuerpo['contrasena'] ?? '');

        if (!$correo || !$pass) responderError('Correo y contraseña requeridos');

        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('SELECT id, nombre, correo, contrasena, rol, activo FROM usuarios WHERE correo = ? LIMIT 1');
        $stmt->execute([$correo]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($pass, $usuario['contrasena']) || !$usuario['activo']) {
            responderError('Credenciales incorrectas', 401);
        }

        iniciarSesionUsuario($usuario);
        unset($usuario['contrasena'], $usuario['activo']);
        responderOk($usuario, 'Sesión iniciada');
    }

    public static function logout(): never {
        requerirAuth();
        cerrarSesion();
        responderOk(null, 'Sesión cerrada');
    }

    public static function yo(): never {
        $usuario = requerirAuth();
        responderOk($usuario);
    }
}