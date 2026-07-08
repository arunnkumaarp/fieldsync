import { IsObject } from 'class-validator';

export class ReportConflictDto {
  @IsObject()
  localData: Record<string, unknown>;
}
