"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';
import VoiceTranscript from './voice-transcript';
import ModelSelector from './model-selector';
import VoiceAgentSelector, { VoiceAgent } from './voice-agent-selector';
import { DeepgramService } from '@/lib/deepgram-service';
import { TranscriptService } from '@/lib/services/transcript-service';
import { RealtimeTranscriptManager, RealtimeTranscriptState } from '@/lib/services/realtime-transcript-manager';

// Type declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type LLMModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.5-preview';

type VoiceChatProps = {
  onTranscriptSaved?: () => void;
};

const VoiceChat = ({ onTranscriptSaved }: VoiceChatProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<LLMModel>('gpt-4o-mini');
  const [selectedVoiceAgent, setSelectedVoiceAgent] = useState<VoiceAgent>('webspeech');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  
  // New state for intelligent processing
  const [isIntelligentMode, setIsIntelligentMode] = useState(true);
  const [transcriptState, setTranscriptState] = useState<RealtimeTranscriptState | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const deepgramServiceRef = useRef<DeepgramService | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const transcriptService = useRef(new TranscriptService());
  const realtimeManager = useRef<RealtimeTranscriptManager | null>(null);
  
  // API keys from environment variables
  const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  // Initialize realtime transcript manager
  useEffect(() => {
    realtimeManager.current = new RealtimeTranscriptManager();
    
    // Subscribe to transcript updates
    const unsubscribe = realtimeManager.current.onUpdate((state) => {
      setTranscriptState(state);
      setAccumulatedTranscript(state.processedTranscript);
      setIsProcessing(state.isProcessing);
    });

    // Check service availability
    realtimeManager.current.isServiceAvailable().then(setServiceAvailable);

    return () => {
      unsubscribe();
      realtimeManager.current?.destroy();
    };
  }, []);
  
  // Toggle listening state
  const toggleListening = async () => {
    if (typeof window === 'undefined') return;
    
    if (selectedVoiceAgent === 'deepgram') {
      await toggleDeepgramListening();
    } else {
      toggleWebSpeechListening();
    }
  };

  // Deepgram listening logic
  const toggleDeepgramListening = async () => {
    try {
      if (!deepgramApiKey) {
        toast("Deepgram API key not configured. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your environment variables.");
        return;
      }

      if (isListening) {
        // Stop listening
        if (deepgramServiceRef.current) {
          deepgramServiceRef.current.stopListening();
        }
        setIsListening(false);
        setIsThinking(true);
      } else {
        // Start listening
        if (!deepgramServiceRef.current) {
          deepgramServiceRef.current = new DeepgramService(deepgramApiKey);
        }

        await deepgramServiceRef.current.startListening(
          (transcriptText: string, isFinal: boolean) => {
            if (isFinal) {
              setTranscript("");
              const newTranscript = transcriptText.trim();
              if (newTranscript) {
                if (isIntelligentMode && realtimeManager.current) {
                  // Add to intelligent processing
                  realtimeManager.current.addChunk(newTranscript, true);
                } else {
                  // Traditional mode
                  setAccumulatedTranscript(prev => {
                    const separator = prev ? " " : "";
                    return prev + separator + newTranscript;
                  });
                }
              }
            } else {
              setTranscript(transcriptText);
              if (isIntelligentMode && realtimeManager.current && transcriptText.length > 10) {
                // Add interim results for processing
                realtimeManager.current.addChunk(transcriptText, false);
              }
            }
          },
          (error: any) => {
            console.error('Deepgram error:', error);
            setIsListening(false);
            toast("Error with Deepgram transcription. Please try again.");
          },
          () => {
            setIsListening(true);
            toast(`Listening with Deepgram Nova 2${isIntelligentMode ? ' + AI Processing' : ''}...`);
          },
          () => {
            setIsListening(false);
            setIsThinking(false);
          }
        );
      }
    } catch (error) {
      console.error("Error with Deepgram:", error);
      toast("Failed to start Deepgram transcription. Please check your API key.");
    }
  };

  // WebSpeech listening logic (existing)
  const toggleWebSpeechListening = () => {
    // Initialize speech recognition on first click if not already initialized
    if (!recognitionRef.current) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          toast("Speech recognition is not supported in your browser. Try Chrome or Edge.");
          setIsSpeechSupported(false);
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              setTranscript("");
              const newTranscript = result[0].transcript.trim();
              
              if (isIntelligentMode && realtimeManager.current) {
                // Add to intelligent processing
                realtimeManager.current.addChunk(newTranscript, true);
              } else {
                // Traditional mode
                setAccumulatedTranscript(prev => {
                  const separator = prev ? " " : "";
                  return prev + separator + newTranscript;
                });
              }
            } else {
              interimTranscript += result[0].transcript;
              if (isIntelligentMode && realtimeManager.current && interimTranscript.length > 10) {
                // Add interim results for processing
                realtimeManager.current.addChunk(interimTranscript, false);
              }
            }
          }
          
          setTranscript(interimTranscript);
          
          // Reset the timeout for auto-stopping
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          
          timeoutRef.current = window.setTimeout(() => {
            if (isListening && recognitionRef.current) {
              setIsThinking(true);
              recognitionRef.current.stop();
            }
          }, 1500); // Stop after 1.5 seconds of silence
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
          toast("Error with voice recognition. Please try again.");
        };
        
        recognition.onend = () => {
          setIsListening(false);
          setIsThinking(false);
          console.log("Speech recognition ended");
        };
        
        // Store the recognition object
        recognitionRef.current = recognition;
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
        setIsSpeechSupported(false);
        toast("Speech recognition failed to initialize. Try using Chrome or Edge browser.");
        return;
      }
    }
    
    try {
      if (isListening) {
        // Stop listening
        console.log("Stopping speech recognition");
        recognitionRef.current.stop();
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        setIsThinking(true);
      } else {
        // Start listening
        console.log("Starting speech recognition");
        recognitionRef.current.start();
        setTranscript("");
        setIsListening(true);
        toast(`Listening with WebSpeech${isIntelligentMode ? ' + AI Processing' : ''}...`);
      }
    } catch (error) {
      console.error("Error toggling speech recognition:", error);
      toast("Failed to start speech recognition. Please try reloading the page.");
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error("Error aborting speech recognition:", e);
        }
      }
      if (deepgramServiceRef.current) {
        deepgramServiceRef.current.stopListening();
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const clearTranscript = () => {
    setTranscript("");
    setAccumulatedTranscript("");
    setIsThinking(false);
    
    // Clear intelligent mode state
    if (realtimeManager.current) {
      realtimeManager.current.clear();
    }
  };
  
  const handleModelChange = (model: LLMModel) => {
    setSelectedModel(model);
    toast(`Switched to ${model} model`);
  };

  const handleVoiceAgentChange = (agent: VoiceAgent) => {
    // Stop current listening if active
    if (isListening) {
      if (selectedVoiceAgent === 'deepgram' && deepgramServiceRef.current) {
        deepgramServiceRef.current.stopListening();
      } else if (selectedVoiceAgent === 'webspeech' && recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setIsThinking(false);
    }

    setSelectedVoiceAgent(agent);
    toast(`Switched to ${agent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech API'}`);
  };

  // Toggle intelligent processing mode
  const toggleIntelligentMode = () => {
    setIsIntelligentMode(!isIntelligentMode);
    if (realtimeManager.current) {
      realtimeManager.current.setEnabled(!isIntelligentMode);
    }
    toast(
      !isIntelligentMode 
        ? "🧠 AI Processing enabled - Real-time corrections with Grok" 
        : "📝 Basic mode - Raw transcription only"
    );
  };
  
  // Handle saving transcript
  const handleSaveTranscript = async (transcriptContent: string, voiceAgent: VoiceAgent, model: LLMModel): Promise<void> => {
    try {
      // Use processed transcript if available
      const contentToSave = isIntelligentMode && transcriptState 
        ? transcriptState.processedTranscript 
        : transcriptContent;

      const { data, error } = await transcriptService.current.saveTranscript({
        content: contentToSave,
        voice_agent: voiceAgent,
        model_used: model
      });

      if (error) {
        throw new Error(error);
      }

      // Clear the transcript after successful save
      clearTranscript();
      if (onTranscriptSaved) {
        onTranscriptSaved();
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  };

  // Get display transcript (processed or raw)
  const getDisplayTranscript = () => {
    if (isIntelligentMode && transcriptState) {
      // Return the full processed transcript which accumulates all corrected chunks
      return transcriptState.processedTranscript;
    }
    return accumulatedTranscript;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header with controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Model and Voice Agent Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ModelSelector 
              selectedModel={selectedModel} 
              onModelChange={handleModelChange}
            />
            <VoiceAgentSelector 
              selectedAgent={selectedVoiceAgent}
              onAgentChange={handleVoiceAgentChange}
            />
            
            {/* Intelligent Processing Toggle */}
            <button
              onClick={toggleIntelligentMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isIntelligentMode
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
              }`}
              title={isIntelligentMode ? 'AI Processing enabled' : 'AI Processing disabled'}
            >
              {isIntelligentMode ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              <span>AI Processing</span>
              {!serviceAvailable && isIntelligentMode && (
                <span className="text-xs text-orange-400">(Offline)</span>
              )}
            </button>
          </div>

          {/* Processing Status */}
          {isIntelligentMode && transcriptState && (
            <div className="text-center">
              <div className="text-xs text-gray-400 space-x-4">
                <span>Chunks: {transcriptState.stats.totalChunks}</span>
                <span>Processed: {transcriptState.stats.processedChunks}</span>
                {transcriptState.stats.averageConfidence > 0 && (
                  <span>Confidence: {Math.round(transcriptState.stats.averageConfidence * 100)}%</span>
                )}
                {transcriptState.isProcessing && (
                  <span className="text-purple-400">Processing...</span>
                )}
              </div>
            </div>
          )}

          {/* Usage indicator for monetization awareness */}
          <div className="text-center">
            <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Free Plan: 42/60 minutes used this month</span>
              </div>
              <button className="text-purple-400 hover:text-purple-300 transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Center mic button and visualization */}
          <div className="flex flex-col items-center mb-6">
            {/* Mic button with pulsing effect */}
            <button
              onClick={toggleListening}
              className={`mic-button-pro ${isListening ? 'active' : ''} mb-6`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              id="voice-mic-button"
              name="voice-mic-button"
            >
              {isListening ? (
                <MicOff className="h-6 w-6 text-white" />
              ) : (
                <Mic className="h-6 w-6 text-white" />
              )}
            </button>

            {/* Status text */}
            <div className="text-sm text-gray-400 mb-4">
              {isListening ? (
                <div className="flex items-center">
                  <div className="pulse-ring mr-2"></div>
                  <span>
                    Listening with {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
                    {isIntelligentMode && ' + AI Processing'}...
                  </span>
                </div>
              ) : isThinking ? (
                <div className="flex items-center">
                  <span>Processing your input...</span>
                </div>
              ) : (
                <span>
                  Click to start recording with {selectedVoiceAgent === 'deepgram' ? 'Deepgram Nova 2' : 'WebSpeech'}
                  {isIntelligentMode && ' + AI Processing'}
                </span>
              )}
            </div>
            
            {/* Audio visualization - only show when listening */}
            {isListening && (
              <div className="audio-visualizer mb-4 flex items-end justify-center h-12 space-x-1">
                {[...Array(16)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-full audio-bar ${
                      isIntelligentMode 
                        ? 'bg-purple-500/70' 
                        : selectedVoiceAgent === 'deepgram' 
                          ? 'bg-blue-500/70' 
                          : 'bg-green-500/70'
                    }`}
                    style={{ 
                      animationDelay: `${i * 0.05}s`,
                      height: `${Math.random() * 30 + 3}px`
                    }}
                  ></div>
                ))}
              </div>
            )}
          </div>
          
          {/* Transcript component - positioned below mic */}
          <VoiceTranscript 
            transcript={transcript} 
            accumulatedTranscript={getDisplayTranscript()}
            isThinking={isThinking || (isIntelligentMode && isProcessing)} 
            onClear={clearTranscript}
            onSave={handleSaveTranscript}
            show={true}
            selectedModel={selectedModel}
            selectedVoiceAgent={selectedVoiceAgent}
            isIntelligentMode={isIntelligentMode}
            transcriptState={transcriptState}
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceChat; 