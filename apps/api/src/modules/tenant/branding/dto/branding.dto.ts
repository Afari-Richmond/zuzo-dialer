import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  // Empty string clears the logo back to the default "Z" badge.
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  // Empty string clears back to the default teal theme.
  @IsOptional()
  @IsString()
  @Matches(/^(#[0-9a-fA-F]{6})?$/, { message: 'primaryColor must be a hex color, e.g. #0d9488' })
  primaryColor?: string;
}
