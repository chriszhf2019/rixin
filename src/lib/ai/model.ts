import { createOpenAI } from '@ai-sdk/openai';

// DeepSeek is OpenAI-compatible — just change the base URL
export const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

// Use deepseek-chat (the latest general-purpose model)
// Falls back to deepseek-reasoner if deepseek-chat needs reasoning
export const chatModel = deepseek('deepseek-chat');
