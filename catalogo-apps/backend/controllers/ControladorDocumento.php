<?php
class ControladorDocumento {

    // ---- Categorías ----

    public static function listarCategorias(): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT id, nombre, color FROM docs_categorias ORDER BY nombre ASC");
        $stmt->execute();
        responderOk($stmt->fetchAll());
    }

    public static function crearCategoria(): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();
        $nombre = sanitizar($cuerpo['nombre'] ?? '');
        $color  = sanitizar($cuerpo['color']  ?? '#6366f1');
        if (!$nombre) responderError('El nombre es requerido');
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("INSERT INTO docs_categorias (nombre, color) VALUES (?, ?)");
        $stmt->execute([$nombre, $color]);
        responderCreado(['id' => (int)$bd->lastInsertId(), 'nombre' => $nombre, 'color' => $color], 'Categoría creada');
    }

    public static function actualizarCategoria(int $id): never {
        requerirAdmin();
        $cuerpo = obtenerCuerpoJson();
        $nombre = sanitizar($cuerpo['nombre'] ?? '');
        $color  = sanitizar($cuerpo['color']  ?? '#6366f1');
        if (!$nombre) responderError('El nombre es requerido');
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("UPDATE docs_categorias SET nombre = ?, color = ? WHERE id = ?");
        $stmt->execute([$nombre, $color, $id]);
        if ($stmt->rowCount() === 0) responderNoEncontrado('Categoría no encontrada');
        responderOk(null, 'Categoría actualizada');
    }

    public static function eliminarCategoria(int $id): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("DELETE FROM docs_categorias WHERE id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) responderNoEncontrado('Categoría no encontrada');
        responderOk(null, 'Categoría eliminada');
    }

    // ---- Documentos ----

    public static function listar(): never {
        requerirAuth();
        $bd          = BaseDatos::obtenerInstancia();
        $condiciones = [];
        $params      = [];

        $categoriaId = isset($_GET['categoria_id']) && is_numeric($_GET['categoria_id']) ? (int)$_GET['categoria_id'] : null;
        if ($categoriaId) {
            $condiciones[] = 'd.categoria_id = ?';
            $params[]      = $categoriaId;
        }

        $proyectoId = isset($_GET['proyecto_id']) && is_numeric($_GET['proyecto_id']) ? (int)$_GET['proyecto_id'] : null;
        if ($proyectoId) {
            $condiciones[] = 'EXISTS (SELECT 1 FROM proyecto_documentos pd WHERE pd.documento_id = d.id AND pd.proyecto_id = ?)';
            $params[]      = $proyectoId;
        }

        $busqueda = sanitizar($_GET['busqueda'] ?? '');
        if ($busqueda !== '') {
            $condiciones[] = '(d.nombre LIKE ? OR d.descripcion LIKE ?)';
            $params[]      = '%' . $busqueda . '%';
            $params[]      = '%' . $busqueda . '%';
        }

        $donde = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';

        $stmt = $bd->prepare("
            SELECT d.id, d.nombre, d.descripcion, d.nombre_archivo, d.nombre_original, d.tipo_mime, d.tamano,
                   d.categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color,
                   d.creado_en
            FROM docs_documentos d
            LEFT JOIN docs_categorias c ON c.id = d.categoria_id
            $donde
            ORDER BY d.creado_en DESC
        ");
        $stmt->execute($params);
        $docs = $stmt->fetchAll();

        if ($docs) {
            $ids = array_column($docs, 'id');
            $ph  = implode(',', array_fill(0, count($ids), '?'));
            $stmtP = $bd->prepare("
                SELECT pd.documento_id, p.id, p.nombre
                FROM proyecto_documentos pd
                JOIN proyectos p ON p.id = pd.proyecto_id
                WHERE pd.documento_id IN ($ph)
                ORDER BY p.nombre ASC
            ");
            $stmtP->execute($ids);
            $mapaProyectos = [];
            foreach ($stmtP->fetchAll() as $r) {
                $mapaProyectos[$r['documento_id']][] = ['id' => $r['id'], 'nombre' => $r['nombre']];
            }
            foreach ($docs as &$doc) {
                $doc['proyectos'] = $mapaProyectos[$doc['id']] ?? [];
            }
            unset($doc);
        }

        responderOk($docs);
    }

    public static function subir(): never {
        requerirAdmin();

        $nombre      = sanitizar($_POST['nombre']      ?? '');
        $descripcion = sanitizar($_POST['descripcion'] ?? '');
        $categoriaId = isset($_POST['categoria_id']) && is_numeric($_POST['categoria_id']) ? (int)$_POST['categoria_id'] : null;
        $proyectoIds = isset($_POST['proyecto_ids']) ? json_decode($_POST['proyecto_ids'], true) : [];
        $esCreado    = ($_POST['es_creado'] ?? '0') === '1';

        if (!is_dir(UPLOADS_DIR)) mkdir(UPLOADS_DIR, 0755, true);

        if ($esCreado) {
            $contenido      = $_POST['contenido'] ?? '';
            $extension      = sanitizar($_POST['extension'] ?? 'txt');
            if (!in_array($extension, ['txt', 'md'])) $extension = 'txt';
            $nombreOriginal = ($nombre ?: 'documento') . '.' . $extension;
            $nombreArchivo  = uniqid('doc_', true) . '.' . $extension;
            $rutaDestino    = UPLOADS_DIR . $nombreArchivo;
            file_put_contents($rutaDestino, $contenido);
            $tipoMime = $extension === 'md' ? 'text/markdown' : 'text/plain';
            $tamano   = strlen($contenido);
        } else {
            if (empty($_FILES['archivo'])) responderError('No se recibió ningún archivo');
            $archivo = $_FILES['archivo'];
            if ($archivo['error'] !== UPLOAD_ERR_OK) responderError('Error al subir el archivo');
            if ($archivo['size'] > MAX_TAMANO_ARCHIVO) responderError('El archivo supera el tamaño máximo de 20MB');
            if (!$nombre) $nombre = pathinfo($archivo['name'], PATHINFO_FILENAME);
            $nombreOriginal = basename($archivo['name']);
            $extension      = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
            $nombreArchivo  = uniqid('doc_', true) . '.' . $extension;
            $rutaDestino    = UPLOADS_DIR . $nombreArchivo;
            if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) responderError('No se pudo guardar el archivo');
            $tipoMime = mime_content_type($rutaDestino);
            $tamano   = $archivo['size'];
        }

        if (!$nombre) $nombre = pathinfo($nombreOriginal, PATHINFO_FILENAME);

        $bd = BaseDatos::obtenerInstancia();
        $bd->beginTransaction();
        try {
            $stmt = $bd->prepare("INSERT INTO docs_documentos (nombre, descripcion, nombre_archivo, nombre_original, tipo_mime, tamano, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$nombre, $descripcion, $nombreArchivo, $nombreOriginal, $tipoMime, $tamano, $categoriaId]);
            $docId = (int)$bd->lastInsertId();

            if (is_array($proyectoIds) && count($proyectoIds)) {
                $stmtP = $bd->prepare("INSERT IGNORE INTO proyecto_documentos (proyecto_id, documento_id) VALUES (?, ?)");
                foreach ($proyectoIds as $pid) {
                    if (is_numeric($pid)) $stmtP->execute([(int)$pid, $docId]);
                }
            }
            $bd->commit();
        } catch (Throwable $e) {
            $bd->rollBack();
            if (isset($rutaDestino) && file_exists($rutaDestino)) unlink($rutaDestino);
            responderError(APP_DEBUG ? $e->getMessage() : 'Error al guardar el documento', 500);
        }

        responderCreado(['id' => $docId], 'Documento guardado correctamente');
    }

    public static function obtenerContenido(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT nombre_archivo, nombre_original, tipo_mime FROM docs_documentos WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) responderNoEncontrado('Documento no encontrado');

        $ruta = UPLOADS_DIR . $doc['nombre_archivo'];
        if (!file_exists($ruta)) responderNoEncontrado('Archivo no encontrado');

        $ext = strtolower(pathinfo($doc['nombre_original'], PATHINFO_EXTENSION));
        $esEditable = in_array($ext, ['md', 'txt', 'json', 'xml', 'html', 'css', 'js']);
        if (!$esEditable) responderError('Este tipo de archivo no es editable');

        responderOk([
            'contenido'      => file_get_contents($ruta),
            'extension'      => $ext,
            'nombre_original'=> $doc['nombre_original'],
        ]);
    }

    public static function actualizar(int $id): never {
        requerirAdmin();
        $cuerpo      = obtenerCuerpoJson();
        $nombre      = sanitizar($cuerpo['nombre']      ?? '');
        $descripcion = sanitizar($cuerpo['descripcion'] ?? '');
        $categoriaId = isset($cuerpo['categoria_id']) && is_numeric($cuerpo['categoria_id']) ? (int)$cuerpo['categoria_id'] : null;
        $proyectoIds = array_filter(array_map('intval', $cuerpo['proyecto_ids'] ?? []), fn($v) => $v > 0);
        $contenido   = $cuerpo['contenido'] ?? null; // null = no editar contenido

        if (!$nombre) responderError('El nombre es requerido');

        $bd = BaseDatos::obtenerInstancia();
        $bd->beginTransaction();
        try {
            $stmt = $bd->prepare("SELECT id, nombre_archivo, nombre_original FROM docs_documentos WHERE id = ?");
            $stmt->execute([$id]);
            $doc = $stmt->fetch();
            if (!$doc) { $bd->rollBack(); responderNoEncontrado('Documento no encontrado'); }

            $stmt = $bd->prepare("UPDATE docs_documentos SET nombre = ?, descripcion = ?, categoria_id = ? WHERE id = ?");
            $stmt->execute([$nombre, $descripcion, $categoriaId, $id]);

            // Si se envía contenido, guardar en el archivo físico
            if ($contenido !== null) {
                $ruta = UPLOADS_DIR . $doc['nombre_archivo'];
                file_put_contents($ruta, $contenido);
                // Actualizar tamaño
                $bd->prepare("UPDATE docs_documentos SET tamano = ? WHERE id = ?")
                   ->execute([strlen($contenido), $id]);
            }

            $bd->prepare("DELETE FROM proyecto_documentos WHERE documento_id = ?")->execute([$id]);
            if (count($proyectoIds)) {
                $stmtP = $bd->prepare("INSERT IGNORE INTO proyecto_documentos (proyecto_id, documento_id) VALUES (?, ?)");
                foreach ($proyectoIds as $pid) $stmtP->execute([$pid, $id]);
            }
            $bd->commit();
        } catch (Throwable $e) {
            $bd->rollBack();
            responderError(APP_DEBUG ? $e->getMessage() : 'Error al actualizar el documento', 500);
        }

        responderOk(null, 'Documento actualizado');
    }

    public static function eliminar(int $id): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT nombre_archivo FROM docs_documentos WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) responderNoEncontrado('Documento no encontrado');
        $ruta = UPLOADS_DIR . $doc['nombre_archivo'];
        if (file_exists($ruta)) unlink($ruta);
        $bd->prepare("DELETE FROM docs_documentos WHERE id = ?")->execute([$id]);
        responderOk(null, 'Documento eliminado');
    }

    public static function descargar(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT nombre_archivo, nombre_original, tipo_mime FROM docs_documentos WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) responderNoEncontrado('Documento no encontrado');
        $ruta = UPLOADS_DIR . $doc['nombre_archivo'];
        if (!file_exists($ruta)) responderNoEncontrado('Archivo no encontrado en el servidor');
        header('Content-Type: ' . $doc['tipo_mime']);
        header('Content-Length: ' . filesize($ruta));
        header('Content-Disposition: attachment; filename="' . $doc['nombre_original'] . '"');
        header('Cache-Control: private');
        readfile($ruta);
        exit;
    }

    public static function previsualizar(int $id): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT nombre_archivo, nombre_original, tipo_mime FROM docs_documentos WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) responderNoEncontrado('Documento no encontrado');
        $ruta = UPLOADS_DIR . $doc['nombre_archivo'];
        if (!file_exists($ruta)) responderNoEncontrado('Archivo no encontrado en el servidor');
        header('Content-Type: ' . $doc['tipo_mime']);
        header('Content-Length: ' . filesize($ruta));
        header('Content-Disposition: inline; filename="' . $doc['nombre_original'] . '"');
        header('Cache-Control: private');
        readfile($ruta);
        exit;
    }

    public static function asociarProyecto(int $docId, int $proyectoId): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("INSERT IGNORE INTO proyecto_documentos (proyecto_id, documento_id) VALUES (?, ?)");
        $stmt->execute([$proyectoId, $docId]);
        responderOk(null, 'Documento asociado al proyecto');
    }

    public static function desasociarProyecto(int $docId, int $proyectoId): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("DELETE FROM proyecto_documentos WHERE proyecto_id = ? AND documento_id = ?");
        $stmt->execute([$proyectoId, $docId]);
        responderOk(null, 'Documento desasociado del proyecto');
    }
}