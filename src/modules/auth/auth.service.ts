/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { MailService } from 'src/infrastructure/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
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
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };

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
      role: payload.role,
      username: payload.username,
      isEmailVerified: payload.isEmailVerified,
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

  // ─── Forgot Password ───────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // 👇 always return same response — don't reveal if email exists
    if (!user)
      return { message: 'If that email exists, a reset link was sent' };

    const token = uuidv4();
    await this.redisService.set(
      `reset:${token}`, // key
      user.id, // value
      60 * 15, // TTL: 15 minutes
    );

    await this.mailService.sendPasswordReset(email, token);
    return { message: 'If that email exists, a reset link was sent' };
  }

  // ─── Reset Password ────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.get(`reset:${token}`);
    if (!userId) throw new UnauthorizedException('Token expired or invalid');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);

    // invalidate token immediately after use
    await this.redisService.delete(`reset:${token}`);

    // invalidate all refresh tokens — force re-login
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password reset successfully' };
  }

  // ─── Send Verification Email ───────────────────────────────────
  async sendVerificationEmail(userId: string, email: string) {
    const token = uuidv4();
    await this.redisService.set(
      `verify:${token}`, // key
      userId, // value
      60 * 60 * 24, // TTL: 24 hours
    );
    await this.mailService.sendEmailVerification(email, token);
  }

  // ─── Verify Email ──────────────────────────────────────────────
  async verifyEmail(token: string) {
    const userId = await this.redisService.get(`verify:${token}`);
    if (!userId) throw new UnauthorizedException('Token expired or invalid');

    await this.usersService.markEmailVerified(userId);
    await this.redisService.delete(`verify:${token}`);

    return { message: 'Email verified successfully' };
  }

  // ─── Update Register to send verification ─────────────────────
  async register(dto: RegisterDto) {
    Logger.log('1. Starting registration');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password: hashed });

    // send verification email after register
    this.sendVerificationEmail(user.id, user.email)
      .then(() => Logger.log('2. Verification email sent'))
      .catch((err) => {
        Logger.error('Failed to send verification email', err);
      });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    Logger.log('6. Done');
    return tokens;
  }
}
