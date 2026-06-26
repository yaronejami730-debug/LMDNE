"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Contact, Event } from "@/lib/db";
import Row from "./Row";
import { parseSqlite } from "@/lib/time";

const RECALL_MIN = 60; // minutes avant qu'un NRP remonte en tête
const ROW_EST = 200; // hauteur estimée d'une ligne (px), ajustée par mesure réelle
const NO_EVENTS: Event[] = []; // ref. stable -> ne casse pas la mémoïsation de Row

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
      "Faux numéro", "Numéro aucun rapport",
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

  // Virtualisation : seules les lignes proches du viewport sont montées dans le
  // DOM. Au scroll, celles qui sortent (haut ou bas) sont démontées, celles qui
  // entrent sont montées. Le DOM ne contient jamais les ~2700 lignes -> mémoire
  // constante. Scroll interne au conteneur (fiable, pas de piège SSR).
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_EST,
    overscan: 6, // lignes rendues en plus de part et d'autre du viewport
    getItemKey: (i) => filtered[i].id,
  });
  const vItems = virtualizer.getVirtualItems();

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

      <div ref={scrollRef} className="vlist">
        <div
          style={{ position: "relative", height: virtualizer.getTotalSize() }}
        >
          {vItems.map((vi) => {
            const c = filtered[vi.index];
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <Row
                  contact={c}
                  donationUrl={donationUrl}
                  events={eventsByContact[c.id] || NO_EVENTS}
                  waLastHour={waLastHour}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
