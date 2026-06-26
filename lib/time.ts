// Parse une date SQLite "YYYY-MM-DD HH:MM:SS" (UTC) en Date.
export function parseSqlite(d: string | null): Date | null {
  if (!d) return null;
  const iso = d.includes("T") ? d : d.replace(" ", "T") + "Z";
  const t = new Date(iso);
  return isNaN(t.getTime()) ? null : t;
}

// "il y a 2 h", "il y a 3 j", "à l'instant"…
export function timeAgo(d: string | null): string {
  const date = parseSqlite(d);
  if (!date) return "";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 30) return `il y a ${j} j`;
  const mo = Math.floor(j / 30);
  return `il y a ${mo} mois`;
}

// "18:46" (heure seule) ou "25/06 18:46" si autre jour
export function formatClock(d: string | null): string {
  const date = parseSqlite(d);
  if (!date) return "";
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const hm = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return hm;
  const dm = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return `${dm} ${hm}`;
}

// "26/06/2026 à 14h32"
export function formatStamp(d: string | null): string {
  const date = parseSqlite(d);
  if (!date) return "";
  const day = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
  return `${day} à ${time}`;
}

// "25/06/2026 18:46"
export function formatDate(d: string | null): string {
  const date = parseSqlite(d);
  if (!date) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
