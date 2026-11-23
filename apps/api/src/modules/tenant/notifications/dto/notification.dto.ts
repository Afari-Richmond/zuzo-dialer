import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}
