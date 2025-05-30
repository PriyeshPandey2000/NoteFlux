"use client";

import React, { useRef, useEffect } from 'react';
import { LLMModel } from './voice-chat';
import { VoiceAgent } from './voice-agent-selector';

type VoiceTranscriptProps = {
  transcript: string;
  accumulatedTranscript: string;
  isThinking: boolean;
  onClear: () => void;
  show: boolean;
  selectedModel?: LLMModel;
  selectedVoiceAgent?: VoiceAgent;
};

const VoiceTranscript = ({ 
  transcript, 
  accumulatedTranscript,
  isThinking, 
  onClear, 
  show,
  selectedModel = 'gpt-4o-mini',
  selectedVoiceAgent = 'webspeech'
}: VoiceTranscriptProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, accumulatedTranscript]);
  
  return (
    <div className="mb-2">
      {/* Header with clear button */}
      {accumulatedTranscript && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 pulse-subtle ${selectedVoiceAgent === 'deepgram' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <h3 className="text-sm font-medium text-gray-300">Transcript</h3>
          </div>
          <button 
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
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
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{accumulatedTranscript}</p>
            {/* <div className="text-xs text-gray-500 mt-2">
              Transcribed via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech API'}
            </div> */}
          </div>
        )}
        
        {/* Current interim transcript */}
        {transcript && (
          <div className="text-sm text-gray-400 italic">
            {transcript}
            {/* <div className="text-xs text-gray-500 mt-1">
              via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
            </div> */}
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
            <span className="text-gray-500 text-sm">Processing...</span>
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
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceTranscript; 