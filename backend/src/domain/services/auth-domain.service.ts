import { v4 as uuidv4 } from 'uuid';
import { AuthUser, CurrentUser } from '@domain/entities/Auth';
import { Profile } from '@domain/entities/Profile';
import { Role } from '@domain/entities/enums/role.enum';

/**
 * Domain Service for Auth Business Logic
 * Contains pure business rules and logic
 */
export class AuthDomainService {
  /**
   * Business Logic: Validate user login credentials
   * @param email - User email
   * @param plainPassword - Plain text password
   * @param userFromRepo - User data from repository (passed by application layer)
   */
  validateUserLogin(
    email: string,
    plainPassword: string,
    userFromRepo: AuthUser | null,
  ): AuthUser | null {
    if (!email || !plainPassword) {
      return null;
    }

    if (!userFromRepo) {
      return null;
    }

    // Note: Password comparison should be done by application layer
    // Domain just validates business rules
    return userFromRepo;
  }

  /**
   * Business Logic: Create user entity from external provider
   * @param externalData - External provider data
   * @param existingUser - Existing user check result (passed by application layer)
   * @returns AuthUser entity ready for persistence
   */
  createExternalUserEntity(
    externalData: {
      providerId: string;
      email: string;
      firstName: string;
      lastName: string;
      provider: 'google' | undefined;
    },
    existingUser: AuthUser | null,
  ): AuthUser {
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const newUser: AuthUser = {
      id: this.generateUserId(),
      email: externalData.email,
      password: '',
      role: [Role.USER],
      googleId:
        externalData.provider === 'google'
          ? externalData.providerId
          : undefined,
    };

    return newUser;
  }

  /**
   * Business Logic: Check if user can perform admin actions
   * @param user - User to check
   */
  canPerformAdminActions(user: AuthUser): boolean {
    return user.role.includes(Role.ADMIN);
  }

  /**
   * Business Logic: Validate if user can be created
   * @param existingUser - Existing user check result (passed by application layer)
   */
  canCreateUser(existingUser: AuthUser | null): boolean {
    return !existingUser;
  }

  /**
   * Business Logic: Whether a caller may read or delete an account. Owning it
   * or being an admin, nothing else.
   *
   * Decided from the ids alone, so the caller can be turned away before the
   * record is ever looked up. Authorizing after the lookup would answer 403 for
   * an account that exists and 404 for one that does not, which is all anyone
   * needs to enumerate the user base.
   * @param targetUserId - Account being acted on
   * @param requestingUserId - Caller, taken from the validated token
   * @param isAdmin - Whether the caller carries the admin role
   */
  canAccessAccount(
    targetUserId: string,
    requestingUserId: string,
    isAdmin: boolean,
  ): boolean {
    return targetUserId === requestingUserId || isAdmin;
  }

  /**
   * Business Logic: Check if user exists for deletion (used in compensation actions)
   * @param user - User data from repository (passed by application layer)
   */
  userExistsForDeletion(user: AuthUser | null): boolean {
    return !!user;
  }

  /**
   * Business Logic: Check if user has required role
   * @param user - User to check
   * @param requiredRole - Required role
   */
  hasRole(user: AuthUser, requiredRole: Role): boolean {
    return user.role.includes(requiredRole);
  }

  /**
   * Business Logic: Reduce an auth record and its profile to what the client
   * may see about itself. Built by picking fields rather than by deleting them,
   * so a column added to the auth schema later is never exposed by accident.
   * @param auth - Auth record from repository (passed by application layer)
   * @param profile - Profile of that auth record, null while the saga that
   * creates it has not finished
   */
  toCurrentUser(auth: AuthUser, profile: Profile | null): CurrentUser {
    return {
      id: auth.id,
      email: auth.email,
      name: profile?.name ?? null,
      roles: auth.role,
      createdAt: auth.createdAt,
    };
  }

  /**
   * Business Logic: Validate password strength
   * @param password - Password to validate
   */
  isPasswordValid(password: string): boolean {
    // Business rule: Password must be at least 8 characters, contain uppercase, lowercase, and number
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Business Logic: Validate password change data
   */
  validatePasswordChangeData(data: {
    oldPassword: string;
    newPassword: string;
  }): void {
    if (!this.isPasswordValid(data.newPassword)) {
      throw new Error(
        'Password must include at least one uppercase letter, one lowercase letter, and one number',
      );
    }

    if (data.oldPassword === data.newPassword) {
      throw new Error('New password must be different from old password');
    }
  }

  /**
   * Business Logic: Validate email format
   * @param email - Email to validate
   */
  isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Business Logic: Validate user creation data
   * @param userData - User data to validate
   */
  validateUserCreation(userData: { email: string; password: string }): void {
    if (!this.isEmailValid(userData.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isPasswordValid(userData.password)) {
      throw new Error('Password does not meet requirements');
    }
  }

  /**
   * Business Logic: Create user entity with validation
   * @param userData - User creation data
   * @param existingUser - Existing user check result (passed by application layer)
   * @returns AuthUser entity ready for persistence
   */
  createUserEntity(
    userData: { email: string; password: string },
    existingUser: AuthUser | null,
  ): AuthUser {
    this.validateUserCreation(userData);

    if (!this.canCreateUser(existingUser)) {
      throw new Error('User already exists with this email');
    }

    const newUser: AuthUser = {
      id: this.generateUserId(),
      email: userData.email,
      password: userData.password,
      role: [Role.USER],
    };

    return newUser;
  }

  /**
   * Business Logic: Generate user ID
   * @returns Generated user ID
   */
  generateUserId(): string {
    return 'auth-' + uuidv4();
  }
}
