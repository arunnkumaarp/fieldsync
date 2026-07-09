import { IsObject, IsUUID } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  jobId: string;

  @IsObject()
  data: Record<string, unknown>;
}
