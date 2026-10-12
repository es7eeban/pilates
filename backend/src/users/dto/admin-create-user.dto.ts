import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AdminCreateUserDto {
  @ApiProperty({ description: 'Nombre completo del usuario', example: 'Camila Silva' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ description: 'Correo electrónico único', example: 'camila.silva@gmail.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @ApiProperty({ description: 'Número de teléfono de contacto', example: '+56987654321' })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  phone: string;

  @ApiPropertyOptional({ description: 'Contraseña inicial (por defecto Pilates123!)', example: 'Pilates123!' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({ description: 'Rol de acceso del usuario', enum: Role, default: Role.CLIENT })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser CLIENT, INSTRUCTOR o ADMIN' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Indica si puede impartir clases como instructor', default: false })
  @IsOptional()
  @IsBoolean()
  isInstructor?: boolean;

  @ApiPropertyOptional({ description: 'ID de la sede favorita asignada', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'favoriteBranchId debe ser un UUID válido' })
  favoriteBranchId?: string;
}
