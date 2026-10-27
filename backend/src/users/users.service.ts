import { Injectable, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role, User, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { AdminCreateUserDto } from './dto/admin-create-user.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: Role;
  isInstructor?: boolean;
}

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isInstructor: true,
  isActive: true,
  favoriteBranchId: true,
  favoriteTimeSchedule: true,
  bankName: true,
  bankAccountType: true,
  bankAccountNumber: true,
  bankAccountRut: true,
  bankAccountHolder: true,
  bankPaymentEmail: true,
  bankPaymentNotes: true,
  createdAt: true,
  updatedAt: true,
  favoriteBranch: true,
} satisfies Prisma.UserSelect;

const DEFAULT_ROLE_MENUS: Array<{
  role: Role;
  menuKey: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
}> = [
  // ADMIN: Acceso total en V1 (también es el instructor por defecto)
  { role: Role.ADMIN, menuKey: 'CATALOG', label: 'Panel & Agenda en Vivo', enabled: true, sortOrder: 1 },
  { role: Role.ADMIN, menuKey: 'ADMIN_VOUCHERS', label: 'Validación de Pagos', enabled: true, sortOrder: 2 },
  { role: Role.ADMIN, menuKey: 'MY_BOOKINGS', label: 'Reservas Activas', enabled: true, sortOrder: 3 },
  { role: Role.ADMIN, menuKey: 'CLASS_HISTORY', label: 'Historial de Clases & Alumnos', enabled: true, sortOrder: 4 },
  { role: Role.ADMIN, menuKey: 'NOTIFICATIONS', label: 'Avisos & Notificaciones', enabled: true, sortOrder: 5 },
  { role: Role.ADMIN, menuKey: 'ATTENDANCE', label: 'Asistencia & Check-in', enabled: true, sortOrder: 6 },
  { role: Role.ADMIN, menuKey: 'ADMIN_CLASSES', label: 'Clases & Horarios', enabled: true, sortOrder: 7 },
  { role: Role.ADMIN, menuKey: 'ADMIN_BRANCHES', label: 'Sedes', enabled: true, sortOrder: 8 },
  { role: Role.ADMIN, menuKey: 'ADMIN_USERS', label: 'Usuarios & Roles', enabled: true, sortOrder: 9 },
  { role: Role.ADMIN, menuKey: 'ACCOUNT', label: 'Mi Cuenta', enabled: true, sortOrder: 10 },

  // CLIENT: Acceso a sus módulos de alumno en V1
  { role: Role.CLIENT, menuKey: 'CATALOG', label: 'Inicio & Agenda en Vivo', enabled: true, sortOrder: 1 },
  { role: Role.CLIENT, menuKey: 'MY_BOOKINGS', label: 'Mis Reservas Activas', enabled: true, sortOrder: 2 },
  { role: Role.CLIENT, menuKey: 'CLASS_HISTORY', label: 'Historial de Clases', enabled: true, sortOrder: 3 },
  { role: Role.CLIENT, menuKey: 'NOTIFICATIONS', label: 'Avisos & Notificaciones', enabled: true, sortOrder: 4 },
  { role: Role.CLIENT, menuKey: 'ACCOUNT', label: 'Mi Cuenta', enabled: true, sortOrder: 5 },

  // INSTRUCTOR: Reservado y deshabilitado en V1 (listo en BD para habilitar en V2)
  { role: Role.INSTRUCTOR, menuKey: 'CATALOG', label: 'Inicio & Agenda en Vivo', enabled: false, sortOrder: 1 },
  { role: Role.INSTRUCTOR, menuKey: 'ATTENDANCE', label: 'Mis Clases & Check-in', enabled: false, sortOrder: 2 },
  { role: Role.INSTRUCTOR, menuKey: 'MY_BOOKINGS', label: 'Mis Reservas', enabled: false, sortOrder: 3 },
  { role: Role.INSTRUCTOR, menuKey: 'CLASS_HISTORY', label: 'Historial de Clases', enabled: false, sortOrder: 4 },
  { role: Role.INSTRUCTOR, menuKey: 'NOTIFICATIONS', label: 'Avisos & Notificaciones', enabled: false, sortOrder: 5 },
  { role: Role.INSTRUCTOR, menuKey: 'ACCOUNT', label: 'Mi Cuenta', enabled: false, sortOrder: 6 },
];

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultMenuPermissions();
  }

  async ensureDefaultMenuPermissions() {
    try {
      const count = await this.prisma.roleMenuPermission.count();
      if (count === 0) {
        await this.prisma.roleMenuPermission.createMany({
          data: DEFAULT_ROLE_MENUS,
          skipDuplicates: true,
        });
      }
    } catch {
      // Ignorar si la tabla aún no está inicializada en entorno aislado
    }
  }

  async getAllowedMenusForRole(role: Role): Promise<string[]> {
    try {
      const perms = await this.prisma.roleMenuPermission.findMany({
        where: { role, enabled: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (perms.length > 0) {
        return perms.map((p) => p.menuKey);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ROLE_MENUS.filter((m) => m.role === role && m.enabled).map((m) => m.menuKey);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        favoriteBranch: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        favoriteBranch: true,
      },
    });
  }

  async findSafeById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }
    return user;
  }

  async getStudioBankInfo() {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const configuredAdmin =
      admins.find((a) => a.bankAccountNumber && a.bankAccountNumber.trim().length > 0) ||
      admins[0];

    return {
      bankName: configuredAdmin?.bankName?.trim() || 'Banco de Chile',
      bankAccountType: configuredAdmin?.bankAccountType?.trim() || 'Cuenta Corriente',
      bankAccountNumber: configuredAdmin?.bankAccountNumber?.trim() || '00-123-45678-90',
      bankAccountRut: configuredAdmin?.bankAccountRut?.trim() || '76.543.210-K',
      bankAccountHolder:
        configuredAdmin?.bankAccountHolder?.trim() ||
        configuredAdmin?.name ||
        'K PILATES SpA',
      bankPaymentEmail:
        configuredAdmin?.bankPaymentEmail?.trim() ||
        configuredAdmin?.email ||
        'pagos@estudiopilates.cl',
      bankPaymentNotes:
        configuredAdmin?.bankPaymentNotes?.trim() ||
        'Indica tu nombre o código de reserva en el comentario de la transferencia.',
      updatedAt: configuredAdmin?.updatedAt || null,
    };
  }

  async updatePreferences(
    userId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      favoriteBranchId?: string | null;
      favoriteTimeSchedule?: string | null;
      bankName?: string | null;
      bankAccountType?: string | null;
      bankAccountNumber?: string | null;
      bankAccountRut?: string | null;
      bankAccountHolder?: string | null;
      bankPaymentEmail?: string | null;
      bankPaymentNotes?: string | null;
    },
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (data.email !== undefined) {
      const normalizedEmail = data.email.toLowerCase().trim();
      if (normalizedEmail !== currentUser.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new ConflictException('Ya existe otra cuenta registrada con este correo electrónico');
        }
      }
    }

    if (data.favoriteBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: data.favoriteBranchId },
      });
      if (!branch || !branch.isActive) {
        throw new NotFoundException('La sede seleccionada no existe o está inactiva');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email.toLowerCase().trim() }),
        ...(data.phone !== undefined && { phone: data.phone.trim() }),
        ...(data.favoriteBranchId !== undefined && { favoriteBranchId: data.favoriteBranchId }),
        ...(data.favoriteTimeSchedule !== undefined && { favoriteTimeSchedule: data.favoriteTimeSchedule }),
        ...(data.bankName !== undefined && { bankName: data.bankName ? data.bankName.trim() : null }),
        ...(data.bankAccountType !== undefined && {
          bankAccountType: data.bankAccountType ? data.bankAccountType.trim() : null,
        }),
        ...(data.bankAccountNumber !== undefined && {
          bankAccountNumber: data.bankAccountNumber ? data.bankAccountNumber.trim() : null,
        }),
        ...(data.bankAccountRut !== undefined && {
          bankAccountRut: data.bankAccountRut ? data.bankAccountRut.trim() : null,
        }),
        ...(data.bankAccountHolder !== undefined && {
          bankAccountHolder: data.bankAccountHolder ? data.bankAccountHolder.trim() : null,
        }),
        ...(data.bankPaymentEmail !== undefined && {
          bankPaymentEmail: data.bankPaymentEmail ? data.bankPaymentEmail.trim() : null,
        }),
        ...(data.bankPaymentNotes !== undefined && {
          bankPaymentNotes: data.bankPaymentNotes ? data.bankPaymentNotes.trim() : null,
        }),
      },
      include: {
        favoriteBranch: true,
      },
    });

    const allowedMenus = await this.getAllowedMenusForRole(updated.role);
    const { passwordHash: _, ...safeUser } = updated;
    return {
      ...safeUser,
      allowedMenus,
    };
  }

  async create(data: CreateUserData) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario registrado con este correo electrónico');
    }

    return this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        passwordHash: data.passwordHash,
        role: data.role ?? Role.CLIENT,
        isInstructor: data.isInstructor ?? false,
      },
      include: {
        favoriteBranch: true,
      },
    });
  }

  async listInstructors(): Promise<Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'isInstructor'>[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [{ role: Role.ADMIN }, { role: Role.INSTRUCTOR }, { isInstructor: true }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isInstructor: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // --- Métodos de Administración de Usuarios ---

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminCreateUser(dto: AdminCreateUserDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario registrado con este correo electrónico');
    }

    if (dto.favoriteBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.favoriteBranchId },
      });
      if (!branch) {
        throw new NotFoundException('La sede especificada no existe');
      }
    }

    const rawPassword = dto.password?.trim() || 'Pilates123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        phone: dto.phone.trim(),
        passwordHash,
        role: dto.role ?? Role.CLIENT,
        isInstructor: dto.isInstructor ?? (dto.role === Role.INSTRUCTOR || dto.role === Role.ADMIN),
        favoriteBranchId: dto.favoriteBranchId,
      },
      select: safeUserSelect,
    });
  }

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }

    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new ConflictException('Ya existe otro usuario con este correo electrónico');
        }
      }
    }

    if (dto.favoriteBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.favoriteBranchId },
      });
      if (!branch) {
        throw new NotFoundException('La sede especificada no existe');
      }
    }

    let passwordHash: string | undefined = undefined;
    if (dto.password && dto.password.trim()) {
      passwordHash = await bcrypt.hash(dto.password.trim(), 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase().trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(passwordHash !== undefined && { passwordHash }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isInstructor !== undefined && { isInstructor: dto.isInstructor }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.favoriteBranchId !== undefined && { favoriteBranchId: dto.favoriteBranchId }),
      },
      select: safeUserSelect,
    });
  }

  async adminToggleActive(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      select: safeUserSelect,
    });
  }
}
