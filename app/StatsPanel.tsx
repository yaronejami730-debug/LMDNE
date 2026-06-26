"use client";

import { useState } from "react";
import type { UserStats } from "./page";

export default function StatsPanel({
  stats,
}: {
  stats: Record<string, UserStats>;
}) {
  const [open, setOpen] = useState(false);
  const rows = Object.entries(stats).sort((a, b) => b[1].appel - a[1].appel);

  return (
    <>
      <button className="stat stat-btn" onClick={() => setOpen(true)}>
        <b>📊</b>
        <span>Statistiques</span>
      </button>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Statistiques par téléprospecteur</h3>
              <button className="modal-x" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="empty">Aucune action enregistrée pour l'instant.</p>
            ) : (
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Téléprospecteur</th>
                    <th>📞 Appels</th>
                    <th>🟢 WhatsApp</th>
                    <th>💬 SMS</th>
                    <th>🔁 Relances</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([user, s]) => (
                    <tr key={user}>
                      <td>
                        <b>{user}</b>
                      </td>
                      <td>{s.appel}</td>
                      <td>{s.wa}</td>
                      <td>{s.sms}</td>
                      <td>{s.relance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
