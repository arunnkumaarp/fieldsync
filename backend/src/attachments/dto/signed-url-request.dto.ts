import { IsIn, IsString } from 'class-validator';

export class SignedUrlRequestDto {
  @IsString()
  contentType: string;

  @IsIn(['jpg', 'jpeg', 'png', 'webp'])
  extension: string;
}
