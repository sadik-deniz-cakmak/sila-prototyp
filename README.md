# Sila – Klick-Prototyp v0.1 des Triage-Übersetzers

Stand 09.11.2026. Erster anfassbarer Baustein von Sila. Die Grundlage ist der Prototyp-Plan in `../04_konzept/03_prototyp_plan.md`, Abschnitte 3 und 6. Der Prototyp ist eine Web-App (PWA). Sie läuft im Browser, nach dem ersten Laden auch ohne Internet. Eine Installation über einen App-Store braucht es nicht.

> **Nur Demo.** Alle Phrasen sind Entwürfe von Claude. Sie sind weder klinisch geprüft noch fachlich übersetzt. Für die acht Startsprachen gibt es bewusst noch keine Übersetzungen, weil diese nach dem Prozess im Prototyp-Plan entstehen müssen. Der Prototyp ist nicht für echte Patientinnen und Patienten bestimmt.

## Wozu er dient

- Er zeigt möglichen Partnern, wie Sila bedient wird.
- Er dient für erste Bedientests mit Pflegekräften, siehe Hypothese H6 im Plan, und für Zeitmessungen im Rollenspiel, siehe H4.
- Er ist die Hülle, in die später geprüfte Phrasen, eingesprochene Audiodateien, getestete Piktogramme und die Spracherkennung kommen.

## Starten

**Schnell ansehen:** `index.html` im Browser öffnen, zum Beispiel per Doppelklick. Alles funktioniert, nur der Offline-Speicher nicht.

**Mit Offline-Funktion am Rechner:** Im Ordner `05_prototyp` den Server starten und dann `http://localhost:8765` öffnen.

```
python -m http.server 8765
```

**Auf einem Tablet:** Offline-Speicher (Service Worker) funktionieren nur über HTTPS oder `localhost`. Eine Adresse wie `http://192.168.…` aus dem WLAN reicht dafür nicht. Es gibt zwei Wege:

- Die App auf einer HTTPS-Adresse bereitstellen. Seit 10.11.2026 liegt sie unter https://sadik-deniz-cakmak.github.io/sila-prototyp/ (GitHub Pages).
- Das Tablet per USB anschließen und in Chrome unter `chrome://inspect` die Portweiterleitung für 8765 einschalten. Dann öffnet das Tablet die App als `localhost`.

Danach im Chrome-Menü „Zum Startbildschirm hinzufügen" wählen. Die Startseite zeigt unter „Offline-Speicher", ob der Browser den Speicher dauerhaft zugesagt hat.

**Demo-Einstiege** für Vorführungen und Bildschirmfotos:

| Adresse | Zeigt |
|---|---|
| `index.html?demo=lang` | Sprachwahl mit Flaggen |
| `index.html?demo=companion` | Frage nach einer Begleitperson, die übersetzen kann |
| `index.html?demo=main` | Leitsymptome |
| `index.html?demo=more` | zweite Bildtafel hinter „Etwas anderes" |
| `index.html?demo=human` | „Person anfordern" mit simulierter Video-Dolmetschung |
| `index.html?demo=free` | Sprechmodus auf Türkisch |
| `index.html?demo=urdu` | Beschwerden auf Urdu (Entwurfsübersetzung, von rechts nach links) |
| `index.html?demo=vitals` | Vitalzeichen mit Eingabe der Begleitperson |

**Neu in v0.4.0 (09.11.2026):**
- **Entwurfsübersetzungen** für Urdu, Indonesisch und Türkisch in `drafts.js`, von Claude erstellt und von Muttersprachlern noch nicht geprüft. Das Personal sieht beim Wählen einen Hinweis, die Fußzeile nennt den Entwurfsstatus, und die Übergabe vermerkt ihn. Arabisch, Bengali, Persisch, Hausa und Französisch laufen weiter auf Englisch.
- **Weniger Dolmetscher-Verweise:** Im Patientenablauf gibt es nur noch den Knopf oben, im Frauenmodus „Eine Frau anfordern". Die Frage nach einer Begleitperson trägt jetzt das Personal bei den Vitalzeichen ein, das eigene Frauen-Angebot entfällt.
- **Sprechmodus** hinter „Noch etwas anderes": Die Person spricht oder tippt. Sila zeigt zur Kontrolle die Rückübersetzung oder den eigenen Text. In der Übergabe steht die Angabe als „maschinell übersetzt, ungeprüft". Freigeschaltet nur für Arabisch, Türkisch, Indonesisch, Französisch und die Demo-Sprachen. Urdu und Persisch folgen erst nach einer Messung, Bengali und Hausa bekommen den Knopf „Person anfordern". Die Spracherkennung nutzt in der Demo die des Browsers, die den Ton an den Browser-Anbieter schickt. Sie darf deshalb nur mit gespielten Fällen verwendet werden. Übersetzt wird über die eingebaute Übersetzer-Schnittstelle von Chrome auf dem Gerät, falls der Browser sie anbietet, sonst bleibt der Originaltext. Nach zwei Mal „Stimmt nicht" ruft Sila automatisch eine Person.
| `index.html?demo=body` | Körperkarte |
| `index.html?demo=pain` | Schmerzskala 0–10 |
| `index.html?demo=confirm` | Rückbestätigung einer Sicherheitsantwort |
| `index.html?demo=summary` | fertige Übergabe mit QR-Code (Beispielfall) |

