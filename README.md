# Elternseite OTV männliche C-Jugend

Passwortgeschützte Webseite für die Eltern der männlichen C-Jugend des Ohligser TV 1888.
Hosting über GitHub und Netlify (Gratis-Tarif), Daten in Netlify Blobs. Kein Framework und kein Build-Schritt.

## Inhalt

| Bereich | Wer darf was |
|---|---|
| Start | Die zwei nächsten Spiele: Heimspiel mit „Ich übernehme Standdienst“ und „Ich bringe etwas mit“, Auswärtsspiel mit Fahrern, freien Plätzen und „Kind fährt mit“. Darunter „Meine Termine“ mit Kalender-Export. Auf dem Handy ein Hinweis zur App-Installation |
| Infos & Termine | Das Trainerteam schreibt kurze Infos (z. B. Trainingsausfall), die auf der Startseite stehen, bis sie ablaufen. Abfragen wie „Wer ist in den Herbstferien beim Training?“: Eltern kreuzen für ihren Sohn an, Trainer und Kasse sehen die Übersicht und können Antworten aus WhatsApp direkt in der Tabelle antippen. Termine (z. B. Weihnachtsfeier) mit Rückmeldefrist stehen auf derselben Seite. Der WhatsApp-Text pro Spiel (Startseite, für Trainer und Kasse) enthält aktuelle Trainer-Infos und offene Rückmeldungen |
| Mannschaft | Text, Liga, Kader (nur Vornamen), Trainer, Trainingszeiten. Ändern nur Kasse |
| Spiele | Kalender-Abo (webcal-Link mit allen Spielen und Mannschaftsterminen, ohne Namen; Kasse kann den Link in der Verwaltung erneuern). handball.net-Widget (Spielplan, Tabelle) und eigene Terminliste. Termine pflegt die Kasse |
| Heimspiel-Catering | Artikel mit „bei Bedarf“ (z. B. Kaffee) stehen nur auf der Liste, wenn die Kasse sie beim Spiel zuschaltet. Pro Heimspiel Standdienst (Plätze begrenzt) und Mitbringliste. Alle Eltern tragen sich ein und entfernen nur ihre eigenen Einträge. 2 feste Plätze plus Reserve. Knopf „Text für WhatsApp“ |
| Vorrat und Wäsche | Auf der Catering-Seite: Kaffee, Milch, Zucker, Becher, Spülmittel mit „reicht / knapp / leer“. Was knapp oder leer ist, steht automatisch auf der Mitbringliste fürs nächste Heimspiel. Wäsche: pro Heimspiel trägt sich jemand ein, der Geschirrtücher und Spüllappen danach mitnimmt, wäscht und zum nächsten Heimspiel mitbringt. Die Kasse kann die Anzahl je Artikel pro Spiel mit − / + ändern |
| Zeitnehmer | Bei jedem Spiel (einstellbar: alle oder nur Heimspiele) eine Zeile „Zeitnehmer: noch offen / Name“ mit „Ich mache das“. Orange wenn offen, rot ab 7 Tage vorher. WhatsApp-Text unter Spiele |
| Termine | Feiern, Elternabende usw. Eltern sagen für ihre Familie zu oder ab und geben zusätzliche Personen an. Die Kasse trägt Antworten aus WhatsApp in „Rückmeldungen verwalten“ ein und bucht Zahlungen direkt in die Kasse |
| Fahrten | Fahrgemeinschaften zu Auswärtsspielen: Plätze anbieten, Jungs eintragen, WhatsApp-Text |
| Trikots | Waschplan reihum nach Kader, Tausch und „erledigt“ durch alle Eltern |
| Kasse | Eltern sehen zuerst nur Kassenstand und letzte Buchungen, Details auf Knopfdruck. Alle sehen Stand, Buchungen, Einnahmen nach Kanal, Ausgaben nach Zweck, CSV-Export, Ergebnis je Heimspiel. Buchen nur Kasse, inklusive „Heimspiel abrechnen“ mit fertigem WhatsApp-Text |
| Galerie | Erst sichtbar, wenn die Kasse sie unter Verwaltung freigibt. Dann laden alle Fotos hoch (werden im Browser verkleinert, Standortdaten entfernt). Melden blendet ein Foto sofort aus, die Kasse gibt frei oder löscht |
| Verwaltung | Nur Kasse: Hallen mit Adresse (daraus der Knopf „Route“), Trainingszeiten, Kader, Trainer, Anfangsbestand, Mitbringliste, Vorrat, Wäsche, Zeitnehmer, Kategorien, Widget-Token. Dazu die Helfer-Übersicht (wer hat wie oft Standdienst, Mitbringen, Fahren, Zeitnehmer, Trikots übernommen), gezählt über den Sohn in Klammern hinter dem Namen |

