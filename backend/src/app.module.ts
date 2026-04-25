import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { DepartmentModule } from './modules/department/department.module';
import { ProjectModule } from './modules/project/project.module';
import { CustomerModule } from './modules/customer/customer.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { CommissionModule } from './modules/commission/commission.module';
import { ChannelModule } from './modules/channel/channel.module';
import { DistributorModule } from './modules/distributor/distributor.module';
import { ReportModule } from './modules/report/report.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ApprovalModule } from './modules/approval/approval.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    RoleModule,
    DepartmentModule,
    ProjectModule,
    CustomerModule,
    TransactionModule,
    CommissionModule,
    ChannelModule,
    DistributorModule,
    ReportModule,
    ApprovalModule,
    FinanceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
