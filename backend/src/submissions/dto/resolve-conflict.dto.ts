import { IsIn, IsOptional, IsUUID } from 'class-validator';

// `choice: 'local' | 'remote'` picks one side of the logged conflict verbatim.
// Pass `customValue` instead to resolve with a value that is neither side
// (e.g. an admin manually merging the two).
export class ResolveConflictDto {
  @IsUUID()
  conflictLogId: string;

  @IsIn(['local', 'remote', 'custom'])
  choice: 'local' | 'remote' | 'custom';

  @IsOptional()
  customValue?: unknown;
}
