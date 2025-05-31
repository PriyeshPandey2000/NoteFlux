"use client";

import React, { useState, useEffect } from 'react';
import { TranscriptService } from '@/lib/services/transcript-service';
import { Transcript } from '@/lib/types/transcript';
import { toast } from 'sonner';
import { Trash2, Calendar, Mic /*, Brain */ } from 'lucide-react';

const TranscriptsPage = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const transcriptService = new TranscriptService();

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      setLoading(true);
      const { data, error } = await transcriptService.getTranscripts();
      
      if (error) {
        toast.error('Failed to load transcripts');
        console.error('Error loading transcripts:', error);
        return;
      }

      setTranscripts(data || []);
    } catch (error) {
      toast.error('Failed to load transcripts');
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transcript?')) {
      return;
    }

    try {
      setDeleting(id);
      const { error } = await transcriptService.deleteTranscript(id);
      
      if (error) {
        toast.error('Failed to delete transcript');
        console.error('Error deleting transcript:', error);
        return;
      }

      setTranscripts(prev => prev.filter(t => t.id !== id));
      toast.success('Transcript deleted successfully');
    } catch (error) {
      toast.error('Failed to delete transcript');
      console.error('Error deleting transcript:', error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVoiceAgentIcon = (agent: string) => {
    return agent === 'deepgram' ? '🔵' : '🟢';
  };

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col gap-12 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Loading transcripts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Transcripts</h1>
        <div className="text-sm text-gray-400">
          {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Mic className="h-16 w-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">No transcripts yet</h2>
          <p className="text-gray-500 max-w-md">
            Start using the voice assistant to create and save transcripts. 
            They'll appear here for easy access.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {transcripts.map((transcript) => (
            <div
              key={transcript.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">
                    {transcript.title || 'Untitled Transcript'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(transcript.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{getVoiceAgentIcon(transcript.voice_agent)}</span>
                      {transcript.voice_agent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
                    </div>
                    {/* <div className="flex items-center gap-1">
                      <Brain className="h-4 w-4" />
                      {transcript.model_used}
                    </div> */}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(transcript.id)}
                  disabled={deleting === transcript.id}
                  className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  title="Delete transcript"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="bg-gray-900/50 rounded-md p-4">
                <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                  {transcript.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranscriptsPage; 