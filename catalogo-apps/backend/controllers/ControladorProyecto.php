<?php
class ControladorProyecto {

    public static function listar(): never {
        requerirAuth();
        $bd = BaseDatos::obtenerInstancia();
        $condiciones = []; $params = [];

        $estado = sanitizar($_GET['estado'] ?? '');
        if ($estado && in_array($estado, ['produccion','desarrollo','parado'])) {
            $condiciones[] = 'p.estado = ?'; $params[] = $estado;
        }
        $usuarioId = isset($_GET['usuario_id']) && is_numeric($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : null;
        if ($usuarioId) {
            $condiciones[] = 'EXISTS (SELECT 1 FROM proyecto_usuarios pu WHERE pu.proyecto_id = p.id AND pu.usuario_id = ?)';
            $params[] = $usuarioId;
        }
        $tecnologiaId = isset($_GET['tecnologia_id']) && is_numeric($_GET['tecnologia_id']) ? (int)$_GET['tecnologia_id'] : null;
        if ($tecnologiaId) {
            $condiciones[] = 'EXISTS (SELECT 1 FROM proyecto_tecnologias pt WHERE pt.proyecto_id = p.id AND pt.tecnologia_id = ?)';
            $params[] = $tecnologiaId;
        }
        $busqueda = sanitizar($_GET['busqueda'] ?? '');
        if ($busqueda !== '') {
            $condiciones[] = 'MATCH(p.nombre, p.descripcion) AGAINST (? IN BOOLEAN MODE)';
            $params[] = $busqueda . '*';
        }

        $donde  = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = TAMANO_PAGINA;
        $offset = ($pagina - 1) * $limite;

        $stmtTotal = $bd->prepare("SELECT COUNT(*) FROM proyectos p $donde");
        $stmtTotal->execute($params);
        $total = (int)$stmtTotal->fetchColumn();

        $stmt = $bd->prepare("
            SELECT p.id, p.nombre, p.subtitulo, p.descripcion, p.estado,
                   p.ubicacion, p.ordenador, p.entorno_desarrollo, p.url, p.ubicacion_credenciales,
                   p.creado_en, p.actualizado_en
            FROM proyectos p $donde
            ORDER BY p.actualizado_en DESC LIMIT $limite OFFSET $offset
        ");
        $stmt->execute($params);
        $proyectos = $stmt->fetchAll();

        if ($proyectos) {
            $ids = array_column($proyectos, 'id');
            $ph  = implode(',', array_fill(0, count($ids), '?'));

            $stmtU = $bd->prepare("
                SELECT pu.proyecto_id, u.id, u.nombre, u.correo, pu.rol
                FROM proyecto_usuarios pu JOIN usuarios u ON u.id = pu.usuario_id
                WHERE pu.proyecto_id IN ($ph)
                ORDER BY FIELD(pu.rol,'propietario','colaborador')
            ");
            $stmtU->execute($ids);
            $mapaUsuarios = [];
            foreach ($stmtU->fetchAll() as $r) {
                $mapaUsuarios[$r['proyecto_id']][] = ['id'=>$r['id'],'nombre'=>$r['nombre'],'correo'=>$r['correo'],'rol'=>$r['rol']];
            }

            $stmtT = $bd->prepare("
                SELECT pt.proyecto_id, t.id, t.nombre, t.color
                FROM proyecto_tecnologias pt JOIN tecnologias t ON t.id = pt.tecnologia_id
                WHERE pt.proyecto_id IN ($ph)
            ");
            $stmtT->execute($ids);
            $mapaTecnologias = [];
            foreach ($stmtT->fetchAll() as $r) {
                $mapaTecnologias[$r['proyecto_id']][] = ['id'=>$r['id'],'nombre'=>$r['nombre'],'color'=>$r['color']];
            }

            foreach ($proyectos as &$proy) {
                $proy['usuarios']    = $mapaUsuarios[$proy['id']]    ?? [];
                $proy['tecnologias'] = $mapaTecnologias[$proy['id']] ?? [];
            }
            unset($proy);
        }

        responderOk($proyectos, '', [
            'total'         => $total,
            'pagina'        => $pagina,
            'por_pagina'    => $limite,
            'total_paginas' => (int)ceil($total / $limite),
        ]);
    }

    public static function mostrar(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT * FROM proyectos WHERE id = ?");
        $stmt->execute([$id]);
        $proyecto = $stmt->fetch();
        if (!$proyecto) responderNoEncontrado('Proyecto no encontrado');

        $stmtU = $bd->prepare("
            SELECT u.id, u.nombre, u.correo, pu.rol
            FROM proyecto_usuarios pu JOIN usuarios u ON u.id = pu.usuario_id
            WHERE pu.proyecto_id = ? ORDER BY FIELD(pu.rol,'propietario','colaborador')
        ");
        $stmtU->execute([$id]);
        $proyecto['usuarios'] = $stmtU->fetchAll();

        $stmtT = $bd->prepare("
            SELECT t.id, t.nombre, t.color
            FROM proyecto_tecnologias pt JOIN tecnologias t ON t.id = pt.tecnologia_id
            WHERE pt.proyecto_id = ?
        ");
        $stmtT->execute([$id]);
        $proyecto['tecnologias'] = $stmtT->fetchAll();

        responderOk($proyecto);
    }

    public static function crear(): never {
        requerirAdmin();
        $datos = self::validar(obtenerCuerpoJson());
        $bd    = BaseDatos::obtenerInstancia();
        $bd->beginTransaction();
        try {
            $stmt = $bd->prepare("INSERT INTO proyectos (nombre,subtitulo,descripcion,estado,ubicacion,ordenador,entorno_desarrollo,url,ubicacion_credenciales) VALUES (?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $datos['nombre'],
                $datos['subtitulo'],
                $datos['descripcion'],
                $datos['estado'],
                $datos['ubicacion'],
                $datos['ordenador'],
                $datos['entorno_desarrollo'],
                $datos['url'],
                $datos['ubicacion_credenciales'],
            ]);
            $id = (int)$bd->lastInsertId();
            self::sincronizarUsuarios($bd, $id, $datos['proyecto_usuarios']);
            self::sincronizarTecnologias($bd, $id, $datos['tecnologia_ids']);
            $bd->commit();
        } catch (Throwable $e) {
            $bd->rollBack();
            responderError(APP_DEBUG ? $e->getMessage() : 'Error al crear proyecto', 500);
        }
        responderCreado(['id' => $id], 'Proyecto creado');
    }

    public static function actualizar(int $id): never {
        requerirAdmin();
        $datos = self::validar(obtenerCuerpoJson());
        $bd    = BaseDatos::obtenerInstancia();
        $bd->beginTransaction();
        try {
            $stmt = $bd->prepare("UPDATE proyectos SET nombre=?,subtitulo=?,descripcion=?,estado=?,ubicacion=?,ordenador=?,entorno_desarrollo=?,url=?,ubicacion_credenciales=? WHERE id=?");
            $stmt->execute([
                $datos['nombre'],
                $datos['subtitulo'],
                $datos['descripcion'],
                $datos['estado'],
                $datos['ubicacion'],
                $datos['ordenador'],
                $datos['entorno_desarrollo'],
                $datos['url'],
                $datos['ubicacion_credenciales'],
                $id,
            ]);
            self::sincronizarUsuarios($bd, $id, $datos['proyecto_usuarios']);
            self::sincronizarTecnologias($bd, $id, $datos['tecnologia_ids']);
            $bd->commit();
        } catch (Throwable $e) {
            $bd->rollBack();
            responderError(APP_DEBUG ? $e->getMessage() : 'Error al actualizar proyecto', 500);
        }
        responderOk(null, 'Proyecto actualizado');
    }

    public static function eliminar(int $id): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare('DELETE FROM proyectos WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) responderNoEncontrado('Proyecto no encontrado');
        responderOk(null, 'Proyecto eliminado');
    }

    private static function validar(array $cuerpo): array {
        $nombre = sanitizar($cuerpo['nombre'] ?? '');
        $estado = $cuerpo['estado'] ?? 'desarrollo';
        if (!$nombre) responderError('El nombre es requerido');
        if (!in_array($estado, ['produccion','desarrollo','parado'])) responderError('Estado inválido');

        $proyectoUsuarios = [];
        foreach ((array)($cuerpo['proyecto_usuarios'] ?? []) as $pu) {
            if (isset($pu['usuario_id']) && is_numeric($pu['usuario_id'])) {
                $rol = in_array($pu['rol'] ?? '', ['propietario','colaborador']) ? $pu['rol'] : 'colaborador';
                $proyectoUsuarios[] = ['usuario_id' => (int)$pu['usuario_id'], 'rol' => $rol];
            }
        }

        return [
            'nombre'                => $nombre,
            'subtitulo'             => sanitizar($cuerpo['subtitulo']              ?? ''),
            'descripcion'           => sanitizar($cuerpo['descripcion']            ?? ''),
            'estado'                => $estado,
            'ubicacion'             => sanitizar($cuerpo['ubicacion']              ?? ''),
            'ordenador'             => sanitizar($cuerpo['ordenador']              ?? ''),
            'entorno_desarrollo'    => sanitizar($cuerpo['entorno_desarrollo']     ?? ''),
            'url'                   => sanitizar($cuerpo['url']                    ?? ''),
            'ubicacion_credenciales'=> sanitizar($cuerpo['ubicacion_credenciales'] ?? ''),
            'proyecto_usuarios'     => $proyectoUsuarios,
            'tecnologia_ids'        => array_filter(array_map('intval', (array)($cuerpo['tecnologia_ids'] ?? [])), fn($v) => $v > 0),
        ];
    }

    private static function sincronizarUsuarios(PDO $bd, int $proyectoId, array $proyectoUsuarios): void {
        $bd->prepare('DELETE FROM proyecto_usuarios WHERE proyecto_id = ?')->execute([$proyectoId]);
        if (!$proyectoUsuarios) return;
        $stmt = $bd->prepare('INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol) VALUES (?, ?, ?)');
        foreach ($proyectoUsuarios as $pu) $stmt->execute([$proyectoId, $pu['usuario_id'], $pu['rol']]);
    }

    private static function sincronizarTecnologias(PDO $bd, int $proyectoId, array $tecnologiaIds): void {
        $bd->prepare('DELETE FROM proyecto_tecnologias WHERE proyecto_id = ?')->execute([$proyectoId]);
        if (!$tecnologiaIds) return;
        $stmt = $bd->prepare('INSERT INTO proyecto_tecnologias (proyecto_id, tecnologia_id) VALUES (?, ?)');
        foreach ($tecnologiaIds as $techId) $stmt->execute([$proyectoId, $techId]);
    }
}