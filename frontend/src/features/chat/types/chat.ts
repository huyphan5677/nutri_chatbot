export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  has_unread?: boolean;
}

export interface MealPlanDraft {
  draft_id: string;
  total_days: number;
  summary_markdown?: string;
  saved?: boolean;
  meal_plan_id?: string;
  // Full draft payload for interactive menu widget
  days?: Array<{
    day_number: number;
    eat_date: string;
    day_header?: string;
    meals: Array<Record<string, any>>;
  }>;
  name?: string;
  start_date?: string;
  end_date?: string;
}

export interface ToolProgress {
  step: string;
  preview?: string;
}

export interface ToolState {
  name: string;
  status: "running" | "done";
  result_snippet?: string;
  progress_logs?: ToolProgress[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: string;
  meal_plan_draft?: MealPlanDraft | null;
  tools?: ToolState[];
  thinking_time?: number;
  started_at?: number;
}

export interface ChatResponse {
  reply: string;
  thread_id: string;
}
