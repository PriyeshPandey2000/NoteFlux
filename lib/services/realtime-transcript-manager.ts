import { IntelligentTranscriptProcessor, TranscriptChunk } from './intelligent-transcript-processor';

export interface RealtimeTranscriptState {
  rawTranscript: string;
  processedTranscript: string;
  chunks: TranscriptChunk[];
  isProcessing: boolean;
  stats: {
    totalChunks: number;
    processedChunks: number;
    processingChunks: number;
    averageConfidence: number;
  };
}

export type TranscriptUpdateCallback = (state: RealtimeTranscriptState) => void;

export class RealtimeTranscriptManager {
  private processor: IntelligentTranscriptProcessor;
  private updateCallbacks: TranscriptUpdateCallback[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 100; // ms
  private isEnabled = true;

  constructor() {
    this.processor = new IntelligentTranscriptProcessor();
    
    // Set up processor update callback
    this.processor.onUpdate((transcript, chunks) => {
      this.notifyUpdate();
    });
  }

  // Add a new transcript chunk (called from voice recognition)
  addChunk(text: string, isFinal: boolean = false): void {
    if (!this.isEnabled || !text.trim()) return;

    console.log('📝 Adding chunk:', { text, isFinal });
    this.processor.addChunk(text, isFinal);
    
    // Debounced update to avoid too frequent UI updates
    this.debouncedUpdate();
  }

  // Get current transcript state
  getState(): RealtimeTranscriptState {
    return {
      rawTranscript: this.processor.getRawTranscript(),
      processedTranscript: this.processor.getProcessedTranscript(),
      chunks: this.processor.getChunks(),
      isProcessing: this.hasProcessingChunks(),
      stats: this.processor.getStats()
    };
  }

  // Subscribe to transcript updates
  onUpdate(callback: TranscriptUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Clear all transcript data
  clear(): void {
    console.log('🧹 Clearing transcript');
    this.processor.clear();
    this.notifyUpdate();
  }

  // Enable/disable processing
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Transcript processing ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Process a batch of transcript chunks (for editor integration)
  async processBatch(texts: string[]): Promise<void> {
    if (!this.isEnabled) return;
    
    console.log('📦 Processing batch:', texts.length, 'chunks');
    await this.processor.processBatch(texts);
    this.notifyUpdate();
  }

  // Get processing queue status
  getProcessingStatus(): {
    isProcessing: boolean;
    queueLength: number;
    processingChunks: number;
  } {
    const stats = this.processor.getStats();
    return {
      isProcessing: this.hasProcessingChunks(),
      queueLength: 0, // Not implemented in current processor
      processingChunks: stats.processingChunks
    };
  }

  // Check if service is available
  async isServiceAvailable(): Promise<boolean> {
    return await this.processor.isServiceAvailable();
  }

  // Force reprocess all chunks
  async reprocessAll(): Promise<void> {
    console.log('🔄 Reprocessing all chunks');
    await this.processor.reprocessAll();
    this.notifyUpdate();
  }

  // Private methods

  private hasProcessingChunks(): boolean {
    return this.processor.getChunks().some(chunk => chunk.isProcessing);
  }

  private debouncedUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.notifyUpdate();
    }, this.debounceDelay);
  }

  private notifyUpdate(): void {
    const state = this.getState();
    
    // Log state for debugging
    console.log('🔄 Transcript state update:', {
      rawLength: state.rawTranscript.length,
      processedLength: state.processedTranscript.length,
      chunks: state.chunks.length,
      processing: state.isProcessing,
      stats: state.stats
    });

    // Notify all subscribers
    this.updateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in transcript update callback:', error);
      }
    });
  }

  // Utility methods for integration

  // Get just the processed text (most common use case)
  getProcessedText(): string {
    return this.processor.getProcessedTranscript();
  }

  // Get just the raw text
  getRawText(): string {
    return this.processor.getRawTranscript();
  }

  // Get chunks with specific status
  getChunksByStatus(status: 'processing' | 'completed' | 'pending'): TranscriptChunk[] {
    const chunks = this.processor.getChunks();
    
    switch (status) {
      case 'processing':
        return chunks.filter(c => c.isProcessing);
      case 'completed':
        return chunks.filter(c => c.corrected && !c.isProcessing);
      case 'pending':
        return chunks.filter(c => !c.corrected && !c.isProcessing);
      default:
        return chunks;
    }
  }

  // Get confidence score for the entire transcript
  getOverallConfidence(): number {
    const stats = this.processor.getStats();
    return stats.averageConfidence;
  }

  // Export transcript data for saving
  exportTranscriptData(): {
    raw: string;
    processed: string;
    chunks: TranscriptChunk[];
    metadata: {
      timestamp: number;
      totalChunks: number;
      averageConfidence: number;
    };
  } {
    const state = this.getState();
    
    return {
      raw: state.rawTranscript,
      processed: state.processedTranscript,
      chunks: state.chunks,
      metadata: {
        timestamp: Date.now(),
        totalChunks: state.stats.totalChunks,
        averageConfidence: state.stats.averageConfidence
      }
    };
  }

  // Cleanup method
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.updateCallbacks = [];
    console.log('🗑️ RealtimeTranscriptManager destroyed');
  }
} 