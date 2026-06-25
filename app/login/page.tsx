import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">LMNE</div>
        <h1>Campagne 2026</h1>
        <p className="login-sub">Connexion téléprospecteur</p>
        <LoginForm />
      </div>
    </div>
  );
}
