import { AUTH_MODEL_PROVIDER } from '@constants';
import { AuthUser } from '@domain/entities/Auth';
import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';
import { Auth, createBlindIndex } from '@infrastructure/models/auth.model';
import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @Inject(AUTH_MODEL_PROVIDER) private readonly authModel: Model<Auth>,
  ) {}

  async create(authData: Partial<AuthUser>): Promise<AuthUser> {
    const newAuth = new this.authModel(authData);
    const savedAuth = await newAuth.save();
    return savedAuth.toObject() as AuthUser;
  }

  async findByEmail(
    email: string,
    withPassword?: boolean,
  ): Promise<AuthUser | null> {
    const emailHash = createBlindIndex(email);
    const query = this.authModel.findOne({ emailHash, deletedAt: null });
    if (withPassword) {
      query.select('+password');
    }
    const auth = await query.exec();
    return auth ? (auth.toObject() as AuthUser) : null;
  }

  async findById(id: string, withPassword?: boolean): Promise<AuthUser | null> {
    const query = this.authModel
      .findOne({ id, deletedAt: null })
      .select('+currentHashedRefreshToken');

    if (withPassword) {
      query.select('+password');
    }

    const auth = await query.exec();
    return auth ? (auth.toObject() as AuthUser) : null;
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    const auth = await this.authModel
      .findOne({ googleId, deletedAt: null })
      .exec();
    return auth ? (auth.toObject() as AuthUser) : null;
  }

  async update(id: string, authData: Partial<AuthUser>): Promise<AuthUser> {
    const updatedAuth = await this.authModel
      .findOneAndUpdate(
        { id, deletedAt: null },
        { $set: authData },
        { new: true },
      )
      .exec();

    if (!updatedAuth) {
      throw new Error('Auth user not found');
    }

    return updatedAuth.toObject() as AuthUser;
  }

  /**
   * Soft delete that also lets go of what identifies the person: the e-mail
   * index and Google id (so the address can sign up again), the password hash
   * and the refresh token.
   */
  async delete(id: string): Promise<void> {
    await this.authModel
      .updateOne(
        { id, deletedAt: null },
        {
          $set: { deletedAt: new Date() },
          $unset: {
            emailHash: '',
            googleId: '',
            password: '',
            currentHashedRefreshToken: '',
          },
        },
      )
      .exec();
  }

  async rotateRefreshToken(
    id: string,
    tokenVersion: number,
    currentHash: string,
    newHash: string,
  ): Promise<boolean> {
    const result = await this.authModel
      .updateOne(
        {
          id,
          deletedAt: null,
          // Accounts that predate the field have no tokenVersion at all.
          tokenVersion: tokenVersion === 0 ? { $in: [0, null] } : tokenVersion,
          currentHashedRefreshToken: currentHash,
        },
        { $set: { currentHashedRefreshToken: newHash } },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  /** Ends the session: drops the refresh token and invalidates access tokens. */
  async removeRefreshToken(id: string): Promise<void> {
    await this.authModel
      .updateOne(
        { id, deletedAt: null },
        {
          $set: { currentHashedRefreshToken: null },
          $inc: { tokenVersion: 1 },
        },
      )
      .exec();
  }
}
