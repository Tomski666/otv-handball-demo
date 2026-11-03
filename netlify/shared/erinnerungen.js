// Tägliche Erinnerungen: berechnet aus den Daten, wer welche Push-Nachricht bekommt. Reine Funktion, damit sie testbar ist.
import { anwesenheitStatus, plusTage, termineZeitraum } from "./termine.js";
import { dienstVorschlaege, dienstZaehler } from "./dienste.js";

const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const wt = (iso) => WT[new Date(iso + "T12:00:00Z").getUTCDay()];
const vorname = (n) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
const minus = (zeit, min) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(zeit || "");
  if (!m) return "";
  const t = (parseInt(m[1], 10) * 60 + parseInt(m[2], 10) - min + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export function erinnerungenBerechnen(d, abos, heute) {
  const e = d.einstellungen || {};
  const mod = (k) => (e.module || {})[k] !== false && !(k === "dienste" && !(e.module || {}).dienste);
  if (!mod("push")) return [];
  const erwachsen = e.mannschaftstyp === "erwachsene";
  const kaderNamen = (d.kader || []).map((k) => k.vorname);
  const arten = e.dienstArten || [];
  const zaehler = dienstZaehler(d.dienste, d.spiele, heute);
  const vorschlagTag = plusTage(heute, e.dienstVorschlagTage ?? 3);
  const vorschlaege = mod("dienste") ? (d.spiele || []).filter((s) => s.heim && s.datum === vorschlagTag)
    .map((s) => ({ s, v: dienstVorschlaege(s, { dienstArten: arten, dienste: d.dienste || [], spiele: d.spiele || [], kader: kaderNamen, anwesenheit: mod("anwesenheit") ? d.anwesenheit : [], heute }) })) : [];
  const vorlauf = e.standdienstVorlauf ?? 60;
  const morgen = plusTage(heute, 1);
  const uebermorgen = plusTage(heute, 2);
  const spielName = (s) => (s.heim ? `gegen ${s.gegner}` : `bei ${s.gegner}`);
  const treff = (s) => (s.zeit ? minus(s.zeit, vorlauf) : "");
  const termine = termineZeitraum({ trainingszeiten: e.trainingszeiten || [], spiele: d.spiele || [], ausfaelle: d.trainingsausfall || [] }, morgen, uebermorgen);
  const spieleMorgen = (d.spiele || []).filter((s) => s.datum === morgen);
  const heimspiele = (d.spiele || []).filter((s) => s.heim).sort((a, b) => a.datum.localeCompare(b.datum));
  const nachrichten = [];

  for (const abo of abos) {
    const zeilen = [];
    if (abo.rolle === "spieler" && mod("anwesenheit")) {
      const kind = abo.kind;
      for (const t of kind ? termine : []) {
        const st = anwesenheitStatus(d.anwesenheit, t, kind, e.anwesenheitTraining);
        if (t.art === "training" && t.datum === morgen) {
          if (t.ausfall) zeilen.push(`Training morgen fällt aus${t.ausfall !== "fällt aus" ? ` (${t.ausfall})` : ""}.`);
          else if (st.status === "offen") zeilen.push(`Morgen Training ${t.zeit ? "um " + t.zeit + " Uhr" : ""}: Bist du dabei?`);
          else if (st.status === "ja" && !st.standard) zeilen.push(`Morgen Training${t.zeit ? " um " + t.zeit + " Uhr" : ""}.`);
        }
        if (t.art === "spiel") {
          if (st.status === "offen") zeilen.push(`Spiel am ${wt(t.datum)} ${spielName(t.spiel)}: Bist du dabei? Bitte zu- oder absagen.`);
          else if (st.status === "ja" && t.datum === morgen) {
            const fahrt = (d.mitfahrer || []).map((m) => m.name === kind && (d.fahrten || []).find((f) => f.id === m.fahrtId && f.spielId === t.spiel.id)).find(Boolean);
            zeilen.push(`Morgen Spiel ${spielName(t.spiel)}${treff(t.spiel) ? `, um ${treff(t.spiel)} Uhr in der Halle` : ""}.${fahrt ? ` Du fährst bei ${vorname(fahrt.fahrer)} mit${fahrt.treffpunkt ? ", Abfahrt " + fahrt.treffpunkt : ""}.` : ""}`);
          }
        }
      }
    }
    if (abo.rolle !== "spieler" || erwachsen) {
      const b = abo.besitzer || "__ohne_geraet__";
      for (const s of spieleMorgen) {
        const n = spielName(s);
        if (mod("standdienst") && (d.standdienst || []).some((x) => x.spielId === s.id && x.besitzer === b && !x.reserve)) zeilen.push(`Morgen Standdienst ${n}${treff(s) ? ", ab " + treff(s) + " Uhr" : ""}.`);
        if (mod("standdienst")) for (const c of (d.catering || []).filter((x) => x.spielId === s.id && x.besitzer === b)) zeilen.push(`Morgen bitte ${c.artikel} mitbringen (${n}).`);
        if (mod("zeitnehmer") && (d.zeitnehmer || []).some((x) => x.spielId === s.id && x.besitzer === b)) zeilen.push(`Morgen bist du Zeitnehmer ${n}.`);
        if (mod("waesche") && (d.waschdienst || []).some((x) => x.spielId === s.id && x.besitzer === b)) zeilen.push(`Morgen nach dem Spiel nimmst du die Wäsche mit.`);
        if (mod("dienste")) for (const x of (d.dienste || []).filter((x) => x.spielId === s.id && x.besitzer === b)) {
          const art = arten.find((a) => a.name === x.dienst);
          const ab = art && s.zeit ? (art.vorlauf < 0 ? " nach dem Spiel" : `, ab ${minus(s.zeit, art.vorlauf)} Uhr`) : "";
          zeilen.push(`Morgen ${x.dienst}${ab} (${n}).`);
        }
        for (const f of (mod("fahrten") ? d.fahrten || [] : []).filter((x) => x.spielId === s.id && x.besitzer === b)) {
          const mit = (d.mitfahrer || []).filter((m) => m.fahrtId === f.id).map((m) => m.name);
          zeilen.push(`Morgen fährst du ${n}${f.treffpunkt ? ", Abfahrt " + f.treffpunkt : ""}${mit.length ? ". Dabei: " + mit.join(", ") : ""}.`);
        }
        for (const m of (mod("fahrten") ? d.mitfahrer || [] : []).filter((x) => x.besitzer === b)) {
          const f = (d.fahrten || []).find((x) => x.id === m.fahrtId && x.spielId === s.id);
          if (f && f.besitzer !== b) zeilen.push(`Morgen fährt ${m.name} bei ${vorname(f.fahrer)} mit${f.treffpunkt ? ", Abfahrt " + f.treffpunkt : ""}.`);
        }
        // Wäsche vom letzten Heimspiel zurückbringen
        if (s.heim && mod("waesche")) {
          const vorher = heimspiele.filter((x) => x.datum < s.datum).pop();
          if (vorher && (d.waschdienst || []).some((x) => x.spielId === vorher.id && x.besitzer === b)) zeilen.push("Bitte morgen die gewaschene Wäsche mitbringen.");
        }
      }
      // Offene Aufgaben zwei Tage vorher (an Eltern und Kasse)
      // Vorschlag für offene Helferdienste: wer bisher am seltensten dran war
      for (const { s, v } of vorschlaege) {
        const ich = abo.kind;
        if (!ich) continue;
        const dienst = Object.keys(v).find((k) => v[k].includes(ich));
        if (!dienst) continue;
        const anzahl = (zaehler.get(ich)?.geleistet || 0);
        zeilen.push(erwachsen
          ? `${wt(s.datum)} ${spielName(s)} fehlt noch jemand für ${dienst}. Du warst bisher ${anzahl}× dran und wärst an der Reihe. Kannst du?`
          : `${wt(s.datum)} ${spielName(s)} fehlt noch jemand für ${dienst}. Familie ${ich} war bisher ${anzahl}× dran und wäre an der Reihe. Könnt ihr?`);
      }
      if (e.pushOffeneAufgaben !== false && abo.rolle !== "trainer") {
        for (const s of (d.spiele || []).filter((x) => x.datum === uebermorgen)) {
          const fehlt = [];
          if (s.heim && mod("dienste")) for (const art of arten) {
            const frei = art.personen - (d.dienste || []).filter((x) => x.spielId === s.id && x.dienst === art.name).length;
            if (frei > 0) fehlt.push(`${frei}× ${art.name}`);
          }
          if (s.heim && mod("standdienst")) {
            const frei = (e.standdienstPlaetze || 2) - (d.standdienst || []).filter((x) => x.spielId === s.id && !x.reserve).length;
            if (frei > 0) fehlt.push(`${frei}× Standdienst`);
          } else if (!s.heim && mod("fahrten") && !(d.fahrten || []).some((f) => f.spielId === s.id)) fehlt.push("ein Fahrer");
          const znNoetig = mod("zeitnehmer") && (e.zeitnehmerPlaetze ?? 1) > 0 && (e.zeitnehmerBei !== "heim" || s.heim);
          if (znNoetig && (d.zeitnehmer || []).filter((x) => x.spielId === s.id).length < (e.zeitnehmerPlaetze ?? 1)) fehlt.push("Zeitnehmer");
          const bedarf = (mod("fahrten") ? d.fahrtbedarf || [] : []).filter((x) => x.spielId === s.id).map((x) => x.spieler);
          if (bedarf.length) fehlt.push(`Fahrt für ${bedarf.join(", ")}`);
          if (fehlt.length) zeilen.push(`${wt(s.datum)} ${spielName(s)}: Es fehlt noch ${fehlt.join(", ")}.`);
        }
      }
    }
    if (zeilen.length) nachrichten.push({ abo, titel: abo.rolle === "spieler" ? `Hallo ${abo.kind}!` : "Erinnerung", text: zeilen.slice(0, 4).join("\n"), link: "/" });
  }
  return nachrichten;
}
