export type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use';

export interface ProgressEvent {
  id: string;
  ts: string;           // ISO-8601 UTC
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  skill?: string;
  message?: string;
  step?: string;
  pct?: number;
  tool_name?: string;
  outcome?: 'success' | 'error' | 'unknown';
  duration_s?: number;
}

export interface TrackedAgent {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'done' | 'error';
  created_at: string;
  updated_at: string;
  message?: string;
}
