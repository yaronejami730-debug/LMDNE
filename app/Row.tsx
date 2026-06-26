"use client";

import { useTransition } from "react";
import type { Contact } from "@/lib/db";
import {
  recordCallAction,
  whatsappAction,
  setStatutAction,
} from "./actions";
import { buildMessage, toIntl, STATUS_PROGRESS, STATUS_SUIVI } from "@/lib/messages";
import { timeAgo, formatDate, parseSqlite } from "@/lib/time";

export default function Row({
  contact,
  donationUrl,
}: {
  contact: Contact;
  donationUrl: string;
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

        {/* Historique des actions */}
        {(contact.call_count > 0 ||
          contact.wa_count > 0 ||
          contact.relance_count > 0) && (
          <div className="histo">
            {contact.call_count > 0 && (
              <span className="histo-line">
                📞 {contact.last_call_by || "—"} a appelé{" "}
                {timeAgo(contact.last_call_date)}
                {contact.call_count > 1 ? ` (${contact.call_count}×)` : ""}
              </span>
            )}
            {contact.wa_count > 0 && (
              <span className="histo-line">
                🟢 {contact.last_wa_by || "—"} a envoyé WhatsApp{" "}
                {timeAgo(contact.last_wa_date)}
                {contact.wa_count > 1 ? ` (${contact.wa_count}×)` : ""}
              </span>
            )}
            {contact.relance_count > 0 && (
              <span className="histo-line">
                🔁 {contact.last_relance_by || "—"} a relancé{" "}
                {timeAgo(contact.last_relance_date)}
                {contact.relance_count > 1 ? ` (${contact.relance_count}×)` : ""}
              </span>
            )}
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
        {contact.statut_date && (
          <small className="status-date">
            {contact.statut} · {formatDate(contact.statut_date)}
          </small>
        )}
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
