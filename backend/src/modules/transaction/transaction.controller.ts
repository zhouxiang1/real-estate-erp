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
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('transaction')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(
    private transactionService: TransactionService,
    private approvalService: ApprovalService,
  ) {}

  @Post()
  @Roles('admin', 'sales_manager', 'sales_consultant', 'office_staff')
  create(@Body() data: any) {
    return this.transactionService.create(data);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
    @Query('salesPersonId') salesPersonId?: string,
    @Query('channelPartnerId') channelPartnerId?: string,
    @Query('distributorId') distributorId?: string,
  ) {
    return this.transactionService.findAll(parseInt(page), parseInt(limit), {
      status: status !== undefined ? parseInt(status) : undefined,
      startDate,
      endDate,
      keyword,
      salesPersonId,
      channelPartnerId,
      distributorId,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.transactionService.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'sales_manager', 'office_staff')
  update(@Param('id') id: string, @Body() data: any) {
    return this.transactionService.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.transactionService.delete(id);
  }

  // ==================== 销售统计 ====================

  @Get('stats/sales')
  getSalesStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('salesPersonId') salesPersonId?: string,
  ) {
    return this.transactionService.getSalesStats({ startDate, endDate, salesPersonId });
  }

  // ==================== 业务操作 ====================

  // 换房
  @Post(':id/change-room')
  @Roles('admin', 'sales_manager', 'office_staff')
  changeRoom(@Param('id') id: string, @Body() data: { newRoomId: string }, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.change_room',
      title: '交易换房',
      module: '交易',
      action: 'transaction.change_room',
      businessType: 'transaction',
      businessId: id,
      payload: { id, newRoomId: data.newRoomId },
      summary: { 成交ID: id, 新房源ID: data.newRoomId },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.changeRoom(id, data.newRoomId));
  }

  // 改签
  @Put(':id/modify')
  @Roles('admin', 'sales_manager', 'office_staff')
  modify(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.modify',
      title: '交易改签',
      module: '交易',
      action: 'transaction.modify',
      businessType: 'transaction',
      businessId: id,
      payload: { id, data },
      summary: { 成交ID: id, 变更字段: Object.keys(data || {}) },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.modify(id, data));
  }

  // 退房
  @Put(':id/refund')
  @Roles('admin', 'sales_manager', 'office_staff')
  refund(@Param('id') id: string, @Body() data: { refundAmount?: number; reason?: string }, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.refund',
      title: '交易退房',
      module: '交易',
      action: 'transaction.refund',
      businessType: 'transaction',
      businessId: id,
      payload: { id, refundAmount: data.refundAmount, reason: data.reason },
      summary: { 成交ID: id, 退款金额: data.refundAmount || 0, 原因: data.reason },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.refund(id, data.refundAmount, data.reason));
  }

  // 挞定
  @Put(':id/forfeit')
  @Roles('admin', 'sales_manager', 'office_staff')
  forfeit(@Param('id') id: string, @Body() data: { forfeitAmount?: number; reason?: string }, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.forfeit',
      title: '交易挞定',
      module: '交易',
      action: 'transaction.forfeit',
      businessType: 'transaction',
      businessId: id,
      payload: { id, forfeitAmount: data.forfeitAmount, reason: data.reason },
      summary: { 成交ID: id, 挞定金额: data.forfeitAmount || 0, 原因: data.reason },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.forfeit(id, data.forfeitAmount, data.reason));
  }

  // ==================== 更名和权益人 ====================

  // 更名
  @Put(':id/rename')
  @Roles('admin', 'sales_manager', 'office_staff')
  rename(@Param('id') id: string, @Body() data: { originalCustomerName: string; renameReason?: string }, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.rename',
      title: '交易更名',
      module: '交易',
      action: 'transaction.rename',
      businessType: 'transaction',
      businessId: id,
      payload: { id, originalCustomerName: data.originalCustomerName, renameReason: data.renameReason },
      summary: { 成交ID: id, 原客户名: data.originalCustomerName, 原因: data.renameReason },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.rename(id, data.originalCustomerName, data.renameReason));
  }

  // 添加权益人
  @Post(':id/beneficiary')
  @Roles('admin', 'sales_manager', 'office_staff')
  addBeneficiary(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.beneficiary.add',
      title: '新增权益人',
      module: '交易',
      action: 'transaction.beneficiary.add',
      businessType: 'transaction',
      businessId: id,
      payload: { transactionId: id, ...data },
      summary: { 成交ID: id, 权益人: data?.name, 占比: data?.shareRatio },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.addBeneficiary(id, data));
  }

  // 更新权益人
  @Put(':id/beneficiary/:beneficiaryId')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateBeneficiary(
    @Param('id') id: string,
    @Param('beneficiaryId') beneficiaryId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.beneficiary.update',
      title: '修改权益人',
      module: '交易',
      action: 'transaction.beneficiary.update',
      businessType: 'transaction',
      businessId: id,
      payload: { transactionId: id, beneficiaryId, ...data },
      summary: { 成交ID: id, 权益人ID: beneficiaryId, 权益人: data?.name, 占比: data?.shareRatio },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.updateBeneficiary(id, beneficiaryId, data));
  }

  // 删除权益人
  @Delete(':id/beneficiary/:beneficiaryId')
  @Roles('admin', 'sales_manager', 'office_staff')
  deleteBeneficiary(@Param('id') id: string, @Param('beneficiaryId') beneficiaryId: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'transaction.beneficiary.delete',
      title: '删除权益人',
      module: '交易',
      action: 'transaction.beneficiary.delete',
      businessType: 'transaction',
      businessId: id,
      payload: { transactionId: id, beneficiaryId },
      summary: { 成交ID: id, 权益人ID: beneficiaryId },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.transactionService.deleteBeneficiary(id, beneficiaryId));
  }
}
