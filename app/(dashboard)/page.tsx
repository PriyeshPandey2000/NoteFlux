import FetchDataSteps from "@/components/tutorial/fetch-data-steps";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon } from "lucide-react";
import { redirect } from "next/navigation";
import VoiceChat from "@/components/voice-assistant/voice-chat";
import Link from "next/link";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="min-h-screen w-full">
      {/* Voice Chat Component */}
      <div className="fixed inset-x-0 bottom-16 flex justify-center z-50">
        <div className="floating-container relative min-h-[500px] w-full max-w-2xl">
          <VoiceChat />
        </div>
      </div>
    </div>
  );
}
