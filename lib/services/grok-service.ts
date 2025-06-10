export interface CorrectionResult {
  correctedText: string;
  confidence: number;
  changes: Array<{
    original: string;
    corrected: string;
    type: 'correction' | 'grammar' | 'formatting' | 'context';
  }>;
}

export class GrokService {
  private apiKey: string;
  private baseUrl: string;
  private isOpenRouter: boolean;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GROK_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    
    // Detect if we're using OpenRouter or direct xAI API
    this.isOpenRouter = this.apiKey.startsWith('sk-or-');
    this.baseUrl = this.isOpenRouter 
      ? 'https://openrouter.ai/api/v1'
      : 'https://api.x.ai/v1';
    
    if (!this.apiKey) {
      console.warn('Grok API key not found. Set NEXT_PUBLIC_GROK_API_KEY or NEXT_PUBLIC_OPENROUTER_API_KEY in environment variables.');
    } else {
      console.log(`🔑 Grok service initialized with ${this.isOpenRouter ? 'OpenRouter' : 'xAI Direct'} API`);
      console.log('🔍 API Key format check:', this.apiKey.substring(0, 10) + '...');
    }
  }

  async correctTranscript(text: string, context: string[] = []): Promise<CorrectionResult> {
    if (!this.apiKey) {
      // Fallback: return original text if no API key
      return {
        correctedText: text,
        confidence: 0,
        changes: []
      };
    }

    try {
      const prompt = this.buildCorrectionPrompt(text, context);
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
      
      // Add OpenRouter specific headers if needed
      if (this.isOpenRouter) {
        headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
        headers['X-Title'] = 'Voice Transcript Processor';
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.isOpenRouter ? 'x-ai/grok-2' : 'grok-2',
          messages: [
            {
              role: 'system',
              content: 'You are an intelligent transcript processor. Return only the corrected text, no explanations or additional formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent corrections
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${this.isOpenRouter ? 'OpenRouter' : 'xAI'} API error ${response.status}:`, errorText);
        
        // Try to parse error for better debugging
        try {
          const errorJson = JSON.parse(errorText);
          console.error('📋 Detailed Grok error:', errorJson);
        } catch (e) {
          console.error('📋 Raw Grok error response:', errorText);
        }
        
        throw new Error(`${this.isOpenRouter ? 'OpenRouter' : 'xAI'} API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const correctedText = data.choices?.[0]?.message?.content?.trim() || text;

      return {
        correctedText,
        confidence: this.calculateConfidence(text, correctedText),
        changes: this.detectChanges(text, correctedText)
      };

    } catch (error) {
      console.error('Error calling Grok API:', error);
      // Fallback: return original text on error
      return {
        correctedText: text,
        confidence: 0,
        changes: []
      };
    }
  }

  private buildCorrectionPrompt(text: string, context: string[]): string {
    const contextStr = context.length > 0 ? context.join(' ') : 'No previous context';
    
    return `You are an intelligent transcript processor. Your job is to:

1. Fix speech-to-text errors and typos
2. Understand corrections (e.g., "500 sorry 100" → "100")
3. Improve grammar and punctuation
4. Format properly (capitalization, spacing)
5. Understand context from previous chunks

Context from previous chunks: ${contextStr}
Current transcript chunk: ${text}

Rules:
- If user corrects themselves ("X sorry Y" or "X no wait Y"), use Y and remove X
- Fix obvious speech-to-text errors (e.g., "dccided" → "decided")
- Maintain the user's intended meaning
- Keep it concise and natural
- Format emails, numbers, dates properly
- Handle verbal punctuation ("comma", "period", "question mark")
- Understand business context (GPUs, revenue, meetings, etc.)

Examples:
- "in meeting we dccided to buy 500 gpus sorry 100 gpus" → "In the meeting, we decided to buy 100 GPUs"
- "the revenue was 2 million no wait 3 million dollars" → "The revenue was 3 million dollars"
- "send email to john at gmail dot com" → "Send email to john@gmail.com"

Return only the corrected text, no explanations.`;
  }

  private calculateConfidence(original: string, corrected: string): number {
    if (original === corrected) return 1.0;
    
    const originalWords = original.toLowerCase().split(/\s+/);
    const correctedWords = corrected.toLowerCase().split(/\s+/);
    
    // Simple confidence based on word similarity
    const maxLength = Math.max(originalWords.length, correctedWords.length);
    const commonWords = originalWords.filter(word => correctedWords.includes(word));
    
    return Math.max(0.3, commonWords.length / maxLength);
  }

  private detectChanges(original: string, corrected: string): CorrectionResult['changes'] {
    if (original === corrected) return [];

    // Simple change detection - in a real implementation, you'd use a diff algorithm
    const changes: CorrectionResult['changes'] = [];
    
    // Check for common correction patterns
    if (original.toLowerCase() !== corrected.toLowerCase()) {
      changes.push({
        original: original,
        corrected: corrected,
        type: 'correction'
      });
    }

    return changes;
  }

  // Fast processing method for real-time use
  async processWithPrompt(transcript: string, context: string[] = []): Promise<string> {
    const result = await this.correctTranscript(transcript, context);
    return result.correctedText;
  }

  // Health check method
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
} 