Drei Passwörter: Das **Eltern-Passwort** erlaubt Lesen und Eintragen. Das **Trainer-Passwort** kann alles wie das Eltern-Passwort und zusätzlich Infos, Termine und Abfragen anlegen und bearbeiten (Zahlungen buchen bleibt bei der Kasse). Das **Kassen-Passwort** (nur Tomski und Peggy) erlaubt zusätzlich Buchungen und Verwaltung.

## Einrichtung

1. Ordnerinhalt in ein neues privates GitHub-Repository hochladen.
2. In Netlify: *Add new site → Import an existing project* → Repository wählen. Build-Befehl leer lassen, Publish-Verzeichnis `public` (steht schon in `netlify.toml`).
3. Unter *Site configuration → Environment variables* drei Variablen anlegen:
   - `ELTERN_PASSWORT`: Passwort für die Eltern
   - `KASSE_PASSWORT`: Passwort für die Kassenführung, deutlich anders als das Eltern-Passwort
   - `TRAINER_PASSWORT` (optional): Passwort für das Trainerteam
   - `SESSION_SECRET`: lange Zufallszeichenfolge (mindestens 32 Zeichen), z. B. aus einem Passwortmanager
4. Neu deployen. Beim ersten Aufruf legt die Seite Startdaten an (Anfangsbestand 850 €, Trainer, Trainingszeiten, Heimspiel am 10.10.2026).
5. Mit dem Kassen-Passwort anmelden, unter **Verwaltung** den Kader mit Vornamen eintragen und unter **Spiele** die weiteren Termine ergänzen.

Netlify Blobs braucht keine eigene Einrichtung, der Speicher entsteht automatisch mit der Seite.

## handball.net-Widget

Auf handball.net die Mannschaft öffnen, im Reiter Spielplan „Füge den Spielplan deiner Website hinzu“ anklicken und den Token aus dem angezeigten Code unter **Verwaltung** eintragen. Ohne Token zeigt die Seite einen Link zu handball.net.

Hinweis: Die eigene Terminliste unter **Spiele** speist Catering und Trikotplan. Sie wird nicht automatisch aus handball.net gefüllt, weil handball.net dafür keine offene Schnittstelle anbietet.

## Passwort wechseln

Variable in Netlify ändern und neu deployen. Wer schon angemeldet ist, bleibt angemeldet. Um alle abzumelden, zusätzlich `SESSION_SECRET` ändern. Empfehlung: zu jeder neuen Saison beide Passwörter und das Secret wechseln.

## Grenzen, die man kennen sollte

- Ein gemeinsames Passwort heißt: Wer es hat, kommt rein. Es gibt keine Einzelkonten und kein Protokoll, wer was eingetragen hat.
- „Eigene Einträge“ werden über eine zufällige Kennung im Browser erkannt. Wer Browserdaten löscht oder das Gerät wechselt, kann alte Einträge nicht mehr selbst entfernen, die Kasse aber schon.
- Fotos können heruntergeladen und weitergegeben werden. Das lässt sich technisch nicht verhindern.
- Vor dem Start der Galerie die Einwilligung der Eltern einholen und mit der Jugendleitung bzw. dem Schutzkonzept des OTV abstimmen.

## Dateien

