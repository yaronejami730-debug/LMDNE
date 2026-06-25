"use server";

import { redirect } from "next/navigation";
import { getUserByName } from "@/lib/db";
import { setSession, clearSession } from "@/lib/auth";

export type LoginResult = { error?: string };

export async function loginAction(
  _prev: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const expected = process.env.APP_PASSWORD || "LMDNE770";

  if (!username || !password) return { error: "Identifiant et mot de passe requis" };
  if (password !== expected) return { error: "Mot de passe incorrect" };

  const user = getUserByName(username);
  if (!user) return { error: "Utilisateur inconnu" };

  await setSession({ username: user.username, role: user.role });
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
