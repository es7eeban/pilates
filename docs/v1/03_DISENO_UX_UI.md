# 03. Diseño de Interfaz (UI/UX) y Wireframes Conceptuales

## 1. Filosofía de Diseño y Estética

El diseño visual para un estudio de pilates debe transmitir **calma, bienestar, orden, profesionalismo y equilibrio corporal**. La interfaz combina líneas limpias, espacios generosos, tipografía moderna y una paleta inspirada en tonos orgánicos de la naturaleza (tierra, salvia, lino y carbón suave).

### 1.1. Paleta de Colores (Tailwind CSS Palette)

| Color Name | Código HEX | Rol en la Interfaz | Clase Tailwind Sugerida |
| :--- | :--- | :--- | :--- |
| **Sage Primary (Verde Salvia)** | `#607264` | Color de marca, botones principales, acentos activos | `bg-emerald-800` / `#607264` |
| **Sage Dark** | `#455348` | Hover de botones primarios, títulos destacados | `#455348` |
| **Sand Background (Lino/Arena suave)** | `#FBF9F5` | Fondo principal de la aplicación (evita el blanco puro frío) | `bg-[#FBF9F5]` |
| **Surface Card (Blanco puro)** | `#FFFFFF` | Tarjetas de clases, modales, formularios | `bg-white` |
| **Text Primary (Carbón)** | `#22252A` | Encabezados, textos principales de alta legibilidad | `text-stone-900` |
| **Text Muted (Piedra)** | `#686D76` | Metadatos, horarios secundarios, descripciones | `text-stone-500` |
| **Accent Terra / Coral** | `#D97757` | Indicador de "Últimos Cupos", alertas suaves | `text-amber-700` / `#D97757` |
| **Success (Verde Oliva)** | `#2E7D32` | Estado "Confirmada", "Pago Aprobado" | `text-emerald-700 bg-emerald-50` |
| **Pending (Ámbar Cálido)** | `#D97706` | Estado "Pendiente de Validación" | `text-amber-800 bg-amber-50` |
| **Danger (Rojo Óxido)** | `#C53030` | Estado "Rechazada", "Cancelada" | `text-rose-700 bg-rose-50` |

### 1.2. Tipografía
- **Titulares y Branding:** *Plus Jakarta Sans* o *Inter* (SemiBold 600, Bold 700) con espaciado sutil para un aspecto moderno y refinado.
- **Cuerpo y Formularios:** *Inter* (Regular 400, Medium 500) para máxima legibilidad en dispositivos móviles.

---

## 2. Componentes Clave del Sistema

1. **Badge de Estado de Cupos:**
   - Verde suave: `5 cupos disponibles`
   - Naranja cálido: `¡Último cupo!`
   - Gris tenue: `Agotado`
2. **Selector de Horarios (Time Slots):**
   - Tarjetas compactas con horario de inicio/fin, nombre del instructor, tipo de clase y precio.
3. **Visor de Comprobante (Admin):**
   - Componente modal con preview de imagen/PDF, zoom in/out, botón directo de "Aprobar" (verde) y "Rechazar" (rojo con confirmación obligatoria).
4. **Alerta de Transferencia:**
   - Bloque informativo con botón de copiar al portapapeles para el RUT, Banco y Número de Cuenta.

---

## 3. Wireframes Conceptuales de Pantallas

### 3.1. Pantalla: Calendario y Selector de Clases (Vista Alumno)

```
+--------------------------------------------------------------------------+
|  [LOGO PILATES STUDIO]        [Catálogo]  [Mis Clases]     [Perfil (Ana)]|
+--------------------------------------------------------------------------+
|                                                                          |
|   AGENDA TU CLASE DE PILATES                                             |
|   Encuentra tu ritmo, conecta con tu cuerpo y reserva tu reformer.       |
|                                                                          |
|   [Filtro: Todas las Clases v]  [Filtro: Instructores v]  [Filtro: Nivel v]|
|                                                                          |
|   <   Lunes 12 Oct   |   Martes 13 Oct   |   Miércoles 14 Oct   >        |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |  08:00 AM - 09:00 AM  (60 min)               [ 3 cupos libres ]   |   |
|   |  PILATES REFORMER FUNDAMENTALS                                   |   |
|   |  Instructora: Camila Silva  |  Nivel: Principiante               |   |
|   |  Precio: $18.000 CLP                                             |   |
|   |                                               [ Reservar Lugar ] |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |  10:00 AM - 11:00 AM  (60 min)               [ ¡ÚLTIMO CUPO! ]   |   |
|   |  POWER REFORMER & CORE                                           |   |
|   |  Instructora: Valentina Vega  |  Nivel: Intermedio-Avanzado      |   |
|   |  Precio: $20.000 CLP                                             |   |
|   |                                               [ Reservar Lugar ] |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |  18:30 PM - 19:30 PM  (60 min)               [   AGOTADO   ]     |   |
|   |  PILATES MAT RESTORATIVE & STRETCH                               |   |
|   |  Instructor: Matías Gómez  |  Nivel: Todos                       |   |
|   |                                               [ Lista de Espera ]|   |
|   +------------------------------------------------------------------+   |
+--------------------------------------------------------------------------+
```

---

### 3.2. Modal de Confirmación y Pago (Checkout)