```
public/                 Webseite (HTML, CSS, JS, Logo, Schriften lokal, kein Google Fonts)
netlify/edge-functions/ schutz.js: Passwortschutz für jede Anfrage
netlify/functions/      api.mjs: Login, Daten, Galerie
netlify/shared/         session.js: signiertes Anmelde-Cookie
netlify.toml            Konfiguration, noindex und Sicherheits-Header
```

## Als App auf dem Handy

iPhone: Seite in Safari öffnen, Teilen, „Zum Home-Bildschirm“. Android: Chrome-Menü, „Zum Startbildschirm hinzufügen“ bzw. „App installieren“.

## Aufbau (ab Version 1.4)

Startseite = alles zum nächsten Heim- und Auswärtsspiel. Seite **Spiele** = alle Spiele mit derselben Karte (Standdienst, Mitbringen, Fahrten, Zeitnehmer, Wäsche, Trikots), Filter Alle/Heim/Auswärts, darunter Vorrat, Kalender-Abo und handball.net. Die früheren Seiten Catering und Fahrten leiten auf die Spiele-Seite mit Filter um. Navigation unten: Start, Spiele, Infos, Kasse, Mehr. Ab 1.5: „Deine Aufgaben“ oben auf der Startseite, Verwaltung in aufklappbaren Bereichen, beim Austragen aus dem Standdienst rückt die erste Reserve automatisch nach.

## Getränke und Strichliste (ab 1.6)

Der eingetragene Standdienst (auch Reserve) sieht am Spieltag und am Tag danach in der Heimspiel-Karte eine Strichliste der Getränke und zählt per Tipp. Mehrere Handys zählen zusammen, andere Eltern sehen die Liste nicht (auch nicht über die Schnittstelle). In der Kasse unter „Heimspiel abrechnen“ werden die Mengen vorausgefüllt; der OTV-Anteil (Standard 50 % des Getränkeumsatzes) wird als offene Ausgabe „Getränke OTV“ gebucht und im Kassenstand sofort abgezogen. „An den OTV zu zahlen“ sammelt die offenen Posten, die Kasse markiert sie nach der monatlichen Zahlung als bezahlt. Getränke und Preise pflegt die Kasse in der Verwaltung.

## Bedienung für Eltern

Beim ersten Besuch fragt die Seite einmal nach Vorname und Kind und zeigt einen Tipp, wie man sie als App ablegt. Auf dem Handy liegt die Navigation unten (Start, Catering, Fahrten, Spiele, Mehr). Unter „Mehr“ liegen Kasse, Trikots, Mannschaft und Galerie. Name und Kind lassen sich über den Namen oben rechts oder „Mehr“ ändern.

## Demo-Seite

Derselbe Code läuft als Demo, wenn die Umgebungsvariable `DEMO_MODUS=1` gesetzt ist. Dafür eine **eigene** Netlify-Seite anlegen, nie die echte Seite umstellen.

- Benötigte Variablen: `DEMO_MODUS=1` und `SESSION_SECRET` (eigener Wert, nicht der der echten Seite). Passwörter sind nicht nötig.
- Anmeldung per Knopf als Elternteil (Sandra, Mutter von Ben), Trainer (Jan) oder Kasse (Markus).
- Alle Daten sind erfunden (`netlify/shared/demo.js`) und werden relativ zum heutigen Tag erzeugt.
- Die Daten werden jeden Tag beim ersten Aufruf neu angelegt, zusätzlich per Knopf „Zurücksetzen“ in der gelben Leiste.
- Ohne `DEMO_MODUS` ist die Demo komplett aus. `/api/demo` meldet dann nur `{"demo": false}`.

## Version 1.7: Spieler-Zugang, Anwesenheit, Push, Fahrten

**Neue Umgebungsvariable (optional):** `SPIELER_PASSWORT`. Damit melden sich die Jungs für Training und Spiele an oder ab. Ohne die Variable gibt es keinen Spieler-Zugang, alles andere läuft weiter.

