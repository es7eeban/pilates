# Plan 03: Dashboard Analítico Admin, Asistencia del Día, Historial por Clase y Bloques Semanales

## 1. Objetivo
Adaptar la interfaz y operación del rol **Administrador / Instructor** en la Versión 1 para reflejar su rol como instructor y gestor del estudio (no como alumno):
1. **Dashboard Ejecutivo con Gráficos:** En *Inicio & Agenda en Vivo*, ocultar "Tu Sede Favorita" y el botón "Reservar Clase", e incorporar **2 gráficos analíticos** (Asistencia de Clases y Demanda/Agendamientos por Sede).
2. **Menú Lateral Reestructurado (`Sidebar.tsx`):**
   - **Operación & Agenda:** *Inicio & Agenda en Vivo* + submenú desplegable **Gestión de Clases** (*Asistencia & Check-in*, *Próximas Clases*, *Historial de Clases*). Se elimina *Reservas Activas* para el Admin.
   - **Notificaciones:** *Validación de Pagos* y *Avisos & Notificaciones*.
   - **Administración:** *Gestión de Clases & Horarios*, *Sedes* y *Usuarios & Roles*.
   - **Configuración:** *Mi Cuenta*.
3. **Asistencia & Check-in del Día (`AttendanceModal.tsx`):**
   - Muestra las clases del día actual sin requerir un paso previo de "Iniciar Clase".
   - Al abrir la clase, lista a los alumnos con su **Estado de Pago** (*Pago Aceptado*, *En Revisión*, *No Pagado*), botones *Presente* / *No Presente* / *Justificado* y el botón **"✅ Clase Realizada"** que guarda la sesión y la archiva en el Historial.
4. **Historial de Clases & Alumnos (`ClassHistoryModal.tsx`):**
   - Muestra las clases desde el día anterior (y las finalizadas/canceladas) indicando si fue **Clase Realizada** o **Clase No Realizada / Cancelada**, con desplegable de asistentes y motivo de cancelación.
5. **Gestión de Clases & Horarios por Bloques (`AdminClassesModal.tsx`):**
   - En *Administración -> Gestión de Clases & Horarios* consolida los horarios en **Bloques Semanales** (*Día + AM/PM + Sede + Horario + Cantidad máx. de alumnos*), mientras que las fechas puntuales futuras se consultan en *Operación & Agenda -> Gestión de Clases -> Próximas Clases*.