Mit `&staff=en` erscheint die Seite des Personals auf Englisch.

## Was umgesetzt ist

Die Nummern folgen dem Ablauf im Prototyp-Plan, Abschnitt 3.

| Nr. | Schritt | Stand v0.1 |
|---|---|---|
| 1 | Start durch das Personal | umgesetzt, mit Einstellungen für Sprache des Personals, Frauenmodus und Vorlesen |
| – | Vorlesen (seit v0.1.1) | Lautsprecher-Knopf neben jeder Frage und auf jeder Antwort-, Beschwerde- und Sprachkachel. Ein Tipp liest vor, ohne etwas auszuwählen; auf der Sprachwahl sagt er den Namen der Sprache in dieser Sprache. „Automatisch vorlesen" liest zusätzlich jede neue Frage vor. Die Demo nutzt die Gerätestimme; sobald Aufnahmen vorliegen, werden sie in `content.js` unter `AUDIO` eingetragen und statt der Gerätestimme abgespielt |
| 2 | Sprache bestimmen | Antippen der Sprache in eigener Schrift, Vorlesen des Sprachnamens und seit v0.2.0 kleine Flaggen als Zusatzhilfe, mehrere je Sprache (vorläufige Auswahl). Arabisch hat bewusst keine Flagge, weil es in vielen Ländern gesprochen wird. Afghanistan fehlt, bis mit den saudischen Partnern geklärt ist, welche Flagge gezeigt wird. Sprachidentifikation per Stimme fehlt noch |
| – | Begleitperson (seit v0.2.0, ab v0.4.0 beim Personal) | Das Personal trägt bei den Vitalzeichen ein, ob eine Begleitperson übersetzen kann. Die Angabe steht im Hinweis bei „Person anfordern" und in der Übergabe |
| 3 | Einwilligung | umgesetzt; bei „Nein" geht ein Hinweis an das Personal |
| 4 | Frauenmodus | Angebot einer Dolmetscherin oder Mitarbeiterin umgesetzt, mit Vermerk in der Übergabe; weibliche Stimme fehlt noch |
| 5 | Leitsymptom | 11 Kacheln mit Piktogrammen und Mehrfachauswahl, dazu eine Körperkarte mit 10 Regionen. Seit v0.2.0 öffnet „Etwas anderes" eine zweite Bildtafel mit 10 weiteren Anliegen: Augen, Ohren, Zähne, Haut, Wasserlassen, Frauengesundheit, Angst, „Gruppe verloren", „Medikamente aufgebraucht" und „Noch etwas anderes". Bei „Gruppe verloren" und „Noch etwas anderes" ruft die App automatisch das Personal |
| 6 | Folgefragen | regelbasiert je Leitsymptom; Schmerzskala 0–10 als Zahlenleiste ohne Gesichter |
| 7 | Sicherheitsfragen | Allergien, Medikamente, Vorerkrankungen, Schwangerschaft, letzte Mahlzeit; jede Antwort wird wiederholt und bestätigt. Nach zwei Ablehnungen steht in der Übergabe „nicht bestätigt, mit Dolmetscher klären". Das Foto der Packung fehlt noch |
| 8 | Vitalzeichen | Eingabe durch das Personal mit Erinnerung an fehlende Pflichtwerte; keine Kategorie |
| 9 | Übergabe | Zusammenfassung auf Deutsch oder Englisch, QR-Code ohne Namen, Drucken, Feld für die Triage-Kategorie, die das Personal vergibt. Die arabische Fassung fehlt noch |
| 10 | Mensch anfordern | Knopf auf jeder Patientenseite. Das Personal sieht die Sprache, etwa „Urdu (اردو)", und ob eine Begleitperson übersetzen kann. Seit v0.2.0 gibt es dazu den Knopf „Video-Dolmetschung rufen". Die Verbindung ist nur simuliert, im echten System kommt eine Person aus dem Dolmetscherpool per Video dazu. Eine Benachrichtigung an andere Geräte gibt es nicht |
| 11 | Freies Gespräch | bewusst nicht enthalten |

**Gestaltung (seit v0.3.0):** Die Optik lehnt sich an saudische Behörden-Apps wie Nusuk an, damit sie Pilgern und Personal vertraut wirkt. Typisch sind heller, warmer Grund, weiße Karten mit großen Rundungen, feine Linien-Icons in getönten Feldern, schwarze Pillen-Knöpfe sowie Sand-, Gold- und Minttöne. Dazu kommen die Schrift IBM Plex Sans Arabic, lokal gespeichert, und das Datum auch nach dem Umm-al-Qura-Kalender. Logo, Name und Bilder von Nusuk oder dem Ministerium sind bewusst nicht übernommen, damit Sila nicht als Angebot des Ministeriums erscheint. Die kräftigen Ja/Nein-Farben bleiben, weil sie Menschen ohne Lesekompetenz helfen. Belege in `../04_konzept/zulieferungen/wp21_gestaltung_nusuk.md`.

