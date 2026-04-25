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
  Req,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(
    private customerService: CustomerService,
    private approvalService: ApprovalService,
  ) {}

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.customerService.create(data, req.user);
  }

  // 查重检查
  @Get('check')
  checkDuplicate(@Query('phone') phone?: string, @Query('name') name?: string) {
    return this.customerService.checkDuplicate(phone, name);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('source') source?: string,
    @Query('keyword') keyword?: string,
    @Query('userId') userId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('isPublic') isPublic?: string,
    @Request() req?: any,
  ) {
    // 根据用户角色自动过滤
    const userRole = req?.user?.roleCode;
    const currentUserId = req?.user?.id;

    // 销售经理和管理员可以看到所有客户，置业顾问只能看自己和公共池
    let autoUserId = userId;
    if (userRole === 'sales_consultant' && !userId && !isPublic) {
      // 置业顾问默认只看自己的客户
      autoUserId = currentUserId;
    }

    return this.customerService.findAll(parseInt(page), parseInt(limit), {
      status: status !== undefined ? parseInt(status) : undefined,
      level,
      source,
      keyword,
      userId: autoUserId,
      distributorId,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.customerService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.customerService.update(id, data);
  }

  @Delete(':id')
  @Roles('admin', 'sales_manager')
  delete(@Param('id') id: string) {
    return this.customerService.delete(id);
  }

  // ==================== 客户跟进 ====================

  @Post(':id/followup')
  createFollowup(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.customerService.createFollowup({
      ...data,
      customerId: id,
      userId: req.user.id,
    });
  }

  @Get(':id/followups')
  findFollowups(@Param('id') id: string) {
    return this.customerService.findFollowups(id);
  }

  @Delete('followup/:id')
  deleteFollowup(@Param('id') id: string) {
    return this.customerService.deleteFollowup(id);
  }

  // ==================== 客户归属 ====================

  @Post(':id/assign-user')
  @Roles('admin', 'sales_manager')
  assignToUser(@Param('id') id: string, @Body('userId') userId: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'customer.assign_user',
      title: '客户转派',
      module: '客户',
      action: 'customer.assign_user',
      businessType: 'customer',
      businessId: id,
      payload: { customerId: id, userId },
      summary: { 客户ID: id, 目标顾问ID: userId },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.customerService.assignToUser(id, userId));
  }

  @Post(':id/assign-distributor')
  assignToDistributor(
    @Param('id') id: string,
    @Body('distributorId') distributorId: string,
    @Request() req: any,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'customer.assign_distributor',
      title: '客户分销归属变更',
      module: '客户',
      action: 'customer.assign_distributor',
      businessType: 'customer',
      businessId: id,
      payload: { customerId: id, distributorId },
      summary: { 客户ID: id, 分销经纪人ID: distributorId },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.customerService.assignToDistributor(id, distributorId));
  }

  // ==================== 客户统计 ====================

  @Get('stats/count')
  getCustomerStats(@Query('userId') userId?: string, @Req() req?: any) {
    // 置业顾问只能看自己的客户统计
    const userRole = req?.user?.roleCode;
    const currentUserId = req?.user?.id;

    let autoUserId = userId;
    if (userRole === 'sales_consultant' && !userId) {
      autoUserId = currentUserId;
    }

    return this.customerService.getCustomerStats(autoUserId);
  }

  // ==================== 公共池 ====================

  // 获取公共池客户列表
  @Get('public-pool/list')
  getPublicPoolCustomers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.customerService.getPublicPoolCustomers(parseInt(page), parseInt(limit));
  }

  // 将客户移入公共池
  @Post(':id/to-public-pool')
  moveToPublicPool(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'customer.public_pool',
      title: '客户移入公客池',
      module: '客户',
      action: 'customer.public_pool',
      businessType: 'customer',
      businessId: id,
      payload: { customerId: id },
      summary: { 客户ID: id, 操作: '移入公客池' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.customerService.moveToPublicPool(id));
  }

  // 从公共池认领客户
  @Post(':id/claim')
  claimFromPublicPool(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.approvalService.submitOrExecute({
      workflowKey: 'customer.claim',
      title: '公客认领',
      module: '客户',
      action: 'customer.claim',
      businessType: 'customer',
      businessId: id,
      payload: { customerId: id, userId },
      summary: { 客户ID: id, 认领人ID: userId },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.customerService.claimFromPublicPool(id, userId));
  }

  // 检查并移入公共池（定时任务）
  @Post('check-public-pool')
  checkAndMoveToPublicPool() {
    return this.customerService.checkAndMoveToPublicPool();
  }
}
