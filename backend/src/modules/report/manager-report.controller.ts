import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ManagerReportService } from './manager-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('report/manager')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagerReportController {
  constructor(private managerReportService: ManagerReportService) {}

  // 获取经营分析数据
  @Get('business')
  @Roles('admin', 'sales_manager')
  getBusinessAnalysis() {
    return this.managerReportService.getBusinessAnalysis();
  }

  // 获取认购排名
  @Get('subscribe-ranking')
  @Roles('admin', 'sales_manager')
  getSubscribeRanking(@Query('limit') limit?: string) {
    return this.managerReportService.getSubscribeRanking(limit ? parseInt(limit, 10) : 10);
  }

  // 获取团队业绩
  @Get('team-performance')
  @Roles('admin', 'sales_manager')
  getTeamPerformance() {
    return this.managerReportService.getTeamPerformance();
  }

  // 获取过程分析
  @Get('process')
  @Roles('admin', 'sales_manager')
  getProcessAnalysis() {
    return this.managerReportService.getProcessAnalysis();
  }

  // 获取楼栋排名
  @Get('building-ranking')
  @Roles('admin', 'sales_manager')
  getBuildingRanking(@Query('limit') limit?: string) {
    return this.managerReportService.getBuildingRanking(limit ? parseInt(limit, 10) : 10);
  }

  // 获取认购走势
  @Get('trend')
  @Roles('admin', 'sales_manager')
  getSubscribeTrend(@Query('days') days?: string) {
    return this.managerReportService.getSubscribeTrend(days ? parseInt(days, 10) : 30);
  }
}
