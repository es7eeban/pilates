# Pilates Studio Booking System - Centro de Documentación

Bienvenido a la documentación arquitectónica, técnica y operativa de la plataforma de agendamiento y gestión de clases de pilates.

---

## 📚 Índice de Documentación del Proyecto

| Documento | Descripción |
| :--- | :--- |
| **[01. SDD - Documento de Diseño de Sistema](./01_SDD.md)** | Arquitectura de alto nivel, capas del sistema, prevención de overbooking con bloqueos a nivel de fila y máquina de estados de las reservas. |
| **[02. Especificación Funcional & Casos de Uso](./02_FUNCIONALIDADES.md)** | Matriz de permisos (Alumno, Instructor, Administrador), flujos detallados de pago automatizado vs. transferencia, y políticas de cancelación. |
| **[03. Diseño de Interfaz (UI/UX) y Wireframes](./03_DISENO_UX_UI.md)** | Paleta cromática wellness (verde salvia, arena, carbón), tipografía, componentes reutilizables y wireframes de las pantallas clave. |
| **[04. Especificaciones Técnicas & Base de Datos](./04_ESPECIFICACIONES_TECNICAS.md)** | Stack tecnológico (NestJS, React, Tailwind, PostgreSQL, Prisma), diagrama ERD completo, esquema de base de datos y endpoints de la API REST. |
| **[05. Plan de Desarrollo & DevOps Multi-Entorno](./05_PLAN_DESARROLLO_Y_DEVOPS.md)** | Estrategia de 3 entornos (Desarrollo, Staging/Pruebas para el cliente, Producción), comparativa de hosting cloud, Docker y roadmap en 6 sprints. |

---

## 🚀 Resumen del Stack Tecnológico Aprobado

- **Backend:** NestJS 10+ (Node.js + TypeScript) con Prisma ORM.
- **Frontend:** React 18/19 con Vite, TypeScript, Tailwind CSS y componentes Radix UI.
- **Base de Datos:** PostgreSQL 16 (con soporte de transacciones ACID y bloqueos pesimistas para cupos).
- **Contenedores & Orquestación:** Docker y Docker Compose (multi-stage builds).
- **Almacenamiento de Comprobantes:** Bucket S3-compatible (Cloudinary / AWS S3 / MinIO local).
- **Pasarela de Pagos:** Integración dual (Mercado Pago / Webpay para pago inmediato + Transferencia bancaria con comprobante).
- **Estrategia Cloud:** Frontend en Edge CDN (Vercel/Cloudflare Pages), API en Contenedor Cloud (Railway/Render/VPS) y DNS/SSL con Cloudflare.
