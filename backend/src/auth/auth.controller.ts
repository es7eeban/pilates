import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo alumno en la plataforma' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente y sesión iniciada' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya se encuentra registrado' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con credenciales de usuario' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso con par de tokens JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta deshabilitada' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token mediante refresh token' })
  @ApiResponse({ status: 200, description: 'Nuevo par de tokens generado' })
  @ApiResponse({ status: 401, description: 'Token de actualización inválido o expirado' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener datos de perfil y rol del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario actual' })
  @ApiResponse({ status: 401, description: 'No autorizado / Token ausente o inválido' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar preferencias del alumno (Sede favorita, horario predilecto)' })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: import('./dto/update-preferences.dto.js').UpdatePreferencesDto,
  ) {
    return this.authService.updatePreferences(user.id, dto);
  }
}
