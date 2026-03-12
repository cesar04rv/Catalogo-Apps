<?php
class ControladorUsuario {

    public static function listar(): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->query('SELECT id, nombre, correo, rol, activo, creado_en FROM usuarios ORDER BY nombre');
        responderOk($stmt->fetchAll());
    }

    public static function mostrar(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('SELECT id, nombre, correo, rol, activo, creado_en FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $usuario = $stmt->fetch();
        if (!$usuario) responderNoEncontrado('Usuario no encontrado');
        responderOk($usuario);
    }

    public static function crear(): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();

        $nombre = sanitizar($cuerpo['nombre']    ?? '');
        $correo = sanitizar($cuerpo['correo']    ?? '');
        $pass   = (string)($cuerpo['contrasena'] ?? '');
        $rol    = in_array($cuerpo['rol'] ?? '', ['admin','visor']) ? $cuerpo['rol'] : 'visor';

        if (!$nombre || !$correo || !$pass) responderError('nombre, correo y contrasena son requeridos');
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) responderError('Correo inválido');
        if (strlen($pass) < 8) responderError('La contraseña debe tener al menos 8 caracteres');

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $bd   = BaseDatos::obtenerInstancia();

        try {
            $stmt = $bd->prepare('INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?,?,?,?)');
            $stmt->execute([$nombre, $correo, $hash, $rol]);
            $id = (int)$bd->lastInsertId();
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) responderError('El correo ya está registrado', 409);
            responderError('Error al crear usuario', 500);
        }

        responderCreado(['id' => $id], 'Usuario creado');
    }

    public static function actualizar(int $id): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();
        $bd     = BaseDatos::obtenerInstancia();

        $campos = []; $params = [];

        if (isset($cuerpo['nombre'])) {
            $campos[] = 'nombre = ?';
            $params[] = sanitizar($cuerpo['nombre']);
        }
        if (isset($cuerpo['correo'])) {
            if (!filter_var($cuerpo['correo'], FILTER_VALIDATE_EMAIL)) responderError('Correo inválido');
            $campos[] = 'correo = ?';
            $params[] = sanitizar($cuerpo['correo']);
        }
        if (isset($cuerpo['contrasena']) && $cuerpo['contrasena'] !== '') {
            if (strlen($cuerpo['contrasena']) < 8) responderError('La contraseña debe tener al menos 8 caracteres');
            $campos[] = 'contrasena = ?';
            $params[] = password_hash($cuerpo['contrasena'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (isset($cuerpo['rol']) && in_array($cuerpo['rol'], ['admin','visor'])) {
            $campos[] = 'rol = ?';
            $params[] = $cuerpo['rol'];
        }
        if (isset($cuerpo['activo'])) {
            $campos[] = 'activo = ?';
            $params[] = (int)(bool)$cuerpo['activo'];
        }

        if (!$campos) responderError('Nada que actualizar');

        $params[] = $id;
        try {
            $bd->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE id = ?')->execute($params);
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) responderError('El correo ya está en uso', 409);
            responderError('Error al actualizar', 500);
        }
        responderOk(null, 'Usuario actualizado');
    }

    public static function eliminar(int $id): never {
        $actual = requerirAdmin();
        if ($actual['id'] === $id) responderError('No puedes eliminar tu propio usuario');

        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('DELETE FROM usuarios WHERE id = ?');
        try {
            $stmt->execute([$id]);
        } catch (PDOException $e) {
            responderError('No se puede eliminar: el usuario tiene proyectos asignados', 409);
        }
        if ($stmt->rowCount() === 0) responderNoEncontrado('Usuario no encontrado');
        responderOk(null, 'Usuario eliminado');
    }
}