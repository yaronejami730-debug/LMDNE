"use client";

import { useTransition } from "react";
import type { Contact } from "@/lib/db";
import {
  recordCallAction,
  whatsappAction,
  setStatutAction,
} from "./actions";
import { buildMessage, toIntl, STATUSES } from "@/lib/messages";
import { timeAgo, formatDate, parseSqlite } from "@/lib/time";

// Statuts "terminés" : on n'incite plus à relancer
const DONE = ["Don effectué", "Refus", "Faux numéro", "Terminé"];

export default function Row({
  contact,
  donationUrl,
}: {
  contact: Contact;
  donationUrl: string;
}) {
  const [pending, startTransition] = useTransition();

  function onCall(e: React.MouseEvent) {
    if (contact.last_call_date) {
      const who = contact.last_call_by ? ` par ${contact.last_call_by}` : "";
      const ok = window.confirm(
        `⚠️ ${contact.prenom} a déjà été appelé${who} ${timeAgo(
          contact.last_call_date
        )} (le ${formatDate(contact.last_call_date)}).\n` +
          `Appels passés : ${contact.call_count}.\n\nRappeler quand même ?`
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

  function onStatut(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    startTransition(() => setStatutAction(contact.id, v));
  }

  // Incitation à relancer : contact contacté mais inactif depuis > 24 h
  const lastAct = [contact.last_call_date, contact.last_wa_date, contact.statut_date]
    .map(parseSqlite)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const hoursSince = lastAct ? (Date.now() - lastAct.getTime()) / 3.6e6 : 0;
  const aRelancer =
    !DONE.includes(contact.statut) &&
    contact.statut !== "À appeler" &&
    hoursSince > 24;

  const hasOrig =
    contact.orig_note || contact.orig_tag || contact.orig_cat || contact.orig_flag;

  return (
    <div className={`row ${aRelancer ? "relancer" : ""}`}>
      <div className="who">
        <div className="who-head">
          <b>
            {contact.prenom} {contact.nom}
          </b>
          {aRelancer && <span className="relance-flag">⏰ À relancer</span>}
        </div>
        <small className="tel">{contact.telephone}</small>

        {/* Annotations d'origine (fichier importé) */}
        {hasOrig && (
          <div className="annot">
            <span className="annot-label">Fichier :</span>
            {contact.orig_note && (
              <span className="annot-note">📝 {contact.orig_note}</span>
            )}
            {contact.orig_tag && (
              <span className="chip chip-tag">{contact.orig_tag}</span>
            )}
            {contact.orig_cat && contact.orig_cat !== "1.0" && (
              <span className="chip">cat {contact.orig_cat}</span>
            )}
            {contact.orig_flag && (
              <span className="chip chip-flag">{contact.orig_flag}</span>
            )}
          </div>
        )}

        {/* Activité enregistrée par le système */}
        {(contact.call_count > 0 || contact.wa_count > 0) && (
          <div className="meta">
            {contact.call_count > 0 && (
              <span>
                📞 {contact.call_count}× ·{" "}
                {contact.last_call_by ? `${contact.last_call_by} · ` : ""}
                {timeAgo(contact.last_call_date)}
              </span>
            )}
            {contact.wa_count > 0 && (
              <span>
                🟢 {contact.wa_count}× ·{" "}
                {contact.last_wa_by ? `${contact.last_wa_by} · ` : ""}
                {timeAgo(contact.last_wa_date)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="status-col">
        <select
          className="status-select"
          value={STATUSES.includes(contact.statut as never) ? contact.statut : ""}
          onChange={onStatut}
          disabled={pending}
        >
          {!STATUSES.includes(contact.statut as never) && (
            <option value="">{contact.statut}</option>
          )}
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {contact.statut_date && (
          <small className="status-date">
            {contact.statut_by ? `${contact.statut_by} · ` : ""}
            {formatDate(contact.statut_date)}
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
