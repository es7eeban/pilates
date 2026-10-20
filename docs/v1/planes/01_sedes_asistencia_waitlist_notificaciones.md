# Plan 01: Expansión Multi-Sede, Control de Asistencia, Lista de Espera y Notificaciones

- **Estado:** ✅ Completado e Integrado en V1
- **Etapa:** Evolución sobre el SDD base de V1
- **Módulos afectados:** `prisma`, `branches`, `attendance`, `waitlist`, `notifications`, `frontend`

---

## 1. Objetivo del Plan
Ampliar el alcance inicial del SDD para soportar la operación real de un estudio con múltiples sucursales, control de asistencia en sala, manejo de sobrecupos mediante lista de espera automatizada y trazabilidad de notificaciones.

---

## 2. Funcionalidades Implementadas

### 2.1. Gestión Multi-Sede (`Branches`)
- Creación del modelo `Branch` en Prisma (`name`, `slug`, `address`, `city`, `commune`, `phone`, `isActive`).
- Asociación de cada horario (`ClassSchedule`) a una sede específica (`branchId`).
- Preferencia de sede favorita (`favoriteBranchId`) y jornada (`favoriteTimeSchedule`) en el perfil del usuario.
- Panel administrativo (`AdminBranchesModal`) para crear, editar y activar/desactivar sedes.

### 2.2. Control de Asistencia y Check-in (`Attendance`)
- Incorporación de `attendanceStatus` (`PENDING`, `ATTENDED`, `NO_SHOW`, `EXCUSED`), `checkInAt` y `attendanceNotes` en el modelo `Booking`.
- Endpoints en `AttendanceController` y modal `AttendanceModal` para pasar lista en tiempo real y registrar observaciones por alumno.

### 2.3. Lista de Espera Inteligente (`Waitlist`)
- Creación del modelo `WaitlistEntry` con estados `WAITING`, `OFFERED`, `ACCEPTED`, `EXPIRED`, `DECLINED` y máximo de 3 cupos en espera por sesión.
- Promoción automática FIFO cuando un alumno con reserva confirmada cancela su asistencia, otorgando una ventana de **1 hora** (`expiresAt`) para aceptar el cupo liberado (`WaitlistAcceptModal`).

### 2.4. Motor de Notificaciones Transaccionales (`Notifications`)
- Modelo `Notification` en base de datos con soporte para bandeja in-app y simulación auditada de Email y WhatsApp en `metadata`.
- Disparo automático en eventos clave: creación de reserva, subida de comprobante, aprobación/rechazo de pago, cancelación y alertas de lista de espera.

### 2.5. Preparación para Despliegue en Producción y CORS
- Configuración de compilación limpia en NestJS y Vite, soporte de almacenamiento de comprobantes con `multer` y normalización automática de `VITE_API_URL` y orígenes CORS.
