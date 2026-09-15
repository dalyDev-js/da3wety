"use client";

import { KeyboardIcon, ScanLineIcon, SearchIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  lookupByCode,
  lookupByGuestId,
  recordCheckin,
  searchGuests,
  type LookupResult,
  type SearchHit,
} from "@/actions/checkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((m) => m.Scanner), { ssr: false });

type Mode = "camera" | "code" | "search";
type Props = { scannerToken: string; eventTitle: string };

const COOLDOWN_MS = 5000;
const STAFF_KEY = "da3wety:staff-name";

/**
 * Door check-in: camera (native BarcodeDetector on Android, wasm on iOS), manual
 * code entry, and name/phone search. Every lookup goes through the server, which
 * owns the truth about who was admitted.
 */
export function DoorScanner({ scannerToken, eventTitle }: Props) {
  const t = useTranslations("Scanner");
  const [mode, setMode] = useState<Mode>("camera");
  const [cameraOn, setCameraOn] = useState(false);
  const staffRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"qr" | "manual">("qr");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const recent = useRef(new Map<string, number>());
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    try {
      if (staffRef.current) staffRef.current.value = localStorage.getItem(STAFF_KEY) ?? "";
    } catch {}
    import("@yudiel/react-qr-scanner").then(({ prepareZXingModule }) => {
      prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/wasm/${path}` : prefix + path),
        },
        fireImmediately: true,
      });
    });
    return () => {
      wakeLock.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => document.visibilityState !== "visible" && setCameraOn(false);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const applyResult = useCallback((r: LookupResult, via: "qr" | "manual") => {
    setResult(r);
    setMethod(via);
    if ("guest" in r) setSeats(Math.max(1, r.seatsAttending - r.seatsAdmitted || 1));
  }, []);

  async function startCamera() {
    setCameraOn(true);
    try {
      wakeLock.current = await navigator.wakeLock?.request("screen");
    } catch {}
  }

  async function onScan(codes: { rawValue: string }[]) {
    const raw = codes[0]?.rawValue;
    if (!raw || busy) return;
    const last = recent.current.get(raw);
    if (last && Date.now() - last < COOLDOWN_MS) return;
    recent.current.set(raw, Date.now());
    setBusy(true);
    try {
      applyResult(await lookupByCode(scannerToken, raw), "qr");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(form: FormData) {
    const raw = String(form.get("code") ?? "");
    if (!raw.trim()) return;
    setBusy(true);
    try {
      applyResult(await lookupByCode(scannerToken, raw), "manual");
    } finally {
      setBusy(false);
    }
  }

  async function submitSearch(form: FormData) {
    const term = String(form.get("term") ?? "");
    setHits(await searchGuests(scannerToken, term));
  }

  async function admit() {
    if (!result || !("guest" in result)) return;
    setBusy(true);
    const staff = staffRef.current?.value.trim() ?? "";
    try {
      localStorage.setItem(STAFF_KEY, staff);
    } catch {}
    const r = await recordCheckin(scannerToken, {
      guestId: result.guest.id,
      qrTokenId: result.qrTokenId,
      seats,
      scannedBy: staff || undefined,
      method,
    });
    setBusy(false);
    if (r.ok) {
      toast.success(t("admitted", { name: result.guest.name, seats }));
      setResult(null);
      setHits([]);
    } else {
      toast.error(t("failed"));
    }
  }

  const tone = result && "guest" in result ? (result.state === "ok" ? "ok" : "warn") : "bad";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="truncate text-lg font-semibold">{eventTitle}</h1>
        <Input
          ref={staffRef}
          defaultValue=""
          placeholder={t("staffName")}
          className="max-w-36"
          aria-label={t("staffName")}
        />
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(
          [
            ["camera", ScanLineIcon, t("modeCamera")],
            ["code", KeyboardIcon, t("modeCode")],
            ["search", SearchIcon, t("modeSearch")],
          ] as const
        ).map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1 rounded-md py-2 ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
        cameraOn ? (
          <div className="overflow-hidden rounded-xl bg-black">
            <Scanner
              formats={["qr_code"]}
              constraints={{ facingMode: "environment" }}
              paused={busy || result !== null}
              components={{ finder: true, torch: true, zoom: true }}
              onScan={onScan}
              onError={() => {
                setCameraOn(false);
                setMode("code");
                toast.error(t("cameraError"));
              }}
            />
          </div>
        ) : (
          <Button size="lg" onClick={startCamera}>
            <ScanLineIcon />
            {t("startCamera")}
          </Button>
        )
      ) : null}

      {mode === "code" ? (
        <form action={submitCode} className="flex gap-2">
          <Input
            name="code"
            dir="ltr"
            autoComplete="off"
            inputMode="text"
            placeholder="ABC-123"
            className="font-mono text-lg tracking-widest uppercase"
          />
          <Button type="submit" disabled={busy}>
            {t("lookup")}
          </Button>
        </form>
      ) : null}

      {mode === "search" ? (
        <div className="space-y-2">
          <form action={submitSearch} className="flex gap-2">
            <Input name="term" placeholder={t("searchPlaceholder")} minLength={3} autoComplete="off" />
            <Button type="submit">{t("search")}</Button>
          </form>
          <ul className="divide-y rounded-lg border">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
                  onClick={async () => {
                    setBusy(true);
                    applyResult(await lookupByGuestId(scannerToken, h.id), "manual");
                    setBusy(false);
                  }}
                >
                  <span>
                    <span className="block font-medium">{h.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {h.phoneMasked} {h.groupLabel ? `· ${h.groupLabel}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t(`rsvp.${h.status}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {busy && !result ? <Spinner className="mx-auto" /> : null}

      {result ? (
        <section
          role="status"
          className={`space-y-3 rounded-xl border-2 p-4 ${tone === "ok" ? "border-emerald-500 bg-emerald-50" : tone === "warn" ? "border-amber-500 bg-amber-50" : "border-red-500 bg-red-50"}`}
        >
          {"guest" in result ? (
            <>
              <p className="text-2xl font-bold">{result.guest.name}</p>
              <p className="text-sm">
                {t(`state.${result.state}`)}
                {result.guest.groupLabel ? ` · ${result.guest.groupLabel}` : ""}
              </p>
              <p className="text-sm" dir="ltr">
                {t("seatsLine", { attending: result.seatsAttending, admitted: result.seatsAdmitted })}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm" htmlFor="admit-seats">
                  {t("admitSeats")}
                </label>
                <Input
                  id="admit-seats"
                  type="number"
                  min={1}
                  max={50}
                  value={seats}
                  onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20"
                  dir="ltr"
                />
                <Button onClick={admit} disabled={busy} className="ms-auto" size="lg">
                  {t("admit")}
                </Button>
                <Button variant="ghost" onClick={() => setResult(null)}>
                  {t("dismiss")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-bold">{t(`state.${result.state}`)}</p>
              <Button variant="outline" onClick={() => setResult(null)}>
                {t("dismiss")}
              </Button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
