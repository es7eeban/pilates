import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive: boolean = true) {
    return this.prisma.branch.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            schedules: true,
            favoritedByUsers: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            schedules: true,
            favoritedByUsers: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Sede con ID '${id}' no encontrada`);
    }

    return branch;
  }

  async create(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { slug: dto.slug.trim().toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una sede con el slug '${dto.slug}'`);
    }

    return this.prisma.branch.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        address: dto.address.trim(),
        commune: dto.commune?.trim(),
        city: dto.city?.trim() ?? 'Santiago',
        phone: dto.phone?.trim(),
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          slug: dto.slug.trim().toLowerCase(),
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Ya existe otra sede con el slug '${dto.slug}'`);
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
        ...(dto.commune !== undefined && { commune: dto.commune.trim() }),
        ...(dto.city !== undefined && { city: dto.city.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
