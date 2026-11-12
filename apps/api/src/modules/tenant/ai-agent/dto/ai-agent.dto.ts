import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

export class SetAiAgentPromptDto {
  @IsString()
  @MaxLength(20000)
  prompt!: string;
}

export class UploadDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
