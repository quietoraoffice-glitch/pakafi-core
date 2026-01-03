import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  appCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  appName: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
