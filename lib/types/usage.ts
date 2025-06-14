export interface UsageRecord {
  id: string;
  user_id: string;
  session_id: string;
  minutes_used: number;
  voice_agent: 'deepgram';
  model: string;
  created_at: string;
}

export interface UserUsage {
  user_id: string;
  total_minutes_used: number;
  minutes_remaining: number;
  free_tier_limit: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUsageData {
  session_id: string;
  minutes_used: number;
  voice_agent: 'deepgram';
  model: string;
} 