"use client";

import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { LLMModel } from './voice-chat';

type ModelSelectorProps = {
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
};

const models = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast & affordable' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Powerful & balanced' },
  { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview', description: 'Most advanced' },
];

const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  return (
    <div className="relative">
      <Select
        value={selectedModel}
        onValueChange={(value) => onModelChange(value as LLMModel)}
      >
        <SelectTrigger 
          className="w-[180px] bg-gray-800/70 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 focus:ring-green-500/30"
        >
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        
        <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
          {models.map((model) => (
            <SelectItem 
              key={model.value} 
              value={model.value}
              className="hover:bg-gray-700/70 focus:bg-gray-700/70 cursor-pointer"
            >
              <div className="flex flex-col">
                <span>{model.label}</span>
                <span className="text-xs text-gray-400">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector; 