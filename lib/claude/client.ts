import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return _client;
}

export const MODELS = {
  chat: config.anthropic.chatModel,
  fast: config.anthropic.fastModel,
} as const;
