CREATE DATABASE IF NOT EXISTS catalogo_apps
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE catalogo_apps;

CREATE TABLE usuarios (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    correo          VARCHAR(180) NOT NULL UNIQUE,
    contrasena      VARCHAR(255) NOT NULL,
    rol             ENUM('admin','visor') NOT NULL DEFAULT 'visor',
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE tecnologias (
    id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre    VARCHAR(80) NOT NULL UNIQUE,
    color     VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE proyectos (
    id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre                 VARCHAR(180) NOT NULL,
    subtitulo              VARCHAR(300) NULL,
    descripcion            TEXT,
    estado                 ENUM('produccion','desarrollo','parado') NOT NULL DEFAULT 'desarrollo',
    ordenador              VARCHAR(200) NULL,
    ubicacion              VARCHAR(200) NULL,
    entorno_desarrollo     VARCHAR(300) NULL,
    url                    VARCHAR(500) NULL,
    ubicacion_credenciales VARCHAR(500) NULL,
    creado_en              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT INDEX ft_nombre_desc (nombre, descripcion)
) ENGINE=InnoDB;

CREATE TABLE proyecto_usuarios (
    proyecto_id  INT UNSIGNED NOT NULL,
    usuario_id   INT UNSIGNED NOT NULL,
    rol          ENUM('propietario','colaborador') NOT NULL DEFAULT 'colaborador',
    PRIMARY KEY (proyecto_id, usuario_id),
    CONSTRAINT fk_pu_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pu_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE proyecto_tecnologias (
    proyecto_id   INT UNSIGNED NOT NULL,
    tecnologia_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (proyecto_id, tecnologia_id),
    CONSTRAINT fk_pt_proyecto   FOREIGN KEY (proyecto_id)   REFERENCES proyectos(id)   ON DELETE CASCADE,
    CONSTRAINT fk_pt_tecnologia FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES
('Administrador', 'admin@empresa.com',  '$2y$12$eDoAghydlApHOvRbcFKEqumFAuEcAhtMhj.FXnP5fASSTjFWco.JC', 'admin'),
('Demo Visor',    'visor@empresa.com',  '$2y$12$eDoAghydlApHOvRbcFKEqumFAuEcAhtMhj.FXnP5fASSTjFWco.JC', 'visor');

INSERT INTO tecnologias (nombre, color) VALUES
('PHP','#7c3aed'),('MySQL','#0284c7'),('JavaScript','#d97706'),
('React','#0ea5e9'),('Vue.js','#16a34a'),('Python','#2563eb'),
('Docker','#0891b2'),('Laravel','#dc2626'),('Node.js','#15803d'),('PostgreSQL','#1d4ed8');

INSERT INTO proyectos (nombre, subtitulo, descripcion, estado, ubicacion, entorno_desarrollo, url, ubicacion_credenciales)
VALUES ('Portal RR.HH.','Gestión interna de RRHH','Sistema para gestionar nóminas y vacaciones.','produccion','srv-prod-01','VS Code, Laravel','https://rrhh.empresa.com','Vault > rrhh');

INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol) VALUES (1,1,'propietario'),(1,2,'colaborador');
INSERT INTO proyecto_tecnologias (proyecto_id, tecnologia_id) VALUES (1,1),(1,2),(1,8);