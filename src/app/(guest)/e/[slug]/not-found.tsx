import { getTranslations } from "next-intl/server";

import { InvitationStage } from "@/components/invitation/invitation-stage";

export default async function InvitationNotFound() {
  const t = await getTranslations("Errors");
  return (
    <InvitationStage>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-heading text-3xl">{t("notFoundTitle")}</p>
        <p className="max-w-sm text-(--inv-muted)">{t("notFoundBody")}</p>
      </div>
    </InvitationStage>
  );
}
