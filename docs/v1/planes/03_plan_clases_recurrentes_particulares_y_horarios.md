# Plan 03: Escenarios de Gestión de Clases (Recurrentes vs. Particulares), Horarios AM/PM y Cuenta Bancaria

- **Estado:** ✅ Implementado (2026-10-22)
- **Etapa:** Refinamiento Operativo de V1
- **Módulos afectados:** `prisma`, `auth`, `users`, `schedules`, `frontend`

---

## 1. Reglas de Negocio Generales de Clases en V1

1. **Sin Tipo de Clase ni Disciplina:** Todas las sesiones corresponden a una **Clase de Pilates** general del estudio. El administrador no debe elegir disciplina ni instructor manualmente al agendar o editar.
2. **Un Único Botón de Acción Principal (`+ Agregar Clase`):** En la barra de herramientas de *Control de Clases & Horarios* aparece un único botón **`Agregar Clase`**. Al pulsarlo, se despliega el formulario que contiene las dos tarjetas descriptivas para elegir la modalidad:
   - **🔄 Clase Recurrente (Ej. Viernes y Sábados)**
   - **📅 Clase en Particular (Un día específico)**
3. **Selector de Horarios Simple por Jornada (`AM` / `PM`) sin Scroll Infinito:**
   - **Jornada `AM` (Mañana):**
     - `De 8:00 a 9:00 AM` (`08:00 - 09:00`)
     - `De 9:00 a 10:00 AM` (`09:00 - 10:00`)
     - `De 10:00 a 11:00 AM` (`10:00 - 11:00`)
     - `De 11:00 a 12:00 AM` (`11:00 - 12:00`)
   - **Jornada `PM` (Tarde):**
     - `De 12:00 a 1:00 PM` (`12:00 - 13:00`)
     - `De 1:00 a 2:00 PM` (`13:00 - 14:00`)
     - `De 2:00 a 3:00 PM` (`14:00 - 15:00`)
     - `De 3:00 a 4:00 PM` (`15:00 - 16:00`)
     - `De 4:00 a 5:00 PM` (`16:00 - 17:00`)
     - `De 5:00 a 6:00 PM` (`17:00 - 18:00`)
     - `De 6:00 a 7:00 PM` (`18:00 - 19:00`)
     - `De 7:00 a 8:00 PM` (`19:00 - 20:00`)
     - `De 8:00 a 9:00 PM` (`20:00 - 21:00`)
     - `De 9:00 a 10:00 PM` (`21:00 - 22:00`)

---

## 2. Matriz de Escenarios: Agregar, Editar y Eliminar/Suspender Clases

### 🟢 A. Escenarios de AGREGAR Clases

| Escenario | Acción del Administrador | Campos Solicitados | Qué ocurre en el Sistema |
| :--- | :--- | :--- | :--- |
| **A1. Agregar Clase en Particular (Fecha única)** | Pulsa `Agregar Clase` y selecciona **Clase en Particular (Un día específico)**. | • Sede<br>• Día de la Clase (Fecha)<br>• Jornada (`AM`/`PM`) + Horario<br>• Cantidad máx. de alumnos<br>• Tarifa (CLP) | Se crea **1 única sesión** (`POST /api/v1/schedules`) en la fecha y tramo horario indicados. Valida que no exista ya una clase en esa misma sede, fecha y hora para evitar duplicados. |
| **A2. Agregar Clase Recurrente (Ej. Viernes y Sábados)** | Pulsa `Agregar Clase` y selecciona **Clase Recurrente**. | • Sede<br>• Horario (`AM`/`PM` + tramo)<br>• Cantidad máx. de alumnos<br>• Tarifa (CLP)<br>• Desde Fecha / Hasta Fecha<br>• Días de la semana (Lun..Dom, con Viernes y Sábado por defecto) | Genera automáticamente todas las sesiones (`POST /api/v1/schedules/bulk-generate`) para los días de la semana seleccionados dentro del rango de fechas, omitiendo fechas donde ya exista ese mismo bloque en esa sede. |

---

### 🟡 B. Escenarios de EDITAR Clases

