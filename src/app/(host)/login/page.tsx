import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { devLoginEnabled } from "@/lib/dev-login";
import { safeNext } from "@/lib/safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const hasError = typeof params.error === "string";
  const t = await getTranslations("Auth");
  const common = await getTranslations("Common");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 block font-heading text-3xl font-bold">
            {common("appName")}
          </Link>
          <CardTitle>{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("error")}
            </p>
          ) : null}
          <GoogleSignInButton next={next} label={t("continueWithGoogle")} errorLabel={t("error")} />

          {devLoginEnabled() ? (
            <form action="/auth/dev-login" method="post" className="space-y-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">{t("devLogin")}</p>
              <div className="space-y-1">
                <Label htmlFor="dev-email">{t("email")}</Label>
                <Input id="dev-email" name="email" type="email" autoComplete="username" required dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dev-password">{t("password")}</Label>
                <Input
                  id="dev-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                {t("loginTitle")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
