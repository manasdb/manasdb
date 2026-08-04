import { LifecycleError } from '../../errors/index.ts';

export enum LifecyclePhase {
  Created = 'Created',
  Initializing = 'Initializing',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Failed = 'Failed'
}

// Terminal phases cannot be transitioned away from
const TERMINAL_PHASES = new Set<LifecyclePhase>([LifecyclePhase.Stopped, LifecyclePhase.Failed]);

const VALID_TRANSITIONS: Record<LifecyclePhase, Set<LifecyclePhase>> = {
  [LifecyclePhase.Created]: new Set([LifecyclePhase.Initializing, LifecyclePhase.Failed]),
  [LifecyclePhase.Initializing]: new Set([LifecyclePhase.Running, LifecyclePhase.Failed]),
  [LifecyclePhase.Running]: new Set([LifecyclePhase.Stopping, LifecyclePhase.Failed]),
  [LifecyclePhase.Stopping]: new Set([LifecyclePhase.Stopped, LifecyclePhase.Failed]),
  [LifecyclePhase.Stopped]: new Set(),
  [LifecyclePhase.Failed]: new Set()
};

type LifecycleCallback = () => void | Promise<void>;

export class LifecycleManager {
  private _currentPhase: LifecyclePhase = LifecyclePhase.Created;
  private _hooks = new Map<LifecyclePhase, LifecycleCallback[]>();

  constructor() {
    Object.values(LifecyclePhase).forEach(phase => {
      this._hooks.set(phase as LifecyclePhase, []);
    });
  }

  /** Public getter - no private member access needed externally */
  public getCurrentPhase(): LifecyclePhase {
    return this._currentPhase;
  }

  public on(phase: LifecyclePhase, callback: LifecycleCallback): void {
    if (this._hasPassed(phase)) {
      throw new LifecycleError(`Cannot attach hook to ${phase}, phase has already passed.`);
    }
    this._hooks.get(phase)!.push(callback);
  }

  public async transitionTo(phase: LifecyclePhase): Promise<void> {
    const allowed = VALID_TRANSITIONS[this._currentPhase];
    if (!allowed.has(phase)) {
      throw new LifecycleError(`Invalid lifecycle transition from ${this._currentPhase} to ${phase}.`);
    }

    this._currentPhase = phase;
    const callbacks = this._hooks.get(phase)!;
    for (const callback of callbacks) {
      await callback();
    }
  }

  private _hasPassed(phase: LifecyclePhase): boolean {
    const phases = Object.values(LifecyclePhase);
    const currentIndex = phases.indexOf(this._currentPhase);
    const targetIndex = phases.indexOf(phase);
    return targetIndex < currentIndex;
  }
}