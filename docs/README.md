# Pilates Booking System - Hub de Documentación, Flujo de Trabajo y Versiones

Bienvenido al repositorio central de diseño, arquitectura y trazabilidad evolutiva del sistema. La carpeta `docs/` está organizada cronológica y funcionalmente en **tres etapas** para tener siempre a la mano el origen del proyecto, el sistema actual en producción con su historial de mejoras y el diseño de la próxima versión:

---

## 🗂️ Estructura General de `docs/`

```text
docs/
├── README.md                                         # Este índice maestro
│
├── IdeasSDD/                                         # 1. ORIGEN: Primera idea conceptual y prototipos UI
│   ├── README.md                                     # Guía de los prototipos y del documento semilla
│   ├── idea.md                                       # Primer documento funcional y técnico donde nació el proyecto
│   └── stitch_pilates_studio_web_redesign/           # Sistema de diseño (DESIGN.md) y 7 maquetas HTML/PNG
│
├── v1/                                               # 2. VERSIÓN 1 (ACTUAL): SDD Completo + Bitácora de Planes
│   ├── README.md                                     # Índice de la V1 y tabla de planes ejecutados
│   ├── 01_SDD.md                                     # Arquitectura, capas y control ACID de sobrecupos
│   ├── 02_FUNCIONALIDADES.md                         # Casos de uso, permisos y flujos de pago/transferencia
│   ├── 03_DISENO_UX_UI.md                            # Paleta cromática, componentes y wireframes
│   ├── 04_ESPECIFICACIONES_TECNICAS.md               # Modelo relacional Prisma y endpoints REST
│   ├── 05_PLAN_DESARROLLO_Y_DEVOPS.md                # Estrategia multi-entorno (develop, qa, main) y Docker
│   └── planes/                                       # Rastro cronológico de funcionalidades extras agregadas en V1
│       ├── 01_sedes_asistencia_waitlist_notificaciones.md
│       └── 02_perfiles_v1_landing_historial_reprogramacion.md
│
└── v2/                                               # 3. VERSIÓN 2 (FUTURO): Evolución sobre el SDD de V1
    └── PROPUESTA_EVOLUTIVA_V2.md                     # Diferencias respecto a V1 (Packs, Créditos, Rol Instructor, UX)
```

---

## 🔄 Flujo de Trabajo y Trazabilidad

### Etapa 1: Idea General y Semilla ([`IdeasSDD/`](./IdeasSDD/README.md))
- Contiene el primer documento ([`idea.md`](./IdeasSDD/idea.md)) y las maquetas visuales de referencia ([`DESIGN.md`](./IdeasSDD/stitch_pilates_studio_web_redesign/l_harmonie_pilates_atelier/DESIGN.md)).
- Sirve como punto de comparación para ver cómo se concibió originalmente la plataforma.

### Etapa 2: Versión 1 - SDD Completo y Registro de Planes ([`v1/`](./v1/README.md))
- **SDD Base (`01` al `05`):** Define los cimientos técnicos y funcionales del sistema en operación.
- **Carpeta [`v1/planes/`](./v1/README.md#-2-bitácora-de-planes-e-iteraciones-planes):** Cada vez que agregamos nuevas funcionalidades, ajustes de negocio o mejoras sobre la V1, se documenta un nuevo archivo numerado (`01_...`, `02_...`, `03_...`) dentro de `docs/v1/planes/`.
  - **[Plan 01](./v1/planes/01_sedes_asistencia_waitlist_notificaciones.md):** Multi-sede, control de asistencia en vivo, lista de espera FIFO y notificaciones transaccionales.
  - **[Plan 02](./v1/planes/02_perfiles_v1_landing_historial_reprogramacion.md):** Consolidación de 2 perfiles activos (`ADMIN` + `CLIENT`) con permisos en BD (`RoleMenuPermission`), Landing Page pública, separación de *Reservas Activas* vs *Historial de Clases*, *Mi Cuenta*, reprogramación/suspensión de días puntuales con aviso y aislamiento de notificaciones.

### Etapa 3: Versión 2 - Evolución del Producto ([`v2/PROPUESTA_EVOLUTIVA_V2.md`](./v2/PROPUESTA_EVOLUTIVA_V2.md))
- Parte de la base de que **el SDD de la V1 se reutiliza íntegramente en la V2** y documenta qué cambia o se suma:
  - Activación del 3er perfil (**Instructor independiente**) ya preparado en base de datos.
  - Nuevo modelo comercial de **Packs de sesiones, Membresías y Billetera de Créditos (*Credit Wallet*)**.
  - Ajustes de UX/UI (reserva instantánea con 1 crédito, catálogo de disciplinas múltiples, reportes de negocio) y backlog abierto para seguir anotando ideas.
