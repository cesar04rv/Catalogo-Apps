# AppCatalog — Catálogo de Aplicaciones Corporativas

Aplicación web interna para gestionar y documentar los proyectos de software de la empresa. Permite registrar responsables, tecnologías, estado, ubicación, entornos de desarrollo y credenciales de cada proyecto.

---

## Tecnologías usadas

- **Frontend:** HTML, CSS, JavaScript vanilla (SPA sin frameworks)
- **Backend:** PHP 8+ con arquitectura REST
- **Base de datos:** MySQL / MariaDB
- **Servidor local:** XAMPP (Apache + MySQL)

---

## Estructura de archivos

```
catalogo-apps/
├── index.html                  → Página principal (SPA)
├── .htaccess                   → Redirige todo al index.html
│
├── frontend/
│   ├── css/styles.css          → Estilos globales (tema oscuro/claro)
│   └── js/
│       ├── api.js              → Cliente fetch para llamadas a la API
│       ├── app.js              → Estado global, navegación, utilidades
│       └── pages.js            → Lógica de cada página/vista
│
├── backend/
│   ├── index.php               → Router principal de la API REST
│   ├── .htaccess               → Redirige todo al index.php del backend
│   ├── config/
│   │   ├── config.php          → Configuración (BD, sesión, entorno)
│   │   └── Database.php        → Singleton PDO para la conexión MySQL
│   ├── middleware/
│   │   ├── auth.php            → Gestión de sesiones y autenticación
│   │   └── helpers.php         → Funciones de respuesta JSON estándar
│   └── controllers/
│       ├── AuthController.php       → Login, logout, sesión actual
│       ├── ProjectController.php    → CRUD de proyectos
│       ├── TechnologyController.php → CRUD de tecnologías
│       └── UserController.php       → CRUD de usuarios
│
└── sql/
    └── schema.sql              → Estructura de la BD + datos iniciales
```

---

## Instalación

### 1. Instalar XAMPP
Descarga desde apachefriends.org e instala. Asegúrate de que Apache y MySQL están en verde en el panel de control.

### 2. Copiar el proyecto
Copia la carpeta `catalogo-apps` dentro de:
```
C:\xampp\htdocs\
```

### 3. Crear la base de datos
1. Abre `http://localhost/phpmyadmin`
2. Clic en **Nueva** en el panel izquierdo
3. Nombre: `catalogo_apps`, cotejamiento: `utf8mb4_unicode_ci`
4. Clic en **Crear**
5. Ve a la pestaña **SQL**, pega el contenido de `sql/schema.sql` y ejecuta

### 4. Acceder a la app
```
http://localhost/catalogo-apps/
```

---

## Credenciales por defecto

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@empresa.com | Admin1234! | Admin |
| viewer@empresa.com | Admin1234! | Viewer |

---

## Cómo funciona

### Frontend (SPA)
La app es una Single Page Application — solo hay un `index.html` y el JavaScript se encarga de mostrar u ocultar las diferentes vistas sin recargar la página.

- **api.js** — Todas las llamadas al servidor pasan por `apiFetch()`. Gestiona automáticamente las cabeceras, los parámetros y redirige al login si la sesión expira.
- **app.js** — Contiene el objeto `App` con el estado global (usuario actual, tecnologías, usuarios, filtros). También tiene las funciones de navegación, el tema claro/oscuro y el login/logout.
- **pages.js** — Cada página tiene su propio handler en `PageHandlers`. Cuando navegas a una página, se ejecuta su handler que carga los datos y renderiza el HTML.

### Backend (API REST)
Todas las peticiones llegan a `backend/index.php` que actúa como router y las despacha al controlador correspondiente.

**Rutas disponibles:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/login | Iniciar sesión |
| POST | /auth/logout | Cerrar sesión |
| GET | /auth/me | Usuario actual |
| GET | /projects | Listar proyectos (con filtros) |
| GET | /projects/:id | Detalle de un proyecto |
| POST | /projects | Crear proyecto |
| PUT | /projects/:id | Editar proyecto |
| DELETE | /projects/:id | Eliminar proyecto |
| GET | /technologies | Listar tecnologías |
| POST | /technologies | Crear tecnología |
| PUT | /technologies/:id | Editar tecnología |
| DELETE | /technologies/:id | Eliminar tecnología |
| GET | /users | Listar usuarios |
| POST | /users | Crear usuario |
| PUT | /users/:id | Editar usuario |
| DELETE | /users/:id | Eliminar usuario |

### Autenticación
Se usa sesión PHP (cookie de sesión). Al hacer login el servidor crea una sesión y devuelve los datos del usuario. Todas las rutas protegidas comprueban que la sesión esté activa antes de responder.

### Base de datos

| Tabla | Descripción |
|-------|-------------|
| users | Usuarios del sistema |
| technologies | Tecnologías disponibles |
| projects | Proyectos registrados |
| project_technologies | Relación muchos-a-muchos proyectos ↔ tecnologías |

---

## Campos de un proyecto

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre del proyecto |
| Subtítulo | Descripción corta en una línea |
| Descripción | Texto largo explicando qué hace |
| Responsable principal | Usuario encargado |
| Responsable secundario | Usuario de apoyo (opcional) |
| Estado | Producción / Desarrollo / Parado |
| Ubicación | Dónde corre (ordenador, servidor...) |
| Tecnologías | Tags de tecnologías usadas |
| Entornos de desarrollo | IDEs, frameworks, herramientas |
| URL | Dirección web del proyecto |
| Credenciales | Dónde están guardadas las credenciales |

---

## Roles

- **Admin** — puede crear, editar y eliminar proyectos, tecnologías y usuarios
- **Viewer** — solo puede ver el listado y el detalle de proyectos

---

## Solución de problemas comunes

**MySQL no arranca**
Abre el Administrador de tareas, busca `mysqld.exe` en procesos y termínalo. Luego vuelve a darle a Start en XAMPP.

**404 en las rutas de la API**
Comprueba que `backend/.htaccess` existe y contiene:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [QSA,L]
```

**La sesión no persiste**
Asegúrate de que el nombre de sesión en `backend/config/config.php` es `CATALOGO_SESSION` y que las cookies no están bloqueadas en el navegador.
