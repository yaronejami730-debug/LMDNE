"use server";

import { revalidatePath } from "next/cache";
import {
  addContact,
  setStatut,
  getContact,
  recordCall,
  recordSmsSent,
  markLinkSent,
  addUser,
  deleteUser,
  type Role,
} from "@/lib/db";
import { sendSms } from "@/lib/allmysms";
import { buildMessage, type MsgKind } from "@/lib/messages";
import { getSession } from "@/lib/auth";

function donationUrl() {
  return process.env.DONATION_URL || "http://Charithon.io/lmne-2026";
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
    addUser(username, role === "admin" ? "admin" : "operator");
  } catch {
    return { error: "Cet identifiant existe déjà" };
  }
  revalidatePath("/");
  return {};
}

export async function deleteUserAction(id: string) {
  const s = await getSession();
  if (s?.role !== "admin") return;
  deleteUser(id);
  revalidatePath("/");
}

export async function createContact(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  const prenom = String(formData.get("prenom") || "").trim();
  const telephone = String(formData.get("telephone") || "").trim();
  if (!nom || !prenom || !telephone) return;
  addContact(nom, prenom, telephone);
  revalidatePath("/");
}

export async function setStatutAction(id: string, statut: string) {
  setStatut(id, statut);
  revalidatePath("/");
}

// Enregistre un appel (date + heure). Renvoie le nombre d'appels désormais.
export async function recordCallAction(id: string) {
  recordCall(id);
  revalidatePath("/");
}

// WhatsApp : marque "Lien envoyé" sans envoi SMS facturé.
export async function markLinkSentAction(id: string) {
  markLinkSent(id);
  revalidatePath("/");
}

export type SmsActionResult = { ok: boolean; message: string };

export async function sendSmsAction(
  id: string,
  kind: MsgKind = "initial"
): Promise<SmsActionResult> {
  const contact = getContact(id);
  if (!contact) return { ok: false, message: "Contact introuvable" };

  const message = buildMessage(kind, contact.prenom, donationUrl());

  const res = await sendSms(contact.telephone, message);
  if (res.ok) {
    recordSmsSent(id);
    revalidatePath("/");
    return {
      ok: true,
      message: kind === "relance" ? "Relance envoyée" : "SMS envoyé",
    };
  }
  return { ok: false, message: res.statusText || "Échec de l'envoi" };
}
