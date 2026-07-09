import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { SignedUrlRequestDto } from './dto/signed-url-request.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  createUploadUrl(dto: SignedUrlRequestDto) {
    return this.s3.createUploadUrl(dto.contentType, dto.extension);
  }

  async findOne(orgId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, deletedAt: null, submission: { job: { orgId } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async create(orgId: string, dto: CreateAttachmentDto) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: dto.submissionId, deletedAt: null, job: { orgId } },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    return this.prisma.attachment.create({
      data: {
        submissionId: dto.submissionId,
        type: dto.type,
        localUri: dto.localUri,
      },
    });
  }

  async attachRemoteUrl(orgId: string, id: string, remoteUrl: string) {
    await this.findOne(orgId, id);
    return this.prisma.attachment.update({
      where: { id },
      data: { remoteUrl, lastModified: new Date() },
    });
  }
}
