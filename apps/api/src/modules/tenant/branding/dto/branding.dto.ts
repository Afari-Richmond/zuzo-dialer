import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR = /^(#[0-9a-fA-F]{6})?$/;

export class UpdateBrandingDto {
  // Empty string clears the logo back to the default "Z" badge.
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  // Empty string clears each color back to the default theme.
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'primaryColor must be a hex color, e.g. #0d9488' })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'sidebarColor must be a hex color, e.g. #16140f' })
  sidebarColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'accentColor must be a hex color, e.g. #ff8a5c' })
  accentColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'textColor must be a hex color, e.g. #f7f3ea' })
  textColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'navActiveTextColor must be a hex color, e.g. #ffffff' })
  navActiveTextColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'navInactiveTextColor must be a hex color, e.g. #938d7e' })
  navInactiveTextColor?: string;
}
