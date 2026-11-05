import { ProfileRepository } from '@infrastructure/repository/profile.repository';
import { AUTH_MODEL_PROVIDER, PROFILE_MODEL_PROVIDER } from '@constants';
import { Profile } from '@domain/entities/Profile';
import { Role } from '@domain/entities/enums/role.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let mockProfileModel: any;
  let mockAuthModel: any;

  beforeEach(async () => {
    // Create a constructor function that can be called with 'new'
    mockProfileModel = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue(data),
      }),
      toObject: jest.fn().mockReturnValue(data),
    }));

    // Add static methods to the constructor
    mockProfileModel.find = jest.fn();
    mockProfileModel.findOne = jest.fn();
    mockProfileModel.findOneAndUpdate = jest.fn();
    mockProfileModel.aggregate = jest.fn();
    mockProfileModel.create = jest.fn();
    mockProfileModel.updateOne = jest.fn();

    mockAuthModel = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileRepository,
        {
          provide: PROFILE_MODEL_PROVIDER,
          useValue: mockProfileModel,
        },
        {
          provide: AUTH_MODEL_PROVIDER,
          useValue: mockAuthModel,
        },
      ],
    }).compile();

    repository = module.get<ProfileRepository>(ProfileRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const profileData: Partial<Profile> = {
        id: faker.string.uuid(),
        authId: faker.string.uuid(),
        name: faker.person.firstName(),
        lastname: faker.person.lastName(),
        age: faker.number.int({ min: 18, max: 80 }),
      };

      const result = await repository.create(profileData);

      expect(mockProfileModel).toHaveBeenCalledWith(profileData);
      expect(result).toEqual(profileData);
    });
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [
        {
          toObject: jest.fn().mockReturnValue({
            id: faker.string.uuid(),
            authId: faker.string.uuid(),
            name: faker.person.firstName(),
            lastname: faker.person.lastName(),
            age: 25,
          }),
        },
        {
          toObject: jest.fn().mockReturnValue({
            id: faker.string.uuid(),
            authId: faker.string.uuid(),
            name: faker.person.firstName(),
            lastname: faker.person.lastName(),
            age: 30,
          }),
        },
      ];

      mockProfileModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfiles),
      });

      const result = await repository.findAll();

      expect(mockProfileModel.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(mockProfiles[0].toObject).toHaveBeenCalled();
      expect(mockProfiles[1].toObject).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return profile when found', async () => {
      const profileId = faker.string.uuid();
      const mockProfile = {
        toObject: jest.fn().mockReturnValue({
          id: profileId,
          authId: faker.string.uuid(),
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        }),
      };

      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfile),
      });

      const result = await repository.findById(profileId);

      expect(mockProfileModel.findOne).toHaveBeenCalledWith({
        id: profileId,
        deletedAt: null,
      });
      expect(mockProfile.toObject).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null when profile not found', async () => {
      const profileId = faker.string.uuid();

      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById(profileId);

      expect(mockProfileModel.findOne).toHaveBeenCalledWith({
        id: profileId,
        deletedAt: null,
      });
      expect(result).toBeNull();
    });
  });

  describe('findByAuthId', () => {
    it('should return profile when found by authId', async () => {
      const authId = faker.string.uuid();
      const mockProfile = {
        toObject: jest.fn().mockReturnValue({
          id: faker.string.uuid(),
          authId: authId,
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        }),
      };

      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfile),
      });

      const result = await repository.findByAuthId(authId);

      expect(mockProfileModel.findOne).toHaveBeenCalledWith({
        authId,
        deletedAt: null,
      });
      expect(mockProfile.toObject).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null when profile not found by authId', async () => {
      const authId = faker.string.uuid();

      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByAuthId(authId);

      expect(mockProfileModel.findOne).toHaveBeenCalledWith({
        authId,
        deletedAt: null,
      });
      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should return profiles with specific role', async () => {
      const mockProfiles = [
        {
          id: faker.string.uuid(),
          authId: faker.string.uuid(),
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        },
      ];

      const authId = mockProfiles[0].authId;
      const select = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ id: authId }]),
      });
      mockAuthModel.find.mockReturnValue({ select });
      mockProfileModel.find.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(mockProfiles.map((p) => ({ toObject: () => p }))),
      });

      const result = await repository.findByRole(Role.ADMIN);

      expect(mockAuthModel.find).toHaveBeenCalledWith({
        role: Role.ADMIN,
        deletedAt: null,
      });
      expect(select).toHaveBeenCalledWith('id');
      expect(mockProfileModel.find).toHaveBeenCalledWith({
        authId: { $in: [authId] },
        deletedAt: null,
      });
      expect(result).toEqual(mockProfiles);
    });
  });

  describe('findByRole without matching auths', () => {
    it('should return empty array and skip profile query', async () => {
      mockAuthModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await repository.findByRole(Role.ADMIN);

      expect(result).toEqual([]);
      expect(mockProfileModel.find).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return profile', async () => {
      const profileId = faker.string.uuid();
      const updateData = { name: 'Updated Name' };
      const updatedProfile = {
        toObject: jest.fn().mockReturnValue({
          id: profileId,
          authId: faker.string.uuid(),
          name: 'Updated Name',
          lastname: faker.person.lastName(),
          age: 25,
        }),
      };

      mockProfileModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProfile),
      });

      const result = await repository.update(profileId, updateData);

      expect(mockProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: profileId, deletedAt: null },
        { $set: updateData },
        { new: true },
      );
      expect(updatedProfile.toObject).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when profile not found for update', async () => {
      const profileId = faker.string.uuid();
      const updateData = { name: 'Updated Name' };

      mockProfileModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.update(profileId, updateData)).rejects.toThrow(
        'Profile not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete profile', async () => {
      const profileId = faker.string.uuid();

      mockProfileModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await repository.delete(profileId);

      expect(mockProfileModel.updateOne).toHaveBeenCalledWith(
        { id: profileId, deletedAt: null },
        { $set: { deletedAt: expect.any(Date) } },
      );
    });
  });
});