```
+--------------------------------------------------------------------------+
|  CONFIRMA TU RESERVA                                               [ X ] |
+--------------------------------------------------------------------------+
|  Clase: Pilates Reformer Fundamentals                                    |
|  Fecha: Lunes 12 Octubre, 08:00 AM                                       |
|  Total a Pagar: $18.000 CLP                                              |
|                                                                          |
|  Selecciona tu método de pago:                                           |
|  ( ) Pago Online Automatizado (Webpay Plus / Tarjeta de Débito o Crédito)|
|      -> Confirmación inmediata de tu cupo.                               |
|                                                                          |
|  (*) Transferencia Bancaria Directa                                      |
|      +-------------------------------------------------------------+     |
|      | Banco: Banco Santander Chile                                |     |
|      | Tipo de Cuenta: Cuenta Corriente N° 849201920               |     |
|      | Titular: Estudio Pilates SpA                                |     |
|      | RUT: 76.920.112-3                                           |     |
|      | Email: pagos@estudiopilates.cl                              |     |
|      | Asunto / Glosa obligatoria: RES-8492 (Tu código único)      |     |
|      +-------------------------------------------------------------+     |
|                                                                          |
|      Adjunta tu Comprobante de Transferencia:                            |
|      + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +     |
|      |   [Icono Nube de Subida]                                    |     |
|      |   Arrastra tu archivo aquí o [Examinar Archivos]            |     |
|      |   Formatos permitidos: JPG, PNG o PDF (Máx. 5 MB)           |     |
|      + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +     |
|      Archivo adjunto: comprobante_santander_ana.pdf (1.2 MB) [Eliminar]  |
|                                                                          |
|  [ Cancelar ]                             [ Confirmar y Enviar Reserva ] |
+--------------------------------------------------------------------------+
```

---

### 3.3. Pantalla: Bandeja de Validación de Comprobantes (Admin Dashboard)

```
+---------------------------------------------------------------------------------------+
| [ADMIN] Pilates Studio  |  [Dashboard]  [Clases]  [Comprobantes (3)]  [Alumnos] [Ajustes] |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  VALIDACIÓN DE COMPROBANTES DE TRANSFERENCIA                                          |
|  Revisa y confirma las transferencias bancarias de tus alumnos.                       |
|                                                                                       |
|  Filtros: [Pendientes (3)]  [Aprobados]  [Rechazados]                                 |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | Alumno: Ana Rojas (ana@email.com / +56912345678)                               |  |
|  | Clase: Pilates Reformer - Lunes 12 Oct, 08:00 AM                                |  |
|  | Monto Esperado: $18.000 CLP  |  Fecha Solicitud: Hace 15 minutos                 |  |
|  | Comprobante: [ Ver Vista Previa PDF ]                                           |  |
|  |                                                                                 |  |
|  |  [ X Rechazar Comprobante ]                  [ √ Aprobar y Confirmar Reserva ]   |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | Alumno: Pedro Morales (pedro@email.com / +56987654321)                          |  |
|  | Clase: Power Reformer - Martes 13 Oct, 10:00 AM                                 |  |
|  | Monto Esperado: $20.000 CLP  |  Fecha Solicitud: Hace 1 hora                     |  |
|  | Comprobante: [ Ver Imagen JPG ]                                                 |  |
|  |                                                                                 |  |
|  |  [ X Rechazar Comprobante ]                  [ √ Aprobar y Confirmar Reserva ]   |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

### 3.4. Modal de Rechazo de Comprobante (Admin)

```
+--------------------------------------------------------------------------+
|  RECHAZAR COMPROBANTE DE RESERVA                                   [ X ] |
+--------------------------------------------------------------------------+
|  Estás a punto de rechazar la reserva de Ana Rojas para la clase         |
|  "Pilates Reformer" del Lunes 12 Octubre.                                |
|                                                                          |
|  El cupo será liberado inmediatamente para otros alumnos.                |
|                                                                          |
|  Selecciona el motivo del rechazo:                                       |
|  ( ) El monto transferido no coincide con el valor de la sesión.         |
|  (*) El comprobante es ilegible o está cortado.                          |
|  ( ) La transferencia no se refleja en la cartola bancaria.              |
|  ( ) Otro motivo especificado abajo.                                     |
|                                                                          |
|  Mensaje explicativo para el alumno (se enviará por email/WhatsApp):     |
|  [ Estimada Ana, la imagen subida se ve borrosa y no permite verificar ] |
|  [ el número de transacción. Por favor, sube una captura nítida.       ] |
|                                                                          |
|  [ Cancelar ]                                   [ Confirmar Rechazo ]    |
+--------------------------------------------------------------------------+
```

---

### 3.5. Modal: Programar Clase con Selector de Instructor (Admin como Instructor)

```
+--------------------------------------------------------------------------+
|  PROGRAMAR NUEVA SESIÓN / HORARIO                                  [ X ] |
+--------------------------------------------------------------------------+
|  Tipo de Clase: [ Pilates Reformer Fundamentals                     v ]  |
|  Fecha: [ 14 / 10 / 2026 ]   Hora Inicio: [ 09:00 AM ]  Duración: 60 min |
|  Cupos / Aforo: [ 8 ] camas reformer                                     |
|  Tarifa por Alumno: [ $18.000 CLP ]                                      |
|                                                                          |
|  -- ASIGNACIÓN DE INSTRUCTOR --                                          |
|  [X] Impartiré yo esta clase (Marcarme como instructor titular)          |
|                                                                          |
|  O bien, selecciona un instructor del equipo:                            |
|  +--------------------------------------------------------------------+  |
|  | [ Yo mismo: Matías Gómez (Administrador / Instructor)            v ] |
|  |   Camila Silva (Instructora Certificada Reformer)                  |  |
|  |   Valentina Vega (Instructora Power Pilates)                       |  |
|  |   Lucas Arancibia (Instructor Mat & Cadillac)                      |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  [ ] Repetir semanalmente (Lunes y Miércoles por 4 semanas)             |
|                                                                          |
|  [ Cancelar ]                                       [ Publicar Clase ]   |
+--------------------------------------------------------------------------+
```
