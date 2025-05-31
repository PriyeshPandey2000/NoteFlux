import { createClient } from '@/utils/supabase/client';
import { CreateTranscriptData, Transcript } from '@/lib/types/transcript';

export class TranscriptService {
  private supabase = createClient();

  async saveTranscript(data: CreateTranscriptData): Promise<{ data: Transcript | null; error: any }> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      
      if (!user.user) {
        return { data: null, error: 'User not authenticated' };
      }

      const transcriptData = {
        ...data,
        user_id: user.user.id,
        title: data.title || `Transcript ${new Date().toLocaleDateString()}`
      };

      const { data: transcript, error } = await this.supabase
        .from('transcripts')
        .insert(transcriptData)
        .select()
        .single();

      return { data: transcript, error };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { data: null, error };
    }
  }

  async getTranscripts(): Promise<{ data: Transcript[] | null; error: any }> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      
      if (!user.user) {
        return { data: null, error: 'User not authenticated' };
      }

      const { data: transcripts, error } = await this.supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      return { data: transcripts, error };
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      return { data: null, error };
    }
  }

  async deleteTranscript(id: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('transcripts')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      console.error('Error deleting transcript:', error);
      return { error };
    }
  }

  async updateTranscript(id: string, updates: Partial<CreateTranscriptData>): Promise<{ data: Transcript | null; error: any }> {
    try {
      const { data: transcript, error } = await this.supabase
        .from('transcripts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data: transcript, error };
    } catch (error) {
      console.error('Error updating transcript:', error);
      return { data: null, error };
    }
  }
} 