- **Spieler-Zugang:** sieht nur Training und Spiele, Infos vom Trainerteam, Fahrgemeinschaften, Mannschaft. Keine Kasse, keine Einträge der Eltern. Der Server liefert dem Spieler-Zugang diese Daten gar nicht erst aus.
- **Anwesenheit** (`#/anwesenheit`): Termine aus den Trainingszeiten (Verwaltung) und den Spielen. Einstellung „Beim Training gilt“: dabei, wer sich nicht abmeldet, oder jeder muss zusagen. Bei Spielen immer zu- oder absagen. Trainer sehen die Übersicht, können umstellen und Trainings absagen (Tag oder Zeitraum).
- **Push:** Die Schlüssel werden beim ersten Gebrauch automatisch erzeugt und im Datenspeicher abgelegt, in Netlify ist dafür nichts einzutragen. Die geplante Funktion `netlify/functions/erinnerungen.mjs` läuft täglich um 16:00 UTC (17 bzw. 18 Uhr) und schickt Erinnerungen für morgen. Sofort-Nachrichten: Info vom Trainerteam (wenn angehakt), Training fällt aus, Nachrücken beim Standdienst. Auf dem iPhone nur, wenn die Seite als App auf dem Startbildschirm liegt (ab iOS 16.4). In der Demo werden nur Testnachrichten verschickt.
- **Fahrten:** Hin- und Rückfahrt getrennt, Umsteigen (⇄), Fahrer dürfen Kinder aus ihrem Auto austragen, „Wir brauchen noch eine Fahrt“ mit „Nehme ich mit“.
- **Neue Abhängigkeit:** `web-push` (steht in `package.json`, Netlify installiert sie beim Deploy automatisch).
- Keine Datenmigration: neue Sammlungen `anwesenheit`, `trainingsausfall`, `fahrtbedarf`, `push/…`; bestehende Fahrten ohne Richtung gelten als „hin und zurück“.

## Version 2.0: Module, Jugend und Erwachsene, Helferdienste, Mannschaftstour

- **Module** (Verwaltung › Einstellungen › Module): Standdienst, Strichliste, Helferdienste, Zeitnehmer, Wäsche, Trikots, Fahrten, An- und Abmeldung, Infos, Termine, Abfragen, Kasse, Galerie, Erinnerungen. Ausgeschaltet heißt: verschwindet aus Menü, Startseite, Spielkarten, WhatsApp-Texten und Erinnerungen. Daten bleiben erhalten. Helferdienste sind standardmäßig aus, alles andere an.
- **Mannschaftstyp** (Verwaltung › Mannschaft): „Jugend“ (wie bisher) oder „Erwachsene“. Bei Erwachsenen gibt es keinen Eltern-Zugang; der Spieler-Zugang (`SPIELER_PASSWORT`) hat dann die Rechte, die sonst Eltern haben, und alle Texte sprechen die Spieler direkt an. Name von Mannschaft und Verein ist einstellbar.
- **Helferdienste:** frei anlegbare Dienste pro Heimspiel (Name, Personen, Minuten vor Anwurf oder „danach“). Fairness-Übersicht unter Spiele. X Tage vor dem Spiel (einstellbar) zeigt die Seite für offene Dienste, wer bisher am seltensten dran war; diese Spieler bzw. Familien bekommen eine Push-Erinnerung. Trainer und Kasse können Spieler direkt eintragen. Logik: `netlify/shared/dienste.js` (Server) und `dienstVorschlaegeC` in `public/app.js` (Seite).
- **Termine/Touren:** mehrtägig (`bis`), Kosten pro Teilnehmer oder nur für zusätzliche Personen, Anzahlung mit Frist, Kasse bucht Anzahlung und Restzahlung mit einem Klick. Im Kalender-Abo als ganztägiger Mehrtages-Termin.
- **Demo:** zwei Mannschaften mit getrennten Speichern (`daten` = C-Jugend, `daten-herren` = 1. Herren), Auswahl auf der Anmeldeseite (Cookie `demo_team`).
- Keine Datenmigration. Ohne Änderungen in der Verwaltung verhält sich die Seite wie 1.7.
