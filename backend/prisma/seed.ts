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
