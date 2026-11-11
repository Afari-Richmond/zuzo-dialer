import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class InviteTenantUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsIn(['tenant_admin', 'agent'])
  role!: 'tenant_admin' | 'agent';
}

export class UpdateTenantUserDto {
  @IsOptional()
  @IsIn(['tenant_admin', 'agent'])
  role?: 'tenant_admin' | 'agent';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
