import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { APPROVAL_ACTIONS, DEFAULT_APPROVAL_NODES } from '../modules/approval/approval.actions';

const prisma = new PrismaClient();

const TEST_PASSWORD = '123456';

async function upsertRoles() {
  const roles = [
    { name: '超级管理员', code: 'admin', description: '拥有所有权限' },
    { name: '营销经理', code: 'sales_manager', description: '营销管理权限' },
    { name: '置业顾问', code: 'sales_consultant', description: '客户接待、跟进、成交录入' },
    { name: '财务', code: 'finance_staff', description: '收款、价格变更、财务台账' },
    { name: '接访', code: 'receptionist', description: '客户来访登记、查重、分配顾问' },
    { name: '渠道经理', code: 'channel_manager', description: '渠道合作伙伴管理' },
    { name: '风控人员', code: 'risk_controller', description: '佣金与异常审核' },
    { name: '分销经纪人', code: 'distributor', description: '全民营销分销端' },
    { name: '内勤', code: 'office_staff', description: '项目、房源、销售录入管理' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        permissions: JSON.stringify({ all: role.code === 'admin' }),
      },
      create: {
        ...role,
        permissions: JSON.stringify({ all: role.code === 'admin' }),
      },
    });
  }
}

async function upsertDepartments() {
  const departments = [
    { id: 'root', name: '总部', parentId: null, sort: 0 },
    { id: 'sales', name: '营销部', parentId: 'root', sort: 1 },
    { id: 'reception', name: '接访组', parentId: 'sales', sort: 2 },
    { id: 'channel', name: '渠道部', parentId: 'root', sort: 3 },
    { id: 'finance', name: '财务部', parentId: 'root', sort: 4 },
    { id: 'office', name: '内勤部', parentId: 'root', sort: 5 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {
        name: dept.name,
        parentId: dept.parentId,
        sort: dept.sort,
      },
      create: dept,
    });
  }
}

async function upsertUsers() {
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((role) => [role.code, role.id]));

  const users = [
    { username: 'admin', password: 'admin123456', name: '系统管理员', roleCode: 'admin', departmentId: 'root', phone: '13800000001' },
    { username: 'manager', password: TEST_PASSWORD, name: '营销经理', roleCode: 'sales_manager', departmentId: 'sales', phone: '13800000002' },
    { username: 'consultant', password: TEST_PASSWORD, name: '置业顾问', roleCode: 'sales_consultant', departmentId: 'sales', phone: '13800000003' },
    { username: 'finance', password: TEST_PASSWORD, name: '财务', roleCode: 'finance_staff', departmentId: 'finance', phone: '13800000004' },
    { username: 'reception', password: TEST_PASSWORD, name: '接访', roleCode: 'receptionist', departmentId: 'reception', phone: '13800000005' },
    { username: 'channel', password: TEST_PASSWORD, name: '渠道经理', roleCode: 'channel_manager', departmentId: 'channel', phone: '13800000006' },
    { username: 'risk', password: TEST_PASSWORD, name: '风控人员', roleCode: 'risk_controller', departmentId: 'channel', phone: '13800000007' },
    { username: 'distributor', password: TEST_PASSWORD, name: '分销经纪人', roleCode: 'distributor', departmentId: 'channel', phone: '13800000008' },
    { username: 'office', password: TEST_PASSWORD, name: '内勤', roleCode: 'office_staff', departmentId: 'office', phone: '13800000009' },
  ];

  for (const user of users) {
    const roleId = roleMap.get(user.roleCode);
    if (!roleId) {
      throw new Error(`Missing role: ${user.roleCode}`);
    }

    const password = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        password,
        name: user.name,
        phone: user.phone,
        roleId,
        departmentId: user.departmentId,
        status: 1,
      },
      create: {
        username: user.username,
        password,
        name: user.name,
        email: `${user.username}@example.com`,
        phone: user.phone,
        roleId,
        departmentId: user.departmentId,
        status: 1,
      },
    });
  }
}

async function upsertApprovalWorkflows() {
  for (const action of APPROVAL_ACTIONS) {
    const workflow = await prisma.approvalWorkflow.upsert({
      where: { key: action.key },
      update: {
        name: action.name,
        module: action.module,
        action: action.action,
        description: action.description,
      },
      create: {
        key: action.key,
        name: action.name,
        module: action.module,
        action: action.action,
        description: action.description,
        enabled: true,
      },
      include: {
        nodes: true,
      },
    });

    if (workflow.nodes.length === 0) {
      const nodes = DEFAULT_APPROVAL_NODES[action.key] || [
        { name: '管理员审批', approverRoleCode: 'admin', sort: 1 },
      ];
      await prisma.approvalNode.createMany({
        data: nodes.map((node) => ({
          workflowId: workflow.id,
          name: node.name,
          sort: node.sort,
          approverType: 'role',
          approverRoleCode: node.approverRoleCode,
        })),
      });
    }
  }
}

