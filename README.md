# Pilates Booking System

Sistema web integral para la gestión y reserva de clases de pilates con doble método de pago (pasarela online automatizada y transferencia bancaria manual con auditoría de comprobantes), control estricto de aforo multi-sede y notificaciones automáticas.

---

## 🌳 Estrategia de Ramas (Git Branching Model)

Este repositorio sigue un modelo de ramas alineado con la infraestructura multi-entorno:

| Rama | Entorno Asociado | Propósito |
| :--- | :--- | :--- |
| **`main`** | **Producción** | Código estable en producción (`tudominio.com`). Solo recibe merges aprobados desde `qa`. |
| **`qa`** | **Pruebas / Staging** | Entorno de demostración y pruebas para el cliente (`staging.tudominio.com`). Pasarelas de pago en modo Sandbox. |
| **`develop`** | **Desarrollo** | Rama base de trabajo continuo e integración de nuevas características. |

---

## 🛠️ Stack Tecnológico

- **Backend:** NestJS 10+ (Node.js + TypeScript) + Prisma ORM
- **Frontend:** React 18/19 + Vite + TypeScript + Tailwind CSS
- **Base de Datos:** PostgreSQL 16
- **Contenedores:** Docker & Docker Compose
- **Almacenamiento:** Compatible con S3 (Multer local / MinIO / Cloudinary / AWS S3)

---

## 📖 Centro de Documentación y Trazabilidad (`/docs`)

Toda la documentación arquitectónica, los planes de mejoras ejecutados y la evolución hacia futuras versiones están organizados en [`/docs`](./docs/README.md):

1. **[Origen e Idea General (`docs/IdeasSDD/`)](./docs/IdeasSDD/README.md)**
   - [Primer documento conceptual (`idea.md`)](./docs/IdeasSDD/idea.md) y [Prototipos UI / Sistema de Diseño (`stitch_pilates_studio_web_redesign`)](./docs/IdeasSDD/stitch_pilates_studio_web_redesign/l_harmonie_pilates_atelier/DESIGN.md).
2. **[Versión 1.0 - SDD Completo y Bitácora de Planes (`docs/v1/`)](./docs/v1/README.md)**
   - **Especificación Base (SDD):**
     - [01. SDD (System Design Document)](./docs/v1/01_SDD.md)
     - [02. Especificación Funcional & Casos de Uso](./docs/v1/02_FUNCIONALIDADES.md)
     - [03. Diseño de Interfaz (UI/UX) & Wireframes](./docs/v1/03_DISENO_UX_UI.md)
     - [04. Especificaciones Técnicas & Base de Datos](./docs/v1/04_ESPECIFICACIONES_TECNICAS.md)
     - [05. Plan de Desarrollo & Estrategia Multi-Entorno](./docs/v1/05_PLAN_DESARROLLO_Y_DEVOPS.md)
   - **Historial de Planes e Iteraciones (`docs/v1/planes/`):**
     - [Plan 01: Multi-Sede, Control de Asistencia, Lista de Espera y Notificaciones](./docs/v1/planes/01_sedes_asistencia_waitlist_notificaciones.md)
     - [Plan 02: Perfiles V1, Landing Pública, Historial de Clases y Reprogramación con Avisos](./docs/v1/planes/02_perfiles_v1_landing_historial_reprogramacion.md)
3. **[Versión 2.0 - Propuesta Evolutiva (`docs/v2/`)](./docs/v2/PROPUESTA_EVOLUTIVA_V2.md)**
   - [Propuesta Evolutiva y Diferencias V2 (`PROPUESTA_EVOLUTIVA_V2.md`)](./docs/v2/PROPUESTA_EVOLUTIVA_V2.md): Evolución sobre el SDD de V1 incorporando Packs de clases, Membresías recurrentes, *Credit Wallet*, activación del rol Instructor independiente y mejoras UX.
