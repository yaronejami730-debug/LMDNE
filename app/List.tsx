"use client";

import { useMemo, useState } from "react";
import type { Contact, Event } from "@/lib/db";
import Row from "./Row";

const PAGE = 50;

type Filter =
  | "tous"
  | "appeles"
  | "pas_appeles"
  | "whatsapp"
  | "a_relancer"
  | "Lien envoyé"
  | "Don effectué"
  | "Terminé"
  | "À rappeler"
  | "À relancer"
  | "Ne répond pas"
  | "Refusé";

export default function List({
  contacts,
  donationUrl,
  eventsByContact,
}: {
  contacts: Contact[];
  donationUrl: string;
  eventsByContact: Record<string, Event[]>;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("tous");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contacts.filter((c) => {
      // filtre
      switch (filter) {
        case "appeles":
          if (c.call_count === 0) return false;
          break;
        case "pas_appeles":
          if (c.call_count > 0) return false;
          break;
        case "whatsapp":
          if (c.wa_count === 0) return false;
          break;
        case "a_relancer":
          // contactés mais pas finalisés
          if (
            c.statut === "À appeler" ||
            ["Don effectué", "Refusé", "Terminé"].includes(c.statut)
          )
            return false;
          break;
        case "tous":
          break;
        default:
          if (c.statut !== filter) return false;
      }
      if (!s) return true;
      return (
        `${c.prenom} ${c.nom}`.toLowerCase().includes(s) ||
        c.telephone.includes(s)
      );
    });
  }, [contacts, q, filter]);

  const shown = showAll ? filtered : filtered.slice(0, PAGE);

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Rechercher nom ou téléphone…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowAll(false);
          }}
        />
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Filter);
            setShowAll(false);
          }}
        >
          <option value="tous">Tous</option>
          <option value="pas_appeles">Pas encore appelés</option>
          <option value="appeles">Déjà appelés</option>
          <option value="whatsapp">WhatsApp envoyé</option>
          <option value="a_relancer">À relancer (en cours)</option>
          <optgroup label="Statut">
            <option value="Lien envoyé">Lien envoyé</option>
            <option value="Don effectué">Don effectué</option>
            <option value="Terminé">Terminé</option>
            <option value="À rappeler">À rappeler</option>
            <option value="À relancer">À relancer</option>
            <option value="Ne répond pas">Ne répond pas</option>
            <option value="Refusé">Refusé</option>
          </optgroup>
        </select>
      </div>

      <p className="count">
        {filtered.length} contact{filtered.length > 1 ? "s" : ""}
      </p>

      {shown.map((c) => (
        <Row
          key={c.id}
          contact={c}
          donationUrl={donationUrl}
          events={eventsByContact[c.id] || []}
        />
      ))}

      {!showAll && filtered.length > PAGE && (
        <button className="btn-more" onClick={() => setShowAll(true)}>
          Afficher les {filtered.length - PAGE} restants
        </button>
      )}
    </>
  );
}
