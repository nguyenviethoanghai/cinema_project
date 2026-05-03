import { UserService, IGetAllUsersFilters } from '../userService';
import { ErrorMessages } from '../../types';
import { jest } from '@jest/globals';

describe('UserService', () => {
  let userService: UserService;
  let mockUser: any;
  let mockModels: any;

  beforeEach(() => {
    // Mock user model
    mockUser = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      toJSON: jest.fn(),
    };

    // Mock role model
    const mockRole = {};

    mockModels = {
      User: mockUser,
      Role: mockRole,
    };

    userService = new UserService(mockModels);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllStaffs', () => {
    it('[TC-USER-01] Should return list of staffs and exclude customers', async () => {
      // Test Objective: Verify getting staff lists excludes customers
      const filters: IGetAllUsersFilters = { page: 1, size: 10 };
      
      const mockStaff = { id: 'staff1', name: 'Staff A', toJSON: () => ({ id: 'staff1', name: 'Staff A' }) };
      
      mockUser.count.mockResolvedValue(1);
      mockUser.findAll.mockResolvedValue([mockStaff]);
      
      const result = await userService.getAllStaffs(filters);
      
      expect(mockUser.count).toHaveBeenCalled();
      expect(mockUser.findAll).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.paging.total).toBe(1);
    });
  });

  describe('updateUser', () => {
    it('[TC-USER-02] Should update user if requested by admin', async () => {
      // Test Objective: Verify admin can update other user's profile
      const targetUserId = 'user123';
      const requestingUserId = 'admin123';
      const requestingUserRole = 'admin';
      
      const updateData = { name: 'New Name' };
      
      const mockFoundUser = {
        update: jest.fn<any>().mockResolvedValue(true),
        toJSON: () => ({ id: targetUserId, name: 'New Name', password: 'hash' })
      };
      
      mockUser.findOne.mockResolvedValue(mockFoundUser);
      
      const result = await userService.updateUser(targetUserId, updateData, requestingUserId, requestingUserRole);
      
      expect(mockFoundUser.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(result).not.toHaveProperty('password');
    });

    it('[TC-USER-03] Should block update if requested by another normal user', async () => {
      // Test Objective: Verify normal user cannot update another user's profile
      const targetUserId = 'user123';
      const requestingUserId = 'user456'; // different user
      const requestingUserRole = 'customer';
      
      await expect(
        userService.updateUser(targetUserId, { name: 'New' }, requestingUserId, requestingUserRole)
      ).rejects.toThrow('You can only update your own profile');
    });
  });

  describe('deleteUser', () => {
    it('[TC-USER-04] Should block admin from deleting themselves', async () => {
      // Test Objective: Prevent self-deletion
      await expect(
        userService.deleteUser('admin1', 'admin1')
      ).rejects.toThrow('You cannot delete your own account');
    });

    it('[TC-USER-05] Should block deleting admin accounts', async () => {
      // Test Objective: Prevent deleting other admin accounts
      mockUser.findOne.mockResolvedValue({
        toJSON: () => ({ id: 'admin2', role_id: 'admin' })
      });
      
      await expect(
        userService.deleteUser('admin2', 'admin1')
      ).rejects.toThrow('Cannot delete admin accounts');
    });
    
    it('[TC-USER-06] Should delete user successfully', async () => {
      // Test Objective: Successful deletion
      // CheckDB: Verify destroy is called
      const mockDestroy = jest.fn();
      mockUser.findOne.mockResolvedValue({
        toJSON: () => ({ id: 'staff1', role_id: 'manager_staff' }),
        destroy: mockDestroy
      });
      
      await userService.deleteUser('staff1', 'admin1');
      expect(mockDestroy).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('[TC-USER-07] Should return user by ID and exclude password', async () => {
      const mockUserData = { id: 'user1', name: 'User One', password: 'hash', toJSON: () => ({ id: 'user1', name: 'User One', password: 'hash' }) };
      mockUser.findOne.mockResolvedValue(mockUserData);
      
      const result = await userService.getUserById('user1');
      expect(result.id).toBe('user1');
      expect(result).not.toHaveProperty('password');
    });

    it('[TC-USER-08] Should throw error if user not found', async () => {
      mockUser.findOne.mockResolvedValue(null);
      await expect(userService.getUserById('none')).rejects.toThrow(ErrorMessages.USER_NOT_FOUND);
    });
  });

  describe('getAllUsers', () => {
    it('[TC-USER-09] Should return paginated users', async () => {
      mockUser.count.mockResolvedValue(2);
      mockUser.findAll.mockResolvedValue([
        { toJSON: () => ({ id: 'u1' }) },
        { toJSON: () => ({ id: 'u2' }) }
      ]);
      
      const result = await userService.getAllUsers({ page: 1, size: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.paging.total_pages).toBe(1);
    });
  });
});
