import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        department: true,
      },
    });

    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async findAll(page: number = 1, limit: number = 10, keyword?: string, roleCode?: string) {
    const skip = (page - 1) * limit;

    const where: any = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { username: { contains: keyword, mode: 'insensitive' as const } },
            { phone: { contains: keyword } },
          ],
        }
      : {};

    // 如果指定了角色代码，则通过role关联过滤
    if (roleCode) {
      where.role = { code: roleCode };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: any) {
    const { roleCode, departmentName, ...userData } = data;
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // 查找角色
    if (roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: roleCode },
      });
      if (role) {
        userData.roleId = role.id;
      }
    }

    // 查找部门
    if (departmentName) {
      const department = await this.prisma.department.findFirst({
        where: { name: departmentName },
      });
      if (department) {
        userData.departmentId = department.id;
      }
    }

    const user = await this.prisma.user.create({
      data: userData,
      include: {
        role: true,
        department: true,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async update(id: string, data: any) {
    const { roleCode, departmentName, ...userData } = data;
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // 更新角色
    if (roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: roleCode },
      });
      if (role) {
        userData.roleId = role.id;
      }
    }

    // 更新部门
    if (departmentName) {
      const department = await this.prisma.department.findFirst({
        where: { name: departmentName },
      });
      if (department) {
        userData.departmentId = department.id;
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
      include: {
        role: true,
        department: true,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async delete(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
