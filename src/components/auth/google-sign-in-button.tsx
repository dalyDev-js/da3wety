"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  next: string;
  label: string;
  errorLabel: string;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

/**
 * Starts the Google OAuth (PKCE) flow from the browser so Supabase redirects
 * automatically. `next` must be a same-origin path; the callback re-validates it.
 */
export function GoogleSignInButton({ next, label, errorLabel }: Props) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setPending(false);
      toast.error(errorLabel);
    }
  }

  return (
    <Button type="button" size="lg" className="w-full" onClick={signIn} disabled={pending}>
      {pending ? <Spinner /> : <GoogleMark />}
      {label}
    </Button>
  );
}
