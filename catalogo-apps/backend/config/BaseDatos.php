<?php
require_once __DIR__ . '/config.php';

class BaseDatos {
    private static ?PDO $instancia = null;

    public static function obtenerInstancia(): PDO {
        if (self::$instancia === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                BD_HOST, BD_PUERTO, BD_NOMBRE, BD_CHARSET
            );
            $opciones = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instancia = new PDO($dsn, BD_USUARIO, BD_PASS, $opciones);
            } catch (PDOException $e) {
                $mensaje = APP_DEBUG ? $e->getMessage() : 'Error de conexión a la base de datos';
                http_response_code(503);
                echo json_encode(['exito' => false, 'mensaje' => $mensaje]);
                exit;
            }
        }
        return self::$instancia;
    }

    private function __construct() {}
    private function __clone()    {}
}