// Push-Benachrichtigungen (Web Push). Die Schlüssel werden beim ersten Gebrauch erzeugt und im Datenspeicher abgelegt,
// es muss also nichts in Netlify eingetragen werden.
import webpush from "web-push";

const ABO_PREFIX = "push/";

export async function vapid(store) {
  let k = await store.get("push-schluessel", { type: "json" });
  if (!k || !k.publicKey || !k.privateKey) {
    k = webpush.generateVAPIDKeys();
    await store.setJSON("push-schluessel", k);
  }
  return k;
}

export async function aboKey(endpoint) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(endpoint)));
  return ABO_PREFIX + Array.from(new Uint8Array(h).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function alleAbos(store) {
  const { blobs } = await store.list({ prefix: ABO_PREFIX });
  return (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter((a) => a && a.subscription?.endpoint);
}

// nachrichten: [{ abo, titel, text, link }]
export async function senden(store, nachrichten) {
  if (!nachrichten.length) return { gesendet: 0, entfernt: 0 };
  const k = await vapid(store);
  webpush.setVapidDetails("mailto:kontakt@example.invalid", k.publicKey, k.privateKey);
  let gesendet = 0, entfernt = 0;
  await Promise.allSettled(nachrichten.map(async (n) => {
    try {
      await webpush.sendNotification(n.abo.subscription, JSON.stringify({ titel: n.titel, text: n.text, link: n.link || "/" }), { TTL: 60 * 60 * 12, timeout: 8000 });
      gesendet++;
    } catch (e) {
      // Abo abgelaufen oder vom Nutzer entzogen: entfernen
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        await store.delete(await aboKey(n.abo.subscription.endpoint));
        entfernt++;
      }
    }
  }));
  return { gesendet, entfernt };
}

// An alle Abos, optional gefiltert
export async function anAlle(store, filter, titel, text, link) {
  const abos = (await alleAbos(store)).filter(filter || (() => true));
  return senden(store, abos.map((abo) => ({ abo, titel, text, link })));
}