async function seedSampleData() {
  const existingComplexCount = await prisma.buildingComplex.count();
  if (existingComplexCount > 0) {
    return;
  }

  const consultant = await prisma.user.findUnique({ where: { username: 'consultant' } });
  const manager = await prisma.user.findUnique({ where: { username: 'manager' } });
  if (!consultant || !manager) {
    throw new Error('Missing seed users');
  }

  const complexes = await Promise.all([
    prisma.buildingComplex.create({
      data: {
        name: '观澜云著',
        address: '合肥市滨湖新区云谷路88号',
        developer: '安徽华宸置业',
        totalBuild: 4,
        totalUnits: 320,
      },
    }),
    prisma.buildingComplex.create({
      data: {
        name: '都会天境',
        address: '合肥市蜀山区望江西路168号',
        developer: '都会地产',
        totalBuild: 3,
        totalUnits: 216,
      },
    }),
  ]);

  for (const complex of complexes) {
    for (let buildingIndex = 1; buildingIndex <= 2; buildingIndex++) {
      const building = await prisma.building.create({
        data: {
          complexId: complex.id,
          name: `${buildingIndex}号楼`,
          floors: 18,
          units: 1,
          unitsPerFloor: 4,
        },
      });

      const rooms = [];
      for (let floor = 1; floor <= 18; floor++) {
        for (let unitIndex = 1; unitIndex <= 4; unitIndex++) {
          const area = [89, 105, 118, 142][unitIndex - 1];
          const price = 16500 + buildingIndex * 600 + unitIndex * 300 + floor * 20;
          const sequence = (buildingIndex - 1) * 72 + (floor - 1) * 4 + unitIndex;
          rooms.push({
            buildingId: building.id,
            unit: `${floor}${String(unitIndex).padStart(2, '0')}`,
            floor,
            area,
            predictArea: area,
            price,
            totalPrice: Math.round(area * price),
            roomType: ['2室2厅', '3室2厅', '3室2厅', '4室2厅'][unitIndex - 1],
            status: sequence % 11 === 0 ? 1 : 0,
          });
        }
      }
      await prisma.room.createMany({ data: rooms });
    }
  }

  const customers = await Promise.all(
    Array.from({ length: 16 }, (_, index) =>
      prisma.customer.create({
        data: {
          name: `测试客户${index + 1}`,
          phone: `139${String(10000000 + index).padStart(8, '0')}`,
          wechat: `test_customer_${index + 1}`,
          source: ['自然到访', '电话咨询', '渠道推荐', '老业主推荐'][index % 4],
          level: ['A类', 'B类', 'C类'][index % 3],
          status: index % 5 === 0 ? 2 : index % 2,
          ageGroup: ['26-30岁', '31-35岁', '36-40岁'][index % 3],
          livingArea: JSON.stringify(['合肥市', '蜀山区']),
          workArea: JSON.stringify(['合肥市', '包河区']),
          industry: ['IT/互联网', '金融', '制造业'][index % 3],
          occupation: ['公司职员', '企业高管', '企业主'][index % 3],
          loanType: ['商业贷款', '公积金贷款', '全款'][index % 3],
          remark: '系统初始化演示客户',
        },
      }),
    ),
  );

  for (const customer of customers) {
    await prisma.customerBelong.create({
      data: {
        customerId: customer.id,
        userId: consultant.id,
        type: 'sales',
      },
    });
  }

  const partners = await Promise.all([
    prisma.channelPartner.create({
      data: {
        name: '好房联盟',
        code: 'HF001',
        type: 'agency',
        contact: '张经理',
        phone: '13900139001',
        commission: 0.03,
      },
    }),
    prisma.channelPartner.create({
      data: {
        name: '城市置业渠道',
        code: 'CS001',
        type: 'platform',
        contact: '王总',
        phone: '13900139002',
        commission: 0.025,
      },
    }),
  ]);

  const distributorPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  const distributor = await prisma.distributor.upsert({
    where: { username: 'distributor' },
    update: {
      password: distributorPassword,
      name: '分销经纪人',
      phone: '13800000008',
      isVerified: true,
      status: 1,
    },
    create: {
      username: 'distributor',
      password: distributorPassword,
      name: '分销经纪人',
      phone: '13800000008',
      realName: '分销经纪人',
      bankName: '测试银行',
      bankAccount: '6222000000000000000',
      isVerified: true,
      status: 1,
    },
  });

  const soldRooms = await prisma.room.findMany({
    where: { status: 1 },
    take: 6,
  });

  for (let index = 0; index < soldRooms.length; index++) {
    const room = soldRooms[index];
    const customer = customers[index];
    const paidAmount = Math.round(room.totalPrice * (index % 2 === 0 ? 1 : 0.35));
    const transaction = await prisma.transaction.create({
      data: {
        contractNo: `TX202604${String(index + 1).padStart(4, '0')}`,
        customerId: customer.id,
        roomId: room.id,
        salesPersonId: consultant.id,
        channelPartnerId: index % 2 === 0 ? partners[0].id : undefined,
        distributorId: index % 3 === 0 ? distributor.id : undefined,
        originalPrice: room.totalPrice,
        totalPrice: room.totalPrice,
        paidAmount,
        signDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
        status: paidAmount >= room.totalPrice ? 1 : 0,
        predictArea: room.area,
      },
    });

    await prisma.paymentRecord.create({
      data: {
        transactionId: transaction.id,
        type: index % 2 === 0 ? 'final_payment' : 'down_payment',
        amount: paidAmount,
        paymentDate: transaction.signDate,
        paymentMethod: 'bank_transfer',
        bankName: '测试银行',
        bankAccount: '000000000000',
        status: 1,
        operator: '财务',
      },
    });

    await prisma.commission.create({
      data: {
        transactionId: transaction.id,
        userId: consultant.id,
        amount: Math.round(room.totalPrice * 0.02),
        rate: 0.02,
        type: 'sales',
        status: index % 2 === 0 ? 2 : 0,
      },
    });
  }
}

async function main() {
  await upsertRoles();
  await upsertDepartments();
  await upsertUsers();
  await upsertApprovalWorkflows();
  await seedSampleData();
  console.log('Seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
