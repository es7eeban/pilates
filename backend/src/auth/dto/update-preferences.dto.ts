import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Nombre completo del usuario', example: 'Camila Soto' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico de contacto', example: 'camila@pilates.cl' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto', example: '+56 9 8765 4321' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;

  @ApiPropertyOptional({ description: 'ID de la sede favorita del alumno (UUID o null para desmarcar)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'favoriteBranchId debe ser un UUID válido' })
  favoriteBranchId?: string | null;

  @ApiPropertyOptional({ description: 'Horario favorito de entrenamiento (ej: AM, PM)', example: 'AM' })
  @IsOptional()
  @IsString({ message: 'favoriteTimeSchedule debe ser una cadena de texto' })
  favoriteTimeSchedule?: string | null;
}
