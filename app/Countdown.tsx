"use client";

import { useEffect, useState } from "react";

// Fin de campagne : 28 juin 2026 inclus → échéance 29 juin 00:00 (Paris, CEST +02:00)
const DEADLINE = new Date("2026-06-29T00:00:00+02:00").getTime();

export default function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <div className="countdown" />;

  const diff = Math.max(0, DEADLINE - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const over = diff === 0;

  return (
    <div className={`countdown ${over ? "over" : ""}`}>
      <span className="cd-label">{over ? "Campagne terminée" : "Fin de campagne"}</span>
      {!over && (
        <div className="cd-blocks">
          <Block n={d} l="j" />
          <Block n={h} l="h" />
          <Block n={m} l="min" />
          <Block n={s} l="s" />
        </div>
      )}
    </div>
  );
}

function Block({ n, l }: { n: number; l: string }) {
  return (
    <span className="cd-block">
      <b>{String(n).padStart(2, "0")}</b>
      <em>{l}</em>
    </span>
  );
}
