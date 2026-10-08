import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClassTypesService } from './class-types.service.js';
import { CreateClassTypeDto } from './dto/create-class-type.dto.js';
import { UpdateClassTypeDto } from './dto/update-class-type.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('Tipos de Clase (Catálogo)')
@Controller('class-types')
export class ClassTypesController {
  constructor(private readonly classTypesService: ClassTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de disciplinas de pilates' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir disciplinas inactivas' })
  @ApiResponse({ status: 200, description: 'Listado de tipos de clase' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const onlyActive = includeInactive !== 'true';
    return this.classTypesService.findAll(onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un tipo de clase por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la disciplina' })
  @ApiResponse({ status: 404, description: 'Tipo de clase no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.classTypesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo tipo de clase (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Tipo de clase creado con éxito' })
  @ApiResponse({ status: 403, description: 'Privilegios insuficientes (requiere ADMIN)' })
  async create(@Body() createDto: CreateClassTypeDto) {
    return this.classTypesService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un tipo de clase (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Tipo de clase actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo de clase no encontrado' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateClassTypeDto) {
    return this.classTypesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desactivar un tipo de clase (Soft-delete, Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Tipo de clase desactivado' })
  @ApiResponse({ status: 404, description: 'Tipo de clase no encontrado' })
  async remove(@Param('id') id: string) {
    return this.classTypesService.remove(id);
  }
}
