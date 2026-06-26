"use server";

import { revalidatePath } from "next/cache";
import {
  addContact,
  setStatutLogged,
  recordCall,
  markWhatsApp,
  markSms,
  addUser,
  deleteUser,
  type Role,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

async function currentUser() {
  return (await getSession())?.username;
}

// ---- Gestion des téléprospecteurs (admin uniquement) ----
export type UserActionResult = { error?: string };

export async function addUserAction(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const s = await getSession();
  if (s?.role !== "admin") return { error: "Réservé à l'administrateur" };
  const username = String(formData.get("username") || "").trim();
  const role = (String(formData.get("role") || "operator") as Role);
  if (!username) return { error: "Identifiant requis" };
  try {
    await addUser(username, role === "admin" ? "admin" : "operator");
  } catch {
    return { error: "Cet identifiant existe déjà" };
  }
  revalidatePath("/");
  return {};
}

export async function deleteUserAction(id: string) {
  const s = await getSession();
  if (s?.role !== "admin") return;
  await deleteUser(id);
  revalidatePath("/");
}

export async function createContact(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  const prenom = String(formData.get("prenom") || "").trim();
  const telephone = String(formData.get("telephone") || "").trim();
  if (!nom || !prenom || !telephone) return;
  await addContact(nom, prenom, telephone);
  revalidatePath("/");
}

export async function setStatutAction(id: string, statut: string) {
  await setStatutLogged(id, statut, await currentUser());
  revalidatePath("/");
}

// Appel : enregistre date/heure + qui a appelé (user connecté).
export async function recordCallAction(id: string) {
  await recordCall(id, await currentUser());
  revalidatePath("/");
}

// WhatsApp (initial ou relance) : enregistre qui + quand + statut.
export async function whatsappAction(
  id: string,
  kind: "initial" | "relance" = "initial"
) {
  await markWhatsApp(id, await currentUser(), kind);
  revalidatePath("/");
}

// SMS : enregistre qui + quand + statut.
export async function smsAction(id: string) {
  await markSms(id, await currentUser());
  revalidatePath("/");
}
