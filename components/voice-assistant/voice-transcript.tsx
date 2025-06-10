"use client";

import React, { useRef, useEffect, useState } from 'react';
import { LLMModel } from './voice-chat';
import { VoiceAgent } from './voice-agent-selector';
import { Save, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeTranscriptState } from '@/lib/services/realtime-transcript-manager';

type VoiceTranscriptProps = {
  transcript: string;
  accumulatedTranscript: string;
  isThinking: boolean;
  onClear: () => void;
  onSave?: (transcript: string, voiceAgent: VoiceAgent, model: LLMModel) => Promise<void>;
  show: boolean;
  selectedModel?: LLMModel;
  selectedVoiceAgent?: VoiceAgent;
  isIntelligentMode?: boolean;
  transcriptState?: RealtimeTranscriptState | null;
};

const VoiceTranscript = ({ 
  transcript, 
  accumulatedTranscript,
  isThinking, 
  onClear,
  onSave,
  show,
  selectedModel = 'gpt-4o-mini',
  selectedVoiceAgent = 'webspeech',
  isIntelligentMode = false,
  transcriptState = null
}: VoiceTranscriptProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, accumulatedTranscript]);

  const handleSave = async () => {
    if (!accumulatedTranscript.trim() || !onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(accumulatedTranscript, selectedVoiceAgent, selectedModel);
      toast.success('Transcript saved successfully!');
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get processing chunks for display
  const getProcessingChunks = () => {
    if (!isIntelligentMode || !transcriptState) return [];
    return transcriptState.chunks.filter(chunk => chunk.isProcessing);
  };

  // Get completed chunks for display
  const getCompletedChunks = () => {
    if (!isIntelligentMode || !transcriptState) return [];
    return transcriptState.chunks.filter(chunk => chunk.corrected && !chunk.isProcessing);
  };
  
  return (
    <div className="mb-2">
      {/* Header with clear and save buttons */}
      {accumulatedTranscript && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 pulse-subtle ${
              isIntelligentMode 
                ? 'bg-purple-500' 
                : selectedVoiceAgent === 'deepgram' 
                  ? 'bg-blue-500' 
                  : 'bg-green-500'
            }`}></div>
            <h3 className="text-sm font-medium text-gray-300">
              Transcript
              {isIntelligentMode && (
                <span className="ml-2 text-xs text-purple-400">
                  <Zap className="w-3 h-3 inline mr-1" />
                  AI Enhanced
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onSave && (
              <button 
                onClick={handleSave}
                disabled={isSaving || !accumulatedTranscript.trim()}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3 w-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            {/* Export dropdown for premium features */}
            {accumulatedTranscript.trim() && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10">
                  <div className="p-2 space-y-1 min-w-[120px]">
                    <button className="block w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">
                      Plain Text
                    </button>
                    <button className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
                      PDF <span className="text-purple-400">(Pro)</span>
                    </button>
                    <button className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
                      DOCX <span className="text-purple-400">(Pro)</span>
                    </button>
                    <button className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
                      SRT Captions <span className="text-purple-400">(Pro)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button 
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Processing Status for Intelligent Mode */}
      {isIntelligentMode && transcriptState && transcriptState.chunks.length > 0 && (
        <div className="mb-3 p-3 bg-gray-800/30 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                Chunks: <span className="text-white">{transcriptState.stats.totalChunks}</span>
              </span>
              <span className="text-gray-400">
                Processed: <span className="text-green-400">{transcriptState.stats.processedChunks}</span>
              </span>
              {transcriptState.stats.processingChunks > 0 && (
                <span className="text-gray-400">
                  Processing: <span className="text-yellow-400">{transcriptState.stats.processingChunks}</span>
                </span>
              )}
            </div>
            {transcriptState.stats.averageConfidence > 0 && (
              <div className="text-gray-400">
                Confidence: <span className="text-purple-400">
                  {Math.round(transcriptState.stats.averageConfidence * 100)}%
                </span>
              </div>
            )}
          </div>
          
          {/* Processing indicator */}
          {transcriptState.isProcessing && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
              <Clock className="w-3 h-3 animate-spin" />
              <span>AI is processing and correcting your speech...</span>
            </div>
          )}
        </div>
      )}
      
      {/* Transcript content */}
      <div 
        ref={containerRef}
        className="min-h-[200px] max-h-[300px] overflow-y-auto rounded-lg p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Accumulated transcript display */}
        {accumulatedTranscript && (
          <div className="mb-3">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{accumulatedTranscript}</p>
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
              <span>
                Transcribed via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech API'}
              </span>
              {isIntelligentMode && (
                <>
                  <span>•</span>
                  <span className="text-purple-400">Enhanced with Grok AI</span>
                  {transcriptState && transcriptState.stats.totalChunks > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-400">
                        {transcriptState.stats.processedChunks}/{transcriptState.stats.totalChunks} processed
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Current interim transcript */}
        {transcript && (
          <div className="text-sm text-gray-400 italic">
            {transcript}
            <div className="text-xs text-gray-500 mt-1">
              via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
              {isIntelligentMode && ' (processing...)'}
            </div>
          </div>
        )}
        
        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-gray-500 text-sm">
              {isIntelligentMode ? 'Processing with AI...' : 'Processing...'}
            </span>
          </div>
        )}

        {/* Intelligent Mode: Show chunk processing details */}
        {isIntelligentMode && transcriptState && transcriptState.chunks.length > 0 && (
          <div className="mt-4 space-y-2">
            {/* Only show if there are currently processing chunks */}
            {transcriptState.stats.processingChunks > 0 && (
              <div className="text-xs p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 animate-spin text-purple-400" />
                  <span className="text-purple-400">
                    Processing {transcriptState.stats.processingChunks} chunk{transcriptState.stats.processingChunks > 1 ? 's' : ''}...
                  </span>
                </div>
                <div className="text-gray-400 text-xs">
                  AI is correcting and enhancing your speech in real-time
                </div>
              </div>
            )}

            {/* Show completion status when processing is done */}
            {transcriptState.stats.processingChunks === 0 && transcriptState.stats.processedChunks > 0 && (
              <div className="text-xs p-2 bg-green-500/10 border border-green-500/20 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400">
                    All {transcriptState.stats.totalChunks} chunks processed and corrected
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Empty state */}
        {!transcript && !accumulatedTranscript && !isThinking && (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-center py-2">
              Speak to start transcribing
              <br />
              <span className="text-xs">
                Using {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech API'} for transcription
                {isIntelligentMode && (
                  <>
                    <br />
                    <span className="text-purple-400">+ Grok AI for intelligent corrections</span>
                  </>
                )}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceTranscript; 