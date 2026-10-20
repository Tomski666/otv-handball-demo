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

// Demo-Seite: Rollen per Knopf statt Passwort
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
    document.title = "Demo · OTV C-Jugend";
    const p = d.personen;
    const box = document.createElement("div");
    box.className = "demo-login";
    box.innerHTML = `<p class="demo-marke">Demo</p>
      <p>Alle Namen, Spiele und Beträge sind erfunden. Probier ruhig alles aus: Die Demo wird jede Nacht und auf Knopfdruck zurückgesetzt.</p>
      <p><strong>Wie möchtest du die Seite sehen?</strong></p>
      <div class="demo-rollen">
        <button type="button" class="knopf gross" data-rolle="eltern">Als Elternteil<span>${p.eltern.text}: eintragen, Fahrten, Rückmeldungen</span></button>
        <button type="button" class="knopf gross" data-rolle="trainer">Als Trainer<span>${p.trainer.text}: dazu Infos, Termine und Abfragen</span></button>
        <button type="button" class="knopf gross" data-rolle="kasse">Als Kasse<span>${p.kasse.text}: dazu Kasse, Abrechnung und Verwaltung</span></button>
      </div>`;
    document.getElementById("login").replaceWith(box);
    document.querySelector(".login-box .leise").textContent = "So organisieren Eltern und Trainer einer Jugendmannschaft Standdienst, Kuchen, Fahrten, Trikots, Termine und die Mannschaftskasse.";
    box.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-rolle]");
      if (!b) return;
      b.disabled = true;
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: b.dataset.rolle }) });
      if (res.ok) location.href = "/";
      else b.disabled = false;
    });
  } catch { /* normale Anmeldung */ }
})();
