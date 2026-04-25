import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('report')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private reportService: ReportService) {}

  // 获取楼盘销售报表
  @Get('sales')
  @Roles('admin', 'sales_manager', 'office_staff')
  getSalesReport(
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
  ) {
    const statusArray = status ? status.split(',').map((s) => parseInt(s, 10)) : undefined;
    return this.reportService.getSalesReport({
      complexId,
      status: statusArray,
      startDate,
      endDate,
      keyword,
    });
  }

  // 导出楼盘销售报表
  @Get('sales/export')
  @Roles('admin', 'sales_manager', 'office_staff')
  exportSalesReport(
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
  ) {
    const statusArray = status ? status.split(',').map((s) => parseInt(s, 10)) : undefined;
    return this.reportService.exportSalesReport({
      complexId,
      status: statusArray,
      startDate,
      endDate,
      keyword,
    });
  }
}
