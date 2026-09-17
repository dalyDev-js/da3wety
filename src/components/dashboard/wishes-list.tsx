import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWishes } from "@/db/queries/guests";

const PAGE_SIZE = 50;

export async function WishesList({ eventId, page }: { eventId: string; page: number }) {
  const [initialResult, t, tGuests, common, format] = await Promise.all([
    listWishes(eventId, page, PAGE_SIZE),
    getTranslations("Dashboard.wishes"),
    getTranslations("Guests"),
    getTranslations("Common"),
    getFormatter(),
  ]);
  let { items } = initialResult;
  const { total } = initialResult;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  if (currentPage !== page) {
    ({ items } = await listWishes(eventId, currentPage, PAGE_SIZE));
  }
  const pageHref = (targetPage: number) =>
    `/dashboard/events/${eventId}?${new URLSearchParams({ wishesPage: String(targetPage) }).toString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("count", { count: total })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {items.map((wish, index) => (
              <li key={index} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{wish.guestName}</span>
                  <Badge variant={wish.status === "attending" ? "default" : "secondary"}>
                    {tGuests(wish.status === "attending" ? "filters.attending" : "filters.declined")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(wish.respondedAt, "shortWithTime")}
                  </span>
                </div>
                <p className="whitespace-pre-line">{wish.message}</p>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            {currentPage <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                {common("back")}
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(currentPage - 1)}>{common("back")}</Link>
              </Button>
            )}
            <span dir="ltr">
              {currentPage} / {pages}
            </span>
            {currentPage >= pages ? (
              <Button variant="outline" size="sm" disabled>
                {tGuests("next")}
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(currentPage + 1)}>{tGuests("next")}</Link>
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
