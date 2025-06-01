"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TranscriptService } from '@/lib/services/transcript-service';
import { Transcript } from '@/lib/types/transcript';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { MessageSquare, Trash2, Calendar, Mic /*, Brain */, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export interface SidebarRef {
  refreshTranscripts: () => void;
}

const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ isOpen, onToggle }, ref) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const transcriptService = new TranscriptService();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTranscripts();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchTranscripts = async () => {
    setLoading(true);
    const { data, error } = await transcriptService.getTranscripts();
    if (error) {
      console.error('Error fetching transcripts:', error);
      toast.error('Failed to load transcripts');
    } else {
      setTranscripts(data || []);
    }
    setLoading(false);
  };

  // Expose refreshTranscripts method to parent
  useImperativeHandle(ref, () => ({
    refreshTranscripts: fetchTranscripts
  }));

  const deleteTranscript = async (id: string) => {
    const { error } = await transcriptService.deleteTranscript(id);
    if (error) {
      toast.error('Failed to delete transcript');
    } else {
      toast.success('Transcript deleted');
      fetchTranscripts(); // Refresh the list
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Today ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }
    if (diffDays === 2) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }
    if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // const getModelIcon = (model: string) => {
  //   if (model.includes('gpt-4')) return <Brain className="w-3 h-3" />;
  //   return <Mic className="w-3 h-3" />;
  // };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!user) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-black/95 backdrop-blur-md border-r border-gray-800/50 
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-80 lg:w-96
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Previous Transcripts</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                    <div className="h-4 bg-gray-800/50 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-800/50 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-800/50 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : transcripts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No transcripts yet</p>
              <p className="text-gray-500 text-xs mt-1">Start recording to see your chats here</p>
            </div>
          ) : (
            transcripts.map((transcript) => (
              <div
                key={transcript.id}
                onClick={() => router.push(`/editor/${transcript.id}`)}
                className="group bg-gray-900/30 hover:bg-gray-800/50 rounded-lg p-4 transition-all duration-200 border border-gray-800/30 hover:border-gray-700/50 cursor-pointer"
              >
                {/* Header with title and date */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-medium text-sm line-clamp-1">
                    {transcript.title || 'Untitled'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTranscript(transcript.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-red-400/10 p-1 h-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Content preview */}
                <p className="text-gray-300 text-xs mb-3 line-clamp-3 leading-relaxed">
                  {truncateContent(transcript.content)}
                </p>

                {/* Footer with metadata */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px]">{formatDate(transcript.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <div className="flex items-center gap-1 text-gray-500">
                      {getModelIcon(transcript.model_used)}
                      <span className="text-[10px]">{transcript.model_used}</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-purple-400/60"></div> */}
                    <span className="text-gray-500 text-[10px] capitalize">
                      {transcript.voice_agent}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800/50">
          <div className="text-center text-xs text-gray-500">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} saved
          </div>
        </div>
      </div>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          onClick={onToggle}
          className="fixed top-20 left-4 z-40 bg-black/90 hover:bg-gray-900/90 border border-gray-800/50 text-white p-2 h-auto"
          variant="outline"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </>
  );
});

export default Sidebar; 