"use client";

import React, { useRef, useEffect } from 'react';
import { LLMModel } from './voice-chat';
import { VoiceAgent } from './voice-agent-selector';

type VoiceTranscriptProps = {
  transcript: string;
  finalTranscript: string[];
  isThinking: boolean;
  onClear: () => void;
  show: boolean;
  modelResponses?: string[];
  isProcessing?: boolean;
  selectedModel?: LLMModel;
  selectedVoiceAgent?: VoiceAgent;
};

const VoiceTranscript = ({ 
  transcript, 
  finalTranscript, 
  isThinking, 
  onClear, 
  show,
  modelResponses = [],
  isProcessing = false,
  selectedModel = 'gpt-4o-mini',
  selectedVoiceAgent = 'webspeech'
}: VoiceTranscriptProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, finalTranscript, modelResponses]);
  
  return (
    <div className="mb-2">
      {/* Header with clear button */}
      {(finalTranscript.length > 0 || modelResponses.length > 0) && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 pulse-subtle ${selectedVoiceAgent === 'deepgram' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <h3 className="text-sm font-medium text-gray-300">Conversation</h3>
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
        className="min-h-[200px] max-h-[300px] overflow-y-auto rounded-lg bg-gray-800/50 p-4 border border-gray-700/30"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Conversation thread displaying user inputs and AI responses */}
        {finalTranscript.map((text, index) => (
          <React.Fragment key={index}>
            {/* User message */}
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                  U
                </div>
                <div className="flex-1 p-3 rounded-lg bg-gray-700/30 text-gray-200">
                  <p>{text}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI response */}
            {modelResponses[index] && (
              <div className="mb-3 ml-6">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-600/30 flex items-center justify-center text-xs">
                    AI
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-gray-700/20 text-gray-300">
                    <p>{modelResponses[index]}</p>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
        
        {/* Current interim transcript */}
        {transcript && (
          <div className="ml-8 text-gray-400 italic">
            {transcript}
            <div className="text-xs text-gray-500 mt-1">
              via {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
            </div>
          </div>
        )}
        
        {/* Processing indicator after last message */}
        {isProcessing && (
          <div className="ml-6 mb-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600/30 flex items-center justify-center text-xs">
                AI
              </div>
              <div className="flex items-center space-x-2 p-3">
                <div className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="text-gray-500 text-sm">{selectedModel} is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Thinking indicator */}
        {isThinking && !isProcessing && (
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
        {!transcript && finalTranscript.length === 0 && !isThinking && !isProcessing && (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-center py-2">
              Speak to start a conversation with {selectedModel}
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