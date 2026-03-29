export type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use' | 'hook_fire';

/** Where the event entered the Intentra pipeline (provenance for evaluators). */
export type IngestLane = 'intentra_jsonl_bridge' | 'intentra_http';

export interface ProgressEvent {
  id: string;
  ts: string;           // ISO-8601 UTC
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  intent_id?: string;
  skill?: string;
  message?: string;
  step?: string;
  pct?: number;
  tool_name?: string;
  outcome?: 'success' | 'error' | 'unknown';
  duration_s?: number;
  /** Intentra aggregation layer — always set for JSONL-backed events */
  ingest_lane?: IngestLane;
  /** Origin taxonomy in gstack JSONL, e.g. gstack_skill_run, gstack_hook_fire */
  upstream_kind?: string;
}

export interface TrackedAgent {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'done' | 'error';
  created_at: string;
  updated_at: string;
  message?: string;
  /** Links this agent to ProgressEvent.session_id for event timeline filtering. */
  session_id?: string;
}
