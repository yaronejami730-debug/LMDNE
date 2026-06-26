import { NextResponse } from "next/server";
import {
  recordCall,
  markWhatsApp,
  markSms,
  setStatutLogged,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

// Route appelée par navigator.sendBeacon() depuis Row.tsx.
// Avantage vs server action : sendBeacon est garanti de partir même si la page
// se ferme/recharge (navigation tel:/sms:, mise en arrière-plan iOS). L'action
// n'est donc plus tuée par la navigation -> enregistrement fiable.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; action?: string; statut?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const { id, action, statut } = body;
  if (!id || !action) return NextResponse.json({ error: "missing" }, { status: 400 });

  const by = session.username;
  try {
    switch (action) {
      case "call":
        await recordCall(id, by);
        break;
      case "whatsapp":
        await markWhatsApp(id, by, "initial");
        break;
      case "relance":
        await markWhatsApp(id, by, "relance");
        break;
      case "sms":
        await markSms(id, by);
        break;
      case "statut":
        if (!statut) return NextResponse.json({ error: "missing statut" }, { status: 400 });
        await setStatutLogged(id, statut, by);
        break;
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("track error", action, id, e);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
