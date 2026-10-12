# Pilates Booking System - Versión 2.0 (V2)
## Banco de Ideas, Packs, Membresías y Roadmap Futuro

Documento maestro para registrar y estructurar todas las características, modelos de negocio y funcionalidades avanzadas planificadas para la **Versión 2** del sistema, manteniendo la **Versión 1** enfocada en el flujo core de reservas individuales, pagos, notificaciones y administración integral.

---

## 1. Sistema de Packs y Membresías con Créditos

### 1.1. Propósito
En el modelo comercial tradicional de los estudios de pilates, los alumnos rara vez pagan cada clase de manera aislada. El motor de fidelización y recurrencia son los paquetes de clases y las membresías periódicas.

### 1.2. Catálogo de Packs y Planes
- **Packs por Sesiones:**
  - *Pack Bienvenida (4 clases)* – Vigencia 30 días.
  - *Pack Mensual (8 clases - 2 por semana)* – Vigencia 30 días.
  - *Pack Intensivo (12 clases - 3 por semana)* – Vigencia 45 días.
  - *Pack Trimestral (24 clases)* – Vigencia 90 días.
- **Membresías Recurrentes:**
  - Suscripción mensual con renovación automática vía tarjeta de crédito/débito.
  - Pase libre (ilimitado) sujeto a política de no sobrecupo (máximo 1 reserva simultánea por día).

### 1.3. Billetera de Créditos del Alumno (*Credit Wallet*)
- Cada usuario posee una billetera virtual donde se registran:
  - Saldo de clases disponibles.
  - Fecha de caducidad del pack activo.
  - Historial de movimientos (compra de pack, débito por reserva, reintegro por cancelación a tiempo).
- **Flujo de Reserva con Crédito:**
  - El alumno selecciona su clase en la agenda.
  - Si tiene créditos activos, el sistema ofrece el botón principal: **"Reservar con 1 Crédito de mi Pack"**.
  - La reserva pasa inmediatamente a estado `CONFIRMADA` sin necesidad de subir comprobante ni pasar por pasarela bancaria.

### 1.4. Modelo de Datos Propuesto para V2

```sql
-- Planes y paquetes disponibles
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(120) NOT NULL,
    description TEXT,
    credits_count INT NOT NULL, -- Ej: 4, 8, 12 clases
    validity_days INT NOT NULL, -- Ej: 30, 45, 90 días
    price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applicable_branch_id UUID REFERENCES branches(id), -- Opcional: pack exclusivo de una sede
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suscripciones / Packs adquiridos por los alumnos
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES membership_plans(id),
    total_credits INT NOT NULL,
    remaining_credits INT NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'EXHAUSTED', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registro auditable de consumos y recargas
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_membership_id UUID REFERENCES user_memberships(id),
    booking_id UUID REFERENCES bookings(id),
    amount_change INT NOT NULL, -- -1 por reserva, +1 por cancelación a tiempo, +N por compra
    reason VARCHAR(150) NOT NULL, -- 'CLASS_BOOKING', 'CANCELLATION_REFUND', 'MANUAL_ADJUSTMENT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. Lista de Espera Inteligente (*Waitlist*)

### 2.1. Comportamiento
- Cuando una clase alcanza su aforo máximo (ej. 8 de 8 camas Reformer ocupadas):
  - El botón "Agotado" se transforma en **"Unirme a Lista de Espera"**.
  - Los alumnos en lista de espera quedan ordenados por orden de inscripción (*FIFO*).
- **Liberación de Cupo:**
  - Si un alumno cancela con anticipación, el sistema asigna el cupo automáticamente al primer alumno en lista de espera.
  - Se le envía una alerta inmediata por WhatsApp y Email con un plazo de confirmación (ej. 15 minutos) antes de pasar al siguiente en la lista.

---

## 3. Integración Avanzada de Pasarelas Recurrentes

- Cobros automáticos mensuales mediante **Mercado Pago Subscriptions** o **Transbank Oneclick Webpay**.
- Reintento inteligente de cobros fallidos y notificaciones de tarjeta próxima a expirar.
- Emisión automática de boletas/facturas electrónicas integradas con el SII (vía API como LibreDTE o SimpleFactura).

---

## 4. App Móvil & Notificaciones Push Nativas

- Aplicación móvil compilada en React Native / Expo o Progressive Web App (PWA) instalable.
- Notificaciones push en el teléfono móvil 2 horas antes de la clase con recordatorio de vestimenta adecuada y sede.
- Integración nativa con Apple Wallet y Google Wallet para almacenar el Pase de Acceso al estudio.

---

## 5. Reportes de Negocio y Business Intelligence (Admin)

- Métricas de Churn (abandono de alumnos).
- Tasa de ocupación por instructor, horario y disciplina (mapa de calor semanal).
- Proyección de ingresos recurrentes mensuales (MRR).
- Cálculo automático de comisiones u honorarios a instructores según asistencia efectiva a sus clases.

---

## 6. Registro de Ideas Futuras
*(Sección libre para seguir anotando requerimientos aportados por el equipo o el cliente)*

- [ ] Sistema de referidos: "Invita a una amiga y ambas reciben 1 clase gratis".
- [ ] Venta de productos en recepción (calcetines antideslizantes, botellas de agua, mats) asociados a la cuenta del alumno.
- [ ] Bloqueo de inasistencias reiteradas (penalización a alumnos que acumulen 2 `NO_SHOW` seguidos).
- [ ] Encuestas automáticas de satisfacción post-clase (calificación 1 a 5 estrellas al instructor).
