"use client";

import Script from "next/script";
import { CheckCircle2, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { tx, type Locale } from "@/lib/i18n/shared";

type TurnstileStatus = "loading" | "ready" | "verified" | "error" | "expired";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      size: "flexible";
      appearance: "always";
      callback: () => void;
      "error-callback": () => boolean;
      "expired-callback": () => void;
      "timeout-callback": () => void;
      "response-field": boolean;
      "response-field-name": string;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileField({
  siteKey,
  action,
  locale,
}: {
  siteKey: string;
  action: string;
  locale: Locale;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const [status, setStatus] = useState<TurnstileStatus>("loading");

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!container || !turnstile || widgetIdRef.current) return;

    completedRef.current = false;
    try {
      widgetIdRef.current = turnstile.render(container, {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        appearance: "always",
        callback: () => {
          completedRef.current = true;
          setStatus("verified");
        },
        "error-callback": () => {
          completedRef.current = true;
          setStatus("error");
          return true;
        },
        "expired-callback": () => {
          completedRef.current = true;
          setStatus("expired");
        },
        "timeout-callback": () => {
          completedRef.current = true;
          setStatus("expired");
        },
        "response-field": true,
        "response-field-name": "cf-turnstile-response",
      });
      if (!completedRef.current) setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [action, siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  function retry() {
    const widgetId = widgetIdRef.current;
    if (widgetId && window.turnstile) {
      completedRef.current = false;
      setStatus("ready");
      window.turnstile.reset(widgetId);
      return;
    }

    setStatus("loading");
    renderWidget();
  }

  const showWidget = status === "loading" || status === "ready";

  return (
    <div className="relative min-w-0 rounded-xl border border-lane bg-white p-2" aria-live="polite">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => setStatus("error")}
      />

      <div
        ref={containerRef}
        className={showWidget ? "min-h-[65px] w-full" : "hidden"}
        aria-label={tx(locale, "การตรวจสอบความปลอดภัย", "Security check")}
      />

      {status === "loading" && (
        <div className="absolute inset-2 flex min-h-[65px] items-center justify-center gap-2 text-sm text-ink/55">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {tx(locale, "กำลังโหลด Cloudflare...", "Loading Cloudflare...")}
        </div>
      )}

      {status === "verified" && (
        <div className="flex min-h-[65px] items-center justify-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {tx(locale, "Cloudflare ตรวจสอบเรียบร้อยแล้ว", "Cloudflare verification complete")}
        </div>
      )}

      {(status === "error" || status === "expired") && (
        <div className="flex min-h-[65px] flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sm text-red-700" role="alert">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {status === "expired"
              ? tx(locale, "การตรวจสอบหมดอายุ กรุณาลองใหม่", "Verification expired. Try again.")
              : tx(locale, "โหลด Cloudflare ไม่สำเร็จ กรุณาลองใหม่", "Cloudflare failed to load. Try again.")}
          </div>
          <Button type="button" variant="ghost" onClick={retry} className="min-h-9 px-3 py-1.5">
            <RefreshCw className="size-4" aria-hidden="true" />
            {tx(locale, "ลองใหม่", "Try again")}
          </Button>
        </div>
      )}
    </div>
  );
}
