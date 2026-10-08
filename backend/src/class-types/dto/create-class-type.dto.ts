import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassTypeDto {
  @ApiProperty({ description: 'Nombre o título de la disciplina', example: 'Pilates Reformer Intensivo' })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiPropertyOptional({ description: 'Descripción detallada de la disciplina', example: 'Trabajo dinámico en cama reformer...' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;

  @ApiPropertyOptional({ description: 'Aforo por defecto en número de camas o cupos', default: 8, example: 8 })
  @IsOptional()
  @IsNumber({}, { message: 'El aforo debe ser un número entero' })
  @Min(1, { message: 'El aforo mínimo debe ser 1' })
  defaultCapacity?: number;

  @ApiProperty({ description: 'Precio unitario por clase en CLP', example: 15000 })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  defaultPrice: number;

  @ApiPropertyOptional({ description: 'Duración de la clase en minutos', default: 60, example: 55 })
  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número en minutos' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Nivel de intensidad', default: 'Todos los niveles', example: 'Intermedio / Avanzado' })
  @IsOptional()
  @IsString({ message: 'El nivel de intensidad debe ser una cadena de texto' })
  intensityLevel?: string;
}
