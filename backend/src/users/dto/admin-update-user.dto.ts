import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: 'Nombre completo del usuario', example: 'Camila Silva' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico único', example: 'camila.nueva@gmail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @ApiPropertyOptional({ description: 'Número de teléfono de contacto', example: '+56987654321' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Nueva contraseña para restablecer acceso', example: 'NuevaClave123!' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({ description: 'Rol de acceso del usuario', enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser CLIENT, INSTRUCTOR o ADMIN' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Indica si puede impartir clases como instructor' })
  @IsOptional()
  @IsBoolean()
  isInstructor?: boolean;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo del usuario' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID de la sede favorita asignada (null para desasignar)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'favoriteBranchId debe ser un UUID válido' })
  favoriteBranchId?: string | null;
}
