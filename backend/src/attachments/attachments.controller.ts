import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { SignedUrlRequestDto } from './dto/signed-url-request.dto';
import { IsUrl } from 'class-validator';

class AttachRemoteUrlDto {
  @IsUrl({ require_tld: false })
  remoteUrl: string;
}

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('signed-url')
  createSignedUrl(@Body() dto: SignedUrlRequestDto) {
    return this.attachmentsService.createUploadUrl(dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attachmentsService.findOne(user.orgId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAttachmentDto) {
    return this.attachmentsService.create(user.orgId, dto);
  }

  @Patch(':id/remote-url')
  attachRemoteUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AttachRemoteUrlDto,
  ) {
    return this.attachmentsService.attachRemoteUrl(user.orgId, id, dto.remoteUrl);
  }
}
