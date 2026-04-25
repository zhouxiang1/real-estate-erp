import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  // 楼盘销售报表
  async getSalesReport(params: {
    complexId?: string;
    status?: number[];
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const { complexId, status, startDate, endDate, keyword } = params;

    // 构建rooms查询条件
    const roomWhere: any = {};

    if (complexId) {
      roomWhere.building = {
        complexId: complexId,
      };
    }

    if (status && status.length > 0) {
      roomWhere.status = { in: status };
    }

    // 如果有关键词搜索
    if (keyword) {
      roomWhere.OR = [
        { unit: { contains: keyword } },
        { roomType: { contains: keyword } },
        { customerName: { contains: keyword } },
      ];
    }

    // 获取房源数据
    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      include: {
        building: {
          include: {
            complex: {
              select: {
                id: true,
                name: true,
                address: true,
                developer: true,
              },
            },
          },
        },
        transactions: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                source: true,
              },
            },
            salesPerson: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { signDate: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { building: { complex: { name: 'asc' } } },
        { building: { name: 'asc' } },
        { floor: 'asc' },
        { unit: 'asc' },
      ],
    });

    // 转换数据格式
    const reportData = rooms.map((room) => {
      const latestTransaction = room.transactions[0];

      // 状态映射
      const statusMap: Record<number, string> = {
        0: '待售',
        1: '已售',
        2: '预留',
        3: '认购',
        4: '已签',
      };

      return {
        // 楼盘信息
        complexName: room.building.complex.name,
        complexAddress: room.building.complex.address,
        developer: room.building.complex.developer,
        // 楼栋信息
        buildingName: room.building.name,
        // 房源信息
        unit: room.unit, // 房号
        floor: room.floor,
        roomType: room.roomType,
        area: room.area,
        predictArea: room.predictArea,
        actualArea: room.actualArea,
        // 价格信息
        price: room.price,
        totalPrice: room.totalPrice,
        // 状态
        status: statusMap[room.status] || '未知',
        statusCode: room.status,
        // 客户信息
        customerId: latestTransaction?.customer?.id || room.customerId,
        customerName: latestTransaction?.customer?.name || room.customerName,
        customerPhone: latestTransaction?.customer?.phone,
        customerSource: latestTransaction?.customer?.source,
        // 销售人员
        salesPersonName: latestTransaction?.salesPerson?.name || room.consultantName,
        // 成交信息
        transactionId: latestTransaction?.id,
        contractNo: latestTransaction?.contractNo,
        signDate: latestTransaction?.signDate,
        paidAmount: latestTransaction?.paidAmount,
        // 时间信息
        subscribeDate: room.subscribeDate,
        createdAt: room.createdAt,
      };
    });

    // 统计信息
    const stats = {
      totalRooms: reportData.length,
      availableRooms: reportData.filter((r) => r.statusCode === 0).length,
      subscribedRooms: reportData.filter((r) => r.statusCode === 3).length,
      contractedRooms: reportData.filter((r) => r.statusCode === 4).length,
      soldRooms: reportData.filter((r) => r.statusCode === 1).length,
      totalArea: reportData.reduce((sum, r) => sum + (r.area || 0), 0),
      totalAmount: reportData
        .filter((r) => r.statusCode >= 1)
        .reduce((sum, r) => sum + (r.totalPrice || 0), 0),
    };

    return {
      data: reportData,
      stats,
    };
  }

  // 导出Excel格式的报表数据
  async exportSalesReport(params: {
    complexId?: string;
    status?: number[];
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const result = await this.getSalesReport(params);
    return result;
  }
}
