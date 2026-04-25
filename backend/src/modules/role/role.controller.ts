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
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @Roles('admin')
  findAll(@Query('keyword') keyword?: string) {
    return this.roleService.findAll(keyword);
  }

  @Get('permissions')
  @Roles('admin')
  getAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() data: { name: string; code: string; description?: string; permissions?: string[] }) {
    return this.roleService.create(data);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() data: { name?: string; code?: string; description?: string; permissions?: string[] }) {
    return this.roleService.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}
