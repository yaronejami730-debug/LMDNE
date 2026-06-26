"use client";

import { useTransition } from "react";
import type { Contact, Event } from "@/lib/db";
import {
  recordCallAction,
  whatsappAction,
  smsAction,
  setStatutAction,
} from "./actions";
import { buildMessage, toIntl, STATUSES } from "@/lib/messages";
import { timeAgo, formatStamp, parseSqlite } from "@/lib/time";

// Au-delà de ce nombre de WhatsApp/relances par user en 1 h, on avertit (risque ban)
const SPAM_THRESHOLD = 40;

// "1.0" -> "1", "G" -> "G"
function cleanVal(v: string) {
  return v.replace(/\.0$/, "");
}

const WaIcon = () => (
  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M16 0C7.2 0 0 7.2 0 16c0 2.8.7 5.5 2.1 7.9L0 32l8.3-2.2C10.6 31.2 13.3 32 16 32c8.8 0 16-7.2 16-16S24.8 0 16 0zm0 29.3c-2.5 0-4.9-.7-7-1.9l-.5-.3-4.9 1.3 1.3-4.8-.3-.5C3.4 21 2.7 18.5 2.7 16 2.7 8.7 8.7 2.7 16 2.7S29.3 8.7 29.3 16 23.3 29.3 16 29.3zm7.4-9.9c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3 0-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.3 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.7-.5z" />
  </svg>
);

const EVENT_META: Record<string, { icon: string; verb: string }> = {
  appel: { icon: "📞", verb: "a appelé" },
  appel_wa: { icon: "📲", verb: "a appelé sur WhatsApp" },
  whatsapp: { icon: "🟢", verb: "a envoyé le lien par WhatsApp" },
  sms: { icon: "💬", verb: "a envoyé le lien par SMS" },
  relance: { icon: "🔁", verb: "a relancé" },
  statut: { icon: "📋", verb: "a mis le statut" },
};

// Couleur du badge de statut courant
const STATUS_CLASS: Record<string, string> = {
  "Lien envoyé": "st-blue",
  Relancé: "st-purple",
  "Don effectué": "st-green",
  Refusé: "st-gray",
};

