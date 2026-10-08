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
import { BranchesService } from './branches.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('Sedes (Estudios)')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las sedes del estudio' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir sedes inactivas' })
  @ApiResponse({ status: 200, description: 'Listado de sedes disponibles' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const onlyActive = includeInactive !== 'true';
    return this.branchesService.findAll(onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una sede por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sede' })
  @ApiResponse({ status: 404, description: 'Sede no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.branchesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva sede (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Sede creada con éxito' })
  @ApiResponse({ status: 409, description: 'Slug de sede duplicado' })
  async create(@Body() createDto: CreateBranchDto) {
    return this.branchesService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar datos de una sede (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Sede actualizada' })
  @ApiResponse({ status: 404, description: 'Sede no encontrada' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desactivar una sede (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Sede desactivada' })
  @ApiResponse({ status: 404, description: 'Sede no encontrada' })
  async remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
