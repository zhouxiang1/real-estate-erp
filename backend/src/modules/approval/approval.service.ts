import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { APPROVAL_ACTIONS, DEFAULT_APPROVAL_NODES } from './approval.actions';

type SubmitApprovalInput = {
  workflowKey: string;
  title: string;
  module: string;
  action: string;
  businessType?: string;
  businessId?: string;
  payload: any;
  summary?: any;
  requester: { id: string; roleCode?: string };
};

@Injectable()
export class ApprovalService {
  constructor(private prisma: PrismaService) {}

  getActions() {
    return APPROVAL_ACTIONS;
  }

  async ensureDefaultWorkflows() {
    for (const action of APPROVAL_ACTIONS) {
      const workflow = await this.prisma.approvalWorkflow.upsert({
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
        include: { nodes: true },
      });

      if (workflow.nodes.length === 0) {
        const nodes = DEFAULT_APPROVAL_NODES[action.key] || [
          { name: '营销经理审核', approverRoleCode: 'sales_manager', sort: 1 },
        ];
        await this.prisma.approvalNode.createMany({
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

  async listWorkflows(params?: { keyword?: string; enabled?: boolean }) {
    await this.ensureDefaultWorkflows();
    const where: any = {};
    if (params?.enabled !== undefined) where.enabled = params.enabled;
    if (params?.keyword) {
      where.OR = [
        { name: { contains: params.keyword } },
        { key: { contains: params.keyword } },
        { module: { contains: params.keyword } },
      ];
    }

    return this.prisma.approvalWorkflow.findMany({
      where,
      include: {
        nodes: {
          orderBy: { sort: 'asc' },
          include: {
            approverUser: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: [{ module: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getWorkflow(id: string) {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { sort: 'asc' },
          include: {
            approverUser: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    if (!workflow) throw new NotFoundException('审批流程不存在');
    return workflow;
  }

  async updateWorkflow(id: string, data: any) {
    const workflow = await this.prisma.approvalWorkflow.findUnique({ where: { id } });
    if (!workflow) throw new NotFoundException('审批流程不存在');

    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    if (data.enabled !== false && nodes.length === 0) {
      throw new BadRequestException('启用审批流时至少需要一个审批节点');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalWorkflow.update({
        where: { id },
        data: {
          name: data.name ?? workflow.name,
          module: data.module ?? workflow.module,
          action: data.action ?? workflow.action,
          description: data.description,
          enabled: data.enabled ?? workflow.enabled,
        },
      });

      if (Array.isArray(data.nodes)) {
        await tx.approvalNode.deleteMany({ where: { workflowId: id } });
        if (nodes.length > 0) {
          await tx.approvalNode.createMany({
            data: nodes.map((node: any, index: number) => ({
              workflowId: id,
              name: node.name || `审批节点${index + 1}`,
              sort: Number(node.sort || index + 1),
              approverType: node.approverType || 'role',
              approverRoleCode: node.approverType === 'user' ? null : node.approverRoleCode,
              approverUserId: node.approverType === 'user' ? node.approverUserId : null,
            })),
          });
        }
      }
    });

    return this.getWorkflow(id);
  }

  async setWorkflowEnabled(id: string, enabled: boolean) {
    await this.prisma.approvalWorkflow.update({ where: { id }, data: { enabled } });
    return this.getWorkflow(id);
  }

  async submitOrExecute<T>(input: SubmitApprovalInput, executeDirect: () => Promise<T>) {
    await this.ensureDefaultWorkflows();
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { key: input.workflowKey },
      include: { nodes: { orderBy: { sort: 'asc' } } },
    });

    if (!workflow || !workflow.enabled || workflow.nodes.length === 0) {
      return executeDirect();
    }

    const firstNode = workflow.nodes[0];
    const request = await this.prisma.approvalRequest.create({
      data: {
        workflowId: workflow.id,
        workflowKey: workflow.key,
        title: input.title,
        module: input.module,
        action: input.action,
        businessType: input.businessType,
        businessId: input.businessId,
        payload: JSON.stringify(input.payload || {}),
        summary: input.summary ? JSON.stringify(input.summary) : undefined,
        requesterId: input.requester.id,
        requesterRoleCode: input.requester.roleCode,
        currentNodeId: firstNode.id,
        currentStep: firstNode.sort,
        status: 0,
      },
      include: {
        workflow: true,
      },
    });

    return {
      approvalRequired: true,
      message: '已提交审批，通过后系统会自动执行',
      request,
    } as any;
  }

  async listRequests(params: {
    page?: number;
    limit?: number;
    status?: number;
    workflowKey?: string;
    mine?: boolean;
    scope?: 'todo' | 'mine' | 'all';
    user?: { id: string; roleCode?: string };
  }) {
    const { page = 1, limit = 10 } = params;
    const where: any = {};
    if (params.status !== undefined) where.status = params.status;
    if (params.workflowKey) where.workflowKey = params.workflowKey;
    const scope = params.mine ? 'mine' : (params.scope || (params.user?.roleCode === 'admin' ? 'all' : 'todo'));

    if (params.user && scope === 'mine') {
      where.requesterId = params.user.id;
    }

    if (params.user && scope === 'todo') {
      const approverNodeIds = await this.getApproverNodeIds(params.user);
      where.currentNodeId = approverNodeIds.length > 0 ? { in: approverNodeIds } : '__no_approver_node__';
      where.requesterId = { not: params.user.id };
    }

    if (params.user?.roleCode !== 'admin' && scope === 'all') {
      const approverNodeIds = await this.getApproverNodeIds(params.user);
      where.OR = [
        { requesterId: params.user.id },
        { currentNodeId: approverNodeIds.length > 0 ? { in: approverNodeIds } : '__no_approver_node__' },
        { records: { some: { approverId: params.user.id } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          workflow: true,
          requester: { select: { id: true, name: true, username: true } },
          records: {
            orderBy: { createdAt: 'asc' },
            include: {
              approver: { select: { id: true, name: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    const withNodes = await Promise.all(data.map((request) => this.attachCurrentNode(request)));

    return { data: withNodes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRequest(id: string, user?: { id: string; roleCode?: string }) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        workflow: { include: { nodes: { orderBy: { sort: 'asc' } } } },
        requester: { select: { id: true, name: true, username: true } },
        records: {
          orderBy: { createdAt: 'asc' },
          include: { approver: { select: { id: true, name: true, username: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('审批单不存在');
    if (user && user.roleCode !== 'admin') {
      const currentNode = request.workflow.nodes.find((node) => node.id === request.currentNodeId);
      const isRequester = request.requesterId === user.id;
      const isCurrentApprover = this.isNodeApprover(user, currentNode);
      const hasApproved = request.records.some((record) => record.approverId === user.id);
      if (!isRequester && !isCurrentApprover && !hasApproved) {
        throw new ForbiddenException('当前账号无权查看该审批单');
      }
    }
    return this.attachCurrentNode(request);
  }

  private async getApproverNodeIds(user: { id: string; roleCode?: string }) {
    const nodes = await this.prisma.approvalNode.findMany({
      where: {
        OR: [
          { approverType: 'role', approverRoleCode: user.roleCode },
          { approverType: 'user', approverUserId: user.id },
        ],
      },
      select: { id: true },
    });
    return nodes.map((node) => node.id);
  }

  private async attachCurrentNode(request: any) {
    const nodes = request.workflow?.nodes || await this.prisma.approvalNode.findMany({
      where: { workflowId: request.workflowId },
      orderBy: { sort: 'asc' },
    });
    const currentNode = nodes.find((node: any) => node.id === request.currentNodeId) || null;
    return {
      ...request,
      payloadData: this.safeParse(request.payload),
      summaryData: this.safeParse(request.summary),
      currentNode,
    };
  }

  private safeParse(value?: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private canApprove(user: { id: string; roleCode?: string }, node: any, requesterId?: string | null) {
    if (requesterId && requesterId === user.id) return false;
    return this.isNodeApprover(user, node);
  }

  private isNodeApprover(user: { id: string; roleCode?: string }, node: any) {
    if (!node) return false;
    if (node.approverType === 'user') return node.approverUserId === user.id;
    return node.approverRoleCode === user.roleCode;
  }

  async approve(id: string, user: { id: string; roleCode?: string }, comment?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        workflow: { include: { nodes: { orderBy: { sort: 'asc' } } } },
      },
    });
    if (!request) throw new NotFoundException('审批单不存在');
    if (request.status !== 0) throw new BadRequestException('审批单已结束');

    const currentNode = request.workflow.nodes.find((node) => node.id === request.currentNodeId);
    if (!this.canApprove(user, currentNode, request.requesterId)) {
      throw new ForbiddenException('当前账号无权审批此节点');
    }

    await this.prisma.approvalRecord.create({
      data: {
        requestId: request.id,
        nodeId: currentNode?.id,
        nodeName: currentNode?.name,
        approverId: user.id,
        action: 'approve',
        comment,
      },
    });

    const currentIndex = request.workflow.nodes.findIndex((node) => node.id === request.currentNodeId);
    const nextNode = request.workflow.nodes[currentIndex + 1];

    if (nextNode) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          currentNodeId: nextNode.id,
          currentStep: nextNode.sort,
        },
      });
      return this.findRequest(id, user);
    }

    try {
      await this.executeApprovedRequest(request.action, this.safeParse(request.payload));
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: 1,
          resultMessage: '审批通过，已自动执行',
        },
      });
    } catch (error: any) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: 3,
          resultMessage: error?.message || '审批通过但执行失败',
        },
      });
      throw error;
    }

    return this.findRequest(id, user);
  }

  async reject(id: string, user: { id: string; roleCode?: string }, comment?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { workflow: { include: { nodes: { orderBy: { sort: 'asc' } } } } },
    });
    if (!request) throw new NotFoundException('审批单不存在');
    if (request.status !== 0) throw new BadRequestException('审批单已结束');

    const currentNode = request.workflow.nodes.find((node) => node.id === request.currentNodeId);
    if (!this.canApprove(user, currentNode, request.requesterId)) {
      throw new ForbiddenException('当前账号无权审批此节点');
    }

    await this.prisma.approvalRecord.create({
      data: {
        requestId: request.id,
        nodeId: currentNode?.id,
        nodeName: currentNode?.name,
        approverId: user.id,
        action: 'reject',
        comment,
      },
    });

    await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 2,
        resultMessage: comment || '审批已拒绝',
      },
    });

    return this.findRequest(id, user);
  }

  private async executeApprovedRequest(action: string, payload: any) {
    switch (action) {
      case 'finance.payment.create':
        return this.executeCreatePayment(payload);
      case 'finance.payment.confirm':
      case 'finance.payment.refund':
        return this.executePaymentStatus(payload.id, payload.status);
      case 'finance.payment.batch_status':
        for (const id of payload.ids || []) await this.executePaymentStatus(id, payload.status);
        return { count: payload.ids?.length || 0 };
      case 'finance.price_change':
        return this.executePriceChange(payload);
      case 'finance.commission_pay':
        return this.executePayCommission(payload.id);
      case 'finance.withdrawal_pay':
        return this.executePayWithdrawal(payload.id);
      case 'finance.batch_pay':
        for (const item of payload.items || []) {
          if (item.sourceType === 'commission') await this.executePayCommission(item.id);
          if (item.sourceType === 'withdrawal') await this.executePayWithdrawal(item.id);
        }
        return { count: payload.items?.length || 0 };
      case 'project.room.status':
        return this.executeRoomStatus(payload.id, payload.status);
      case 'project.room.batch_status':
        return this.executeRoomBatchStatus(payload);
      case 'project.room.lock':
        return this.executeRoomLock(payload.id, payload.lock);
      case 'project.room.confirm_sale':
        return this.executeRoomConfirmSale(payload.id);
      case 'transaction.change_room':
        return this.executeTransactionChangeRoom(payload.id, payload.newRoomId);
      case 'transaction.modify':
        return this.executeTransactionModify(payload.id, payload.data);
      case 'transaction.refund':
        return this.executeTransactionRefund(payload);
      case 'transaction.forfeit':
        return this.executeTransactionForfeit(payload);
      case 'transaction.rename':
        return this.executeTransactionRename(payload);
      case 'transaction.beneficiary.add':
        return this.executeBeneficiaryAdd(payload);
      case 'transaction.beneficiary.update':
        return this.executeBeneficiaryUpdate(payload);
      case 'transaction.beneficiary.delete':
        return this.executeBeneficiaryDelete(payload);
      case 'customer.assign_user':
        return this.executeAssignCustomerUser(payload.customerId, payload.userId);
      case 'customer.assign_distributor':
        return this.executeAssignCustomerDistributor(payload.customerId, payload.distributorId);
      case 'customer.public_pool':
        return this.executeCustomerPublicPool(payload.customerId);
      case 'customer.claim':
        return this.executeCustomerClaim(payload.customerId, payload.userId);
      case 'channel.partner.toggle':
        return this.executeChannelPartnerToggle(payload.id);
      case 'distributor.verify':
        return this.executeDistributorVerify(payload.id, payload.data);
      case 'distributor.toggle':
        return this.executeDistributorToggle(payload.id);
      case 'distributor.withdrawal_audit':
        return this.executeDistributorWithdrawalAudit(payload);
      case 'distributor.withdrawal_paid':
        return this.executePayWithdrawal(payload.id);
      case 'commission.audit':
        return this.executeCommissionAudit(payload);
      case 'commission.batch_audit':
        return this.executeCommissionBatchAudit(payload);
      case 'commission.pay':
        return this.executePayCommission(payload.id);
      default:
        throw new BadRequestException(`未配置审批执行动作：${action}`);
    }
  }

  private async executeCreatePayment(data: any) {
    const paymentDate = new Date(data.paymentDate);
    const record = await this.prisma.paymentRecord.create({
      data: {
        transactionId: data.transactionId,
        type: data.type,
        amount: Number(data.amount || 0),
        paymentDate,
        paymentMethod: data.paymentMethod,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        remark: data.remark,
        operator: data.operator,
        status: 1,
      },
    });

    await this.recalculateTransactionPaidAmount(data.transactionId);
    return record;
  }

  private async executePaymentStatus(id: string, status: number) {
    const record = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('付款记录不存在');
    if (![0, 1, 2].includes(Number(status))) throw new BadRequestException('付款状态不正确');

    const updated = await this.prisma.paymentRecord.update({ where: { id }, data: { status: Number(status) } });
    await this.recalculateTransactionPaidAmount(record.transactionId);
    return updated;
  }

  private async recalculateTransactionPaidAmount(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('成交记录不存在');

    const sum = await this.prisma.paymentRecord.aggregate({
      where: { transactionId, status: 1 },
      _sum: { amount: true },
    });
    const paidAmount = sum._sum.amount || 0;

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paidAmount,
        status: paidAmount >= transaction.totalPrice ? 1 : 0,
      },
    });
  }

  private async executePriceChange(data: any) {
    await this.prisma.transaction.update({
      where: { id: data.transactionId },
      data: { totalPrice: Number(data.newTotalPrice || 0) },
    });

    return this.prisma.priceChangeRecord.create({
      data: {
        transactionId: data.transactionId,
        changeType: data.changeType,
        oldPrice: Number(data.oldPrice || 0),
        oldTotalPrice: Number(data.oldTotalPrice || 0),
        newPrice: Number(data.newPrice || 0),
        newTotalPrice: Number(data.newTotalPrice || 0),
        diffAmount: Number(data.diffAmount || 0),
        reason: data.reason,
        operator: data.operator,
      },
    });
  }

  private async executePayCommission(id: string) {
    const commission = await this.prisma.commission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('佣金记录不存在');
    if (commission.status !== 1) throw new BadRequestException('只有待发放佣金才能付款');
    return this.prisma.commission.update({ where: { id }, data: { status: 2 } });
  }

  private async executePayWithdrawal(id: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException('提现记录不存在');
    if (withdrawal.status !== 1) throw new BadRequestException('只有审核通过的提现才能打款');
    return this.prisma.withdrawal.update({ where: { id }, data: { status: 2, paidTime: new Date() } });
  }

  private async executeRoomStatus(id: string, status: number) {
    return this.prisma.room.update({
      where: { id },
      data: { status: Number(status) },
    });
  }

  private async executeRoomBatchStatus(data: any) {
    const where: any = { buildingId: data.buildingId };
    if (Array.isArray(data.roomIds) && data.roomIds.length > 0) {
      where.id = { in: data.roomIds };
    }
    return this.prisma.room.updateMany({
      where,
      data: { status: Number(data.status) },
    });
  }

  private async executeRoomLock(id: string, lock: boolean) {
    return this.prisma.room.update({
      where: { id },
      data: { status: lock ? 2 : 0 },
    });
  }

  private async executeRoomConfirmSale(id: string) {
    return this.prisma.room.update({
      where: { id },
      data: { status: 1 },
    });
  }

  private async generateContractNo() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const count = await this.prisma.transaction.count({
      where: { createdAt: { gte: new Date(date.getFullYear(), 0, 1) } },
    });
    return `TX${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }

  private async executeTransactionChangeRoom(id: string, newRoomId: string) {
    const originalTransaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        room: true,
        customer: true,
        salesPerson: { select: { id: true, name: true } },
      },
    });
    if (!originalTransaction) throw new NotFoundException('原成交记录不存在');

    const newRoom = await this.prisma.room.findUnique({ where: { id: newRoomId } });
    if (!newRoom) throw new NotFoundException('新房间不存在');
    if (newRoom.status !== 0) throw new BadRequestException('该房间不可售');

    const contractNo = await this.generateContractNo();
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
        room: { include: { building: { include: { complex: true } } } },
        salesPerson: { select: { id: true, name: true } },
        channelPartner: true,
        distributor: true,
      },
    });

    await this.prisma.transaction.update({
      where: { id },
      data: { type: 'change_room', status: 2 },
    });

    return newTransaction;
  }

  private async executeTransactionModify(id: string, data: any) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('成交记录不存在');

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(data || {}),
        type: 'modify',
        operateDate: new Date(),
      },
      include: {
        customer: true,
        room: { include: { building: { include: { complex: true } } } },
        salesPerson: { select: { id: true, name: true } },
        channelPartner: true,
        distributor: true,
      },
    });
  }

  private async executeTransactionRefund(data: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.id },
      include: { room: true },
    });
    if (!transaction) throw new NotFoundException('成交记录不存在');

    await this.releaseTransactionRoom(transaction);
    return this.prisma.transaction.update({
      where: { id: data.id },
      data: {
        status: 3,
        type: 'refund',
        refundAmount: Number(data.refundAmount || 0),
        reason: data.reason,
        operateDate: new Date(),
      },
      include: {
        customer: true,
        room: { include: { building: { include: { complex: true } } } },
        salesPerson: { select: { id: true, name: true } },
        channelPartner: true,
        distributor: true,
      },
    });
  }

  private async executeTransactionForfeit(data: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.id },
      include: { room: true },
    });
    if (!transaction) throw new NotFoundException('成交记录不存在');

    await this.releaseTransactionRoom(transaction);
    return this.prisma.transaction.update({
      where: { id: data.id },
      data: {
        status: 4,
        type: 'forfeit',
        forfeitAmount: Number(data.forfeitAmount || 0),
        reason: data.reason,
        operateDate: new Date(),
      },
      include: {
        customer: true,
        room: { include: { building: { include: { complex: true } } } },
        salesPerson: { select: { id: true, name: true } },
        channelPartner: true,
        distributor: true,
      },
    });
  }

  private async releaseTransactionRoom(transaction: any) {
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
    await this.prisma.customer.update({
      where: { id: transaction.customerId },
      data: { status: 1 },
    });
  }

  private async executeTransactionRename(data: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.id },
      include: { customer: true, room: true },
    });
    if (!transaction) throw new NotFoundException('成交记录不存在');

    return this.prisma.transaction.update({
      where: { id: data.id },
      data: {
        originalCustomerName: data.originalCustomerName,
        renameDate: new Date(),
        renameReason: data.renameReason,
        type: 'modify',
        operateDate: new Date(),
      },
      include: {
        customer: true,
        room: { include: { building: { include: { complex: true } } } },
        salesPerson: { select: { id: true, name: true } },
        channelPartner: true,
        distributor: true,
        beneficiaries: true,
      },
    });
  }

  private async executeBeneficiaryAdd(data: any) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: data.transactionId } });
    if (!transaction) throw new NotFoundException('成交记录不存在');
    return this.prisma.beneficiary.create({
      data: {
        transactionId: data.transactionId,
        name: data.name,
        idCard: data.idCard,
        phone: data.phone,
        relation: data.relation,
        shareRatio: data.shareRatio,
        isPrimary: data.isPrimary || false,
      },
    });
  }

  private async executeBeneficiaryUpdate(data: any) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: data.beneficiaryId, transactionId: data.transactionId },
    });
    if (!beneficiary) throw new NotFoundException('权益人不存在');
    return this.prisma.beneficiary.update({
      where: { id: data.beneficiaryId },
      data: {
        name: data.name,
        idCard: data.idCard,
        phone: data.phone,
        relation: data.relation,
        shareRatio: data.shareRatio,
        isPrimary: data.isPrimary,
      },
    });
  }

  private async executeBeneficiaryDelete(data: any) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: data.beneficiaryId, transactionId: data.transactionId },
    });
    if (!beneficiary) throw new NotFoundException('权益人不存在');
    await this.prisma.beneficiary.delete({ where: { id: data.beneficiaryId } });
    return { message: '删除成功' };
  }

  private async executeAssignCustomerUser(customerId: string, userId: string) {
    await this.prisma.customerBelong.deleteMany({ where: { customerId, type: 'sales' } });
    return this.prisma.customerBelong.create({
      data: { customerId, userId, type: 'sales' },
    });
  }

  private async executeAssignCustomerDistributor(customerId: string, distributorId: string) {
    await this.prisma.customerBelong.deleteMany({ where: { customerId, type: 'distributor' } });
    return this.prisma.customerBelong.create({
      data: { customerId, distributorId, type: 'distributor' },
    });
  }

  private async executeCustomerPublicPool(customerId: string) {
    await this.prisma.customerBelong.deleteMany({ where: { customerId } });
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isPublic: true },
    });
  }

  private async executeCustomerClaim(customerId: string, userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.isPublic) throw new BadRequestException('该客户不在公共池中');
    await this.prisma.customerBelong.create({
      data: { customerId, userId, type: 'sales' },
    });
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isPublic: false },
    });
  }

  private async executeChannelPartnerToggle(id: string) {
    const partner = await this.prisma.channelPartner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('渠道合作伙伴不存在');
    return this.prisma.channelPartner.update({
      where: { id },
      data: { status: partner.status === 1 ? 0 : 1 },
    });
  }

  private async executeDistributorVerify(id: string, data: any) {
    return this.prisma.distributor.update({
      where: { id },
      data: {
        realName: data.realName,
        idCard: data.idCard,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        isVerified: true,
      },
    });
  }

  private async executeDistributorToggle(id: string) {
    const distributor = await this.prisma.distributor.findUnique({ where: { id } });
    if (!distributor) throw new NotFoundException('分销经纪人不存在');
    return this.prisma.distributor.update({
      where: { id },
      data: { status: distributor.status === 1 ? 0 : 1 },
    });
  }

  private async executeDistributorWithdrawalAudit(data: any) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: data.id } });
    if (!withdrawal) throw new NotFoundException('提现记录不存在');
    const status = data.action === 'approve' ? 1 : 3;
    return this.prisma.withdrawal.update({
      where: { id: data.id },
      data: {
        status,
        auditBy: data.userId,
        auditTime: new Date(),
        remark: data.remark,
      },
    });
  }

  private async executeCommissionAudit(data: any) {
    const commission = await this.prisma.commission.findUnique({ where: { id: data.id } });
    if (!commission) throw new NotFoundException('佣金记录不存在');
    const status = data.action === 'approve' ? 1 : 3;
    await this.prisma.commission.update({ where: { id: data.id }, data: { status } });
    await this.prisma.commissionAudit.create({
      data: {
        commissionId: data.id,
        userId: data.userId,
        action: data.action,
        comment: data.comment,
      },
    });
    return this.prisma.commission.findUnique({
      where: { id: data.id },
      include: { transaction: true, user: true, channelPartner: true, distributor: true },
    });
  }

  private async executeCommissionBatchAudit(data: any) {
    const ids = Array.isArray(data.ids) ? data.ids : [];
    const status = data.action === 'approve' ? 1 : 3;
    if (ids.length === 0) return { message: '没有需要审核的佣金', count: 0 };

    await this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    await this.prisma.commissionAudit.createMany({
      data: ids.map((id: string) => ({
        commissionId: id,
        userId: data.userId,
        action: data.action,
        comment: data.comment,
      })),
    });

    return { message: `批量审核成功，共处理${ids.length}条记录`, count: ids.length };
  }
}
