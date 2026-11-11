import { IsIn, IsObject, IsString, MinLength } from 'class-validator';

export class UpsertTelephonyCredentialDto {
  @IsIn(['stub', 'twilio', 'africastalking', 'livehub'])
  provider!: 'stub' | 'twilio' | 'africastalking' | 'livehub';

  @IsString()
  @MinLength(1)
  label!: string;

  @IsObject()
  credentials!: Record<string, string>;
}
