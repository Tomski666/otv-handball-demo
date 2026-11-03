if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

document.getElementById("login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fehler = document.getElementById("fehler");
  const knopf = e.target.querySelector("button");
  fehler.textContent = "";
  knopf.disabled = true;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passwort: document.getElementById("pw").value }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      fehler.textContent = d.fehler || "Anmeldung fehlgeschlagen";
      return;
    }
    const ziel = new URLSearchParams(location.search).get("ziel") || "/";
    location.href = ziel.startsWith("/") && !ziel.startsWith("//") ? ziel : "/";
  } catch {
    fehler.textContent = "Keine Verbindung. Bitte später erneut versuchen.";
  } finally {
    knopf.disabled = false;
  }
});

// Demo-Seite: Mannschaft und Rolle per Knopf statt Passwort
(async () => {
  try {
    const d = await (await fetch("/api/demo")).json();
    if (d.fehlt && d.fehlt.length) {
      // Einrichtung unvollständig: klar sagen, was in Netlify fehlt
      const h = document.createElement("div");
      h.className = "login-fehler";
      h.style.cssText = "margin-top:16px;text-align:left";
      h.textContent = `Die Seite ist noch nicht fertig eingerichtet. In Netlify fehlt die Umgebungsvariable: ${d.fehlt.join(" und ")}. Danach einmal neu deployen.`;
      document.getElementById("login").after(h);
    }
    if (!d.demo || (d.fehlt && d.fehlt.length)) return;
    document.title = "Demo · Mannschaftsseite";
    const teams = d.teams || {};
    const ROLLEN = { spieler: "Als Spieler", eltern: "Als Elternteil", trainer: "Als Trainer", kasse: "Als Kasse" };
    const INFO = {
      jugend: { spieler: "für Training und Spiele an- und abmelden", eltern: "eintragen, Fahrten, Rückmeldungen", trainer: "dazu Infos, Termine, Abfragen, Anwesenheit", kasse: "dazu Kasse, Abrechnung und Verwaltung" },
      herren: { spieler: "Dienste, Fahrten, Zu- und Absagen, Mannschaftstour", trainer: "dazu Infos, Termine, Abfragen, Anwesenheit", kasse: "dazu Kasse und Verwaltung" },
    };
    const box = document.createElement("div");
    box.className = "demo-login";
    document.getElementById("login").replaceWith(box);
    document.querySelector(".login-box h1").textContent = "Mannschaftsseite";
    document.querySelector(".login-box .unterzeile").textContent = "Demo";
    document.querySelector(".login-box .leise").textContent = "So organisieren Jugend- und Erwachsenenmannschaften Dienste, Fahrten, Training, Termine und die Mannschaftskasse.";
    const zeigeTeams = () => {
      box.innerHTML = `<p class="demo-marke">Demo</p>
        <p>Alle Namen, Spiele und Beträge sind erfunden. Probier ruhig alles aus: Die Demo wird jede Nacht und auf Knopfdruck zurückgesetzt.</p>
        <p><strong>Welche Mannschaft möchtest du sehen?</strong></p>
        <div class="demo-rollen">${Object.entries(teams).map(([k, t]) => `<button type="button" class="knopf gross" data-team="${k}">${t.name}<span>${t.text}</span></button>`).join("")}</div>`;
    };
    const zeigeRollen = (team) => {
      const p = d.personen[team] || {};
      box.innerHTML = `<p class="demo-marke">Demo · ${teams[team]?.name || ""}</p>
        <p><strong>Wie möchtest du die Seite sehen?</strong></p>
        <div class="demo-rollen">${Object.keys(p).map((r) => `<button type="button" class="knopf gross" data-rolle="${r}" data-team="${team}">${ROLLEN[r]}<span>${p[r].text}: ${INFO[team]?.[r] || ""}</span></button>`).join("")}</div>
        <button type="button" class="link-knopf abstand" data-zurueck="1">‹ andere Mannschaft</button>`;
    };
    zeigeTeams();
    box.addEventListener("click", async (e) => {
      if (e.target.closest("[data-zurueck]")) return zeigeTeams();
      const b = e.target.closest("[data-team]");
      if (!b) return;
      if (!b.dataset.rolle) return zeigeRollen(b.dataset.team);
      b.disabled = true;
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: b.dataset.rolle, team: b.dataset.team }) });
      if (res.ok) location.href = "/";
      else b.disabled = false;
    });
  } catch { /* normale Anmeldung */ }
})();
