import { listContacts, listUsers } from "@/lib/db";
import { createContact } from "./actions";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "./login/actions";
import List from "./List";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const contacts = listContacts();
  const total = contacts.length;
  const appeles = contacts.filter((c) => c.call_count > 0).length;
  const liens = contacts.filter((c) => c.statut === "Lien envoyé").length;
  const donationUrl = process.env.DONATION_URL || "http://Charithon.io/lmne-2026";

  const isAdmin = session.role === "admin";

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <h1>Campagne de dons</h1>
          <p className="sub">
            Appeler le contact, puis envoyer le lien par SMS ou WhatsApp.
          </p>
        </div>
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

      {isAdmin && <AdminPanel users={listUsers()} />}

      <div className="stats">
        <div className="stat">
          <b>{total}</b>
          <span>Contacts</span>
        </div>
        <div className="stat">
          <b>{appeles}</b>
          <span>Appelés</span>
        </div>
        <div className="stat">
          <b>{liens}</b>
          <span>Lien envoyé</span>
        </div>
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
        <List contacts={contacts} donationUrl={donationUrl} />
      )}
    </div>
  );
}
