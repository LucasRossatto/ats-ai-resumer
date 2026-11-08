import { NotFoundException } from '@nestjs/common';
import { ProfileController } from '@api/controllers/profile.controller';

describe('ProfileController.getProfile', () => {
  const profile = { id: 'profile-1', authId: 'auth-1', name: 'Lucas' };
  const profileService = { findById: jest.fn() };
  const responseService = {
    retrieved: jest.fn((data: unknown) => ({ data })),
  };
  const controller = new ProfileController(
    profileService as never,
    {} as never,
    responseService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    profileService.findById.mockResolvedValue(profile);
  });

  it('returns the profile to its owner', async () => {
    await controller.getProfile('profile-1', 'auth-1', false);
    expect(responseService.retrieved).toHaveBeenCalledWith(
      profile,
      expect.any(String),
    );
  });

  it('returns the profile to an admin', async () => {
    await controller.getProfile('profile-1', 'admin-1', true);
    expect(responseService.retrieved).toHaveBeenCalled();
  });

  it('answers 404 to somebody else, like for an id that does not exist', async () => {
    await expect(
      controller.getProfile('profile-1', 'auth-2', false),
    ).rejects.toThrow(NotFoundException);

    profileService.findById.mockResolvedValue(null);
    await expect(
      controller.getProfile('nope', 'auth-2', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('has no route to create a profile', () => {
    expect(
      (ProfileController.prototype as unknown as Record<string, unknown>)
        .create,
    ).toBeUndefined();
  });
});
