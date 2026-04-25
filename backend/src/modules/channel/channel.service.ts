import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  // ==================== 渠道合作伙伴 ====================

  async createPartner(data: any) {
    return this.prisma.channelPartner.create({
      data,
    });
  }

  async findAllPartners(
    page: number = 1,
    limit: number = 10,
    filters?: {
      type?: string;
      status?: number;
      keyword?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword, mode: 'insensitive' } },
        { code: { contains: filters.keyword, mode: 'insensitive' } },
        { phone: { contains: filters.keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.channelPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.channelPartner.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPartnerById(id: string) {
    const partner = await this.prisma.channelPartner.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { signDate: 'desc' },
          take: 10,
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('渠道合作伙伴不存在');
    }

    return partner;
  }

  async updatePartner(id: string, data: any) {
    return this.prisma.channelPartner.update({
      where: { id },
      data,
    });
  }

  async deletePartner(id: string) {
    await this.prisma.channelPartner.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async togglePartnerStatus(id: string) {
    const partner = await this.prisma.channelPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('渠道合作伙伴不存在');
    }

    return this.prisma.channelPartner.update({
      where: { id },
      data: { status: partner.status === 1 ? 0 : 1 },
    });
  }

  // ==================== 渠道统计 ====================

  async getPartnerStats(id: string) {
    const [transactions, commissions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { channelPartnerId: id, status: { not: 2 } },
      }),
      this.prisma.commission.findMany({
        where: { channelPartnerId: id },
      }),
    ]);

    const totalAmount = transactions.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);
    const paidCommission = commissions
      .filter((c) => c.status === 2)
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      transactionCount: transactions.length,
      totalAmount,
      totalCommission,
      paidCommission,
      pendingCommission: totalCommission - paidCommission,
    };
  }

  // ==================== 异常交易监控 ====================

  async getAnomalies(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { status: { not: 2 } };

    if (filters?.startDate) {
      where.signDate = {
        ...where.signDate,
        gte: new Date(filters.startDate),
      };
    }
    if (filters?.endDate) {
      where.signDate = {
        ...where.signDate,
        lte: new Date(filters.endDate),
      };
    }

    // 查询所有交易
    const transactions = await this.prisma.transaction.findMany({
      where,
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
        channelPartner: true,
        distributor: true,
      },
      orderBy: { signDate: 'desc' },
    });

    // 查询所有佣金
    const transactionIds = transactions.map((t) => t.id);
    const allCommissions = await this.prisma.commission.findMany({
      where: { transactionId: { in: transactionIds } },
    });

    // 异常检测规则
    const anomalies: any[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const tx of transactions) {
      // 1. 同一客户短期内多次成交
      const sameCustomerCount = transactions.filter(
        (t) =>
          t.customerId === tx.customerId &&
          t.id !== tx.id &&
          new Date(t.signDate) > thirtyDaysAgo,
      ).length;

      if (sameCustomerCount > 0) {
        anomalies.push({
          type: 'repeated_customer',
          transactionId: tx.id,
          contractNo: tx.contractNo,
          customer: tx.customer,
          room: tx.room,
          message: `客户${tx.customer.name}在30天内有多次成交记录`,
          severity: 'high',
        });
      }

      // 2. 价格异常（低于平均价30%）
      if (tx.room.price > 0) {
        const avgPrice = tx.room.price;
        if (tx.room.price < avgPrice * 0.7) {
          anomalies.push({
            type: 'low_price',
            transactionId: tx.id,
            contractNo: tx.contractNo,
            customer: tx.customer,
            room: tx.room,
            message: `房源单价低于平均价30%以上`,
            severity: 'medium',
            detail: {
              actualPrice: tx.room.price,
              avgPrice,
              discount: ((1 - tx.room.price / avgPrice) * 100).toFixed(2) + '%',
            },
          });
        }
      }

      // 3. 渠道/分销佣金比例异常高
      if (tx.channelPartnerId || tx.distributorId) {
        const commission = allCommissions.find((c) => c.transactionId === tx.id);
        if (commission && commission.rate > 0.1) {
          anomalies.push({
            type: 'high_commission',
            transactionId: tx.id,
            contractNo: tx.contractNo,
            customer: tx.customer,
            room: tx.room,
            channelPartner: tx.channelPartner,
            distributor: tx.distributor,
            message: `佣金比例超过10%`,
            severity: 'high',
            detail: {
              rate: (commission.rate * 100).toFixed(2) + '%',
              amount: commission.amount,
            },
          });
        }
      }
    }

    return anomalies;
  }
}
