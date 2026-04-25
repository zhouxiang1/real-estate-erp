import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ApprovalService } from '../approval/approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(
    private financeService: FinanceService,
    private approvalService: ApprovalService,
  ) {}

  // ==================== 付款记录 ====================

  // 获取成交的付款记录列表
  @Get('payment/:transactionId')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getPaymentRecords(@Param('transactionId') transactionId: string) {
    return this.financeService.getPaymentRecordsByTransaction(transactionId);
  }

  // 添加付款记录
  @Post('payment')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  createPaymentRecord(
    @Request() req,
    @Body()
    data: {
      transactionId: string;
      type: string;
      amount: number;
      paymentDate: string;
      paymentMethod?: string;
      bankAccount?: string;
      bankName?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.payment.create',
        title: `收款登记：${data.amount}`,
        module: '财务',
        action: 'finance.payment.create',
        businessType: 'payment',
        businessId: data.transactionId,
        payload: data,
        summary: {
          type: data.type,
          amount: data.amount,
          paymentDate: data.paymentDate,
          operator: data.operator,
        },
        requester: req.user,
      },
      () => this.financeService.createPaymentRecord({
        ...data,
        paymentDate: new Date(data.paymentDate),
      }),
    );
  }

  // 更新付款记录状态
  @Put('payment/:id/status')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  updatePaymentStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: number,
  ) {
    const nextStatus = Number(status);
    const workflowKey = nextStatus === 2 ? 'finance.payment.refund' : 'finance.payment.confirm';
    const title = nextStatus === 2 ? '收款退款确认' : '收款确认';

    if (![1, 2].includes(nextStatus)) {
      return this.financeService.updatePaymentStatus(id, nextStatus);
    }

    return this.approvalService.submitOrExecute(
      {
        workflowKey,
        title,
        module: '财务',
        action: workflowKey,
        businessType: 'payment',
        businessId: id,
        payload: { id, status: nextStatus },
        summary: { status: nextStatus },
        requester: req.user,
      },
      () => this.financeService.updatePaymentStatus(id, nextStatus),
    );
  }

  // 删除付款记录
  @Delete('payment/:id')
  @Roles('admin', 'office_staff', 'finance_staff')
  deletePaymentRecord(@Param('id') id: string) {
    return this.financeService.deletePaymentRecord(id);
  }

  // 批量更新付款状态
  @Put('payment/batch-status')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  batchUpdatePaymentStatus(
    @Request() req,
    @Body() body: { ids: string[]; status: number },
  ) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.payment.batch_status',
        title: `批量收款状态变更（${body.ids?.length || 0}笔）`,
        module: '财务',
        action: 'finance.payment.batch_status',
        businessType: 'payment_batch',
        payload: body,
        summary: { count: body.ids?.length || 0, status: body.status },
        requester: req.user,
      },
      () => this.financeService.batchUpdatePaymentStatus(body.ids, body.status),
    );
  }

  // ==================== 价格变更记录 ====================

  // 获取成交的价格变更记录
  @Get('price-change/:transactionId')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getPriceChangeRecords(@Param('transactionId') transactionId: string) {
    return this.financeService.getPriceChangeRecords(transactionId);
  }

  // 创建价格变更记录
  @Post('price-change')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  createPriceChangeRecord(
    @Request() req,
    @Body()
    data: {
      transactionId: string;
      changeType: string;
      oldPrice: number;
      oldTotalPrice: number;
      newPrice: number;
      newTotalPrice: number;
      diffAmount: number;
      reason?: string;
      operator?: string;
    },
  ) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.price_change',
        title: `价格变更：${data.diffAmount >= 0 ? '+' : ''}${data.diffAmount}`,
        module: '财务',
        action: 'finance.price_change',
        businessType: 'price_change',
        businessId: data.transactionId,
        payload: data,
        summary: {
          changeType: data.changeType,
          oldTotalPrice: data.oldTotalPrice,
          newTotalPrice: data.newTotalPrice,
          diffAmount: data.diffAmount,
          reason: data.reason,
        },
        requester: req.user,
      },
      () => this.financeService.createPriceChangeRecord(data),
    );
  }

  // ==================== 财务统计 ====================

  // 获取成交的完整财务信息
  @Get('summary/:transactionId')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getTransactionFinanceSummary(@Param('transactionId') transactionId: string) {
    return this.financeService.getTransactionFinanceSummary(transactionId);
  }

  // 获取财务列表
  @Get('list')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getFinanceList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.financeService.getFinanceList({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      complexId,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      startDate,
      endDate,
      keyword,
    });
  }

  // 获取财务统计
  @Get('stats')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getFinanceStats(
    @Query('complexId') complexId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getFinanceStats({ complexId, startDate, endDate });
  }

  // 获取资金流水
  @Get('cash-flow')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getCashFlow(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: 'in' | 'out',
    @Query('category') category?: string,
    @Query('complexId') complexId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.financeService.getCashFlow({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      direction,
      category,
      complexId,
      startDate,
      endDate,
      keyword,
    });
  }

  // 获取待付款/付款权限列表
  @Get('payables')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getPayables(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: 'commission' | 'withdrawal',
    @Query('complexId') complexId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.financeService.getPayables({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      sourceType,
      complexId,
      keyword,
    });
  }

  // 财务确认佣金付款
  @Put('payables/commission/:id/pay')
  @Roles('admin', 'finance_staff')
  payCommission(@Param('id') id: string, @Request() req) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.commission_pay',
        title: '佣金付款确认',
        module: '财务',
        action: 'finance.commission_pay',
        businessType: 'commission',
        businessId: id,
        payload: { id },
        summary: { id },
        requester: req.user,
      },
      () => this.financeService.payCommission(id),
    );
  }

  // 财务确认提现打款
  @Put('payables/withdrawal/:id/pay')
  @Roles('admin', 'finance_staff')
  payWithdrawal(@Param('id') id: string, @Request() req) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.withdrawal_pay',
        title: '提现打款确认',
        module: '财务',
        action: 'finance.withdrawal_pay',
        businessType: 'withdrawal',
        businessId: id,
        payload: { id },
        summary: { id },
        requester: req.user,
      },
      () => this.financeService.payWithdrawal(id),
    );
  }

  // 批量确认付款
  @Put('payables/batch-pay')
  @Roles('admin', 'finance_staff')
  batchPayPayables(
    @Request() req,
    @Body() body: { items: Array<{ sourceType: 'commission' | 'withdrawal'; id: string }> },
  ) {
    return this.approvalService.submitOrExecute(
      {
        workflowKey: 'finance.batch_pay',
        title: `批量付款确认（${body.items?.length || 0}笔）`,
        module: '财务',
        action: 'finance.batch_pay',
        businessType: 'payable_batch',
        payload: body,
        summary: { count: body.items?.length || 0 },
        requester: req.user,
      },
      () => this.financeService.batchPayPayables(body.items),
    );
  }

  // 应收催款列表
  @Get('receivables')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getReceivables(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('complexId') complexId?: string,
    @Query('agingBucket') agingBucket?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.financeService.getReceivables({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      complexId,
      agingBucket,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      keyword,
    });
  }

  // 收款确认队列
  @Get('payment-queue')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getPaymentQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('complexId') complexId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.financeService.getPaymentQueue({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      type,
      complexId,
      startDate,
      endDate,
      keyword,
    });
  }

  // 财务对账汇总
  @Get('reconciliation')
  @Roles('admin', 'sales_manager', 'office_staff', 'finance_staff')
  getReconciliation(
    @Query('complexId') complexId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getReconciliation({ complexId, startDate, endDate });
  }
}
