import { IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters/numbers/hyphens',
  })
  slug!: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateTenantAdminSettingsDto {
  @IsOptional()
  @IsIn(['trial', 'starter', 'growth', 'scale', 'custom'])
  plan?: 'trial' | 'starter' | 'growth' | 'scale' | 'custom';

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyMinuteQuota?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  ratePerMinuteCents?: number | null;

  @IsOptional()
  @IsString()
  billingContactName?: string | null;

  @IsOptional()
  @IsEmail()
  billingContactEmail?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ListTenantsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['trial', 'active', 'suspended'])
  status?: 'trial' | 'active' | 'suspended';
}
