import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DistributorService {
  constructor(private prisma: PrismaService) {}

  // ==================== 经纪人注册/登录 ====================

  async register(data: any) {
    // 检查用户名和手机号是否已存在
    const existing = await this.prisma.distributor.findFirst({
      where: {
        OR: [{ username: data.username }, { phone: data.phone }],
      },
    });

    if (existing) {
      throw new BadRequestException('用户名或手机号已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.distributor.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.distributor.findUnique({
      where: { username },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  // ==================== 经纪人管理 ====================

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: number;
      isVerified?: boolean;
      keyword?: string;
      parentId?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
    if (filters?.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword, mode: 'insensitive' } },
        { phone: { contains: filters.keyword } },
        { username: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }
    if (filters?.parentId) {
      where.parentId = filters.parentId;
    }

    const [data, total] = await Promise.all([
      this.prisma.distributor.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.distributor.count({ where }),
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
    const distributor = await this.prisma.distributor.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        recommendedCustomers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            customer: true,
          },
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!distributor) {
      throw new NotFoundException('分销经纪人不存在');
    }

    return distributor;
  }

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.distributor.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.distributor.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async toggleStatus(id: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id },
    });

    if (!distributor) {
      throw new NotFoundException('分销经纪人不存在');
    }

    return this.prisma.distributor.update({
      where: { id },
      data: { status: distributor.status === 1 ? 0 : 1 },
    });
  }

  // 实名认证
  async verify(id: string, data: { realName: string; idCard: string; bankName: string; bankAccount: string }) {
    return this.prisma.distributor.update({
      where: { id },
      data: {
        realName: data.realName,
        idCard: data.idCard,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        isVerified: true,
      },
    });
  }

  // ==================== 推荐客户 ====================

  async recommendCustomer(distributorId: string, customerData: any) {
    // 先创建客户
    const customer = await this.prisma.customer.create({
      data: customerData,
    });

    // 创建推荐关系
    return this.prisma.recommendedCustomer.create({
      data: {
        distributorId,
        customerId: customer.id,
        status: 0, // 待确认
      },
      include: {
        customer: true,
        distributor: true,
      },
    });
  }

  async findRecommendedCustomers(distributorId: string) {
    return this.prisma.recommendedCustomer.findMany({
      where: { distributorId },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== 提现管理 ====================

  async createWithdrawal(distributorId: string, data: any) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('分销经纪人不存在');
    }

    if (!distributor.isVerified) {
      throw new BadRequestException('请先完成实名认证');
    }

    // 计算可提现金额
    const stats = await this.getDistributorStats(distributorId);
    if (data.amount > stats.availableCommission) {
      throw new BadRequestException('提现金额超过可提现额度');
    }

    // 手续费 1%
    const fee = data.amount * 0.01;
    const actualAmount = data.amount - fee;

    return this.prisma.withdrawal.create({
      data: {
        distributorId,
        amount: data.amount,
        fee,
        actualAmount,
        bankName: data.bankName || distributor.bankName,
        bankAccount: data.bankAccount || distributor.bankAccount,
        status: 0, // 待审核
      },
    });
  }

  async findWithdrawals(
    distributorId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { distributorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawal.count({ where: { distributorId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 审核提现
  async auditWithdrawal(id: string, userId: string, action: 'approve' | 'reject', remark?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('提现记录不存在');
    }

    const status = action === 'approve' ? 1 : 3;

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status,
        auditBy: userId,
        auditTime: new Date(),
        remark,
      },
    });
  }

  // 打款
  async paidWithdrawal(id: string) {
    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: 2, // 已打款
        paidTime: new Date(),
      },
    });
  }

  // ==================== 经纪人统计 ====================

  async getDistributorStats(distributorId: string) {
    const [
      totalCommissionAgg,
      paidCommissionAgg,
      pendingCommissionAgg,
      pendingWithdrawalAgg,
      recommendedCount,
      dealCount,
      teamCount,
    ] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { distributorId },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { distributorId, status: 2 },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { distributorId, status: { in: [0, 1] } },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { distributorId, status: 0 },
        _sum: { amount: true },
      }),
      this.prisma.recommendedCustomer.count({ where: { distributorId } }),
      this.prisma.recommendedCustomer.count({
        where: { distributorId, status: 2 },
      }),
      this.prisma.distributor.count({
        where: { parentId: distributorId },
      }),
    ]);

    const totalCommission = totalCommissionAgg._sum.amount || 0;
    const paidCommission = paidCommissionAgg._sum.amount || 0;
    const pendingCommission = pendingCommissionAgg._sum.amount || 0;
    const pendingWithdrawal = pendingWithdrawalAgg._sum.amount || 0;

    return {
      totalCommission,
      paidCommission,
      pendingCommission,
      availableCommission: pendingCommission - pendingWithdrawal,
      pendingWithdrawal,
      recommendedCount,
      dealCount,
      teamCount,
    };
  }

  // 我的团队
  async getMyTeam(distributorId: string) {
    return this.prisma.distributor.findMany({
      where: { parentId: distributorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
