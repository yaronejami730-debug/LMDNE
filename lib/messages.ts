// Templates de messages — utilisés pour SMS (AllMySMS) et WhatsApp.

export type MsgKind = "initial" | "relance";

// Deux menus déroulants distincts.
export const STATUS_PROGRESS = ["Lien envoyé", "Don effectué", "Terminé"] as const;
export const STATUS_SUIVI = [
  "À appeler",
  "À rappeler",
  "À relancer",
  "Ne répond pas",
  "Refusé",
] as const;
export const STATUSES = [...STATUS_SUIVI, ...STATUS_PROGRESS] as const;

// Convertit 06xxxxxxxx -> 336xxxxxxxx (international, sans +). Fonction pure.
export function toIntl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("33")) return digits;
  if (digits.startsWith("0")) return "33" + digits.slice(1);
  return digits;
}

export function buildMessage(
  kind: MsgKind,
  prenom: string,
  link: string
): string {
  if (kind === "relance") {
    return `Bonjour ${prenom} 😊

Je me permets de revenir vers vous concernant notre campagne LMNE 2026.

Si le cœur vous en dit, voici le lien direct pour y participer :

${link}

📄 Votre Cerfa est délivré immédiatement et envoyé par mail une fois le paiement effectué.

Un grand merci pour votre soutien 🙏`;
  }
  return `Bonjour ${prenom} 😊

Suite à notre échange, voici le lien direct pour participer à notre campagne LMNE 2026 :

${link}

📄 Votre Cerfa est délivré immédiatement et envoyé par mail une fois le paiement effectué.

Un grand merci pour votre soutien 🙏`;
}
