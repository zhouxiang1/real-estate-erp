import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class ManagerReportService {
  constructor(private prisma: PrismaService) {}

  // 获取时间范围内的统计数据
  private async getStatsInRange(startDate: Date, endDate: Date) {
    const where = {
      signDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    const customerCreatedAt = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [transactionStats, newCustomers, customersWithDeal, subscribeCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ...where,
          status: { not: 2 }, // 排除已取消
        },
        _count: { _all: true },
        _sum: { totalPrice: true, paidAmount: true },
      }),
      this.prisma.customer.findMany({
        where: customerCreatedAt,
        select: { id: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          signDate: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: [3, 4] }, // 认购和成交
        },
        select: {
          customerId: true,
        },
      }),
      this.prisma.transaction.count({
        where: {
          status: 3, // 认购
          signDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    // 区分新客和老客（新客户是首次到访的，老客户是有过成交记录的）
    // 新客户ID列表（时间段内创建的客户的ID）
    const newCustomerIds = new Set(newCustomers.map(c => c.id));

    // 区分新客成交和老客成交
    const newCustomerDealCount = customersWithDeal.filter(c => newCustomerIds.has(c.customerId)).length;
    const oldCustomerDealCount = customersWithDeal.length - newCustomerDealCount;

    return {
      transactionCount: transactionStats._count._all,
      subscribeCount,
      totalAmount: transactionStats._sum.totalPrice || 0,
      paidAmount: transactionStats._sum.paidAmount || 0,
      customerCount: newCustomers.length,
      newCustomerCount: newCustomers.length,
      oldCustomerCount: 0, // 老客户数通过排除法计算
      newCustomerDealCount,
      oldCustomerDealCount,
    };
  }

  // 获取经营分析数据
  async getBusinessAnalysis() {
    const now = dayjs();

    // 今日
    const todayStart = now.startOf('day').toDate();
    const todayEnd = now.endOf('day').toDate();
    const weekStart = now.startOf('week').toDate();
    const weekEnd = now.endOf('day').toDate();

    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('day').toDate();

    const quarterStart = (now as any).startOf('quarter').toDate();
    const quarterEnd = now.endOf('day').toDate();

    const yearStart = now.startOf('year').toDate();
    const yearEnd = now.endOf('day').toDate();

    const allStart = new Date('2020-01-01');
    const allEnd = now.endOf('day').toDate();
    const [today, week, month, quarter, year, allTime] = await Promise.all([
      this.getStatsInRange(todayStart, todayEnd),
      this.getStatsInRange(weekStart, weekEnd),
      this.getStatsInRange(monthStart, monthEnd),
      this.getStatsInRange(quarterStart, quarterEnd),
      this.getStatsInRange(yearStart, yearEnd),
      this.getStatsInRange(allStart, allEnd),
    ]);

    return {
      today,
      week,
      month,
      quarter,
      year,
      allTime,
    };
  }

  // 获取认购排名
  async getSubscribeRanking(limit: number = 10) {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('day').toDate();

    // 获取本月认购数据
    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: { in: [3, 4] }, // 认购和已签
        signDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 按顾问分组
    const consultantMap: Record<string, any> = {};
    transactions.forEach((tx) => {
      const id = tx.salesPersonId;
      const name = tx.salesPerson?.name || '未知';
      if (!consultantMap[id]) {
        consultantMap[id] = {
          consultantId: id,
          consultantName: name,
          subscribeCount: 0,  // 认购套数
          dealCount: 0,       // 成交套数
          dealAmount: 0,     // 成交金额
        };
      }
      if (tx.status === 3) {
        consultantMap[id].subscribeCount += 1;
      } else if (tx.status === 4) {
        consultantMap[id].dealCount += 1;
        consultantMap[id].dealAmount += tx.totalPrice;
      }
    });

    // 排序
    const ranking = Object.values(consultantMap)
      .sort((a: any, b: any) => b.subscribeCount - a.subscribeCount)
      .slice(0, limit);

    return ranking;
  }

  // 获取团队业绩
  async getTeamPerformance() {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('day').toDate();

    // 获取本月所有置业顾问的成交数据
    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: { in: [3, 4] },
        signDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 按顾问分组统计
    const consultantStats: Record<string, any> = {};
    let totalAmount = 0;
    let totalCount = 0;

    transactions.forEach((tx) => {
      const id = tx.salesPersonId;
      if (!consultantStats[id]) {
        consultantStats[id] = {
          consultantId: id,
          consultantName: tx.salesPerson?.name || '未知',
          targetAmount: 1000000, // 假设目标100万
          currentAmount: 0,
          currentCount: 0,
        };
      }
      consultantStats[id].currentAmount += tx.totalPrice;
      consultantStats[id].currentCount += 1;
      totalAmount += tx.totalPrice;
      totalCount += 1;
    });

    const teamList = Object.values(consultantStats);

    return {
      totalAmount,
      totalCount,
      teamList,
    };
  }

  // 获取过程分析（漏斗）
  async getProcessAnalysis() {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('day').toDate();

    // 来访数（新增客户数）
    const visitCount = await this.prisma.customer.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // 认筹数
    const subscribeCount = await this.prisma.transaction.count({
      where: {
        status: 3, // 认购
        signDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // 成交数
    const dealCount = await this.prisma.transaction.count({
      where: {
        status: 4, // 已签
        signDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // 计算转化率
    const visitToSubscribeRate = visitCount > 0 ? Math.round((subscribeCount / visitCount) * 100) : 0;
    const subscribeToDealRate = subscribeCount > 0 ? Math.round((dealCount / subscribeCount) * 100) : 0;

    // 获取各渠道来源
    const customerSources = await this.prisma.customer.groupBy({
      by: ['source'],
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: true,
    });

    return {
      visitCount,
      subscribeCount,
      dealCount,
      visitToSubscribeRate,
      subscribeToDealRate,
      sourceStats: customerSources.map((s) => ({
        source: s.source || '未知',
        count: s._count,
      })),
    };
  }

  // 获取楼栋排名
  async getBuildingRanking(limit: number = 10) {
    const buildings = await this.prisma.building.findMany({
      include: {
        complex: {
          select: {
            name: true,
          },
        },
        rooms: {
          include: {
            transactions: {
              where: {
                status: { in: [3, 4] },
              },
            },
          },
        },
      },
    });

    // 计算每个楼栋的销售情况
    const ranking = buildings.map((b) => {
      const totalRooms = b.rooms.length;
      const soldRooms = b.rooms.filter((r) => r.transactions.length > 0).length;
      const totalAmount = b.rooms.reduce((sum, r) => {
        return sum + r.transactions.reduce((s, tx) => s + tx.totalPrice, 0);
      }, 0);

      return {
        buildingId: b.id,
        buildingName: b.name,
        complexName: b.complex.name,
        totalRooms,
        soldRooms,
        availableRooms: totalRooms - soldRooms,
        soldRate: totalRooms > 0 ? Math.round((soldRooms / totalRooms) * 100) : 0,
        totalAmount,
      };
    });

    // 按成交额排序
    ranking.sort((a, b) => b.totalAmount - a.totalAmount);

    return ranking.slice(0, limit);
  }

  // 获取认购走势
  async getSubscribeTrend(days: number = 30) {
    const now = dayjs();
    const startDate = now.subtract(days - 1, 'day').startOf('day').toDate();
    const endDate = now.endOf('day').toDate();

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: { in: [3, 4] },
        signDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 按日期分组
    const trendMap: Record<string, { subscribe: number; deal: number }> = {};

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = now.subtract(days - 1 - i, 'day').format('YYYY-MM-DD');
      trendMap[date] = { subscribe: 0, deal: 0 };
    }

    // 填充数据
    transactions.forEach((tx) => {
      const date = dayjs(tx.signDate).format('YYYY-MM-DD');
      if (trendMap[date]) {
        if (tx.status === 3) {
          trendMap[date].subscribe += 1;
        } else if (tx.status === 4) {
          trendMap[date].deal += 1;
        }
      }
    });

    return Object.entries(trendMap).map(([date, stats]) => ({
      date,
      ...stats,
    }));
  }
}
