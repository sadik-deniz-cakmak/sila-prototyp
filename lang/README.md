# Sprachdateien von Sila: Regeln für Übersetzung und Prüfung

Stand 14.11.2026. In diesem Ordner liegt je Sprache eine Datei `<code>.js` mit den Sätzen, die Pilgerinnen und Pilger sehen und hören. Die Quelltexte auf Englisch und Deutsch stehen in `../content.js` im Objekt `P`.

> **Alle Dateien sind Entwürfe von Claude (KI).** Sie sind weder klinisch noch von Muttersprachlern geprüft. Sie dienen Vorführungen und Tests, bei denen Muttersprachler die Texte korrigieren. Vor einem Einsatz mit echten Patientinnen und Patienten gilt der Prozess aus dem Prototyp-Plan: zwei unabhängige Fachübersetzungen, Rückübersetzung, kognitive Interviews und klinische Freigabe.

## Für wen die Sätze sind

Pilgerinnen und Pilger bei Hajj und Umrah in Mekka und Medina. Viele sind älter, manche können nicht lesen und bekommen den Satz vorgelesen. Sie sind krank, erschöpft oder haben Angst. Das Personal spricht ihre Sprache nicht.

## Regeln

1. **Einfach und kurz.** Alltagswörter, kurze Hauptsätze, eine Frage je Satz. Keine Fachsprache und keine Umgangssprache. Wo es ein Volkswort und ein Fachwort gibt, steht das Volkswort vorn und das Fachwort in Klammern, zum Beispiel „Zuckerkrankheit (Diabetes)".
2. **Höflich.** Die höfliche, respektvolle Anrede der Sprache, wie man sie gegenüber älteren Fremden nutzt.
3. **Treu.** Nichts hinzufügen, nichts weglassen, nichts abschwächen. Keine medizinischen Ratschläge, keine Diagnosen, keine religiösen Aussagen, die nicht im Quelltext stehen.
4. **Weit verständlich.** Wörter wählen, die in allen großen Varianten der Sprache verstanden werden: Urdu aus Pakistan und Indien, Persisch aus Iran und Afghanistan (Dari), Hausa aus Nigeria und Niger, Bengalisch aus Bangladesch und Westbengalen, Französisch in Westafrika, Arabisch als einfaches Hocharabisch.
5. **Geschlecht.** Möglichst so formulieren, dass der Satz für Frauen und Männer gleich ist. Geht das in der Sprache nicht, steht unter dem normalen Schlüssel die männliche oder allgemeine Form und unter `"<schlüssel>|f"` die weibliche Form. Die App nutzt die weibliche Form, wenn die Person angegeben hat, dass sie eine Frau ist. Sätze, die nur Frauen betreffen (`q_preg`, `human_wait_f`), stehen direkt in der weiblichen Form.
6. **Platzhalter bleiben.** `{lang}` und `{answer}` genau so übernehmen und an die passende Stelle im Satz setzen.
7. **Begrüßung.** `t_hello` beginnt mit dem islamischen Gruß, wie er in der Sprache üblich ist (as-salāmu ʿalaikum), weil alle Angesprochenen Pilger sind. Sonst keine religiösen Formeln.
8. **Feste Begriffe**, in der Sprache jeweils einheitlich:
   - „Gruppe" ist die Reisegruppe für Hajj oder Umrah. Das Wort nehmen, das Pilger dieser Sprache dafür wirklich benutzen. Bereits vorhandene Sätze der Datei geben das Wort vor.
   - „Gruppenleiter" ist die Person, die diese Reisegruppe führt.
   - „Pilgerkarte" ist der Ausweis, den Pilger von den Behörden oder ihrer Mission bekommen. Allgemein übersetzen, ohne Markennamen.
   - „Personal" sind Pflegekräfte, Ärztinnen, Ärzte und Sanitäter.
   - „religiöse Beratung" ist der amtliche Dienst, der Fragen zu den Riten beantwortet.
   - „Sanitätsstation" ist eine Erste-Hilfe- oder Sanitätsstelle im Freien.
9. **Zahlen.** Ziffern wie im Quelltext (0, 1, 2, 10), weil die App dieselben Ziffern auf den Knöpfen zeigt.
10. **Schrift.** Eigene Schrift der Sprache, keine Umschrift. Persisch mit persischen Buchstaben (ی, ک), Hausa in Boko-Schreibung mit ɓ, ɗ, ƙ und ƴ, Urdu mit Urdu-Satzzeichen (۔ ؟ ،).
11. **Knöpfe kurz.** `yes`, `no`, `unknown`, `done`, `ok`, `back`, `skip`, `sex_f`, `sex_m`, `women_btn`, `human_btn`, `free_mic_start`, `free_mic_stop` stehen auf Knöpfen und bleiben so kurz wie möglich.

## Format

```js
(window.SILA_LANG = window.SILA_LANG || {}).xx = {
  meta: { name: "Eigenname der Sprache", author: "Claude (KI-Entwurf)", updated: "2026-11-14", status: "ungeprüft" },
  P: {
    "lang_pick": "…",
    "q_drink": "…",
    "q_drink|f": "…"
  }
};
```

- Ein Schlüssel je Zeile, in der Reihenfolge von `content.js`. Texte in doppelten Anführungszeichen; ein Anführungszeichen im Text wird als `\"` geschrieben oder durch typografische Zeichen der Sprache ersetzt.
- Kein HTML, keine Zeilenumbrüche im Text.
- Die arabische Datei enthält zusätzlich den Block `S` mit den Texten der Oberfläche für das Personal.

## Prüfen

Im Ordner `05_prototyp`:

```
node tools/check_lang.js --keys     alle Schlüssel mit Quelltext auf Englisch und Deutsch
node tools/check_lang.js ar         eine Sprache prüfen
node tools/check_lang.js            alle Sprachen prüfen
```

Die Prüfung findet fehlende und unbekannte Schlüssel, verlorene Platzhalter und Formatfehler. Über die sprachliche Qualität sagt sie nichts.

## Offene Prüfpunkte für Muttersprachler

Siehe `PRUEFHINWEISE.md` in diesem Ordner: je Sprache die Begriffe, bei denen der Entwurf am unsichersten ist.
