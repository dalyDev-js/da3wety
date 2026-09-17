"use client";

import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { createEvent, updateEvent } from "@/actions/events";
import { ImageField } from "@/components/dashboard/image-field";
import { ThemePicker } from "@/components/dashboard/theme-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, LOCALES, RSVP_MODES } from "@/db/schema/enums";
import type { EventFormInput } from "@/lib/validation/event";
import { idleState, type ActionState, type FieldErrors } from "@/lib/validation/state";

export type EventFormDefaults = Partial<EventFormInput>;

type Props =
  | {
      mode: "create";
      defaults: EventFormDefaults;
      gating: { gallery: boolean; moderation: boolean };
    }
  | {
      mode: "edit";
      eventId: string;
      defaults: EventFormDefaults;
      gating: { gallery: boolean; moderation: boolean };
      publicBaseUrl: string;
    };

function Err({ errors, field }: { errors?: FieldErrors; field: string }) {
  const list = errors?.[field];
  if (!list?.length) return null;
  return <FieldError errors={list.map((message) => ({ message }))} />;
}

export function EventForm(props: Props) {
  const t = useTranslations("Event");
  const common = useTranslations("Common");
  const action = props.mode === "create" ? createEvent : updateEvent.bind(null, props.eventId);
  const [state, formAction, pending] = useActionState(action, idleState as ActionState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const d = props.defaults;
  const invalid = (field: string) => Boolean(errors?.[field]?.length);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="timezone" value={d.timezone ?? "Africa/Cairo"} />

      {state.status === "error" && state.formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("saved")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionBasics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={invalid("title")}>
              <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
              <Input
                id="title"
                name="title"
                defaultValue={d.title}
                required
                maxLength={120}
                aria-invalid={invalid("title")}
              />
              <FieldDescription>{t("titleHint")}</FieldDescription>
              <Err errors={errors} field="title" />
            </Field>

            <Field data-invalid={invalid("eventType")}>
              <FieldLabel htmlFor="eventType">{t("eventType")}</FieldLabel>
              <NativeSelect id="eventType" name="eventType" defaultValue={d.eventType ?? "wedding"}>
                {EVENT_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {t(`types.${type}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid("honoreePrimary")}>
                <FieldLabel htmlFor="honoreePrimary">{t("honoreePrimary")}</FieldLabel>
                <Input
                  id="honoreePrimary"
                  name="honoreePrimary"
                  defaultValue={d.honoreePrimary}
                  required
                  maxLength={80}
                  aria-invalid={invalid("honoreePrimary")}
                />
                <Err errors={errors} field="honoreePrimary" />
              </Field>
              <Field data-invalid={invalid("honoreeSecondary")}>
                <FieldLabel htmlFor="honoreeSecondary">
                  {t("honoreeSecondary")}{" "}
                  <span className="font-normal text-muted-foreground">({common("optional")})</span>
                </FieldLabel>
                <Input
                  id="honoreeSecondary"
                  name="honoreeSecondary"
                  defaultValue={d.honoreeSecondary ?? ""}
                  maxLength={80}
                />
                <Err errors={errors} field="honoreeSecondary" />
              </Field>
            </div>

            <Field data-invalid={invalid("familyNames")}>
              <FieldLabel htmlFor="familyNames">
                {t("familyNames")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
              </FieldLabel>
              <Input id="familyNames" name="familyNames" defaultValue={d.familyNames ?? ""} maxLength={160} />
              <FieldDescription>{t("familyNamesHint")}</FieldDescription>
            </Field>

            <Field data-invalid={invalid("description")}>
              <FieldLabel htmlFor="description">
                {t("description")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
              </FieldLabel>
              <Textarea
                id="description"
                name="description"
                defaultValue={d.description ?? ""}
                rows={4}
                maxLength={2000}
              />
              <Err errors={errors} field="description" />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionWhenWhere")}</CardTitle>
          <CardDescription>{t("timezoneNote")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid("startsAt")}>
                <FieldLabel htmlFor="startsAt">{t("startsAt")}</FieldLabel>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={d.startsAt}
                  required
                  dir="ltr"
                  aria-invalid={invalid("startsAt")}
                />
                <Err errors={errors} field="startsAt" />
              </Field>
              <Field data-invalid={invalid("endsAt")}>
                <FieldLabel htmlFor="endsAt">
                  {t("endsAt")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
                </FieldLabel>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={d.endsAt ?? ""}
                  dir="ltr"
                  aria-invalid={invalid("endsAt")}
                />
                <Err errors={errors} field="endsAt" />
              </Field>
            </div>

            <Field data-invalid={invalid("venueName")}>
              <FieldLabel htmlFor="venueName">{t("venueName")}</FieldLabel>
              <Input id="venueName" name="venueName" defaultValue={d.venueName ?? ""} maxLength={120} />
            </Field>
            <Field data-invalid={invalid("venueAddress")}>
              <FieldLabel htmlFor="venueAddress">{t("venueAddress")}</FieldLabel>
              <Input id="venueAddress" name="venueAddress" defaultValue={d.venueAddress ?? ""} maxLength={300} />
            </Field>
            <Field data-invalid={invalid("venueMapsUrl")}>
              <FieldLabel htmlFor="venueMapsUrl">{t("venueMapsUrl")}</FieldLabel>
              <Input
                id="venueMapsUrl"
                name="venueMapsUrl"
                type="url"
                inputMode="url"
                defaultValue={d.venueMapsUrl ?? ""}
                dir="ltr"
                placeholder="https://maps.app.goo.gl/…"
                aria-invalid={invalid("venueMapsUrl")}
              />
              <Err errors={errors} field="venueMapsUrl" />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionInvitation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="locale">{t("locale")}</FieldLabel>
              <NativeSelect id="locale" name="locale" defaultValue={d.locale ?? "ar"}>
                {LOCALES.map((l) => (
                  <NativeSelectOption key={l} value={l}>
                    {common(l === "ar" ? "arabic" : "english")}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{t("localeHint")}</FieldDescription>
            </Field>

            {props.mode === "edit" ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <ImageField
                  name="coverImagePath"
                  kind="cover"
                  eventId={props.eventId}
                  label={t("coverImage")}
                  description={t("coverImageHint")}
                  initialPath={d.coverImagePath ?? null}
                  publicBaseUrl={props.publicBaseUrl}
                />
                <ImageField
                  name="revealImagePath"
                  kind="reveal"
                  eventId={props.eventId}
                  label={t("revealImage")}
                  description={t("revealImageHint")}
                  initialPath={d.revealImagePath ?? null}
                  publicBaseUrl={props.publicBaseUrl}
                  aspect="square"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("imagesAfterCreate")}</p>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {props.mode === "edit" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("sectionTheme")}</CardTitle>
              <CardDescription>{t("themeHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemePicker name="theme" defaultValue={d.theme ?? "ivory"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("sectionGift")}</CardTitle>
              <CardDescription>{t("giftHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="giftEnabled" name="giftEnabled" defaultChecked={Boolean(d.giftEnabled)} />
                  <FieldLabel htmlFor="giftEnabled" className="font-normal">
                    {t("giftEnabled")}
                  </FieldLabel>
                </Field>
                <Field>
                  <FieldLabel htmlFor="giftHandle">{t("giftHandle")}</FieldLabel>
                  <Input
                    id="giftHandle"
                    name="giftHandle"
                    defaultValue={d.giftHandle ?? ""}
                    dir="ltr"
                    inputMode="email"
                    placeholder={t("giftHandleHint")}
                  />
                  <Err errors={errors} field="giftHandle" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="giftNote">{t("giftNote")}</FieldLabel>
                  <Textarea
                    id="giftNote"
                    name="giftNote"
                    defaultValue={d.giftNote ?? ""}
                    rows={2}
                    maxLength={200}
                    placeholder={t("giftNoteHint")}
                  />
                  <Err errors={errors} field="giftNote" />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionRsvp")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rsvpMode">{t("rsvpMode")}</FieldLabel>
              <NativeSelect id="rsvpMode" name="rsvpMode" defaultValue={d.rsvpMode ?? "open"}>
                {RSVP_MODES.map((m) => (
                  <NativeSelectOption key={m} value={m}>
                    {t(`rsvpModes.${m}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{t("rsvpModeHint")}</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid("openRsvpMaxSeats")}>
                <FieldLabel htmlFor="openRsvpMaxSeats">{t("openRsvpMaxSeats")}</FieldLabel>
                <Input
                  id="openRsvpMaxSeats"
                  name="openRsvpMaxSeats"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  defaultValue={String(d.openRsvpMaxSeats ?? 2)}
                  dir="ltr"
                />
                <Err errors={errors} field="openRsvpMaxSeats" />
              </Field>
              <Field data-invalid={invalid("rsvpDeadline")}>
                <FieldLabel htmlFor="rsvpDeadline">
                  {t("rsvpDeadline")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
                </FieldLabel>
                <Input
                  id="rsvpDeadline"
                  name="rsvpDeadline"
                  type="datetime-local"
                  defaultValue={d.rsvpDeadline ?? ""}
                  dir="ltr"
                />
                <Err errors={errors} field="rsvpDeadline" />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("sectionGallery")}
            {!props.gating.gallery ? <LockIcon className="size-4 text-muted-foreground" /> : null}
          </CardTitle>
          <CardDescription>{props.gating.gallery ? t("galleryHint") : t("galleryLocked")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox
                id="galleryEnabled"
                name="galleryEnabled"
                defaultChecked={Boolean(d.galleryEnabled)}
                disabled={!props.gating.gallery}
              />
              <FieldLabel htmlFor="galleryEnabled" className="font-normal">
                {t("galleryEnabled")}
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="galleryModeration"
                name="galleryModeration"
                defaultChecked={Boolean(d.galleryModeration)}
                disabled={!props.gating.moderation}
              />
              <FieldLabel htmlFor="galleryModeration" className="font-normal">
                {t("galleryModeration")}
              </FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null}
          {props.mode === "create" ? t("create") : common("save")}
        </Button>
      </div>
    </form>
  );
}
