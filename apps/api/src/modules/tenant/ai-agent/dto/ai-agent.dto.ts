import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

export class SetAiAgentVoiceDto {
  @IsString()
  @IsIn(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'])
  voice!: string;
}

export class SetWelcomeMessageDto {
  @IsString()
  @MaxLength(500)
  message!: string;
}

export class SetCallTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsArray()
  patterns?: string[];
}

/** AudioCodes' own tool schema is the real validation backstop here — this
 * only checks the one field we truly require (name), and loosely types the
 * rest so the create/edit form can send whatever the chosen tool type
 * needs without us duplicating their Pydantic schema. */
export class ToolFormDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['rest', 'mcp', 'flow'])
  type?: 'rest' | 'mcp' | 'flow';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  headers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsArray()
  params?: {
    name: string;
    description: string;
    required?: boolean;
    type?: string;
    values?: string[] | null;
  }[];

  @IsOptional()
  @IsObject()
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'oauth2';
    token?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    url?: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(200)
  flow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mcpTools?: string;
}
