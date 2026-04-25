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
import { DistributorService } from './distributor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('distributor')
export class DistributorController {
  constructor(
    private distributorService: DistributorService,
    private approvalService: ApprovalService,
  ) {}

  // ==================== 经纪人注册 ====================

  @Post('register')
  register(@Body() data: any) {
    return this.distributorService.register(data);
  }

  // ==================== 经纪人管理 ====================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('isVerified') isVerified?: string,
    @Query('keyword') keyword?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.distributorService.findAll(parseInt(page), parseInt(limit), {
      status: status !== undefined ? parseInt(status) : undefined,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      keyword,
      parentId,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.distributorService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.distributorService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.distributorService.delete(id);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales_manager')
  toggleStatus(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'distributor.toggle',
      title: '分销经纪人启停',
      module: '渠道',
      action: 'distributor.toggle',
      businessType: 'distributor',
      businessId: id,
      payload: { id },
      summary: { 经纪人ID: id, 操作: '启用/停用' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.distributorService.toggleStatus(id));
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales_manager')
  verify(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'distributor.verify',
      title: '分销经纪人实名认证',
      module: '渠道',
      action: 'distributor.verify',
      businessType: 'distributor',
      businessId: id,
      payload: { id, data },
      summary: { 经纪人ID: id, 实名: data?.realName, 开户行: data?.bankName },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.distributorService.verify(id, data));
  }

  // ==================== 推荐客户 ====================

  @Post(':id/recommend')
  @UseGuards(JwtAuthGuard)
  recommendCustomer(@Param('id') id: string, @Body() data: any) {
    return this.distributorService.recommendCustomer(id, data);
  }

  @Get(':id/recommendations')
  @UseGuards(JwtAuthGuard)
  findRecommendedCustomers(@Param('id') id: string) {
    return this.distributorService.findRecommendedCustomers(id);
  }

  // ==================== 提现管理 ====================

  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  createWithdrawal(@Param('id') id: string, @Body() data: any) {
    return this.distributorService.createWithdrawal(id, data);
  }

  @Get(':id/withdrawals')
  @UseGuards(JwtAuthGuard)
  findWithdrawals(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.distributorService.findWithdrawals(id, parseInt(page), parseInt(limit));
  }

  @Post('withdrawal/:id/audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales_manager', 'risk_controller')
  auditWithdrawal(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; remark?: string },
    @Request() req,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'distributor.withdrawal_audit',
      title: body.action === 'approve' ? '提现审核通过' : '提现审核拒绝',
      module: '渠道',
      action: 'distributor.withdrawal_audit',
      businessType: 'withdrawal',
      businessId: id,
      payload: { id, userId: req.user.id, action: body.action, remark: body.remark },
      summary: { 提现ID: id, 审核动作: body.action, 备注: body.remark },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.distributorService.auditWithdrawal(id, req.user.id, body.action, body.remark));
  }

  @Put('withdrawal/:id/paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales_manager')
  paidWithdrawal(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'distributor.withdrawal_paid',
      title: '提现打款确认',
      module: '渠道',
      action: 'distributor.withdrawal_paid',
      businessType: 'withdrawal',
      businessId: id,
      payload: { id },
      summary: { 提现ID: id, 操作: '标记已打款' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.distributorService.paidWithdrawal(id));
  }

  // ==================== 经纪人统计 ====================

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  getDistributorStats(@Param('id') id: string) {
    return this.distributorService.getDistributorStats(id);
  }

  // 我的团队
  @Get(':id/team')
  @UseGuards(JwtAuthGuard)
  getMyTeam(@Param('id') id: string) {
    return this.distributorService.getMyTeam(id);
  }
}
