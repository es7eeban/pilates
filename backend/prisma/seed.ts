import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder de datos de desarrollo...');

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
    },
  });
  console.log(`✅ Admin verificado: ${admin.email}`);

  // 3. Instructor dedicado
  const instructor = await prisma.user.upsert({
    where: { email: 'valeria.instructor@pilates.cl' },
    update: {
      role: Role.INSTRUCTOR,
      isInstructor: true,
      favoriteBranchId: sedeLasCondes.id,
    },
    create: {
      name: 'Valeria Castro',
      email: 'valeria.instructor@pilates.cl',
      phone: '+56922334455',
      passwordHash,
      role: Role.INSTRUCTOR,
      isInstructor: true,
      isActive: true,
      favoriteBranchId: sedeLasCondes.id,
      favoriteTimeSchedule: '18:00',
    },
  });
  console.log(`✅ Instructor verificado: ${instructor.email}`);

  // 4. Alumno demo con Sede Providencia y horario 09:00 favoritos
  const alumno = await prisma.user.upsert({
    where: { email: 'alumno.demo@pilates.cl' },
    update: {
      favoriteBranchId: sedeProvidencia.id,
      favoriteTimeSchedule: '09:00',
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
    },
  });
  console.log(`✅ Alumno demo verificado con sede favorita Providencia: ${alumno.email}`);

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
      console.log(`✅ Tipo de clase creado: ${item.title}`);
    } else {
      console.log(`ℹ️ Tipo de clase ya existente: ${item.title}`);
    }
  }

  // 5. Sesiones de clase programadas para los próximos 7 días
  const allClassTypes = await prisma.classType.findMany({ where: { isActive: true } });
  const reformerEsencial = allClassTypes.find((c) => c.title.includes('Esencial')) ?? allClassTypes[0];
  const reformerDinamico = allClassTypes.find((c) => c.title.includes('Dinámico')) ?? allClassTypes[1];
  const matFlow = allClassTypes.find((c) => c.title.includes('Mat')) ?? allClassTypes[2];

  const now = new Date();
  const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const plannedSchedules = [
    // Mañana en Providencia
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
    // Mañana en Las Condes
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
    // Mañana en Vitacura
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
    // Pasado mañana en Providencia
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      branchId: sedeProvidencia.id,
      dayOffset: 2,
      startHour: 8,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
    // Pasado mañana en Las Condes
    {
      classTypeId: reformerDinamico.id,
      instructorId: instructor.id,
      branchId: sedeLasCondes.id,
      dayOffset: 2,
      startHour: 19,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // En 3 días en Vitacura
    {
      classTypeId: matFlow.id,
      instructorId: instructor.id,
      branchId: sedeVitacura.id,
      dayOffset: 3,
      startHour: 9,
      startMin: 0,
      duration: 60,
      capacity: 12,
    },
    // En 3 días en Providencia
    {
      classTypeId: reformerEsencial.id,
      instructorId: instructor.id,
      branchId: sedeProvidencia.id,
      dayOffset: 3,
      startHour: 18,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
  ];

  // Actualizar cualquier sesión anterior sin sede asignada a Providencia
  await prisma.classSchedule.updateMany({
    where: { branchId: null },
    data: { branchId: sedeProvidencia.id },
  });

  for (const s of plannedSchedules) {
    const startTime = new Date(baseDay);
    startTime.setDate(startTime.getDate() + s.dayOffset);
    startTime.setHours(s.startHour, s.startMin, 0, 0);

    const endTime = new Date(startTime.getTime() + s.duration * 60 * 1000);

    const existingSchedule = await prisma.classSchedule.findFirst({
      where: {
        classTypeId: s.classTypeId,
        startTime,
      },
    });

    if (!existingSchedule) {
      await prisma.classSchedule.create({
        data: {
          classTypeId: s.classTypeId,
          instructorId: s.instructorId,
          branchId: s.branchId,
          startTime,
          endTime,
          capacity: s.capacity,
          availableSlots: s.capacity,
          price: 15000,
        },
      });
      console.log(`✅ Sesión programada para: ${startTime.toISOString()} (${s.duration} min)`);
    } else if (!existingSchedule.branchId) {
      await prisma.classSchedule.update({
        where: { id: existingSchedule.id },
        data: { branchId: s.branchId },
      });
    }
  }

  // 6. Alumno adicional y Reservas de prueba para probar la nómina / lista de asistencia
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
    },
  });

  // Tomar una clase de Valeria
  const valeriaSchedule = await prisma.classSchedule.findFirst({
    where: { instructorId: instructor.id },
    orderBy: { startTime: 'asc' },
  });

  if (valeriaSchedule) {
    const existingBooking1 = await prisma.booking.findFirst({
      where: { userId: alumno.id, scheduleId: valeriaSchedule.id },
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
      console.log(`✅ Reserva confirmada creada para Constanza en clase de Valeria`);
    }

    const existingBooking2 = await prisma.booking.findFirst({
      where: { userId: alumno2.id, scheduleId: valeriaSchedule.id },
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
      console.log(`✅ Reserva confirmada creada para María en clase de Valeria`);
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
