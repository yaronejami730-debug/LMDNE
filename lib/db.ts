import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client serveur uniquement (service_role : bypass RLS). Jamais exposé au client.
const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Role = "operator" | "admin";

export type User = {
  id: string;
  username: string;
  role: Role;
  created_at: string;
};

export type Contact = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  statut: string;
  statut_date: string | null;
  statut_by: string | null;
  call_count: number;
  last_call_date: string | null;
  last_call_by: string | null;
  wa_count: number;
  last_wa_date: string | null;
  last_wa_by: string | null;
  relance_count: number;
  last_relance_date: string | null;
  last_relance_by: string | null;
  orig_note: string | null;
  orig_tag: string | null;
  orig_cat: string | null;
  orig_flag: string | null;
  created_at: string;
};

export type Event = {
  id: number;
  contact_id: string;
  type: string;
  username: string | null;
  detail: string | null;
  created_at: string;
};

function newId() {
  return randomBytes(5).toString("hex");
}

// ---- Contacts ----
export async function listContacts(): Promise<Contact[]> {
  // PostgREST plafonne à 1000 lignes/requête → on pagine avec .range()
  const size = 1000;
  const all: Contact[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await sb
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + size - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Contact[]));
    if (!data || data.length < size) break;
  }
  return all;
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const { data, error } = await sb
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Contact) ?? undefined;
}

export async function addContact(
  nom: string,
  prenom: string,
  telephone: string
) {
  const id = newId();
  const { error } = await sb
    .from("contacts")
    .insert({ id, nom, prenom, telephone });
  if (error) throw error;
  return id;
}

export async function setStatut(id: string, statut: string, by?: string) {
  const { error } = await sb
    .from("contacts")
    .update({ statut, statut_date: new Date().toISOString(), statut_by: by ?? null })
    .eq("id", id);
  if (error) throw error;
  await logEvent(id, "statut", by, statut);
}

export async function recordCall(id: string, by?: string) {
  const c = await getContact(id);
  if (!c) return;
  const { error } = await sb
    .from("contacts")
    .update({
      call_count: c.call_count + 1,
      last_call_date: new Date().toISOString(),
      last_call_by: by ?? null,
    })
    .eq("id", id);
  if (error) throw error;
  await logEvent(id, "appel", by);
}

export async function markWhatsApp(
  id: string,
  by?: string,
  kind: "initial" | "relance" = "initial"
) {
  const c = await getContact(id);
  if (!c) return;
  const now = new Date().toISOString();
  if (kind === "relance") {
    const { error } = await sb
      .from("contacts")
      .update({
        relance_count: c.relance_count + 1,
        last_relance_date: now,
        last_relance_by: by ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    await logEvent(id, "relance", by);
  } else {
    const { error } = await sb
      .from("contacts")
      .update({
        wa_count: c.wa_count + 1,
        last_wa_date: now,
        last_wa_by: by ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    await logEvent(id, "whatsapp", by);
    await setStatut(id, "Lien envoyé", by);
  }
}

// ---- Événements ----
export async function logEvent(
  contactId: string,
  type: string,
  username?: string,
  detail?: string
) {
  await sb.from("events").insert({
    contact_id: contactId,
    type,
    username: username ?? null,
    detail: detail ?? null,
  });
}

export async function listEvents(contactId: string, limit = 6): Promise<Event[]> {
  const { data, error } = await sb
    .from("events")
    .select("*")
    .eq("contact_id", contactId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Event[];
}

// ---- Utilisateurs ----
export async function listUsers(): Promise<User[]> {
  const { data, error } = await sb
    .from("users")
    .select("*")
    .order("role", { ascending: false })
    .order("username", { ascending: true });
  if (error) throw error;
  return (data ?? []) as User[];
}

export async function getUserByName(username: string): Promise<User | undefined> {
  const { data, error } = await sb
    .from("users")
    .select("*")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? undefined;
}

export async function addUser(username: string, role: Role = "operator") {
  const id = newId();
  const { error } = await sb
    .from("users")
    .insert({ id, username: username.trim(), role });
  if (error) throw error;
  return id;
}

export async function deleteUser(id: string) {
  const { error } = await sb.from("users").delete().eq("id", id);
  if (error) throw error;
}
