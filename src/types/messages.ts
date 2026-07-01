import type { AIProvider } from "./settings";

export const GENERATE_SUGGESTION_MESSAGE = "GENERATE_SUGGESTION";

export interface GenerateSuggestionPayload {
  requestId: string;
  text: string;
  pageUrl: string;
  pageTitle: string;
  provider: AIProvider;
  model: string;
}

export interface GenerateSuggestionRequest {
  type: typeof GENERATE_SUGGESTION_MESSAGE;
  payload: GenerateSuggestionPayload;
}

export interface GenerateSuggestionResponse {
  requestId: string;
  suggestion: string;
  error?: string;
}
