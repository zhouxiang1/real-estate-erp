import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const departments = await this.prisma.department.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return {
      data: departments,
      total: departments.length,
    };
  }

  // 获取树形结构
  async findTree() {
    const departments = await this.prisma.department.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    // 构建树形结构
    const tree = this.buildTree(departments);
    return tree;
  }

  private buildTree(departments: any[], parentId?: string): any[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        ...dept,
        children: this.buildTree(departments, dept.id),
      }));
  }

  async findById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    return department;
  }

  async create(data: { name: string; parentId?: string; sort?: number }) {
    // 如果有parentId，检查父部门是否存在
    if (data.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父部门不存在');
      }
    }

    const department = await this.prisma.department.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        sort: data.sort || 0,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return department;
  }

  async update(id: string, data: { name?: string; parentId?: string | null; sort?: number }) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 如果更新parentId，检查是否形成循环
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new ConflictException('不能将自己设为父部门');
      }

      if (data.parentId) {
        // 检查父部门是否存在
        const parent = await this.prisma.department.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new NotFoundException('父部门不存在');
        }

        // 检查是否会形成循环（父部门不能是自己的子部门）
        const isDescendant = await this.checkIsDescendant(id, data.parentId);
        if (isDescendant) {
          throw new ConflictException('不能将子部门设为父部门');
        }
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.sort !== undefined) updateData.sort = data.sort;

    return this.prisma.department.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // 检查targetId是否是nodeId的子部门
  private async checkIsDescendant(nodeId: string, targetId: string): Promise<boolean> {
    const children = await this.prisma.department.findMany({
      where: { parentId: nodeId },
      select: { id: true },
    });

    for (const child of children) {
      if (child.id === targetId) {
        return true;
      }
      const isDescendant = await this.checkIsDescendant(child.id, targetId);
      if (isDescendant) {
        return true;
      }
    }

    return false;
  }

  async delete(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
        users: true,
      },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查是否有子部门
    if (department.children.length > 0) {
      throw new ConflictException('该部门下有子部门，无法删除');
    }

    // 检查是否有用户
    if (department.users.length > 0) {
      throw new ConflictException('该部门下有用户，无法删除');
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // 获取所有部门（用于下拉选择）
  async getAllForSelect() {
    const departments = await this.prisma.department.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
      },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    return departments;
  }
}
