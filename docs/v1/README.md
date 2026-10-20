# Pilates Studio Booking System - Documentación Versión 1 (V1)

Bienvenido al centro de documentación de la **Versión 1.0 (Core Operativo)**. Aquí se encuentra tanto la especificación arquitectónica base (**SDD**) como la bitácora ordenada de todos los **planes de mejoras e iteraciones** que se van sumando al sistema.

---

## 📚 1. Documentación Base del Sistema (SDD V1)

| Documento | Descripción |
| :--- | :--- |
| **[01. SDD - Documento de Diseño de Sistema](./01_SDD.md)** | Arquitectura de alto nivel, capas del sistema, prevención de sobrecupos con bloqueo pesimista (`FOR UPDATE`) y máquina de estados de reservas. |
| **[02. Especificación Funcional & Casos de Uso](./02_FUNCIONALIDADES.md)** | Matriz de permisos, flujos detallados de pago automatizado vs. transferencia bancaria con auditoría y políticas de cancelación. |
| **[03. Diseño de Interfaz (UI/UX) y Wireframes](./03_DISENO_UX_UI.md)** | Paleta cromática *wellness / somatic atelier*, tipografías, componentes reutilizables y estructura de vistas. |
| **[04. Especificaciones Técnicas & Base de Datos](./04_ESPECIFICACIONES_TECNICAS.md)** | Stack tecnológico (NestJS, React, Tailwind, PostgreSQL, Prisma), diagrama relacional (ERD) y contrato de endpoints REST. |
| **[05. Plan de Desarrollo & DevOps Multi-Entorno](./05_PLAN_DESARROLLO_Y_DEVOPS.md)** | Estrategia de 3 entornos (`develop`, `qa`, `main`), Dockerización y flujo de despliegue. |

---

## 🛠️ 2. Bitácora de Planes e Iteraciones (`planes/`)

Cada vez que se diseña e implementa una mejora o bloque de funcionalidades adicionales sobre la V1, se documenta en la carpeta [`./planes/`](./planes/) para mantener trazabilidad completa del trabajo realizado y facilitar auditorías o ajustes posteriores:

| Orden | Plan / Iteración | Estado | Resumen de lo Implementado |
| :---: | :--- | :---: | :--- |
| **01** | **[Multi-Sede, Asistencia, Lista de Espera y Notificaciones](./planes/01_sedes_asistencia_waitlist_notificaciones.md)** | ✅ Completado | Sedes multi-sucursal (`Branch`), check-in de asistencia en vivo, lista de espera FIFO (máx. 3 cupos, ventana de 1h) y notificaciones transaccionales. |
| **02** | **[Perfiles V1, Landing Pública, Historial y Reprogramación](./planes/02_perfiles_v1_landing_historial_reprogramacion.md)** | ✅ Completado | Permisos de menú en BD (`RoleMenuPermission`), 2 perfiles activos en V1 (`ADMIN` + `CLIENT`), Landing Page pública, separación *Reservas Activas* vs *Historial*, *Mi Cuenta*, reprogramación/suspensión de días con aviso y aislamiento de alertas de comprobantes. |

> **Convención para nuevas mejoras en V1:** Todo nuevo requerimiento o ajuste que trabajemos se registrará como `planes/03_<nombre_descriptivo>.md`, enlazándolo en esta tabla.

---

## 🚀 Resumen del Stack Tecnológico en V1

- **Backend:** NestJS 10+ (Node.js + TypeScript) con Prisma ORM.
- **Frontend:** React 18/19 con Vite, TypeScript y Tailwind CSS.
- **Base de Datos:** PostgreSQL 16 (transacciones ACID y bloqueos de fila para control de cupos).
- **Almacenamiento de Comprobantes:** Soporte local con Multer y preparado para buckets compatibles con S3.
- **Navegación Relacionada:**
  - [⬅️ Idea Inicial y Prototipos (`../IdeasSDD/`)](../IdeasSDD/README.md)
  - [➡️ Propuesta Evolutiva V2 (`../v2/`)](../v2/PROPUESTA_EVOLUTIVA_V2.md)
