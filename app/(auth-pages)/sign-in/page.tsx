import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <form className="flex flex-col w-full">
      <h1 className="text-xl font-medium text-center mb-2">Sign in</h1>
      <p className="text-xs text-foreground text-center mb-6">
        Don't have an account?{" "}
        <Link className="text-foreground font-medium underline" href="/sign-up">
          Sign up
        </Link>
      </p>
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email" className="text-sm text-gray-300">Email</Label>
          <Input name="email" placeholder="you@example.com" required className="h-8 mt-1" />
        </div>
        <div>
          <Label htmlFor="password" className="text-sm text-gray-300">Password</Label>
          {/* Forgot Password Link - Commented Out
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="password" className="text-sm text-gray-300">Password</Label>
            <Link
              className="text-xs text-foreground underline"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          */}
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            required
            className="h-8 mt-1"
          />
        </div>
        <SubmitButton pendingText="Signing In..." formAction={signInAction} size="sm" className="mt-2">
          Sign in
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
