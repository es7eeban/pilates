# Pilates Booking System - Especificación Funcional y Técnica

Sistema web integral para la gestión y reserva de clases de pilates, integrando pagos automatizados (pasarela) y manuales (transferencia bancaria con comprobante), calendario interactivo, roles de acceso y sistema de notificaciones automáticas vía Correo y WhatsApp.

---

## 1. Arquitectura & Stack Tecnológico Recomendado

| Componente | Opción Cloud / Recomendada | Alternativa Self-Hosted / Local |
| :--- | :--- | :--- |
| **Frontend** | Next.js / React (Tailwind CSS) | React + Vite (Tailwind CSS) |
| **Backend** | Node.js (Express o Next.js API Routes) / NestJS | Node.js / NestJS en contenedor |
| **Base de Datos** | PostgreSQL administrado (Supabase / Neon) | PostgreSQL local en Docker |
| **Almacenamiento de Archivos** | AWS S3 / Cloudinary / Supabase Storage | MinIO / Disco local montado |
| **Hosting & Despliegue** | Vercel (Front) + Railway/Render (API) | VPS (Ubuntu, Nginx, Docker Compose) |
| **Dominio & DNS** | Cloudflare + Proveedor DNS (.cl / .com) | Nginx Reverse Proxy + Let's Encrypt |

---

## 2. Roles y Modelo de Permisos

### 2.1. Alumno / Cliente
- Registro e inicio de sesión seguro (Email + Contraseña o Magic Link).
- Visualización de calendario con disponibilidad de cupos por clase en tiempo real.
- Reserva de clases con flujo de pago online o carga de comprobante bancario.
- Historial de reservas (confirmadas, pendientes, canceladas).

### 2.2. Administrador / Instructor
- Panel de control (Dashboard) con métricas de ocupación e ingresos.
- Gestión de clases: creación de horarios, capacidad máxima de alumnos por sesión, instructores y tarifas.
- Módulo de validación de pagos manuales: revisión de comprobantes subidos y aprobación/rechazo de reservas.
- Cancelación o reprogramación de clases con aviso masivo a los inscritos.

---

## 3. Flujo Funcional de Reserva y Pagos

### Flujo A: Pago Automatizado en Línea
1. El usuario selecciona la clase, fecha y hora en el calendario.
2. El sistema reserva provisionalmente el cupo por un tiempo límite (e.g., 10 minutos).
3. El usuario paga vía pasarela (Webpay Plus / Mercado Pago / Stripe).
4. El webhook de la pasarela confirma el pago con éxito.
5. El sistema cambia el estado de la reserva a `CONFIRMADA`.
6. Disparo automático de notificaciones (Email + WhatsApp) con los detalles de la clase.

### Flujo B: Pago Manual por Transferencia
1. El usuario selecciona el bloque horario y elige la opción **Transferencia Bancaria**.
2. La plataforma muestra los datos de la cuenta bancaria para transferir.
3. El usuario adjunta la imagen o PDF del comprobante de transferencia y confirma la solicitud.
4. El cupo queda retenido bajo el estado `PENDIENTE_VALIDACION`.
5. El sistema envía una notificación (Email/Alerta push) al **Administrador** indicando que hay un comprobante por revisar.
6. **Resolución del Administrador:**
   - **Aprobar:** La reserva pasa a `CONFIRMADA` y se envía confirmación al alumno (Email / WhatsApp).
   - **Rechazar:** El cupo se libera, el estado pasa a `RECHAZADA` y se notifica al alumno el motivo de rechazo para reintentar.

---

## 4. Integraciones Externas

- **Pagos Online:** Integración con API/SDK de Mercado Pago o Webpay Transbank.
- **Notificaciones por Email:** Integración transaccional con Resend o SendGrid (plantillas HTML responsivas).
- **Notificaciones por WhatsApp:** Integración mediante API oficial de Meta Cloud API o proveedores como Twilio / Z-API.
- **Almacenamiento (Vouchers):** Bucket para almacenar comprobantes de pago de forma segura mediante URLs prefirmadas.

---

## 5. Modelo de Datos Relacional (Base)

```sql
-- Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'CLIENT', -- 'CLIENT', 'ADMIN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clases / Tipos de sesión
CREATE TABLE class_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INT NOT NULL DEFAULT 8,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Horarios / Sesiones programadas
CREATE TABLE class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_type_id UUID REFERENCES class_types(id),
    instructor_name VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available_slots INT NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' -- 'SCHEDULED', 'CANCELLED', 'COMPLETED'
);

-- Reservas
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    schedule_id UUID REFERENCES class_schedules(id),
    status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED', 'REJECTED'
    payment_method VARCHAR(30), -- 'GATEWAY', 'TRANSFER'
    voucher_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transacciones / Pagos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    amount NUMERIC(10, 2) NOT NULL,
    gateway_transaction_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    verified_by_user_id UUID REFERENCES users(id), -- ID del admin si fue manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);