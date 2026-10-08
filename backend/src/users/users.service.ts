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
    });
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
