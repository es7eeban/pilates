import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponse, AuthTokens, JwtPayload } from './interfaces/jwt-payload.interface.js';
import { Role } from '@prisma/client';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: Role.CLIENT,
    });

    const [tokens, allowedMenus] = await Promise.all([
      this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        isInstructor: user.isInstructor,
      }),
      this.usersService.getAllowedMenusForRole(user.role),
    ]);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isInstructor: user.isInstructor,
        favoriteBranchId: user.favoriteBranchId,
        favoriteTimeSchedule: user.favoriteTimeSchedule,
        favoriteBranch: user.favoriteBranch,
        bankName: user.bankName,
        bankAccountType: user.bankAccountType,
        bankAccountNumber: user.bankAccountNumber,
        bankAccountRut: user.bankAccountRut,
        bankAccountHolder: user.bankAccountHolder,
        bankPaymentEmail: user.bankPaymentEmail,
        bankPaymentNotes: user.bankPaymentNotes,
        allowedMenus,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta de usuario se encuentra deshabilitada');
    }

    if (user.role === Role.INSTRUCTOR) {
      throw new UnauthorizedException('El acceso para instructores no se encuentra habilitado por el momento');
    }

    const isMatch = await this.comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [tokens, allowedMenus] = await Promise.all([
      this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        isInstructor: user.isInstructor,
      }),
      this.usersService.getAllowedMenusForRole(user.role),
    ]);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isInstructor: user.isInstructor,
        favoriteBranchId: user.favoriteBranchId,
        favoriteTimeSchedule: user.favoriteTimeSchedule,
        favoriteBranch: user.favoriteBranch,
        bankName: user.bankName,
        bankAccountType: user.bankAccountType,
        bankAccountNumber: user.bankAccountNumber,
        bankAccountRut: user.bankAccountRut,
        bankAccountHolder: user.bankAccountHolder,
        bankPaymentEmail: user.bankPaymentEmail,
        bankPaymentNotes: user.bankPaymentNotes,
        allowedMenus,
      },
      tokens,
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'pilates-dev-refresh-secret-key-32-chars!';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Token de actualización inválido o expirado');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isInstructor: user.isInstructor,
    });
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const allowedMenus = await this.usersService.getAllowedMenusForRole(user.role);
    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      allowedMenus,
    };
  }

  async getStudioBankInfo() {
    return this.usersService.getStudioBankInfo();
  }

  async updatePreferences(userId: string, data: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(userId, data);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    isInstructor: boolean;
  }): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isInstructor: user.isInstructor,
    };

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ?? 'pilates-dev-secret-key-32-chars-long!';
    const jwtExpiration = (this.configService.get<string>('JWT_EXPIRATION') ?? '7d') as `${number}m` | `${number}d` | `${number}h` | `${number}s`;

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'pilates-dev-refresh-secret-key-32-chars!';
    const refreshExpiration = (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '30d') as `${number}m` | `${number}d` | `${number}h` | `${number}s`;

    const accessSignOptions: JwtSignOptions = {
      secret: jwtSecret,
      expiresIn: jwtExpiration,
    };

    const refreshSignOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiration,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessSignOptions),
      this.jwtService.signAsync(payload, refreshSignOptions),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
