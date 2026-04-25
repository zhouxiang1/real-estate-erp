import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    // 返回完整的用户信息包括角色
    const user = await this.authService.getUserWithRole(req.user.id);
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    // In a JWT-based system, logout is handled client-side by deleting the token
    // If using Redis token blacklisting, implement here
    return { message: '登出成功' };
  }
}
