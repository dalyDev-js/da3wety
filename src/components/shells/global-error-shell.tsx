"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  lang: string;
  dir: "rtl" | "ltr";
  title: string;
  body: string;
  retry: string;
};

/**
 * Body of every root layout's global-error.tsx. Global errors replace the root
 * layout, so this renders a full document and cannot use providers or translations
 * from context; strings are passed in by the (static) wrapper.
 */
export function GlobalErrorShell({ error, reset, lang, dir, title, body, retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={lang} dir={dir}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{title}</h1>
        <p style={{ color: "#666", maxWidth: "28rem", margin: 0 }}>{body}</p>
        {error.digest ? (
          <code style={{ fontSize: "0.75rem", color: "#999" }} dir="ltr">
            {error.digest}
          </code>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {retry}
        </button>
      </body>
    </html>
  );
}
