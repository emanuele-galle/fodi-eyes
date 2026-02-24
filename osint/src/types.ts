export type TargetType = 'domain' | 'ip' | 'email' | 'username';

export interface ScanTarget {
  value: string;
  type: TargetType;
}

export interface ScanRequest {
  target: string;
  type?: TargetType;
  modules: string[];
}

export interface ScanResult {
  id: string;
  target: ScanTarget;
  status: 'running' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
  modules: ModuleResult[];
  relationships: Relationship[];
}

export interface ModuleResult {
  moduleId: string;
  name: string;
  status: 'success' | 'partial' | 'error';
  data: Record<string, unknown>;
  relationships: Relationship[];
  duration: number;
  error?: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface ScanModule {
  id: string;
  name: string;
  description: string;
  targetTypes: TargetType[];
  run(target: string, signal: AbortSignal): Promise<ModuleResult>;
}
