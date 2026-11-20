# Sila – MVP v0.6: Verständigung bei Hajj und Umrah

Stand 14.11.2026. Sila (صلة, „Verbindung") hilft Personal und Pilgern, sich in Notaufnahme, Feldklinik und im Freien zu verständigen, wenn sie keine gemeinsame Sprache haben. Der Prototyp ist eine Web-App. Sie läuft im Browser, nach dem ersten Laden auch ohne Internet, und braucht keinen App-Store.

**Neu in v0.6.0 (nur die Gestaltung, Ablauf und Inhalte wie in v0.5.0):** Aufbau wie auf iPhone und iPad mit großen Titeln, gruppierten Listen, Schaltern und Auswahlleisten. Ruhiger, warmer Grund ohne Farbverläufe, ein Akzent in dunklem Türkisgrün, Hauptknöpfe schwarz. Der Satz in der Sprache der Person steht in der Akzentfarbe und größer als der Satz für das Personal. Lautsprecher-Knöpfe sind 48 Pixel groß, die Hauptaktion der Person bleibt unten am Bildschirmrand stehen. Schrift ist die Systemschrift des Geräts: auf iPhone, iPad und Mac San Francisco, auf anderen Geräten Inter (falls vorhanden), Segoe UI oder Roboto; für Arabisch und Persisch außerhalb von Apple-Geräten IBM Plex Sans Arabic.

**Farben:** Grün ist auf den Seiten der Person allein der Knopf für Ja, Rot allein der für Nein; beide tragen zusätzlich Haken und Kreuz. Lautsprecher und Hauptknöpfe sind schwarz. Die Schmerzskala läuft ohne Farbton von Weiß nach Dunkelgrau. Erfasste Antworten erscheinen beim Personal neutral dunkel, damit keine Farbe wie eine Wertung wirkt. Alle Textfarben erfüllen 4,5:1, Zeichen und Ränder von Bedienflächen 3:1 (WCAG). Ob die Farben und Zeichen von Pilgern so verstanden werden, ist nicht getestet.

> **Nur Demo.** Alle Sätze sind Entwürfe von Claude (KI) und klinisch nicht geprüft. Alle Übersetzungen sind ungeprüfte Entwürfe. Der Prototyp ist nicht für echte Patientinnen und Patienten bestimmt.

## Eine Software, drei Wege, eine Übergabe

| Betriebsart | Wer bedient | Wofür |
|---|---|---|
| **Selbstauskunft** | Die Person selbst, am Tablet der Klinik oder am eigenen Handy | Wartebereich: Sprache wählen, Beschwerden antippen, Sicherheitsfragen beantworten. Mit Bildkacheln, Körperkarte, Zahlenskala und Vorlese-Knöpfen, auch ohne Lesen |
| **Gespräch** | Das Personal | Am Patienten: feste Sätze in der Sprache der Person abspielen; sie antwortet mit Ja, Nein oder Zeigen. Mit „Der Person zeigen" erscheint der Satz groß, mit Ja/Nein-Knöpfen, Körperkarte oder Skala |
| **Helfer im Feld** | Freiwillige | Satzbuch für Wegweisung, Hitze und Wasser, verlorene Gruppe. Ohne Falldaten |

Selbstauskunft und Gespräch gehören zum selben Fall. Die Person füllt im Wartebereich aus, danach macht das Personal mit Vitalzeichen und Gespräch weiter. Am Ende steht **eine Übergabe**: Sprache, Hauptproblem, Antworten, Sicherheitsangaben, Gespräch, Vitalzeichen und ein QR-Code ohne Namen. Jeder Fall trägt einen kurzen Zufallscode (zum Beispiel „HK47"), damit Ausdruck, QR-Code und Person zusammenfinden.

Der Kasten **„Noch zu klären"** oben in der Übergabe nennt, was an der Verständigung offen ist: Sicherheitsfragen, die nicht gestellt wurden, Antworten, die nicht bestätigt sind, unklare Antworten, unterschiedliche Angaben in Selbstauskunft und Gespräch, fehlende Pflichtwerte. Er bewertet nichts klinisch.

## Starten

**Schnell ansehen:** `index.html` im Browser öffnen. Alles funktioniert, nur der Offline-Speicher nicht.

**Mit Offline-Funktion am Rechner:** im Ordner `05_prototyp` den Server starten und `http://127.0.0.1:8765` öffnen.

```
python -m http.server 8765 --bind 127.0.0.1
```

**Auf einem Tablet oder Handy:** Offline-Speicher (Service Worker) gibt es nur über HTTPS oder `localhost`. Entweder die App auf einer HTTPS-Adresse bereitstellen oder das Gerät per USB anschließen und in Chrome unter `chrome://inspect` den Port 8765 weiterleiten. Danach im Chrome-Menü „Zum Startbildschirm hinzufügen" wählen. Die Startseite zeigt unter „Offline-Speicher", ob der Browser den Speicher dauerhaft zugesagt hat.

## Vorführen in fünf Minuten

1. **Startseite.** Oben rechts die Sprache des Personals umschalten (Arabisch, Englisch, Deutsch).
2. **Selbstauskunft** starten, Urdu wählen, „Frau" antippen, „Zu viel Hitze oder Sonne" wählen, ein paar Fragen beantworten. Zeigen: Lautsprecher neben jedem Text, Zurück-Knopf, Rückbestätigung bei Allergien, „Eine Frau anfordern" oben.
3. Über **Personal → Gespräch fortsetzen** in dasselbe Gespräch wechseln: Kategorie „Hitze", einen Satz abspielen, eine Frage mit „Der Person zeigen" groß anzeigen.
4. **Vitalzeichen** eintragen und zur **Übergabe** gehen. Sprache des Personals auf Arabisch stellen: Die Übergabe wechselt samt Schreibrichtung.
5. Zurück zum Start: **„Beispielfall ansehen"** zeigt eine fertige Übergabe, **„Was Sila für Hajj und Umrah mitbringt"** die Anpassungen und die Grenzen.

## Was für Hajj und Umrah angepasst ist

| Thema | Umsetzung im Prototyp |
|---|---|
| Pilgersprachen | Urdu, Arabisch, Indonesisch, Türkisch, Bengalisch, Persisch (Farsi, Dari), Hausa, Französisch, Englisch; dazu Deutsch für Vorführungen. Sprachwahl in eigener Schrift, mit Flaggen als Zusatzhilfe (Arabisch bewusst ohne) |
| Menschen, die nicht lesen | Bildkacheln, Körperkarte, Schmerzskala 0 bis 10 ohne Gesichter, Vorlese-Knopf neben jedem Text |
| Frauen | Frage „Frau oder Mann?" steuert die Anrede in Sprachen mit Geschlecht (weibliche Formen in Arabisch und Urdu) und die Frage nach einer Schwangerschaft. Bei Frauen steht oben „Eine Frau anfordern". Für Geräte im Frauenbereich gibt es eine Einstellung |
| Pilgerthemen | Hitze (Sonne, Trinken, Krämpfe), Fasten, Husten und Halsschmerzen, Füße, verlorene Gruppe, aufgebrauchte Medikamente, Gruppe und Pilgerkarte |
| Arabisch für das Personal | Bedienung und Übergabe auf Arabisch, Englisch oder Deutsch; Arabisch von rechts nach links |
| Ablauf der Notaufnahme | Selbstauskunft, Vitalzeichen und Gespräch in einem Fall |
| Sicherheit | Allergien, Medikamente, Vorerkrankungen, Schwangerschaft, Fasten und letzte Mahlzeit werden wiederholt und bestätigt. Nach zwei Ablehnungen steht „nicht bestätigt, mit Dolmetscher klären" in der Übergabe. Fehlende Pflichtwerte der Vitalzeichen werden angezeigt |
| Person anfordern | Knopf auf jeder Patientenseite; das Personal sieht die Sprache und kann eine Video-Dolmetschung rufen (hier nur simuliert) |
| Eigenes Handy | Ein Aushang mit QR-Code startet die Selbstauskunft auf dem Handy der Person (`?self=1`). Das Ergebnis erscheint als QR-Code, den das Personal einliest |
| Datum | auch nach dem Umm-al-Qura-Kalender |
| Keine religiösen Auskünfte | Das Satzbuch verweist bei Fragen zu Riten an die religiöse Beratung |

## Die drei Grundsätze

1. **Nur feste Sätze** im Triage-Teil, keine freie Maschinenübersetzung. Die Ausnahme ist der deutlich gekennzeichnete Sprechmodus hinter „Noch etwas anderes"; was dort entsteht, steht in der Übergabe als „maschinell übersetzt, ungeprüft".
2. **Keine Diagnose und kein Triage-Vorschlag.** Sila bewertet keine Dringlichkeit und löst keinen Alarm nach Symptomen aus. Vitalzeichen haben keine Schwellen und keine Farben, und erfasste Antworten erscheinen beim Personal neutral, nicht grün oder rot. Automatisch ruft Sila das Personal nur in zwei Fällen, die keine Symptome sind: Die Person hat ihre Gruppe verloren, oder eine freie Angabe ließ sich nicht bestätigen. Die Triage-Kategorie vergibt das Personal nach dem System der Klinik.
3. **Daten bleiben auf dem Gerät.** Ein Dolmetscherpool ist nicht Teil dieses Bausteins.

## Datenschutz im Prototyp

- Falldaten liegen nur im Arbeitsspeicher. „Fall beenden" löscht sie, ebenso ein Neuladen der Seite.
- Im Browser-Speicher stehen nur drei Einstellungen (Sprache des Personals, Frauenbereich, Vorlesen) und **anonyme Zähler**: Zahl der Fälle je Sprache und Betriebsart und Zahl der Anfragen nach einem Menschen. Keine Antworten, keine Namen. Die Startseite zeigt die Zähler und setzt sie auf Wunsch zurück.
- Auf dem eigenen Handy der Person wird nichts gespeichert, und es gibt dort keinen Sprechmodus. Wer „Noch etwas anderes" wählt, bekommt in der Übergabe den Vermerk „persönlich klären".
- Beim Seitenwechsel schaltet die App Mikrofon und Vorlesen ab. Bei laufendem Fall fragt der Browser nach, bevor die Seite neu geladen oder geschlossen wird.
- QR-Code und Testprotokoll enthalten keine Namen und keine Audiodaten. Das Testprotokoll entsteht nur auf Knopfdruck.
- Die App lädt nichts aus dem Internet nach. Schrift, Flaggen und QR-Bibliothek liegen im Ordner.
- Der Inhalt eines eingelesenen QR-Codes gilt als fremd: Die App übernimmt nur bekannte Felder und zeigt Texte maskiert an.
- **Ausnahme Sprechmodus:** Die Spracherkennung des Browsers schickt Ton an den Browser-Anbieter. Deshalb nur mit gespielten Fällen verwenden.

## Sprachen

Die Quelltexte stehen auf Englisch und Deutsch in `content.js` (184 Sätze). Alle anderen Sprachen liegen als Entwurf in `lang/`. Regeln für Übersetzung und Prüfung: `lang/README.md`. Unsicherste Stellen je Sprache: `lang/PRUEFHINWEISE.md`.

| Sprache | Datei | Stand |
|---|---|---|
| Urdu | `lang/ur.js` | Entwurf, 184 Sätze, 11 weibliche Formen |
| Arabisch | `lang/ar.js` | Entwurf, 184 Sätze, weibliche Formen; dazu die Oberfläche für das Personal |
| Indonesisch | `lang/id.js` | Entwurf, 184 Sätze |
| Türkisch | `lang/tr.js` | Entwurf, 184 Sätze |
| Bengalisch | `lang/bn.js` | Entwurf, 184 Sätze, **besonders unsicher** |
| Persisch (Farsi, Dari) | `lang/fa.js` | Entwurf, 184 Sätze |
| Hausa | `lang/ha.js` | Entwurf, 184 Sätze, **besonders unsicher** |
| Französisch | `lang/fr.js` | Entwurf, 184 Sätze |

Vor einem Einsatz gilt der Prozess aus dem Prototyp-Plan: zwei unabhängige Fachübersetzungen, Rückübersetzung, kognitive Interviews und klinische Freigabe.

## Test

```
node tools/flowtest.js            Ablauf und Inhalte
node tools/flowtest.js --strict   zusätzlich: alle Sprachen vollständig, Arabisch für das Personal
node tools/check_lang.js          Sprachdateien gegen die Quelltexte prüfen
```

Der Test lädt die App in eine Node-Umgebung und spielt alle Betriebsarten durch: Selbstauskunft mit Rückbestätigung, Zurück-Knopf, Frau und Mann, Frauenbereich, zweite Bildtafel, Sprechmodus, Gespräch mit Zeige-Ansicht, Wechsel zwischen beiden im selben Fall, Helfer, Aushang, Einlesen vom Handy samt Abwehr von fremdem Inhalt, eigenes Handy, Zähler und Browser-Speicher. Er klickt nur, was wirklich auf der Seite steht. Stand 15.11.2026, Version 0.6.0: 3778 Prüfungen, 0 Fehler; mit `--strict` 5629 Prüfungen, 0 Fehler. Seit 15.11.2026 prüft er auch die Piktogramme: Jede Antwortkachel hat ein Bild, auf einer Seite kommt keines doppelt vor, und zwei Namen dürfen nicht dieselbe Zeichnung haben. Geprüft wird auch, ob die App erkennt, für welche Sprachen das Gerät eine Stimme hat, und ob der fertige Code auf dem eigenen Handy ein Neuladen übersteht. Dazu gehört der Schutz vor Doppeltippen: Auf den Seiten der Person zählt ein Tipp in den ersten 350 Millisekunden nach einem Seitenwechsel nicht, damit ein doppelter Tipp nicht ungewollt die nächste Frage beantwortet.

Zusätzlich geprüft: Darstellung mit Chrome auf Tablet- und Handybreite, auf Deutsch und Arabisch; ein unabhängiges Review des Codes mit 20 Funden. Behoben sind daraus unter anderem eine Schleife nach „Person anfordern", eine Sicherheitsantwort im Gespräch, die verloren gehen konnte, eine Übergabe, die nicht zeigte, was nicht gefragt wurde, ein Mikrofon, das beim Seitenwechsel weiterlief, und Lücken beim Prüfen eingelesener Codes. Offen gebliebene Funde stehen unter „Grenzen".

## Demo-Einstiege

An die Adresse anhängen. `&staff=ar|en|de` wählt die Sprache des Personals, `&lang=ur|ar|id|tr|bn|fa|ha|fr|en|de` die Sprache der Person.

| Adresse | Zeigt |
|---|---|
| `?demo=lang` | Sprachwahl durch die Person |
| `?demo=tlang` | Sprachwahl durch das Personal |
| `?demo=consent`, `?demo=sex` | Einwilligung, Frage „Frau oder Mann?" |
| `?demo=main`, `?demo=more` | Leitsymptome, zweite Bildtafel |
| `?demo=heat`, `?demo=body`, `?demo=pain` | Hitzefrage, Körperkarte, Schmerzskala |
| `?demo=confirm` | Rückbestätigung einer Sicherheitsantwort |
| `?demo=free` | Sprechmodus auf Türkisch |
| `?demo=human` | „Person anfordern" mit simulierter Video-Dolmetschung |
| `?demo=end`, `?demo=vitals`, `?demo=menu` | Abschluss, Vitalzeichen, Menü für das Personal |
| `?demo=talk`, `?demo=tshow`, `?demo=field` | Gespräch, Zeige-Ansicht, Helfer im Feld |
| `?demo=summary` | fertige Übergabe (Beispielfall) |
| `?demo=about`, `?demo=poster`, `?demo=scan` | Über Sila, Aushang, Einlesen vom Handy |
| `?demo=q&q=cond` | Eine einzelne Frage (`onset`, `vomit_count`, `allergy_what`, `meds_what`, `cond`, `meal` und alle anderen aus `Q`); mit `&sel=cd_diab,cd_bp` die Rückbestätigung dieser Antworten |
| `?self=1` | Selbstauskunft auf dem eigenen Handy |

## Grenzen und nächste Schritte

1. **Sätze:** klinische Durchsicht aller 184 Sätze, dann Fachübersetzung nach dem Prozess im Prototyp-Plan. Die Struktur nimmt weitere Sprachen ohne Codeänderung auf: eine Datei in `lang/` und ein Eintrag in `LANGS`.
2. **Audio:** Die Gerätestimme ist ein Platzhalter. Für viele Startsprachen hat ein Windows-Rechner keine Stimme. Geprüfte Aufnahmen werden in `content.js` unter `AUDIO` eingetragen und dann statt der Gerätestimme abgespielt.
3. **Piktogramme:** Platzhalter, noch nicht mit Pilgern getestet (Methode nach ISO 9186). Einige Antwortkacheln haben noch kein Bild (Beginn, Häufigkeit, Art der Allergie, Art der Medikamente, Vorerkrankungen, letzte Mahlzeit); dort hilft bisher nur der Lautsprecher. Die Körperkarte braucht einen eigenen Test für „rechts" und „links" und eine Rückansicht.
4. **Einlesen per Kamera** geht nur, wo der Browser QR-Codes erkennt (Chrome auf Android). Sonst den Inhalt einfügen oder den Beispielcode laden. Auf dem eigenen Handy geht der Ergebnis-Code verloren, wenn der Browser die Seite im Hintergrund verwirft.
5. **Kein Schutz des Personal-Bereichs:** Der Knopf „Personal" steht auf jeder Patientenseite. Für einen Pilot braucht es eine Sperre (langes Drücken oder Code) und den Kiosk-Modus des Geräts.
6. **Übergabe:** „Beginn" und „Schmerzwert" werden bei mehreren Beschwerden nur einmal gefragt und lassen sich keiner einzelnen Beschwerde zuordnen. Der Satz zum Antworten im Gespräch nennt den „grünen oder roten Knopf"; für Menschen mit Rot-Grün-Schwäche tragen die Knöpfe zusätzlich Haken und Kreuz.
7. **Vorlesen:** Ob das Gerät eine Stimme für die gewählte Sprache hat, prüft die App noch nicht; ohne Stimme bleibt der Lautsprecher stumm.
8. **Schrift:** Urdu erscheint ohne Nastaliq-Schrift, wenn das Gerät keine hat.
9. **Spracherkennung:** Messung auf dem Zieltablet steht aus; erst danach fällt die Entscheidung zwischen Browser und Android-Hülle.
10. **Anbindung:** keine Verbindung zu Patientenakte oder Dolmetscherpool. Die Video-Dolmetschung ist simuliert.
11. **Gerätebetrieb:** Kiosk-Modus, Thermodrucker, externer Lautsprecher, dauerhafter Offline-Speicher auf dem Zieltablet.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite |
| `content.js` | Sprachen, Sätze (Englisch, Deutsch), Oberfläche des Personals, Fragen, Leitsymptome, Gespräch, Piktogramme |
| `lang/*.js` | Entwurfsübersetzungen je Sprache; `lang/README.md` Regeln, `lang/PRUEFHINWEISE.md` unsicherste Stellen |
| `app.js` | Ablauf aller Betriebsarten, Rückbestätigung, Übergabe, QR-Code, Einlesen, Zähler, Offline-Start |
| `styles.css` | Gestaltung für Tablet, Handy und Druck, auch von rechts nach links |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline-Betrieb und Startbildschirm |
| `tools/flowtest.js`, `tools/check_lang.js` | automatischer Test, Prüfung der Sprachdateien |
| `tools/fetch_fonts.py` | lädt die Schrift neu |
| `vendor/qrcode.js` | QR-Code-Generator von Kazuhiko Arase, Version 1.4.4, MIT-Lizenz |
| `vendor/flags/` | 16 Flaggen aus flag-icons 7.2.3 von Panayiotis Lipiridis, MIT-Lizenz (`LICENSE.txt`) |
| `vendor/fonts/` | IBM Plex Sans Arabic, Schnitte 300/400/600/700, SIL Open Font License 1.1 (`OFL.txt`) |

**Gestaltung:** angelehnt an saudische Behörden-Apps wie Nusuk, damit sie Pilgern und Personal vertraut wirkt: heller, warmer Grund mit weichen Verläufen in Sand, Mint und Lavendel, weiße Karten mit großen Rundungen, leichte große Überschriften, kleine getönte Etiketten, feine Linien-Icons, schwarze Pillen-Knöpfe. Logo, Name und Bilder von Nusuk oder dem Ministerium sind bewusst nicht übernommen, damit Sila nicht als Angebot des Ministeriums erscheint. Die kräftigen Ja/Nein-Farben bleiben, weil sie Menschen ohne Lesekompetenz helfen.
