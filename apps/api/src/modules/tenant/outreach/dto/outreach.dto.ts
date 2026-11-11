import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UploadBatchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  batch!: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  liveHubCampaignId?: string;
}

export class OutreachAttemptsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class AnalyticsOverviewQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class OutreachDncDto {
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class CallNowDto {
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  liveHubCampaignId?: string;

  @IsOptional()
  @IsBoolean()
  instant?: boolean;
}

const MACHINE_DETECTION_OPTIONS = ['Disabled', 'Disconnect', 'Notify Answer Machine'];

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  campaignName!: string;

  @IsOptional()
  @IsString()
  defaultBotName?: string;

  @IsString()
  timeZone!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startLocalTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  stopLocalTime!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  daysOfWeek!: string[];

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  beginningDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endingDate!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  maxCps!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxConcurrentCalls!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  maxRetries!: number;

  @IsInt()
  @Min(0)
  @Max(400)
  minDurationBetweenRetries!: number;

  @IsInt()
  @Min(1)
  @Max(300)
  minWaitDurationForAnswer!: number;

  @IsIn(MACHINE_DETECTION_OPTIONS)
  machineDetection!: 'Disabled' | 'Disconnect' | 'Notify Answer Machine';

  @IsOptional()
  @IsBoolean()
  lockOnCreate?: boolean;
}

/** Same as CreateCampaignDto minus campaignName (immutable once a campaign exists). */
export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  defaultBotName?: string;

  @IsString()
  timeZone!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startLocalTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  stopLocalTime!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  daysOfWeek!: string[];

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  beginningDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endingDate!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  maxCps!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxConcurrentCalls!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  maxRetries!: number;

  @IsInt()
  @Min(0)
  @Max(400)
  minDurationBetweenRetries!: number;

  @IsInt()
  @Min(1)
  @Max(300)
  minWaitDurationForAnswer!: number;

  @IsIn(MACHINE_DETECTION_OPTIONS)
  machineDetection!: 'Disabled' | 'Disconnect' | 'Notify Answer Machine';

  @IsBoolean()
  locked!: boolean;
}

export const CAMPAIGN_OUTCOME_OPTIONS = [
  'interested',
  'not_interested',
  'callback_requested',
  'wrong_number',
  'converted',
  'no_decision_yet',
  'other',
] as const;

export const CAMPAIGN_NEXT_STEP_OPTIONS = [
  'schedule_follow_up',
  'send_email_sms',
  'escalate_to_agent',
  'add_to_dnc',
  'no_action_needed',
] as const;

export class UpsertOutcomeDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsIn(CAMPAIGN_OUTCOME_OPTIONS)
  outcome?: (typeof CAMPAIGN_OUTCOME_OPTIONS)[number];

  @IsOptional()
  @IsIn(CAMPAIGN_NEXT_STEP_OPTIONS)
  nextStep?: (typeof CAMPAIGN_NEXT_STEP_OPTIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SetRecommendationDto {
  @IsString()
  @MaxLength(4000)
  recommendation!: string;
}

export class SetAiContextDto {
  @IsString()
  @MaxLength(4000)
  aiContext!: string;
}
