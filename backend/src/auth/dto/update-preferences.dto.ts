import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'ID de la sede favorita del alumno (UUID o null para desmarcar)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'favoriteBranchId debe ser un UUID válido' })
  favoriteBranchId?: string | null;

  @ApiPropertyOptional({ description: 'Horario favorito de entrenamiento (ej: 09:00, 18:00)', example: '09:00' })
  @IsOptional()
  @IsString({ message: 'favoriteTimeSchedule debe ser una cadena de texto' })
  favoriteTimeSchedule?: string | null;
}
