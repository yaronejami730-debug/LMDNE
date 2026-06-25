// Templates de messages — utilisés pour SMS (AllMySMS) et WhatsApp.

export type MsgKind = "initial" | "relance";

// Statuts disponibles dans le menu déroulant manuel.
export const STATUSES = [
  "À appeler",
  "Appelé",
  "Lien envoyé",
  "Relancé",
  "À rappeler",
  "Ne répond pas",
  "Faux numéro",
  "Refus",
  "À donner",
  "Don effectué",
  "Terminé",
] as const;

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
    return `Bonjour ${prenom},

Je me permets de revenir vers vous concernant notre échange.

Voici le lien direct :

${link}

Merci pour votre soutien.`;
  }
  return `Bonjour ${prenom},

Suite à notre entretien téléphonique, vous trouverez ci-dessous le lien direct pour participer à notre campagne :

${link}

Merci pour votre soutien.`;
}
