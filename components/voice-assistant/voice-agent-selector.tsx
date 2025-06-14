"use client";

import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export type VoiceAgent = 'webspeech' | 'deepgram';

type VoiceAgentSelectorProps = {
  selectedAgent: VoiceAgent;
  onAgentChange: (agent: VoiceAgent) => void;
};

const voiceAgents = [
  { 
    value: 'webspeech', 
    label: 'WebSpeech API', 
    // description: 'Browser built-in (Free)' 
  },
  { 
    value: 'deepgram', 
    label: 'Deepgram Nova 2', 
    // description: 'Advanced AI transcription' 
  },
];

const VoiceAgentSelector = ({ selectedAgent, onAgentChange }: VoiceAgentSelectorProps) => {
  return (
    <div className="relative">
      <Select
        value={selectedAgent}
        onValueChange={(value) => onAgentChange(value as VoiceAgent)}
      >
        <SelectTrigger 
          className="w-[200px] bg-gray-800/70 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 focus:ring-blue-500/30"
        >
          <SelectValue placeholder="Select voice agent" />
        </SelectTrigger>
        
        <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
          {voiceAgents.map((agent) => (
            <SelectItem 
              key={agent.value} 
              value={agent.value}
              className="hover:bg-gray-700/70 focus:bg-gray-700/70 cursor-pointer"
            >
              <div className="flex flex-col">
                <span>{agent.label}</span>
                {/* <span className="text-xs text-gray-400">{agent.description}</span> */}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VoiceAgentSelector; 