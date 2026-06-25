"use client";

import { useActionState, useTransition } from "react";
import type { User } from "@/lib/db";
import {
  addUserAction,
  deleteUserAction,
  type UserActionResult,
} from "./actions";

export default function AdminPanel({ users }: { users: User[] }) {
  const [state, action, pending] = useActionState<UserActionResult, FormData>(
    addUserAction,
    {}
  );
  const [, startTransition] = useTransition();

  return (
    <details className="admin">
      <summary>👥 Téléprospecteurs ({users.length})</summary>

      <div className="admin-body">
        <div className="user-list">
          {users.map((u) => (
            <span key={u.id} className={`user-tag ${u.role}`}>
              {u.username}
              {u.role === "admin" ? " · admin" : ""}
              {u.role !== "admin" && (
                <button
                  className="user-del"
                  title="Supprimer"
                  onClick={() =>
                    startTransition(() => deleteUserAction(u.id))
                  }
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>

        <form action={action} className="add-user">
          <input name="username" placeholder="Nouvel identifiant" required />
          <select name="role" defaultValue="operator">
            <option value="operator">Téléprospecteur</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-add" type="submit" disabled={pending}>
            + Ajouter
          </button>
        </form>
        {state.error && <p className="login-err">{state.error}</p>}
        <p className="admin-hint">
          Mot de passe universel pour tous : <code>LMDNE770</code>
        </p>
      </div>
    </details>
  );
}
