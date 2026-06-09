import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor() {
    super({
      clientID:
        process.env.YANDEX_CLIENT_ID || 'bd633c0419864306a4e132bd179c7275',
      clientSecret:
        process.env.YANDEX_CLIENT_SECRET || 'd4b2f5290a594768996b409c192211dd',
      callbackURL:
        process.env.YANDEX_CALLBACK_URL ||
        'http://localhost:3000/auth/yandex/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const { id, username, displayName, emails, photos } = profile;

    // You can process the user profile here and pass it to the request object.
    const user = {
      yandexId: id,
      email: emails && emails.length > 0 ? emails[0].value : null,
      name: displayName || username,
      avatarUrl: photos && photos.length > 0 ? photos[0].value : null,
      accessToken, // Storing for future use if needed (e.g., CalDAV)
      refreshToken,
    };

    done(null, user);
  }
}
