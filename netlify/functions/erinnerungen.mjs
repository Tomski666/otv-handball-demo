// Geplante Funktion: schickt jeden Nachmittag die Push-Erinnerungen für morgen (und offene Aufgaben für übermorgen).
import { getStore } from "@netlify/blobs";
import { alleAbos, senden } from "../shared/push.js";
import { erinnerungenBerechnen } from "../shared/erinnerungen.js";

const env = (k) => (globalThis.Netlify?.env?.get(k) ?? process.env[k]);
const SAMMLUNGEN = ["spiele", "standdienst", "catering", "fahrten", "mitfahrer", "zeitnehmer", "waschdienst", "anwesenheit", "trainingsausfall", "fahrtbedarf", "dienste", "kader"];

export default async () => {
  if (["1", "true", "ja", "on"].includes(String(env("DEMO_MODUS") || "").trim().toLowerCase())) return new Response("Demo: keine Erinnerungen");
  const store = getStore({ name: "daten", consistency: "strong" });
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  const logKey = `push-log/${heute}`;
  if (await store.get(logKey, { type: "text" })) return new Response("schon gesendet");
  await store.set(logKey, new Date().toISOString());

  const d = { einstellungen: (await store.get("einstellungen", { type: "json" })) || {} };
  await Promise.all(SAMMLUNGEN.map(async (col) => {
    const { blobs } = await store.list({ prefix: `${col}/` });
    d[col] = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
  }));
  const nachrichten = erinnerungenBerechnen(d, await alleAbos(store), heute);
  const r = await senden(store, nachrichten);
  return new Response(JSON.stringify({ nachrichten: nachrichten.length, ...r }));
};

// täglich 16:00 UTC = 17:00 Uhr (Winter) bzw. 18:00 Uhr (Sommer) in Deutschland
export const config = { schedule: "0 16 * * *" };
