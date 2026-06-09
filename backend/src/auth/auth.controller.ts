import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('yandex')
  @UseGuards(AuthGuard('yandex'))
  async yandexAuth() {
    // Passport handles the redirect to Yandex automatically
  }

  @Get('yandex/callback')
  @UseGuards(AuthGuard('yandex'))
  async yandexAuthCallback(@Req() req: any, @Res() res: Response) {
    // When passport finishes authentication, it puts the profile on req.user
    const jwt = await this.authService.validateOAuthLogin(req.user);

    // Redirect back to frontend with the JWT token
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${jwt}`);
  }

  @Get('vkontakte')
  @UseGuards(AuthGuard('vkontakte'))
  async vkAuth() {
    // Passport handles the redirect to VK automatically
  }

  @Get('vkontakte/callback')
  @UseGuards(AuthGuard('vkontakte'))
  async vkAuthCallback(@Req() req: any, @Res() res: Response) {
    const jwt = await this.authService.validateOAuthLogin(req.user);
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${jwt}`);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    return req.user;
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.authService.updateUserProfile(req.user.id, body);
  }
}
