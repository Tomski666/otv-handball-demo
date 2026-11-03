// Trainings- und Spieltermine für die An- und Abmeldung. Wird von Server (Erinnerungen) und Seite gleich berechnet.
const TAGE = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 };

export const plusTage = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const wochentag = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
export const startZeit = (text) => {
  const m = /(\d{1,2})[:.](\d{2})/.exec(String(text || ""));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

export function trainingFaelltAus(ausfaelle, datum, slot) {
  return (ausfaelle || []).find((a) => a.von && datum >= a.von && datum <= (a.bis || a.von) && (!a.slot || a.slot === "alle" || a.slot === String(slot)));
}

// Liefert Termine von "von" bis "bis" (jeweils inklusive), sortiert
export function termineZeitraum({ trainingszeiten = [], spiele = [], ausfaelle = [] }, von, bis) {
  const t = [];
  for (let d = von; d <= bis; d = plusTage(d, 1)) {
    trainingszeiten.forEach((tr, i) => {
      if (TAGE[String(tr.tag || "").trim().toLowerCase()] !== wochentag(d)) return;
      const aus = trainingFaelltAus(ausfaelle, d, i);
      t.push({ key: `tr-${d}-${i}`, art: "training", datum: d, zeit: startZeit(tr.zeit), zeitText: tr.zeit || "", ort: tr.halle || "", slot: i,
        titel: "Training", ausfall: aus ? (aus.grund || "fällt aus") : "" });
    });
  }
  for (const s of spiele) {
    if (s.datum >= von && s.datum <= bis) t.push({ key: `sp-${s.id}`, art: "spiel", datum: s.datum, zeit: s.zeit || "", ort: s.halle || "", spiel: s,
      titel: s.heim ? `Heimspiel gegen ${s.gegner}` : `Auswärtsspiel bei ${s.gegner}`, ausfall: "" });
  }
  return t.sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
}

// Status eines Spielers für einen Termin: "ja", "nein" oder "offen". standard = true, wenn nicht ausdrücklich gemeldet.
export function anwesenheitStatus(eintraege, termin, spieler, trainingModus) {
  const e = (eintraege || []).find((x) => x.termin === termin.key && x.spieler === spieler);
  if (e) return { status: e.status, eintrag: e, standard: false };
  if (termin.art === "training" && trainingModus !== "zusagen") return { status: "ja", standard: true };
  return { status: "offen", standard: true };
}
