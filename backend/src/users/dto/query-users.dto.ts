import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'Búsqueda por texto (nombre, email o teléfono)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por rol del usuario', enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser CLIENT, INSTRUCTOR o ADMIN' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo o inactivo' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
