"use client";

import { useMemo, useState } from "react";
import type { Contact } from "@/lib/db";
import Row from "./Row";

const PAGE = 50;

export default function List({
  contacts,
  donationUrl,
}: {
  contacts: Contact[];
  donationUrl: string;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (onlyTodo && c.statut !== "À appeler") return false;
      if (!s) return true;
      return (
        `${c.prenom} ${c.nom}`.toLowerCase().includes(s) ||
        c.telephone.includes(s)
      );
    });
  }, [contacts, q, onlyTodo]);

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
        <label className="chk">
          <input
            type="checkbox"
            checked={onlyTodo}
            onChange={(e) => setOnlyTodo(e.target.checked)}
          />
          À appeler seulement
        </label>
      </div>

      <p className="count">
        {filtered.length} contact{filtered.length > 1 ? "s" : ""}
      </p>

      {shown.map((c) => (
        <Row key={c.id} contact={c} donationUrl={donationUrl} />
      ))}

      {!showAll && filtered.length > PAGE && (
        <button className="btn-more" onClick={() => setShowAll(true)}>
          Afficher les {filtered.length - PAGE} restants
        </button>
      )}
    </>
  );
}
