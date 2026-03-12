import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.auditService.listForUser(user.sub);
  }

  @Delete('me')
  clearMine(@CurrentUser() user: JwtPayload) {
    return this.auditService.clearForUser(user.sub);
  }

  @Delete('me/:id')
  clearOneMine(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.auditService.clearOneForUser(user.sub, id);
  }
}
