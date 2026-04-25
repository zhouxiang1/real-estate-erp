import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding sample data...');

  // 获取角色和用户
  const managerRole = await prisma.role.findUnique({ where: { code: 'sales_manager' } });
  const consultantRole = await prisma.role.findUnique({ where: { code: 'sales_consultant' } });
  const consultant = await prisma.user.findFirst({ where: { roleId: consultantRole?.id } });
  const manager = await prisma.user.findFirst({ where: { roleId: managerRole?.id } });

  // 1. 创建楼盘
  const complexes = await Promise.all([
    prisma.buildingComplex.create({
      data: {
        name: '阳光花园',
        address: '朝阳区建国路88号',
        developer: '阳光置业集团',
        totalBuild: 5,
        totalUnits: 500,
      },
    }),
    prisma.buildingComplex.create({
      data: {
        name: '海景公寓',
        address: '海淀区中关村大街1号',
        developer: '海景地产',
        totalBuild: 3,
        totalUnits: 300,
      },
    }),
    prisma.buildingComplex.create({
      data: {
        name: '城市之光',
        address: '西城区西单北大街120号',
        developer: '城市之光置业',
        totalBuild: 8,
        totalUnits: 800,
      },
    }),
  ]);
  console.log('Created complexes:', complexes.length);

  // 2. 创建楼栋和房源
  for (const complex of complexes) {
    const buildingCount = complex.name === '城市之光' ? 3 : 2;
    for (let b = 1; b <= buildingCount; b++) {
      const building = await prisma.building.create({
        data: {
          complexId: complex.id,
          name: `${b}号楼`,
          floors: 30,
          unitsPerFloor: 4,
        },
      });

      // 每层4户，共30层，创建120套房源
      const rooms = [];
      for (let floor = 1; floor <= 30; floor++) {
        for (let unit = 1; unit <= 4; unit++) {
          const roomNo = `${floor}0${unit}`;
          const areas = [89, 110, 125, 145];
          const area = areas[unit - 1];
          const pricePerSqm = 25000 + Math.random() * 15000;
          const totalPrice = Math.round(area * pricePerSqm);
          const roomTypes = ['2室2厅', '3室2厅', '3室2厅', '4室2厅'];

          rooms.push({
            buildingId: building.id,
            unit: roomNo,
            floor,
            area,
            price: Math.round(pricePerSqm),
            totalPrice,
            roomType: roomTypes[unit - 1],
            status: Math.random() > 0.7 ? 1 : 0, // 30%已售
          });
        }
      }
      await prisma.room.createMany({ data: rooms });
    }
  }
  console.log('Created buildings and rooms');

  // 3. 创建客户
  const customers = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.customer.create({
        data: {
          name: `客户${i + 1}`,
          phone: `138${String(Math.floor(10000000 + Math.random() * 90000000)).padStart(8, '0')}`,
          wechat: `wx_user${i + 1}`,
          source: ['自然到访', '电话咨询', '网络推广', '老客户推荐', '分销推荐'][Math.floor(Math.random() * 5)],
          level: ['A类', 'B类', 'C类'][Math.floor(Math.random() * 3)],
          status: Math.floor(Math.random() * 3),
          remark: `客户备注信息${i + 1}`,
        },
      })
    )
  );
  console.log('Created customers:', customers.length);

  // 4. 创建成交记录和佣金
  if (consultant && manager) {
    // 获取一些已售房源
    const soldRooms = await prisma.room.findMany({
      where: { status: 1 },
      take: 10,
      include: { building: { include: { complex: true } } },
    });

    for (let i = 0; i < soldRooms.length && i < customers.length; i++) {
      const room = soldRooms[i];
      const customer = customers[i];

      // 创建成交
      const transaction = await prisma.transaction.create({
        data: {
          contractNo: `TX202603${String(i + 1).padStart(4, '0')}`,
          customerId: customer.id,
          roomId: room.id,
          salesPersonId: consultant.id,
          totalPrice: room.totalPrice,
          paidAmount: room.totalPrice,
          signDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          status: 1,
        },
      });

      // 创建销售佣金
      await prisma.commission.create({
        data: {
          transactionId: transaction.id,
          userId: consultant.id,
          amount: room.totalPrice * 0.02,
          rate: 0.02,
          type: 'sales',
          status: Math.random() > 0.5 ? 0 : 2, // 部分待审核，部分已发放
        },
      });
    }
  }
  console.log('Created transactions and commissions');

  // 5. 创建渠道合作伙伴
  const partners = await Promise.all([
    prisma.channelPartner.create({
      data: {
        name: '好房中介',
        code: 'HF001',
        type: 'agency',
        contact: '张经理',
        phone: '13900139001',
        commission: 0.03,
        status: 1,
      },
    }),
    prisma.channelPartner.create({
      data: {
        name: '李经纪人',
        code: 'LR001',
        type: 'individual',
        contact: '李四',
        phone: '13900139002',
        commission: 0.025,
        status: 1,
      },
    }),
    prisma.channelPartner.create({
      data: {
        name: '房产平台A',
        code: 'PT001',
        type: 'platform',
        contact: '王总',
        phone: '13900139003',
        commission: 0.02,
        status: 1,
      },
    }),
  ]);
  console.log('Created channel partners:', partners.length);

  // 6. 创建分销经纪人
  const distributors = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.distributor.create({
        data: {
          username: `distributor${i + 1}`,
          password: '$2a$10$rVqKkVhGk5WzLxN5.xH1uOQjYjQjQjQjQjQjQjQjQjQjQjQjQjQ', // password: 123456
          name: `分销员${i + 1}`,
          phone: `139${String(10000000 + i * 1111111).padStart(8, '0')}`,
          isVerified: i < 3,
          status: 1,
        },
      })
    )
  );
  console.log('Created distributors:', distributors.length);

  // 7. 创建跟进记录
  for (const customer of customers.slice(0, 10)) {
    if (consultant) {
      await prisma.customerFollowup.create({
        data: {
          customerId: customer.id,
          userId: consultant.id,
          type: ['call', 'visit', 'wechat'][Math.floor(Math.random() * 3)],
          content: `跟进记录：客户有意向，正在考虑中...`,
          nextPlan: '下周再次联系',
        },
      });
    }
  }
  console.log('Created followups');

  console.log('\\n✅ Sample data created successfully!');
  console.log('\\nSummary:');
  console.log('- 楼盘:', complexes.length);
  console.log('- 客户:', customers.length);
  console.log('- 渠道:', partners.length);
  console.log('- 分销:', distributors.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
