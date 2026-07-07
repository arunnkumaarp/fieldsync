import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsLatitude()
  locationLat?: number;

  @IsOptional()
  @IsLongitude()
  locationLng?: number;
}
