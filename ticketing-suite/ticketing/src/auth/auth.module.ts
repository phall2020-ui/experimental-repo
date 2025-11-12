import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController, UsersController } from './auth.controller';
import { PrismaService } from '../infra/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' }
    }),
    EmailModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [JwtStrategy, AuthService, PrismaService],
  exports: [PassportModule],
})
export class AuthModule {}
