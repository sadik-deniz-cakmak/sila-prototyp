/*
 * Sila MVP v0.5 – automatischer Test ohne Browser.
 * Lädt qrcode.js, die Sprachdateien, content.js und app.js in eine Node-VM mit einer kleinen
 * DOM-Attrappe, spielt vollständige Fälle in allen Betriebsarten durch und prüft die Inhalte.
 *
 * Aufruf im Ordner 05_prototyp:
 *   node tools/flowtest.js            Ablauf und Inhalte
 *   node tools/flowtest.js --strict   zusätzlich: alle Sprachdateien vollständig, Arabisch für das Personal
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const root = path.join(__dirname, '..');
const STRICT = process.argv.includes('--strict');
let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.log('FEHLER: ' + msg); }
}
const LANG_FILES = fs.readdirSync(path.join(root, 'lang')).filter(f => /^[a-z]{2}\.js$/.test(f)).sort();

// ---------- DOM-Attrappe ----------
function boot(opts) {
  opts = opts || {};
  const ctx = { scanText: '', store: opts.store || {}, session: opts.session || {} };
  if (opts.voices) opts.speech = { getVoices: () => opts.voices.map(l => ({ lang: l })), cancel() {}, speak() { ctx.spoken = (ctx.spoken || 0) + 1; } };
  const appEl = {
    innerHTML: '', listeners: {},
    addEventListener(t, f) { this.listeners[t] = f; },
    querySelector(sel) { return sel.indexOf('scanText') >= 0 ? { value: ctx.scanText } : null; }
  };
  const sandbox = {
    console, performance, URLSearchParams, Intl,
    location: { search: opts.search || '', protocol: 'file:', origin: 'null', pathname: '/index.html' },
    navigator: {},
    localStorage: { getItem: k => (k in ctx.store ? ctx.store[k] : null), setItem: (k, v) => { ctx.store[k] = String(v); } },
    sessionStorage: { getItem: k => (k in ctx.session ? ctx.session[k] : null), setItem: (k, v) => { ctx.session[k] = String(v); }, removeItem: k => { delete ctx.session[k]; } },
    document: { getElementById: id => (id === 'app' ? appEl : null), documentElement: {} },
    scrollTo() {},
    print() { ctx.printed = (ctx.printed || 0) + 1; },
    setTimeout: fn => { fn(); return 0; },   // simulierte Dolmetsch-Verbindung sofort „verbunden"
    setInterval: () => 0, clearInterval() {}
  };
  // Vorlesen gibt es in der Attrappe nur, wenn der Test Stimmen vorgibt (opts.voices)
  if (opts.speech) { sandbox.speechSynthesis = opts.speech; sandbox.SpeechSynthesisUtterance = function (t) { this.text = t; }; }
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const files = ['vendor/qrcode.js']
    .concat(LANG_FILES.filter(f => !(opts.skipLangs || []).includes(f.slice(0, 2))).map(f => 'lang/' + f))
    .concat(['content.js', 'app.js']);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
  ctx.C = sandbox.SILA;
  ctx.html = () => appEl.innerHTML;
  ctx.listeners = appEl.listeners;
  // advance: die Uhr der App um ms Millisekunden vorstellen (für die Sperrzeit gegen Doppeltippen)
  ctx.advance = ms => vm.runInContext('(function (d) { var n = Date.now; Date.now = function () { return n() + d; }; })(' + Number(ms) + ')', sandbox);
  // raw: Ereignis ohne Prüfung auslösen (für Eingaben, die es auf der Seite gar nicht gibt)
  ctx.raw = (act, val) => appEl.listeners.click({ target: { closest: () => ({ disabled: false, getAttribute: k => (k === 'data-act' ? act : val === undefined ? null : String(val)) }) } });
  // click: wie im Browser nur, wenn der Knopf auf der Seite steht und nicht gesperrt ist
  ctx.click = (act, val) => {
    const h = appEl.innerHTML;
    const at = h.indexOf(`data-act="${act}"` + (val === undefined ? '' : ` data-val="${val}"`));
    ok(at >= 0, `Klick auf etwas, das nicht auf der Seite steht: ${act}${val === undefined ? '' : ' ' + val}`);
    if (at < 0 || /\sdisabled(\s|>|$)/.test(h.slice(at, h.indexOf('>', at) + 1))) return;
    ctx.raw(act, val);
  };
  ctx.type = (attr, key, value) => appEl.listeners.input({ target: { value: String(value), getAttribute: k => (k === attr ? key : null) } });
  ctx.has = (s, msg) => ok(ctx.html().includes(s), msg + ` (erwartet: „${s}")`);
  ctx.hasNot = (s, msg) => ok(!ctx.html().includes(s), msg + ` (unerwartet: „${s}")`);
  return ctx;
}
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function qrData(html) {
  const json = (html.match(/<pre id="qr-json"[^>]*>([^<]*)<\/pre>/) || [])[1] || '';
  const decoded = json.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  try { return { data: JSON.parse(decoded), text: decoded }; } catch (e) { ok(false, 'QR-Inhalt ist kein JSON: ' + e.message); return { data: null, text: decoded }; }
}

const A = boot();
const C = A.C;
const { click, type, has, hasNot, html } = A;
const store = A.store;

// ---------- 1. Inhaltsprüfung ----------
const src = ['en', 'de'];
for (const [dictName, dict] of [['P', C.P], ['S', C.S]]) {
  for (const id of Object.keys(dict)) {
    for (const l of src) ok(typeof dict[id][l] === 'string' && dict[id][l].length > 0, `${dictName}.${id} ohne Text für ${l}`);
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
for (const s of C.SYMPTOMS.concat(C.SYMPTOMS2)) {
  ok(C.P[s.id], `Leitsymptom ${s.id} fehlt in P`);
  ok(C.ICONS[s.icon], `Leitsymptom ${s.id}: Piktogramm ${s.icon} fehlt`);
  s.follow.forEach(id => ok(C.Q[id], `Leitsymptom ${s.id}: Frage ${id} fehlt`));
}
C.SAFETY.forEach(id => ok(C.Q[id] && C.Q[id].safety, `Sicherheitsfrage ${id} fehlt oder nicht markiert`));
C.PILGRIM.forEach(id => ok(C.Q[id] && C.Q[id].pilgrim, `Pilgerfrage ${id} fehlt oder nicht markiert`));
C.BODY.forEach(r => ok(C.P[r.id], `Körperregion ${r.id} fehlt`));
for (const profile of Object.keys(C.TALK)) {
  for (const cat of C.TALK[profile]) {
    ok(C.S[cat.label], `Gespräch ${profile}/${cat.id}: Beschriftung ${cat.label} fehlt`);
    ok(C.ICONS[cat.icon], `Gespräch ${profile}/${cat.id}: Piktogramm ${cat.icon} fehlt`);
    ok(cat.items.length >= 3, `Gespräch ${profile}/${cat.id}: zu wenige Sätze`);
    for (const item of cat.items) {
      ok(C.P[item.p], `Gespräch ${profile}/${cat.id}: Satz ${item.p} fehlt in P`);
      ok(['say', 'yn', 'body', 'scale'].includes(item.k), `Gespräch ${profile}/${cat.id}: Art ${item.k} unbekannt`);
      if (item.safety) ok(item.k === 'yn', `Gespräch ${profile}/${cat.id}: Sicherheitsfrage ${item.p} muss Ja/Nein sein`);
    }
  }
}
// Grundsatz: keine Triage-Kategorien oder Diagnosen in den Patientenphrasen
const forbidden = /\b(triage level|category [1-5]|kategorie [1-5]|diagnos)/i;
Object.entries(C.P).forEach(([id, t]) => src.forEach(l => ok(!forbidden.test(t[l]), `P.${id} enthält Triage-/Diagnosebegriff`)));
// Jeder feste Schlüssel, den app.js benutzt, muss es geben; Piktogramme ebenso
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
for (const m of appSrc.matchAll(/\b(?:S|ts)\('([a-z0-9_]+)'\s*[,)]/g)) ok(C.S[m[1]] || C.P[m[1]], `app.js nutzt S('${m[1]}'), den es nicht gibt`);
for (const m of appSrc.matchAll(/\b(?:P|tp)\('([a-z0-9_]+)'\s*[,)]/g)) ok(C.P[m[1]], `app.js nutzt P('${m[1]}'), den es nicht gibt`);
for (const m of appSrc.matchAll(/look\(C\.(S|P), '([a-z0-9_]+)'/g)) ok(C[m[1]][m[2]], `app.js nutzt look(C.${m[1]}, '${m[2]}'), den es nicht gibt`);
for (const m of appSrc.matchAll(/\b(?:ic|tic)\('([a-z]+)'/g)) ok(C.ICONS[m[1]], `app.js nutzt Piktogramm '${m[1]}', das es nicht gibt`);
// S-Schlüssel, die nirgends vorkommen (weder fest noch über zusammengesetzte Namen), sind Ballast für die Übersetzung
const dynamic = /^(mode_|row_|ab_|st_|sum_mode_|persist_)/;
Object.keys(C.S).forEach(k => {
  const viaData = Object.values(C.Q).some(q => q.label === k) || Object.values(C.TALK).flat().some(c => c.label === k);
  ok(appSrc.includes("'" + k + "'") || dynamic.test(k) || viaData, `S.${k} wird in app.js nicht benutzt`);
});

// ---------- 2. Startseite ----------
has('Verständigung in jeder Sprache.', 'Startseite');
has('Die Person antwortet selbst', 'Startseite: Selbstauskunft');
has('Das Personal führt das Gespräch', 'Startseite: Gespräch');
has('Satzbuch für Freiwillige', 'Startseite: Helfer im Feld');
has('data-act="staffLang" data-val="ar"', 'Startseite: Arabisch als Sprache des Personals wählbar');
has('Noch keine Fälle.', 'Startseite: Zähler leer');
ok(/\d{4}/.test(html()) && html().includes(' · '), 'Startseite: Datum mit zweitem Kalender');

// ---------- 3. Selbstauskunft, vollständiger Fall (Frau, Englisch) ----------
click('new-self');
has('class="langwords"', 'Sprachwahl');
has('اردو', 'Sprachwahl zeigt Urdu in eigener Schrift');
C.LANGS.forEach(l => has(`data-act="say" data-val="lang:${l.code}"`, `Lautsprecher für ${l.code}`));
const flagCount = (html().match(/class="flag"/g) || []).length;
const flagExpected = C.LANGS.reduce((n, l) => n + l.flags.length, 0);
ok(flagCount === flagExpected, `Flaggen auf der Sprachwahl: ${flagCount}, erwartet ${flagExpected}`);
ok(C.LANGS.find(l => l.code === 'ar').flags.length === 0, 'Arabisch ohne Flagge');
ok(!C.LANGS.some(l => l.flags.includes('af')), 'keine Afghanistan-Flagge ohne Entscheidung');
C.LANGS.forEach(l => l.flags.forEach(c => ok(fs.existsSync(path.join(root, 'vendor/flags', c + '.svg')), `Flaggendatei ${c}.svg fehlt`)));
ok(C.LANGS[0].code === 'ur', 'Urdu steht in der Sprachwahl vorn');
click('say', 'lang:ur');
has('class="langwords"', 'Lautsprecher auf der Sprachwahl wechselt die Seite nicht');
click('lang', 'en');
has('Your language: English. Is that right?', 'Sprachbestätigung');
click('langconfirm', 'yes');
has('Before we start', 'Einwilligung');
has('This tablet asks you short questions', 'Einwilligung: Text für das Tablet der Klinik');
click('human');
has('The staff has been told', 'Mensch anfordern (Patientenseite)');
has('Die Person möchte mit einem Menschen sprechen', 'Mensch anfordern (Hinweis Personal)');
has('Sprache: Englisch (⁨English⁩).', 'Mensch anfordern nennt die Sprache');
has('Video-Dolmetschung für Englisch (⁨English⁩) rufen (simuliert)', 'Knopf Video-Dolmetschung');
click('interp');
has('Verbunden (simuliert)', 'Video-Dolmetschung simuliert verbunden');
click('resume');
has('Before we start', 'zurück zur Einwilligung');
click('consent', 'yes');
has('Are you a woman or a man?', 'Frage nach Frau oder Mann');
click('sex', 'f');
has('What is your main problem?', 'Leitsymptom nach der Angabe zum Geschlecht');
has('Ask for a woman', 'Frau: Knopf „Eine Frau anfordern" oben');
has('Cough or sore throat', 'Leitsymptom Husten oder Halsschmerzen');
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
  ['Were you in the sun for a long time today?', 'ans', 'yes'],
  ['Did you faint?', 'ans', 'no'],
  ['Are you vomiting?', 'ans', 'no'],
  ['Can you drink water?', 'ans', 'yes'],
  ['Do you have muscle cramps?', 'ans', 'no'],
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
  ['Are you fasting today?', 'ans', 'yes'],
  ['You answered: Yes. Is that right?', 'confirm', 'yes'],
  ['When did you last eat?', 'ans', 'ml_2'],
  [null, 'confirm', 'yes'],
  ['Are you here with a group?', 'ans', 'yes'],
  ['If you have a pilgrim card or a wristband', 'info-ok']
];
steps.forEach(([expect, act, val], i) => {
  if (expect) has(expect, `Schritt ${i + 1}`);
  ok(html().includes('data-val="@screen"'), `Schritt ${i + 1}: Lautsprecher neben der Frage`);
  ok(html().includes('data-act="back"'), `Schritt ${i + 1}: Zurück-Knopf`);
  ok(html().includes('class="prog"'), `Schritt ${i + 1}: Fortschrittsanzeige`);
  click(act, val);
});
has('Thank you. The staff will now look at your answers.', 'Abschluss Patientenseite');
has('Gespräch fortsetzen', 'Abschluss: Gespräch im selben Fall möglich');
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
has('Englisch (⁨English⁩)', 'Sprache in der Übergabe');
has('Erfasst über</dt><dd>Selbstauskunft', 'Betriebsart in der Übergabe');
has('Geschlecht (Angabe der Person)</dt><dd>Frau', 'Geschlecht in der Übergabe');
has('Schmerz oder Druck in der Brust, Zu viel Hitze oder Sonne', 'Leitsymptome in der Übergabe');
has('7 / 10', 'Schmerzwert');
has('Heute lange in der Sonne</dt><dd>Ja', 'Hitzefrage in der Übergabe');
has('Medikamente <span class="okmark">✓ von der Person bestätigt', 'Allergie bestätigt');
has('Mittel für Herz oder Blutdruck', 'Medikamentenart');
has('Keine davon', 'exklusive Option ersetzt andere');
ok(!sum.includes('Bluthochdruck <span'), 'Bluthochdruck wurde durch „Keine davon" ersetzt');
has('NICHT bestätigt, mit Dolmetscher klären', 'zweimal nicht bestätigt');
// Kasten „Noch zu klären": nur Offenes der Verständigung, keine klinische Wertung
has('<div class="openbox"><strong>Noch zu klären</strong>', 'Übergabe: Kasten für offene Punkte');
has('<li>Mögliche Schwangerschaft: NICHT bestätigt, mit Dolmetscher klären</li>', 'offene Punkte: nicht bestätigte Sicherheitsantwort');
ok(!/<li>[^<]*(Temperatur|Puls)/.test(sum.split('class="sum-grid"')[0]), 'offene Punkte: vollständige Pflichtwerte erscheinen nicht');
ok(!/openbox[^]*?(dringend|kritisch|Warnung|urgent|critical)/i.test(sum.split('class="sum-grid"')[0]), 'offene Punkte: keine Wertung der Dringlichkeit');
has('Fastet heute</dt><dd>Ja <span class="okmark">', 'Fasten als bestätigte Sicherheitsangabe');
has('Angaben zur Pilgerreise', 'Abschnitt Pilgerreise');
has('Mit einer Gruppe hier</dt><dd>Ja', 'Gruppe in der Übergabe');
has('Pilgerkarte oder Armband</dt><dd>gebeten, sie dem Personal zu zeigen', 'Hinweis zur Pilgerkarte in der Übergabe');
has('38.9', 'Temperatur');
has('Begleitperson, die übersetzen kann</dt><dd>Nein', 'Begleitperson in der Übergabe');
has('Video-Dolmetschung angefordert bei', 'Dolmetschung in der Übergabe');
has('<svg version="1.1"', 'QR-Code erzeugt');
has('Keine Diagnose und kein Triage-Vorschlag durch das System', 'Hinweis in der Übergabe');
ok(!/Kategorie [1-5]|Triage-Stufe/.test(sum), 'keine Triage-Kategorie vom System');
hasNot('Gespräch (vom Personal geführt)', 'ohne Gespräch kein Gesprächsabschnitt');
let qr = qrData(sum);
if (qr.data) {
  const d = qr.data;
  ok(d.l === 'en' && d.ui === 'en' && d.x === 'f', 'QR: Sprache und Geschlecht');
  ok(d.m.join() === 'self', 'QR: Betriebsart');
  ok(d.a.pain === 7 && d.a.sun === 'yes' && d.a.group === 'yes', 'QR: Antworten');
  ok(d.s.preg[1] === 0, 'QR: Schwangerschaft nicht bestätigt');
  ok(d.s.fasting[0] === 'yes' && d.s.fasting[1] === 1, 'QR: Fasten bestätigt');
  ok(d.s.allergy_what[0][0] === 'al_med', 'QR: Allergie');
  ok(d.h === 1, 'QR: eine Anfrage nach einem Menschen');
  ok(d.cp === 'no' && d.i === 1, 'QR: Begleitperson und Dolmetschung');
  ok(!/name/i.test(qr.text), 'QR: keine Namensfelder');
  ok(qr.text.length < 1200, 'QR: Datensatz kompakt (' + qr.text.length + ' Zeichen)');
}
const selfCode = qr.text;
type('data-field', 'triageCat', 'ESI 3 (Personal)');
// Sprache des Personals: dieselbe Übergabe auf Englisch
click('staffLang', 'en');
has('Handover', 'Übergabe auf Englisch');
has('Fasting today</dt><dd>Yes', 'Übergabe auf Englisch: Inhalte');
click('staffLang', 'de');
// Fall beenden nur mit Rückfrage in der App (kein Browser-Dialog)
click('end');
has('Fall beenden? Alle Antworten auf diesem Gerät werden gelöscht.', 'Rückfrage vor dem Löschen');
click('print');
ok(!A.printed, 'bei offener Rückfrage ist alles andere gesperrt');
click('dlg-no');
has('38.9', 'Abbrechen behält den Fall');
click('end');
click('dlg-yes');
has('Verständigung in jeder Sprache.', 'nach Fallende zurück am Start');
ok(!html().includes('38.9'), 'Falldaten nach Fallende gelöscht');
ok(Object.keys(store).every(k => ['sila.staffLang', 'sila.women', 'sila.tts', 'sila.stats'].includes(k)), 'Browser-Speicher enthält nur Einstellungen und Zähler: ' + Object.keys(store).join(', '));
let stats = JSON.parse(store['sila.stats']);
ok(stats.n === 1 && stats.lang.en === 1 && stats.mode.self === 1 && stats.human === 1, 'anonymer Zähler nach dem ersten Fall');
ok(Object.keys(stats).sort().join() === 'human,lang,mode,n,since', 'Zähler enthält nur Sprache, Betriebsart und Anfragen');
has('1 Fälle seit', 'Zähler auf der Startseite');

// ---------- 4. Zurück-Knopf nimmt die letzte Antwort zurück ----------
click('new-self');
click('lang', 'de');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sex', 'm');
has('Person anfordern', 'Mann: Knopf „Person anfordern"');
click('sym', 'sym_pain');
click('sym-done');
has('Wo ist es?', 'Körperkarte');
click('back');
has('Was ist Ihr Hauptproblem?', 'Zurück von der ersten Frage führt zur Auswahl');
click('sym-done');
click('sel', 'reg_chest');
click('sel-done');
has('Wann hat es angefangen?', 'Beginn');
click('ans', 'on_today');
has('Wie stark ist der Schmerz?', 'Schmerzskala');
click('back');
has('Wann hat es angefangen?', 'Zurück zeigt die vorige Frage');
click('ans', 'on_long');
click('ans', 4);
has('Haben Sie eine Allergie?', 'Sicherheitsfragen');
click('ans', 'yes');
has('Ihre Antwort: Ja. Stimmt das?', 'Rückbestätigung');
click('back');
has('Haben Sie eine Allergie?', 'Zurück aus der Rückbestätigung');
click('ans', 'no');
click('confirm', 'yes');
click('ans', 'no'); click('confirm', 'yes');            // Medikamente
click('sel', 'cd_none'); click('sel-done'); click('confirm', 'yes');   // Vorerkrankungen
hasNot('Könnten Sie schwanger sein?', 'Mann: keine Frage nach Schwangerschaft');
has('Fasten Sie heute?', 'Mann: weiter mit dem Fasten');
click('ans', 'no'); click('confirm', 'yes');
click('ans', 'ml_6'); click('confirm', 'yes');
has('Sind Sie mit einer Gruppe hier?', 'Frage nach der Gruppe');
click('ans', 'no');
has('Danke. Das Personal sieht sich jetzt Ihre Antworten an.', 'ohne Gruppe kein Hinweis zur Pilgerkarte');
click('to-summary');
has('Beginn</dt><dd>Vor mehr als 3 Tagen', 'korrigierte Antwort steht in der Übergabe');
has('Allergie</dt><dd>Nein', 'korrigierte Sicherheitsantwort');
has('Geschlecht (Angabe der Person)</dt><dd>Mann', 'Mann in der Übergabe');
hasNot('Mögliche Schwangerschaft', 'Mann: keine Schwangerschaft in der Übergabe');
click('end'); click('dlg-yes');

// ---------- 5. Zweite Bildtafel, automatische Hilfe, Sprechmodus ----------
click('new-self');
click('lang', 'de');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sex', 'skip');
click('sym', 'sym_other');
click('sym-done');
has('Was ist es noch?', 'zweite Bildtafel');
ok((html().match(/data-act="sel"/g) || []).length === C.SYMPTOMS2.length + 1, 'zweite Bildtafel: alle Kacheln plus Weiß nicht');
has('Füße: Blasen, Verbrennung oder Wunden', 'zweite Bildtafel: Füße');
click('sel', 'sym_feet');
click('sel', 'sym_lost');
click('sel', 'sym_other2');
click('sel-done');
has('Wann hat es angefangen?', 'Folgefrage zu den Füßen');
click('ans', 'on_today');
has('Wie stark ist der Schmerz?', 'Schmerzfrage');
click('ans', 3);
has('Können Sie gehen?', 'Füße: Frage nach dem Gehen');
click('ans', 'yes');
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
A.raw('free-done');   // im Browser gibt die Eingabe den Knopf frei; die Attrappe zeichnet nicht neu
has('So haben wir Sie verstanden:', 'Rückbestätigung der freien Angabe');
has('Ich habe seit gestern starke Kopfschmerzen', 'freie Angabe wird angezeigt');
click('freeok', 'yes');
has('Haben Sie eine Allergie?', 'danach weiter mit den Sicherheitsfragen');
click('ans', 'no'); click('confirm', 'yes');
click('ans', 'no'); click('confirm', 'yes');
click('sel', 'cd_none'); click('sel-done'); click('confirm', 'yes');
has('Könnten Sie schwanger sein?', 'ohne Angabe zum Geschlecht wird nach Schwangerschaft gefragt');
click('staffmenu');
has('Menü für das Personal', 'Menü für das Personal');
has('Zurück zu den Fragen', 'Menü: zurück zu den Fragen');
click('to-summary');
has('Etwas anderes, Füße: Blasen, Verbrennung oder Wunden, Ich habe meine Gruppe verloren, Noch etwas anderes', 'weitere Anliegen als Hauptproblem');
has('· Gruppe verloren', 'Anfrage wegen Gruppe in der Übergabe');
has('Freie Angabe <span class="small">(maschinell übersetzt, ungeprüft)</span>', 'freie Angabe gekennzeichnet');
has('Ich habe seit gestern starke Kopfschmerzen', 'freie Angabe in der Übergabe');
has('Dolmetschung</dt><dd>keine', 'keine Dolmetschung angefordert');
has('Geschlecht (Angabe der Person)</dt><dd>–', 'ohne Angabe zum Geschlecht');
// aus der Übergabe zurück in die offene Selbstauskunft
click('staffmenu');
click('talk-self');
has('Könnten Sie schwanger sein?', 'Selbstauskunft lässt sich aus dem Menü fortsetzen');
click('staffmenu'); click('end'); click('dlg-yes');

// ---------- 6. Entwurfssprachen ----------
['tr', 'id', 'ur'].forEach(code => {
  ok(C.LANGS.find(l => l.code === code).draft === true, `${code} als Entwurf markiert`);
  ok(C.P.lang_confirm[code].includes('{lang}') && C.P.confirm_q[code].includes('{answer}'), `Platzhalter in ${code} erhalten`);
});
click('new-self');
click('lang', 'ur');
has(escHtml(C.P.lang_confirm.ur.replace('{lang}', 'اردو')), 'Sprachbestätigung auf Urdu, ohne Zwischenseite für das Personal');
has('dir="rtl" lang="ur"', 'Urdu von rechts nach links');
has('Urdu (⁨اردو⁩): Entwurfsübersetzung von Claude', 'Entwurfshinweis in der Fußzeile');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sex', 'f');
has(escHtml(C.P.q_main.ur_f || C.P.q_main.ur), 'Leitsymptom-Frage auf Urdu');
has(escHtml(C.P.women_btn.ur), 'Urdu: Knopf „Eine Frau anfordern"');
click('sym', 'sym_other');
click('sym-done');
click('sel', 'sym_other2');
click('sel-done');
has(escHtml(C.P.free_no_speech.ur_f || C.P.free_no_speech.ur), 'kein Sprechmodus für Urdu, stattdessen Person anfordern');
click('free-skip');
has(escHtml(C.P.q_allergy.ur_f || C.P.q_allergy.ur), 'weiter mit Sicherheitsfrage auf Urdu');
click('staffmenu'); click('end'); click('dlg-yes');
// weibliche Formen: werden genutzt, wenn die Person eine Frau ist, sonst die allgemeine Form
const femKey = Object.keys(C.P).find(k => C.P[k].ur_f && C.Q[Object.keys(C.Q).find(q => C.Q[q].text === k && C.Q[q].type === 'yn' && !C.Q[q].safety)]);
if (femKey) {
  const qid = Object.keys(C.Q).find(q => C.Q[q].text === femKey);
  const sym = C.SYMPTOMS.find(s => s.follow.includes(qid));
  for (const sex of ['f', 'm']) {
    click('new-self'); click('lang', 'ur'); click('langconfirm', 'yes'); click('consent', 'yes'); click('sex', sex);
    click('sym', sym.id); click('sym-done');
    let guard = 0;
    while (!html().includes(escHtml(C.P[femKey].ur_f)) && !html().includes(escHtml(C.P[femKey].ur)) && guard++ < 8) {
      if (html().includes('data-act="sel"')) { click('sel', 'unknown'); click('sel-done'); } else click('ans', 'unknown');
    }
    ok(html().includes(escHtml(sex === 'f' ? C.P[femKey].ur_f : C.P[femKey].ur)), `Urdu ${femKey}: ${sex === 'f' ? 'weibliche' : 'allgemeine'} Form`);
    click('staffmenu'); click('end'); click('dlg-yes');
  }
} else if (STRICT) ok(false, 'Urdu ohne weibliche Formen (Schlüssel mit |f)');

// Türkisch: Sprechmodus erlaubt; ohne Übersetzer im Browser bleibt der Originaltext
click('new-self');
click('lang', 'tr');
click('langconfirm', 'yes');
click('consent', 'yes');
click('sex', 'm');
click('sym', 'sym_other');
click('sym-done');
click('sel', 'sym_other2');
click('sel-done');
has(escHtml(C.P.q_free.tr), 'Sprechmodus auf Türkisch');
type('data-field', 'freeText', 'Dünden beri başım çok ağrıyor');
A.raw('free-done');   // im Browser gibt die Eingabe den Knopf frei; die Attrappe zeichnet nicht neu
has(escHtml(C.P.free_heard.tr), 'Rückbestätigung auf Türkisch');
click('freeok', 'no');
has(escHtml(C.P.q_free.tr), 'nach „Nein" zurück zum Sprechmodus');
has('Dünden beri başım çok ağrıyor', 'Text bleibt zum Korrigieren erhalten');
A.raw('free-done');   // im Browser gibt die Eingabe den Knopf frei; die Attrappe zeichnet nicht neu
click('freeok', 'no');
has('Automatisch angefordert: Die freie Angabe ließ sich nicht bestätigen.', 'nach zweitem „Nein" automatisch eine Person');
click('resume');
click('staffmenu');
click('to-summary');
has('keine Übersetzung in diesem Browser, nur Originaltext', 'Hinweis ohne Übersetzung');
has('NICHT bestätigt, mit Dolmetscher klären', 'freie Angabe nicht bestätigt');
has('Türkisch (⁨Türkçe⁩) · Entwurfsübersetzung, ungeprüft', 'Entwurf in der Übergabe');
click('end'); click('dlg-yes');

// ---------- 7. Frauenbereich und Ablehnung ----------
click('toggle', 'women');
click('new-self');
click('lang', 'de');
has('Ihre Sprache: Deutsch. Stimmt das?', 'Sprachbestätigung Deutsch');
click('langconfirm', 'yes');
click('consent', 'yes');
has('Was ist Ihr Hauptproblem?', 'Frauenbereich: keine Frage nach dem Geschlecht');
has('Eine Frau anfordern', 'Frauenbereich: Knopf oben');
click('human');
has('Das Personal weiß, dass Sie eine Frau wünschen', 'Frauenbereich: Anfrage');
has('Die Person wünscht eine Frau', 'Frauenbereich: Hinweis Personal');
has('Video-Dolmetscherin für', 'Frauenbereich: Dolmetscherin');
click('resume');
has('Was ist Ihr Hauptproblem?', 'Leitsymptom Deutsch');
click('staffmenu'); click('to-summary');
has('Frauenbereich</dt><dd>An', 'Frauenbereich in der Übergabe');
click('end'); click('dlg-yes');
click('toggle', 'women');
click('new-self');
click('lang', 'en');
click('langconfirm', 'yes');
click('consent', 'no');
has('That is fine. A staff member will help you.', 'Ablehnung: Patientenseite');
has('Die Person hat abgelehnt', 'Ablehnung: Hinweis Personal');
click('end-now');
has('Verständigung in jeder Sprache.', 'nach Ablehnung zurück am Start');

// ---------- 8. Gespräch: das Personal führt ----------
click('new-talk');
has('Welche Sprache spricht die Person?', 'Gespräch: Sprachwahl durch das Personal');
has('<strong>Urdu</strong>', 'Gespräch: Sprachen mit Namen für das Personal');
click('lang', 'ur');
has('class="talk"', 'Gesprächsansicht');
has('Urdu (⁨اردو⁩)', 'Gespräch: gewählte Sprache');
C.TALK.clinic.forEach(c => has(`data-act="tcat" data-val="${c.id}"`, `Gespräch: Kategorie ${c.id}`));
has('Guten Tag. Ich bin hier, um Ihnen zu helfen.', 'Gespräch: Satz in der Sprache des Personals');
has(escHtml(C.P.t_hello.ur || C.P.t_hello.en), 'Gespräch: Satz in der Sprache der Person');
has('Diagnose, Einwilligung und schlechte Nachrichten: immer mit Dolmetscher.', 'Gespräch: Regel sichtbar');
click('tplay', 't_hello');
has('✓ gesagt', 'abgespielter Satz wird vermerkt');
click('tplay', 't_hello');
ok((html().match(/✓ gesagt/g) || []).length === 1, 'zweites Abspielen erzeugt keinen zweiten Eintrag');
click('tcat', 'complaint');
has('Haben Sie Schmerzen?', 'Kategorie Beschwerden');
click('tans', 't_pain_q|yes');
has('class="chipbtn c-yes on" data-act="tans" data-val="t_pain_q|yes"', 'Antwort Ja markiert');
has('In diesem Gespräch erfasst', 'Protokoll im Gespräch');
click('tans', 't_pain_q|no');
has('class="chipbtn c-no on" data-act="tans" data-val="t_pain_q|no"', 'Antwort lässt sich ändern');
click('tans', 't_dizzy_q|unclear');
has('class="chipbtn c-unclear on" data-act="tans" data-val="t_dizzy_q|unclear"', 'Antwort Unklar');
// Zeige-Ansicht: Körperkarte und Zahlenskala
click('tshow', 'q_where');
has('data-val="reg_chest"', 'Zeige-Ansicht: Körperkarte');
has('Zurück zu den Sätzen', 'Zeige-Ansicht: zurück für das Personal');
has('<div class="staffbox" dir="ltr" lang="de">', 'Hinweis für das Personal auf der Patientenseite: eigene Sprache und Schreibrichtung');
has('class="screen patient v-tshow" dir="rtl" lang="ur"', 'Zeige-Ansicht: Seite in der Schreibrichtung der Person');
click('sel', 'reg_head');
click('sel', 'reg_chest');
click('tshow-body');
has('<span class="chip">Kopf, Brust</span>', 'Körperstellen im Gespräch erfasst');
click('tshow', 'q_pain');
has('class="scale"', 'Zeige-Ansicht: Zahlenskala');
click('tshow-ans', 8);
has('<span class="chip">8 / 10</span>', 'Schmerzwert im Gespräch erfasst');
click('tshow', 'q_breath');
has(escHtml(C.P.q_breath.ur), 'Zeige-Ansicht: Frage groß in der Sprache der Person');
has('class="ans a-yes" data-act="tshow-ans"', 'Zeige-Ansicht: großer Ja-Knopf');
click('tshow-ans', 'yes');
has('class="chipbtn c-yes on" data-act="tans" data-val="q_breath|yes"', 'Antwort aus der Zeige-Ansicht erfasst');
// Sicherheitsfragen: Rückbestätigung
click('tcat', 'safety');
click('tans', 'q_allergy|yes');
has('Rückbestätigung', 'Sicherheitsfrage im Gespräch: Rückbestätigung');
has(escHtml(C.P.confirm_q.ur.replace('{answer}', C.P.yes.ur)), 'Rückbestätigung in der Sprache der Person');
click('tconf', 'yes');
has('class="chipbtn c-yes on" data-act="tans" data-val="q_allergy|yes"', 'bestätigte Sicherheitsantwort');
has('✓ von der Person bestätigt', 'Bestätigung vermerkt');
click('tans', 'q_meds|yes');
click('tconf', 'no');
has('data-val="q_meds|yes" aria-pressed="true"', 'nicht bestätigt: Die Antwort bleibt stehen');
has('⚠ NICHT bestätigt, mit Dolmetscher klären', 'nicht bestätigte Antwort im Gespräch ist gekennzeichnet');
// Eine offene Rückbestätigung geht nicht verloren, wenn das Personal weitertippt (Review-Fund 2)
click('tans', 'q_fasting|yes');
has('Rückbestätigung', 'Fasten: Rückbestätigung offen');
click('tcat', 'heat');
click('tcat', 'safety');
has('data-val="q_fasting|yes" aria-pressed="true"', 'offene Rückbestätigung bleibt beim Wechsel der Kategorie erhalten');
ok((html().match(/⚠ NICHT bestätigt/g) || []).length >= 2, 'offene Rückbestätigung gilt als nicht bestätigt');
has('data-val="q_preg|yes"', 'ohne Angabe zum Geschlecht: Frage nach Schwangerschaft sichtbar');
// Rückbestätigung über die Zeige-Ansicht
click('tshow', 'q_fasting');
click('tshow-ans', 'no');
has(escHtml(C.P.confirm_q.ur.replace('{answer}', C.P.no.ur)), 'Zeige-Ansicht: Rückbestätigung für die Person');
click('tshow-conf', 'yes');
has('class="chipbtn c-no on" data-act="tans" data-val="q_fasting|no"', 'Fasten im Gespräch bestätigt');
// Mann: Frauen-Kategorie und Schwangerschaft entfallen
click('tsex', 'm');
hasNot('data-act="tcat" data-val="women"', 'Mann: keine Kategorie Frauen');
hasNot('data-val="q_preg|yes"', 'Mann: keine Frage nach Schwangerschaft');
click('tsex', 'f');
has('data-act="tcat" data-val="women"', 'Frau: Kategorie Frauen');
click('tcat', 'heat');
has('Ich kühle Sie jetzt mit Wasser.', 'Kategorie Hitze');
click('tplay', 't_cool');
click('human-staff');
has('Video-Dolmetscherin für Urdu (⁨اردو⁩) rufen (simuliert)', 'Dolmetscher aus dem Gespräch rufen');
click('resume');
has('class="talk"', 'zurück im Gespräch');
// Übergabe aus dem Gespräch
click('go', 'vitals');
type('data-vital', 'temp', '39.6');
click('to-summary');
has('Erfasst über</dt><dd>Gespräch durch das Personal', 'Übergabe: nur Gespräch');
has('Gespräch (vom Personal geführt)', 'Übergabe: Gesprächsabschnitt');
has('Haben Sie Schmerzen?</dt><dd>Nein', 'Übergabe: Frage und Antwort aus dem Gespräch');
has('Ist Ihnen schwindelig?</dt><dd>Unklar', 'Übergabe: unklare Antwort');
has('<li>Ist Ihnen schwindelig? Unklar</li>', 'offene Punkte: unklare Antwort aus dem Gespräch');
has('<li>Nehmen Sie jeden Tag Medikamente? NICHT bestätigt, mit Dolmetscher klären</li>', 'offene Punkte: nicht bestätigte Antwort aus dem Gespräch');
has('<li>Es fehlen Pflichtwerte: Puls (pro Minute), Blutdruck systolisch (mmHg), Sauerstoffsättigung (%)</li>', 'offene Punkte: fehlende Pflichtwerte');
has('Wo ist es? Tippen Sie im Bild auf die Stelle am Körper.</dt><dd>Kopf, Brust', 'Übergabe: Körperstellen');
has('Haben Sie eine Allergie?</dt><dd>Ja <span class="okmark">', 'Übergabe: bestätigte Sicherheitsantwort aus dem Gespräch');
has('Nehmen Sie jeden Tag Medikamente?</dt><dd>Ja <span class="warnmark">', 'Übergabe: nicht bestätigte Antwort aus dem Gespräch');
has('Abgespielte Sätze</dt><dd>Guten Tag. Ich bin hier, um Ihnen zu helfen. · Ich kühle Sie jetzt mit Wasser.', 'Übergabe: abgespielte Sätze');
hasNot('<h2>Antworten</h2>', 'Übergabe ohne Selbstauskunft: kein leerer Abschnitt');
qr = qrData(html());
if (qr.data) {
  ok(qr.data.m.join() === 'talk', 'QR: Betriebsart Gespräch');
  ok(qr.data.tk.some(e => e[0] === 'q_allergy' && e[1] === 'yes' && e[2] === 1), 'QR: bestätigte Antwort aus dem Gespräch');
  ok(qr.data.tk.some(e => e[0] === 'q_meds' && e[2] === 0), 'QR: nicht bestätigte Antwort aus dem Gespräch');
  ok(!qr.data.tk.some(e => e[1] === 'said'), 'QR: abgespielte Sätze stehen nicht im Code');
}
// derselbe Fall: Selbstauskunft nachholen
click('to-talk');
has('data-act="talk-self"', 'Gespräch: Selbstauskunft im selben Fall starten');
click('talk-self');
has(escHtml(C.P.consent_title.ur), 'Selbstauskunft startet in der gewählten Sprache mit der Einwilligung');
click('consent', 'yes');
has(escHtml(C.P.q_main.ur_f || C.P.q_main.ur), 'Geschlecht ist aus dem Gespräch bekannt');
click('sym', 'sym_heat');
click('sym-done');
click('staffmenu');
click('to-summary');
has('Erfasst über</dt><dd>Selbstauskunft + Gespräch durch das Personal', 'Übergabe: beide Betriebsarten in einem Fall');
click('end'); click('dlg-yes');
stats = JSON.parse(store['sila.stats']);
ok(stats.mode.talk === 1 && stats.lang.ur >= 1, 'Zähler: Gespräch gezählt');

// ---------- 9. Helfer im Feld ----------
click('new-field');
click('lang', 'id');
has('Satzbuch für Helfer. Es werden keine Falldaten gespeichert.', 'Helfer: Hinweis');
C.TALK.field.forEach(c => has(`data-act="tcat" data-val="${c.id}"`, `Helfer: Kategorie ${c.id}`));
hasNot('data-act="tcat" data-val="safety"', 'Helfer: keine medizinischen Sicherheitsfragen');
hasNot('data-val="vitals"', 'Helfer: keine Vitalzeichen');
click('tans', 'f_help_q|yes');
click('tcat', 'calm');
has('Bei Fragen zu Ihren Riten wenden Sie sich bitte an die religiöse Beratung.', 'Helfer: Verweis bei Fragen zu Riten');
click('end-field');
has('Verständigung in jeder Sprache.', 'Helfer: Beenden führt zum Start');
stats = JSON.parse(store['sila.stats']);
ok(stats.mode.field === 1 && stats.lang.id === 1, 'Zähler: Helfer gezählt');

// ---------- 10. Aushang, Einlesen vom Handy ----------
click('go', 'poster');
has('?self=1', 'Aushang: Adresse der Selbstauskunft');
has(escHtml(C.P.poster_scan.de), 'Aushang: Text auf Deutsch');
has('<div class="poster-line" lang="de" dir="ltr"><b>Deutsch</b>', 'Aushang: Eigenname der Sprache vor dem Text');
ok((html().match(/class="poster-line"/g) || []).length === C.LANGS.filter(l => C.P.poster_scan[l.code]).length, 'Aushang: eine Zeile je Sprache mit eigenem Text');
has('Der Code funktioniert nur, wenn die App über eine Internetadresse', 'Aushang: Hinweis bei lokaler Datei');
click('go', 'home');
click('go', 'scan');
has('Dieser Browser kann keine Codes mit der Kamera lesen', 'Einlesen: Hinweis ohne Kamera-Scan');
A.scanText = 'kein Code';
click('scan-load');
has('Das ist kein gültiger Sila-Code.', 'Einlesen: ungültiger Inhalt wird abgelehnt');
A.scanText = selfCode;
click('scan-load');
has('Selbstauskunft vom Handy übernommen.', 'Einlesen: Hinweis nach der Übernahme');
click('to-summary');
has('Erfasst über</dt><dd>Selbstauskunft auf dem eigenen Handy, per Code eingelesen', 'Einlesen: Betriebsart in der Übergabe');
has('Schmerz oder Druck in der Brust, Zu viel Hitze oder Sonne', 'Einlesen: Leitsymptome übernommen');
has('7 / 10', 'Einlesen: Antworten übernommen');
has('Fastet heute</dt><dd>Ja <span class="okmark">', 'Einlesen: Sicherheitsantworten mit Bestätigung übernommen');
has('NICHT bestätigt, mit Dolmetscher klären', 'Einlesen: nicht bestätigte Antwort bleibt gekennzeichnet');
has('Temperatur (°C)</dt><dd><span class="warnmark">fehlt', 'Einlesen: Vitalzeichen misst das Personal');
click('end'); click('dlg-yes');
// fremder Inhalt wird nicht als HTML ausgegeben
click('go', 'scan');
A.scanText = JSON.stringify({ v: 1, app: 'sila-x', l: 'en', ui: 'en', c: ['pain', '<img src=x>'], a: { onset: '<script>alert(1)</script>', other: { t: '<b>x</b>', tr: '<i>y</i>', ok: 1 }, pain: 5 }, s: { allergy: ['<svg onload=1>', 1] } });
click('scan-load');
click('to-summary');
ok(!/<script>alert|<img src=x>|<b>x<\/b>|<i>y<\/i>|<svg onload/.test(html()), 'Einlesen: fremder Inhalt wird maskiert');
has('&lt;b&gt;x&lt;/b&gt;', 'Einlesen: freie Angabe maskiert angezeigt');
hasNot('alert(1)', 'Einlesen: unbekannter Antwortwert wird verworfen, nicht angezeigt');
has('Allergie</dt><dd><span class="muted">nicht gefragt</span>', 'Einlesen: ungültige Sicherheitsantwort gilt als nicht gefragt');
click('end'); click('dlg-yes');
// Werte müssen zur Frage passen; geerbte Namen wie „constructor" sind keine Sprache (Review-Fund 9)
click('go', 'scan');
for (const bad of ['constructor', '__proto__', 'toString', 'xx']) {
  A.scanText = JSON.stringify({ v: 1, app: 'sila-x', l: bad });
  click('scan-load');
  has('Das ist kein gültiger Sila-Code.', `Einlesen: Sprache „${bad}" wird abgelehnt`);
}
A.scanText = JSON.stringify({ v: 1, app: 'sila-x', l: 'en', ui: 'constructor', x: 'q', id: '<b>', c: ['pain', 'constructor'], a: { onset: 'end_case', pain: 99999, breath: 'cd_none', constructor: 'yes', where: ['reg_head', 'evil'] }, s: { allergy: ['cd_none', 1], meal: ['ml_2', 1], toString: ['yes', 1] } });
click('scan-load');
click('to-summary');
hasNot('Fall beenden und Daten löschen</dd>', 'Einlesen: fremde Phrasen-ID wird nicht als Antwort angezeigt');
hasNot('99999', 'Einlesen: Schmerzwert außerhalb von 0 bis 10 wird verworfen');
hasNot('Keine davon', 'Einlesen: Antwort, die nicht zur Frage gehört, wird verworfen');
has('Letzte Mahlzeit</dt><dd>Vor weniger als 2 Stunden', 'Einlesen: gültige Antwort wird übernommen');
hasNot('function', 'Einlesen: keine geerbten Namen in der Ausgabe');
hasNot('&lt;b&gt;</span>', 'Einlesen: ungültiger Fallcode wird ersetzt');
click('end'); click('dlg-yes');
ok(!/constructor|function/.test(store['sila.stats']), 'Zähler bleibt nach fremden Codes sauber');
// Beispielcode und Beispielfall
click('go', 'scan');
click('scan-sample');
has('Selbstauskunft vom Handy übernommen.', 'Beispielcode lässt sich einlesen');
click('end'); click('dlg-yes');
click('sample');
has('Erfasst über</dt><dd>Selbstauskunft + Gespräch durch das Personal', 'Beispielfall: beide Betriebsarten');
has('Fastet heute</dt><dd>Ja', 'Beispielfall: Fasten');
has('39.4', 'Beispielfall: Vitalzeichen');
click('end'); click('dlg-yes');
click('go', 'about');
has('Was Sila für Hajj und Umrah mitbringt', 'Über Sila');
has('Grenzen dieser Demo', 'Über Sila: Grenzen');
click('go', 'home');

// ---------- 11. Arabisch für das Personal ----------
if (C.S.summary_title.ar) {
  click('staffLang', 'ar');
  has('dir="rtl" lang="ar"', 'Arabisch: Startseite von rechts nach links');
  has(escHtml(C.S.home_title.ar), 'Arabisch: Startseite');
  click('sample');
  has(escHtml(C.S.summary_title.ar), 'Arabisch: Übergabe');
  has(escHtml(C.S.lbl_fasting.ar), 'Arabisch: Beschriftungen in der Übergabe');
  has(escHtml(C.P.sym_heat.ar), 'Arabisch: Leitsymptom in der Übergabe');
  click('end'); click('dlg-yes');
  Object.keys(C.S).forEach(k => ok(typeof C.S[k].ar === 'string' && C.S[k].ar.length > 0, `S.${k} ohne arabischen Text`));
  click('staffLang', 'de');
} else if (STRICT) ok(false, 'Arabisch für das Personal fehlt (Block S in lang/ar.js)');

// ---------- 12. Eigenes Handy der Person (?self=1) ----------
const O = boot({ search: '?self=1' });
O.has('class="langwords"', 'eigenes Handy: startet mit der Sprachwahl');
O.hasNot('data-act="staffmenu"', 'eigenes Handy: kein Knopf für das Personal');
O.click('lang', 'en');
O.click('langconfirm', 'yes');
O.has('You answer short questions in your language on your own phone.', 'eigenes Handy: eigener Einwilligungstext');
O.click('consent', 'yes');
O.click('sex', 'm');
O.click('human');
O.has('Please go to the staff and show them this screen.', 'eigenes Handy: Hilfe heißt zum Personal gehen');
O.has('This person needs help in: English', 'eigenes Handy: Hinweis für das Personal auf Englisch');
O.click('resume');
O.click('sym', 'sym_fever');
O.click('sym-done');
['on_days', 'yes', 'no', 'yes'].forEach(v => O.click('ans', v));
O.click('ans', 'no'); O.click('confirm', 'yes');
O.click('ans', 'no'); O.click('confirm', 'yes');
O.click('sel', 'cd_none'); O.click('sel-done'); O.click('confirm', 'yes');
O.click('ans', 'no'); O.click('confirm', 'yes');
O.click('ans', 'ml_more'); O.click('confirm', 'yes');
O.click('ans', 'no');
O.has('Thank you. Please show this code to the staff.', 'eigenes Handy: Ergebnis als Code');
O.has('<svg version="1.1"', 'eigenes Handy: QR-Code');
O.has('class="casecode"', 'eigenes Handy: Fallcode unter dem QR-Code');
O.hasNot('Please give the tablet back', 'eigenes Handy: kein Hinweis auf ein Tablet');
ok(Object.keys(O.store).length === 0, 'eigenes Handy: nichts im Browser-Speicher');
// eigenes Handy: ohne gewählte Sprache keine Sprachangabe; kein Sprechmodus, also kein Ton an den Browser-Anbieter
const O2 = boot({ search: '?self=1' });
O2.click('human');
O2.hasNot('This person needs help in', 'eigenes Handy: ohne Sprachwahl keine Sprachangabe für das Personal');
O2.click('resume');
O2.click('lang', 'en'); O2.click('langconfirm', 'yes'); O2.click('consent', 'yes'); O2.click('sex', 'f');
O2.click('sym', 'sym_other'); O2.click('sym-done');
O2.click('sel', 'sym_other2'); O2.click('sel-done');
O2.hasNot('data-act="mic"', 'eigenes Handy: kein Mikrofon');
O2.has('Are you allergic to anything?', 'eigenes Handy: „Noch etwas anderes" geht ohne Sprechmodus weiter');

// ---------- 13. Sprache ohne Übersetzung ----------
const M = boot({ skipLangs: ['ur'] });
M.click('new-self');
M.click('lang', 'ur');
M.has('Für Urdu (⁨اردو⁩) gibt es noch keine Übersetzung', 'ohne Sprachdatei: Hinweis für das Personal');
M.click('go', 'langconfirm');
M.has('Your language: اردو. Is that right?', 'ohne Sprachdatei: weiter auf Englisch');
M.click('staffmenu'); M.click('end'); M.click('dlg-yes');
M.click('new-talk');
M.click('lang', 'ur');
M.has('nur Englisch', 'ohne Sprachdatei: Hinweis im Gespräch, dass englische Sätze abgespielt werden');

// ---------- 15. Funde aus dem unabhängigen Review vom 14.11.2026 ----------
// Fund 6: „Person anfordern" ohne gewählte Sprache
click('new-self');
click('human');
has('Sprache noch nicht gewählt.', 'ohne Sprachwahl: keine erfundene Sprache für das Personal');
hasNot('data-act="interp"', 'ohne Sprachwahl: kein Dolmetscher-Knopf');
click('resume');
has('class="langwords"', 'zurück zur Sprachwahl');
click('lang', 'de'); click('langconfirm', 'yes'); click('consent', 'yes'); click('sex', 'm');
click('sym', 'sym_pain'); click('sym-done');
click('sel', 'reg_head');
// Fund 1: Person anfordern, dann Menü, dann zurück: keine Schleife, und die Auswahl bleibt
click('human');
click('staffmenu');
click('menu-back');
has('Das Personal ist informiert', 'Menü: zurück führt auf die Warteseite');
click('resume');
has('Wo ist es?', 'Warteseite: zurück führt zur Frage, nicht wieder auf die Warteseite');
has('data-val="reg_head" role="button" tabindex="0" aria-pressed="true"', 'Auswahl bleibt nach „Person anfordern" erhalten');
click('sel-done');
click('ans', 'on_today');
click('ans', 5);
click('ans', 'yes');
has('Ihre Antwort: Ja. Stimmt das?', 'Allergie: Rückbestätigung');
// Fund 3: Übergabe mitten in der Rückbestätigung zeigt die offene Antwort und was nicht gefragt wurde
click('staffmenu');
click('to-summary');
has('class="casecode"', 'Übergabe: Fallcode');
has('Allergie</dt><dd>Ja <span class="warnmark">⚠ NICHT bestätigt', 'Übergabe: offene Sicherheitsantwort erscheint als nicht bestätigt');
has('Dauermedikation</dt><dd><span class="muted">nicht gefragt</span>', 'Übergabe: nicht gestellte Sicherheitsfrage erscheint');
has('<li>Allergie: NICHT bestätigt, mit Dolmetscher klären</li>', 'offene Punkte: offene Sicherheitsantwort');
has('<li>Nicht gefragt: Dauermedikation, Vorerkrankungen, Fastet heute, Letzte Mahlzeit</li>', 'offene Punkte: nicht gestellte Sicherheitsfragen');
hasNot('wiederholt und bestätigt.', 'Übergabe behauptet nicht pauschal, alles sei bestätigt');
// Fund 7: Zurück aus der Rückbestätigung und noch einmal Zurück; Versuche lassen sich nicht zurücksetzen
click('staffmenu');
click('talk-self');
has('Ihre Antwort: Ja. Stimmt das?', 'Menü: zurück in die offene Rückbestätigung');
click('back');
has('Haben Sie eine Allergie?', 'Zurück aus der Rückbestätigung');
click('back');
has('Wie stark ist der Schmerz?', 'zweites Zurück führt zur vorigen Frage');
click('ans', 5);
click('ans', 'yes'); click('confirm', 'no');
has('Haben Sie eine Allergie?', 'erstes Nein: Frage noch einmal');
click('back');
click('ans', 5);
click('ans', 'yes'); click('confirm', 'no');
has('Wogegen sind Sie allergisch?', 'zweites Nein zählt trotz Zurück: weiter mit der nächsten Frage');
// Fund 5: Die Angabe der Person zum Geschlecht bleibt im Gespräch stehen
click('staffmenu');
click('to-talk');
has('class="sexfix"', 'Gespräch: Geschlecht aus der Selbstauskunft wird angezeigt');
hasNot('data-act="tsex"', 'Gespräch: Angabe der Person lässt sich nicht überschreiben');
A.raw('tsex', 'f');
click('tcat', 'safety');
hasNot('data-val="q_preg|yes"', 'Gespräch: erzwungener Wechsel des Geschlechts wird ignoriert');
// Fund 10: unterschiedliche Angaben in Selbstauskunft und Gespräch
click('tans', 'q_allergy|no');
click('tconf', 'yes');
click('to-summary');
has('<li>Allergie: unterschiedliche Angaben in Selbstauskunft und Gespräch</li>', 'offene Punkte: unterschiedliche Angaben');
has('<span class="small">(im Gespräch)</span>', 'Übergabe: Herkunft der zweiten Angabe');
has('Geschlecht (Angabe der Person)</dt><dd>Mann', 'Übergabe: Geschlecht bleibt die Angabe der Person');
click('end'); click('dlg-yes');
// Geschlecht vom Personal eingetragen
click('new-talk'); click('lang', 'tr'); click('tsex', 'f'); click('to-summary');
has('Geschlecht (vom Personal eingetragen)</dt><dd>Frau', 'Übergabe: vom Personal eingetragenes Geschlecht ist so beschriftet');
has('<li>Nicht gefragt: Allergie, Dauermedikation, Vorerkrankungen, Mögliche Schwangerschaft, Fastet heute, Letzte Mahlzeit</li>', 'Übergabe nur mit Gespräch: nicht gestellte Sicherheitsfragen');
click('end'); click('dlg-yes');
// Fund 7c: „Gruppe verloren" fordert nur einmal automatisch Hilfe an
click('new-self'); click('lang', 'de'); click('langconfirm', 'yes'); click('consent', 'yes'); click('sex', 'skip');
click('sym', 'sym_other'); click('sym-done');
click('sel', 'sym_lost'); click('sel-done');
click('info-ok');
has('Die Person hat ihre Gruppe verloren', 'Gruppe verloren: automatische Anfrage');
click('resume');
has('Haben Sie eine Allergie?', 'nach der Anfrage weiter mit der nächsten Frage');
click('back');
has('Das Personal hilft Ihnen, Ihre Gruppe zu erreichen.', 'Zurück zeigt den Hinweis noch einmal');
click('info-ok');
has('Haben Sie eine Allergie?', 'zweites OK fordert nicht noch einmal an');
click('staffmenu'); click('to-summary');
ok((html().match(/· Gruppe verloren/g) || []).length === 1, 'Gruppe verloren steht einmal in der Übergabe');
click('end'); click('dlg-yes');
// Fund 1: Helfer-Modus ohne Sackgasse
click('new-field');
click('go', 'lang');
click('human');
click('staffmenu');
has('data-act="to-talk"', 'Helfer: Menü führt zurück zum Satzbuch');
click('to-talk');
has('Welche Sprache spricht die Person?', 'Helfer: ohne Sprache zurück zur Sprachwahl');
click('lang', 'fr');
click('end-field');
// Fund 18: Beispielfälle zählen nicht; ein beschädigter Zähler legt nichts lahm
const nBefore = JSON.parse(store['sila.stats']).n;
click('sample'); click('end'); click('dlg-yes');
click('go', 'scan'); click('scan-sample'); click('end'); click('dlg-yes');
ok(JSON.parse(store['sila.stats']).n === nBefore, 'Beispielfall und Beispielcode werden nicht gezählt');
for (const broken of ['{"n":2}', '{"n":1,"lang":{"constructor":"x","de":"<b>"},"mode":{}}', 'kaputt', '[]']) {
  const B = boot({ store: { 'sila.stats': broken } });
  B.has('Verständigung in jeder Sprache.', `beschädigter Zähler (${broken.slice(0, 12)}): Startseite erscheint`);
  B.hasNot('<b><b>', 'beschädigter Zähler: kein fremdes HTML');
  B.hasNot('NaN', 'beschädigter Zähler: keine unsinnigen Werte');
  B.click('new-talk'); B.click('lang', 'de'); B.click('tans', 't_understand|yes'); B.click('to-summary'); B.click('end'); B.click('dlg-yes');
  B.has('Verständigung in jeder Sprache.', 'beschädigter Zähler: Fall lässt sich beenden');
}
// Fund 19: Jede Datei, die der Offline-Speicher vorhalten soll, gibt es; jede Sprachdatei steht in der Liste
const swSb = { self: { addEventListener() {}, location: {} } };
vm.createContext(swSb);
vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), swSb, { filename: 'sw.js' });
swSb.FILES.forEach(f => ok(f === './' || fs.existsSync(path.join(root, f)), `sw.js nennt eine Datei, die fehlt: ${f}`));
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
LANG_FILES.forEach(f => {
  ok(swSb.FILES.includes('lang/' + f), `sw.js hält lang/${f} nicht vor`);
  ok(indexHtml.includes(`src="lang/${f}"`), `index.html lädt lang/${f} nicht`);
});
ok(swSb.CACHE === 'sila-v' + C.VERSION, 'sw.js: Name des Speichers passt zur Version');

// ---------- 14. Vollständigkeit der Sprachen (nur mit --strict) ----------
if (STRICT) {
  C.LANGS.forEach(l => {
    ok(l.has, `Sprache ${l.code} ohne Texte`);
    Object.keys(C.P).forEach(k => ok(typeof C.P[k][l.code] === 'string' && C.P[k][l.code].length > 0, `P.${k} ohne Text für ${l.code}`));
  });
  ok(LANG_FILES.length === 8, 'acht Sprachdateien: ' + LANG_FILES.join(', '));
}

// ---------- 16. Schutz vor Doppeltippen und „Meine Sprache fehlt" ----------
{
  const D = boot();
  const el = (act, val) => ({ closest: () => ({ disabled: false, getAttribute: k => (k === 'data-act' ? act : val === undefined ? null : String(val)) }) });
  const tap = (act, val) => D.listeners.click({ isTrusted: true, target: el(act, val) });
  D.click('new-self');
  D.has('data-act="lang" data-val="ur"', 'Doppeltipp: Sprachwahl steht');
  // Kachel ohne Wort für Menschen, deren Sprache fehlt
  D.has('class="tile lang lang-none" data-act="human"', 'Sprachwahl: Kachel „Meine Sprache fehlt" ruft einen Menschen');
  // echter Tipp direkt nach dem Seitenwechsel: zählt nicht
  tap('lang', 'en');
  D.has('data-act="lang" data-val="ur"', 'Doppeltipp: Tipp direkt nach dem Seitenwechsel wird verworfen');
  D.hasNot('data-act="langconfirm"', 'Doppeltipp: keine Sprache gewählt');
  // nach der Sperrzeit zählt derselbe Tipp
  D.advance(1000);
  tap('lang', 'en');
  D.has('data-act="langconfirm"', 'Doppeltipp: nach der Sperrzeit zählt der Tipp');
  // Seiten des Personals haben keine Sperre: dort wird schnell hintereinander getippt
  const E = boot();
  E.listeners.click({ isTrusted: true, target: el('new-talk') });
  E.has('data-act="lang" data-val="de"', 'Doppeltipp: Startseite des Personals reagiert sofort');
  E.listeners.click({ isTrusted: true, target: el('lang', 'de') });
  E.has('data-act="tcat"', 'Doppeltipp: Sprachwahl des Personals reagiert sofort');
  // Die Kachel „Meine Sprache fehlt" führt zur Seite „Person anfordern", ohne Sprache
  const F = boot();
  F.click('new-self'); F.click('human');
  F.has('Sprache noch nicht gewählt', 'Meine Sprache fehlt: Hinweis für das Personal');
}

// ---------- 17. Stimmen des Geräts ----------
{
  // ohne Vorlese-Funktion im Browser
  const N = boot();
  N.has('keine: Dieses Gerät kann nicht vorlesen', 'Stimmen: Gerät ohne Vorlesen wird auf der Startseite genannt');
  // vier von zehn Sprachen haben eine Stimme
  const V = boot({ voices: ['de-DE', 'en-US', 'fr-FR', 'id-ID'] });
  V.has('4 von 10 Sprachen; es fehlen:', 'Stimmen: Startseite zählt die Sprachen mit Stimme');
  V.has('Urdu', 'Stimmen: fehlende Sprache steht in der Liste');
  V.click('new-talk'); V.click('lang', 'ur');
  V.has('ohne Ton', 'Stimmen: Gespräch auf Urdu zeigt „ohne Ton"');
  V.click('tplay', 't_hello');
  ok(!V.spoken, 'Stimmen: ohne Stimme wird nichts an die Sprachausgabe gegeben');
  const W = boot({ voices: ['de-DE', 'en-US', 'fr-FR', 'id-ID'] });
  W.click('new-talk'); W.click('lang', 'de');
  W.hasNot('ohne Ton', 'Stimmen: Gespräch auf Deutsch ohne Hinweis');
  W.click('tplay', 't_hello');
  ok(W.spoken === 1, 'Stimmen: mit Stimme wird vorgelesen');
  // Hinweis für das Personal auf den Seiten der Person
  const X = boot({ voices: ['de-DE'] });
  X.click('new-self'); X.click('lang', 'ur');
  X.has('Auf diesem Gerät fehlt eine Stimme für Urdu', 'Stimmen: Hinweis in der Fußzeile der Patientenseite');
  // alle Sprachen vorhanden; altes Android-Kürzel „in" zählt als Indonesisch
  const all = C.LANGS.map(l => l.bcp);
  boot({ voices: all }).has('für alle 10 Sprachen vorhanden', 'Stimmen: alle Sprachen vorhanden');
  const Y = boot({ voices: ['in_ID'] });
  Y.has('1 von 10 Sprachen', 'Stimmen: Kürzel „in" wird als Indonesisch erkannt');
  // Gerät nennt seine Stimmen nie: Lage unbekannt, vorgelesen wird trotzdem versucht
  const Z = boot({ voices: [] });
  Z.has('auf diesem Gerät nicht feststellbar', 'Stimmen: leere Liste gilt als unbekannt');
  Z.click('new-talk'); Z.click('lang', 'ur');
  Z.hasNot('ohne Ton', 'Stimmen: unbekannt ist kein „ohne Ton"');
  Z.click('tplay', 't_hello');
  ok(Z.spoken === 1, 'Stimmen: bei unbekannter Lage wird das Vorlesen versucht');
}

// ---------- 18. Eigenes Handy: Der fertige Code übersteht ein Neuladen ----------
{
  const sess = {};
  const G = boot({ search: '?self=1&demo=end', session: sess });
  G.has('class="selfqr"', 'Neuladen: Code-Seite steht');
  ok(typeof sess['sila.own'] === 'string', 'Neuladen: Code liegt im Sitzungsspeicher');
  const qr = h => (h.match(/<div class="selfqr">[\s\S]*?<\/div>/) || [''])[0];
  const code = (G.html().match(/class="casecode"[^>]*>[^<]*?([A-Z]{2}\d{2})</) || [])[1];
  ok(!!code, 'Neuladen: Fallcode auf der Code-Seite');
  // dieselbe Seite neu geladen: derselbe Code, dieselben Daten
  const H = boot({ search: '?self=1', session: sess });
  H.has('class="selfqr"', 'Neuladen: Code-Seite erscheint wieder');
  H.has(code, 'Neuladen: derselbe Fallcode');
  ok(qr(H.html()) === qr(G.html()) && qr(H.html()).length > 100, 'Neuladen: derselbe QR-Code');
  // beschädigter oder fremder Inhalt: von vorn, nichts davon erscheint
  ['{"p":"<b>x</b>","c":"XX"}', 'kein json', '{"p":"{\\"v\\":2}","c":"AB12","l":"en","s":"en"}', '{"p":"{\\"v\\":1}","c":"<i>","l":"en","s":"en"}', '{"p":"{\\"v\\":1}","c":"AB12","l":"__proto__","s":"en"}'].forEach(bad => {
    const B = boot({ search: '?self=1', session: { 'sila.own': bad } });
    B.has('data-act="lang" data-val="ur"', `Neuladen: beschädigter Speicher (${bad.slice(0, 14)}) führt zur Sprachwahl`);
    B.hasNot('<b>x</b>', 'Neuladen: kein fremdes HTML');
    B.hasNot('<i>', 'Neuladen: kein fremder Fallcode');
  });
  // das Tablet der Klinik liest diesen Speicher nie
  const K = boot({ session: sess });
  K.has('Verständigung in jeder Sprache.', 'Neuladen: Klinik-Gerät startet wie immer');
  // Klinik-Gerät schreibt nichts in den Sitzungsspeicher
  const sess2 = {};
  boot({ search: '?demo=end', session: sess2 });
  ok(Object.keys(sess2).length === 0, 'Neuladen: Klinik-Gerät speichert keinen Fall');
}

// ---------- 19. Piktogramme auf den Antwortkacheln ----------
{
  const symIcon = {};
  C.SYMPTOMS.concat(C.SYMPTOMS2).forEach(s => { symIcon[s.id] = s.icon; });
  const optIcon = o => (C.ICONS[o] ? o : (C.OPT_ICON[o] || symIcon[o] || ''));
  Object.entries(C.OPT_ICON).forEach(([o, i]) => {
    ok(label(o), `Piktogramme: Zuordnung für ${o}, das es als Antwort nicht gibt`);
    ok(C.ICONS[i], `Piktogramme: ${o} zeigt auf ${i}, das es nicht gibt`);
    ok(!C.ICONS[o], `Piktogramme: ${o} hat ein eigenes Bild und zusätzlich eine Zuordnung`);
  });
  // Zwei Namen mit derselben Zeichnung wären auf einer Seite nicht zu unterscheiden („Etwas anderes" und „Weiß nicht")
  const drawn = {};
  Object.entries(C.ICONS).forEach(([k, v]) => { ok(!drawn[v], `Piktogramme: ${k} ist dieselbe Zeichnung wie ${drawn[v]}`); drawn[v] = k; });
  // Jede Antwort hat ein Bild, und auf einer Seite kommt keines doppelt vor
  const pages = Object.entries(C.Q).filter(([, q]) => q.options).map(([qid, q]) => [`Frage ${qid}`, q.options.concat(['unknown'])]);
  pages.push(['Beschwerden', C.SYMPTOMS.map(s => s.id)]);
  pages.forEach(([name, opts]) => {
    const seen = {};
    opts.forEach(o => {
      const i = optIcon(o);
      ok(i && C.ICONS[i], `Piktogramme: ${name}, Antwort ${o} ohne Bild`);
      ok(!seen[i], `Piktogramme: ${name}, Bild ${i} doppelt (${seen[i]} und ${o})`);
      seen[i] = o;
    });
  });
  // in der App: jede Kachel trägt ihr Bild, die Rückbestätigung zeigt die Bilder der gewählten Antworten
  Object.entries(C.Q).filter(([, q]) => q.options).forEach(([qid, q]) => {
    const A = boot({ search: '?demo=q&q=' + qid });
    const tiles = A.html().match(/<button class="tile opt[^"]*"[\s\S]*?<\/button>/g) || [];
    ok(tiles.length === q.options.length + 1, `Piktogramme: ${qid} zeigt ${tiles.length} Kacheln statt ${q.options.length + 1}`);
    ok(tiles.every(t => t.includes('class="ticon')), `Piktogramme: ${qid} hat eine Kachel ohne Bild`);
  });
  const R = boot({ search: '?demo=q&q=cond&sel=cd_diab,cd_bp,gibtsnicht' });
  R.has('class="confirm-ics many"', 'Piktogramme: Rückbestätigung zeigt die Bilder mehrerer Antworten');
  ok((R.html().match(/<span class="confirm-ics many">([\s\S]*?)<\/span>/) || ['', ''])[1].split('<svg').length - 1 === 2, 'Piktogramme: Rückbestätigung zeigt genau zwei Bilder');
  R.hasNot('gibtsnicht', 'Piktogramme: unbekannte Antwort aus der Adresse wird verworfen');
  const R1 = boot({ search: '?demo=q&q=onset&sel=on_days' });
  R1.has('class="confirm-ics"', 'Piktogramme: Rückbestätigung zeigt das Bild einer einzelnen Antwort');
  // unbekannte Frage in der Adresse: die App zeigt eine gültige Frage statt abzustürzen
  boot({ search: '?demo=q&q=__proto__' }).has('data-val="on_hour"', 'Piktogramme: unbekannte Frage führt zur ersten Auswahlfrage');
}

console.log(`${checks} Prüfungen, ${failures} Fehler${STRICT ? ' (streng)' : ''}`);
process.exit(failures ? 1 : 0);