| Escenario | Acción del Administrador | Validación / Pregunta de Alcance | Qué ocurre en el Sistema |
| :--- | :--- | :--- | :--- |
| **E1. Editar una Clase en Particular (1 sola fecha)** | Hace clic en `Editar` sobre una clase puntual y cambia su horario, sede, fecha, cupo o tarifa. | No requiere pregunta de recurrencia (es fecha única). | Se actualiza **el mismo registro existente** (`PATCH /api/v1/schedules/:id`). **No se crea una clase nueva ni permanece el horario antiguo.** Si el cupo máximo cambia, se recalcula `availableSlots` respetando los alumnos ya inscritos y se envía notificación del cambio. |
| **E2. Editar SOLO 1 Fecha de una Clase Recurrente (Excepción puntual)** | Tiene un problema un día específico (ej. el Viernes 24 de Octubre debe pasar de `9 a 10 AM` a `11 a 12 AM` o cambiar de sede), pero quiere que los demás viernes sigan en su horario normal. | El formulario pregunta:<br>👉 **¿A qué clases deseas aplicar esta modificación?**<br>El admin elige: **"Solo una fecha en particular (Excepción)"** y selecciona la fecha puntual en el desplegable. | Se actualiza **únicamente la sesión de esa fecha seleccionada** (`PATCH /api/v1/schedules/:id`). Todas las demás fechas futuras de la serie recurrente **se mantienen intactas** en su horario original. Se notifica solo por esa fecha modificada. |
| **E3. Editar TODAS las Fechas de una Clase Recurrente (Cambio de bloque)** | Quiere cambiar permanentemente el horario, sede, cupos o tarifa de todo un bloque recurrente (ej. pasar todos los Viernes de `9 a 10 AM` a `10 a 11 AM`). | El formulario pregunta:<br>👉 **¿A qué clases deseas aplicar esta modificación?**<br>El admin elige: **"Todas las fechas recurrentes (N sesiones)"**. | Se ejecuta `PATCH /api/v1/schedules/bulk-update` sobre todas las sesiones activas de ese bloque, actualizando cada una en su propia fecha al nuevo horario. **El horario antiguo se reemplaza por completo y nunca quedan dos bloques duplicados (el viejo y el nuevo).** |

---

### 🔴 C. Escenarios de ELIMINAR / SUSPENDER Clases

| Escenario | Acción del Administrador | Validación / Pregunta de Alcance | Qué ocurre en el Sistema |
| :--- | :--- | :--- | :--- |
| **D1. Suspender una Clase en Particular (Fecha única)** | Hace clic en `Suspender` sobre una clase puntual e ingresa el motivo. | Confirmación directa con motivo y alcance de notificación. | La sesión pasa a estado `CANCELLED` (`PATCH /api/v1/schedules/:id/cancel`), desaparece de la agenda disponible, pasa al *Historial de Clases* con su motivo y notifica a los alumnos. |
| **D2. Suspender SOLO 1 Fecha de una Clase Recurrente** | Un viernes puntual no podrá dictar clases, pero los viernes siguientes sí se realizarán normalmente. | El formulario pregunta:<br>👉 **¿Qué deseas suspender?**<br>El admin elige: **"Solo una fecha en particular"** y escoge el día específico en el listado. | Se suspende **únicamente esa fecha** (`PATCH /api/v1/schedules/:id/cancel`) y se avisa a los alumnos. **El resto de las fechas futuras de la clase recurrente siguen activas en la agenda.** |
| **D3. Suspender TODO un Bloque Recurrente** | Decide eliminar definitivamente un horario recurrente completo (todas sus fechas futuras). | El formulario pregunta:<br>👉 **¿Qué deseas suspender?**<br>El admin elige: **"Todo el bloque recurrente (N fechas)"**. | Se ejecuta `PATCH /api/v1/schedules/bulk-cancel` cancelando todas las sesiones futuras de ese bloque en una sola operación y notificando a los alumnos inscritos. |

---

## 3. Gestión Autónoma de Selectores de Horario (AM / PM)

El Administrador tiene total autonomía para definir qué horarios aparecen en los desplegables de agendamiento y edición, sin depender de desarrollo de software:

1. **Pestaña `Ajustar Horarios` en Control de Clases:**
   - Permite agregar nuevos tramos en AM o PM con cualquier duración (ej. `09:00` a `10:30` AM = 90 minutos, `18:30` a `20:00` PM).
   - Permite editar o eliminar horarios no utilizados (ej. si solo se dictan clases de `9:00 a 10:00` y `11:00 a 12:00` en AM, puede dejar únicamente esas dos opciones).
   - Botón para **Restaurar por defecto** en caso de querer recuperar los bloques estándar de 1 hora.
2. **Acceso Rápido desde el Formulario:**
   - Botón directo `⚙️ Ajustar horarios AM/PM` ubicado sobre el selector de horario en *Agregar Clase* y *Editar Clase*.
3. **Cálculo Dinámico de Duración:**
   - El sistema calcula automáticamente la duración en minutos de cualquier tramo horario seleccionado (`(endH * 60 + endM) - (startH * 60 + startM)`), asegurando que tanto las clases puntuales como las recurrentes (`bulk-generate`) se programen con la duración exacta configurada.
4. **Persistencia en Base de Datos:**
   - Almacenado en la tabla `studio_time_slots` mediante los endpoints `GET/POST/PATCH/DELETE /api/v1/schedules/time-slots`.

