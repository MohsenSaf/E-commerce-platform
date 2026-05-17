import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // validate user by email and password
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async generateTokens(user: AuthenticatedUser) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      // generate access token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<number>('jwt.expiresIn'),
      }),

      //generate refresh token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<number>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
  // add refreshToken to users table
  async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  // login user by generating new tokens
  async login(user: AuthenticatedUser) {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // add new user to table and generate token
  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      password: hashed,
    });
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  //generate new tokens
  async refresh(token: string) {
    //validate old refresh token
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    });

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    //delete old refresh token
    await this.prisma.refreshToken.delete({ where: { token } });

    // generate new tokens
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
    };

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
    return { message: 'Logged out successfully' };
  }
}
