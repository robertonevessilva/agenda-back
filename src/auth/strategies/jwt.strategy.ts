import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado.');
    }

    const cookieName = configService.get<string>('AUTH_COOKIE_NAME', 'agenda_auth');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { cookies?: Record<string, string>; headers?: { cookie?: string } }) => {
          const fromCookieObject = request.cookies?.[cookieName];
          if (fromCookieObject) {
            return fromCookieObject;
          }

          const cookieHeader = request.headers?.cookie;
          if (!cookieHeader) {
            return null;
          }

          const cookies = cookieHeader.split(';');
          for (const cookie of cookies) {
            const [key, ...rest] = cookie.trim().split('=');
            if (key === cookieName) {
              return decodeURIComponent(rest.join('='));
            }
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    return payload;
  }
}
