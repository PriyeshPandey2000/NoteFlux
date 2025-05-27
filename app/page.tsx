import Hero from "@/components/hero";
import ConnectSupabaseSteps from "@/components/tutorial/connect-supabase-steps";
import SignUpUserSteps from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import VoiceChat from "@/components/voice-assistant/voice-chat";

export default async function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="floating-container relative min-h-[500px] w-full max-w-2xl">
        <VoiceChat />
      </div>
    </div>
  );
}
