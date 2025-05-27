"use client";

import VoiceChat from '@/components/voice-assistant/voice-chat';

export default function VoiceAssistantPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold mb-3 text-gradient">Voice AI Assistant</h1>
        <p className="text-lg text-gray-400 mb-3">
          Speak naturally with OpenAI models
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Ask questions and get responses from GPT models using your voice
        </p>
      </div> */}
      
      {/* Voice Chat Component */}
      <VoiceChat />
    </div>
  );
} 