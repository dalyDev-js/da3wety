import type { ReactNode } from "react";

import { invitationThemeStyle } from "@/components/invitation/invitation-theme";

/** Full-viewport paper background with safe-area padding; hosts the card. */
export function InvitationStage({ children }: { children: ReactNode }) {
  return (
    <main
      style={invitationThemeStyle()}
      className="flex min-h-dvh flex-1 flex-col bg-(--inv-paper) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-(--inv-ink)"
    >
      {children}
    </main>
  );
}
