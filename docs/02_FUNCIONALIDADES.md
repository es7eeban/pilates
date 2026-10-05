# 02. Especificación Funcional & Casos de Uso - Pilates Booking Platform

## 1. Matriz de Roles y Permisos

| Módulo / Acción | Visitante (No autenticado) | Alumno / Cliente | Instructor | Administrador |
| :--- | :---: | :---: | :---: | :---: |
| Explorar catálogo de clases y horarios | ✅ | ✅ | ✅ | ✅ |
| Registro e inicio de sesión | ✅ | ✅ | ✅ | ✅ |
| Reservar con Pasarela Online | ❌ | ✅ | ❌ | ✅ (como cliente) |
| Reservar con Transferencia y Comprobante | ❌ | ✅ | ❌ | ✅ (como cliente) |
| Ver historial personal de reservas | ❌ | ✅ | ❌ | ✅ |
| Cancelar reserva propia (dentro de plazo) | ❌ | ✅ | ❌ | ✅ |
| Ver lista de asistentes a su clase | ❌ | ❌ | ✅ | ✅ |
| Marcar asistencia (Check-in) | ❌ | ❌ | ✅ | ✅ |
| Bandeja de validación de comprobantes | ❌ | ❌ | ❌ | ✅ |
| Aprobar / Rechazar reservas por transferencia | ❌ | ❌ | ❌ | ✅ |
| Crear / Editar / Eliminar tipos de clase | ❌ | ❌ | ❌ | ✅ |
| Crear / Programar horarios y calendarios | ❌ | ❌ | ❌ | ✅ |
| Cancelar clases masivamente y notificar | ❌ | ❌ | ❌ | ✅ |
| Dashboard con métricas de ocupación e ingresos | ❌ | ❌ | ❌ | ✅ |
| Gestión de usuarios y asignación de roles | ❌ | ❌ | ❌ | ✅ |

---

## 2. Detalle de Módulos Funcionales

### 2.1. Módulo de Catálogo & Calendario Interactivo
- **Vista Semanal / Diaria / Mensual:** Navegación fluida por fechas, responsive en smartphones y escritorio.
- **Filtros Dinámicos:**
  - Por Tipo de Clase (Reformer, Mat Clásico, Power Pilates, Stretching).
  - Por Instructor.
  - Por Nivel (Principiante, Intermedio, Avanzado).
  - Por Franja Horaria (Mañana, Tarde, Noche).
- **Indicadores de Disponibilidad en Tiempo Real:**
  - `Cupos Disponibles` (ej. "3 de 8 cupos").
  - `Últimos Cupos` (resaltado en color de alerta cuando quedan 1 o 2).
  - `Agotado` (bloqueado para reservas).
- **Detalle de la Clase:** Duración, requerimientos (ropa adecuada, calcetines antideslizantes), descripción del instructor y precio por sesión.

### 2.2. Módulo de Reserva y Checkout

#### Opción 1: Pago Online Automatizado (Webpay Plus / Mercado Pago / Stripe)
1. El alumno selecciona la clase y hace clic en "Reservar y Pagar en Línea".
2. Se genera un bloqueo temporal de cupo (*Hold*) por 10 minutos para evitar que otro usuario lo tome mientras procesa la transacción.
3. El frontend redirige a la pasarela o despliega el checkout embebido.
4. Tras el pago exitoso:
   - Webhook del backend recibe la confirmación criptográficamente firmada.
   - El estado de la reserva cambia a `CONFIRMADA`.
   - Se descuenta definitivamente el cupo del horario.
   - Se envía automáticamente correo de confirmación al alumno con código de reserva / QR y detalles de la clase.

#### Opción 2: Pago Manual por Transferencia Bancaria
1. El alumno selecciona la clase y hace clic en "Pagar por Transferencia Bancaria".
2. La plataforma despliega los datos de la cuenta bancaria del estudio:
   - Banco, Tipo de Cuenta, Número, Titular, RUT/Identificación fiscal, Email de contacto.
   - Referencia o Código Único de Reserva que debe incluir en la transferencia.
