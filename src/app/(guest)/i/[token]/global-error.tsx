"use client";

import { GlobalErrorShell } from "@/components/shells/global-error-shell";

// Global errors replace the root layout, so no i18n context exists here.
// Arabic is the product default; the digest lets support correlate logs.
export default function PersonalInvitationGlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <GlobalErrorShell
      {...props}
      lang="ar-EG"
      dir="rtl"
      title="حدث خطأ غير متوقع"
      body="حاول مرة أخرى. إذا استمرت المشكلة تواصل معنا."
      retry="إعادة المحاولة"
    />
  );
}
