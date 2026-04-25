import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll(keyword?: string) {
    const where: any = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { code: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles,
      total,
    };
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async findByCode(code: string) {
    return this.prisma.role.findUnique({
      where: { code },
    });
  }

  async create(data: { name: string; code: string; description?: string; permissions?: string[] }) {
    // 检查code是否重复
    const existing = await this.prisma.role.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('角色代码已存在');
    }

    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        permissions: JSON.stringify(data.permissions || []),
      },
    });

    return role;
  }

  async update(id: string, data: { name?: string; code?: string; description?: string; permissions?: string[] }) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 如果更新code，检查是否重复
    if (data.code && data.code !== role.code) {
      const existing = await this.prisma.role.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw new ConflictException('角色代码已存在');
      }
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissions !== undefined) updateData.permissions = JSON.stringify(data.permissions);

    return this.prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 检查是否有用户使用此角色
    if (role.users.length > 0) {
      throw new ConflictException('该角色下有用户，无法删除');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // 获取所有权限列表
  async getAllPermissions() {
    return [
      // 用户管理
      { key: 'user:view', name: '查看用户', group: '用户管理' },
      { key: 'user:create', name: '创建用户', group: '用户管理' },
      { key: 'user:update', name: '编辑用户', group: '用户管理' },
      { key: 'user:delete', name: '删除用户', group: '用户管理' },

      // 角色管理
      { key: 'role:view', name: '查看角色', group: '角色管理' },
      { key: 'role:create', name: '创建角色', group: '角色管理' },
      { key: 'role:update', name: '编辑角色', group: '角色管理' },
      { key: 'role:delete', name: '删除角色', group: '角色管理' },

      // 部门管理
      { key: 'department:view', name: '查看部门', group: '部门管理' },
      { key: 'department:create', name: '创建部门', group: '部门管理' },
      { key: 'department:update', name: '编辑部门', group: '部门管理' },
      { key: 'department:delete', name: '删除部门', group: '部门管理' },

      // 项目管理
      { key: 'project:view', name: '查看项目', group: '项目管理' },
      { key: 'project:create', name: '创建项目', group: '项目管理' },
      { key: 'project:update', name: '编辑项目', group: '项目管理' },
      { key: 'project:delete', name: '删除项目', group: '项目管理' },

      // 楼盘管理
      { key: 'building:view', name: '查看楼盘', group: '楼盘管理' },
      { key: 'building:create', name: '创建楼盘', group: '楼盘管理' },
      { key: 'building:update', name: '编辑楼盘', group: '楼盘管理' },
      { key: 'building:delete', name: '删除楼盘', group: '楼盘管理' },

      // 房源管理
      { key: 'room:view', name: '查看房源', group: '房源管理' },
      { key: 'room:create', name: '创建房源', group: '房源管理' },
      { key: 'room:update', name: '编辑房源', group: '房源管理' },
      { key: 'room:delete', name: '删除房源', group: '房源管理' },
      { key: 'room:import', name: '导入房源', group: '房源管理' },
      { key: 'room:export', name: '导出房源', group: '房源管理' },

      // 客户管理
      { key: 'customer:view', name: '查看客户', group: '客户管理' },
      { key: 'customer:create', name: '创建客户', group: '客户管理' },
      { key: 'customer:update', name: '编辑客户', group: '客户管理' },
      { key: 'customer:delete', name: '删除客户', group: '客户管理' },
      { key: 'customer:assign', name: '分配客户', group: '客户管理' },

      // 成交管理
      { key: 'transaction:view', name: '查看成交', group: '成交管理' },
      { key: 'transaction:create', name: '创建成交', group: '成交管理' },
      { key: 'transaction:update', name: '编辑成交', group: '成交管理' },
      { key: 'transaction:delete', name: '删除成交', group: '成交管理' },
      { key: 'transaction:refund', name: '退房操作', group: '成交管理' },
      { key: 'transaction:forfeit', name: '挞定操作', group: '成交管理' },

      // 供应商管理
      { key: 'supplier:view', name: '查看供应商', group: '供应商管理' },
      { key: 'supplier:create', name: '创建供应商', group: '供应商管理' },
      { key: 'supplier:update', name: '编辑供应商', group: '供应商管理' },
      { key: 'supplier:delete', name: '删除供应商', group: '供应商管理' },

      // 采购管理
      { key: 'purchase:view', name: '查看采购', group: '采购管理' },
      { key: 'purchase:create', name: '创建采购', group: '采购管理' },
      { key: 'purchase:update', name: '编辑采购', group: '采购管理' },
      { key: 'purchase:delete', name: '删除采购', group: '采购管理' },
      { key: 'purchase:approve', name: '审批采购', group: '采购管理' },

      // 财务管理
      { key: 'finance:view', name: '查看财务', group: '财务管理' },
      { key: 'finance:income', name: '收款管理', group: '财务管理' },
      { key: 'finance:expense', name: '付款管理', group: '财务管理' },
      { key: 'finance:report', name: '财务报表', group: '财务管理' },

      // 渠道管理
      { key: 'channel:view', name: '查看渠道', group: '渠道管理' },
      { key: 'channel:create', name: '创建渠道', group: '渠道管理' },
      { key: 'channel:update', name: '编辑渠道', group: '渠道管理' },
      { key: 'channel:delete', name: '删除渠道', group: '渠道管理' },

      // 佣金管理
      { key: 'commission:view', name: '查看佣金', group: '佣金管理' },
      { key: 'commission:audit', name: '审核佣金', group: '佣金管理' },
      { key: 'commission:pay', name: '发放佣金', group: '佣金管理' },

      // 分销管理
      { key: 'distributor:view', name: '查看分销', group: '分销管理' },
      { key: 'distributor:create', name: '创建分销', group: '分销管理' },
      { key: 'distributor:update', name: '编辑分销', group: '分销管理' },
      { key: 'distributor:delete', name: '删除分销', group: '分销管理' },
      { key: 'distributor:withdraw', name: '提现管理', group: '分销管理' },

      // 系统设置
      { key: 'system:settings', name: '系统设置', group: '系统设置' },
      { key: 'system:logs', name: '操作日志', group: '系统设置' },
    ];
  }
}
