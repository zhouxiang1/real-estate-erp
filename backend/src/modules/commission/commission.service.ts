import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: number;
      type?: string;
      userId?: string;
      channelPartnerId?: string;
      distributorId?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.channelPartnerId) {
      where.channelPartnerId = filters.channelPartnerId;
    }
    if (filters?.distributorId) {
      where.distributorId = filters.distributorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take: limit,
        include: {
          transaction: {
            include: {
              customer: true,
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
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          channelPartner: true,
          distributor: true,
          audits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commission.count({ where }),
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
    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            customer: true,
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
        audits: {
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
      },
    });

    if (!commission) {
      throw new NotFoundException('佣金记录不存在');
    }

    return commission;
  }

  async update(id: string, data: any) {
    return this.prisma.commission.update({
      where: { id },
      data,
      include: {
        transaction: true,
        user: true,
        channelPartner: true,
        distributor: true,
      },
    });
  }

  // 审核佣金
  async audit(id: string, userId: string, action: 'approve' | 'reject', comment?: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('佣金记录不存在');
    }

    // 更新佣金状态
    const status = action === 'approve' ? 1 : 3;
    await this.prisma.commission.update({
      where: { id },
      data: { status },
    });

    // 创建审核记录
    await this.prisma.commissionAudit.create({
      data: {
        commissionId: id,
        userId,
        action,
        comment,
      },
    });

    return this.findById(id);
  }

  // 批量审核
  async batchAudit(ids: string[], userId: string, action: 'approve' | 'reject', comment?: string) {
    const status = action === 'approve' ? 1 : 3;

    await this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    // 创建审核记录
    const audits = ids.map((id) => ({
      commissionId: id,
      userId,
      action,
      comment,
    }));

    await this.prisma.commissionAudit.createMany({ data: audits });

    return { message: `批量审核成功，共处理${ids.length}条记录` };
  }

  // 发放佣金
  async pay(id: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('佣金记录不存在');
    }

    if (commission.status !== 1) {
      throw new Error('只有待发放状态的佣金才能发放');
    }

    return this.prisma.commission.update({
      where: { id },
      data: { status: 2 },
    });
  }

  // ==================== 佣金统计 ====================

  async getCommissionStats(filters?: {
    type?: string;
    userId?: string;
    channelPartnerId?: string;
    distributorId?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.channelPartnerId) {
      where.channelPartnerId = filters.channelPartnerId;
    }
    if (filters?.distributorId) {
      where.distributorId = filters.distributorId;
    }

    const [total, pending, approved, paid, rejected] = await Promise.all([
      this.prisma.commission.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: 0 },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: 1 },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: 2 },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: 3 },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: {
        amount: total._sum.amount || 0,
        count: total._count,
      },
      pending: {
        amount: pending._sum.amount || 0,
        count: pending._count,
      },
      approved: {
        amount: approved._sum.amount || 0,
        count: approved._count,
      },
      paid: {
        amount: paid._sum.amount || 0,
        count: paid._count,
      },
      rejected: {
        amount: rejected._sum.amount || 0,
        count: rejected._count,
      },
    };
  }
}
