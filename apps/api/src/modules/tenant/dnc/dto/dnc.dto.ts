import { IsOptional, IsString, MinLength } from 'class-validator';

export class AddDncDto {
  @IsString()
  @MinLength(5)
  phone!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
