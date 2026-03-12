<?php
class ControladorArchivo {

    public static function listar(int $proyectoId): never {
        requerirAuth();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT id, nombre, nombre_original, tipo_mime, tamano, creado_en FROM proyecto_archivos WHERE proyecto_id = ? ORDER BY creado_en DESC");        $stmt->execute([$proyectoId]);
        responderOk($stmt->fetchAll());
    }

    public static function subir(int $proyectoId): never {
        requerirAuth();
        if (empty($_FILES['archivo'])) responderError('No se recibió ningún archivo');

        $archivo = $_FILES['archivo'];
        if ($archivo['error'] !== UPLOAD_ERR_OK) responderError('Error al subir el archivo');
        if ($archivo['size'] > MAX_TAMANO_ARCHIVO) responderError('El archivo supera el tamaño máximo de 20MB');

        if (!is_dir(UPLOADS_DIR)) mkdir(UPLOADS_DIR, 0755, true);

        $nombreOriginal = basename($archivo['name']);
        $extension      = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        $nombreBase     = pathinfo($nombreOriginal, PATHINFO_FILENAME);
        $nombreGuardado = $nombreBase . '_' . substr(uniqid(), -6) . '.' . $extension;
        $rutaDestino    = UPLOADS_DIR . $nombreGuardado;

        if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
            responderError('No se pudo guardar el archivo');
        }

        $tipoMime = mime_content_type($rutaDestino);
        $bd       = BaseDatos::obtenerInstancia();
        $stmt     = $bd->prepare("INSERT INTO proyecto_archivos (proyecto_id, nombre, nombre_original, tipo_mime, tamano) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$proyectoId, $nombreGuardado, $nombreOriginal, $tipoMime, $archivo['size']]);

        responderCreado([
            'id'             => (int)$bd->lastInsertId(),
            'nombre_original'=> $nombreOriginal,
            'tipo_mime'      => $tipoMime,
            'tamano'         => $archivo['size'],
            'url'            => UPLOADS_URL . $nombreGuardado,
        ], 'Archivo subido correctamente');
    }

    public static function eliminar(int $id): never {
        requerirAdmin();
        $bd   = BaseDatos::obtenerInstancia();
        $stmt = $bd->prepare("SELECT nombre FROM proyecto_archivos WHERE id = ?");
        $stmt->execute([$id]);
        $archivo = $stmt->fetch();
        if (!$archivo) responderNoEncontrado('Archivo no encontrado');

        $ruta = UPLOADS_DIR . $archivo['nombre'];
        if (file_exists($ruta)) unlink($ruta);

        $bd->prepare("DELETE FROM proyecto_archivos WHERE id = ?")->execute([$id]);
        responderOk(null, 'Archivo eliminado');
    }
  public static function descargar(string $nombre): never {
    requerirAuth();
    if (!$nombre || !preg_match('/^[a-zA-Z0-9_.\-]+$/', $nombre)) {
        responderNoEncontrado('Archivo no encontrado');
    }

    $ruta = UPLOADS_DIR . $nombre;
    if (!file_exists($ruta)) {
        responderNoEncontrado('Archivo no encontrado');
    }

    $tipo = mime_content_type($ruta);
    header('Content-Type: ' . $tipo);
    header('Content-Length: ' . filesize($ruta));
    header('Content-Disposition: attachment; filename="' . basename($ruta) . '"');
    header('Cache-Control: private');
    // Limpiar cualquier output buffer activo
    while (ob_get_level()) ob_end_clean();
    readfile($ruta);
    exit();
}
}