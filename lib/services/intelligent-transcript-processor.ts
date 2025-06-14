import { GrokService, CorrectionResult } from './grok-service';

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  corrected?: string;
  confidence?: number;
  isProcessing?: boolean;
}

export interface TranscriptDiff {
  original: string;
  corrected: string;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification';
    position: number;
    text: string;
  }>;
}

export class IntelligentTranscriptProcessor {
  private grokService: GrokService;
  private chunks: TranscriptChunk[] = [];
  private contextWindow = 3; // Number of previous chunks to include as context
  private processingQueue: string[] = [];
  private isProcessing = false;
  private onUpdateCallback?: (transcript: string, chunks: TranscriptChunk[]) => void;

  constructor() {
    this.grokService = new GrokService();
  }

  // Add a new transcript chunk for processing
  addChunk(text: string, isFinal: boolean = false): string {
    const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const chunk: TranscriptChunk = {
      id: chunkId,
      text: text.trim(),
      timestamp: Date.now(),
      isFinal,
      isProcessing: false
    };

    // Only add non-empty chunks
    if (chunk.text) {
      this.chunks.push(chunk);
      
      // Process the chunk if it's final or significant enough
      if (isFinal || chunk.text.length > 10) {
        this.processChunk(chunkId);
      }
    }

    return chunkId;
  }

  // Process a specific chunk with AI correction
  private async processChunk(chunkId: string): Promise<void> {
    const chunkIndex = this.chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) return;

    const chunk = this.chunks[chunkIndex];
    if (chunk.isProcessing || chunk.corrected) return;

    // Mark as processing
    chunk.isProcessing = true;
    this.notifyUpdate();

    try {
      // Get FULL context - all previous text to understand complete intent
      const fullContext = this.getFullContextForChunk(chunkIndex);
      
      // Process with Grok AI - pass full context so AI can understand corrections
      const result = await this.grokService.correctTranscript(chunk.text, fullContext);
      
      // Update chunk with correction
      chunk.corrected = result.correctedText;
      chunk.confidence = result.confidence;
      chunk.isProcessing = false;

      // Notify listeners of the update
      this.notifyUpdate();

    } catch (error) {
      console.error('Error processing chunk:', error);
      chunk.isProcessing = false;
      chunk.corrected = chunk.text; // Fallback to original text
      chunk.confidence = 0;
      this.notifyUpdate();
    }
  }

  // Get FULL context from all previous chunks (not just last 3)
  private getFullContextForChunk(chunkIndex: number): string[] {
    if (chunkIndex === 0) return [];
    
    const previousChunks = this.chunks.slice(0, chunkIndex);
    
    // Build the full conversation context
    const context: string[] = [];
    
    // Add all previous text to give AI complete understanding
    const fullPreviousText = previousChunks
      .map(chunk => chunk.corrected || chunk.text)
      .join(' ')
      .trim();
    
    if (fullPreviousText) {
      context.push(fullPreviousText);
    }
    
    return context;
  }

  // Get the current processed transcript
  getProcessedTranscript(): string {
    // Build a clean, deduplicated transcript
    const processedChunks = this.chunks.filter(chunk => chunk.corrected || !chunk.isProcessing);
    
    if (processedChunks.length === 0) {
      return '';
    }

    // If we have corrected chunks, use the latest corrected version as the final result
    const latestCorrected = processedChunks
      .filter(chunk => chunk.corrected)
      .pop(); // Get the most recent corrected chunk

    if (latestCorrected && latestCorrected.corrected) {
      // Return the latest AI-corrected version which should contain the full context
      return latestCorrected.corrected;
    }

    // Fallback: combine uncorrected chunks (but this should rarely happen)
    return processedChunks
      .map(chunk => chunk.text)
      .join(' ')
      .trim();
  }

  // Get the raw transcript (without corrections)
  getRawTranscript(): string {
    return this.chunks
      .map(chunk => chunk.text)
      .join(' ')
      .trim();
  }

  // Get all chunks with their processing status
  getChunks(): TranscriptChunk[] {
    return [...this.chunks];
  }

  // Clear all chunks
  clear(): void {
    this.chunks = [];
    this.notifyUpdate();
  }

  // Set callback for transcript updates
  onUpdate(callback: (transcript: string, chunks: TranscriptChunk[]) => void): void {
    this.onUpdateCallback = callback;
  }

  // Notify listeners of updates
  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getProcessedTranscript(), this.getChunks());
    }
  }

  // Merge corrections and detect differences
  mergeCorrections(original: string, corrected: string): TranscriptDiff {
    return {
      original,
      corrected,
      changes: this.detectTextChanges(original, corrected)
    };
  }

  // Simple diff detection (can be enhanced with proper diff algorithms)
  private detectTextChanges(original: string, corrected: string): TranscriptDiff['changes'] {
    const changes: TranscriptDiff['changes'] = [];
    
    if (original !== corrected) {
      changes.push({
        type: 'modification',
        position: 0,
        text: corrected
      });
    }

    return changes;
  }

  // Process multiple chunks in batch
  async processBatch(texts: string[]): Promise<void> {
    const chunkIds: string[] = [];
    
    // Add all chunks
    texts.forEach((text, index) => {
      const isFinal = index === texts.length - 1;
      const chunkId = this.addChunk(text, isFinal);
      chunkIds.push(chunkId);
    });

    // Process all chunks
    await Promise.all(
      chunkIds.map(chunkId => this.processChunk(chunkId))
    );
  }

  // Get processing statistics
  getStats(): {
    totalChunks: number;
    processedChunks: number;
    processingChunks: number;
    averageConfidence: number;
  } {
    const totalChunks = this.chunks.length;
    const processedChunks = this.chunks.filter(c => c.corrected).length;
    const processingChunks = this.chunks.filter(c => c.isProcessing).length;
    
    const confidenceScores = this.chunks
      .filter(c => c.confidence !== undefined)
      .map(c => c.confidence!);
    
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    return {
      totalChunks,
      processedChunks,
      processingChunks,
      averageConfidence
    };
  }

  // Check if Grok service is available
  async isServiceAvailable(): Promise<boolean> {
    return await this.grokService.isAvailable();
  }

  // Force reprocess all chunks (useful for testing)
  async reprocessAll(): Promise<void> {
    // Reset all corrections
    this.chunks.forEach(chunk => {
      chunk.corrected = undefined;
      chunk.confidence = undefined;
      chunk.isProcessing = false;
    });

    // Reprocess all chunks
    for (let i = 0; i < this.chunks.length; i++) {
      await this.processChunk(this.chunks[i].id);
    }
  }
} 