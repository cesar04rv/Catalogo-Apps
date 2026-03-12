<?php
class ControladorTecnologia {

    public static function listar(): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->query('SELECT id, nombre, color FROM tecnologias ORDER BY nombre');
        responderOk($stmt->fetchAll());
    }

    public static function mostrar(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('SELECT id, nombre, color FROM tecnologias WHERE id = ?');
        $stmt->execute([$id]);
        $tech = $stmt->fetch();
        if (!$tech) responderNoEncontrado('Tecnología no encontrada');
        responderOk($tech);
    }

    public static function crear(): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();
        $nombre = sanitizar($cuerpo['nombre'] ?? '');
        $color  = sanitizar($cuerpo['color']  ?? '#6366f1');

        if (!$nombre) responderError('El nombre es requerido');
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) $color = '#6366f1';

        $bd = BaseDatos::obtenerInstancia();
        try {
            $stmt = $bd->prepare('INSERT INTO tecnologias (nombre, color) VALUES (?, ?)');
            $stmt->execute([$nombre, $color]);
            $id = (int)$bd->lastInsertId();
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) responderError('Ya existe esa tecnología', 409);
            responderError('Error al crear tecnología', 500);
        }
        responderCreado(['id' => $id, 'nombre' => $nombre, 'color' => $color], 'Tecnología creada');
    }

    public static function actualizar(int $id): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();
        $nombre = sanitizar($cuerpo['nombre'] ?? '');
        $color  = sanitizar($cuerpo['color']  ?? '');

        $campos = []; $params = [];
        if ($nombre) { $campos[] = 'nombre = ?'; $params[] = $nombre; }
        if ($color)  {
            if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) responderError('Color hex inválido');
            $campos[] = 'color = ?'; $params[] = $color;
        }
        if (!$campos) responderError('Nada que actualizar');

        $params[] = $id;
        try {
            $bd = BaseDatos::obtenerInstancia();
            $bd->prepare('UPDATE tecnologias SET ' . implode(', ', $campos) . ' WHERE id = ?')->execute($params);
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) responderError('Ese nombre ya existe', 409);
            responderError('Error al actualizar', 500);
        }
        responderOk(null, 'Tecnología actualizada');
    }

    public static function eliminar(int $id): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('DELETE FROM tecnologias WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) responderNoEncontrado('Tecnología no encontrada');
        responderOk(null, 'Tecnología eliminada');
    }
}