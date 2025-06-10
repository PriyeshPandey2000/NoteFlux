"use client";

import { Editor } from '@tiptap/react';
import { toast } from 'sonner';

export interface VoiceCommand {
  patterns: string[];
  action: (editor: Editor) => void;
  description: string;
  requiresSelection?: boolean;
}

export interface StreamingChunk {
  text: string;
  timestamp: number;
  confidence?: number;
}

export class VoiceCommandProcessor {
  private commands: VoiceCommand[] = [
    // Bold commands
    {
      patterns: ['make this bold', 'bold this', 'make bold', 'bold'],
      action: (editor) => editor.chain().focus().toggleBold().run(),
      description: 'Make selected text bold',
      requiresSelection: true
    },
    
    // Italic commands
    {
      patterns: ['make this italic', 'italic this', 'make italic', 'italic', 'italicize this'],
      action: (editor) => editor.chain().focus().toggleItalic().run(),
      description: 'Make selected text italic',
      requiresSelection: true
    },
    
    // Heading commands
    {
      patterns: ['heading one', 'heading 1', 'make heading one', 'h1'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      description: 'Convert to heading 1',
      requiresSelection: true
    },
    {
      patterns: ['heading two', 'heading 2', 'make heading two', 'h2'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      description: 'Convert to heading 2',
      requiresSelection: true
    },
    {
      patterns: ['heading three', 'heading 3', 'make heading three', 'h3'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      description: 'Convert to heading 3',
      requiresSelection: true
    },
    
    // List commands
    {
      patterns: ['bullet list', 'bullet points', 'make bullet list', 'bulleted list'],
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
      description: 'Create bullet list',
      requiresSelection: true
    },
    {
      patterns: ['numbered list', 'number list', 'ordered list', 'make numbered list'],
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
      description: 'Create numbered list',
      requiresSelection: true
    },
    
    // Quote commands
    {
      patterns: ['make quote', 'quote this', 'block quote', 'make this a quote'],
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
      description: 'Convert to quote',
      requiresSelection: true
    },
    
    // Alignment commands
    {
      patterns: ['center this', 'center align', 'align center'],
      action: (editor) => editor.chain().focus().setTextAlign('center').run(),
      description: 'Center align text',
      requiresSelection: true
    },
    {
      patterns: ['left align', 'align left'],
      action: (editor) => editor.chain().focus().setTextAlign('left').run(),
      description: 'Left align text',
      requiresSelection: true
    },
    {
      patterns: ['right align', 'align right'],
      action: (editor) => editor.chain().focus().setTextAlign('right').run(),
      description: 'Right align text',
      requiresSelection: true
    },
    
    // Paragraph commands
    {
      patterns: ['normal text', 'make paragraph', 'regular text', 'paragraph'],
      action: (editor) => editor.chain().focus().setParagraph().run(),
      description: 'Convert to normal paragraph',
      requiresSelection: true
    },
    
    // Task list commands
    {
      patterns: ['task list', 'todo list', 'checklist', 'make checklist'],
      action: (editor) => editor.chain().focus().toggleTaskList().run(),
      description: 'Create task list',
      requiresSelection: true
    }
  ];

  // Streaming processing state
  private streamBuffer: string = '';
  private processingQueue: StreamingChunk[] = [];
  private isProcessingStream = false;
  private grokApiKey: string | null = null;

  constructor() {
    // Get Grok API key from environment (client-side)
    this.grokApiKey = typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_GROK_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || null
      : null;
    
    if (this.grokApiKey) {
      console.log('🔑 Grok/OpenRouter API initialized for real-time voice processing');
      console.log('🔍 API Key format check:', this.grokApiKey.substring(0, 10) + '...');
    } else {
      console.warn('⚠️ No API key found - set NEXT_PUBLIC_GROK_API_KEY or NEXT_PUBLIC_OPENROUTER_API_KEY');
      console.warn('📝 Falling back to pattern matching only');
    }
  }

  // Process streaming transcript chunks in real-time
  async processStreamingChunk(chunk: StreamingChunk, editor: Editor): Promise<boolean> {
    const startTime = performance.now();
    console.log('🚀 Processing streaming chunk:', chunk);
    
    // Add to processing queue
    this.processingQueue.push(chunk);
    this.streamBuffer += chunk.text + ' ';

    // Process if we have enough content or if this seems like a complete phrase
    if (this.shouldProcessBuffer(chunk)) {
      const result = await this.processBufferedStream(editor);
      const endTime = performance.now();
      console.log(`⚡ Streaming processing took ${endTime - startTime}ms`);
      return result;
    }

    return false;
  }

  private shouldProcessBuffer(chunk: StreamingChunk): boolean {
    // Optimized for speed - process more aggressively
    const wordCount = this.streamBuffer.trim().split(/\s+/).length;
    const endsWithPunctuation = /[.!?]$/.test(chunk.text.trim());
    const containsCommandKeywords = this.containsCommandKeywords(this.streamBuffer);
    const highConfidence = (chunk.confidence || 0) > 0.7; // Lowered threshold
    
    // More aggressive processing for speed
    const quickProcess = wordCount >= 2 && containsCommandKeywords;
    const standardProcess = wordCount >= 3;
    const immediateProcess = endsWithPunctuation || highConfidence;
    
    return quickProcess || standardProcess || immediateProcess;
  }

  private containsCommandKeywords(text: string): boolean {
    const commandKeywords = [
      // Basic formatting
      'make', 'bold', 'italic', 'heading', 'list', 'quote', 'center', 'align', 
      'bullet', 'numbered', 'task', 'paragraph', 'normal',
      
      // Action words
      'turn', 'convert', 'format', 'change', 'transform',
      
      // Targets
      'title', 'first', 'everything', 'all', 'whole', 'document',
      'line', 'paragraph', 'text', 'introduction', 'conclusion',
      
      // Natural language
      'want', 'please', 'can', 'should', 'need',
      
      // Specific commands
      'h1', 'h2', 'h3', 'checklist', 'todo'
    ];
    
    const lowerText = text.toLowerCase();
    return commandKeywords.some(keyword => lowerText.includes(keyword));
  }

  private async processBufferedStream(editor: Editor): Promise<boolean> {
    if (this.isProcessingStream || !this.streamBuffer.trim()) {
      return false;
    }

    this.isProcessingStream = true;
    
    try {
      // First try pattern matching for quick response
      const patternResult = await this.processPatternMatching(this.streamBuffer, editor);
      
      if (patternResult) {
        // In streaming mode, don't clear buffer completely - keep some context
        this.partialClearBuffer();
        return true;
      }

      // If no pattern match and we have Grok API, use streaming AI processing
      if (this.grokApiKey) {
        // Use grok-2 for consistent processing
        const model = 'grok-2'; // Use grok-2 alias which should work with both APIs
        console.log(`🚀 Using ${model} for ultra-fast streaming processing`);
        
        const useFastMode = this.processingQueue.some(chunk => chunk.confidence && chunk.confidence < 0.9);
        const aiResult = await this.processWithGrokStreaming(this.streamBuffer, editor, useFastMode);
        if (aiResult) {
          // In streaming mode, keep some context for better processing
          this.partialClearBuffer();
          return true;
        }
      }

      // If buffer is getting too long without matches, clear it
      if (this.streamBuffer.length > 300) {
        this.clearBuffer();
      }

      return false;
    } finally {
      this.isProcessingStream = false;
    }
  }

  private async processPatternMatching(text: string, editor: Editor): Promise<boolean> {
    const normalizedText = text.toLowerCase().trim();
    const hasSelection = editor.state.selection.from !== editor.state.selection.to;
    
    if (hasSelection) {
      for (const command of this.commands) {
        for (const pattern of command.patterns) {
          if (normalizedText.includes(pattern)) {
            try {
              if (!editor.isFocused) {
                editor.commands.focus();
              }
              command.action(editor);
              console.log('Pattern match executed:', pattern);
              return true;
            } catch (error) {
              console.error('Error executing voice command:', error);
              return false;
            }
          }
        }
      }
    }
    return false;
  }

  private async processWithGrokStreaming(text: string, editor: Editor, useFastMode: boolean = false): Promise<boolean> {
    if (!this.grokApiKey) {
      console.warn('❌ Grok API key not available');
      return false;
    }

    try {
      const content = editor.getText();
      const htmlContent = editor.getHTML();
      
      // Use correct Grok model names - grok-2 is the alias that works
      const model = 'grok-2'; // Use grok-2 alias which should work with both APIs
      console.log(`🚀 Using ${model} for ultra-fast streaming processing`);
      console.log(`📝 Processing command: "${text}"`);
      console.log(`📄 Current content length: ${htmlContent.length} chars`);
      
      // Determine if we're using OpenRouter or direct xAI API
      const isOpenRouter = this.grokApiKey.startsWith('sk-or-');
      const apiUrl = isOpenRouter 
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.x.ai/v1/chat/completions';
      
      console.log(`🌐 Using API: ${isOpenRouter ? 'OpenRouter' : 'xAI Direct'}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.grokApiKey}`,
      };
      
      // Add OpenRouter specific headers if needed
      if (isOpenRouter) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Voice Command Editor';
      }
      
      // Optimize content for speed - limit input size
      const maxContentLength = 2000; // Limit to 2000 chars for speed
      const truncatedContent = htmlContent.length > maxContentLength 
        ? htmlContent.substring(0, maxContentLength) + '...'
        : htmlContent;
      
      const requestBody: any = {
        model: model,
        messages: [
          {
            role: 'system',
            content: `Ultra-fast voice command processor. Return ONLY updated HTML.

RULES:
- Bold: <strong>text</strong>
- Italic: <em>text</em>
- H1: <h1>text</h1>, H2: <h2>text</h2>, H3: <h3>text</h3>
- Bullet: <ul><li>item</li></ul>
- Numbered: <ol><li>item</li></ol>
- Quote: <blockquote><p>text</p></blockquote>
- Center: <p style="text-align: center">text</p>
- Task: <ul data-type="taskList"><li data-type="taskItem" data-checked="false">task</li></ul>

SMART COMMANDS:
- "make everything bold" → wrap ALL in <strong>
- "make title bold" → wrap first heading in <strong>
- "bullet list" → convert paragraphs to <ul><li>
- "heading" → convert to <h1>, <h2>, or <h3>

RESPONSE: HTML only, no explanations.`
          },
          {
            role: 'user',
            content: `Command: "${text}"\nHTML: ${truncatedContent}`
          }
        ],
        temperature: 0, // Deterministic for speed
        max_tokens: 300, // Reduced from 500 for speed
        stream: true,
        // Speed optimizations
        top_p: 0.1, // More focused responses
        frequency_penalty: 0,
        presence_penalty: 0
      };
      
      // Use Grok's streaming API for real-time processing
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log(`📡 API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${isOpenRouter ? 'OpenRouter' : 'xAI'} API error ${response.status}:`, errorText);
        
        // Try to parse error for better debugging
        try {
          const errorJson = JSON.parse(errorText);
          console.error('📋 Detailed error:', errorJson);
          
          if (errorJson.error?.message) {
            toast.error(`API Error: ${errorJson.error.message}`);
          }
        } catch (e) {
          console.error('📋 Raw error response:', errorText);
        }
        
        throw new Error(`${isOpenRouter ? 'OpenRouter' : 'xAI'} API error: ${response.status} - ${errorText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedResponse = '';
      const decoder = new TextDecoder();

      console.log('🔄 Starting to process streaming response...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedResponse += content;
                
                // Try to apply partial updates for immediate feedback
                if (this.isValidPartialHTML(accumulatedResponse)) {
                  this.applyPartialUpdate(accumulatedResponse, editor, htmlContent);
                }
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }

      console.log('✅ Final response length:', accumulatedResponse.length);
      console.log('📝 Response preview:', accumulatedResponse.substring(0, 200) + '...');

      // Apply final result with better validation
      if (accumulatedResponse && accumulatedResponse.trim() !== htmlContent.trim()) {
        // Clean up the response - remove any non-HTML content
        const cleanedResponse = this.cleanGrokResponse(accumulatedResponse);
        
        if (cleanedResponse && cleanedResponse !== htmlContent) {
          console.log('🚀 Applying final result to editor...');
          editor.commands.setContent(cleanedResponse);
          console.log('✅ Streaming command executed successfully');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error with streaming:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          toast.error('API authentication failed - check your API key');
        } else if (error.message.includes('429')) {
          toast.error('Rate limit exceeded - please wait a moment');
        } else if (error.message.includes('500')) {
          toast.error('API server error - please try again');
        } else {
          toast.error('Voice command failed - falling back to pattern matching');
        }
      }
      
      return false;
    }
  }

  private isValidPartialHTML(html: string): boolean {
    // Simplified validation for speed
    return html.length > 10 && html.includes('<') && html.includes('>');
  }

  private applyPartialUpdate(newHtml: string, editor: Editor, originalHtml: string): void {
    // More aggressive partial updates for speed
    if (newHtml.length > 20 && newHtml !== originalHtml) {
      try {
        editor.commands.setContent(newHtml);
      } catch (e) {
        // Ignore errors in partial updates for speed
      }
    }
  }

  private clearBuffer(): void {
    this.streamBuffer = '';
    this.processingQueue = [];
  }

  private partialClearBuffer(): void {
    // Keep the last few words for context in streaming mode
    const words = this.streamBuffer.trim().split(/\s+/);
    if (words.length > 5) {
      // Keep last 3 words for context
      this.streamBuffer = words.slice(-3).join(' ') + ' ';
    } else {
      // If buffer is small, clear it completely
      this.streamBuffer = '';
    }
    
    // Keep only recent chunks in the queue
    if (this.processingQueue.length > 5) {
      this.processingQueue = this.processingQueue.slice(-3);
    } else {
      this.processingQueue = [];
    }
  }

  // Legacy method for backward compatibility
  async processCommand(transcript: string, editor: Editor): Promise<boolean> {
    const chunk: StreamingChunk = {
      text: transcript,
      timestamp: Date.now(),
      confidence: 1.0
    };
    
    return await this.processStreamingChunk(chunk, editor);
  }

  // Real-time transcript processing from editor route
  async processTranscriptStream(
    transcriptChunks: string[], 
    editor: Editor,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('Processing transcript stream with', transcriptChunks.length, 'chunks');
    
    for (let i = 0; i < transcriptChunks.length; i++) {
      const chunk: StreamingChunk = {
        text: transcriptChunks[i],
        timestamp: Date.now() + i,
        confidence: 0.9
      };

      await this.processStreamingChunk(chunk, editor);
      
      // Report progress
      if (onProgress) {
        onProgress((i + 1) / transcriptChunks.length);
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  getAvailableCommands(): VoiceCommand[] {
    return this.commands;
  }

  getSupportedPhrases(): string[] {
    const patterns = this.commands.flatMap(cmd => cmd.patterns);
    const smartCommands = [
      // Smart document-level commands
      'make the title bold',
      'make the introduction bold', 
      'make the first paragraph bold',
      'make the first line bold',
      'turn the title into a heading',
      'make the first line a heading',
      'make the title a heading one',
      'make the title a heading two',
      'add bullet points to the list',
      'make everything a bullet list',
      'make all paragraphs bullet points',
      'center the title',
      'center the first line',
      'make the whole thing a quote',
      'quote everything',
      'make it all italic',
      'make the document a task list',
      
      // Context-aware commands
      'bold the heading',
      'italicize the introduction',
      'center align the title',
      'make the conclusion bold',
      'turn this into a numbered list',
      'convert to bullet points',
      'make this a quote block',
      'format as heading',
      'align everything center',
      
      // Natural language commands
      'I want this bold',
      'can you make this italic',
      'please make this a heading',
      'turn this into a list',
      'make this look like a quote',
      'center this text',
      'format this as a title'
    ];
    return [...patterns, ...smartCommands];
  }

  // Get current buffer state for debugging
  getBufferState(): { buffer: string; queueLength: number; isProcessing: boolean } {
    return {
      buffer: this.streamBuffer,
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessingStream
    };
  }

  private cleanGrokResponse(html: string): string {
    // Clean up the Grok response
    let cleaned = html.trim();
    
    // Remove any markdown code blocks if present
    cleaned = cleaned.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any explanatory text before or after HTML
    const htmlStart = cleaned.indexOf('<');
    const htmlEnd = cleaned.lastIndexOf('>');
    
    if (htmlStart !== -1 && htmlEnd !== -1 && htmlEnd > htmlStart) {
      cleaned = cleaned.substring(htmlStart, htmlEnd + 1);
    }
    
    // Basic HTML validation
    if (!cleaned.includes('<') || !cleaned.includes('>')) {
      console.warn('⚠️ Response does not contain valid HTML');
      return '';
    }
    
    console.log('🧹 Cleaned response:', cleaned.substring(0, 100) + '...');
    return cleaned;
  }
} 