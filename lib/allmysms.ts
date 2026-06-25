// Client AllMySMS — API HTTPS v9.0
// Doc: https://doc.allmysms.com/api/en  (endpoint simple : login, apiKey, message, mobile, tpoa)

import { toIntl } from "./messages";

const BASE = "https://api.allmysms.com/http/9.0/";

export type SendResult = {
  ok: boolean;
  status: number | null;
  statusText: string;
  campaignId?: string;
  raw: string;
};

export async function sendSms(
  phone: string,
  message: string
): Promise<SendResult> {
  const login = process.env.ALLMYSMS_LOGIN;
  const apiKey = process.env.ALLMYSMS_APIKEY;
  const tpoa = process.env.ALLMYSMS_SENDER || "LMDNE";

  if (!login || !apiKey) {
    return { ok: false, status: null, statusText: "Identifiants AllMySMS manquants", raw: "" };
  }

  const params = new URLSearchParams({
    login,
    apiKey,
    message,
    mobile: toIntl(phone),
    tpoa,
  });

  let raw = "";
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    raw = await res.text();
  } catch (e) {
    return { ok: false, status: null, statusText: `Erreur réseau: ${e}`, raw };
  }

  // Réponse JSON {"status":100,"statusText":"...","campaignId":"..."}
  let status: number | null = null;
  let statusText = raw;
  let campaignId: string | undefined;
  try {
    const j = JSON.parse(raw);
    status = Number(j.status);
    statusText = j.statusText ?? statusText;
    campaignId = j.campaignId;
  } catch {
    // réponse non-JSON : on garde le texte brut
  }

  // status 100 = messages envoyés
  return { ok: status === 100, status, statusText, campaignId, raw };
}
