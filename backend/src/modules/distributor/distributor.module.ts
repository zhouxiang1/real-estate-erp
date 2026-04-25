import { Module } from '@nestjs/common';
import { DistributorService } from './distributor.service';
import { DistributorController } from './distributor.controller';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [ApprovalModule],
  providers: [DistributorService],
  controllers: [DistributorController],
  exports: [DistributorService],
})
export class DistributorModule {}
