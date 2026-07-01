export const buildCompletionPrompt = (text: string): string =>
  [
    "Complete the user's text naturally.",
    "Only return the continuation.",
    "Do not repeat existing text.",
    "",
    "Text:",
    text,
  ].join("\n");

export const normalizePrompt = (text: string): string => text.replace(/\r\n/g, "\n");

export const sanitizeSuggestion = (userText: string, rawSuggestion: string): string => {
  let suggestion = rawSuggestion.replace(/^\s*["'`]/, "").replace(/["'`]\s*$/, "");
  suggestion = suggestion.replace(/^\r?\n+/, "");

  if (suggestion.startsWith(userText)) {
    suggestion = suggestion.slice(userText.length);
  }

  return suggestion.replace(/\u0000/g, "");
};

export const truncateForCacheKey = (value: string, maxLength = 4_000): string =>
  value.length > maxLength ? value.slice(-maxLength) : value;
