import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClassTypeDto } from './dto/create-class-type.dto.js';
import { UpdateClassTypeDto } from './dto/update-class-type.dto.js';

@Injectable()
export class ClassTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive: boolean = true) {
    return this.prisma.classType.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { title: 'asc' },
    });
  }

  async findById(id: string) {
    const classType = await this.prisma.classType.findUnique({
      where: { id },
    });

    if (!classType) {
      throw new NotFoundException(`Tipo de clase con ID '${id}' no encontrado`);
    }

    return classType;
  }

  async create(dto: CreateClassTypeDto) {
    const existing = await this.prisma.classType.findFirst({
      where: { title: { equals: dto.title.trim(), mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un tipo de clase con el título '${dto.title}'`);
    }

    return this.prisma.classType.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        defaultCapacity: dto.defaultCapacity ?? 8,
        defaultPrice: dto.defaultPrice,
        durationMinutes: dto.durationMinutes ?? 60,
        intensityLevel: dto.intensityLevel ?? 'Todos los niveles',
      },
    });
  }

  async update(id: string, dto: UpdateClassTypeDto) {
    await this.findById(id);

    return this.prisma.classType.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.defaultCapacity !== undefined && { defaultCapacity: dto.defaultCapacity }),
        ...(dto.defaultPrice !== undefined && { defaultPrice: dto.defaultPrice }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.intensityLevel !== undefined && { intensityLevel: dto.intensityLevel }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.classType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
