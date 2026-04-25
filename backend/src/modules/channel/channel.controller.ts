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
import { ChannelService } from './channel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('channel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChannelController {
  constructor(
    private channelService: ChannelService,
    private approvalService: ApprovalService,
  ) {}

  // ==================== 渠道合作伙伴 ====================

  @Post('partner')
  @Roles('admin', 'sales_manager', 'channel_manager')
  createPartner(@Body() data: any) {
    return this.channelService.createPartner(data);
  }

  @Get('partner')
  findAllPartners(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.channelService.findAllPartners(parseInt(page), parseInt(limit), {
      type,
      status: status !== undefined ? parseInt(status) : undefined,
      keyword,
    });
  }

  @Get('partner/:id')
  findPartnerById(@Param('id') id: string) {
    return this.channelService.findPartnerById(id);
  }

  @Put('partner/:id')
  @Roles('admin', 'sales_manager', 'channel_manager')
  updatePartner(@Param('id') id: string, @Body() data: any) {
    return this.channelService.updatePartner(id, data);
  }

  @Delete('partner/:id')
  @Roles('admin')
  deletePartner(@Param('id') id: string) {
    return this.channelService.deletePartner(id);
  }

  @Put('partner/:id/toggle')
  @Roles('admin', 'sales_manager')
  togglePartnerStatus(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'channel.partner.toggle',
      title: '渠道合作伙伴启停',
      module: '渠道',
      action: 'channel.partner.toggle',
      businessType: 'channelPartner',
      businessId: id,
      payload: { id },
      summary: { 渠道ID: id, 操作: '启用/停用' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.channelService.togglePartnerStatus(id));
  }

  // ==================== 渠道统计 ====================

  @Get('partner/:id/stats')
  getPartnerStats(@Param('id') id: string) {
    return this.channelService.getPartnerStats(id);
  }

  // ==================== 异常交易监控 ====================

  @Get('anomalies')
  @Roles('admin', 'sales_manager', 'risk_controller')
  getAnomalies(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.channelService.getAnomalies({ startDate, endDate });
  }
}
