import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { UsageService } from './services/usage-service';

export class DeepgramService {
  private deepgram: any;
  private connection: any;
  private isConnected: boolean = false;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onErrorCallback?: (error: any) => void;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;
  private mediaRecorder?: MediaRecorder;
  private mediaStream?: MediaStream;
  private audioContext?: AudioContext;
  private processor?: ScriptProcessorNode;
  
  // Usage tracking
  private sessionStartTime?: number;
  private sessionId: string;
  private usageService: UsageService;
  private usageRecorded: boolean = false;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Deepgram API key is required');
    }
    this.deepgram = createClient(apiKey);
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.usageService = new UsageService();
  }

  async startListening(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: any) => void,
    onOpen?: () => void,
    onClose?: () => void
  ) {
    try {
      // Check if user can use the service
      const { canUse, minutesRemaining } = await this.usageService.canUseService();
      if (!canUse) {
        const error = new Error(`🎯 Free Deepgram minutes used up! ✅ WebSpeech API is still available (free). Switch to WebSpeech to continue transcribing.`);
        onError?.(error);
        return;
      }

      this.onTranscriptCallback = onTranscript;
      this.onErrorCallback = onError;
      this.onOpenCallback = onOpen;
      this.onCloseCallback = onClose;

      // Record session start time
      this.sessionStartTime = Date.now();
      this.usageRecorded = false; // Reset for new session

      // Create a live transcription connection
      this.connection = this.deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
        vad_events: true,
        encoding: "linear16",
        sample_rate: 16000,
        channels: 1,
      });

      // Set up event listeners
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("Deepgram connection opened");
        this.isConnected = true;
        this.onOpenCallback?.();
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("Deepgram connection closed");
        this.isConnected = false;
        this.recordUsage(); // Record usage when connection closes
        this.onCloseCallback?.();
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          const isFinal = data.is_final || false;
          console.log("Deepgram transcript:", transcript, "isFinal:", isFinal);
          this.onTranscriptCallback?.(transcript, isFinal);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
        console.error("Deepgram error:", err);
        this.recordUsage(); // Record usage even on error
        this.onErrorCallback?.(err);
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log("Deepgram metadata:", data);
      });

      // Start capturing audio from microphone
      await this.startMicrophoneCapture();

    } catch (error) {
      console.error("Error starting Deepgram:", error);
      this.onErrorCallback?.(error);
    }
  }

  private async startMicrophoneCapture() {
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        } 
      });

      // Create audio context for processing
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create a script processor to capture audio data
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (this.connection && this.isConnected) {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convert float32 to int16
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Send raw audio data to Deepgram
          this.connection.send(int16Array.buffer);
        }
      };

      // Connect the audio processing chain
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log("Microphone capture started successfully");

    } catch (error) {
      console.error("Error accessing microphone:", error);
      this.onErrorCallback?.(error);
    }
  }

  stopListening() {
    try {
      console.log("Stopping Deepgram service...");

      // Record usage before stopping
      this.recordUsage();

      // Disconnect audio processing
      if (this.processor) {
        this.processor.disconnect();
        this.processor = undefined;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = undefined;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log("Stopped audio track:", track.label);
        });
        this.mediaStream = undefined;
      }

      // Close Deepgram connection
      if (this.connection && this.isConnected) {
        this.connection.finish();
      }

      this.isConnected = false;
      console.log("Deepgram service stopped");
    } catch (error) {
      console.error("Error stopping Deepgram:", error);
    }
  }

  private async recordUsage() {
    if (!this.sessionStartTime || this.usageRecorded) return;

    const sessionEndTime = Date.now();
    const durationMs = sessionEndTime - this.sessionStartTime;
    const durationSeconds = Math.round(durationMs / 1000);
    const durationMinutes = Math.ceil(durationMs / 60000); // Round up to nearest minute

    console.log(`Session duration: ${durationSeconds} seconds (${durationMs}ms) = ${durationMinutes} minute(s)`);

    // Only record if session was at least 5 seconds (to avoid accidental clicks)
    if (durationSeconds >= 5 && durationMinutes > 0) {
      try {
        await this.usageService.recordUsage({
          session_id: this.sessionId,
          minutes_used: durationMinutes,
          voice_agent: 'deepgram',
          model: 'nova-2'
        });
        console.log(`✅ Recorded ${durationMinutes} minute(s) of Deepgram usage (${durationSeconds}s actual)`);
        this.usageRecorded = true; // Mark as recorded
      } catch (error) {
        console.error('Error recording usage:', error);
      }
    } else {
      console.log(`⏭️ Session too short (${durationSeconds}s), not recording usage`);
    }

    // Reset for potential reuse
    this.sessionStartTime = undefined;
  }

  isListening(): boolean {
    return this.isConnected;
  }
} 