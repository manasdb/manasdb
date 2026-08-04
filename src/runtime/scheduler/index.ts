export interface JobOptions {
  intervalMs: number;
  runImmediately?: boolean;
}

export type JobHandler = (context: any) => Promise<void>;

export class Job {
  public intervalId?: NodeJS.Timeout;
  
  constructor(
    public readonly name: string,
    public readonly handler: JobHandler,
    public readonly options: JobOptions
  ) {}
}

/**
 * Class-based extension point for scheduler jobs, alongside the
 * function-based `scheduler.register(name, options, handler)` that
 * predates this. Both work — this is a thin adapter over the same
 * mechanism, not a second implementation of it. Prefer this shape for
 * jobs contributed as plugins (see src/sdk/plugin-sdk.ts); the
 * function-style call is still fine for one-off internal registrations.
 *
 *   class ConsolidationJob extends SchedulerJob {
 *     readonly name = 'background-consolidation';
 *     readonly options = { intervalMs: 60_000 };
 *     async run(context) { ... }
 *   }
 *   new ConsolidationJob().registerOn(runtime.scheduler);
 */
export abstract class SchedulerJob {
  public abstract readonly name: string;
  public abstract readonly options: JobOptions;
  public abstract run(context: any): Promise<void>;

  public registerOn(scheduler: Scheduler): void {
    scheduler.register(this.name, this.options, (context) => this.run(context));
  }
}

export class Scheduler {
  private jobs: Map<string, Job> = new Map();
  private context: any = {};
  private isRunning = false;

  public setContext(context: any) {
    this.context = context;
  }

  public register(name: string, options: JobOptions, handler: JobHandler): void {
    if (this.jobs.has(name)) {
      throw new Error(`Job ${name} is already registered.`);
    }
    const job = new Job(name, handler, options);
    this.jobs.set(name, job);

    if (this.isRunning) {
      this.startJob(job);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    for (const job of this.jobs.values()) {
      this.startJob(job);
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    for (const job of this.jobs.values()) {
      if (job.intervalId) {
        clearInterval(job.intervalId);
        job.intervalId = undefined;
      }
    }
  }

  private startJob(job: Job): void {
    if (job.intervalId) return;

    if (job.options.runImmediately) {
      job.handler(this.context).catch(err => {
        console.error(`[Scheduler] Job ${job.name} failed during immediate run:`, err);
      });
    }

    job.intervalId = setInterval(() => {
      job.handler(this.context).catch(err => {
        console.error(`[Scheduler] Job ${job.name} failed:`, err);
      });
    }, job.options.intervalMs);
  }
}
