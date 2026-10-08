import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role, User } from '@prisma/client';

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: Role;
  isInstructor?: boolean;
}

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
}
