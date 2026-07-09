import { IsObject, IsOptional } from 'class-validator';

export class UpdateSubmissionDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
