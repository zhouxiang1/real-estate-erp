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
  Req,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalService } from '../approval/approval.service';

@Controller('project')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private approvalService: ApprovalService,
  ) {}

  // ==================== 楼盘管理 ====================

  @Post('complex')
  @Roles('admin', 'sales_manager', 'office_staff')
  createBuildingComplex(@Body() data: any) {
    return this.projectService.createBuildingComplex(data);
  }

  @Get('complex')
  findAllBuildingComplex(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('keyword') keyword?: string,
  ) {
    return this.projectService.findAllBuildingComplex(
      parseInt(page),
      parseInt(limit),
      keyword,
    );
  }

  @Get('complex/:id')
  findBuildingComplexById(@Param('id') id: string) {
    return this.projectService.findBuildingComplexById(id);
  }

  @Put('complex/:id')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateBuildingComplex(@Param('id') id: string, @Body() data: any) {
    return this.projectService.updateBuildingComplex(id, data);
  }

  @Delete('complex/:id')
  @Roles('admin')
  deleteBuildingComplex(@Param('id') id: string) {
    return this.projectService.deleteBuildingComplex(id);
  }

  // ==================== 楼栋管理 ====================

  @Post('building')
  @Roles('admin', 'sales_manager', 'office_staff')
  createBuilding(@Body() data: any) {
    return this.projectService.createBuilding(data);
  }

  @Get('building')
  findBuildingsByComplex(@Query('complexId') complexId: string) {
    return this.projectService.findBuildingsByComplex(complexId);
  }

  @Put('building/:id')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateBuilding(@Param('id') id: string, @Body() data: any) {
    return this.projectService.updateBuilding(id, data);
  }

  @Delete('building/:id')
  @Roles('admin')
  deleteBuilding(@Param('id') id: string) {
    return this.projectService.deleteBuilding(id);
  }

  // ==================== 房源管理 ====================

  @Post('room')
  @Roles('admin', 'sales_manager', 'office_staff')
  createRoom(@Body() data: any) {
    return this.projectService.createRoom(data);
  }

  @Post('room/batch')
  @Roles('admin', 'sales_manager', 'office_staff')
  createRoomsBatch(@Body() data: any[]) {
    return this.projectService.createRoomsBatch(data);
  }

  // 导出房源模板 - 放在 :id 路由之前
  @Get('room/export-template/:buildingId')
  exportRoomTemplate(@Param('buildingId') buildingId: string) {
    return this.projectService.exportRoomTemplate(buildingId);
  }

  // 导入房源数据 - 放在 :id 路由之前
  @Post('room/import')
  importRooms(@Body() body: { buildingId: string; data: any[] }) {
    return this.projectService.importRooms(body.buildingId, body.data);
  }

  @Get('room')
  findRooms(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('buildingId') buildingId?: string,
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('floor') floor?: string,
    @Query('keyword') keyword?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.roleCode;

    // 销售经理、admin、内勤可以看到所有房源
    const isManager = ['admin', 'sales_manager', 'office_staff', 'finance_staff'].includes(userRole);

    return this.projectService.findRooms(parseInt(page), parseInt(limit), {
      buildingId,
      complexId,
      status: status !== undefined ? parseInt(status) : undefined,
      floor: floor ? parseInt(floor) : undefined,
      keyword,
      userId: isManager ? undefined : userId, // 非管理人员需要过滤
    });
  }

  @Get('room/:id')
  findRoomById(@Param('id') id: string, @Req() req?: any) {
    const userId = req?.user?.id;
    const userRole = req?.user?.roleCode;
    const isManager = ['admin', 'sales_manager', 'office_staff', 'finance_staff'].includes(userRole);

    return this.projectService.findRoomById(id, isManager ? undefined : userId);
  }

  @Put('room/:id')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateRoom(@Param('id') id: string, @Body() data: any) {
    return this.projectService.updateRoom(id, data);
  }

  @Put('room/:id/status')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateRoomStatus(@Param('id') id: string, @Body('status') status: number, @Req() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'project.room.status',
      title: '房源状态变更',
      module: '销控',
      action: 'project.room.status',
      businessType: 'room',
      businessId: id,
      payload: { id, status },
      summary: { 房源ID: id, 目标状态: status },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.projectService.updateRoomStatus(id, status));
  }

  @Delete('room/:id')
  @Roles('admin')
  deleteRoom(@Param('id') id: string) {
    return this.projectService.deleteRoom(id);
  }

  // 批量更新房源状态
  @Put('room/batch-status')
  @Roles('admin', 'sales_manager', 'office_staff')
  updateRoomsStatus(
    @Body() body: { buildingId: string; status: number; roomIds?: string[] },
    @Req() req: any,
  ) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'project.room.batch_status',
      title: '批量房源状态变更',
      module: '销控',
      action: 'project.room.batch_status',
      businessType: 'room',
      businessId: body.buildingId,
      payload: body,
      summary: { 楼栋ID: body.buildingId, 目标状态: body.status, 房源数: body.roomIds?.length || '整栋' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.projectService.updateRoomsStatus(body.buildingId, body.status, body.roomIds));
  }

  // 获取房源统计
  @Get('room-stats')
  getRoomStats(@Query('complexId') complexId?: string, @Req() req?: any) {
    const userId = req?.user?.id;
    const userRole = req?.user?.roleCode;
    const isManager = ['admin', 'sales_manager', 'office_staff', 'finance_staff'].includes(userRole);
    return this.projectService.getRoomStats(complexId, isManager ? undefined : userId);
  }

  // ==================== 销控管理 ====================

  @Put('room/:id/lock')
  @Roles('admin', 'sales_manager', 'office_staff')
  lockRoom(@Param('id') id: string, @Body('lock') lock: boolean, @Req() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'project.room.lock',
      title: lock ? '房源锁定' : '房源解锁',
      module: '销控',
      action: 'project.room.lock',
      businessType: 'room',
      businessId: id,
      payload: { id, lock },
      summary: { 房源ID: id, 操作: lock ? '锁定' : '解锁' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.projectService.lockRoom(id, lock));
  }

  @Put('room/:id/confirm-sale')
  @Roles('admin', 'sales_manager', 'office_staff')
  confirmSale(@Param('id') id: string, @Req() req: any) {
    return this.approvalService.submitOrExecute({
      workflowKey: 'project.room.confirm_sale',
      title: '房源成交确认',
      module: '销控',
      action: 'project.room.confirm_sale',
      businessType: 'room',
      businessId: id,
      payload: { id },
      summary: { 房源ID: id, 操作: '成交确认' },
      requester: { id: req.user.id, roleCode: req.user.roleCode },
    }, () => this.projectService.confirmSale(id));
  }

  // 获取销控表
  @Get('inventory/:complexId')
  getInventory(@Param('complexId') complexId: string) {
    return this.projectService.getInventory(complexId);
  }
}
