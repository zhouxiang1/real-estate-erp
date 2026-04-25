import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private paymentTypeLabel(type?: string) {
    const map: Record<string, string> = {
      deposit: '定金',
      down_payment: '首付',
      mortgage: '按揭',
      final_payment: '尾款',
      other: '其他',
    };
    return map[type || ''] || type || '-';
  }

  private paymentMethodLabel(method?: string) {
    const map: Record<string, string> = {
      bank_transfer: '银行转账',
      cash: '现金',
      check: '支票',
      wechat: '微信',
      alipay: '支付宝',
    };
    return map[method || ''] || method || '-';
  }

  private commissionTypeLabel(type?: string) {
    const map: Record<string, string> = {
      sales: '销售佣金',
      channel: '渠道佣金',
      distributor: '分销佣金',
    };
    return map[type || ''] || type || '-';
  }

  private commissionStatusLabel(status: number) {
    const map: Record<number, string> = {
      0: '待审核',
      1: '待发放',
      2: '已发放',
      3: '已拒绝',
    };
    return map[status] || '未知';
  }

  private withdrawalStatusLabel(status: number) {
    const map: Record<number, string> = {
      0: '待审核',
      1: '审核通过',
      2: '已打款',
      3: '已拒绝',
    };
    return map[status] || '未知';
  }

  private getCommissionPayee(commission: any) {
    return (
      commission.user?.name ||
      commission.channelPartner?.name ||
      commission.distributor?.realName ||
      commission.distributor?.name ||
      '-'
    );
  }

  private getTransactionInfo(transaction: any) {
    if (!transaction) {
      return {
        contractNo: '-',
        customerName: '-',
        roomLabel: '-',
        complexName: '-',
      };
    }

    const room = transaction.room;
    const building = room?.building;
    const complex = building?.complex;

    return {
      contractNo: transaction.contractNo || '-',
      customerName: transaction.customer?.name || '-',
      roomLabel: [complex?.name, building?.name, room?.unit].filter(Boolean).join(' / ') || '-',
      complexName: complex?.name || '-',
    };
  }

  private getAgingInfo(signDate: Date, unpaidAmount: number) {
    const dueDate = new Date(signDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const today = new Date();
    const diffMs = today.getTime() - dueDate.getTime();
    const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (unpaidAmount <= 0) {
      return { dueDate, overdueDays: 0, daysToDue: 0, agingBucket: 'paid', agingLabel: '已收清' };
    }

    if (daysToDue > 7) {
      return { dueDate, overdueDays: 0, daysToDue, agingBucket: 'not_due', agingLabel: '未到期' };
    }

    if (daysToDue >= 0) {
      return { dueDate, overdueDays: 0, daysToDue, agingBucket: 'due_soon', agingLabel: '7天内到期' };
    }

    if (overdueDays <= 30) {
      return { dueDate, overdueDays, daysToDue, agingBucket: 'overdue_1_30', agingLabel: '逾期1-30天' };
    }

    if (overdueDays <= 60) {
      return { dueDate, overdueDays, daysToDue, agingBucket: 'overdue_31_60', agingLabel: '逾期31-60天' };
    }

    return { dueDate, overdueDays, daysToDue, agingBucket: 'overdue_60', agingLabel: '逾期60天以上' };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;

    const range: any = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    return range;
  }

  private paginate<T>(data: T[], page: number, limit: number) {
    const total = data.length;
    const start = (page - 1) * limit;

    return {
      data: data.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 付款记录 ====================

  // 获取成交的所有付款记录
  async getPaymentRecordsByTransaction(transactionId: string) {
    return this.prisma.paymentRecord.findMany({
      where: { transactionId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // 添加付款记录
  async createPaymentRecord(data: {
    transactionId: string;
    type: string;
    amount: number;
    paymentDate: Date;
    paymentMethod?: string;
    bankAccount?: string;
    bankName?: string;
    remark?: string;
    operator?: string;
  }) {
    // 更新成交的已付金额
    const transaction = await this.prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        paidAmount: { increment: data.amount },
      },
    });

    // 创建付款记录
    const paymentRecord = await this.prisma.paymentRecord.create({
      data: {
        transactionId: data.transactionId,
        type: data.type,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        remark: data.remark,
        operator: data.operator,
      },
    });

    // 检查是否已付清
    if (transaction.paidAmount >= transaction.totalPrice) {
      await this.prisma.transaction.update({
        where: { id: data.transactionId },
        data: { status: 1 }, // 已付清
      });
    }

    return paymentRecord;
  }

  // 更新付款记录状态
  async updatePaymentStatus(id: string, status: number) {
    const record = await this.prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('付款记录不存在');
    }

    if (![0, 1, 2].includes(status)) {
      throw new BadRequestException('付款状态不正确');
    }

    const delta =
      record.status !== 1 && status === 1
        ? record.amount
        : record.status === 1 && status !== 1
          ? -record.amount
          : 0;

    const updated = await this.prisma.paymentRecord.update({
      where: { id },
      data: { status },
    });

    if (delta !== 0) {
      const transaction = await this.prisma.transaction.update({
        where: { id: record.transactionId },
        data: { paidAmount: { increment: delta } },
      });

      await this.prisma.transaction.update({
        where: { id: record.transactionId },
        data: {
          status: transaction.paidAmount >= transaction.totalPrice ? 1 : 0,
        },
      });
    }

    return updated;
  }

  // 删除付款记录（仅限待确认状态）
  async deletePaymentRecord(id: string) {
    const record = await this.prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('付款记录不存在');
    }

    if (record.status !== 0) {
      throw new BadRequestException('只能删除待确认状态的付款记录');
    }

    // 减少成交的已付金额
    await this.prisma.transaction.update({
      where: { id: record.transactionId },
      data: {
        paidAmount: { decrement: record.amount },
        status: 0, // 重新变为待付款
      },
    });

    return this.prisma.paymentRecord.delete({
      where: { id },
    });
  }

  // ==================== 价格变更记录 ====================

  // 获取成交的价格变更记录
  async getPriceChangeRecords(transactionId: string) {
    return this.prisma.priceChangeRecord.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 创建价格变更记录
  async createPriceChangeRecord(data: {
    transactionId: string;
    changeType: string;
    oldPrice: number;
    oldTotalPrice: number;
    newPrice: number;
    newTotalPrice: number;
    diffAmount: number;
    reason?: string;
    operator?: string;
  }) {
    // 更新成交的totalPrice
    await this.prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        totalPrice: data.newTotalPrice,
      },
    });

    // 创建价格变更记录
    return this.prisma.priceChangeRecord.create({
      data: {
        transactionId: data.transactionId,
        changeType: data.changeType,
        oldPrice: data.oldPrice,
        oldTotalPrice: data.oldTotalPrice,
        newPrice: data.newPrice,
        newTotalPrice: data.newTotalPrice,
        diffAmount: data.diffAmount,
        reason: data.reason,
        operator: data.operator,
      },
    });
  }

  // ==================== 财务统计 ====================

  // 获取成交的完整财务信息
  async getTransactionFinanceSummary(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
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
        customer: true,
        salesPerson: {
          select: {
            name: true,
          },
        },
        paymentRecords: {
          orderBy: { paymentDate: 'desc' },
        },
        priceChangeRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 计算各类型付款总额
    const paymentSummary = {
      deposit: 0,
      downPayment: 0,
      mortgage: 0,
      finalPayment: 0,
      other: 0,
      total: 0,
    };

    transaction.paymentRecords.forEach((record) => {
      const amount = record.status === 1 ? record.amount : 0; // 只计算已确认的
      paymentSummary.total += amount;
      switch (record.type) {
        case 'deposit':
          paymentSummary.deposit += amount;
          break;
        case 'down_payment':
          paymentSummary.downPayment += amount;
          break;
        case 'mortgage':
          paymentSummary.mortgage += amount;
          break;
        case 'final_payment':
          paymentSummary.finalPayment += amount;
          break;
        default:
          paymentSummary.other += amount;
      }
    });

    // 计算待付金额
    const unpaidAmount = transaction.totalPrice - paymentSummary.total;

    return {
      transaction,
      paymentSummary,
      unpaidAmount,
      room: transaction.room,
      customer: transaction.customer,
      salesPerson: transaction.salesPerson,
    };
  }

  // ==================== 财务报表 ====================

  // 获取财务列表
  async getFinanceList(params: {
    page?: number;
    limit?: number;
    complexId?: string;
    status?: number;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const { page = 1, limit = 10, complexId, status, startDate, endDate, keyword } = params;

    const where: any = {};

    if (complexId) {
      where.room = {
        building: {
          complexId,
        },
      };
    }

    if (status !== undefined) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.signDate = {};
      if (startDate) where.signDate.gte = new Date(startDate);
      if (endDate) where.signDate.lte = new Date(endDate);
    }

    if (keyword) {
      where.OR = [
        { contractNo: { contains: keyword } },
        { customer: { name: { contains: keyword } } },
        { room: { unit: { contains: keyword } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          room: {
            include: {
              building: {
                include: {
                  complex: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          salesPerson: {
            select: {
              name: true,
            },
          },
          paymentRecords: {
            where: { status: 1 }, // 只包含已确认的
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // 计算每个成交的财务摘要
    const data = transactions.map((tx) => {
      const paidAmount = tx.paymentRecords.reduce((sum, p) => sum + p.amount, 0);
      const unpaidAmount = tx.totalPrice - paidAmount;

      return {
        id: tx.id,
        contractNo: tx.contractNo,
        signDate: tx.signDate,
        status: tx.status,
        complexName: tx.room.building.complex.name,
        buildingName: tx.room.building.name,
        unit: tx.room.unit,
        roomType: tx.room.roomType,
        area: tx.room.area,
        totalPrice: tx.totalPrice,
        paidAmount,
        unpaidAmount,
        customerName: tx.customer.name,
        customerPhone: tx.customer.phone,
        salesPersonName: tx.salesPerson.name,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 财务统计
  async getFinanceStats(params: {
    complexId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { complexId, startDate, endDate } = params;

    const where: any = {};

    if (complexId) {
      where.room = {
        building: {
          complexId,
        },
      };
    }

    if (startDate || endDate) {
      where.signDate = {};
      if (startDate) where.signDate.gte = new Date(startDate);
      if (endDate) where.signDate.lte = new Date(endDate);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        paymentRecords: {
          where: { status: 1 },
        },
      },
    });

    const paymentDateFilter = this.buildDateFilter(startDate, endDate);
    const paymentWhere: any = { status: 1 };
    if (paymentDateFilter) paymentWhere.paymentDate = paymentDateFilter;
    if (complexId) {
      paymentWhere.transaction = {
        room: {
          building: {
            complexId,
          },
        },
      };
    }

    const commissionWhere: any = {};
    if (complexId) {
      commissionWhere.transaction = {
        room: {
          building: {
            complexId,
          },
        },
      };
    }

    const paidCommissionDateFilter = this.buildDateFilter(startDate, endDate);
    const [
      confirmedPayments,
      pendingCommissions,
      paidCommissions,
      pendingWithdrawals,
      paidWithdrawals,
    ] = await Promise.all([
      this.prisma.paymentRecord.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { ...commissionWhere, status: 1 },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: {
          ...commissionWhere,
          status: 2,
          ...(paidCommissionDateFilter ? { updatedAt: paidCommissionDateFilter } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
      complexId
        ? Promise.resolve({ _sum: { actualAmount: 0 }, _count: 0 } as any)
        : this.prisma.withdrawal.aggregate({
            where: { status: 1 },
            _sum: { actualAmount: true },
            _count: true,
          }),
      complexId
        ? Promise.resolve({ _sum: { actualAmount: 0 }, _count: 0 } as any)
        : this.prisma.withdrawal.aggregate({
            where: {
              status: 2,
              ...(paidCommissionDateFilter ? { paidTime: paidCommissionDateFilter } : {}),
            },
            _sum: { actualAmount: true },
            _count: true,
          }),
    ]);

    const stats = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalPaid: 0,
      totalUnpaid: 0,
      depositCount: 0,
      downPaymentCount: 0,
      mortgageCount: 0,
      paidOffCount: 0,
      cancelledCount: 0,
      collectionRate: 0,
      cashIn: confirmedPayments._sum.amount || 0,
      cashOut: (paidCommissions._sum.amount || 0) + (paidWithdrawals._sum.actualAmount || 0),
      netCashFlow: 0,
      pendingCommissionAmount: pendingCommissions._sum.amount || 0,
      pendingCommissionCount: pendingCommissions._count || 0,
      paidCommissionAmount: paidCommissions._sum.amount || 0,
      paidCommissionCount: paidCommissions._count || 0,
      pendingWithdrawalAmount: pendingWithdrawals._sum.actualAmount || 0,
      pendingWithdrawalCount: pendingWithdrawals._count || 0,
      paidWithdrawalAmount: paidWithdrawals._sum.actualAmount || 0,
      paidWithdrawalCount: paidWithdrawals._count || 0,
    };

    transactions.forEach((tx) => {
      stats.totalAmount += tx.totalPrice;
      const paidAmount = tx.paymentRecords.reduce((sum, p) => sum + p.amount, 0);
      stats.totalPaid += paidAmount;
      stats.totalUnpaid += tx.totalPrice - paidAmount;

      if (tx.status === 1) stats.paidOffCount++;
      if (tx.status === 2) stats.cancelledCount++;
    });

    stats.collectionRate = stats.totalAmount > 0 ? Number(((stats.totalPaid / stats.totalAmount) * 100).toFixed(2)) : 0;
    stats.netCashFlow = stats.cashIn - stats.cashOut;

    return stats;
  }

  // ==================== 资金流水 ====================

  async getCashFlow(params: {
    page?: number;
    limit?: number;
    direction?: 'in' | 'out';
    category?: string;
    complexId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      direction,
      category,
      complexId,
      startDate,
      endDate,
      keyword,
    } = params;

    const dateFilter = this.buildDateFilter(startDate, endDate);
    const keywordText = keyword?.trim();
    const entries: any[] = [];

    if (!direction || direction === 'in') {
      const paymentWhere: any = { status: 1 };
      if (dateFilter) paymentWhere.paymentDate = dateFilter;
      if (complexId) {
        paymentWhere.transaction = {};
        if (complexId) {
          paymentWhere.transaction.room = {
            building: {
              complexId,
            },
          };
        }
      }
      if (keywordText) {
        paymentWhere.OR = [
          { operator: { contains: keywordText } },
          { bankName: { contains: keywordText } },
          { bankAccount: { contains: keywordText } },
          { remark: { contains: keywordText } },
          { transaction: { contractNo: { contains: keywordText } } },
          { transaction: { customer: { name: { contains: keywordText } } } },
          { transaction: { customer: { phone: { contains: keywordText } } } },
          { transaction: { room: { unit: { contains: keywordText } } } },
        ];
      }

      const payments = await this.prisma.paymentRecord.findMany({
        where: paymentWhere,
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
        },
      });

      payments.forEach((record) => {
        const txInfo = this.getTransactionInfo(record.transaction);
        entries.push({
          id: `payment-${record.id}`,
          sourceId: record.id,
          sourceType: 'payment',
          direction: 'in',
          category: '客户收款',
          typeLabel: this.paymentTypeLabel(record.type),
          methodLabel: this.paymentMethodLabel(record.paymentMethod),
          amount: record.amount,
          occurredAt: record.paymentDate,
          payeeName: txInfo.customerName,
          operator: record.operator || '-',
          bankName: record.bankName,
          bankAccount: record.bankAccount,
          remark: record.remark,
          ...txInfo,
        });
      });
    }

    if (!direction || direction === 'out') {
      const commissionWhere: any = { status: 2 };
      if (dateFilter) commissionWhere.updatedAt = dateFilter;
      if (complexId) {
        commissionWhere.transaction = {};
        if (complexId) {
          commissionWhere.transaction.room = {
            building: {
              complexId,
            },
          };
        }
      }
      if (keywordText) {
        commissionWhere.OR = [
          { user: { name: { contains: keywordText } } },
          { channelPartner: { name: { contains: keywordText } } },
          { distributor: { name: { contains: keywordText } } },
          { distributor: { realName: { contains: keywordText } } },
          { transaction: { contractNo: { contains: keywordText } } },
          { transaction: { customer: { name: { contains: keywordText } } } },
          { transaction: { customer: { phone: { contains: keywordText } } } },
          { transaction: { room: { unit: { contains: keywordText } } } },
        ];
      }

      const commissions = await this.prisma.commission.findMany({
        where: commissionWhere,
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
          user: { select: { id: true, name: true } },
          channelPartner: true,
          distributor: true,
        },
      });

      commissions.forEach((commission) => {
        const txInfo = this.getTransactionInfo(commission.transaction);
        entries.push({
          id: `commission-${commission.id}`,
          sourceId: commission.id,
          sourceType: 'commission',
          direction: 'out',
          category: '佣金发放',
          typeLabel: this.commissionTypeLabel(commission.type),
          methodLabel: '佣金结算',
          amount: commission.amount,
          occurredAt: commission.updatedAt,
          payeeName: this.getCommissionPayee(commission),
          operator: '财务',
          remark: commission.remark,
          ...txInfo,
        });
      });

      if (!complexId) {
        const withdrawalWhere: any = { status: 2 };
        if (dateFilter) withdrawalWhere.paidTime = dateFilter;
        if (keywordText) {
          withdrawalWhere.OR = [
            { bankName: { contains: keywordText } },
            { bankAccount: { contains: keywordText } },
            { distributor: { name: { contains: keywordText } } },
            { distributor: { phone: { contains: keywordText } } },
            { distributor: { realName: { contains: keywordText } } },
          ];
        }

        const withdrawals = await this.prisma.withdrawal.findMany({
          where: withdrawalWhere,
          include: {
            distributor: true,
          },
        });

        withdrawals.forEach((withdrawal) => {
          entries.push({
            id: `withdrawal-${withdrawal.id}`,
            sourceId: withdrawal.id,
            sourceType: 'withdrawal',
            direction: 'out',
            category: '提现打款',
            typeLabel: '分销提现',
            methodLabel: '银行打款',
            amount: withdrawal.actualAmount,
            occurredAt: withdrawal.paidTime || withdrawal.updatedAt,
            payeeName: withdrawal.distributor?.realName || withdrawal.distributor?.name || '-',
            operator: withdrawal.auditBy || '财务',
            bankName: withdrawal.bankName,
            bankAccount: withdrawal.bankAccount,
            remark: withdrawal.remark,
            contractNo: '-',
            customerName: '-',
            roomLabel: '-',
            complexName: '-',
          });
        });
      }
    }

    const filteredEntries = category
      ? entries.filter((entry) => entry.category === category || entry.sourceType === category)
      : entries;

    filteredEntries.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    return this.paginate(filteredEntries, page, limit);
  }

  // ==================== 付款权限 ====================

  async getPayables(params: {
    page?: number;
    limit?: number;
    status?: number;
    sourceType?: 'commission' | 'withdrawal';
    complexId?: string;
    keyword?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      sourceType,
      complexId,
      keyword,
    } = params;
    const keywordText = keyword?.trim();
    const payables: any[] = [];

    if (!sourceType || sourceType === 'commission') {
      const commissionWhere: any = {};
      if (status !== undefined) commissionWhere.status = status;
      if (complexId) {
        commissionWhere.transaction = {};
        if (complexId) {
          commissionWhere.transaction.room = {
            building: {
              complexId,
            },
          };
        }
      }
      if (keywordText) {
        commissionWhere.OR = [
          { user: { name: { contains: keywordText } } },
          { channelPartner: { name: { contains: keywordText } } },
          { distributor: { name: { contains: keywordText } } },
          { distributor: { realName: { contains: keywordText } } },
          { transaction: { contractNo: { contains: keywordText } } },
          { transaction: { customer: { name: { contains: keywordText } } } },
          { transaction: { customer: { phone: { contains: keywordText } } } },
          { transaction: { room: { unit: { contains: keywordText } } } },
        ];
      }

      const commissions = await this.prisma.commission.findMany({
        where: commissionWhere,
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
          user: { select: { id: true, name: true } },
          channelPartner: true,
          distributor: true,
          audits: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      commissions.forEach((commission) => {
        const txInfo = this.getTransactionInfo(commission.transaction);
        payables.push({
          id: `commission-${commission.id}`,
          sourceId: commission.id,
          sourceType: 'commission',
          sourceTypeLabel: '佣金',
          typeLabel: this.commissionTypeLabel(commission.type),
          payeeName: this.getCommissionPayee(commission),
          amount: commission.amount,
          status: commission.status,
          statusLabel: this.commissionStatusLabel(commission.status),
          canPay: commission.status === 1,
          createdAt: commission.createdAt,
          updatedAt: commission.updatedAt,
          approvedBy: commission.audits?.[0]?.user?.name,
          approvedAt: commission.audits?.[0]?.createdAt,
          remark: commission.remark,
          ...txInfo,
        });
      });
    }

    if ((!sourceType || sourceType === 'withdrawal') && !complexId) {
      const withdrawalWhere: any = {};
      if (status !== undefined) withdrawalWhere.status = status;
      if (keywordText) {
        withdrawalWhere.OR = [
          { bankName: { contains: keywordText } },
          { bankAccount: { contains: keywordText } },
          { distributor: { name: { contains: keywordText } } },
          { distributor: { phone: { contains: keywordText } } },
          { distributor: { realName: { contains: keywordText } } },
        ];
      }

      const withdrawals = await this.prisma.withdrawal.findMany({
        where: withdrawalWhere,
        include: {
          distributor: true,
        },
      });

      withdrawals.forEach((withdrawal) => {
        payables.push({
          id: `withdrawal-${withdrawal.id}`,
          sourceId: withdrawal.id,
          sourceType: 'withdrawal',
          sourceTypeLabel: '提现',
          typeLabel: '分销提现',
          payeeName: withdrawal.distributor?.realName || withdrawal.distributor?.name || '-',
          amount: withdrawal.actualAmount,
          grossAmount: withdrawal.amount,
          fee: withdrawal.fee,
          status: withdrawal.status,
          statusLabel: this.withdrawalStatusLabel(withdrawal.status),
          canPay: withdrawal.status === 1,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
          approvedBy: withdrawal.auditBy,
          approvedAt: withdrawal.auditTime,
          bankName: withdrawal.bankName,
          bankAccount: withdrawal.bankAccount,
          remark: withdrawal.remark,
          contractNo: '-',
          customerName: '-',
          roomLabel: '-',
          complexName: '-',
        });
      });
    }

    payables.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
    );

    return this.paginate(payables, page, limit);
  }

  async payCommission(id: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('佣金记录不存在');
    }

    if (commission.status !== 1) {
      throw new BadRequestException('只有审核通过、待发放的佣金才能付款');
    }

    return this.prisma.commission.update({
      where: { id },
      data: { status: 2 },
    });
  }

  async payWithdrawal(id: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('提现记录不存在');
    }

    if (withdrawal.status !== 1) {
      throw new BadRequestException('只有审核通过的提现才能打款');
    }

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: 2,
        paidTime: new Date(),
      },
    });
  }

  // ==================== 应收与对账 ====================

  async getReceivables(params: {
    page?: number;
    limit?: number;
    complexId?: string;
    agingBucket?: string;
    status?: number;
    keyword?: string;
  }) {
    const { page = 1, limit = 10, complexId, agingBucket, status, keyword } = params;
    const where: any = {};
    const keywordText = keyword?.trim();

    if (complexId) {
      where.room = {
        building: {
          complexId,
        },
      };
    }

    if (status !== undefined) {
      where.status = status;
    } else {
      where.status = { in: [0, 1] };
    }

    if (keywordText) {
      where.OR = [
        { contractNo: { contains: keywordText } },
        { customer: { name: { contains: keywordText } } },
        { customer: { phone: { contains: keywordText } } },
        { room: { unit: { contains: keywordText } } },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        salesPerson: { select: { id: true, name: true } },
        paymentRecords: { where: { status: 1 } },
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
      orderBy: { signDate: 'desc' },
    });

    const data = transactions
      .map((tx) => {
        const paidAmount = tx.paymentRecords.reduce((sum, item) => sum + item.amount, 0);
        const unpaidAmount = Math.max(0, tx.totalPrice - paidAmount);
        const aging = this.getAgingInfo(tx.signDate, unpaidAmount);
        const txInfo = this.getTransactionInfo(tx);

        return {
          id: tx.id,
          transactionId: tx.id,
          contractNo: tx.contractNo,
          signDate: tx.signDate,
          status: tx.status,
          totalPrice: tx.totalPrice,
          paidAmount,
          unpaidAmount,
          paidRatio: tx.totalPrice > 0 ? Number(((paidAmount / tx.totalPrice) * 100).toFixed(2)) : 0,
          customerName: tx.customer.name,
          customerPhone: tx.customer.phone,
          salesPersonName: tx.salesPerson?.name || '-',
          ...txInfo,
          ...aging,
        };
      })
      .filter((item) => (agingBucket ? item.agingBucket === agingBucket : true))
      .sort((a, b) => {
        if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
        return b.unpaidAmount - a.unpaidAmount;
      });

    return this.paginate(data, page, limit);
  }

  async getPaymentQueue(params: {
    page?: number;
    limit?: number;
    status?: number;
    type?: string;
    complexId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const { page = 1, limit = 10, status, type, complexId, startDate, endDate, keyword } = params;
    const keywordText = keyword?.trim();
    const where: any = {};

    if (status !== undefined) where.status = status;
    if (type) where.type = type;

    const dateFilter = this.buildDateFilter(startDate, endDate);
    if (dateFilter) where.paymentDate = dateFilter;

    if (complexId) {
      where.transaction = {
        room: {
          building: {
            complexId,
          },
        },
      };
    }

    if (keywordText) {
      where.OR = [
        { operator: { contains: keywordText } },
        { bankName: { contains: keywordText } },
        { bankAccount: { contains: keywordText } },
        { remark: { contains: keywordText } },
        { transaction: { contractNo: { contains: keywordText } } },
        { transaction: { customer: { name: { contains: keywordText } } } },
        { transaction: { customer: { phone: { contains: keywordText } } } },
        { transaction: { room: { unit: { contains: keywordText } } } },
      ];
    }

    const [records, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip: (page - 1) * limit,
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
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    const data = records.map((record) => {
      const txInfo = this.getTransactionInfo(record.transaction);
      return {
        id: record.id,
        transactionId: record.transactionId,
        contractNo: txInfo.contractNo,
        customerName: txInfo.customerName,
        roomLabel: txInfo.roomLabel,
        complexName: txInfo.complexName,
        type: record.type,
        typeLabel: this.paymentTypeLabel(record.type),
        amount: record.amount,
        paymentDate: record.paymentDate,
        paymentMethod: record.paymentMethod,
        methodLabel: this.paymentMethodLabel(record.paymentMethod),
        bankName: record.bankName,
        bankAccount: record.bankAccount,
        status: record.status,
        statusLabel: record.status === 1 ? '已确认' : record.status === 2 ? '已退款' : '待确认',
        operator: record.operator,
        remark: record.remark,
        createdAt: record.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async batchUpdatePaymentStatus(ids: string[], status: number) {
    if (!ids?.length) {
      throw new BadRequestException('请选择付款记录');
    }

    for (const id of ids) {
      await this.updatePaymentStatus(id, status);
    }

    return { message: '批量更新成功', count: ids.length };
  }

  async batchPayPayables(items: Array<{ sourceType: 'commission' | 'withdrawal'; id: string }>) {
    if (!items?.length) {
      throw new BadRequestException('请选择付款项');
    }

    let count = 0;
    for (const item of items) {
      if (item.sourceType === 'commission') {
        await this.payCommission(item.id);
      } else if (item.sourceType === 'withdrawal') {
        await this.payWithdrawal(item.id);
      } else {
        throw new BadRequestException('付款类型不正确');
      }
      count++;
    }

    return { message: '批量付款确认成功', count };
  }

  async getReconciliation(params: {
    complexId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { complexId, startDate, endDate } = params;
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const paymentWhere: any = { status: 1 };
    if (dateFilter) paymentWhere.paymentDate = dateFilter;
    if (complexId) {
      paymentWhere.transaction = {
        room: {
          building: {
            complexId,
          },
        },
      };
    }

    const commissionWhere: any = {};
    if (complexId) {
      commissionWhere.transaction = {
        room: {
          building: {
            complexId,
          },
        },
      };
    }

    const [payments, commissions, withdrawals, receivables] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where: paymentWhere,
        orderBy: { paymentDate: 'asc' },
      }),
      this.prisma.commission.findMany({
        where: {
          ...commissionWhere,
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
      }),
      complexId
        ? Promise.resolve([])
        : this.prisma.withdrawal.findMany({
            where: dateFilter ? { updatedAt: dateFilter } : {},
          }),
      this.getReceivables({ page: 1, limit: 100000, complexId }),
    ]);

    const byPaymentType: Record<string, any> = {};
    const byPaymentMethod: Record<string, any> = {};
    const byMonth: Record<string, any> = {};

    payments.forEach((payment) => {
      const typeLabel = this.paymentTypeLabel(payment.type);
      const methodLabel = this.paymentMethodLabel(payment.paymentMethod);
      const month = payment.paymentDate.toISOString().slice(0, 7);

      byPaymentType[typeLabel] = byPaymentType[typeLabel] || { name: typeLabel, amount: 0, count: 0 };
      byPaymentType[typeLabel].amount += payment.amount;
      byPaymentType[typeLabel].count += 1;

      byPaymentMethod[methodLabel] = byPaymentMethod[methodLabel] || { name: methodLabel, amount: 0, count: 0 };
      byPaymentMethod[methodLabel].amount += payment.amount;
      byPaymentMethod[methodLabel].count += 1;

      byMonth[month] = byMonth[month] || { month, income: 0, expense: 0, net: 0 };
      byMonth[month].income += payment.amount;
      byMonth[month].net += payment.amount;
    });

    commissions
      .filter((commission) => commission.status === 2)
      .forEach((commission) => {
        const month = commission.updatedAt.toISOString().slice(0, 7);
        byMonth[month] = byMonth[month] || { month, income: 0, expense: 0, net: 0 };
        byMonth[month].expense += commission.amount;
        byMonth[month].net -= commission.amount;
      });

    withdrawals
      .filter((withdrawal) => withdrawal.status === 2)
      .forEach((withdrawal) => {
        const occurredAt = withdrawal.paidTime || withdrawal.updatedAt;
        const month = occurredAt.toISOString().slice(0, 7);
        byMonth[month] = byMonth[month] || { month, income: 0, expense: 0, net: 0 };
        byMonth[month].expense += withdrawal.actualAmount;
        byMonth[month].net -= withdrawal.actualAmount;
      });

    const agingBuckets = [
      { key: 'not_due', name: '未到期', amount: 0, count: 0 },
      { key: 'due_soon', name: '7天内到期', amount: 0, count: 0 },
      { key: 'overdue_1_30', name: '逾期1-30天', amount: 0, count: 0 },
      { key: 'overdue_31_60', name: '逾期31-60天', amount: 0, count: 0 },
      { key: 'overdue_60', name: '逾期60天以上', amount: 0, count: 0 },
    ];
    const agingMap = Object.fromEntries(agingBuckets.map((item) => [item.key, item]));

    receivables.data.forEach((item: any) => {
      if (item.unpaidAmount <= 0 || item.agingBucket === 'paid') return;
      const bucket = agingMap[item.agingBucket];
      if (!bucket) return;
      bucket.amount += item.unpaidAmount;
      bucket.count += 1;
    });

    const payableSummary = {
      commissionPendingAudit: commissions.filter((item) => item.status === 0).reduce((sum, item) => sum + item.amount, 0),
      commissionPendingPay: commissions.filter((item) => item.status === 1).reduce((sum, item) => sum + item.amount, 0),
      commissionPaid: commissions.filter((item) => item.status === 2).reduce((sum, item) => sum + item.amount, 0),
      withdrawalPendingAudit: withdrawals.filter((item) => item.status === 0).reduce((sum, item) => sum + item.actualAmount, 0),
      withdrawalPendingPay: withdrawals.filter((item) => item.status === 1).reduce((sum, item) => sum + item.actualAmount, 0),
      withdrawalPaid: withdrawals.filter((item) => item.status === 2).reduce((sum, item) => sum + item.actualAmount, 0),
    };

    return {
      paymentTypeSummary: Object.values(byPaymentType),
      paymentMethodSummary: Object.values(byPaymentMethod),
      monthlyCashFlow: Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month)),
      receivableAgingSummary: agingBuckets,
      payableSummary,
    };
  }
}
