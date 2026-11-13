import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantAiAgentConfig } from '../../../db/schema';
import { badRequest, serviceUnavailable } from '../../../common/errors';
import { OPENAI_REALTIME_VOICES } from '../../voice/adapters/livehub.adapter';
import { VoiceAdapterFactoryService } from '../../voice/voice-adapter-factory.service';
import type {
  SetAiAgentDto,
  SetAiAgentModelDto,
  SetAiAgentPromptDto,
  SetAiAgentVoiceDto,
  SetCallTransferDto,
  SetWelcomeMessageDto,
  ToolFormDto,
  UploadDocumentDto,
} from './dto/ai-agent.dto';

const DEFAULT_TRANSFER_PATTERNS = [
  "I'll connect you with a team member now",
  'let me transfer you to someone who can help',
  'connecting you with a member of our team',
];

/**
 * Thin proxy onto LiveHub's AI Agents framework — every value here (agent
 * list, current model, available models) is read live from LiveHub, and
 * saving a model writes straight back to it. There is no local model-choice
 * state; this UI is a view onto AudioCodes' own configuration, not a
 * separate setting that happens to resemble it.
 *
 * A 401/403 from LiveHub almost always means this tenant's LiveHub API
 * client (the same clientId/clientSecret already used for campaigns) hasn't
 * been granted the LIVEHUB/AIFRAMEWORK/* role in Access control (IAM) — a
 * one-time setup step in the AudioCodes dashboard, not a bug — so that case
 * is surfaced as a distinct, actionable error rather than a generic 503.
 */
@Injectable()
export class AiAgentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly adapterFactory: VoiceAdapterFactoryService,
  ) {}

  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (err) {
      const message = (err as Error).message;
      if (/\((401|403)\)/.test(message)) {
        throw badRequest(
          'AI_AGENTS_NOT_AUTHORIZED',
          "Your AudioCodes API client isn't authorized for AI Agents. Grant it the AI Agents role under Access control (IAM) in the LiveHub dashboard, then try again.",
        );
      }
      throw serviceUnavailable('LIVEHUB_AI_AGENTS_ERROR', message);
    }
  }

  async getConfig(tenantId: string) {
    const [row] = await this.db
      .select({ agentId: tenantAiAgentConfig.agentId })
      .from(tenantAiAgentConfig)
      .where(eq(tenantAiAgentConfig.tenantId, tenantId))
      .limit(1);
    return { agentId: row?.agentId ?? null };
  }

  async setAgent(tenantId: string, dto: SetAiAgentDto) {
    await this.db
      .insert(tenantAiAgentConfig)
      .values({ tenantId, agentId: dto.agentId })
      .onConflictDoUpdate({
        target: tenantAiAgentConfig.tenantId,
        set: { agentId: dto.agentId, updatedAt: new Date() },
      });
    return { agentId: dto.agentId };
  }

  async listAgents(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const agents = await this.run(() => liveHub.listAgents());
    return { agents };
  }

  async listModels(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const models = await this.run(() => liveHub.listModels());
    return { models };
  }

  private async requireAgentId(tenantId: string): Promise<string> {
    const { agentId } = await this.getConfig(tenantId);
    if (!agentId) {
      throw badRequest(
        'AI_AGENT_NOT_SELECTED',
        'Pick which AudioCodes AI Agent backs this tenant before managing its model',
      );
    }
    return agentId;
  }

  async getCurrent(tenantId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return this.run(() => liveHub.getAgent(agentId));
  }

  async setModel(tenantId: string, dto: SetAiAgentModelDto) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await this.run(() => liveHub.updateAgentModel(agentId, dto.llm));
    return this.run(() => liveHub.getAgent(agentId));
  }

  async getPrompt(tenantId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const agent = await this.run(() => liveHub.getAgent(agentId));
    return { prompt: agent.prompt };
  }

  async setPrompt(tenantId: string, dto: SetAiAgentPromptDto) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await this.run(() => liveHub.updateAgentPrompt(agentId, dto.prompt));
    const agent = await this.run(() => liveHub.getAgent(agentId));
    return { prompt: agent.prompt };
  }

  async listDocuments(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const documents = await this.run(() => liveHub.listDocuments());
    return { documents };
  }

  async uploadDocument(tenantId: string, dto: UploadDocumentDto, file: Buffer, fileName: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const document = await this.run(() => liveHub.uploadDocument(dto.name, dto.description, file, fileName));
    const agent = await this.run(() => liveHub.getAgent(agentId));
    await this.run(() => liveHub.updateAgentDocuments(agentId, [...agent.documents, document.id]));
    return document;
  }

  async listTools(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const tools = await this.run(() => liveHub.listTools());
    return { tools };
  }

  async getTool(tenantId: string, toolId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return this.run(() => liveHub.getTool(toolId));
  }

  async createTool(tenantId: string, dto: ToolFormDto) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return this.run(() => liveHub.createTool(dto));
  }

  async updateTool(tenantId: string, toolId: string, dto: ToolFormDto) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return this.run(() => liveHub.updateTool(toolId, dto));
  }

  async deleteTool(tenantId: string, toolId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await this.run(() => liveHub.deleteTool(toolId));
    return { deleted: true };
  }

  async getVoice(tenantId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const voice = await this.run(() => liveHub.getAgentVoice(agentId));
    return { voice, options: OPENAI_REALTIME_VOICES };
  }

  async setVoice(tenantId: string, dto: SetAiAgentVoiceDto) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await this.run(() => liveHub.updateAgentVoice(agentId, dto.voice));
    return { voice: dto.voice };
  }

  async getWelcomeMessage(tenantId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const message = await this.run(() => liveHub.getAgentWelcomeMessage(agentId));
    return { message };
  }

  async setWelcomeMessage(tenantId: string, dto: SetWelcomeMessageDto) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await this.run(() => liveHub.updateAgentWelcomeMessage(agentId, dto.message));
    return { message: dto.message };
  }

  async getCallTransfer(tenantId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const transfer = await this.run(() => liveHub.getCallTransfer(agentId));
    return { transfer };
  }

  async setCallTransfer(tenantId: string, dto: SetCallTransferDto) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const phone = dto.phone?.trim();
    if (!phone) {
      await this.run(() => liveHub.updateCallTransfer(agentId, null));
      return { transfer: null };
    }
    const patterns = (dto.patterns ?? []).map((p) => p.trim()).filter(Boolean);
    const condition = {
      phone,
      message: dto.message?.trim() ?? '',
      patterns: patterns.length > 0 ? patterns : DEFAULT_TRANSFER_PATTERNS,
      wholeWords: false,
    };
    await this.run(() => liveHub.updateCallTransfer(agentId, condition));
    return { transfer: condition };
  }

  async deleteDocument(tenantId: string, documentId: string) {
    const agentId = await this.requireAgentId(tenantId);
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const agent = await this.run(() => liveHub.getAgent(agentId));
    if (agent.documents.includes(documentId)) {
      await this.run(() =>
        liveHub.updateAgentDocuments(
          agentId,
          agent.documents.filter((id) => id !== documentId),
        ),
      );
    }
    await this.run(() => liveHub.deleteDocument(documentId));
    return { ok: true };
  }
}
