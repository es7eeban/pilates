# Propuesta Evolutiva y Especificación de Cambios - Versión 2.0 (V2)

Este documento define la hoja de ruta funcional, de experiencia de usuario (UX/UI) y de modelo de datos para la **Versión 2.0** del sistema.

> **Relación con el SDD de la Versión 1:**
> La **V2 utiliza como base toda la arquitectura, seguridad, motor de reservas ACID y notificaciones de la [Versión 1 (`../v1/`)](../v1/README.md)**. Este documento registra específicamente **las diferencias (el delta)** que se incorporarán sobre la V1 en cuanto a modelo comercial, activación de nuevos perfiles, ajustes de UX y nuevas capacidades.

---

## 1. Diferencias Clave entre V1 y V2 (Resumen Ejecutivo)

| Dimensión | Cómo funciona en V1 (Actual) | Qué cambia / se agrega en V2 (Objetivo) |
| :--- | :--- | :--- |
| **Perfiles / Roles** | 2 perfiles activos: **Administrador** (que también imparte las clases) y **Alumno** (`CLIENT`). El rol `INSTRUCTOR` existe en BD pero con menús deshabilitados. | Se habilita el 3er perfil activo: **Instructor independiente** (`INSTRUCTOR`) con su propio panel de clases, check-in y reporte de horas/comisiones. |
| **Modelo de Cobro** | Pago por clase individual (Transferencia bancaria con comprobante o Pasarela por sesión). | **Sistema de Packs de Sesiones y Membresías Recurrentes** con Billetera de Créditos (*Credit Wallet*). |
| **Flujo UX de Reserva** | El alumno elige horario y sube comprobante o paga la sesión individual. | Reserva en **1 clic descontando 1 crédito** de su Pack activo (confirmación inmediata sin subir comprobante en cada clase). |
| **Catálogo de Clases** | Agenda enfocada directamente en **Sede + Día/Horario** (clase base unificada). | Activación del catálogo multi-disciplina (*Reformer Clásico*, *Mat Somático*, *Cadillac*, *Prenatal*) con filtros visuales por intensidad e instructor. |

---

## 2. Activación del Perfil Instructor (`INSTRUCTOR`)

En la V1 dejamos creada la tabla `role_menu_permissions` con los registros del rol `INSTRUCTOR` en `enabled: false`. Para la V2:
1. **Habilitación inmediata de menús:** Se activan en `role_menu_permissions` las vistas de *Mis Clases Asignadas*, *Check-in de Asistencia* y *Mi Cuenta* para instructores.
2. **Asignación por horario:** En el modal de Gestión de Clases del Administrador se vuelve a mostrar el selector de Instructor por sesión (permitiendo múltiples profesores por sede).
3. **Liquidación de honorarios:** Reporte mensual automático de clases dictadas y cantidad de alumnos asistidos (`ATTENDED`) por cada instructor.

---

## 3. Sistema de Packs, Membresías y Billetera de Créditos (*Credit Wallet*)

### 3.1. Propósito Comercial
Permitir que los alumnos compren paquetes de clases prepagados o suscripciones mensuales, reduciendo la fricción de subir un comprobante por cada sesión individual y reduciendo la carga de validación manual del Administrador.

### 3.2. Catálogo de Packs y Planes
- **Packs por Sesiones:**
  - *Pack Bienvenida (4 clases)* – Vigencia 30 días.
  - *Pack Mensual (8 clases - 2 por semana)* – Vigencia 30 días.
  - *Pack Intensivo (12 clases - 3 por semana)* – Vigencia 45 días.
  - *Pack Trimestral (24 clases)* – Vigencia 90 días.
- **Membresías Recurrentes:**
  - Suscripción mensual con cobro automático y renovación de créditos cada mes.

### 3.3. Cambios en la UX del Alumno (*Credit Wallet*)
- **Indicador en el Header y Dashboard:** El alumno ve siempre su saldo disponible (ej. *"Tienes 6 créditos disponibles · Vencen el 15 Nov"*).
- **Reserva Instantánea:** Al seleccionar una clase en la Agenda en Vivo:
  - Si tiene créditos vigentes, el botón principal es **"Reservar con 1 Crédito"** -> pasa directo a `CONFIRMADA`.
  - Si cancela con más de 2 horas de anticipación, el crédito se reintegra automáticamente a su billetera (`+1 crédito`).
- **Compra de Pack:** El alumno puede pagar un Pack completo mediante transferencia (1 sola validación del Admin para 8 o 12 clases) o mediante pasarela online.

### 3.4. Nuevas Tablas para el Esquema de Datos (Extensión sobre Prisma V1)

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

-- Registro auditable de consumos y recargas de créditos
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

## 4. Evolución de UX/UI y Nuevas Pantallas en V2

1. **Catálogo Público y Filtro de Disciplinas:**
   - Incorporar la vista editorial de disciplinas (basada en el prototipo [`disciplinas_m_todo_som_tico_atelier_somatique`](../IdeasSDD/stitch_pilates_studio_web_redesign/disciplinas_m_todo_som_tico_atelier_somatique/code.html)) cuando el estudio diversifique los tipos de sesión por sede.
2. **Sección "Mis Packs & Créditos":**
   - Nueva pestaña en el panel del alumno para comprar packs, ver fecha de vencimiento y revisar la cartola de uso de créditos.
3. **Reportes Analíticos y BI para Administración:**
   - Mapa de calor de ocupación semanal por sede y horario.
   - Tasa de retención de alumnos y alerta de packs próximos a vencer o agotar créditos.
4. **PWA / Experiencia Móvil Instalable:**
   - Configuración Progressive Web App para instalar en iOS/Android con recordatorios antes de la sesión.

---

## 5. Backlog Abierto de Ideas (Para ir Moldeando la V2)

*(Espacio vivo para anotar ideas, ajustes de UX o requerimientos que surjan durante el uso de la V1)*

- [ ] **Asignación manual de créditos por el Admin:** Permitir que el Administrador cargue o regale créditos manualmente a un alumno en su perfil.
- [ ] **Penalización configurable por inasistencia (`NO_SHOW`):** Descontar el crédito sin reembolso si el alumno no asiste ni cancela dentro de la ventana permitida.
- [ ] **Sistema de referidos:** Beneficio de clase adicional por invitar a un nuevo alumno.
- [ ] **Venta de accesorios en estudio:** Registro de compra de calcetines antideslizantes (*grip socks*) o insumos sumados al pago de la reserva.
- [ ] **Integración con facturación / boleta electrónica:** Emisión automática al aprobar pagos de packs o sesiones.
