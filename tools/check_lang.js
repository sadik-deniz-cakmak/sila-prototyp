/*
 * Sila – prüft die Entwurfsübersetzungen in lang/<code>.js gegen die Quelltexte in content.js.
 *
 * Aufruf im Ordner 05_prototyp:
 *   node tools/check_lang.js            alle Sprachdateien
 *   node tools/check_lang.js ar fa      nur diese Sprachen
 *   node tools/check_lang.js --keys     Liste aller Patientensätze (P) mit englischem und deutschem Quelltext
 *   node tools/check_lang.js --staff    dasselbe für die Oberfläche des Personals (S)
 *
 * Fehler (Exit-Code 1): fehlende oder leere Schlüssel, unbekannte Schlüssel, verlorene Platzhalter,
 * HTML-Zeichen oder Zeilenumbrüche im Text. Hinweise: Text gleich dem englischen Quelltext,
 * auffällige Länge. Die Prüfung sagt nichts über die sprachliche Qualität; die beurteilen
 * Muttersprachler und klinisches Personal.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const langDir = path.join(root, 'lang');

function loadSource() {
  const sb = {};
  sb.window = sb;
  sb.SILA_LANG = {};
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), sb, { filename: 'content.js' });
  return sb.SILA;
}
function loadPack(code) {
  const file = path.join(langDir, code + '.js');
  const sb = {};
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sb, { filename: 'lang/' + code + '.js' });
  return sb.SILA_LANG && sb.SILA_LANG[code];
}
const placeholders = t => (t.match(/\{\w+\}/g) || []).sort().join(',');

const C = loadSource();
const args = process.argv.slice(2);

if (args[0] === '--keys' || args[0] === '--staff') {
  const dict = args[0] === '--keys' ? C.P : C.S;
  for (const k of Object.keys(dict)) console.log(`${k}\n  en: ${dict[k].en}\n  de: ${dict[k].de}`);
  console.log(`\n${Object.keys(dict).length} Schlüssel`);
  process.exit(0);
}

const codes = args.length ? args : fs.readdirSync(langDir).filter(f => /^[a-z]{2}\.js$/.test(f)).map(f => f.slice(0, 2)).sort();
const STAFF = C.STAFF_LANGS.map(l => l.code).filter(c => c !== 'en' && c !== 'de');
const SAME_OK = /^(ok|\d+)$/i;
let totalErrors = 0;

for (const code of codes) {
  const errors = [];
  const notes = [];
  let pack;
  try { pack = loadPack(code); } catch (e) { errors.push('Datei lässt sich nicht laden: ' + e.message); }
  if (!errors.length && (!pack || typeof pack.P !== 'object')) errors.push('SILA_LANG.' + code + '.P fehlt');
  let done = 0;
  let fem = 0;
  if (!errors.length) {
    if (!C.LANGS.some(l => l.code === code)) errors.push('Sprache ' + code + ' steht nicht in LANGS (content.js)');
    for (const k of Object.keys(C.P)) {
      const t = pack.P[k];
      if (typeof t !== 'string' || !t.trim()) { errors.push('fehlt: ' + k); continue; }
      done++;
    }
    for (const k of Object.keys(pack.P)) {
      const [base, suffix, ...rest] = k.split('|');
      if (!C.P[base] || rest.length || (suffix !== undefined && suffix !== 'f')) { errors.push('unbekannter Schlüssel: ' + k); continue; }
      const t = pack.P[k];
      if (typeof t !== 'string' || !t.trim()) { errors.push('leer: ' + k); continue; }
      if (suffix === 'f') fem++;
      if (placeholders(t) !== placeholders(C.P[base].en)) errors.push(`Platzhalter stimmen nicht: ${k} (erwartet ${placeholders(C.P[base].en) || 'keine'})`);
      if (/[<>]/.test(t)) errors.push('HTML-Zeichen in: ' + k);
      if (/[\r\n\t]/.test(t)) errors.push('Zeilenumbruch oder Tabulator in: ' + k);
      if (t !== t.trim()) errors.push('Leerzeichen am Rand: ' + k);
      if (t === C.P[base].en && !SAME_OK.test(t)) notes.push('gleich dem englischen Quelltext: ' + k);
      if (t.length > C.P[base].en.length * 3 + 30) notes.push('auffällig lang: ' + k);
    }
    if (pack.S) {
      for (const k of Object.keys(C.S)) {
        const t = pack.S[k];
        if (typeof t !== 'string' || !t.trim()) { errors.push('S fehlt: ' + k); continue; }
        if (placeholders(t) !== placeholders(C.S[k].en)) errors.push('S Platzhalter stimmen nicht: ' + k);
        if (/[<>]/.test(t)) errors.push('S HTML-Zeichen in: ' + k);
      }
      for (const k of Object.keys(pack.S)) if (!C.S[k]) errors.push('S unbekannter Schlüssel: ' + k);
    } else if (STAFF.includes(code)) {
      notes.push('noch keine Texte für die Oberfläche des Personals (S)');
    }
  }
  totalErrors += errors.length;
  const total = Object.keys(C.P).length;
  console.log(`${code}: ${done}/${total} Phrasen, ${fem} weibliche Formen${pack && pack.S ? ', S ' + Object.keys(pack.S).length + '/' + Object.keys(C.S).length : ''}, ${errors.length} Fehler, ${notes.length} Hinweise`);
  errors.slice(0, 400).forEach(e => console.log('  FEHLER ' + e));
  notes.slice(0, 60).forEach(n => console.log('  Hinweis ' + n));
}
process.exit(totalErrors ? 1 : 0);
