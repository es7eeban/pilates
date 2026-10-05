# Pilates Booking System

Sistema web integral para la gestión y reserva de clases de pilates con doble método de pago (pasarela online automatizada y transferencia bancaria manual con auditoría de comprobantes), control estricto de aforo y notificaciones automáticas.

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
- **Almacenamiento:** Compatible con S3 (MinIO en local / Cloudinary o AWS S3 en nube)

---

## 📖 Documentación

Toda la documentación técnica y de diseño se encuentra disponible en la carpeta [`/docs`](./docs/):
- **[01. SDD (System Design Document)](./docs/01_SDD.md)**
- **[02. Especificación Funcional & Casos de Uso](./docs/02_FUNCIONALIDADES.md)**
- **[03. Diseño de Interfaz (UI/UX) & Wireframes](./docs/03_DISENO_UX_UI.md)**
- **[04. Especificaciones Técnicas & Base de Datos](./docs/04_ESPECIFICACIONES_TECNICAS.md)**
- **[05. Plan de Desarrollo & Estrategia Multi-Entorno](./docs/05_PLAN_DESARROLLO_Y_DEVOPS.md)**
