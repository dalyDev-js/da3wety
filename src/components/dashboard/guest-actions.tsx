"use client";

import { CheckIcon, CopyIcon, MessageCircleIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteGuest, markInviteSent } from "@/actions/guests";
import { GuestForm } from "@/components/dashboard/guest-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Guest } from "@/db/schema";
import { whatsappDigits } from "@/lib/phone";

type Props = {
  eventId: string;
  guest: Guest;
  personalLink: string;
  /** Pre-composed invitation text (event locale); the link is appended on its own line. */
  shareText: string;
};

/** Per-row actions: copy link, WhatsApp share, edit, delete. */
export function GuestActions({ eventId, guest, personalLink, shareText }: Props) {
  const t = useTranslations("Guests");
  const common = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const message = `${shareText}\n${personalLink}`;
  const waUrl = guest.phone
    ? `https://wa.me/${whatsappDigits(guest.phone)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(personalLink);
      toast.success(common("copied"));
    } catch {
      toast.error(personalLink);
    }
  }

  function shareWhatsApp() {
    window.open(waUrl, "_blank", "noopener");
    startTransition(() => markInviteSent(eventId, guest.id));
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t("shareWhatsApp")}
          onClick={shareWhatsApp}
          disabled={pending}
        >
          {guest.inviteSentAt ? <CheckIcon className="text-emerald-600" /> : <MessageCircleIcon />}
        </Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label={t("copyLink")} onClick={copyLink}>
          <CopyIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("more")}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <PencilIcon />
              {common("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2Icon />
              {common("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle", { name: guest.name })}</DialogTitle>
          </DialogHeader>
          <GuestForm eventId={eventId} guest={guest} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: guest.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => startTransition(() => deleteGuest(eventId, guest.id))}
            >
              {common("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
