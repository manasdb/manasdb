import { OperationRouter } from '../runtime/compatibility/index.ts';

// These four are still mocks (see each method) — typed concretely anyway so
// the *shape* is locked in now; wiring them to real data later is then a
// pure implementation change, not a signature change for callers too.
export interface SystemStats { status: string; objects: number; }
export interface SystemHealth { status: string; }
export interface SystemMetrics { cpu: string; memory: string; }
export interface SystemTelemetryFlag { enabled: boolean; }

export class SystemAPI {
  constructor(private runtime: OperationRouter) {}

  public async stats(): Promise<SystemStats> {
    return { status: 'healthy', objects: 0 }; // Mock for now until wired
  }

  public async health(): Promise<SystemHealth> {
    return { status: 'ok' };
  }

  public async metrics(): Promise<SystemMetrics> {
    return { cpu: '1%', memory: '10MB' };
  }

  public async telemetry(): Promise<SystemTelemetryFlag> {
    return { enabled: true };
  }
}
