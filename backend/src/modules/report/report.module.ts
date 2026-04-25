import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ManagerReportController } from './manager-report.controller';
import { ManagerReportService } from './manager-report.service';

@Module({
  controllers: [ReportController, ManagerReportController],
  providers: [ReportService, ManagerReportService],
  exports: [ReportService, ManagerReportService],
})
export class ReportModule {}
