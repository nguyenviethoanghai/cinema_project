import { RoleService } from '../roleService.js';
import { ErrorMessages } from '../../types';
import { jest } from '@jest/globals';

describe('RoleService', () => {
  let roleService: RoleService;
  let mockRole: any;
  let mockPermission: any;
  let mockRolePermission: any;
  let mockModels: any;

  beforeEach(() => {
    mockRole = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      toJSON: jest.fn(),
    };
    mockPermission = {
      findAll: jest.fn(),
    };
    mockRolePermission = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
      create: jest.fn(),
    };

    mockModels = {
      Role: mockRole,
      Permission: mockPermission,
      RolePermission: mockRolePermission,
      sequelize: {
        transaction: jest.fn<any>().mockResolvedValue({
          commit: jest.fn(),
          rollback: jest.fn(),
        }),
      },
    };

    roleService = new RoleService(mockModels);
  });

  describe('getAllRoles', () => {
    it('[TC-ROLE-01] Should return all roles except customer', async () => {
      mockRole.findAll.mockResolvedValue([
        { toJSON: () => ({ name: 'admin' }) },
        { toJSON: () => ({ name: 'manager_staff' }) }
      ]);
      const result = await roleService.getAllRoles();
      expect(result).toHaveLength(2);
      expect(mockRole.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object)
      }));
    });
  });

  describe('assignPermission', () => {
    it('[TC-ROLE-02] Should assign permission successfully', async () => {
      mockRolePermission.findOne.mockResolvedValue(null);
      mockRolePermission.create.mockResolvedValue({});
      
      await roleService.assignPermission('role1', 'perm1');
      expect(mockRolePermission.create).toHaveBeenCalled();
    });

    it('[TC-ROLE-03] Should fail if permission already assigned', async () => {
      mockRolePermission.findOne.mockResolvedValue({ id: 'existing' });
      await expect(roleService.assignPermission('role1', 'perm1')).rejects.toThrow('Permission already assigned to this role');
    });
  });

  describe('unassignPermission', () => {
    it('[TC-ROLE-04] Should unassign permission successfully', async () => {
      mockRolePermission.destroy.mockResolvedValue(1);
      await roleService.unassignPermission('role1', 'perm1');
      expect(mockRolePermission.destroy).toHaveBeenCalled();
    });

    it('[TC-ROLE-05] Should fail if permission not found for role', async () => {
      mockRolePermission.destroy.mockResolvedValue(0);
      await expect(roleService.unassignPermission('role1', 'perm1')).rejects.toThrow('Permission not found for this role');
    });
  });
});