**Die drei Weichenstellungen sind eingehalten.** Sila nutzt nur feste Phrasen und keine Maschinenübersetzung. Sila macht keine Diagnose und keinen Triage-Vorschlag. Ein Dolmetscherpool ist nicht Teil dieses Bausteins.

## Datenschutz im Prototyp

- Falldaten liegen nur im Arbeitsspeicher. „Fall beenden" löscht sie, ebenso ein Neuladen der Seite.
- Im Browser-Speicher stehen nur drei Einstellungen: Sprache des Personals, Frauenmodus und Vorlesen.
- Der QR-Code und das Testprotokoll enthalten keine Namen und keine Audiodaten. Das Testprotokoll entsteht nur auf Knopfdruck, als JSON-Datei mit Zeitstempeln je Schritt für die Auswertung von H4 und H6.
- Die App lädt nichts aus dem Internet nach. Auch die QR-Bibliothek liegt lokal im Ordner.

## Test

```
node tools/flowtest.js
```

Der Test lädt die App in eine Node-Umgebung und prüft alle Phrasen auf Deutsch und Englisch. Er spielt einen vollständigen Fall durch, auch mit wiederholter Rückbestätigung, Frauenmodus und Ablehnung. Er prüft QR-Inhalt, Löschung nach Fallende, den Browser-Speicher und dass die Lautsprecher-Knöpfe nichts auswählen. Seit v0.2.0 prüft er auch Flaggen, Begleitperson, zweite Bildtafel, automatische Hilfe und die simulierte Dolmetschung. Seit v0.4.0 auch Entwurfsübersetzungen (Vollständigkeit, Platzhalter, Urdu von rechts nach links) und den Sprechmodus mit Rückbestätigung. Stand 09.11.2026, Version 0.4.0: 1400 Prüfungen, 0 Fehler. Die Darstellung ist zusätzlich mit Chrome auf Tablet- und Handybreite geprüft.

## Was als Nächstes fehlt

1. **Phrasen:** Klinische Durchsicht der 94 Patientenphrasen (Fragen und Antwortoptionen, Ziel im Plan rund 150), dann Übersetzung in die acht Startsprachen nach dem Prozess im Plan. Die Struktur in `content.js` nimmt weitere Sprachen ohne Codeänderung auf: je Phrase ein weiterer Sprachschlüssel und `has: true` in der Sprachliste.
2. **Audio:** Je Phrase eine männliche und eine weibliche Aufnahme. Die Gerätestimme ist nur ein Platzhalter. Möglich sind Aufnahmen durch Dolmetscher oder einmalig erzeugte synthetische Stimmen, zum Beispiel mit ElevenLabs, das alle acht Startsprachen listet. Beides wird von Muttersprachlern geprüft (Plan, Abschnitt 6). Für viele Startsprachen hat ein Windows-Rechner keine passende Stimme; auf Android-Tablets ist die Abdeckung je nach installierten Stimmen besser, aber ungeprüft.
3. **Piktogramme:** Die Linienzeichnungen sind Platzhalter. Sie werden gestaltet und nach ISO 9186 getestet. Die Körperkarte braucht einen eigenen Test, ob „rechts" und „links" richtig verstanden werden.
4. **Spracherkennung:** Messung von sherpa-onnx im Browser per WebAssembly gegen eine dünne Android-Hülle auf dem Zieltablet. Erst danach fällt die Plattformentscheidung (Plan, Abschnitt 6).
5. **Übergabe auf Arabisch,** geprüft durch Muttersprachler und klinisches Personal.
6. **Gerätebetrieb:** Kiosk-Modus, Drucken über Bluetooth-Thermodrucker, externer Lautsprecher, dauerhafter Offline-Speicher auf dem Zieltablet.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite |
| `drafts.js` | Entwurfsübersetzungen Urdu, Indonesisch, Türkisch (Claude, ungeprüft) |
| `content.js` | Sprachen, Phrasen (DE/EN), Fragen, Leitsymptome, Körperkarte, Piktogramme |
| `app.js` | Ablauf, Rückbestätigung, Übergabe, QR-Code, Testprotokoll, Offline-Start |
| `styles.css` | Gestaltung für Tablet, Handy und Druck |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline-Betrieb und Startbildschirm |
| `vendor/qrcode.js` | QR-Code-Generator von Kazuhiko Arase, Version 1.4.4, MIT-Lizenz |
| `vendor/flags/` | 16 Flaggen aus flag-icons 7.2.3 von Panayiotis Lipiridis, MIT-Lizenz (`LICENSE.txt`) |
| `vendor/fonts/` | IBM Plex Sans Arabic, Schnitte 300/400/600/700, SIL Open Font License 1.1 (`OFL.txt`); `tools/fetch_fonts.py` lädt sie neu |
| `tools/flowtest.js` | automatischer Test |
