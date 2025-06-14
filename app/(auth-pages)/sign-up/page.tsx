import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex items-center justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <>
      <form className="flex flex-col w-full">
        <h1 className="text-xl font-medium text-center mb-2">Sign up</h1>
        <p className="text-xs text text-foreground text-center mb-6">
          Already have an account?{" "}
          <Link className="text-primary font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-sm text-gray-300">Email</Label>
            <Input name="email" placeholder="you@example.com" required className="h-8 mt-1" />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm text-gray-300">Password</Label>
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              minLength={6}
              required
              className="h-8 mt-1"
            />
          </div>
          <SubmitButton formAction={signUpAction} pendingText="Signing up..." size="sm" className="mt-2">
            Sign up
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>
      {/* <SmtpMessage /> */}
    </>
  );
}
