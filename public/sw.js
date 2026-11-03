// Service Worker: macht die Seite als App installierbar und zeigt ohne Netz einen freundlichen Hinweis.
// Es wird nichts zwischengespeichert, die Daten kommen immer frisch vom Server. Dazu: Push-Benachrichtigungen.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(() => new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Keine Verbindung</title>
      <body style="font-family:system-ui,sans-serif;background:#067ac0;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">
      <div><h1 style="font-size:24px">Keine Internetverbindung</h1><p>Bitte später noch einmal öffnen.</p>
      <button onclick="location.reload()" style="font-size:17px;padding:12px 20px;border-radius:8px;border:0">Neu laden</button></div></body>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )),
  );
});

// Push-Nachrichten anzeigen und beim Antippen die Seite öffnen
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { text: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titel || "OTV C-Jugend", {
    body: d.text || "", icon: "/img/icon-192.png", badge: "/img/icon-192.png", data: { link: d.link || "/" }, tag: d.tag || undefined,
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const ziel = new URL(e.notification.data?.link || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
    for (const c of liste) if (c.url.startsWith(self.location.origin) && "focus" in c) { c.navigate(ziel).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(ziel);
  }));
});
