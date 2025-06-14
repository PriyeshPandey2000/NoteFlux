"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Sun,
  Moon,
  Mic,
  MicOff,
  HelpCircle,
  Zap,
  ZapOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceCommands } from '@/hooks/use-voice-commands';
import { toast } from 'sonner';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTranscriptStream?: (chunks: string[]) => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ content, onChange, onTranscriptStream }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Typography,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      setTimeout(() => {
        setIsEditorReady(true);
      }, 100);
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
  });

  const {
    isListening,
    transcript,
    isProcessing,
    streamingProgress,
    isStreamingMode,
    toggleListening,
    toggleStreamingMode,
    processTranscriptStream,
    getAvailableCommands,
    getBufferState,
    cleanup
  } = useVoiceCommands({
    editor,
    onCommandExecuted: (command) => {
      // Command executed successfully
    },
    enableStreaming: true // Enable streaming by default for fast processing
  });

  // Log editor state changes
  useEffect(() => {
    // Editor state tracking for development
  }, [editor, isEditorReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Function to handle transcript streams from editor route
  const handleTranscriptStream = useCallback(async (chunks: string[]) => {
    if (chunks && chunks.length > 0) {
      await processTranscriptStream(chunks);
      onTranscriptStream?.(chunks);
    }
  }, [processTranscriptStream, onTranscriptStream]);

  // Expose the transcript stream handler for external use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleEditorTranscriptStream = handleTranscriptStream;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).handleEditorTranscriptStream;
      }
    };
  }, [handleTranscriptStream]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    disabled = false,
    title
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    disabled?: boolean;
    title?: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${
        isActive 
          ? 'bg-purple-600 text-white hover:bg-purple-700' 
          : isDarkMode
            ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
      }`}
    >
      {children}
    </Button>
  );

  const VoiceCommandHelp = () => {
    const commands = getAvailableCommands();
    const smartPhrases = [
      'make the title bold',
      'make the first line a heading',
      'make everything a bullet list',
      'make the whole thing a quote',
      'turn the title into a heading'
    ];
    
    return (
      <div className={`absolute top-12 right-0 z-50 w-96 p-4 rounded-lg border shadow-lg ${
        isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
      }`}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          Voice Commands
          {isStreamingMode && <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">⚡ Streaming</span>}
        </h3>
        
        {/* Streaming Mode Info */}
        {isStreamingMode && (
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600/30 rounded-lg">
            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Grok AI Streaming Mode
            </h4>
            <div className="text-xs text-purple-300 space-y-1">
              <div>• Speak continuously for real-time processing</div>
              <div>• AI understands context and complex commands</div>
              <div>• Ultra-low latency with streaming responses</div>
              <div>• Works with or without text selection</div>
            </div>
          </div>
        )}
        
        {/* Regular commands (require text selection) */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-purple-400 mb-2">With Text Selected:</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {commands.slice(0, 5).map((command, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium text-purple-400">{command.description}</div>
                <div className="text-xs opacity-75">
                  Say: "{command.patterns[0]}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart commands (work on whole document) */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-green-400 mb-2">Smart Commands (No Selection Needed):</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {smartPhrases.map((phrase, index) => (
              <div key={index} className="text-xs text-green-300">
                "{phrase}"
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-600 text-xs opacity-75">
          <div className="mb-1">🎯 <strong>Smart commands</strong> work on the entire document</div>
          <div className="mb-1">✋ <strong>Regular commands</strong> need text selected first</div>
          {isStreamingMode && (
            <div className="text-purple-400">⚡ <strong>Streaming mode</strong> uses Grok AI for advanced processing</div>
          )}
        </div>
      </div>
    );
  };

  const themeClass = isDarkMode ? 'tiptap-editor-dark' : 'tiptap-editor-light';
  const borderColor = isDarkMode ? 'border-gray-800/50' : 'border-gray-300';
  const bgColor = isDarkMode ? 'bg-gray-900/30' : 'bg-white';
  const toolbarBg = isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50';
  const separatorColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-300';

  return (
    <div className={`border ${borderColor} rounded-lg ${bgColor} overflow-hidden`}>
      {/* Toolbar */}
      <div className={`border-b ${borderColor} ${toolbarBg} p-3 relative`}>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Theme Toggle */}
          <ToolbarButton
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Voice Commands */}
          <div className="relative">
            <ToolbarButton
              onClick={toggleListening}
              isActive={isListening}
              disabled={isProcessing || !isEditorReady || !editor?.isEditable}
              title={
                !isEditorReady 
                  ? "Editor is loading..." 
                  : isListening 
                    ? "Stop voice command" 
                    : isStreamingMode
                      ? "Start streaming voice (Grok AI)"
                      : "Start voice command"
              }
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </ToolbarButton>
            
            {/* Voice status indicator */}
            {(isListening || isProcessing) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>

          {/* Streaming Mode Toggle */}
          <ToolbarButton
            onClick={toggleStreamingMode}
            isActive={isStreamingMode}
            disabled={!isEditorReady || !editor?.isEditable}
            title={
              isStreamingMode 
                ? "Streaming mode ON - Real-time Grok AI processing" 
                : "Streaming mode OFF - Single commands only"
            }
          >
            {isStreamingMode ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
          </ToolbarButton>

          <ToolbarButton
            onClick={() => setShowVoiceHelp(!showVoiceHelp)}
            disabled={!isEditorReady || !editor?.isEditable}
            title="Voice commands help"
          >
            <HelpCircle className="h-4 w-4" />
          </ToolbarButton>

          {/* Voice Help Popup */}
          {showVoiceHelp && <VoiceCommandHelp />}

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task list"
          >
            <input type="checkbox" className="h-4 w-4" readOnly />
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Quote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Text Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <div className={`w-px h-6 ${separatorColor} mx-2`} />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Voice Status Display */}
        {(isListening || transcript || isProcessing || streamingProgress > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {isListening && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span>
                    {isStreamingMode ? "🚀 Streaming with Grok AI..." : "Listening for command..."}
                  </span>
                </div>
              )}
              {transcript && (
                <div className="text-gray-400">
                  <span className="font-medium">Heard:</span> "{transcript}"
                </div>
              )}
              {isProcessing && (
                <div className="text-yellow-400">
                  <span>
                    {isStreamingMode ? "Processing with Grok AI..." : "Processing command..."}
                  </span>
                </div>
              )}
              {streamingProgress > 0 && streamingProgress < 1 && (
                <div className="text-green-400">
                  <span>Stream progress: {Math.round(streamingProgress * 100)}%</span>
                </div>
              )}
            </div>
            
            {/* Streaming mode indicator */}
            {isStreamingMode && (
              <div className="mt-2 text-xs text-purple-400">
                <span className="font-medium">⚡ Streaming Mode:</span> Real-time processing with Grok API
                {isListening && (
                  <span className="ml-2 text-gray-500">
                    • Speak continuously for instant formatting
                  </span>
                )}
              </div>
            )}
            
            {/* Buffer state for debugging (only in development) */}
            {process.env.NODE_ENV === 'development' && isStreamingMode && (
              <div className="mt-1 text-xs text-gray-600">
                Buffer: {getBufferState().buffer || 'empty'} | 
                Queue: {getBufferState().queueLength} | 
                Processing: {getBufferState().isProcessing ? 'yes' : 'no'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={themeClass}
      />
    </div>
  );
};

export default TiptapEditor; 