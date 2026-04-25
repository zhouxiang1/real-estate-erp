import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // 生成合同编号
  private async generateContractNo() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.prisma.transaction.count({
      where: {
        createdAt: {
          gte: new Date(date.getFullYear(), 0, 1),
        },
      },
    });

    return `TX${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }

  async create(data: any) {
    // 检查房源是否可用
    const room = await this.prisma.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room) {
      throw new NotFoundException('房源不存在');
    }

    if (room.status !== 0) {
      throw new BadRequestException('该房源不可售');
    }

    // 生成合同编号
    const contractNo = await this.generateContractNo();

    // 创建成交记录
    const transaction = await this.prisma.transaction.create({
      data: {
        ...data,
        contractNo,
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
      },
    });

    // 更新房源状态为已售，并记录客户和顾问信息
    await this.prisma.room.update({
      where: { id: data.roomId },
      data: {
        status: 1,
        customerId: data.customerId,
        customerName: transaction.customer?.name,
        consultantId: data.salesPersonId,
        consultantName: transaction.salesPerson?.name,
        subscribeDate: new Date(),
      },
    });

    // 更新客户状态为成交
    await this.prisma.customer.update({
      where: { id: data.customerId },
      data: { status: 2 },
    });

    // 创建佣金记录
    await this.createCommissions(transaction);

    return transaction;
  }

  // 创建佣金记录
  private async createCommissions(transaction: any) {
    const commissions = [];

    // 1. 销售佣金（置业顾问）
    if (transaction.salesPersonId) {
      const user = await this.prisma.user.findUnique({
        where: { id: transaction.salesPersonId },
        include: { role: true },
      });

      // 根据角色计算佣金比例
      let salesRate = 0.01; // 默认1%
      if (user?.role?.code === 'sales_consultant') {
        salesRate = 0.02; // 置业顾问2%
      }

      if (salesRate > 0) {
        commissions.push({
          transactionId: transaction.id,
          userId: transaction.salesPersonId,
          amount: transaction.totalPrice * salesRate,
          rate: salesRate,
          type: 'sales',
          status: 0,
        });
      }
    }

    // 2. 渠道佣金
    if (transaction.channelPartnerId) {
      const partner = await this.prisma.channelPartner.findUnique({
        where: { id: transaction.channelPartnerId },
      });

      if (partner && partner.commission > 0) {
        commissions.push({
          transactionId: transaction.id,
          channelPartnerId: transaction.channelPartnerId,
          amount: transaction.totalPrice * partner.commission,
          rate: partner.commission,
          type: 'channel',
          status: 0,
        });
      }
    }

    // 3. 分销佣金
    if (transaction.distributorId) {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: transaction.distributorId },
      });

      // 分销佣金比例 默认3%
      const distributorRate = 0.03;

      commissions.push({
        transactionId: transaction.id,
        distributorId: transaction.distributorId,
        amount: transaction.totalPrice * distributorRate,
        rate: distributorRate,
        type: 'distributor',
        status: 0,
      });

      // 更新推荐客户状态
      await this.prisma.recommendedCustomer.updateMany({
        where: {
          customerId: transaction.customerId,
          distributorId: transaction.distributorId,
        },
        data: { status: 2 },
      });
    }

    if (commissions.length > 0) {
      await this.prisma.commission.createMany({ data: commissions });
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: number;
      startDate?: string;
      endDate?: string;
      keyword?: string;
      salesPersonId?: string;
      channelPartnerId?: string;
      distributorId?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
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
    if (filters?.keyword) {
      where.OR = [
        { contractNo: { contains: filters.keyword } },
        { customer: { name: { contains: filters.keyword, mode: 'insensitive' } } },
      ];
    }
    if (filters?.salesPersonId) {
      where.salesPersonId = filters.salesPersonId;
    }
    if (filters?.channelPartnerId) {
      where.channelPartnerId = filters.channelPartnerId;
    }
    if (filters?.distributorId) {
      where.distributorId = filters.distributorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
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
          salesPerson: {
            select: {
              id: true,
              name: true,
            },
          },
          channelPartner: true,
          distributor: true,
          beneficiaries: true,
        },
        orderBy: { signDate: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
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
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
        commissions: true,
        beneficiaries: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    return transaction;
  }

  async update(id: string, data: any) {
    const transaction = await this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        customer: true,
        room: true,
        salesPerson: true,
      },
    });

    // 如果状态变为已取消，恢复房源状态
    if (data.status === 2) {
      await this.prisma.room.update({
        where: { id: transaction.roomId },
        data: { status: 0 },
      });
    }

    return transaction;
  }

  async delete(id: string) {
    // 检查是否存在
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 恢复房源状态
    await this.prisma.room.update({
      where: { id: transaction.roomId },
      data: { status: 0 },
    });

    // 删除关联的佣金记录
    await this.prisma.commission.deleteMany({
      where: { transactionId: id },
    });

    await this.prisma.transaction.delete({ where: { id } });

    return { message: '删除成功' };
  }

  // ==================== 业务操作 ====================

  // 换房
  async changeRoom(id: string, newRoomId: string) {
    // 获取原成交记录
    const originalTransaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        room: true,
        customer: true,
        salesPerson: {
          select: { id: true, name: true },
        },
      },
    });

    if (!originalTransaction) {
      throw new NotFoundException('原成交记录不存在');
    }

    // 检查新房间是否存在且可用
    const newRoom = await this.prisma.room.findUnique({
      where: { id: newRoomId },
    });

    if (!newRoom) {
      throw new NotFoundException('新房间不存在');
    }

    if (newRoom.status !== 0) {
      throw new BadRequestException('该房间不可售');
    }

    // 生成新合同编号
    const contractNo = await this.generateContractNo();

    // 1. 恢复原房间状态为待售，清除客户/顾问关联
    await this.prisma.room.update({
      where: { id: originalTransaction.roomId },
      data: {
        status: 0,
        customerId: null,
        customerName: null,
        consultantId: null,
        consultantName: null,
        subscribeDate: null,
      },
    });

    // 2. 更新新房间状态为已售，关联客户/顾问
    await this.prisma.room.update({
      where: { id: newRoomId },
      data: {
        status: 1,
        customerId: originalTransaction.customerId,
        customerName: originalTransaction.customer?.name,
        consultantId: originalTransaction.salesPersonId,
        consultantName: originalTransaction.salesPerson?.name,
        subscribeDate: new Date(),
      },
    });

    // 3. 创建换房记录（新成交）
    const newTransaction = await this.prisma.transaction.create({
      data: {
        contractNo,
        customerId: originalTransaction.customerId,
        roomId: newRoomId,
        salesPersonId: originalTransaction.salesPersonId,
        channelPartnerId: originalTransaction.channelPartnerId,
        distributorId: originalTransaction.distributorId,
        originalPrice: originalTransaction.originalPrice,
        discountType: originalTransaction.discountType,
        discountValue: originalTransaction.discountValue,
        totalPrice: originalTransaction.totalPrice,
        paidAmount: originalTransaction.paidAmount,
        signDate: originalTransaction.signDate,
        status: originalTransaction.status,
        type: 'change_room',
        originalTransactionId: id,
        remark: `换房：原房间${originalTransaction.room?.unit}`,
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
      },
    });

    // 4. 更新原成交记录为换房
    await this.prisma.transaction.update({
      where: { id },
      data: {
        type: 'change_room',
        status: 2, // 标记为已取消
      },
    });

    return newTransaction;
  }

  // 改签
  async modify(id: string, data: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 更新成交记录信息
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        type: 'modify',
        operateDate: new Date(),
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
      },
    });

    return updatedTransaction;
  }

  // 退房
  async refund(id: string, refundAmount?: number, reason?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 1. 恢复房间状态为待售
    await this.prisma.room.update({
      where: { id: transaction.roomId },
      data: {
        status: 0,
        customerId: null,
        customerName: null,
        consultantId: null,
        consultantName: null,
        subscribeDate: null,
      },
    });

    // 2. 恢复客户状态为意向
    await this.prisma.customer.update({
      where: { id: transaction.customerId },
      data: { status: 1 },
    });

    // 3. 更新成交记录为退房状态
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: 3, // 退房
        type: 'refund',
        refundAmount: refundAmount || 0,
        reason,
        operateDate: new Date(),
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
      },
    });

    return updatedTransaction;
  }

  // 挞定
  async forfeit(id: string, forfeitAmount?: number, reason?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 1. 恢复房间状态为待售
    await this.prisma.room.update({
      where: { id: transaction.roomId },
      data: {
        status: 0,
        customerId: null,
        customerName: null,
        consultantId: null,
        consultantName: null,
        subscribeDate: null,
      },
    });

    // 2. 恢复客户状态为意向
    await this.prisma.customer.update({
      where: { id: transaction.customerId },
      data: { status: 1 },
    });

    // 3. 更新成交记录为挞定状态
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: 4, // 挞定
        type: 'forfeit',
        forfeitAmount: forfeitAmount || 0,
        reason,
        operateDate: new Date(),
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
      },
    });

    return updatedTransaction;
  }

  // ==================== 更名和权益人 ====================

  // 更名
  async rename(id: string, originalCustomerName: string, renameReason?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        room: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    // 更新成交记录
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        originalCustomerName,
        renameDate: new Date(),
        renameReason,
        type: 'modify',
        operateDate: new Date(),
      },
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
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        channelPartner: true,
        distributor: true,
        beneficiaries: true,
      },
    });

    return updatedTransaction;
  }

  // 添加权益人
  async addBeneficiary(transactionId: string, data: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('成交记录不存在');
    }

    const beneficiary = await this.prisma.beneficiary.create({
      data: {
        transactionId,
        name: data.name,
        idCard: data.idCard,
        phone: data.phone,
        relation: data.relation,
        shareRatio: data.shareRatio,
        isPrimary: data.isPrimary || false,
      },
    });

    return beneficiary;
  }

  // 更新权益人
  async updateBeneficiary(transactionId: string, beneficiaryId: string, data: any) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        id: beneficiaryId,
        transactionId,
      },
    });

    if (!beneficiary) {
      throw new NotFoundException('权益人不存在');
    }

    const updated = await this.prisma.beneficiary.update({
      where: { id: beneficiaryId },
      data: {
        name: data.name,
        idCard: data.idCard,
        phone: data.phone,
        relation: data.relation,
        shareRatio: data.shareRatio,
        isPrimary: data.isPrimary,
      },
    });

    return updated;
  }

  // 删除权益人
  async deleteBeneficiary(transactionId: string, beneficiaryId: string) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        id: beneficiaryId,
        transactionId,
      },
    });

    if (!beneficiary) {
      throw new NotFoundException('权益人不存在');
    }

    await this.prisma.beneficiary.delete({
      where: { id: beneficiaryId },
    });

    return { message: '删除成功' };
  }

  // ==================== 销售统计 ====================

  async getSalesStats(filters?: {
    startDate?: string;
    endDate?: string;
    salesPersonId?: string;
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
    if (filters?.salesPersonId) {
      where.salesPersonId = filters.salesPersonId;
    }

    const [transactions, totalAmount, paidAmount] = await Promise.all([
      this.prisma.transaction.findMany({ where }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { paidAmount: true },
      }),
    ]);

    const roomIds = transactions.map((t) => t.roomId);
    const complexes = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        building: {
          include: {
            complex: true,
          },
        },
      },
    });

    // 按楼盘统计
    const complexStats: Record<string, { count: number; amount: number }> = {};
    for (const room of complexes) {
      const complexName = room.building.complex.name;
      const transaction = transactions.find((t) => t.roomId === room.id);
      if (transaction) {
        if (!complexStats[complexName]) {
          complexStats[complexName] = { count: 0, amount: 0 };
        }
        complexStats[complexName].count++;
        complexStats[complexName].amount += transaction.totalPrice;
      }
    }

    return {
      count: transactions.length,
      totalAmount: totalAmount._sum.totalPrice || 0,
      paidAmount: paidAmount._sum.paidAmount || 0,
      pendingAmount: (totalAmount._sum.totalPrice || 0) - (paidAmount._sum.paidAmount || 0),
      byComplex: Object.entries(complexStats).map(([name, stats]) => ({
        name,
        ...stats,
      })),
    };
  }
}
