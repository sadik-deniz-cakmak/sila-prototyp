/*
 * Sila v0.1 – automatischer Test ohne Browser.
 * Lädt qrcode.js, content.js und app.js in eine Node-VM mit einer kleinen
 * DOM-Attrappe, spielt einen vollständigen Fall durch und prüft die Inhalte.
 * Aufruf: node tools/flowtest.js   (im Ordner 05_prototyp)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const root = path.join(__dirname, '..');
let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.log('FEHLER: ' + msg); }
}

// ---------- DOM-Attrappe ----------
const appEl = { innerHTML: '', listeners: {}, addEventListener(t, f) { this.listeners[t] = f; } };
const store = {};
const sandbox = {
  console, performance, URLSearchParams,
  location: { search: '', protocol: 'file:' },
  navigator: {},
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  document: { getElementById: id => (id === 'app' ? appEl : null), documentElement: {} },
  scrollTo() {},
  confirm: () => true,
  setTimeout: fn => { fn(); return 0; }   // simulierte Dolmetsch-Verbindung sofort „verbunden"
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/qrcode.js', 'drafts.js', 'content.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const C = sandbox.SILA;

// ---------- 1. Inhaltsprüfung ----------
const langs = ['en', 'de'];
for (const [dictName, dict] of [['P', C.P], ['S', C.S]]) {
  for (const id of Object.keys(dict)) {
    for (const l of langs) ok(typeof dict[id][l] === 'string' && dict[id][l].length > 0, `${dictName}.${id} ohne Text für ${l}`);
  }
}
const label = id => C.S[id] || C.P[id];
for (const [qid, q] of Object.entries(C.Q)) {
  ok(C.P[q.text], `Frage ${qid}: Text ${q.text} fehlt`);
  ok(C.S[q.label], `Frage ${qid}: Beschriftung ${q.label} fehlt`);
  if (q.icon) ok(C.ICONS[q.icon], `Frage ${qid}: Piktogramm ${q.icon} fehlt`);
  (q.options || []).forEach(o => ok(label(o), `Frage ${qid}: Option ${o} fehlt`));
  if (q.then) Object.values(q.then).flat().forEach(id => ok(C.Q[id], `Frage ${qid}: Folgefrage ${id} fehlt`));
}
for (const s of C.SYMPTOMS) {
  ok(C.P[s.id], `Leitsymptom ${s.id} fehlt in P`);
  ok(C.ICONS[s.icon], `Leitsymptom ${s.id}: Piktogramm ${s.icon} fehlt`);
  s.follow.forEach(id => ok(C.Q[id], `Leitsymptom ${s.id}: Frage ${id} fehlt`));
}
C.SAFETY.forEach(id => ok(C.Q[id] && C.Q[id].safety, `Sicherheitsfrage ${id} fehlt oder nicht markiert`));
C.BODY.forEach(r => ok(C.P[r.id], `Körperregion ${r.id} fehlt`));
// Grundsatz: keine Triage-Kategorien oder Diagnosen in den Patientenphrasen
const forbidden = /\b(triage level|category [1-5]|kategorie [1-5]|diagnos)/i;
Object.entries(C.P).forEach(([id, t]) => langs.forEach(l => ok(!forbidden.test(t[l]), `P.${id} enthält Triage-/Diagnosebegriff`)));

// ---------- 2. Ablauf ----------
function click(act, val) {
  appEl.listeners.click({ target: { closest: () => ({ disabled: false, getAttribute: k => (k === 'data-act' ? act : val === undefined ? null : String(val)) }) } });
}
function type(attr, key, value) {
  appEl.listeners.input({ target: { value: String(value), getAttribute: k => (k === attr ? key : null) } });
}
const html = () => appEl.innerHTML;
const has = (s, msg) => ok(html().includes(s), msg + ` (erwartet: „${s}")`);

has('Neuer Patient', 'Startseite');
click('new');
has('Bitte tippen Sie auf Ihre Sprache', 'Sprachwahl');
has('اردو', 'Sprachwahl zeigt Urdu in eigener Schrift');
C.LANGS.forEach(l => has(`data-act="say" data-val="lang:${l.code}"`, `Lautsprecher für ${l.code}`));
const flagCount = (html().match(/class="flag"/g) || []).length;
const flagExpected = C.LANGS.reduce((n, l) => n + l.flags.length, 0);
ok(flagCount === flagExpected, `Flaggen auf der Sprachwahl: ${flagCount}, erwartet ${flagExpected}`);
ok(C.LANGS.find(l => l.code === 'ar').flags.length === 0, 'Arabisch ohne Flagge');
ok(!C.LANGS.some(l => l.flags.includes('af')), 'keine Afghanistan-Flagge ohne Entscheidung');
C.LANGS.forEach(l => l.flags.forEach(c => ok(fs.existsSync(path.join(root, 'vendor/flags', c + '.svg')), `Flaggendatei ${c}.svg fehlt`)));
click('say', 'lang:ur');
has('Bitte tippen Sie auf Ihre Sprache', 'Lautsprecher auf der Sprachwahl wechselt die Seite nicht');
click('lang', 'bn');
const UR = 'Bengalisch (⁨বাংলা⁩)';
has(`Für ${UR} gibt es noch keine Übersetzung`, 'Hinweis fehlende Übersetzung nennt Sprache für das Personal');
click('go', 'langconfirm');
has('Your language: বাংলা. Is that right?', 'Sprachbestätigung auf Englisch');
click('langconfirm', 'yes');
has('Before we start', 'Einwilligung');
click('human');
has('The staff has been told', 'Mensch anfordern (Patientenseite)');
has('Die Person möchte mit einem Menschen sprechen', 'Mensch anfordern (Hinweis Personal)');
has(`Sprache: ${UR}.`, 'Mensch anfordern nennt die Sprache');
has(`Video-Dolmetschung für ${UR} rufen (simuliert)`, 'Knopf Video-Dolmetschung');
click('interp');
has('Verbunden (simuliert)', 'Video-Dolmetschung simuliert verbunden');
click('resume');
has('Before we start', 'zurück zur Einwilligung');
click('consent', 'yes');
ok(!html().includes('Is someone with you who can translate'), 'keine Begleitpersonen-Frage mehr im Patientenablauf');
has('What is your main problem?', 'Leitsymptom direkt nach der Einwilligung');
// Lautsprecher-Knöpfe: einer je Kachel plus einer neben der Frage; Antippen wählt nichts aus
const sayCount = (html().match(/data-act="say"/g) || []).length;
ok(sayCount === C.SYMPTOMS.length + 1, `Lautsprecher auf der Leitsymptom-Seite: ${sayCount}, erwartet ${C.SYMPTOMS.length + 1}`);
click('say', 'sym_heat');
click('say', '@screen');
has('What is your main problem?', 'Lautsprecher wechselt die Seite nicht');
ok(!html().includes('aria-pressed="true"'), 'Lautsprecher wählt keine Kachel aus');
click('sym', 'sym_chest');
click('sym', 'sym_heat');
click('sym-done');
const steps = [
  ['When did it start?', 'ans', 'on_today'],
  ['How strong is the pain?', 'ans', 7],
  ['Does the pain go to the arm', 'ans', 'no'],
  ['Is it hard to breathe?', 'ans', 'yes'],
  ['Are you sweating a lot?', 'ans', 'yes'],
  ['Did you faint?', 'ans', 'no'],
  ['Are you vomiting?', 'ans', 'no'],
  ['Can you drink water?', 'ans', 'yes'],
  ['Are you allergic to anything?', 'ans', 'yes'],
  ['You answered: Yes. Is that right?', 'confirm', 'yes'],
  ['What are you allergic to?', 'sel', 'al_med'],
  [null, 'sel-done'],
  ['You answered: Medicine. Is that right?', 'confirm', 'yes'],
  ['Do you take medicine every day?', 'ans', 'no'],
  ['You answered: No. Is that right?', 'confirm', 'no'],
  ['Do you take medicine every day?', 'ans', 'yes'],
  [null, 'confirm', 'yes'],
  ['Which medicine?', 'sel', 'md_heart'],
  [null, 'sel-done'],
  [null, 'confirm', 'yes'],
  ['Do you have one of these illnesses?', 'sel', 'cd_bp'],
  [null, 'sel', 'cd_none'],
  [null, 'sel-done'],
  ['You answered: None of these. Is that right?', 'confirm', 'yes'],
  ['Could you be pregnant?', 'ans', 'unknown'],
  [null, 'confirm', 'no'],
  ['Could you be pregnant?', 'ans', 'unknown'],
  [null, 'confirm', 'no'],
  ['When did you last eat?', 'ans', 'ml_2'],
  [null, 'confirm', 'yes']
];
steps.forEach(([expect, act, val], i) => {
  if (expect) has(expect, `Schritt ${i + 1}`);
  ok(html().includes('data-val="@screen"'), `Schritt ${i + 1}: Lautsprecher neben der Frage`);
  click(act, val);
});
has('Thank you. The staff will now look at your answers.', 'Abschluss Patientenseite');
click('go', 'vitals');
has('Es fehlen Pflichtwerte', 'Vitalzeichen-Erinnerung');
has('Sila schlägt keine Triage-Kategorie vor', 'Hinweis keine Kategorie (Vitalzeichen)');
type('data-vital', 'temp', '38.9');
type('data-vital', 'pulse', '112');
type('data-vital', 'sys', '135');
type('data-vital', 'spo2', '95');
has('data-act="companion-staff"', 'Begleitperson trägt das Personal bei den Vitalzeichen ein');
click('companion-staff', 'no');
click('to-summary');
const sum = html();
has('Übergabe', 'Übergabe');
has(`${UR} · Demo lief auf Englisch`, 'Sprache in der Übergabe');
has('Schmerz oder Druck in der Brust, Zu viel Hitze oder Sonne', 'Leitsymptome in der Übergabe');
has('7 / 10', 'Schmerzwert');
has('Medikamente <span class="okmark">✓ von der Person bestätigt', 'Allergie bestätigt');
has('Mittel für Herz oder Blutdruck', 'Medikamentenart');
has('Keine davon', 'exklusive Option ersetzt andere');
ok(!sum.includes('Bluthochdruck <span'), 'Bluthochdruck wurde durch „Keine davon" ersetzt');
has('NICHT bestätigt, mit Dolmetscher klären', 'zweimal nicht bestätigt');
has('38.9', 'Temperatur');
has('Begleitperson, die übersetzen kann</dt><dd>Nein', 'Begleitperson in der Übergabe');
has('Video-Dolmetschung angefordert bei', 'Dolmetschung in der Übergabe');
has('<svg version="1.1"', 'QR-Code erzeugt');
has('Keine Diagnose und kein Triage-Vorschlag durch das System', 'Hinweis in der Übergabe');
ok(!/Kategorie [1-5]|Triage-Stufe/.test(sum), 'keine Triage-Kategorie vom System');
const json = (sum.match(/<pre id="qr-json">([^<]*)<\/pre>/) || [])[1] || '';
const decoded = json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
let data = null;
try { data = JSON.parse(decoded); } catch (e) { ok(false, 'QR-Inhalt ist kein JSON: ' + e.message); }
if (data) {
  ok(data.l === 'bn' && data.ui === 'en', 'QR: Sprache');
  ok(data.a.pain === 7, 'QR: Schmerzwert');
  ok(data.s.preg[1] === 0, 'QR: Schwangerschaft nicht bestätigt');
  ok(data.s.allergy_what[0][0] === 'al_med', 'QR: Allergie');
  ok(data.h === 1, 'QR: eine Anfrage nach einem Menschen');
  ok(data.cp === 'no' && data.i === 1, 'QR: Begleitperson und Dolmetschung');
  ok(!/name/i.test(decoded), 'QR: keine Namensfelder');
  ok(decoded.length < 1200, 'QR: Datensatz kompakt (' + decoded.length + ' Zeichen)');
}
type('data-field', 'triageCat', 'ESI 3 (Personal)');
click('end');
has('Neuer Patient', 'nach Fallende zurück am Start');
ok(!html().includes('38.9'), 'Falldaten nach Fallende gelöscht');
ok(Object.keys(store).every(k => ['sila.staffLang', 'sila.women', 'sila.tts'].includes(k)), 'Browser-Speicher enthält nur Einstellungen');

// Zweite Bildtafel hinter „Etwas anderes" mit automatischer Hilfe
click('new');
click('lang', 'de');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sym', 'sym_other');
click('sym-done');
has('Was ist es noch?', 'zweite Bildtafel');
ok((html().match(/data-act="sel"/g) || []).length === C.SYMPTOMS2.length + 1, 'zweite Bildtafel: alle Kacheln plus Weiß nicht');
click('sel', 'sym_eye');
click('sel', 'sym_lost');
click('sel', 'sym_other2');
click('sel-done');
has('Wann hat es angefangen?', 'Folgefrage zur Augen-Beschwerde');
click('ans', 'on_today');
has('Wie stark ist der Schmerz?', 'Schmerzfrage');
click('ans', 3);
has('Das Personal hilft Ihnen, Ihre Gruppe zu erreichen.', 'Hinweis Gruppe verloren');
click('info-ok');
has('Die Person hat ihre Gruppe verloren', 'automatische Hilfe bei verlorener Gruppe');
click('resume');
// „Noch etwas anderes" öffnet den Sprechmodus statt einer Sackgasse
has('Bitte sagen Sie in Ihren eigenen Worten, was los ist.', 'Sprechmodus bei „Noch etwas anderes"');
has('data-act="mic"', 'Mikrofon-Knopf');
has('id="free-done" class="primary done" data-act="free-done" disabled', '„Fertig" gesperrt ohne Text');
click('mic');
has('Das Mikrofon ist nicht verfügbar', 'Hinweis ohne Mikrofon (Testumgebung)');
type('data-field', 'freeText', 'Ich habe seit gestern starke Kopfschmerzen');
click('free-done');
has('So haben wir Sie verstanden:', 'Rückbestätigung der freien Angabe');
has('Ich habe seit gestern starke Kopfschmerzen', 'freie Angabe wird angezeigt');
click('freeok', 'yes');
has('Haben Sie eine Allergie?', 'danach weiter mit den Sicherheitsfragen');
click('staffmenu');
click('to-summary');
has('Etwas anderes, Problem mit den Augen, Ich habe meine Gruppe verloren, Noch etwas anderes', 'weitere Anliegen als Hauptproblem');
has('· Gruppe verloren', 'Anfrage wegen Gruppe in der Übergabe');
has('Freie Angabe <span class="small">(maschinell übersetzt, ungeprüft)</span>', 'freie Angabe gekennzeichnet');
has('Ich habe seit gestern starke Kopfschmerzen', 'freie Angabe in der Übergabe');
has('Dolmetschung</dt><dd>keine', 'keine Dolmetschung angefordert');
click('end');

// Entwurfssprache Urdu: Hinweis, Texte auf Urdu, kein Sprechmodus (Urdu erst nach Messung)
['tr', 'id', 'ur'].forEach(code => {
  ok(C.LANGS.find(l => l.code === code).draft === true, `${code} als Entwurf markiert`);
  Object.keys(C.P).forEach(k => ok(typeof C.P[k][code] === 'string' && C.P[k][code].length > 0, `P.${k} ohne Entwurf für ${code}`));
  ok(C.P.lang_confirm[code].includes('{lang}') && C.P.confirm_q[code].includes('{answer}'), `Platzhalter in ${code} erhalten`);
});
ok(C.LANGS.filter(l => !l.has).map(l => l.code).join(',') === 'ar,bn,fa,ha,fr', 'ohne Übersetzung bleiben ar, bn, fa, ha, fr');
click('new');
click('lang', 'ur');
has('Entwurfsübersetzung von Claude, die Muttersprachler noch nicht geprüft haben', 'Hinweis Entwurf für das Personal');
click('go', 'langconfirm');
has('آپ کی زبان: اردو۔ کیا یہ درست ہے؟', 'Sprachbestätigung auf Urdu');
has('dir="rtl" lang="ur"', 'Urdu von rechts nach links');
has('Urdu (⁨اردو⁩): Entwurfsübersetzung von Claude', 'Entwurfshinweis in der Fußzeile');
click('langconfirm', 'yes');
click('consent', 'yes');
has(C.P.q_main.ur, 'Leitsymptom-Frage auf Urdu');
click('sym', 'sym_other');
click('sym-done');
click('sel', 'sym_other2');
click('sel-done');
has(C.P.free_no_speech.ur, 'kein Sprechmodus für Urdu, stattdessen Person anfordern');
click('free-skip');
has(C.P.q_allergy.ur, 'weiter mit Sicherheitsfrage auf Urdu');
click('end');

// Türkisch: Sprechmodus erlaubt; ohne Übersetzer im Browser bleibt der Originaltext
click('new');
click('lang', 'tr');
click('go', 'langconfirm');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sym', 'sym_other');
click('sym-done');
click('sel', 'sym_other2');
click('sel-done');
has(C.P.q_free.tr, 'Sprechmodus auf Türkisch');
type('data-field', 'freeText', 'Dünden beri başım çok ağrıyor');
click('free-done');
has(C.P.free_heard.tr, 'Rückbestätigung auf Türkisch');
click('freeok', 'no');
has(C.P.q_free.tr, 'nach „Nein" zurück zum Sprechmodus');
has('Dünden beri başım çok ağrıyor', 'Text bleibt zum Korrigieren erhalten');
click('free-done');
click('freeok', 'no');
has('Automatisch angefordert: Die freie Angabe ließ sich nicht bestätigen.', 'nach zweitem „Nein" automatisch eine Person');
click('resume');
click('staffmenu');
click('to-summary');
has('keine Übersetzung in diesem Browser, nur Originaltext', 'Hinweis ohne Übersetzung');
has('NICHT bestätigt, mit Dolmetscher klären', 'freie Angabe nicht bestätigt');
has('Türkisch (⁨Türkçe⁩) · Entwurfsübersetzung, ungeprüft', 'Entwurf in der Übergabe');
click('end');

// Frauenmodus und Ablehnung
click('toggle', 'women');
click('new');
click('lang', 'de');
has('Ihre Sprache: Deutsch. Stimmt das?', 'Sprachbestätigung Deutsch');
click('langconfirm', 'yes');
click('consent', 'yes');
has('Eine Frau anfordern', 'Frauenmodus: Knopf oben statt eigener Seite');
click('human');
has('Das Personal weiß, dass Sie eine Frau wünschen', 'Frauenmodus: Anfrage');
has('Die Person wünscht eine Frau', 'Frauenmodus: Hinweis Personal');
click('resume');
has('Was ist Ihr Hauptproblem?', 'Leitsymptom Deutsch');
click('end');
click('toggle', 'women');
click('new');
click('lang', 'en');
click('langconfirm', 'yes');
click('consent', 'no');
has('That is fine. A staff member will help you.', 'Ablehnung: Patientenseite');
has('Die Person hat abgelehnt', 'Ablehnung: Hinweis Personal');

console.log(`${checks} Prüfungen, ${failures} Fehler`);
process.exit(failures ? 1 : 0);
