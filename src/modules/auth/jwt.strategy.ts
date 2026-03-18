import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  validate(payload: { sub: string; role: 'ADMIN' | 'DRIVER'; type?: 'access' | 'refresh' }) {
    if (payload.type && payload.type !== 'access') {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  }
}





