"use client";

import { useState, useTransition } from "react";
import type { Contact } from "@/lib/db";
import {
  recordCallAction,
  sendSmsAction,
  markLinkSentAction,
  setStatutAction,
} from "./actions";
import { buildMessage, toIntl, STATUSES } from "@/lib/messages";
import { timeAgo, formatDate } from "@/lib/time";

export default function Row({
  contact,
  donationUrl,
}: {
  contact: Contact;
  donationUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  function flash(text: string, isErr = false) {
    setErr(isErr);
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  }

  function onCall(e: React.MouseEvent) {
    // Avertissement si déjà appelé
    if (contact.last_call_date) {
      const ok = window.confirm(
        `⚠️ Vous avez déjà appelé ${contact.prenom} ${timeAgo(
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

  function send(kind: "initial" | "relance") {
    startTransition(async () => {
      const res = await sendSmsAction(contact.id, kind);
      flash(res.message, !res.ok);
    });
  }

  function onWhatsApp() {
    startTransition(() => markLinkSentAction(contact.id));
  }

  function onStatut(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    startTransition(() => setStatutAction(contact.id, v));
  }

  const waText = encodeURIComponent(
    buildMessage("initial", contact.prenom, donationUrl)
  );
  const waUrl = `https://wa.me/${toIntl(contact.telephone)}?text=${waText}`;

  return (
    <div className="row">
      <div className="who">
        <b>
          {contact.prenom} {contact.nom}
        </b>
        <small>{contact.telephone}</small>

        {/* Annotations d'origine du fichier */}
        {(contact.orig_note ||
          contact.orig_tag ||
          contact.orig_cat ||
          contact.orig_flag) && (
          <div className="annot">
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

        {/* Suivi appels / SMS */}
        <div className="meta">
          {contact.call_count > 0 && (
            <span>
              📞 {contact.call_count}× · {timeAgo(contact.last_call_date)}
            </span>
          )}
          {contact.sms_count > 0 && (
            <span>
              💬 {contact.sms_count}× · {timeAgo(contact.last_sms_date)}
            </span>
          )}
        </div>
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
          <small className="status-date">{formatDate(contact.statut_date)}</small>
        )}
      </div>

      <div className="actions">
        <a
          className="btn-call"
          href={`tel:${contact.telephone}`}
          onClick={onCall}
        >
          <span className="ico">📞</span> Appeler
        </a>
        <button className="btn-sms" onClick={() => send("initial")} disabled={pending}>
          <span className="ico">{pending ? "⏳" : "💬"}</span> SMS
        </button>
        <button className="btn-relance" onClick={() => send("relance")} disabled={pending}>
          <span className="ico">🔁</span> Relancer
        </button>
        <a
          className="btn-wa"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsApp}
        >
          <span className="ico">🟢</span> WhatsApp
        </a>
      </div>

      {msg && (
        <span className={`flash ${err ? "flash-err" : "flash-ok"}`}>{msg}</span>
      )}
    </div>
  );
}
