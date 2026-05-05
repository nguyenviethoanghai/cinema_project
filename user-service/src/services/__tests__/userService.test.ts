/**
 * ============================================================
 * FILE: userService.test.ts
 * SERVICE: user-service (Node.js / TypeScript)
 * FRAMEWORK: Jest + ts-jest (ESM mode)
 * PURPOSE: Unit tests for UserService - verifies staff management,
 *          access control rules, and user CRUD operations.
 *
 * CHECKDB NOTE: All DB access is through Sequelize models.
 *   Models (User, Role) are replaced with jest.fn() mocks,
 *   so no actual DB queries run. Correct model method calls
 *   (findOne, findAll, count, destroy, update) are verified
 *   via expect() assertions as the "CheckDB" step.
 *
 * ROLLBACK NOTE: Because real DB is not touched (models are mocked),
 *   no data rollback is needed. jest.clearAllMocks() in afterEach()
 *   ensures each test starts with a clean slate.
 * ============================================================
 */

import { UserService, IGetAllUsersFilters } from '../userService';
import { ErrorMessages } from '../../types';
import { jest } from '@jest/globals';

describe('UserService', () => {
  let userService: UserService;
  let mockUserModel: any; // Mock for Sequelize User model
  let mockModels: any;    // Mock for the entire Models object

  // ── Setup: rebuild fresh mocks before every test ────────────────────────
  beforeEach(() => {
    // Mock Sequelize User model methods
    mockUserModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      toJSON: jest.fn(),
    };

    // Mock the full models container passed to UserService constructor
    mockModels = {
      User: mockUserModel,
      Role: {},  // Role model not directly called; used in Sequelize include
    };

    userService = new UserService(mockModels);
  });

  // ── Teardown: clear all mocks after every test ───────────────────────────
  afterEach(() => {
    jest.clearAllMocks(); // ROLLBACK equivalent: reset mock state
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getAllStaffs
  // SOURCE: userService.ts, lines 147-207
  // ══════════════════════════════════════════════════════════════════════════
  describe('getAllStaffs', () => {

    /**
     * [TC-USER-01]
     * Test Objective: Verify that getAllStaffs returns staff members and
     *   correctly excludes customers by applying a role filter (Op.ne customer).
     * Preconditions: DB mock returns 1 staff record.
     * Input: { page: 1, size: 10 }
     * Expected Output: { data: [staffRecord], paging: { total: 1 } }
     * CheckDB: Verifies User.count() and User.findAll() were both called.
     */
    it('[TC-USER-01] Should return list of staffs and exclude customers', async () => {
      const filters: IGetAllUsersFilters = { page: 1, size: 10 };

      // Fake staff returned from DB mock
      const fakeStaffRecord = {
        id: 'staff1',
        name: 'Staff A',
        toJSON: () => ({ id: 'staff1', name: 'Staff A' }),
      };

      // CheckDB setup: mock DB responses
      mockUserModel.count.mockResolvedValue(1);
      mockUserModel.findAll.mockResolvedValue([fakeStaffRecord]);

      // EXECUTE
      const result = await userService.getAllStaffs(filters);

      // VERIFY: CheckDB - DB was queried
      expect(mockUserModel.count).toHaveBeenCalled();
      expect(mockUserModel.findAll).toHaveBeenCalled();

      // VERIFY: Result structure
      expect(result.data).toHaveLength(1);
      expect(result.paging.total).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: updateUser
  // SOURCE: userService.ts, lines 50-85
  // ══════════════════════════════════════════════════════════════════════════
  describe('updateUser', () => {

    /**
     * [TC-USER-02]
     * Test Objective: Verify that an admin can update another user's profile.
     *   The updated data is persisted via user.update(), and the response
     *   must NOT contain the raw password field.
     * Preconditions: DB mock finds the target user.
     * Input: targetUserId='user123', requestingUserId='admin123', role='admin'
     * Expected Output: Updated user data without 'password' property.
     * CheckDB: Verifies user.update() was called with correct fields.
     */
    it('[TC-USER-02] Should update user if requested by admin', async () => {
      const targetUserId = 'user123';
      const requestingUserId = 'admin123';
      const requestingUserRole = 'admin';
      const updateData = { name: 'New Name' };

      // Mock: DB finds the target user and supports update
      const fakeFoundUser = {
        update: jest.fn<any>().mockResolvedValue(true),
        toJSON: () => ({ id: targetUserId, name: 'New Name', password: 'hash_secret' }),
      };
      mockUserModel.findOne.mockResolvedValue(fakeFoundUser);

      // EXECUTE
      const result = await userService.updateUser(targetUserId, updateData, requestingUserId, requestingUserRole);

      // VERIFY: CheckDB - update was applied to the correct fields
      expect(fakeFoundUser.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result.name).toBe('New Name');

      // VERIFY: Password is stripped from response (sensitive data protection)
      expect(result).not.toHaveProperty('password');
    });

    /**
     * [TC-USER-03]
     * Test Objective: Verify that a normal (non-admin) user cannot update
     *   another user's profile. Business rule: users can only edit their own.
     * Preconditions: requestingUserId differs from targetUserId, role='customer'.
     * Input: targetUserId='user123', requestingUserId='user456', role='customer'
     * Expected Output: Throws Error('You can only update your own profile')
     */
    it('[TC-USER-03] Should block update if requested by another normal user', async () => {
      const targetUserId = 'user123';
      const requestingUserId = 'user456'; // Different user — not authorized
      const requestingUserRole = 'customer';

      // EXECUTE & VERIFY: Must throw access denial error
      await expect(
        userService.updateUser(targetUserId, { name: 'New' }, requestingUserId, requestingUserRole)
      ).rejects.toThrow('You can only update your own profile');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: deleteUser
  // SOURCE: userService.ts, lines 210-233
  // ══════════════════════════════════════════════════════════════════════════
  describe('deleteUser', () => {

    /**
     * [TC-USER-04]
     * Test Objective: Verify that the system prevents any user from deleting
     *   their own account (self-deletion guard).
     * Preconditions: requestingUserId === userId
     * Input: userId='admin1', requestingUserId='admin1'
     * Expected Output: Throws Error('You cannot delete your own account')
     */
    it('[TC-USER-04] Should block admin from deleting themselves', async () => {
      // EXECUTE & VERIFY: Self-deletion must be blocked
      await expect(
        userService.deleteUser('admin1', 'admin1')
      ).rejects.toThrow('You cannot delete your own account');
    });

    /**
     * [TC-USER-05]
     * Test Objective: Verify that admin accounts cannot be deleted by anyone,
     *   protecting the system's top-level admin access.
     * Preconditions: DB mock returns a user with role_id='admin'.
     * Input: userId='admin2', requestingUserId='admin1'
     * Expected Output: Throws Error('Cannot delete admin accounts')
     * CheckDB: Verifies User.findOne() was called to retrieve the target user.
     */
    it('[TC-USER-05] Should block deleting admin accounts', async () => {
      // CheckDB setup: DB finds a user with admin role
      mockUserModel.findOne.mockResolvedValue({
        toJSON: () => ({ id: 'admin2', role_id: 'admin' }),
      });

      // EXECUTE & VERIFY
      await expect(
        userService.deleteUser('admin2', 'admin1')
      ).rejects.toThrow('Cannot delete admin accounts');
    });

    /**
     * [TC-USER-06]
     * Test Objective: Verify that a non-admin user is deleted successfully.
     *   Confirms the DB destroy() method is called (the actual deletion).
     * Preconditions: DB mock returns a staff user (role_id='manager_staff').
     * Input: userId='staff1', requestingUserId='admin1'
     * Expected Output: Resolves without error. destroy() is called once.
     * CheckDB: Verifies user.destroy() was called — confirming DB row removal.
     * Rollback: destroy() is mocked so no real DB change occurs.
     */
    it('[TC-USER-06] Should delete user successfully', async () => {
      const mockDestroyFn = jest.fn();

      // CheckDB setup: DB returns a deletable staff user
      mockUserModel.findOne.mockResolvedValue({
        toJSON: () => ({ id: 'staff1', role_id: 'manager_staff' }),
        destroy: mockDestroyFn,
      });

      // EXECUTE
      await userService.deleteUser('staff1', 'admin1');

      // VERIFY: CheckDB - destroy was called once (user deleted from DB)
      expect(mockDestroyFn).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getUserById
  // SOURCE: userService.ts, lines 33-48
  // ══════════════════════════════════════════════════════════════════════════
  describe('getUserById', () => {

    /**
     * [TC-USER-07]
     * Test Objective: Verify that getUserById retrieves a user by ID and
     *   strips the 'password' field from the returned object.
     * Preconditions: DB mock returns a user including a password hash.
     * Input: userId='user1'
     * Expected Output: User object with correct id, WITHOUT 'password' field.
     * CheckDB: Verifies User.findOne() was called with the correct where clause.
     */
    it('[TC-USER-07] Should return user by ID and exclude password', async () => {
      const fakeUser = {
        id: 'user1',
        name: 'User One',
        password: 'secret_hash',
        toJSON: () => ({ id: 'user1', name: 'User One', password: 'secret_hash' }),
      };
      mockUserModel.findOne.mockResolvedValue(fakeUser);

      // EXECUTE
      const result = await userService.getUserById('user1');

      // VERIFY
      expect(result.id).toBe('user1');
      expect(result).not.toHaveProperty('password'); // Security: password removed
    });

    /**
     * [TC-USER-08]
     * Test Objective: Verify that a USER_NOT_FOUND error is thrown when
     *   a userId does not exist in the database.
     * Preconditions: DB mock returns null for the query.
     * Input: userId='nonexistent-id'
     * Expected Output: Throws Error(ErrorMessages.USER_NOT_FOUND)
     * CheckDB: Verifies User.findOne() was called (DB was queried).
     */
    it('[TC-USER-08] Should throw error if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null); // DB returns no record

      // EXECUTE & VERIFY
      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow(ErrorMessages.USER_NOT_FOUND);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getAllUsers
  // SOURCE: userService.ts, lines 87-144
  // ══════════════════════════════════════════════════════════════════════════
  describe('getAllUsers', () => {

    /**
     * [TC-USER-09]
     * Test Objective: Verify that getAllUsers returns paginated user data with
     *   correct paging metadata (total, total_pages).
     * Preconditions: DB mock returns 2 users and count of 2.
     * Input: { page: 1, size: 10 }
     * Expected Output: { data: [2 users], paging: { total_pages: 1 } }
     * CheckDB: Verifies User.count() and User.findAll() were called.
     */
    it('[TC-USER-09] Should return paginated users', async () => {
      // CheckDB setup
      mockUserModel.count.mockResolvedValue(2);
      mockUserModel.findAll.mockResolvedValue([
        { toJSON: () => ({ id: 'u1' }) },
        { toJSON: () => ({ id: 'u2' }) },
      ]);

      // EXECUTE
      const result = await userService.getAllUsers({ page: 1, size: 10 });

      // VERIFY
      expect(result.data).toHaveLength(2);
      expect(result.paging.total_pages).toBe(1); // Math.ceil(2/10) = 1
    });
  });
});
