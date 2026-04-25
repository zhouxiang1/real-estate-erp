import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  // ==================== 客户管理 ====================

  async create(data: any, user?: any) {
    // 查重检查 - 检查所有客户的电话号码
    if (data.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: data.phone },
      });
      if (existing) {
        throw new Error('该手机号已存在，不能重复添加');
      }
    }

    // 创建客户 - 包含所有字段
    const customer = await this.prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        wechat: data.wechat,
        idCard: data.idCard,
        address: data.address,
        source: data.source,
        level: data.level,
        status: data.status || 0,
        remark: data.remark,
        isPublic: false,
        // 扩展字段
        ageGroup: data.ageGroup,
        livingArea: data.livingArea,
        workArea: data.workArea,
        industry: data.industry,
        maritalStatus: data.maritalStatus,
        occupation: data.occupation,
        loanType: data.loanType,
      },
    });

    // 如果有用户信息或顾问ID，创建归属关系
    const consultantUserId = data.consultantId || (user && user.id);
    if (consultantUserId) {
      await this.prisma.customerBelong.create({
        data: {
          customerId: customer.id,
          userId: consultantUserId,
          type: 'sales',
        },
      });
    }

    return customer;
  }

  // 查重检查
  async checkDuplicate(phone?: string, name?: string) {
    const where: any = {};
    if (phone) {
      where.OR = [
        { phone },
        ...(name ? [{ name }] : []),
      ];
    } else if (name) {
      where.name = name;
    }

    if (!phone && !name) {
      return { exists: false, customer: null };
    }

    const customer = await this.prisma.customer.findFirst({
      where,
    });

    return {
      exists: !!customer,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        status: customer.status,
      } : null,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: number;
      level?: string;
      source?: string;
      keyword?: string;
      userId?: string;
      distributorId?: string;
      isPublic?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
    // 当指定状态筛选时，同时按等级匹配（潜在=C类，意向=B类，成交=A类）
    if (filters?.status !== undefined) {
      where.status = filters.status;
      // 只有明确指定level时才用level过滤，否则自动按状态匹配对应等级
      if (filters?.level) {
        where.level = filters.level;
      } else {
        const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
        where.level = levelMap[filters.status];
      }
    } else if (filters?.level) {
      // 没有指定状态但指定了等级
      where.level = filters.level;
    }
    if (filters?.source) {
      where.source = filters.source;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { phone: { contains: filters.keyword } },
        { wechat: { contains: filters.keyword } },
        { idCard: { contains: filters.keyword } },
      ];
    }
    if (filters?.userId) {
      where.customerBelongs = {
        some: { userId: filters.userId, type: 'sales' },
      };
    }
    if (filters?.distributorId) {
      where.customerBelongs = {
        some: { distributorId: filters.distributorId, type: 'distributor' },
      };
    }
    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          contracts: true,
          followups: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          customerBelongs: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            room: {
              include: {
                building: {
                  include: {
                    complex: true,
                  },
                },
              },
            },
          },
        },
        followups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        customerBelongs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            distributor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return customer;
  }

  async update(id: string, data: any) {
    // 禁止修改手机号，保护客户数据完整性
    delete data.phone;
    return this.prisma.customer.update({
      where: { id },
      data,
      include: {
        contracts: true,
        followups: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.customer.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // ==================== 客户跟进 ====================

  async createFollowup(data: any) {
    const followup = await this.prisma.customerFollowup.create({
      data,
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 更新客户的最后跟进时间
    await this.prisma.customer.update({
      where: { id: data.customerId },
      data: { lastFollowupAt: new Date() },
    });

    return followup;
  }

  async findFollowups(customerId: string) {
    return this.prisma.customerFollowup.findMany({
      where: { customerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteFollowup(id: string) {
    await this.prisma.customerFollowup.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // ==================== 客户归属 ====================

  async assignToUser(customerId: string, userId: string) {
    // 先删除旧的归属
    await this.prisma.customerBelong.deleteMany({
      where: { customerId, type: 'sales' },
    });

    // 创建新的归属
    return this.prisma.customerBelong.create({
      data: {
        customerId,
        userId,
        type: 'sales',
      },
    });
  }

  async assignToDistributor(customerId: string, distributorId: string) {
    // 先删除旧的归属
    await this.prisma.customerBelong.deleteMany({
      where: { customerId, type: 'distributor' },
    });

    // 创建新的归属
    return this.prisma.customerBelong.create({
      data: {
        customerId,
        distributorId,
        type: 'distributor',
      },
    });
  }

  // ==================== 客户统计 ====================

  async getCustomerStats(userId?: string) {
    const where = userId
      ? { customerBelongs: { some: { userId, type: 'sales' } }, isPublic: false }
      : { isPublic: false };

    // 按状态和等级同时筛选（潜在=C类，意向=B类，成交=A类）
    const [total, potential, intention, deal, publicPool] = await Promise.all([
      this.prisma.customer.count({ where: { ...where, isPublic: false } }),
      this.prisma.customer.count({ where: { ...where, status: 0, level: 'C类' } }),
      this.prisma.customer.count({ where: { ...where, status: 1, level: 'B类' } }),
      this.prisma.customer.count({ where: { ...where, status: 2, level: 'A类' } }),
      this.prisma.customer.count({ where: { isPublic: true } }),
    ]);

    return { total, potential, intention, deal, publicPool };
  }

  // ==================== 公共池管理 ====================

  // 将客户移入公共池
  async moveToPublicPool(customerId: string) {
    // 删除客户的归属关系
    await this.prisma.customerBelong.deleteMany({
      where: { customerId },
    });

    // 更新客户为公共池
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isPublic: true },
    });
  }

  // 从公共池认领客户
  async claimFromPublicPool(customerId: string, userId: string) {
    // 检查客户是否在公共池
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || !customer.isPublic) {
      throw new Error('该客户不在公共池中');
    }

    // 创建归属关系
    await this.prisma.customerBelong.create({
      data: {
        customerId,
        userId,
        type: 'sales',
      },
    });

    // 更新客户为非公共池
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isPublic: false },
    });
  }

  // 获取公共池客户列表
  async getPublicPoolCustomers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { isPublic: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where: { isPublic: true } }),
    ]);

    return { data, total, page, limit };
  }

  // 检查超过15天未跟进的客户并移入公共池
  async checkAndMoveToPublicPool() {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // 找出超过15天未跟进且不在公共池的客户
    const overdueCustomers = await this.prisma.customer.findMany({
      where: {
        isPublic: false,
        OR: [
          { lastFollowupAt: { lt: fifteenDaysAgo } },
          { lastFollowupAt: null, createdAt: { lt: fifteenDaysAgo } },
        ],
      },
    });

    // 批量移入公共池
    for (const customer of overdueCustomers) {
      await this.prisma.customerBelong.deleteMany({
        where: { customerId: customer.id },
      });
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { isPublic: true },
      });
    }

    return { count: overdueCustomers.length };
  }
}
