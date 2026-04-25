import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('commission')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
  constructor(
    private commissionService: CommissionService,
    private approvalService: ApprovalService,
  ) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('channelPartnerId') channelPartnerId?: string,
    @Query('distributorId') distributorId?: string,
  ) {
    return this.commissionService.findAll(parseInt(page), parseInt(limit), {
      status: status !== undefined ? parseInt(status) : undefined,
      type,
      userId,
      channelPartnerId,
      distributorId,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.commissionService.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'sales_manager')
  update(@Param('id') id: string, @Body() data: any) {
    return this.commissionService.update(id, data);
  }

  @Post(':id/audit')
  @Roles('admin', 'sales_manager', 'risk_controller')
  audit(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; comment?: string },
    @Request() req,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'commission.audit',
      title: body.action === 'approve' ? '佣金审核通过' : '佣金审核拒绝',
      module: '佣金',
      action: 'commission.audit',
      businessType: 'commission',
      businessId: id,
      payload: { id, userId: req.user.id, action: body.action, comment: body.comment },
      summary: { 佣金ID: id, 审核动作: body.action, 备注: body.comment },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.commissionService.audit(id, req.user.id, body.action, body.comment));
  }

  @Post('batch-audit')
  @Roles('admin', 'sales_manager', 'risk_controller')
  batchAudit(
    @Body() body: { ids: string[]; action: 'approve' | 'reject'; comment?: string },
    @Request() req,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'commission.batch_audit',
      title: '批量佣金审核',
      module: '佣金',
      action: 'commission.batch_audit',
      businessType: 'commission',
      payload: { ids: body.ids || [], userId: req.user.id, action: body.action, comment: body.comment },
      summary: { 佣金数量: body.ids?.length || 0, 审核动作: body.action, 备注: body.comment },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.commissionService.batchAudit(body.ids, req.user.id, body.action, body.comment));
  }

  @Put(':id/pay')
  @Roles('admin', 'sales_manager')
  pay(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'commission.pay',
      title: '佣金发放',
      module: '佣金',
      action: 'commission.pay',
      businessType: 'commission',
      businessId: id,
      payload: { id },
      summary: { 佣金ID: id, 操作: '发放佣金' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.commissionService.pay(id));
  }

  // ==================== 佣金统计 ====================

  @Get('stats/commission')
  getCommissionStats(
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('channelPartnerId') channelPartnerId?: string,
    @Query('distributorId') distributorId?: string,
  ) {
    return this.commissionService.getCommissionStats({
      type,
      userId,
      channelPartnerId,
      distributorId,
    });
  }
}
