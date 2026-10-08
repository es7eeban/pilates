import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder de datos de desarrollo...');

  const passwordHash = await bcrypt.hash('Pilates123!', 10);

  // 1. Admin con facultades de instructor
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pilates.cl' },
    update: {},
    create: {
      name: 'Administradora Studio',
      email: 'admin@pilates.cl',
      phone: '+56911223344',
      passwordHash,
      role: Role.ADMIN,
      isInstructor: true,
      isActive: true,
    },
  });
  console.log(`✅ Admin verificado: ${admin.email}`);

  // 2. Instructor dedicado
  const instructor = await prisma.user.upsert({
    where: { email: 'valeria.instructor@pilates.cl' },
    update: {},
    create: {
      name: 'Valeria Castro',
      email: 'valeria.instructor@pilates.cl',
      phone: '+56922334455',
      passwordHash,
      role: Role.INSTRUCTOR,
      isInstructor: true,
      isActive: true,
    },
  });
  console.log(`✅ Instructor verificado: ${instructor.email}`);

  // 3. Alumno demo
  const alumno = await prisma.user.upsert({
    where: { email: 'alumno.demo@pilates.cl' },
    update: {},
    create: {
      name: 'Constanza Morales',
      email: 'alumno.demo@pilates.cl',
      phone: '+56933445566',
      passwordHash,
      role: Role.CLIENT,
      isInstructor: false,
      isActive: true,
    },
  });
  console.log(`✅ Alumno demo verificado: ${alumno.email}`);

  // 4. Tipos de clase
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
    // Mañana
    {
      classTypeId: reformerEsencial.id,
      instructorId: instructor.id,
      dayOffset: 1,
      startHour: 9,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    {
      classTypeId: matFlow.id,
      instructorId: admin.id,
      dayOffset: 1,
      startHour: 10,
      startMin: 30,
      duration: 60,
      capacity: 12,
    },
    {
      classTypeId: reformerDinamico.id,
      instructorId: instructor.id,
      dayOffset: 1,
      startHour: 18,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // Pasado mañana
    {
      classTypeId: reformerEsencial.id,
      instructorId: admin.id,
      dayOffset: 2,
      startHour: 8,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
    {
      classTypeId: reformerDinamico.id,
      instructorId: instructor.id,
      dayOffset: 2,
      startHour: 19,
      startMin: 0,
      duration: 55,
      capacity: 8,
    },
    // En 3 días
    {
      classTypeId: matFlow.id,
      instructorId: instructor.id,
      dayOffset: 3,
      startHour: 9,
      startMin: 0,
      duration: 60,
      capacity: 12,
    },
    {
      classTypeId: reformerEsencial.id,
      instructorId: instructor.id,
      dayOffset: 3,
      startHour: 18,
      startMin: 30,
      duration: 55,
      capacity: 8,
    },
  ];

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
          startTime,
          endTime,
          capacity: s.capacity,
          availableSlots: s.capacity,
          price: 15000,
        },
      });
      console.log(`✅ Sesión programada para: ${startTime.toISOString()} (${s.duration} min)`);
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
