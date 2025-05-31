export interface Transcript {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  voice_agent: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTranscriptData {
  title?: string;
  content: string;
  voice_agent: string;
  model_used: string;
} 