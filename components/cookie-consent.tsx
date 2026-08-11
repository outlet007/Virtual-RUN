"use client";

import { useEffect, useState } from "react";

const CONSENT_COOKIE = "virtual_run_cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

export function CookieConsent({
  enabled,
  messageHtml,
  policyUrl,
  buttonLabel,
}: {
  enabled: boolean;
  messageHtml: string;
  policyUrl: string;
  buttonLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const accepted = document.cookie
      .split("; ")
      .some((item) => item.startsWith(CONSENT_COOKIE + "=accepted"));
    setVisible(!accepted);
  }, [enabled]);

  function acceptCookies() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      CONSENT_COOKIE +
      "=accepted; Max-Age=" +
      CONSENT_MAX_AGE +
      "; Path=/; SameSite=Lax" +
      secure;
    setVisible(false);
  }

  if (!enabled || !visible) return null;

  return (
    <aside
      aria-label="Cookie Consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink px-3 text-paper shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:px-4"
    >
      <div className="mx-auto flex min-h-12 max-w-[1500px] flex-col items-center justify-center gap-2 sm:flex-row">
        <div className="min-w-0 text-center text-sm leading-relaxed text-paper/85">
          <div
            className="inline [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_ol]:inline-block [&_ol]:text-left [&_p]:m-0 [&_p]:inline [&_ul]:inline-block [&_ul]:text-left"
            dangerouslySetInnerHTML={{ __html: messageHtml }}
          />{" "}
          {policyUrl && (
            <a href={policyUrl} className="font-semibold text-primary underline underline-offset-2">
              ที่นี่
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={acceptCookies}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-ink transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper"
        >
          {buttonLabel}
        </button>
      </div>
    </aside>
  );
}
