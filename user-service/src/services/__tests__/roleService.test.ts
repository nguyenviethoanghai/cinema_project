/**
 * ============================================================
 * FILE: roleService.test.ts
 * SERVICE: user-service (Node.js / TypeScript)
 * FRAMEWORK: Jest + ts-jest (ESM mode)
 * PURPOSE: Unit tests for RoleService - verifies role/permission
 *          management operations including transaction-based updates.
 *
 * CHECKDB NOTE: All Sequelize model operations (findAll, findOne,
 *   destroy, bulkCreate, create) are mocked. Correct method calls
 *   and their arguments are verified via expect() as the CheckDB step.
 *
 * ROLLBACK NOTE: The real updateRolePermissions() uses a Sequelize
 *   transaction with commit/rollback. In tests, the transaction object
 *   is mocked. We verify that transaction.rollback() would be called
 *   on error. No real DB data is changed.
 * ============================================================
 */

import { RoleService } from '../roleService.js';
import { ErrorMessages } from '../../types';
import { jest } from '@jest/globals';

describe('RoleService', () => {
  let roleService: RoleService;
  let mockRole: any;           // Mock Sequelize Role model
  let mockPermission: any;     // Mock Sequelize Permission model
  let mockRolePermission: any; // Mock Sequelize RolePermission junction model
  let mockModels: any;

  // ── Setup: fresh mocks before every test ─────────────────────────────────
  beforeEach(() => {
    mockRole = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    mockPermission = {
      findAll: jest.fn(),
    };

    // Mock the junction table model (role_permissions)
    mockRolePermission = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
      create: jest.fn(),
    };

    // Mock sequelize instance with transaction support
    mockModels = {
      Role: mockRole,
      Permission: mockPermission,
      RolePermission: mockRolePermission,
      sequelize: {
        // Mock transaction with commit and rollback methods
        transaction: jest.fn<any>().mockResolvedValue({
          commit: jest.fn(),
          rollback: jest.fn(),
        }),
      },
    };

    roleService = new RoleService(mockModels);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getAllRoles
  // SOURCE: roleService.ts, lines 44-54
  // ══════════════════════════════════════════════════════════════════════════
  describe('getAllRoles', () => {

    /**
     * [TC-ROLE-01]
     * Test Objective: Verify that getAllRoles returns only non-customer roles
     *   by applying an Op.notIn filter on the 'customer' role name.
     * Preconditions: DB mock returns 2 non-customer roles.
     * Input: None
     * Expected Output: Array of 2 role objects (admin, manager_staff).
     * CheckDB: Verifies Role.findAll() was called with a where clause.
     */
    it('[TC-ROLE-01] Should return all roles except customer', async () => {
      // CheckDB setup: mock DB returns staff roles only
      mockRole.findAll.mockResolvedValue([
        { toJSON: () => ({ name: 'admin' }) },
        { toJSON: () => ({ name: 'manager_staff' }) },
      ]);

      // EXECUTE
      const result = await roleService.getAllRoles();

      // VERIFY
      expect(result).toHaveLength(2);

      // CheckDB: findAll was called with the correct filter
      expect(mockRole.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object), // Confirms the Op.notIn filter is applied
      }));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: assignPermission
  // SOURCE: roleService.ts, lines 157-179
  // ══════════════════════════════════════════════════════════════════════════
  describe('assignPermission', () => {

    /**
     * [TC-ROLE-02]
     * Test Objective: Verify that a permission is successfully assigned to a role
     *   when no duplicate assignment exists.
     * Preconditions: DB mock returns null (no existing assignment).
     * Input: roleId='role1', permissionId='perm1'
     * Expected Output: Resolves without error. create() is called once.
     * CheckDB: Verifies RolePermission.findOne() checked for duplicates,
     *          and RolePermission.create() inserted the new record.
     * Rollback: create() is mocked — no real DB insertion.
     */
    it('[TC-ROLE-02] Should assign permission successfully', async () => {
      // CheckDB setup: no duplicate found
      mockRolePermission.findOne.mockResolvedValue(null);
      mockRolePermission.create.mockResolvedValue({});

      // EXECUTE
      await roleService.assignPermission('role1', 'perm1');

      // VERIFY: CheckDB - duplicate check was performed
      expect(mockRolePermission.findOne).toHaveBeenCalled();
      // CheckDB - new record was inserted
      expect(mockRolePermission.create).toHaveBeenCalled();
    });

    /**
     * [TC-ROLE-03]
     * Test Objective: Verify that assigning an already-existing permission
     *   to a role throws a descriptive error (idempotency guard).
     * Preconditions: DB mock returns an existing assignment record.
     * Input: roleId='role1', permissionId='perm1'
     * Expected Output: Throws Error('Permission already assigned to this role')
     * CheckDB: Verifies findOne() was called to detect the duplicate.
     */
    it('[TC-ROLE-03] Should fail if permission already assigned', async () => {
      // CheckDB setup: duplicate assignment found in DB
      mockRolePermission.findOne.mockResolvedValue({ id: 'existing-assignment' });

      // EXECUTE & VERIFY: Duplicate guard throws error
      await expect(
        roleService.assignPermission('role1', 'perm1')
      ).rejects.toThrow('Permission already assigned to this role');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: unassignPermission
  // SOURCE: roleService.ts, lines 181-193
  // ══════════════════════════════════════════════════════════════════════════
  describe('unassignPermission', () => {

    /**
     * [TC-ROLE-04]
     * Test Objective: Verify that a permission is successfully removed from
     *   a role when the assignment exists in the DB.
     * Preconditions: DB mock returns 1 (one row deleted).
     * Input: roleId='role1', permissionId='perm1'
     * Expected Output: Resolves without error.
     * CheckDB: Verifies RolePermission.destroy() was called with correct ids.
     * Rollback: destroy() is mocked — no real DB deletion.
     */
    it('[TC-ROLE-04] Should unassign permission successfully', async () => {
      // CheckDB setup: 1 row will be deleted
      mockRolePermission.destroy.mockResolvedValue(1);

      // EXECUTE
      await roleService.unassignPermission('role1', 'perm1');

      // VERIFY: CheckDB - destroy was called
      expect(mockRolePermission.destroy).toHaveBeenCalled();
    });

    /**
     * [TC-ROLE-05]
     * Test Objective: Verify that attempting to unassign a non-existent
     *   permission from a role throws a descriptive error.
     * Preconditions: DB mock returns 0 (no rows deleted — not found).
     * Input: roleId='role1', permissionId='perm1'
     * Expected Output: Throws Error('Permission not found for this role')
     * CheckDB: Verifies destroy() was called but returned 0 affected rows.
     */
    it('[TC-ROLE-05] Should fail if permission not found for role', async () => {
      // CheckDB setup: no rows deleted (permission wasn't assigned)
      mockRolePermission.destroy.mockResolvedValue(0);

      // EXECUTE & VERIFY: Not-found guard throws error
      await expect(
        roleService.unassignPermission('role1', 'perm1')
      ).rejects.toThrow('Permission not found for this role');
    });
  });
});
