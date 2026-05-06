import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { CurrentUserId } from './current-user.decorator';
import { COOKIE_NAME, JwtAuthGuard } from './jwt-auth.guard';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOpts() {
  // Em produção cross-subdomain (frontend em excalidraw.dominio, backend em
  // api.excalidraw.dominio), defina COOKIE_DOMAIN=.dominio.com pra que o
  // cookie seja visível nos dois subdomínios.
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SEVEN_DAYS_MS,
    ...(domain ? { domain } : {}),
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.register(dto);
    const token = this.auth.signToken(user.id);
    res.cookie(COOKIE_NAME, token, cookieOpts());
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(dto);
    const token = this.auth.signToken(user.id);
    res.cookie(COOKIE_NAME, token, cookieOpts());
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { ...cookieOpts(), maxAge: 0 });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUserId() userId: string) {
    return { user: await this.auth.me(userId) };
  }
}
