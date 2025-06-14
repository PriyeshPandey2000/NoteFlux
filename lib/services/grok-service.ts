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
    const contextStr = context.length > 0 ? context.join(' ') : '';
    
    return `You are an intelligent transcript processor. Your job is to:

1. Fix speech-to-text errors and typos
2. Understand user corrections and intent (CRITICAL: when user says "make that X" or "change to X", they want to REPLACE the previous value, not add to it)
3. Improve grammar and punctuation
4. Format properly (capitalization, spacing)
5. Build a clean, final transcript that represents the user's FINAL INTENT

${contextStr ? `Previous context: "${contextStr}"` : ''}
Current speech: "${text}"

CRITICAL RULES:
- When user corrects themselves ("make that 75", "change to 75", "actually 75"), REPLACE the previous number/value in the context
- If user says "make that seventy five" after saying "twenty five", the final result should have "75" NOT both numbers
- Build ONE clean sentence that represents their final intent
- Remove duplications and repetitions
- Fix obvious speech-to-text errors
- Handle verbal punctuation ("comma", "period", "question mark")
- Format numbers, emails, dates properly

Examples:
Input: Context: "hire 25 engineers" + Current: "make that seventy five"
Output: "hire 75 engineers"

Input: Context: "revenue was 2 million" + Current: "no wait 3 million dollars"  
Output: "revenue was 3 million dollars"

Input: Context: "In the meeting, it was decided to hire twenty five" + Current: "Make that 75 engineers"
Output: "In the meeting, it was decided to hire 75 engineers"

Return ONLY the final clean transcript that represents the user's complete and final intent. No explanations.`;
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