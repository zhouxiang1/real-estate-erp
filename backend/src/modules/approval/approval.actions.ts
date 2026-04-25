export const APPROVAL_ACTIONS = [
  {
    key: 'finance.payment.create',
    name: '收款登记审批',
    module: '财务',
    action: '收款登记',
    description: '新增客户收款记录前进入审批，审批通过后才入账',
  },
  {
    key: 'finance.payment.confirm',
    name: '收款确认审批',
    module: '财务',
    action: '确认收款',
    description: '待确认收款转为已确认前进入审批',
  },
  {
    key: 'finance.payment.refund',
    name: '退款审批',
    module: '财务',
    action: '标记退款',
    description: '已确认收款标记退款前进入审批',
  },
  {
    key: 'finance.payment.batch_status',
    name: '批量收款状态审批',
    module: '财务',
    action: '批量收款状态',
    description: '批量确认收款或批量退款前进入审批',
  },
  {
    key: 'finance.price_change',
    name: '价格变更审批',
    module: '财务',
    action: '价格变更',
    description: '合同价格、折扣、面积差变更前进入审批',
  },
  {
    key: 'finance.commission_pay',
    name: '佣金付款审批',
    module: '财务',
    action: '佣金付款',
    description: '佣金发放前进入审批',
  },
  {
    key: 'finance.withdrawal_pay',
    name: '提现打款审批',
    module: '财务',
    action: '提现打款',
    description: '分销提现打款前进入审批',
  },
  {
    key: 'finance.batch_pay',
    name: '批量付款审批',
    module: '财务',
    action: '批量付款',
    description: '批量佣金/提现付款前进入审批',
  },
  {
    key: 'project.room.status',
    name: '房源状态变更审批',
    module: '销控',
    action: '房源状态变更',
    description: '单套房源状态调整前进入审批',
  },
  {
    key: 'project.room.batch_status',
    name: '批量房源状态审批',
    module: '销控',
    action: '批量房源状态',
    description: '批量调整房源销售状态前进入审批',
  },
  {
    key: 'project.room.lock',
    name: '房源锁定审批',
    module: '销控',
    action: '锁定/解锁房源',
    description: '房源锁定或解锁前进入审批',
  },
  {
    key: 'project.room.confirm_sale',
    name: '房源成交确认审批',
    module: '销控',
    action: '成交确认',
    description: '销控成交确认前进入审批',
  },
  {
    key: 'transaction.change_room',
    name: '换房审批',
    module: '交易',
    action: '换房',
    description: '客户换房前进入审批，通过后生成换房成交并释放原房源',
  },
  {
    key: 'transaction.modify',
    name: '改签审批',
    module: '交易',
    action: '改签',
    description: '成交改签前进入审批',
  },
  {
    key: 'transaction.refund',
    name: '退房审批',
    module: '交易',
    action: '退房',
    description: '退房会释放房源并改变客户状态，需审批后执行',
  },
  {
    key: 'transaction.forfeit',
    name: '挞定审批',
    module: '交易',
    action: '挞定',
    description: '挞定会释放房源并改变交易状态，需审批后执行',
  },
  {
    key: 'transaction.rename',
    name: '更名审批',
    module: '交易',
    action: '更名',
    description: '合同客户更名前进入审批',
  },
  {
    key: 'transaction.beneficiary.add',
    name: '新增权益人审批',
    module: '交易',
    action: '新增权益人',
    description: '新增合同权益人前进入审批',
  },
  {
    key: 'transaction.beneficiary.update',
    name: '修改权益人审批',
    module: '交易',
    action: '修改权益人',
    description: '修改权益人资料前进入审批',
  },
  {
    key: 'transaction.beneficiary.delete',
    name: '删除权益人审批',
    module: '交易',
    action: '删除权益人',
    description: '删除权益人前进入审批',
  },
  {
    key: 'customer.assign_user',
    name: '客户转派审批',
    module: '客户',
    action: '客户转派',
    description: '客户重新分配置业顾问前进入审批',
  },
  {
    key: 'customer.assign_distributor',
    name: '客户分销归属审批',
    module: '客户',
    action: '分销归属',
    description: '客户绑定或更换分销经纪人前进入审批',
  },
  {
    key: 'customer.public_pool',
    name: '客户入公客池审批',
    module: '客户',
    action: '移入公客池',
    description: '客户移入公共池前进入审批',
  },
  {
    key: 'customer.claim',
    name: '公客认领审批',
    module: '客户',
    action: '公客认领',
    description: '从公共池认领客户前进入审批',
  },
  {
    key: 'channel.partner.toggle',
    name: '渠道启停审批',
    module: '渠道',
    action: '渠道启停',
    description: '渠道合作伙伴启用或停用前进入审批',
  },
  {
    key: 'distributor.verify',
    name: '经纪人实名审批',
    module: '渠道',
    action: '经纪人实名',
    description: '经纪人实名、银行卡等资料认证前进入审批',
  },
  {
    key: 'distributor.toggle',
    name: '经纪人启停审批',
    module: '渠道',
    action: '经纪人启停',
    description: '分销经纪人启用或停用前进入审批',
  },
  {
    key: 'distributor.withdrawal_audit',
    name: '提现审核审批',
    module: '渠道',
    action: '提现审核',
    description: '分销提现审核前进入审批',
  },
  {
    key: 'distributor.withdrawal_paid',
    name: '提现已打款审批',
    module: '渠道',
    action: '提现打款确认',
    description: '分销提现标记已打款前进入审批',
  },
  {
    key: 'commission.audit',
    name: '佣金审核审批',
    module: '佣金',
    action: '佣金审核',
    description: '佣金审核通过或拒绝前进入审批',
  },
  {
    key: 'commission.batch_audit',
    name: '批量佣金审核审批',
    module: '佣金',
    action: '批量佣金审核',
    description: '批量审核佣金前进入审批',
  },
  {
    key: 'commission.pay',
    name: '佣金发放审批',
    module: '佣金',
    action: '佣金发放',
    description: '佣金发放前进入审批',
  },
];

