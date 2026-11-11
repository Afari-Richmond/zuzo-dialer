import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetAiAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  agentId!: string;
}

export class SetAiAgentModelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  llm!: string;
}
