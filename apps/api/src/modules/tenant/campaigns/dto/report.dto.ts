import { IsIn, IsOptional, IsString } from 'class-validator';

const OUTCOME_VALUES = [
  'interested',
  'not_interested',
  'callback_requested',
  'wrong_number',
  'converted',
  'no_decision_yet',
  'other',
] as const;

const NEXT_STEP_VALUES = [
  'schedule_follow_up',
  'send_email_sms',
  'escalate_to_agent',
  'add_to_dnc',
  'no_action_needed',
] as const;

export class UpsertOutcomeDto {
  @IsOptional()
  @IsIn(OUTCOME_VALUES)
  outcome?: (typeof OUTCOME_VALUES)[number];

  @IsOptional()
  @IsIn(NEXT_STEP_VALUES)
  nextStep?: (typeof NEXT_STEP_VALUES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetRecommendationDto {
  @IsString()
  recommendation!: string;
}
