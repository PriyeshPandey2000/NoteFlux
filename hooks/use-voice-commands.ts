"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { VoiceCommandProcessor, StreamingChunk } from '@/components/editor/voice-command-processor';
import { toast } from 'sonner';

// Type declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseVoiceCommandsProps {
  editor: Editor | null;
  onCommandExecuted?: (command: string) => void;
  enableStreaming?: boolean; // New prop for streaming mode
}

export const useVoiceCommands = ({ editor, onCommandExecuted, enableStreaming = true }: UseVoiceCommandsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [isStreamingMode, setIsStreamingMode] = useState(enableStreaming);
  
  const recognitionRef = useRef<any>(null);
  const commandProcessorRef = useRef(new VoiceCommandProcessor());
  const timeoutRef = useRef<number | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const streamingChunksRef = useRef<string[]>([]);

  // Keep editor ref updated
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = isStreamingMode; // Continuous for streaming, single for commands
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      // Update transcript display
      setTranscript(finalTranscript || interimTranscript);
      
      if (isStreamingMode) {
        // Process streaming chunks in real-time
        if (finalTranscript) {
          const lastResult = event.results[event.results.length - 1];
          processStreamingChunk(finalTranscript, lastResult[0].confidence);
        } else if (interimTranscript.length > 10) {
          // Process interim results for very fast response
          const lastResult = event.results[event.results.length - 1];
          processStreamingChunk(interimTranscript, lastResult[0].confidence * 0.7);
        }
      } else {
        // Traditional single command processing
        if (finalTranscript) {
          processVoiceCommandWithCurrentEditor(finalTranscript);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
      setIsProcessing(false);
      toast.error("Voice recognition error. Please try again.");
    };
    
    recognition.onend = () => {
      if (isStreamingMode && isListening) {
        // Restart recognition for continuous streaming
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed, stopping');
          setIsListening(false);
          setIsProcessing(false);
          setTranscript('');
        }
      } else {
        setIsListening(false);
        setIsProcessing(false);
        setTranscript('');
      }
    };
    
    return recognition;
  }, [isStreamingMode, isListening]);

  // Process streaming chunks with Grok API
  const processStreamingChunk = useCallback(async (text: string, confidence: number = 0.8) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const chunk: StreamingChunk = {
      text: text.trim(),
      timestamp: Date.now(),
      confidence
    };

    // Add to streaming chunks for continuous processing
    streamingChunksRef.current.push(chunk.text);

    try {
      setIsProcessing(true);
      const success = await commandProcessorRef.current.processStreamingChunk(chunk, currentEditor);
      
      if (success) {
        toast.success(`Applied: "${chunk.text}"`, { duration: 1000 });
        onCommandExecuted?.(chunk.text);
        // Don't clear chunks in streaming mode - keep accumulating for context
        // Only clear if we have too many chunks (prevent memory issues)
        if (streamingChunksRef.current.length > 20) {
          streamingChunksRef.current = streamingChunksRef.current.slice(-10);
        }

      }
    } catch (error) {
      console.error('Error processing streaming chunk:', error);
    } finally {
      // Don't stop processing in streaming mode - keep going
      if (!isStreamingMode) {
        setIsProcessing(false);
      } else {
        // Brief pause to show processing state, then continue
        setTimeout(() => setIsProcessing(false), 200);
      }
    }
  }, [onCommandExecuted, isStreamingMode]);

  // Process transcript stream from editor route
  const processTranscriptStream = useCallback(async (transcriptChunks: string[]) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) {
      toast.error("Editor not available");
      return;
    }

    setIsProcessing(true);
    setStreamingProgress(0);

    try {
      await commandProcessorRef.current.processTranscriptStream(
        transcriptChunks,
        currentEditor,
        (progress) => setStreamingProgress(progress)
      );
      
      toast.success("Transcript stream processed successfully!");
    } catch (error) {
      console.error('Error processing transcript stream:', error);
      toast.error("Failed to process transcript stream");
    } finally {
      setIsProcessing(false);
      setStreamingProgress(0);
    }
  }, []);

  // Function that uses the current editor from ref
  const processVoiceCommandWithCurrentEditor = useCallback(async (command: string) => {
    const currentEditor = editorRef.current;

    if (!currentEditor) {
      toast.error("Editor not available");
      return;
    }

    // Additional validation to ensure editor is ready
    if (!currentEditor.isEditable || !currentEditor.view) {
      toast.error("Editor is still initializing - please try again");
      return;
    }

    setIsProcessing(true);
    
    try {
      const success = await commandProcessorRef.current.processCommand(command, currentEditor);
      
      if (success) {
        toast.success(`Applied: "${command}"`);
        onCommandExecuted?.(command);
      } else {
        toast.error(`Command not recognized: "${command}"`);
        // Show available commands
        const availableCommands = commandProcessorRef.current.getSupportedPhrases().slice(0, 5);
        toast.info(`Try commands like: ${availableCommands.join(', ')}`);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast.error("Failed to process voice command");
    } finally {
      setIsProcessing(false);
    }
  }, [onCommandExecuted]);

  // Keep the original function for external use
  const processVoiceCommand = useCallback((command: string) => {
    processVoiceCommandWithCurrentEditor(command);
  }, [processVoiceCommandWithCurrentEditor]);

  const startListening = useCallback(() => {
    const currentEditor = editorRef.current;

    if (!currentEditor) {
      toast.error("Editor not available - please wait for editor to load");
      return;
    }

    // Additional check to ensure editor is properly initialized
    if (!currentEditor.isEditable || !currentEditor.view) {
      toast.error("Editor is still loading - please try again in a moment");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (!recognitionRef.current) return;

    try {
      setIsListening(true);
      setTranscript('');
      streamingChunksRef.current = [];
      recognitionRef.current.start();
      
      if (isStreamingMode) {
        toast.info("🎤 Streaming mode: Speak continuously for real-time processing...");
      } else {
        toast.info("Listening for formatting command...");
        
        // Auto-stop after 5 seconds for single command mode
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = window.setTimeout(() => {
          stopListening();
        }, 5000);
      }
      
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsListening(false);
      toast.error("Failed to start voice recognition. Please try again.");
    }
  }, [initializeSpeechRecognition, isStreamingMode]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsListening(false);
    setTranscript('');
    streamingChunksRef.current = [];
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const toggleStreamingMode = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    setIsStreamingMode(!isStreamingMode);
    recognitionRef.current = null; // Force recreation with new settings
    
    toast.info(
      !isStreamingMode 
        ? "🚀 Streaming mode enabled - Real-time processing with Grok API" 
        : "📝 Single command mode enabled"
    );
  }, [isStreamingMode, isListening, stopListening]);

  const getAvailableCommands = useCallback(() => {
    return commandProcessorRef.current.getAvailableCommands();
  }, []);

  const getBufferState = useCallback(() => {
    return commandProcessorRef.current.getBufferState();
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error("Error aborting speech recognition:", e);
      }
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    isListening,
    transcript,
    isProcessing,
    streamingProgress,
    isStreamingMode,
    startListening,
    stopListening,
    toggleListening,
    toggleStreamingMode,
    processTranscriptStream,
    getAvailableCommands,
    getBufferState,
    cleanup
  };
}; 