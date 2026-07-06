import { createOpenAI } from '@ai-sdk/openai';

export const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatModel = deepseek('deepseek-chat') as any;
