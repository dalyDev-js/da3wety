import { cn } from "cn";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const SIZES = { sm: "text-xl", md: "text-2xl", lg: "text-3xl", xl: "text-5xl" } as const;

type Props = { size?: keyof typeof SIZES; href?: string; className?: string };

/** The "Da3wety" mark in Amiri. Renders a link when `href` is given. */
export async function Wordmark({ size = "md", href, className }: Props) {
  const t = await getTranslations("Common");
  const cls = cn("font-heading font-bold tracking-tight text-foreground", SIZES[size], className);
  return href ? (
    <Link href={href} className={cls}>
      {t("appName")}
    </Link>
  ) : (
    <span className={cls}>{t("appName")}</span>
  );
}
