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

  @ApiPropertyOptional({ description: 'Nombre del banco para transferencias y liquidaciones de pasarela', example: 'Banco de Chile' })
  @IsOptional()
  @IsString({ message: 'bankName debe ser una cadena de texto' })
  bankName?: string | null;

  @ApiPropertyOptional({ description: 'Tipo de cuenta bancaria', example: 'Cuenta Corriente' })
  @IsOptional()
  @IsString({ message: 'bankAccountType debe ser una cadena de texto' })
  bankAccountType?: string | null;

  @ApiPropertyOptional({ description: 'Número de cuenta bancaria', example: '00-123-45678-90' })
  @IsOptional()
  @IsString({ message: 'bankAccountNumber debe ser una cadena de texto' })
  bankAccountNumber?: string | null;

  @ApiPropertyOptional({ description: 'RUT del titular de la cuenta bancaria', example: '76.543.210-K' })
  @IsOptional()
  @IsString({ message: 'bankAccountRut debe ser una cadena de texto' })
  bankAccountRut?: string | null;

  @ApiPropertyOptional({ description: 'Nombre o Razón Social del titular de la cuenta bancaria', example: 'K PILATES SpA' })
  @IsOptional()
  @IsString({ message: 'bankAccountHolder debe ser una cadena de texto' })
  bankAccountHolder?: string | null;

  @ApiPropertyOptional({ description: 'Correo electrónico para envío de comprobantes y notificaciones bancarias', example: 'pagos@estudiopilates.cl' })
  @IsOptional()
  @IsString({ message: 'bankPaymentEmail debe ser una cadena de texto' })
  bankPaymentEmail?: string | null;

  @ApiPropertyOptional({ description: 'Notas o instrucciones adicionales para transferencias', example: 'Indicar nombre y código de reserva en el comentario' })
  @IsOptional()
  @IsString({ message: 'bankPaymentNotes debe ser una cadena de texto' })
  bankPaymentNotes?: string | null;
}
