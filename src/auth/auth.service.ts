import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const password = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, password, name: dto.name?.trim() || null },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const generic = new UnauthorizedException('Credenciais inválidas');
    if (!user) throw generic;
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw generic;
    return { id: user.id, email: user.email, name: user.name };
  }

  signToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }
}
