# 00. Idea Inicial y Prototipos de Diseño (`IdeasSDD`)

Esta carpeta conserva el **origen conceptual y visual** del proyecto antes de su formalización técnica en el SDD de la Versión 1. Sirve como línea base histórica para entender cómo evolucionó la idea inicial hacia el sistema en producción.

---

## 📄 Documentos y Recursos en esta Carpeta

### 1. [Especificación Conceptual Original (`idea.md`)](./idea.md)
Primer documento de definición del proyecto donde se plantearon:
- El problema a resolver: agendamiento de clases de pilates con control de cupos y doble vía de pago (pasarela automatizada + transferencia bancaria con validación de comprobante).
- Roles iniciales (Alumno y Administrador/Instructor).
- Primer boceto de tablas SQL (`users`, `class_types`, `class_schedules`, `bookings`, `payments`).

### 2. Sistema de Diseño y Prototipos UI (`stitch_pilates_studio_web_redesign/`)
Maquetas HTML y capturas de referencia generadas para definir la identidad visual *Wellness / Somatic Atelier*:

| Recurso / Prototipo | Ruta | Propósito |
| :--- | :--- | :--- |
| **Sistema de Diseño (Tokens & Tipografía)** | [`l_harmonie_pilates_atelier/DESIGN.md`](./stitch_pilates_studio_web_redesign/l_harmonie_pilates_atelier/DESIGN.md) | Paleta cromática (salvia, arena, carbón, terracota), tipografías (*Epilogue*, *Plus Jakarta Sans*) y estilo editorial. |
| **Landing Page Principal** | [`landing_page_principal_atelier_somatique/code.html`](./stitch_pilates_studio_web_redesign/landing_page_principal_atelier_somatique/code.html) | Referencia visual para la página pública de bienvenida del estudio. |
| **Nuestras Sedes** | [`nuestras_sedes_atelier_somatique/code.html`](./stitch_pilates_studio_web_redesign/nuestras_sedes_atelier_somatique/code.html) | Presentación de sucursales (Providencia, Las Condes, Vitacura) y equipamiento. |
| **Disciplinas & Método Somático** | [`disciplinas_m_todo_som_tico_atelier_somatique/code.html`](./stitch_pilates_studio_web_redesign/disciplinas_m_todo_som_tico_atelier_somatique/code.html) | Catálogo visual de disciplinas (reservado como referencia para V2). |
| **Agenda de Clases & Reservas en Vivo** | [`agenda_de_clases_reservas_en_vivo/code.html`](./stitch_pilates_studio_web_redesign/agenda_de_clases_reservas_en_vivo/code.html) | Vista interactiva de horarios, filtros por sede/jornada y cupos disponibles. |
| **Gestión de Clases (Calendario Admin)** | [`gesti_n_de_clases_calendario/code.html`](./stitch_pilates_studio_web_redesign/gesti_n_de_clases_calendario/code.html) | Interfaz de administración para programar horarios y gestionar sesiones. |
| **Mi Asistencia a Clases** | [`mi_asistencia_clases/code.html`](./stitch_pilates_studio_web_redesign/mi_asistencia_clases/code.html) | Nómina de alumnos inscritos y control de check-in en sala. |

---

## 🔗 Relación con las Siguientes Etapas
- **[Ir a Versión 1 (`../v1/`)](../v1/README.md):** Donde esta idea inicial se transformó en el SDD completo en producción y donde se registran los planes de mejoras incrementales.
- **[Ir a Versión 2 (`../v2/`)](../v2/README.md):** Donde se proyectan los siguientes pasos evolutivos del producto.
