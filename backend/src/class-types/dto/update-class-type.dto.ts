import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClassTypeDto {
  @ApiPropertyOptional({ description: 'Nombre o título de la disciplina' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada de la disciplina' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Aforo por defecto' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultCapacity?: number;

  @ApiPropertyOptional({ description: 'Precio unitario por clase' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @ApiPropertyOptional({ description: 'Duración de la clase en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Nivel de intensidad' })
  @IsOptional()
  @IsString()
  intensityLevel?: string;

  @ApiPropertyOptional({ description: 'Estado activo o inactivo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
