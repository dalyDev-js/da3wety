"use client";

import { ListPlusIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BulkAddForm } from "@/components/dashboard/bulk-add-form";
import { GuestForm } from "@/components/dashboard/guest-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AddGuestsDialogs({ eventId }: { eventId: string }) {
  const t = useTranslations("Guests");
  const [single, setSingle] = useState(false);
  const [bulk, setBulk] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={single} onOpenChange={setSingle}>
        <DialogTrigger asChild>
          <Button>
            <UserPlusIcon />
            {t("add")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addDescription")}</DialogDescription>
          </DialogHeader>
          <GuestForm eventId={eventId} onDone={() => setSingle(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={bulk} onOpenChange={setBulk}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <ListPlusIcon />
            {t("bulkTitle")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bulkTitle")}</DialogTitle>
            <DialogDescription>{t("bulkDescription")}</DialogDescription>
          </DialogHeader>
          <BulkAddForm eventId={eventId} onDone={() => setBulk(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
