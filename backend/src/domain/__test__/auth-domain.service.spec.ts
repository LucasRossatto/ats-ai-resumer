import { AuthUser } from '@domain/entities/Auth';
import { Profile } from '@domain/entities/Profile';
import { Role } from '@domain/entities/enums/role.enum';
import { AuthDomainService } from '@domain/services/auth-domain.service';

describe('AuthDomainService', () => {
  let service: AuthDomainService;

  const auth = {
    id: 'auth-1',
    email: 'lucas@example.com',
    password: '$2b$10$hashedpassword',
    currentHashedRefreshToken: '$2b$10$hashedrefreshtoken',
    role: [Role.USER],
    createdAt: new Date('2026-01-01T09:00:00Z'),
    lastLoginAt: new Date('2026-02-01T09:00:00Z'),
  } as AuthUser;

  const profile = {
    id: 'profile-1',
    authId: 'auth-1',
    name: 'Lucas',
    age: 28,
  } as Profile;

  beforeEach(() => {
    service = new AuthDomainService();
  });

  describe('toCurrentUser', () => {
    it('returns the identity and display data of the user', () => {
      expect(service.toCurrentUser(auth, profile)).toEqual({
        id: 'auth-1',
        email: 'lucas@example.com',
        name: 'Lucas',
        roles: [Role.USER],
        createdAt: new Date('2026-01-01T09:00:00Z'),
      });
    });

    it('never exposes the password or the refresh token hash', () => {
      const currentUser = service.toCurrentUser(auth, profile);

      expect(currentUser).not.toHaveProperty('password');
      expect(currentUser).not.toHaveProperty('currentHashedRefreshToken');
      expect(Object.keys(currentUser).sort()).toEqual([
        'createdAt',
        'email',
        'id',
        'name',
        'roles',
      ]);
    });

    it('answers with a null name while the profile does not exist yet', () => {
      const currentUser = service.toCurrentUser(auth, null);

      expect(currentUser.name).toBeNull();
      expect(currentUser.id).toBe('auth-1');
      expect(currentUser.email).toBe('lucas@example.com');
    });

    it('carries every role the user holds', () => {
      const admin = { ...auth, role: [Role.USER, Role.ADMIN] } as AuthUser;

      expect(service.toCurrentUser(admin, profile).roles).toEqual([
        Role.USER,
        Role.ADMIN,
      ]);
    });
  });
});
