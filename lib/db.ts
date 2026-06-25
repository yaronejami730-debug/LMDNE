import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";

const db = new Database(path.join(process.cwd(), "data.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'À appeler',
    statut_date TEXT,
    call_count INTEGER NOT NULL DEFAULT 0,
    last_call_date TEXT,
    sms_count INTEGER NOT NULL DEFAULT 0,
    last_sms_date TEXT,
    orig_note TEXT,
    orig_tag TEXT,
    orig_cat TEXT,
    orig_flag TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration des bases existantes : ajoute les colonnes manquantes
const cols = (
  db.prepare("PRAGMA table_info(contacts)").all() as { name: string }[]
).map((c) => c.name);
const addCol = (name: string, def: string) => {
  if (!cols.includes(name))
    db.exec(`ALTER TABLE contacts ADD COLUMN ${name} ${def}`);
};
addCol("statut_date", "TEXT");
addCol("call_count", "INTEGER NOT NULL DEFAULT 0");
addCol("last_call_date", "TEXT");
addCol("sms_count", "INTEGER NOT NULL DEFAULT 0");
addCol("last_sms_date", "TEXT");
addCol("orig_note", "TEXT");
addCol("orig_tag", "TEXT");
addCol("orig_cat", "TEXT");
addCol("orig_flag", "TEXT");

// ---- Utilisateurs (téléprospecteurs + admin) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'operator',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type Role = "operator" | "admin";
export type User = {
  id: string;
  username: string;
  role: Role;
  created_at: string;
};

export function listUsers(): User[] {
  return db
    .prepare("SELECT * FROM users ORDER BY role DESC, username ASC")
    .all() as User[];
}

export function getUserByName(username: string): User | undefined {
  return db
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username.trim()) as User | undefined;
}

export function addUser(username: string, role: Role = "operator") {
  const id = randomBytes(5).toString("hex");
  db.prepare("INSERT INTO users (id, username, role) VALUES (?, ?, ?)").run(
    id,
    username.trim(),
    role
  );
  return id;
}

export function deleteUser(id: string) {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

// Seed initial si table vide
if ((db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c === 0) {
  addUser("Altabé", "admin");
  addUser("Yaron", "operator");
  addUser("Jérémie", "operator");
  addUser("Sarah", "operator");
}

export type Contact = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  statut: string;
  statut_date: string | null;
  call_count: number;
  last_call_date: string | null;
  sms_count: number;
  last_sms_date: string | null;
  orig_note: string | null;
  orig_tag: string | null;
  orig_cat: string | null;
  orig_flag: string | null;
  created_at: string;
};

export function listContacts(): Contact[] {
  return db
    .prepare("SELECT * FROM contacts ORDER BY created_at ASC")
    .all() as Contact[];
}

export function getContact(id: string): Contact | undefined {
  return db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as
    | Contact
    | undefined;
}

export function addContact(nom: string, prenom: string, telephone: string) {
  const id = randomBytes(5).toString("hex");
  db.prepare(
    "INSERT INTO contacts (id, nom, prenom, telephone) VALUES (?, ?, ?, ?)"
  ).run(id, nom, prenom, telephone);
  return id;
}

export function setStatut(id: string, statut: string) {
  db.prepare(
    "UPDATE contacts SET statut = ?, statut_date = datetime('now') WHERE id = ?"
  ).run(statut, id);
}

// Enregistre un appel : incrémente le compteur + date, passe en "Appelé"
// uniquement si le contact n'a pas déjà un statut plus avancé.
export function recordCall(id: string) {
  const c = getContact(id);
  if (!c) return;
  db.prepare(
    "UPDATE contacts SET call_count = call_count + 1, last_call_date = datetime('now') WHERE id = ?"
  ).run(id);
  if (c.statut === "À appeler") setStatut(id, "Appelé");
}

// SMS / WhatsApp envoyé : compteur SMS + statut "Lien envoyé"
export function recordSmsSent(id: string) {
  db.prepare(
    "UPDATE contacts SET sms_count = sms_count + 1, last_sms_date = datetime('now') WHERE id = ?"
  ).run(id);
  setStatut(id, "Lien envoyé");
}

// Marque "Lien envoyé" sans incrémenter le compteur SMS (cas WhatsApp).
export function markLinkSent(id: string) {
  db.prepare(
    "UPDATE contacts SET last_sms_date = datetime('now') WHERE id = ?"
  ).run(id);
  setStatut(id, "Lien envoyé");
}

export default db;
