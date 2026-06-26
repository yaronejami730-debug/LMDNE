import { listContacts, listUsers, listAllEvents, type Event } from "@/lib/db";
import { createContact } from "./actions";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "./login/actions";
import List from "./List";
import AdminPanel from "./AdminPanel";
import Countdown from "./Countdown";
import StatsPanel from "./StatsPanel";

export type UserStats = { appel: number; wa: number; sms: number; relance: number };

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const contacts = await listContacts();
  const events = await listAllEvents();
  const eventsByContact: Record<string, Event[]> = {};
  const statsByUser: Record<string, UserStats> = {};
  const linkContacts = new Set<string>(); // contacts ayant reçu le lien (WA/SMS)
  // WhatsApp/relances envoyés par le user connecté dans la dernière heure (anti-spam)
  const hourAgo = Date.now() - 3600_000;
  let waLastHour = 0;
  for (const e of events) {
    (eventsByContact[e.contact_id] ||= []).push(e);
    if (e.type === "whatsapp" || e.type === "sms")
      linkContacts.add(e.contact_id);
    if (
      (e.type === "whatsapp" || e.type === "relance") &&
      e.username === session.username &&
      new Date(e.created_at).getTime() >= hourAgo
    ) {
      waLastHour++;
    }
    const u = e.username || "—";
    const s = (statsByUser[u] ||= { appel: 0, wa: 0, sms: 0, relance: 0 });
    if (e.type === "appel") s.appel++;
    else if (e.type === "whatsapp") s.wa++;
    else if (e.type === "sms") s.sms++;
    else if (e.type === "relance") s.relance++;
  }
  const appeles = contacts.filter((c) => c.call_count > 0).length;
  const liens = linkContacts.size;
  const nrp = contacts.filter((c) => c.statut === "Ne répond pas").length;
  const donationUrl = process.env.DONATION_URL || "http://Charithon.io/lmne-2026";

  const isAdmin = session.role === "admin";

  return (
    <div className="wrap">
      <header className="brand">
        <div className="brand-left">
          <div className="logo">LMNE</div>
          <div>
            <h1>Campagne 2026</h1>
            <p className="sub">CRM téléprospection — appel & relance WhatsApp</p>
          </div>
        </div>
        <div className="brand-right">
          <Countdown />
          <div className="userbox">
            <span className="userchip">
              👤 {session.username}
              {isAdmin && <em> · admin</em>}
            </span>
            <form action={logoutAction}>
              <button className="btn-logout" type="submit">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      {isAdmin && <AdminPanel users={await listUsers()} />}

      <div className="stats">
        <div className="stat">
          <b>{appeles}</b>
          <span>Personnes appelées</span>
        </div>
        <div className="stat">
          <b>{liens}</b>
          <span>Liens envoyés</span>
        </div>
        <div className="stat nrp">
          <b>{nrp}</b>
          <span>Ne répond pas (NRP)</span>
        </div>
        <StatsPanel stats={statsByUser} />
      </div>

      <form className="add" action={createContact}>
        <input name="prenom" placeholder="Prénom" required />
        <input name="nom" placeholder="Nom" required />
        <input
          name="telephone"
          placeholder="Téléphone"
          className="grow"
          required
        />
        <button className="btn-add" type="submit">
          + Ajouter
        </button>
      </form>

      {contacts.length === 0 ? (
        <p className="empty">Aucun contact. Ajoutez-en un ci-dessus.</p>
      ) : (
        <List
          contacts={contacts}
          donationUrl={donationUrl}
          eventsByContact={eventsByContact}
          waLastHour={waLastHour}
        />
      )}
    </div>
  );
}
