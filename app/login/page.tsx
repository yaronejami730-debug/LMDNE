import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>LMDNE</h1>
        <p className="login-sub">Campagne de dons — Connexion téléprospecteur</p>
        <LoginForm />
      </div>
    </div>
  );
}
