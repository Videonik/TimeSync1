import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-vkontakte';

@Injectable()
export class VkontakteStrategy extends PassportStrategy(Strategy, 'vkontakte') {
  constructor() {
    super({
      clientID: process.env.VK_CLIENT_ID || 'dummy_vk_client_id',
      clientSecret: process.env.VK_CLIENT_SECRET || 'dummy_vk_client_secret',
      callbackURL:
        process.env.VK_CALLBACK_URL ||
        'http://localhost:3000/auth/vkontakte/callback',
      apiVersion: '5.131',
      scope: ['email'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: Function,
  ) {
    const { id, displayName, photos, emails } = profile;

    const user = {
      vkId: id,
      email:
        emails && emails.length > 0 ? emails[0].value : params.email || null,
      name: displayName,
      avatarUrl: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
    };

    done(null, user);
  }
}
