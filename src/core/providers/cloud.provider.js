import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import BaseProvider from './base.provider.js';

export class OpenAIProvider extends BaseProvider {
  /**
   * @param {string} [model='text-embedding-3-small']
   */
  constructor(model = 'text-embedding-3-small') {
    super();
    this.model = model;
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('MANASDB_CONFIG_ERROR: OPENAI_API_KEY is missing from environment variables.');
    }
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text, targetDims) {
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
    } catch (error) {
      throw new Error(`MANASDB_PROVIDER_ERROR: OpenAI error - ${error.message}`);
    }
  }

  getModelKey() {
    return `openai-${this.model}`;
  }
}


export class GeminiProvider extends BaseProvider {
  /**
   * @param {string} [model='gemini-embedding-001']
   */
  constructor(model = 'gemini-embedding-001') {
    super();
    this.model = model;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('MANASDB_CONFIG_ERROR: GEMINI_API_KEY is missing from environment variables.');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async embed(text, targetDims) {
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
    } catch (error) {
      throw new Error(`MANASDB_PROVIDER_ERROR: Gemini error - ${error.message}`);
    }
  }

  getModelKey() {
    return `gemini-${this.model}`;
  }
}
