export type ExecutionMode = 'auto' | 'step' | 'combined';

export type AnimationSpeed = '0.25x' | '0.5x' | '1x' | '1.5x' | '2x';

export interface CompilerDiagnostic {
  line: number;
  col: number;
  severity: 'error' | 'warning' | 'note';
  message: string;
}

export interface Variable {
  name: string;
  type: string;
  address: string;
  value_hex: string;
  value_int: number;
  is_pointer: boolean;
  is_null: boolean;
  is_dangling: boolean;
  struct_tag?: string;
}

export interface HeapBlock {
  address: string;
  size: number;
  alloc_line: number;
  is_freed: boolean;
  freed_line: number;
  raw_data?: string[];
}

export interface LinkedListNode {
  id: string;
  address: string;
  data: number;
  next: string | null;
  prev: string | null;
  is_freed: boolean;
  alloc_line: number;
  pointers: string[];
  is_head: boolean;
  is_tail: boolean;
  // Micro-step visual attributes
  is_main_list?: boolean;
  is_staged?: boolean;
  chain_index?: number;
  highlight_field?: 'data' | 'next' | 'prev' | 'alloc' | 'free' | null;
  before_data?: number;
  before_next?: string | null;
}

export interface StepExplanation {
  title: string;
  what_is_happening?: string;
  why_are_we_doing_this?: string;
  memory_changes: string;
  pointer_changes: string;
  before_value?: string;
  after_value?: string;
  what_it_does?: string;
  why_it_matters?: string;
  what_is_next?: string;
  highlight?: {
    type: string;
    id: string;
    field?: string;
  };
}

export interface StepDiff {
  type: string;
  target: string;
  before?: string;
  after?: string;
  description: string;
}

export interface TraceStep {
  step_index: number;
  line: number;
  code: string;
  func: string;
  call_stack: string[];
  variables: Variable[];
  heap: HeapBlock[];
  linked_list: {
    nodes: LinkedListNode[];
    main_chain?: LinkedListNode[];
    staged_nodes?: LinkedListNode[];
    freed_nodes?: LinkedListNode[];
    type: 'singly' | 'doubly' | 'circular';
    has_cycle: boolean;
  };
  diff?: StepDiff | null;
  stdout: string;
  stdout_delta: string;
  error?: string;
  explanation: StepExplanation;
}

export interface TraceSummary {
  total_steps?: number;
  exit_code?: number;
  leak_count?: number;
  leaked_bytes?: number;
  has_error?: boolean;
  timeout?: boolean;
}

export interface TraceResult {
  success: boolean;
  compile_failed?: boolean;
  diagnostics?: CompilerDiagnostic[];
  steps: TraceStep[];
  summary: TraceSummary;
  stdout?: string;
  stderr?: string;
  error?: string;
  raw_output?: string;
}

export interface Program {
  id: number;
  title: string;
  category: string;
  description: string;
  code: string;
  is_template: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSessionState {
  id?: number;
  last_program_id?: number | null;
  execution_mode: ExecutionMode;
  current_code: string;
  animation_speed: AnimationSpeed;
}

export interface AIResponse {
  answer: string;
  source: string;
  model: string;
}
