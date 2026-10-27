import { PrismaClient, Role, ScheduleStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder de datos de desarrollo y QA...');

  const passwordHash = await bcrypt.hash('Pilates123!', 10);

  // 1. Sedes (Branches)
  const sedeProvidencia = await prisma.branch.upsert({
    where: { slug: 'sede-providencia' },
    update: {},
    create: {
      name: 'Sede Providencia',
      slug: 'sede-providencia',
      address: 'Av. Providencia 1208, Of. 402',
      commune: 'Providencia',
      city: 'Santiago',
      phone: '+56944556677',
      isActive: true,
    },
  });

  const sedeLasCondes = await prisma.branch.upsert({
    where: { slug: 'sede-las-condes' },
    update: {},
    create: {
      name: 'Sede Las Condes',
      slug: 'sede-las-condes',
      address: 'Av. Las Condes 9820, Local 3',
      commune: 'Las Condes',
      city: 'Santiago',
      phone: '+56955667788',
      isActive: true,
    },
  });

  const sedeVitacura = await prisma.branch.upsert({
    where: { slug: 'sede-vitacura' },
    update: {},
    create: {
      name: 'Sede Vitacura',
      slug: 'sede-vitacura',
      address: 'Av. Vitacura 5400, Piso 2',
      commune: 'Vitacura',
      city: 'Santiago',
      phone: '+56966778899',
      isActive: true,
    },
  });
  console.log('✅ Sedes verificadas: Providencia, Las Condes, Vitacura');

  // 2. Admin con facultades de instructor
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pilates.cl' },
    update: {
      isInstructor: true,
      favoriteBranchId: sedeProvidencia.id,
    },
    create: {
      name: 'Administradora Studio',
      email: 'admin@pilates.cl',
      phone: '+56911223344',
      passwordHash,
      role: Role.ADMIN,
      isInstructor: true,
      isActive: true,
      favoriteBranchId: sedeProvidencia.id,
      favoriteTimeSchedule: '09:00',
      bankName: 'Banco de Chile',
      bankAccountType: 'Cuenta Corriente',
      bankAccountNumber: '00-123-45678-90',
      bankAccountRut: '76.543.210-K',
      bankAccountHolder: 'K PILATES SpA',
      bankPaymentEmail: 'pagos@estudiopilates.cl',
      bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
    },
  });
  console.log(`✅ Admin verificado: ${admin.email}`);

  // 3. Instructor dedicado
  const instructor = await prisma.user.upsert({
    where: { email: 'valeria.instructor@pilates.cl' },
    update: {
      role: Role.INSTRUCTOR,
      isInstructor: true,
      isActive: false,
      favoriteBranchId: sedeLasCondes.id,
    },
    create: {
      name: 'Valeria Castro',
      email: 'valeria.instructor@pilates.cl',
      phone: '+56922334455',
      passwordHash,
      role: Role.INSTRUCTOR,
      isInstructor: true,
      isActive: false,
      favoriteBranchId: sedeLasCondes.id,
      favoriteTimeSchedule: '18:00',
    },
  });
  console.log(`✅ Instructor verificado: ${instructor.email}`);

  // 4. Alumnos demo
  const alumno = await prisma.user.upsert({
    where: { email: 'alumno.demo@pilates.cl' },
    update: {
      favoriteBranchId: sedeProvidencia.id,
      favoriteTimeSchedule: '09:00',
      bankName: 'Banco de Chile',
      bankAccountType: 'Cuenta Corriente',
      bankAccountNumber: '00-123-45678-90',
      bankAccountRut: '76.543.210-K',
      bankAccountHolder: 'K PILATES SpA',
      bankPaymentEmail: 'pagos@estudiopilates.cl',
      bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
    },
    create: {
      name: 'Constanza Morales',
      email: 'alumno.demo@pilates.cl',
      phone: '+56933445566',
      passwordHash,
      role: Role.CLIENT,
      isInstructor: false,
      isActive: true,
      favoriteBranchId: sedeProvidencia.id,
      favoriteTimeSchedule: '09:00',
      bankName: 'Banco de Chile',
      bankAccountType: 'Cuenta Corriente',
      bankAccountNumber: '00-123-45678-90',
      bankAccountRut: '76.543.210-K',
      bankAccountHolder: 'K PILATES SpA',
      bankPaymentEmail: 'pagos@estudiopilates.cl',
      bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
    },
  });

  const alumno2 = await prisma.user.upsert({
    where: { email: 'maria.rojas@pilates.cl' },
    update: {},
    create: {
      name: 'María Rojas',
      email: 'maria.rojas@pilates.cl',
      phone: '+56988776655',
      passwordHash,
      role: Role.CLIENT,
      isInstructor: false,
      isActive: true,
      favoriteBranchId: sedeProvidencia.id,
      favoriteTimeSchedule: '09:00',
      bankName: 'Banco de Chile',
      bankAccountType: 'Cuenta Corriente',
      bankAccountNumber: '00-123-45678-90',
      bankAccountRut: '76.543.210-K',
      bankAccountHolder: 'K PILATES SpA',
      bankPaymentEmail: 'pagos@estudiopilates.cl',
      bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
    },
  });

  const alumno3 = await prisma.user.upsert({
    where: { email: 'camila.soto@pilates.cl' },
    update: {},
    create: {
      name: 'Camila Soto',
      email: 'camila.soto@pilates.cl',
      phone: '+56977665544',
      passwordHash,
      role: Role.CLIENT,
      isInstructor: false,
      isActive: true,
      favoriteBranchId: sedeLasCondes.id,
      favoriteTimeSchedule: '18:00',
    },
  });

  // 5. Tipos de clase
  const classTypes = [
    {
      title: 'Pilates Reformer Esencial',
      description: 'Entrenamiento de bajo impacto focalizado en alineación postural, fuerza de core y estabilidad en cama reformer.',
      defaultCapacity: 8,
      defaultPrice: 15000,
      durationMinutes: 55,
      intensityLevel: 'Principiante / Intermedio',
    },
    {
      title: 'Pilates Reformer Dinámico & Fuerza',
      description: 'Secuencias dinámicas con resistencia media-alta para esculpir masa muscular, equilibrio y potencia corporal.',
      defaultCapacity: 8,
      defaultPrice: 18000,
      durationMinutes: 55,
      intensityLevel: 'Avanzado',
    },
    {
      title: 'Pilates Mat & Flow',
      description: 'Sesión clásica en suelo utilizando accesorios (aros, bandas y pelotas) para tonificación y elongación profunda.',
      defaultCapacity: 12,
      defaultPrice: 12000,
      durationMinutes: 60,
      intensityLevel: 'Todos los niveles',
    },
  ];

  for (const item of classTypes) {
    const existing = await prisma.classType.findFirst({
      where: { title: item.title },
    });

    if (!existing) {
      await prisma.classType.create({
        data: item,
      });
    }
  }

  // 6. Sesiones de clase: Históricas (ayer y anteayer), Hoy (para Check-in), y Próximos días (Bloques)
  const allClassTypes = await prisma.classType.findMany({ where: { isActive: true } });
  const reformerEsencial = allClassTypes.find((c) => c.title.includes('Esencial')) ?? allClassTypes[0];
  const reformerDinamico = allClassTypes.find((c) => c.title.includes('Dinámico')) ?? allClassTypes[1];
  const matFlow = allClassTypes.find((c) => c.title.includes('Mat')) ?? allClassTypes[2];

  const now = new Date();
  const baseDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const plannedSchedules: Array<{
    classTypeId: string;
    instructorId: string;
    branchId: string;
    dayOffset: number;
    startHour: number;
    startMin: number;
    duration: number;
    capacity: number;
    status?: ScheduleStatus;
  }> = [
    // Ayer (Clase Realizada en Providencia)
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      branchId: sedeProvidencia.id,
      dayOffset: -1,
      startHour: 9,
      startMin: 0,
      duration: 55,
      capacity: 8,
      status: ScheduleStatus.COMPLETED,
    },
    // Anteayer (Clase Suspendida / No Realizada en Las Condes)
    {
      classTypeId: matFlow.id,
      instructorId: admin.id,
      branchId: sedeLasCondes.id,
      dayOffset: -2,
      startHour: 18,
      startMin: 0,
      duration: 60,
      capacity: 10,
      status: ScheduleStatus.CANCELLED,
    },
    // HOY AM en Providencia (Para probar Asistencia & Check-in del día)
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      branchId: sedeProvidencia.id,
      dayOffset: 0,
      startHour: 9,
      startMin: 0,
      duration: 55,
      capacity: 8,
      status: ScheduleStatus.SCHEDULED,
    },
    // HOY PM en Las Condes (Para probar Asistencia & Check-in del día)
    {
      classTypeId: reformerDinamico.id,
      instructorId: admin.id,
      branchId: sedeLasCondes.id,
      dayOffset: 0,
      startHour: 18,
      startMin: 30,
      duration: 55,
      capacity: 8,
      status: ScheduleStatus.SCHEDULED,
    },
    // Mañana AM en Providencia
    {
      classTypeId: reformerEsencial.id,
      instructorId: instructor.id,
      branchId: sedeProvidencia.id,
      dayOffset: 1,
      startHour: 9,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // Mañana AM en Las Condes
    {
      classTypeId: matFlow.id,
      instructorId: admin.id,
      branchId: sedeLasCondes.id,
      dayOffset: 1,
      startHour: 10,
      startMin: 30,
      duration: 60,
      capacity: 12,
    },
    // Mañana PM en Vitacura
    {
      classTypeId: reformerDinamico.id,
      instructorId: instructor.id,
      branchId: sedeVitacura.id,
      dayOffset: 1,
      startHour: 18,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // Pasado mañana AM en Providencia
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      branchId: sedeProvidencia.id,
      dayOffset: 2,
      startHour: 9,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // Pasado mañana PM en Las Condes
    {
      classTypeId: reformerDinamico.id,
      instructorId: instructor.id,
      branchId: sedeLasCondes.id,
      dayOffset: 2,
      startHour: 18,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
    // En 3 días AM en Vitacura
    {
      classTypeId: matFlow.id,
      instructorId: instructor.id,
      branchId: sedeVitacura.id,
      dayOffset: 3,
      startHour: 10,
      startMin: 0,
      duration: 60,
      capacity: 12,
    },
    // En 3 días PM en Providencia
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      branchId: sedeProvidencia.id,
      dayOffset: 3,
      startHour: 18,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
  ];

  // Generar además clases programadas para los próximos 14 días en cada sede
  for (let offset = 0; offset <= 14; offset++) {
    plannedSchedules.push(
      // Sede Providencia: AM & PM
      {
        classTypeId: reformerEsencial.id,
        instructorId: admin.id,
        branchId: sedeProvidencia.id,
        dayOffset: offset,
        startHour: 9,
        startMin: 0,
        duration: 55,
        capacity: 8,
        status: ScheduleStatus.SCHEDULED,
      },
      {
        classTypeId: reformerDinamico.id,
        instructorId: admin.id,
        branchId: sedeProvidencia.id,
        dayOffset: offset,
        startHour: 18,
        startMin: 30,
        duration: 55,
        capacity: 8,
        status: ScheduleStatus.SCHEDULED,
      },
      // Sede Las Condes: AM & PM
      {
        classTypeId: matFlow.id,
        instructorId: admin.id,
        branchId: sedeLasCondes.id,
        dayOffset: offset,
        startHour: 10,
        startMin: 30,
        duration: 60,
        capacity: 10,
        status: ScheduleStatus.SCHEDULED,
      },
      {
        classTypeId: reformerEsencial.id,
        instructorId: admin.id,
        branchId: sedeLasCondes.id,
        dayOffset: offset,
        startHour: 19,
        startMin: 0,
        duration: 55,
        capacity: 8,
        status: ScheduleStatus.SCHEDULED,
      },
      // Sede Vitacura: AM & PM
      {
        classTypeId: reformerDinamico.id,
        instructorId: admin.id,
        branchId: sedeVitacura.id,
        dayOffset: offset,
        startHour: 8,
        startMin: 30,
        duration: 55,
        capacity: 8,
        status: ScheduleStatus.SCHEDULED,
      },
      {
        classTypeId: matFlow.id,
        instructorId: admin.id,
        branchId: sedeVitacura.id,
        dayOffset: offset,
        startHour: 17,
        startMin: 30,
        duration: 60,
        capacity: 8,
        status: ScheduleStatus.SCHEDULED,
      }
    );
  }

  await prisma.classSchedule.updateMany({
    where: { branchId: null },
    data: { branchId: sedeProvidencia.id },
  });

  let todayMorningScheduleId: string | null = null;
  let yesterdayScheduleId: string | null = null;
  let cancelledPastScheduleId: string | null = null;

  for (const s of plannedSchedules) {
    const startTime = new Date(baseDay);
    startTime.setUTCDate(startTime.getUTCDate() + s.dayOffset);
    startTime.setUTCHours(s.startHour, s.startMin, 0, 0);

    const endTime = new Date(startTime.getTime() + s.duration * 60 * 1000);

    let schedule = await prisma.classSchedule.findFirst({
      where: {
        branchId: s.branchId,
        startTime,
      },
    });

    if (!schedule) {
      schedule = await prisma.classSchedule.create({
        data: {
          classTypeId: s.classTypeId,
          instructorId: s.instructorId,
          branchId: s.branchId,
          startTime,
          endTime,
          capacity: s.capacity,
          availableSlots: s.capacity,
          price: 15000,
          status: s.status ?? ScheduleStatus.SCHEDULED,
        },
      });
    } else if (!schedule.branchId) {
      schedule = await prisma.classSchedule.update({
        where: { id: schedule.id },
        data: { branchId: s.branchId },
      });
    }

    if (s.dayOffset === 0 && s.startHour === 9) {
      todayMorningScheduleId = schedule.id;
    } else if (s.dayOffset === -1) {
      yesterdayScheduleId = schedule.id;
    } else if (s.dayOffset === -2) {
      cancelledPastScheduleId = schedule.id;
    }
  }

  // 7. Poblar reservas para la clase de HOY (Pago Aceptado, En Revisión y No Pagado)
  if (todayMorningScheduleId) {
    const todayBookings = [
      {
        userId: alumno.id,
        code: 'PIL-HOY-001',
        status: 'CONFIRMADA' as const,
        paymentMethod: 'GATEWAY' as const,
        attendanceStatus: 'PENDING' as const,
      },
      {
        userId: alumno2.id,
        code: 'PIL-HOY-002',
        status: 'PENDIENTE_VALIDACION' as const,
        paymentMethod: 'TRANSFER' as const,
        attendanceStatus: 'PENDING' as const,
      },
      {
        userId: alumno3.id,
        code: 'PIL-HOY-003',
        status: 'PENDIENTE_PAGO' as const,
        paymentMethod: 'TRANSFER' as const,
        attendanceStatus: 'PENDING' as const,
      },
    ];

    for (const tb of todayBookings) {
      const exists = await prisma.booking.findFirst({
        where: { userId: tb.userId, scheduleId: todayMorningScheduleId },
      });
      if (!exists) {
        await prisma.booking.create({
          data: {
            userId: tb.userId,
            scheduleId: todayMorningScheduleId,
            bookingCode: tb.code,
            status: tb.status,
            paymentMethod: tb.paymentMethod,
            attendanceStatus: tb.attendanceStatus,
          },
        });
        await prisma.classSchedule.update({
          where: { id: todayMorningScheduleId },
          data: { availableSlots: { decrement: 1 } },
        });
      }
    }
  }

  // 8. Poblar reservas para la clase de AYER (Realizada con asistentes)
  if (yesterdayScheduleId) {
    const yesterdayBookings = [
      {
        userId: alumno.id,
        code: 'PIL-HIST-101',
        status: 'FINALIZADA' as const,
        paymentMethod: 'GATEWAY' as const,
        attendanceStatus: 'ATTENDED' as const,
        notes: 'Excelente control postural en reformer',
      },
      {
        userId: alumno2.id,
        code: 'PIL-HIST-102',
        status: 'FINALIZADA' as const,
        paymentMethod: 'TRANSFER' as const,
        attendanceStatus: 'NO_SHOW' as const,
        notes: 'No se presentó a la sesión',
      },
    ];

    for (const yb of yesterdayBookings) {
      const exists = await prisma.booking.findFirst({
        where: { userId: yb.userId, scheduleId: yesterdayScheduleId },
      });
      if (!exists) {
        await prisma.booking.create({
          data: {
            userId: yb.userId,
            scheduleId: yesterdayScheduleId,
            bookingCode: yb.code,
            status: yb.status,
            paymentMethod: yb.paymentMethod,
            attendanceStatus: yb.attendanceStatus,
            checkInAt: yb.attendanceStatus === 'ATTENDED' ? new Date(Date.now() - 86400000) : null,
            attendanceNotes: yb.notes,
          },
        });
      }
    }
  }

  // 9. Poblar reserva cancelada para la clase SUSPENDIDA de anteayer
  if (cancelledPastScheduleId) {
    const existsCancel = await prisma.booking.findFirst({
      where: { userId: alumno.id, scheduleId: cancelledPastScheduleId },
    });
    if (!existsCancel) {
      await prisma.booking.create({
        data: {
          userId: alumno.id,
          scheduleId: cancelledPastScheduleId,
          bookingCode: 'PIL-CANC-201',
          status: 'CANCELADA_CLIENTE',
          paymentMethod: 'TRANSFER',
          attendanceStatus: 'EXCUSED',
          rejectionReason: 'Sesión suspendida por mantención de sala en Sede Las Condes',
        },
      });
    }
  }

  // 10. Reservas para una clase futura de Valeria
  const valeriaSchedule = await prisma.classSchedule.findFirst({
    where: { instructorId: instructor.id, startTime: { gt: new Date() } },
    orderBy: { startTime: 'asc' },
  });

  if (valeriaSchedule) {
    const existingBooking1 = await prisma.booking.findFirst({
      where: {
        OR: [
          { userId: alumno.id, scheduleId: valeriaSchedule.id },
          { bookingCode: 'PIL-990001' },
        ],
      },
    });
    if (!existingBooking1) {
      await prisma.booking.create({
        data: {
          userId: alumno.id,
          scheduleId: valeriaSchedule.id,
          bookingCode: 'PIL-990001',
          status: 'CONFIRMADA',
          paymentMethod: 'TRANSFER',
          attendanceStatus: 'PENDING',
        },
      });
      await prisma.classSchedule.update({
        where: { id: valeriaSchedule.id },
        data: { availableSlots: { decrement: 1 } },
      });
    }

    const existingBooking2 = await prisma.booking.findFirst({
      where: {
        OR: [
          { userId: alumno2.id, scheduleId: valeriaSchedule.id },
          { bookingCode: 'PIL-990002' },
        ],
      },
    });
    if (!existingBooking2) {
      await prisma.booking.create({
        data: {
          userId: alumno2.id,
          scheduleId: valeriaSchedule.id,
          bookingCode: 'PIL-990002',
          status: 'CONFIRMADA',
          paymentMethod: 'GATEWAY',
          attendanceStatus: 'ATTENDED',
          checkInAt: new Date(),
          attendanceNotes: 'Alumno puntual, primera sesión con reformer',
        },
      });
      await prisma.classSchedule.update({
        where: { id: valeriaSchedule.id },
        data: { availableSlots: { decrement: 1 } },
      });
    }
  }

  console.log('✨ Seeder ejecutado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
