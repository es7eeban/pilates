import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
  createdAt: true,
  updatedAt: true,
  favoriteBranch: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
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

  async updatePreferences(
    userId: string,
    data: { favoriteBranchId?: string | null; favoriteTimeSchedule?: string | null },
  ) {
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
        ...(data.favoriteBranchId !== undefined && { favoriteBranchId: data.favoriteBranchId }),
        ...(data.favoriteTimeSchedule !== undefined && { favoriteTimeSchedule: data.favoriteTimeSchedule }),
      },
      include: {
        favoriteBranch: true,
      },
    });

    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  async create(data: CreateUserData): Promise<User> {
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
    });
  }

  async listInstructors(): Promise<Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'isInstructor'>[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [{ role: Role.INSTRUCTOR }, { isInstructor: true }],
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
        isInstructor: dto.isInstructor ?? (dto.role === Role.INSTRUCTOR),
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
