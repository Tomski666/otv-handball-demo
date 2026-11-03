// Helferdienste: Fairness-Zähler und Vorschlag, wer bei offenen Diensten an der Reihe wäre.
// Dieselbe Logik steckt in public/app.js (Funktion dienstVorschlaege), damit Seite und Erinnerung übereinstimmen.

export function dienstZaehler(dienste, spiele, heute) {
  const z = new Map();
  for (const d of dienste || []) {
    const sp = (spiele || []).find((s) => s.id === d.spielId);
    if (!sp || !d.person) continue;
    const e = z.get(d.person) || { geleistet: 0, geplant: 0, zuletzt: "" };
    if (sp.datum < heute) { e.geleistet++; if (sp.datum > e.zuletzt) e.zuletzt = sp.datum; } else e.geplant++;
    z.set(d.person, e);
  }
  return z;
}

// Liefert { Dienstname: [Namen] } für ein Spiel: offene Plätze, verteilt an die, die bisher am seltensten dran waren
export function dienstVorschlaege(spiel, { dienstArten = [], dienste = [], spiele = [], kader = [], anwesenheit = [], heute }) {
  const zaehler = dienstZaehler(dienste, spiele, heute);
  const imSpiel = new Set(dienste.filter((d) => d.spielId === spiel.id).map((d) => d.person).filter(Boolean));
  const abgemeldet = new Set((anwesenheit || []).filter((a) => a.termin === `sp-${spiel.id}` && a.status === "nein").map((a) => a.spieler));
  const kandidaten = kader.filter((n) => !imSpiel.has(n) && !abgemeldet.has(n)).sort((a, b) => {
    const za = zaehler.get(a) || { geleistet: 0, geplant: 0, zuletzt: "" };
    const zb = zaehler.get(b) || { geleistet: 0, geplant: 0, zuletzt: "" };
    return (za.geleistet + za.geplant) - (zb.geleistet + zb.geplant) || za.zuletzt.localeCompare(zb.zuletzt) || a.localeCompare(b, "de");
  });
  const v = {};
  for (const art of dienstArten) {
    const offen = art.personen - dienste.filter((d) => d.spielId === spiel.id && d.dienst === art.name).length;
    v[art.name] = offen > 0 ? kandidaten.splice(0, offen) : [];
  }
  return v;
}
