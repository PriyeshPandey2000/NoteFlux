"use client";

import { useRef, useState } from "react";
import dynamic from 'next/dynamic';
import Sidebar, { SidebarRef } from "@/components/sidebar";

const DynamicVoiceChat = dynamic(() => import('@/components/voice-assistant/voice-chat'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center">Loading...</div>,
});

export default function Home() {
  const sidebarRef = useRef<SidebarRef>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="flex min-h-screen">
      <Sidebar ref={sidebarRef} isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
      <div className={`flex-1 flex flex-col items-center justify-center p-4 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">NoteFlux</h1>
          <p className="text-lg text-gray-400">Your AI-powered note-taking companion</p>
        </div>
        
        <DynamicVoiceChat />

      </div>
    </main>
  );
}
