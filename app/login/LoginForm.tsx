"use client";

import { useActionState } from "react";
import { loginAction, type LoginResult } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginResult, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={action} className="login-form">
      <input
        name="username"
        placeholder="Identifiant (ex : Yaron)"
        autoFocus
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Mot de passe"
        required
      />
      {state.error && <p className="login-err">{state.error}</p>}
      <button className="btn-add" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
