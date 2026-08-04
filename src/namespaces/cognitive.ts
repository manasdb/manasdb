import { OperationRouter } from '../runtime/compatibility/index.ts';
import type { AbsorbOptions, AbsorbResult, DeleteResult } from '../types/index.ts';

/** Placeholder shape for the not-yet-implemented cognitive lifecycle stages
 * (reflect/learn/consolidate/reconcile). Each currently returns only a
 * status tag and a timestamp — replace with a real result type per stage
 * once ReflectIntent/LearnIntent/ConsolidateIntent/ReconcileIntent exist. */
export interface CognitiveStageResult {
  status: 'reflected' | 'learned' | 'consolidated' | 'reconciled';
  timestamp: number;
}

/** Same situation as CognitiveStageResult: none of the four stages read
 * anything off `options` yet, so there's no real shape to declare per
 * stage — but naming it beats a bare Record<string, unknown> at the call
 * site, and gives each stage a place to grow its own fields later without
 * a signature change for callers. */
export interface CognitiveStageOptions {
  [key: string]: unknown;
}

export class CognitiveAPI {
  constructor(private runtime: OperationRouter) {}

  public async observe(text: string, options: AbsorbOptions = {}): Promise<AbsorbResult> {
    return this.runtime.absorb(text, options); // Map to underlying absorb/observe
  }

  public async reflect(options: CognitiveStageOptions = {}): Promise<CognitiveStageResult> {
    // In future: map to ReflectIntent
    return { status: 'reflected', timestamp: Date.now() };
  }

  public async learn(options: CognitiveStageOptions = {}): Promise<CognitiveStageResult> {
    // In future: map to LearnIntent
    return { status: 'learned', timestamp: Date.now() };
  }

  public async consolidate(options: CognitiveStageOptions = {}): Promise<CognitiveStageResult> {
    // In future: map to ConsolidateIntent
    return { status: 'consolidated', timestamp: Date.now() };
  }

  public async reconcile(options: CognitiveStageOptions = {}): Promise<CognitiveStageResult> {
    // In future: map to ReconcileIntent
    return { status: 'reconciled', timestamp: Date.now() };
  }

  public async forget(id: string): Promise<DeleteResult> {
    return this.runtime.forget(id);
  }
}
