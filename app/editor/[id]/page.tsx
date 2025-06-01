"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TranscriptService } from '@/lib/services/transcript-service';
import { Transcript } from '@/lib/types/transcript';
import { toast } from 'sonner';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TiptapEditor from '@/components/editor/tiptap-editor';

const EditorPage = () => {
  const params = useParams();
  const router = useRouter();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const transcriptService = new TranscriptService();

  useEffect(() => {
    if (params.id) {
      loadTranscript(params.id as string);
    }
  }, [params.id]);

  const loadTranscript = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await transcriptService.getTranscripts();
      
      if (error) {
        toast.error('Failed to load transcript');
        router.push('/');
        return;
      }

      const foundTranscript = data?.find(t => t.id === id);
      if (!foundTranscript) {
        toast.error('Transcript not found');
        router.push('/');
        return;
      }

      setTranscript(foundTranscript);
      setContent(foundTranscript.content);
      setTitle(foundTranscript.title || 'Untitled');
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Failed to load transcript');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!transcript) return;

    try {
      setSaving(true);
      const { error } = await transcriptService.updateTranscript(transcript.id, {
        title: title,
        content: content,
        voice_agent: transcript.voice_agent,
        model_used: transcript.model_used
      });

      if (error) {
        toast.error('Failed to save transcript');
        return;
      }

      toast.success('Transcript saved successfully');
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading transcript...</div>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Transcript not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white hover:bg-gray-800/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(transcript.created_at)}</span>
                <span className="text-purple-400">•</span>
                <span className="capitalize">{transcript.voice_agent}</span>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-500 mb-6"
        />

        {/* Tiptap Editor */}
        <div className="prose prose-invert max-w-none">
          <TiptapEditor
            content={content}
            onChange={setContent}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage; 