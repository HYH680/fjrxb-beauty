"use client";

import { useEffect } from "react";

export function DarkShell() {
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.background;
    const prevBody = document.body.style.background;
    const prevColor = document.body.style.color;
    html.style.background = "#000000";
    document.body.style.background = "#000000";
    document.body.style.color = "#f4f4f5";
    return () => {
      html.style.background = prevHtml;
      document.body.style.background = prevBody;
      document.body.style.color = prevColor;
    };
  }, []);

  return null;
}
