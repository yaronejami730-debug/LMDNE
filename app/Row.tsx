"use client";

import { useTransition } from "react";
import type { Contact, Event } from "@/lib/db";
import {
  recordCallAction,
  whatsappAction,
  setStatutAction,
} from "./actions";
import { buildMessage, toIntl, STATUS_PROGRESS, STATUS_SUIVI } from "@/lib/messages";
import { timeAgo, formatStamp, parseSqlite } from "@/lib/time";

const EVENT_META: Record<string, { icon: string; verb: string }> = {
  appel: { icon: "📞", verb: "a appelé" },
  whatsapp: { icon: "🟢", verb: "a envoyé le lien par WhatsApp" },
  relance: { icon: "🔁", verb: "a relancé" },
  statut: { icon: "📋", verb: "a mis le statut" },
};

export default function Row({
  contact,
  donationUrl,
  events,
}: {
  contact: Contact;
  donationUrl: string;
  events: Event[];
}) {
  const [pending, startTransition] = useTransition();

  function onCall(e: React.MouseEvent) {
    // Avertir seulement si appelé il y a moins de 5 minutes
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

  function waUrl(kind: "initial" | "relance") {
    const text = encodeURIComponent(
      buildMessage(kind, contact.prenom, donationUrl)
    );
    return `https://wa.me/${toIntl(contact.telephone)}?text=${text}`;
  }

  function onWhatsApp(kind: "initial" | "relance") {
    startTransition(() => whatsappAction(contact.id, kind));
  }

  function onStatut(v: string) {
    if (v) startTransition(() => setStatutAction(contact.id, v));
  }

  const hasOrig =
    contact.orig_note || contact.orig_tag || contact.orig_cat || contact.orig_flag;

  return (
    <div className="row">
      <div className="who">
        <b>
          {contact.prenom} {contact.nom}
        </b>
        <small className="tel">{contact.telephone}</small>

        {/* Données d'origine du fichier */}
        {hasOrig && (
          <div className="annot">
            <span className="annot-label">Base :</span>
            {contact.orig_note && (
              <span className="annot-note">📝 {contact.orig_note}</span>
            )}
            {contact.orig_flag && (
              <span className="chip chip-flag" title="Colonne D">
                {contact.orig_flag}
              </span>
            )}
            {contact.orig_cat && (
              <span className="chip chip-cat" title="Colonne E">
                {contact.orig_cat}
              </span>
            )}
            {contact.orig_tag && (
              <span className="chip chip-tag" title="Colonne G">
                {contact.orig_tag}
              </span>
            )}
          </div>
        )}

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

      {/* Deux menus déroulants */}
      <div className="status-col">
        <select
          className="status-select"
          value={STATUS_PROGRESS.includes(contact.statut as never) ? contact.statut : ""}
          onChange={(e) => onStatut(e.target.value)}
          disabled={pending}
        >
          <option value="">— Avancement —</option>
          {STATUS_PROGRESS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="status-select"
          value={STATUS_SUIVI.includes(contact.statut as never) ? contact.statut : ""}
          onChange={(e) => onStatut(e.target.value)}
          disabled={pending}
        >
          <option value="">— Suivi —</option>
          {STATUS_SUIVI.map((s) => (
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
          onClick={() => onWhatsApp("initial")}
        >
          <span className="ico">🟢</span> WhatsApp
        </a>
        <a
          className="btn-relance"
          href={waUrl("relance")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsApp("relance")}
        >
          <span className="ico">🔁</span> Relancer
        </a>
      </div>
    </div>
  );
}
