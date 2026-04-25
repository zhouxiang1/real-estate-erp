import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('approval')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Get('actions')
  @Roles('admin')
  getActions() {
    return this.approvalService.getActions();
  }

  @Get('workflows')
  @Roles('admin')
  listWorkflows(
    @Query('keyword') keyword?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.approvalService.listWorkflows({
      keyword,
      enabled: enabled === undefined ? undefined : enabled === 'true',
    });
  }

  @Put('workflows/:id')
  @Roles('admin')
  updateWorkflow(@Param('id') id: string, @Body() data: any) {
    return this.approvalService.updateWorkflow(id, data);
  }

  @Put('workflows/:id/enabled')
  @Roles('admin')
  setWorkflowEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.approvalService.setWorkflowEnabled(id, enabled);
  }

  @Get('requests')
  @Roles('admin', 'sales_manager', 'sales_consultant', 'finance_staff', 'risk_controller', 'office_staff', 'channel_manager', 'receptionist', 'distributor')
  listRequests(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('workflowKey') workflowKey?: string,
    @Query('mine') mine?: string,
    @Query('scope') scope?: 'todo' | 'mine' | 'all',
  ) {
    return this.approvalService.listRequests({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      workflowKey,
      mine: mine === 'true',
      scope,
      user: req.user,
    });
  }

  @Get('requests/:id')
  @Roles('admin', 'sales_manager', 'sales_consultant', 'finance_staff', 'risk_controller', 'office_staff', 'channel_manager', 'receptionist', 'distributor')
  findRequest(@Param('id') id: string, @Request() req) {
    return this.approvalService.findRequest(id, req.user);
  }

  @Post('requests/:id/approve')
  @Roles('sales_manager', 'finance_staff', 'risk_controller', 'office_staff', 'channel_manager')
  approve(@Param('id') id: string, @Request() req, @Body('comment') comment?: string) {
    return this.approvalService.approve(id, req.user, comment);
  }

  @Post('requests/:id/reject')
  @Roles('sales_manager', 'finance_staff', 'risk_controller', 'office_staff', 'channel_manager')
  reject(@Param('id') id: string, @Request() req, @Body('comment') comment?: string) {
    return this.approvalService.reject(id, req.user, comment);
  }
}
