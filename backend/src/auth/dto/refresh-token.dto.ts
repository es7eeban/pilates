import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'El token de actualización debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token de actualización es obligatorio' })
  refreshToken: string;
}
