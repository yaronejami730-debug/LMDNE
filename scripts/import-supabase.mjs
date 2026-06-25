// Import des contacts + users vers Supabase (service_role).
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import fs from "fs";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const newId = () => randomBytes(5).toString("hex");
const XL = "/private/tmp/claude-501/-Users-yarone-CLMDNE/7eba3c8a-d900-4b5e-8196-49684c9f3ba6/scratchpad/xl";

function parseSheet() {
  const ss = fs.readFileSync(XL + "/xl/sharedStrings.xml", "utf8");
  const strings = [...ss.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
    m[1]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  );
  const sheet = fs.readFileSync(XL + "/xl/worksheets/sheet1.xml", "utf8");
  const rows = [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  const phone = (v) => {
    if (!v) return "";
    let n = Math.round(parseFloat(v)).toString();
    if (n.length === 9) n = "0" + n;
    return n;
  };
  const statutFrom = (f) => {
    const s = (f || "").toLowerCase();
    if (/lien envoy|deja envoy|recu le lien|lien envoyer|msg envoy|sms envoy/.test(s)) return "Lien envoyé";
    if (/contact|deja|discution/.test(s)) return "Appelé";
    return "À appeler";
  };
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  const out = [];
  let i = 0;
  for (const r of rows) {
    const cells = [...r[1].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*?t="([^"]*)")?[^>]*>(?:<v>([\s\S]*?)<\/v>|<is><t[^>]*>([\s\S]*?)<\/t><\/is>)?<\/c>/g)];
    const row = {};
    for (const c of cells) {
      const col = c[1], t = c[2], v = c[3], inl = c[4];
      row[col] = inl !== undefined ? inl : t === "s" ? strings[parseInt(v)] : v;
    }
    const tel = phone(row.A), name = (row.B || "").trim();
    if (!tel || !name) continue;
    const parts = name.split(/\s+/);
    const prenom = parts.shift();
    const nom = parts.join(" ") || "-";
    const F = (row.F || "").trim() || null;
    out.push({
      id: newId(), nom, prenom, telephone: tel,
      statut: statutFrom(F),
      orig_note: F,
      orig_tag: (row.G || "").trim() || null,
      orig_cat: (row.E || "").trim() || null,
      orig_flag: (row.D || "").trim() || null,
      created_at: new Date(base + i * 1000).toISOString(),
    });
    i++;
  }
  return out;
}

async function main() {
  // Users
  const users = [
    { id: newId(), username: "Altabé", role: "admin" },
    { id: newId(), username: "Yaron", role: "operator" },
    { id: newId(), username: "Jeremy", role: "operator" },
    { id: newId(), username: "Sarah", role: "operator" },
  ];
  for (const u of users) {
    await sb.from("users").upsert(u, { onConflict: "username", ignoreDuplicates: true });
  }
  console.log("users ok:", users.length);

  // Contacts (purge + insert par lots)
  await sb.from("contacts").delete().neq("id", "");
  const contacts = parseSheet();
  console.log("parsed contacts:", contacts.length);
  let done = 0;
  for (let i = 0; i < contacts.length; i += 500) {
    const chunk = contacts.slice(i, i + 500);
    const { error } = await sb.from("contacts").insert(chunk);
    if (error) { console.error("ERREUR lot", i, error.message); process.exit(1); }
    done += chunk.length;
    process.stdout.write(`\rinserted ${done}/${contacts.length}`);
  }
  console.log("\nimport terminé:", done, "contacts");
  const { count } = await sb.from("contacts").select("*", { count: "exact", head: true });
  console.log("total en base:", count);
}
main();
