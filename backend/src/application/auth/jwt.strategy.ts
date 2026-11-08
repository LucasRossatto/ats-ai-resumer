import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from '@constants';
import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: JWT_SECRET,
    });
  }

  /**
   * A valid signature is not enough: the account must still exist and the token
   * must carry its current `tokenVersion`, so logout, a password change or an
   * account deletion end the access token right away instead of at expiry. The
   * roles come from the record, so a changed role applies on the next request.
   */
  async validate(payload: { sub: string; tv?: number }) {
    const auth = await this.authRepository.findById(payload.sub);

    if (!auth || (auth.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      throw new UnauthorizedException();
    }

    return { id: auth.id, email: auth.email, roles: auth.role };
  }
}
