import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  // ==================== 楼盘管理 ====================

  async createBuildingComplex(data: any) {
    return this.prisma.buildingComplex.create({
      data,
      include: {
        buildings: {
          include: {
            rooms: true,
          },
        },
      },
    });
  }

  async findAllBuildingComplex(page: number = 1, limit: number = 10, keyword?: string) {
    const skip = (page - 1) * limit;
    const where: any = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { address: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.buildingComplex.findMany({
        where,
        skip,
        take: limit,
        include: {
          buildings: {
            include: {
              rooms: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.buildingComplex.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBuildingComplexById(id: string) {
    const complex = await this.prisma.buildingComplex.findUnique({
      where: { id },
      include: {
        buildings: {
          include: {
            rooms: true,
          },
        },
      },
    });

    if (!complex) {
      throw new NotFoundException('楼盘不存在');
    }

    return complex;
  }

  async updateBuildingComplex(id: string, data: any) {
    return this.prisma.buildingComplex.update({
      where: { id },
      data,
      include: {
        buildings: {
          include: {
            rooms: true,
          },
        },
      },
    });
  }

  async deleteBuildingComplex(id: string) {
    await this.prisma.buildingComplex.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // ==================== 楼栋管理 ====================

  async createBuilding(data: any) {
    // 确保整数字段是整数类型
    if (data.units !== undefined) data.units = parseInt(data.units, 10);
    if (data.floors !== undefined) data.floors = parseInt(data.floors, 10);
    if (data.unitsPerFloor !== undefined) data.unitsPerFloor = parseInt(data.unitsPerFloor, 10);
    return this.prisma.building.create({
      data,
      include: {
        complex: true,
        rooms: true,
      },
    });
  }

  async findBuildingsByComplex(complexId: string) {
    return this.prisma.building.findMany({
      where: { complexId },
      include: {
        rooms: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateBuilding(id: string, data: any) {
    // 确保整数字段是整数类型
    if (data.units !== undefined) data.units = parseInt(data.units, 10);
    if (data.floors !== undefined) data.floors = parseInt(data.floors, 10);
    if (data.unitsPerFloor !== undefined) data.unitsPerFloor = parseInt(data.unitsPerFloor, 10);
    return this.prisma.building.update({
      where: { id },
      data,
      include: {
        complex: true,
        rooms: true,
      },
    });
  }

  async deleteBuilding(id: string) {
    await this.prisma.building.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // ==================== 房源管理 ====================

  async createRoom(data: any) {
    return this.prisma.room.create({
      data,
      include: {
        building: {
          include: {
            complex: true,
          },
        },
      },
    });
  }

  async createRoomsBatch(data: any[]) {
    return this.prisma.room.createMany({
      data,
    });
  }

  async findRooms(
    page: number = 1,
    limit: number = 10,
    filters?: {
      buildingId?: string;
      complexId?: string;
      status?: number;
      floor?: number;
      keyword?: string;
      userId?: string; // 置业顾问ID，用于过滤
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.buildingId) {
      where.buildingId = filters.buildingId;
    }
    if (filters?.complexId) {
      where.building = { complexId: filters.complexId };
    }
    if (filters?.status !== undefined) {
      where.status = filters.status;
    }
    if (filters?.floor) {
      where.floor = filters.floor;
    }

    // 权限过滤：置业顾问可以看所有房源，但查看详情时有权限控制
    // 这里不再过滤列表，只在详情接口做权限控制
    if (filters?.keyword) {
      where.OR = [
        { unit: { contains: filters.keyword } },
        { roomType: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        include: {
          building: {
            include: {
              complex: true,
            },
          },
        },
        orderBy: [{ building: { name: 'asc' } }, { floor: 'asc' }, { unit: 'asc' }],
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRoomById(id: string, userId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        building: {
          include: {
            complex: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('房源不存在');
    }

    // 权限检查：非管理人员只能查看 待售 或 自己认购/成交的房源
    if (userId) {
      const isAvailable = room.status === 0;
      const isOwn = room.consultantId === userId;
      if (!isAvailable && !isOwn) {
        throw new NotFoundException('房源不存在');
      }
    }

    return room;
  }

  async updateRoom(id: string, data: any) {
    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        building: {
          include: {
            complex: true,
          },
        },
      },
    });
  }

  async updateRoomStatus(id: string, status: number) {
    return this.prisma.room.update({
      where: { id },
      data: { status },
    });
  }

  async deleteRoom(id: string) {
    await this.prisma.room.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // 批量更新房源状态
  async updateRoomsStatus(buildingId: string, status: number, roomIds?: string[]) {
    const where: any = { buildingId };
    if (roomIds && roomIds.length > 0) {
      where.id = { in: roomIds };
    }

    return this.prisma.room.updateMany({
      where,
      data: { status },
    });
  }

  // 导出房源模板
  async exportRoomTemplate(buildingId: string) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        complex: true,
        rooms: {
          orderBy: [{ floor: 'asc' }, { unit: 'asc' }],
        },
      },
    });

    if (!building) {
      throw new NotFoundException('楼栋不存在');
    }

    // 创建Excel数据
    const XLSX = require('xlsx');
    const data = building.rooms.map((room, index) => ({
      '序号': index + 1,
      '房号': room.unit,
      '楼层': room.floor,
      '户型': room.roomType || '',
      '预测面积(㎡)': room.predictArea || room.area || '',
      '实测面积(㎡)': room.actualArea || '',
      '单价(元/㎡)': room.price || '',
      '总价(元)': room.totalPrice || '',
      '状态': room.status === 0 ? '待售' : room.status === 1 ? '已售' : room.status === 2 ? '预留' : room.status === 3 ? '认购' : '已签',
    }));

    // 如果没有房间，生成空模板
    if (data.length === 0) {
      for (let floor = 1; floor <= building.floors; floor++) {
        for (let i = 1; i <= building.unitsPerFloor; i++) {
          const unit = `${floor}0${i}`;
          data.push({
            '序号': data.length + 1,
            '房号': unit,
            '楼层': floor,
            '户型': '',
            '预测面积(㎡)': '',
            '实测面积(㎡)': '',
            '单价(元/㎡)': '',
            '总价(元)': '',
            '状态': '待售',
          });
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '房源模板');

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 10 }, // 房号
      { wch: 8 },  // 楼层
      { wch: 12 }, // 户型
      { wch: 15 }, // 预测面积
      { wch: 15 }, // 实测面积
      { wch: 15 }, // 单价
      { wch: 15 }, // 总价
      { wch: 10 }, // 状态
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      filename: `${building.complex.name}-${building.name}-房源模板.xlsx`,
      buffer: buffer.toString('base64'),
      buildingName: building.name,
      complexName: building.complex.name,
      roomCount: data.length,
    };
  }

  // 导入房源数据
  async importRooms(buildingId: string, data: any[]) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('楼栋不存在');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      try {
        const roomNumber = row['房号'];
        if (!roomNumber) {
          results.failed++;
          results.errors.push(`房号为空，跳过`);
          continue;
        }

        // 查找对应房间
        const room = await this.prisma.room.findFirst({
          where: {
            buildingId,
            unit: String(roomNumber),
          },
        });

        if (!room) {
          results.failed++;
          results.errors.push(`房号 ${roomNumber} 不存在，跳过`);
          continue;
        }

        // 更新房间数据
        const updateData: any = {};

        // 更新预测面积
        if (row['预测面积(㎡)'] !== undefined && row['预测面积(㎡)'] !== '') {
          updateData.predictArea = parseFloat(row['预测面积(㎡)']);
          if (!updateData.area) {
            updateData.area = updateData.predictArea;
          }
        }

        // 更新实测面积
        if (row['实测面积(㎡)'] !== undefined && row['实测面积(㎡)'] !== '') {
          updateData.actualArea = parseFloat(row['实测面积(㎡)']);
        }

        // 更新单价
        if (row['单价(元/㎡)'] !== undefined && row['单价(元/㎡)'] !== '') {
          updateData.price = parseFloat(row['单价(元/㎡)']);
        }

        // 更新户型
        if (row['户型'] !== undefined) {
          updateData.roomType = row['户型'];
        }

        // 如果有实测面积，更新area为实测面积
        if (updateData.actualArea) {
          updateData.area = updateData.actualArea;
        }

        // 计算总价 = 单价 * 面积
        if ((updateData.price || room.price) && (updateData.actualArea || updateData.predictArea || room.area)) {
          const price = updateData.price || room.price;
          const area = updateData.actualArea || updateData.predictArea || room.area;
          updateData.totalPrice = price * area;
        }

        // 如果Excel中有总价，直接使用
        if (row['总价(元)'] !== undefined && row['总价(元)'] !== '') {
          updateData.totalPrice = parseFloat(row['总价(元)']);
        }

        await this.prisma.room.update({
          where: { id: room.id },
          data: updateData,
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`处理行数据时出错: ${error.message}`);
      }
    }

    return results;
  }

  // 获取房源统计
  async getRoomStats(complexId?: string, userId?: string) {
    const where = complexId ? { building: { complexId } } : {};

    // 统计所有房源
    const [total, available, sold, reserved] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.count({ where: { ...where, status: 0 } }),
      this.prisma.room.count({ where: { ...where, status: { in: [1, 3, 4] } } }),
      this.prisma.room.count({ where: { ...where, status: 2 } }),
    ]);

    return { total, available, sold, reserved };
  }

  // ==================== 销控管理 ====================

  // 锁定/解锁房源
  async lockRoom(id: string, lock: boolean) {
    return this.prisma.room.update({
      where: { id },
      data: { status: lock ? 2 : 0 },
    });
  }

  // 成交确认
  async confirmSale(roomId: string) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status: 1 },
    });
  }

  // 获取销控表
  async getInventory(complexId: string) {
    const buildings = await this.prisma.building.findMany({
      where: { complexId },
      include: {
        rooms: {
          orderBy: [{ floor: 'asc' }, { unit: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    return buildings;
  }
}
