# Plan 02: Consolidación de Perfiles V1, Landing Pública, Historial de Clases y Reprogramación con Avisos

- **Estado:** ✅ Completado (2026-10-19 / 2026-10-20)
- **Etapa:** Refinamiento Operativo y UX de V1
- **Módulos afectados:** `prisma`, `auth`, `users`, `schedules`, `bookings`, `notifications`, `attendance`, `frontend`

---

## 1. Contexto y Objetivo
Alinear la **Versión 1** con la operación real del estudio, simplificando los perfiles activos a **2 roles operativos (`ADMIN` y `CLIENT`)** donde el Administrador actúa también como instructor por defecto, mientras se deja la estructura de base de datos lista para activar el rol `INSTRUCTOR` independiente en la V2. Además, incorporar una Landing Page pública, separar las reservas activas del historial de clases, permitir editar datos en *Mi Cuenta* y habilitar la reprogramación o suspensión de días específicos de clase con notificación automática.

---

## 2. Decisiones de Diseño e Implementación

### 2.1. Control de Menús por Rol en Base de Datos (`RoleMenuPermission`)
- **Tabla `role_menu_permissions`:** Almacena qué módulos (`menuKey`) están habilitados (`enabled`) y en qué orden (`sortOrder`) para cada rol (`ADMIN`, `CLIENT`, `INSTRUCTOR`).
- **Comportamiento en V1:**
  - `ADMIN`: Tiene habilitados todos los módulos operativos y administrativos (incluyendo *Asistencia & Check-in* y *Historial de Clases & Alumnos*).
  - `CLIENT`: Tiene habilitados `CATALOG`, `MY_BOOKINGS`, `CLASS_HISTORY`, `NOTIFICATIONS` y `ACCOUNT`.
  - `INSTRUCTOR`: Registrado en la tabla con `enabled: false` en V1, permitiendo activarlo en V2 sin migraciones destructivas.
- **Autenticación:** `/auth/login`, `/auth/register` y `/auth/me` devuelven `allowedMenus` para que el `Sidebar` renderice dinámicamente las opciones permitidas.

### 2.2. Landing Page Pública (*Atelier Somatique*)
- **Componente `LandingPage.tsx`:** Vista de entrada para usuarios no autenticados inspirada en *ClassPass / Atelier Somatique*.
- Incluye barra de navegación sticky, presentación de las 3 sedes principales (**Providencia**, **Las Condes**, **Vitacura**) con el detalle de los días y jornadas en que se imparten clases en cada una (ej. Viernes PM en Las Condes, Viernes AM en Vitacura, Lunes a Sábado en Providencia) y accesos directos a Iniciar Sesión / Crear Cuenta.

### 2.3. Panel de Inicio Diferenciado por Perfil (`App.tsx`)
- **Inicio Administrador:** Resumen ejecutivo con tarjetas de acción rápida (comprobantes pendientes de validar, reservas activas del estudio, sesiones con check-in hoy y gestión de horarios/sedes).
- **Inicio Alumno:** Tarjeta destacada con su próxima sesión agendada, contador de reservas activas, selector/indicador de sede favorita y bandeja rápida de últimos avisos.

### 2.4. Separación de "Reservas Activas" vs. "Historial de Clases"
- **`MyBookingsModal.tsx` (Reservas Activas):**
  - Filtra exclusivamente sesiones vigentes/futuras (`CONFIRMADA`, `PENDIENTE_VALIDACION`, `PENDIENTE_PAGO`).
  - En modo **Admin**, permite alternar entre sus reservas personales y todas las **Reservas Activas del Estudio**, con botón directo para ver los asistentes de cada clase.
- **`ClassHistoryModal.tsx` (Historial de Clases):**
  - Nuevo modal dedicado a sesiones pasadas o finalizadas (`ATTENDED`, `NO_SHOW`, `EXCUSED`, `CANCELADA_CLIENTE`, `RECHAZADA_ADMIN`).
  - Incluye buscador por código/sede/alumno y filtros por estado histórico.

### 2.5. Módulo "Mi Cuenta" (`AccountProfileModal.tsx`)
- Nuevo endpoint `PATCH /api/v1/auth/profile` y actualización de `UpdatePreferencesDto`.
- Permite a cualquier usuario editar su **nombre completo**, **correo electrónico** y **teléfono de contacto**, y a los alumnos configurar además su **sede favorita** y **jornada preferida (`AM` / `PM`)**.

### 2.6. Gestión de Clases V1: Reprogramación y Suspensión de Días Puntuales
- **Simplificación de creación (`CreateScheduleDto` / `BulkGenerateSchedulesDto`):** En V1 no se exige seleccionar disciplina ni instructor manualmente; el backend asigna por defecto la clase base del estudio y al Administrador como instructor.
- **Edición / Cambio de Sede u Horario (`PATCH /api/v1/schedules/:id`):** Permite modificar un día específico (por ejemplo, mover la clase de un viernes a otra sede o cambiar su hora) y envía una notificación `SCHEDULE_UPDATED` a los alumnos inscritos o a todos los alumnos activos.
- **Suspensión de un Día Específico (`PATCH /api/v1/schedules/:id/cancel`):** Cancela la sesión del día indicado, actualiza las reservas asociadas y envía un aviso `SCHEDULE_CANCELLED` con el motivo a los alumnos.
- **Acceso a Nómina de Asistentes:** Desde cada tarjeta de clase en `AdminClassesModal` se puede abrir directamente la lista de asistencia de esa sesión.

### 2.7. Aislamiento Estricto y Resolución Automática de Notificaciones
- **Subida de Comprobante (`VOUCHER_UPLOADED`):** Solo genera notificación para los usuarios con rol `ADMIN`. El alumno no recibe alertas redundantes de su propia subida.
- **Aprobación / Rechazo (`PAYMENT_APPROVED` / `PAYMENT_REJECTED`):**
  - Se notifica exclusivamente al alumno titular de la reserva.
  - Se ejecuta `resolveAdminVoucherNotifications()` que marca automáticamente como leídas (`read: true`) las alertas `VOUCHER_UPLOADED` de ese código de reserva en la bandeja de los administradores.
  - Desde `NotificationsModal.tsx`, el Administrador puede ver el comprobante adjunto y **Aprobar o Rechazar** el pago directamente sin salir de la notificación.
