import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { LocaleToggle } from "@/components/dashboard/locale-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireHost } from "@/lib/auth";
import { toAppLocale } from "@/lib/i18n/config";

/**
 * Dashboard chrome. `requireHost()` here is a convenience; every page and action
 * calls it again because layouts do not re-run on client navigation.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const profile = await requireHost();
  const locale = toAppLocale(await getLocale());
  const t = await getTranslations("Dashboard");
  const common = await getTranslations("Common");
  const auth = await getTranslations("Auth");
  const initials = (profile.fullName ?? profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="font-heading text-xl font-bold">
              {common("appName")}
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
              {t("myEvents")}
            </Link>
            {profile.isAdmin ? (
              <Link href="/admin" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                <ShieldCheckIcon className="size-4" />
                {t("admin")}
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-1">
            <LocaleToggle
              current={locale}
              labels={{ ar: common("arabic"), en: common("english"), language: common("language") }}
            />
            <Avatar className="size-8">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon-sm" aria-label={auth("signOut")}>
                <LogOutIcon />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
