import { createClient } from '@/utils/supabase/client';
import { CreateUsageData, UsageRecord, UserUsage } from '@/lib/types/usage';

export class UsageService {
  private supabase = createClient();
  private readonly FREE_TIER_MINUTES = 90; // 90 minutes free per user

  async recordUsage(data: CreateUsageData): Promise<{ data: UsageRecord | null; error: any }> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      
      if (!user.user) {
        return { data: null, error: 'User not authenticated' };
      }

      const usageData = {
        ...data,
        user_id: user.user.id,
      };

      const { data: usage, error } = await this.supabase
        .from('usage_records')
        .insert(usageData)
        .select()
        .single();

      if (!error) {
        // Update user's total usage
        await this.updateUserUsage(user.user.id, data.minutes_used);
      }

      return { data: usage, error };
    } catch (error) {
      console.error('Error recording usage:', error);
      return { data: null, error };
    }
  }

  async getUserUsage(): Promise<{ data: UserUsage | null; error: any }> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      
      if (!user.user) {
        return { data: null, error: 'User not authenticated' };
      }

      let { data: userUsage, error } = await this.supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      // If no usage record exists, create one
      if (error && error.code === 'PGRST116') {
        const newUsage = {
          user_id: user.user.id,
          total_minutes_used: 0,
          minutes_remaining: this.FREE_TIER_MINUTES,
          free_tier_limit: this.FREE_TIER_MINUTES,
          last_reset_date: new Date().toISOString(),
        };

        const { data: created, error: createError } = await this.supabase
          .from('user_usage')
          .insert(newUsage)
          .select()
          .single();

        return { data: created, error: createError };
      }

      return { data: userUsage, error };
    } catch (error) {
      console.error('Error fetching user usage:', error);
      return { data: null, error };
    }
  }

  private async updateUserUsage(userId: string, minutesUsed: number): Promise<void> {
    try {
      // Get current usage
      const { data: currentUsage } = await this.supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (currentUsage) {
        const newTotalMinutes = currentUsage.total_minutes_used + minutesUsed;
        const newRemainingMinutes = Math.max(0, this.FREE_TIER_MINUTES - newTotalMinutes);

        await this.supabase
          .from('user_usage')
          .update({
            total_minutes_used: newTotalMinutes,
            minutes_remaining: newRemainingMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating user usage:', error);
    }
  }

  async canUseService(): Promise<{ canUse: boolean; minutesRemaining: number }> {
    const { data: usage } = await this.getUserUsage();
    
    if (!usage) {
      return { canUse: true, minutesRemaining: this.FREE_TIER_MINUTES };
    }

    return {
      canUse: usage.minutes_remaining > 0,
      minutesRemaining: usage.minutes_remaining
    };
  }

  async getUsageHistory(): Promise<{ data: UsageRecord[] | null; error: any }> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      
      if (!user.user) {
        return { data: null, error: 'User not authenticated' };
      }

      const { data: records, error } = await this.supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      return { data: records, error };
    } catch (error) {
      console.error('Error fetching usage history:', error);
      return { data: null, error };
    }
  }
} 