3. El alumno adjunta el comprobante (formatos permitidos: JPG, PNG o PDF; máx 5MB).
4. El sistema crea la reserva en estado `PENDIENTE_VALIDACION`.
5. El cupo queda reservado provisionalmente.
6. Se notifica al Administrador (vía email y alerta en el dashboard) de que hay un nuevo comprobante pendiente de revisión.
7. Al alumno se le informa: *"Tu reserva está en revisión. Te notificaremos una vez que el administrador verifique tu pago."*

### 2.3. Módulo de Validación de Comprobantes (Admin Hub)
- **Bandeja de Entrada de Pagos Pendientes:**
  - Lista priorizada por fecha de la clase (las clases más próximas aparecen primero).
  - Vista previa rápida del comprobante con visor integrado (zoom, rotación, descarga).
  - Comparativa visual: Monto de la clase vs. Monto declarado por el cliente.
- **Acciones del Administrador:**
  - **Botón "Aprobar Pago":**
    - La reserva pasa a `CONFIRMADA`.
    - Se registra el usuario admin que auditó el pago y la fecha/hora exacta.
    - Se dispara el correo y mensaje de WhatsApp al cliente con la confirmación.
  - **Botón "Rechazar Pago":**
    - Modal obligatorio para seleccionar o escribir el motivo del rechazo (ej: *"Comprobante ilegible"*, *"Monto incompleto"*, *"Comprobante duplicado o no figura en cartola"*).
    - La reserva pasa a `RECHAZADA`.
    - El cupo de la clase se libera inmediatamente en el calendario.
    - Se envía notificación inmediata al cliente con el motivo del rechazo y un enlace para reintentar la reserva o contactar a soporte.

### 2.4. Módulo de Gestión de Clases y Horarios (Admin)
- **Definición de Clases:** Nombre, descripción, intensidad, capacidad por defecto (ej. 8 alumnos), tarifa individual y paquetes.
- **Planificador de Calendario:**
  - Generación de horarios individuales.
  - Generación recurrente (ej: "Crear clase de Reformer los Lunes y Miércoles a las 09:00 AM durante los próximos 3 meses").
  - Asignación de instructor titular y sala/reformer.
- **Cancelación o Reprogramación por parte del Estudio:**
  - Si un instructor enferma o hay un imprevisto técnico, el administrador puede cancelar la sesión.
  - El sistema cancela las reservas asociadas, libera a los alumnos y envía un aviso de emergencia masivo por correo y WhatsApp.

### 2.5. Módulo del Alumno (Portal Personal)
- **Mis Próximas Clases:** Tarjetas con la información de clases agendadas, dirección del estudio, botón para agregar a Google Calendar / Apple Calendar.
- **Cancelación Autónoma:**
  - El alumno puede cancelar su asistencia desde su panel, sujeto a la política del estudio (ej. *"Permitido cancelar hasta con 12 horas de anticipación"*).
  - Si cancela a tiempo, el cupo se libera automáticamente para otros usuarios y se le acredita una sesión a favor o se gestiona reembolso.
- **Historial Completo:** Registro de clases asistidas, canceladas y comprobantes emitidos.

### 2.6. Módulo de Instructores y Check-In Presencial
- **Lista de Asistencia del Día:** Vista optimizada para tablet o smartphone del instructor al inicio de cada clase.
- **Check-In rápido:** Marcar alumno como `PRESENTE` o `AUSENTE` con un solo toque.

---

## 3. Políticas de Negocio y Reglas de Validación

1. **Apertura de Agenda:** Las clases pueden reservarse con hasta 30 días de anticipación.
2. **Cierre de Reservas:** No se permiten reservas con menos de 30 minutos de antelación a la hora de inicio de la clase.
3. **Tiempo Máximo de Validación de Transferencia:** Si una reserva por transferencia no es revisada o si el comprobante no se sube dentro de un límite parametrizable (ej. 4 horas antes del inicio de la sesión), el sistema alerta al administrador.
4. **Política de Cancelación:** Cancelaciones con menos de 12 horas de aviso no liberan crédito ni reembolso, marcándose como `CANCELADA_TARDIA`.