export default function Row({
  contact,
  donationUrl,
  events,
  waLastHour,
}: {
  contact: Contact;
  donationUrl: string;
  events: Event[];
  waLastHour: number;
}) {
  const [pending, startTransition] = useTransition();

  function onCall(e: React.MouseEvent) {
    const last = parseSqlite(contact.last_call_date);
    const within5 = last && Date.now() - last.getTime() < 5 * 60 * 1000;
    if (within5) {
      const who = contact.last_call_by ? ` par ${contact.last_call_by}` : "";
      const ok = window.confirm(
        `⚠️ Attention : ${contact.prenom} a déjà été appelé${who} ${timeAgo(
          contact.last_call_date
        )}.\n\nVoulez-vous quand même l'appeler ?`
      );
      if (!ok) {
        e.preventDefault();
        return;
      }
    }
    startTransition(() => recordCallAction(contact.id));
  }

  const intl = toIntl(contact.telephone);
  function waUrl(kind: "initial" | "relance") {
    const text = encodeURIComponent(
      buildMessage(kind, contact.prenom, donationUrl)
    );
    return `https://wa.me/${intl}?text=${text}`;
  }
  const smsUrl = `sms:${contact.telephone}?&body=${encodeURIComponent(
    buildMessage("initial", contact.prenom, donationUrl)
  )}`;

  function onWhatsApp(e: React.MouseEvent, kind: "initial" | "relance") {
    if (waLastHour >= SPAM_THRESHOLD) {
      const ok = window.confirm(
        `⚠️ ATTENTION : vous avez envoyé ${waLastHour} WhatsApp en moins d'une heure.\n\n` +
          `Risque de blocage ou d'accès restreint sur WhatsApp.\n` +
          `👉 Pour éviter ça, passez par un autre canal : envoyez le lien par SMS.\n\n` +
          `Continuer quand même en WhatsApp ?`
      );
      if (!ok) {
        e.preventDefault();
        return;
      }
    }
    startTransition(() => whatsappAction(contact.id, kind));
  }

  function onSms() {
    startTransition(() => smsAction(contact.id));
  }
  function onStatut(v: string) {
    if (!v) return;
    startTransition(() => setStatutAction(contact.id, v));
    if (v === "Ne répond pas") {
      window.alert(
        "📞 Ce client n'a pas répondu.\nPensez à le rappeler plus tard — il remontera en tête de liste."
      );
    }
  }

  const recall =
    contact.statut === "Ne répond pas" || contact.statut === "À rappeler";

  // Données initiales du tableau (colonnes F, G, D, E)
  const hasOrig =
    contact.orig_note || contact.orig_tag || contact.orig_flag || contact.orig_cat;

  const statusBadge =
    contact.statut !== "À appeler" && !recall ? contact.statut : null;

  return (
    <div className={`row ${recall ? "recall" : ""}`}>
      <div className="who">
        <div className="who-head">
          <b>
            {contact.prenom} {contact.nom}
          </b>
          {recall && <span className="recall-tag">📞 à rappeler</span>}
          {statusBadge && (
            <span className={`st-badge ${STATUS_CLASS[statusBadge] || ""}`}>
              {statusBadge}
            </span>
          )}
        </div>
        <small className="tel">{contact.telephone}</small>

        {/* Timeline des actions (du plus récent au plus ancien) */}
        {events.length > 0 && (
          <div className="timeline">
            {events.map((ev) => {
              const meta = EVENT_META[ev.type] || { icon: "•", verb: ev.type };
              return (
                <div className="tl-item" key={ev.id}>
                  <span className="tl-dot">{meta.icon}</span>
                  <div className="tl-body">
                    <span className="tl-top">
                      <b>{ev.username || "—"}</b> {meta.verb}
                      {ev.type === "statut" && ev.detail ? (
                        <> «&nbsp;{ev.detail}&nbsp;»</>
                      ) : null}
                    </span>
                    <span className="tl-time">{formatStamp(ev.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statut manuel (un seul menu) */}
      <div className="status-col">
        <select
          className="status-select"
          value={STATUSES.includes(contact.statut as never) ? contact.statut : ""}
          onChange={(e) => onStatut(e.target.value)}
          disabled={pending}
        >
          <option value="">— Statut —</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="actions">
        <a className="btn-call" href={`tel:${contact.telephone}`} onClick={onCall}>
          <span className="ico">📞</span> Appeler
        </a>
        <a
          className="btn-wa"
          href={waUrl("initial")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => onWhatsApp(e, "initial")}
        >
          <WaIcon /> WhatsApp
        </a>
        <a className="btn-sms" href={smsUrl} onClick={onSms}>
          <span className="ico">💬</span> SMS
        </a>
        <a
          className="btn-relance"
          href={waUrl("relance")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => onWhatsApp(e, "relance")}
        >
          <span className="ico">🔁</span> Relancer
        </a>
      </div>

      {/* Données initiales du tableau (colonnes F, G, D, E) */}
      {hasOrig && (
        <div className="orig-de">
          <span className="orig-de-label">Données initiales du tableau</span>
          {contact.orig_note && (
            <span className="orig-de-val">F : {contact.orig_note}</span>
          )}
          {contact.orig_tag && (
            <span className="orig-de-val">G : {contact.orig_tag}</span>
          )}
          {contact.orig_flag && (
            <span className="orig-de-val">D : {cleanVal(contact.orig_flag)}</span>
          )}
          {contact.orig_cat && (
            <span className="orig-de-val">E : {cleanVal(contact.orig_cat)}</span>
          )}
        </div>
      )}
    </div>
  );
}
