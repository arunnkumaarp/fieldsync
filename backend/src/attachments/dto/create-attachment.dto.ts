import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class CreateAttachmentDto {
  @IsUUID()
  submissionId: string;

  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsOptional()
  @IsString()
  localUri?: string;
}
