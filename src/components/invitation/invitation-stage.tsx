import type { ReactNode } from "react";

import { invitationThemeStyle } from "@/components/invitation/invitation-theme";
import type { ThemeId } from "@/db/schema/enums";

/** Full-viewport paper background with safe-area padding; hosts the card. */
export function InvitationStage({ theme, children }: { theme?: ThemeId; children: ReactNode }) {
  return (
    <main
      style={invitationThemeStyle(theme)}
      className="flex min-h-dvh flex-1 flex-col bg-(--inv-paper) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-(--inv-ink)"
    >
      {children}
    </main>
  );
}
