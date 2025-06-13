"use client";

import { useState, useRef } from "react";
import VoiceChat from "@/components/voice-assistant/voice-chat";
import Sidebar, { SidebarRef } from "@/components/sidebar";

// Force dynamic rendering to avoid build-time environment variable issues
export const dynamic = 'force-dynamic';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<SidebarRef>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTranscriptSaved = () => {
    // Refresh the sidebar when a new transcript is saved
    if (sidebarRef.current) {
      sidebarRef.current.refreshTranscripts();
    }
  };

  return (
    <>
      <Sidebar ref={sidebarRef} isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div className={`min-h-screen w-full flex items-center justify-center transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-96' : ''
      }`}>
        <div className="floating-container relative min-h-[500px] w-full max-w-2xl">
          <VoiceChat onTranscriptSaved={handleTranscriptSaved} />
        </div>
      </div>
    </>
  );
}
