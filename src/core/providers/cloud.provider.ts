import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import BaseProvider from './base.provider.ts';
import type { EmbedResult } from './base.provider.ts';

export class OpenAIProvider extends BaseProvider {
  public model: string;
  public openai: OpenAI;

  constructor(model = 'text-embedding-3-small') {
    super();
    this.model = model;
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('MANASDB_CONFIG_ERROR: OPENAI_API_KEY is missing from environment variables.');
    }
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text: string, targetDims?: number): Promise<EmbedResult> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text
      });

      let vector = response.data[0].embedding;
      const originalDims = vector.length;

      if (targetDims && targetDims < originalDims) {
        vector = this.truncate(vector, targetDims);
      }

      return {
        vector,
        dims: vector.length,
        model: this.getModelKey(),
        originalDims
      };
    } catch (error: any) {
      throw new Error(`MANASDB_PROVIDER_ERROR: OpenAI error - ${error?.message}`);
    }
  }

  getModelKey(): string {
    return `openai-${this.model}`;
  }
}

export class GeminiProvider extends BaseProvider {
  public model: string;
  public genAI: GoogleGenerativeAI;

  constructor(model = 'gemini-embedding-001') {
    super();
    this.model = model;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('MANASDB_CONFIG_ERROR: GEMINI_API_KEY is missing from environment variables.');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async embed(text: string, targetDims?: number): Promise<EmbedResult> {
    try {
      const gModel = this.genAI.getGenerativeModel({ model: this.model });
      const result = await gModel.embedContent(text);
      
      let vector = result.embedding.values;
      const originalDims = vector.length;

      if (targetDims && targetDims < originalDims) {
        vector = this.truncate(vector, targetDims);
      }

      return {
        vector,
        dims: vector.length,
        model: this.getModelKey(),
        originalDims
      };
    } catch (error: any) {
      throw new Error(`MANASDB_PROVIDER_ERROR: Gemini error - ${error?.message}`);
    }
  }

  getModelKey(): string {
    return `gemini-${this.model}`;
  }
}
