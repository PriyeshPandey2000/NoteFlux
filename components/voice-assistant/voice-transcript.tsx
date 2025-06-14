"use client";

import React, { useRef, useEffect, useState } from 'react';
import { LLMModel } from './voice-chat';
import { VoiceAgent } from './voice-agent-selector';
import { Save, Zap, Clock, Copy } from 'lucide-react';
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
  selectedVoiceAgent = 'deepgram',
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
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onSave && (
              <button 
                onClick={handleSave}
                disabled={isSaving || !accumulatedTranscript.trim()}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3 w-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
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

      {/* COMMENTED OUT - Processing Status for Intelligent Mode */}
      {/* {isIntelligentMode && transcriptState && transcriptState.chunks.length > 0 && (
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
          
          {transcriptState.isProcessing && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
              <Clock className="w-3 h-3 animate-spin" />
              <span>AI is processing and correcting your speech...</span>
            </div>
          )}
        </div>
      )} */}
      
      {/* Transcript content */}
      <div 
        ref={containerRef}
        className="min-h-[200px] max-h-[400px] overflow-y-auto rounded-lg p-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* TWO CLEAR BOXES - Raw and Corrected */}
        {isIntelligentMode && transcriptState && (transcriptState.rawTranscript || transcriptState.processedTranscript) ? (
          <div className="space-y-4">
            {/* Box 1: Raw/Original Transcript */}
            {/* <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Original
                </h4>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap min-h-[20px]">
                {transcriptState.rawTranscript || "Start speaking..."}
              </p>
            </div> */}

            {/* Box 2: Corrected/Processed Transcript */}
            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wide">
                    Processed
                  </h4>
                  {transcriptState.isProcessing && (
                    <Clock className="w-3 h-3 animate-spin text-purple-400 ml-2" />
                  )}
                </div>
                {transcriptState.processedTranscript && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transcriptState.processedTranscript);
                      toast.success('Transcript copied to clipboard!');
                    }}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                )}
              </div>
              <p className="text-sm text-white whitespace-pre-wrap min-h-[20px]">
                {transcriptState.processedTranscript || "Processing..."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* FALLBACK - Non-intelligent mode or no transcript state */}
            {/* Accumulated transcript display */}
            {accumulatedTranscript && (
              <div className="mb-3">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{accumulatedTranscript}</p>
              </div>
            )}
            
            {/* Current interim transcript */}
            {transcript && (
              <div className="text-sm text-gray-400 italic">
                {transcript}
              </div>
            )}
            
            {/* COMMENTED OUT - Thinking indicator */}
            {/* {isThinking && (
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
            )} */}

            {/* Empty state */}
            {!transcript && !accumulatedTranscript && !isThinking && (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-center py-2">
                  Speak to start transcribing
                </p>
              </div>
            )}
          </>
        )}

        {/* COMMENTED OUT - Intelligent Mode: Show chunk processing details */}
        {/* {isIntelligentMode && transcriptState && transcriptState.chunks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-500 border-t border-gray-700/50 pt-2">
              Processing Details:
            </div>
            
            {getProcessingChunks().map((chunk) => (
              <div key={chunk.id} className="text-xs p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 animate-spin text-yellow-400" />
                  <span className="text-yellow-400">Processing...</span>
                </div>
                <div className="text-gray-400">"{chunk.text}"</div>
              </div>
            ))}

            {getCompletedChunks().slice(-2).map((chunk) => (
              <div key={chunk.id} className="text-xs p-2 bg-green-500/10 border border-green-500/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400">
                    Corrected {chunk.confidence ? `(${Math.round(chunk.confidence * 100)}%)` : ''}
                  </span>
                </div>
                {chunk.text !== chunk.corrected && (
                  <div className="space-y-1">
                    <div className="text-gray-500">Original: "{chunk.text}"</div>
                    <div className="text-gray-300">Corrected: "{chunk.corrected}"</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
};

export default VoiceTranscript; 