"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Contact, Event } from "@/lib/db";
import Row from "./Row";
import { parseSqlite } from "@/lib/time";

const PAGE = 50;
const RECALL_MIN = 60; // minutes avant qu'un NRP remonte en tête

const clean = (v: string | null) => (v ? v.replace(/\.0$/, "") : "");

// NRP/à rappeler sans action depuis > 1 h → à rappeler maintenant
function needsRecall(c: Contact) {
  if (c.statut !== "Ne répond pas" && c.statut !== "À rappeler") return false;
  const t = parseSqlite(c.statut_date);
  const ageMin = t ? (Date.now() - t.getTime()) / 60000 : Infinity;
  return ageMin > RECALL_MIN;
}

type Group =
  | "Activité"
  | "Statut"
  | "Colonne D"
  | "Colonne E"
  | "Colonne F"
  | "Colonne G";
type Opt = { id: string; label: string; group: Group; test: (c: Contact) => boolean };

export default function List({
  contacts,
  donationUrl,
  eventsByContact,
  waLastHour,
}: {
  contacts: Contact[];
  donationUrl: string;
  eventsByContact: Record<string, Event[]>;
  waLastHour: number;
}) {
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(PAGE); // nb de lignes rendues (incrémental)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);

  // Options de filtre (dont valeurs distinctes D / E / F du fichier)
  const options = useMemo<Opt[]>(() => {
    const opts: Opt[] = [
      { id: "appeles", label: "Déjà appelés", group: "Activité", test: (c) => c.call_count > 0 },
      { id: "pas_appeles", label: "Pas encore appelés", group: "Activité", test: (c) => c.call_count === 0 },
      { id: "whatsapp", label: "WhatsApp envoyé", group: "Activité", test: (c) => c.wa_count > 0 },
    ];
    for (const s of [
      "Lien envoyé", "Relancé", "Don effectué", "À rappeler",
      "À relancer", "Ne répond pas", "Refusé",
    ]) {
      opts.push({ id: "st_" + s, label: s, group: "Statut", test: (c) => c.statut === s });
    }
    // Colonne D (valeurs distinctes)
    const dVals = [...new Set(contacts.map((c) => clean(c.orig_flag)).filter(Boolean))].sort();
    for (const v of dVals)
      opts.push({ id: "d_" + v, label: "D = " + v, group: "Colonne D", test: (c) => clean(c.orig_flag) === v });
    // Colonne E (valeurs distinctes)
    const eVals = [...new Set(contacts.map((c) => clean(c.orig_cat)).filter(Boolean))].sort();
    for (const v of eVals)
      opts.push({ id: "e_" + v, label: "E = " + v, group: "Colonne E", test: (c) => clean(c.orig_cat) === v });
    // Colonne F (toutes les valeurs distinctes)
    const fVals = [...new Set(contacts.map((c) => (c.orig_note || "").trim()).filter(Boolean))].sort();
    for (const v of fVals)
      opts.push({ id: "f_" + v, label: "F = " + v, group: "Colonne F", test: (c) => (c.orig_note || "").trim() === v });
    // Colonne G (toutes les valeurs distinctes)
    const gVals = [...new Set(contacts.map((c) => (c.orig_tag || "").trim()).filter(Boolean))].sort();
    for (const v of gVals)
      opts.push({ id: "g_" + v, label: "G = " + v, group: "Colonne G", test: (c) => (c.orig_tag || "").trim() === v });
    return opts;
  }, [contacts]);

  const optById = useMemo(() => {
    const m = new Map<string, Opt>();
    for (const o of options) m.set(o.id, o);
    return m;
  }, [options]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Regroupe les options sélectionnées par groupe (OR intra-groupe, AND inter-groupes)
    const activeByGroup = new Map<Group, Opt[]>();
    for (const id of selected) {
      const o = optById.get(id);
      if (!o) continue;
      const arr = activeByGroup.get(o.group) || [];
      arr.push(o);
      activeByGroup.set(o.group, arr);
    }

    const arr = contacts.filter((c) => {
      for (const [, opts] of activeByGroup) {
        if (!opts.some((o) => o.test(c))) return false;
      }
      if (!s) return true;
      return (
        `${c.prenom} ${c.nom}`.toLowerCase().includes(s) ||
        c.telephone.includes(s) ||
        (c.orig_note || "").toLowerCase().includes(s) ||
        (c.orig_tag || "").toLowerCase().includes(s)
      );
    });

    // Tri : clients à rappeler en tête, puis ordre alphabétique (nom, prénom)
    return [...arr].sort((a, b) => {
      const r = (needsRecall(a) ? 0 : 1) - (needsRecall(b) ? 0 : 1);
      if (r) return r;
      return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr", {
        sensitivity: "base",
      });
    });
  }, [contacts, q, selected, optById]);

  const recallCount = useMemo(() => contacts.filter(needsRecall).length, [contacts]);

  // Rendu incrémental : on n'affiche jamais les ~2700 lignes d'un coup (ça fait
  // sauter le navigateur). On rend `visible` lignes, et on en ajoute par paquets
  // de PAGE quand le sentinel arrive à l'écran (scroll) ou via le bouton.
  const shown = filtered.slice(0, visible);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Remet le compteur à zéro quand le filtre/la recherche change
  useEffect(() => {
    setVisible(PAGE);
  }, [q, selected]);

  // Auto-chargement au scroll
  useEffect(() => {
    if (visible >= filtered.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE, filtered.length));
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, filtered.length]);

  // Groupes pour le panneau
  const grouped = useMemo(() => {
    const g = new Map<Group, Opt[]>();
    for (const o of options) {
      const arr = g.get(o.group) || [];
      arr.push(o);
      g.set(o.group, arr);
    }
    return [...g.entries()];
  }, [options]);

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Rechercher nom, téléphone, note…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className={`filter-btn ${selected.size ? "active" : ""}`}
          onClick={() => setPanelOpen((o) => !o)}
        >
          ⚙︎ Filtres{selected.size ? ` (${selected.size})` : ""}
        </button>
        {selected.size > 0 && (
          <button className="filter-clear" onClick={() => setSelected(new Set())}>
            Effacer
          </button>
        )}
      </div>

      {panelOpen && (
        <div className="filter-panel">
          {grouped.map(([group, opts]) => (
            <div className="fp-group" key={group}>
              <div className="fp-title">{group}</div>
              <div className="fp-opts">
                {opts.map((o) => (
                  <label
                    key={o.id}
                    className={`fp-opt ${selected.has(o.id) ? "on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {recallCount > 0 && (
        <div className="recall-banner">
          📞 <b>{recallCount}</b> client{recallCount > 1 ? "s" : ""} sans réponse
          — à rappeler (remontés en tête)
        </div>
      )}

      <p className="count">
        {filtered.length} contact{filtered.length > 1 ? "s" : ""}
      </p>

      {shown.map((c) => (
        <Row
          key={c.id}
          contact={c}
          donationUrl={donationUrl}
          events={eventsByContact[c.id] || []}
          waLastHour={waLastHour}
        />
      ))}

      {visible < filtered.length && (
        <>
          <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
          <button
            className="btn-more"
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE, filtered.length))
            }
          >
            Afficher plus ({filtered.length - visible} restants)
          </button>
        </>
      )}
    </>
  );
}