export const DEFAULT_APPROVAL_NODES: Record<string, Array<{ name: string; approverRoleCode: string; sort: number }>> = {
  'finance.payment.create': [
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 1 },
  ],
  'finance.payment.confirm': [
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 1 },
  ],
  'finance.payment.refund': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'finance.payment.batch_status': [
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 1 },
  ],
  'finance.price_change': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'finance.commission_pay': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
    { name: '财务付款确认', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'finance.withdrawal_pay': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
    { name: '财务付款确认', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'finance.batch_pay': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
    { name: '财务付款确认', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'project.room.status': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'project.room.batch_status': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'project.room.lock': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'project.room.confirm_sale': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'transaction.change_room': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '内勤复核', approverRoleCode: 'office_staff', sort: 2 },
  ],
  'transaction.modify': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '内勤复核', approverRoleCode: 'office_staff', sort: 2 },
  ],
  'transaction.refund': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'transaction.forfeit': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '财务复核', approverRoleCode: 'finance_staff', sort: 2 },
  ],
  'transaction.rename': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
    { name: '内勤复核', approverRoleCode: 'office_staff', sort: 2 },
  ],
  'transaction.beneficiary.add': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'transaction.beneficiary.update': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'transaction.beneficiary.delete': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'customer.assign_user': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'customer.assign_distributor': [
    { name: '渠道经理审核', approverRoleCode: 'channel_manager', sort: 1 },
  ],
  'customer.public_pool': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'customer.claim': [
    { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
  ],
  'channel.partner.toggle': [
    { name: '渠道经理审核', approverRoleCode: 'channel_manager', sort: 1 },
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 2 },
  ],
  'distributor.verify': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
  ],
  'distributor.toggle': [
    { name: '渠道经理审核', approverRoleCode: 'channel_manager', sort: 1 },
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 2 },
  ],
  'distributor.withdrawal_audit': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
  ],
  'distributor.withdrawal_paid': [
    { name: '财务付款确认', approverRoleCode: 'finance_staff', sort: 1 },
  ],
  'commission.audit': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
  ],
  'commission.batch_audit': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
  ],
  'commission.pay': [
    { name: '风控复核', approverRoleCode: 'risk_controller', sort: 1 },
    { name: '财务付款确认', approverRoleCode: 'finance_staff', sort: 2 },
  ],
};
