import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ description: 'Nombre de la sede', example: 'Sede Providencia' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ description: 'Slug único URL-friendly', example: 'sede-providencia' })
  @IsString({ message: 'El slug debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El slug es obligatorio' })
  slug: string;

  @ApiProperty({ description: 'Dirección completa', example: 'Av. Providencia 1208, Of. 402' })
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  address: string;

  @ApiPropertyOptional({ description: 'Comuna', example: 'Providencia' })
  @IsOptional()
  @IsString({ message: 'La comuna debe ser una cadena de texto' })
  commune?: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Santiago', default: 'Santiago' })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  city?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto', example: '+56944556677' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;
}
