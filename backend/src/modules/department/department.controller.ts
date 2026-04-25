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
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  @Get()
  @Roles('admin', 'sales_manager', 'office_staff')
  findAll() {
    return this.departmentService.findAll();
  }

  @Get('tree')
  @Roles('admin', 'sales_manager', 'office_staff')
  findTree() {
    return this.departmentService.findTree();
  }

  @Get('select')
  @Roles('admin', 'sales_manager', 'office_staff')
  getAllForSelect() {
    return this.departmentService.getAllForSelect();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.departmentService.findById(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() data: { name: string; parentId?: string; sort?: number }) {
    return this.departmentService.create(data);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() data: { name?: string; parentId?: string | null; sort?: number }) {
    return this.departmentService.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.departmentService.delete(id);
  }
}
