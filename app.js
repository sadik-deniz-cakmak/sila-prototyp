/*
 * Sila – MVP v0.5 – Ablauf
 *
 * Eine Software, drei Wege, eine Übergabe:
 *   Selbstauskunft – die Person antwortet selbst (Tablet der Klinik oder eigenes Handy)
 *   Gespräch       – das Personal spielt feste Sätze ab, die Person antwortet mit Ja, Nein oder Zeigen
 *   Helfer im Feld – Satzbuch für Freiwillige, ohne Falldaten
 *
 * Grundsätze aus dem Konzept, hier technisch umgesetzt:
 *  - nur feste Phrasen, keine freie Maschinenübersetzung im Triage-Teil
 *  - keine Diagnose und kein Triage-Vorschlag
 *  - Sicherheitsantworten werden wiederholt und bestätigt
 *  - Falldaten nur im Arbeitsspeicher; nach „Fall beenden" gelöscht
 *    (im Browser-Speicher stehen nur Einstellungen und anonyme Zähler)
 */
(function () {
  'use strict';

  var C = window.SILA;
  var app = document.getElementById('app');
  var params = new URLSearchParams(location.search);
  // Selbstauskunft auf dem eigenen Handy der Person (Aufruf über den QR-Code des Aushangs)
  var OWN = params.get('self') === '1';

  // Nachschlagetabellen ohne geerbte Namen: Schlüssel können aus der Adresse oder aus einem
  // eingelesenen Code stammen, „constructor" oder „toString" dürfen nichts finden.
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  var LANG = Object.create(null);
  C.LANGS.forEach(function (l) { LANG[l.code] = l; });
  var SL = Object.create(null);
  C.STAFF_LANGS.forEach(function (l) { SL[l.code] = l; });
  var SYM = Object.create(null);
  C.SYMPTOMS.concat(C.SYMPTOMS2).forEach(function (s) { SYM[s.id] = s; });
  var QN = Object.create(null);
  Object.keys(C.Q).forEach(function (k) { QN[k] = C.Q[k]; });
  // Piktogramm je Phrase, für die Zeige-Ansicht im Gespräch; Sicherheitsfrage je Phrase, für die Übergabe
  var PICON = Object.create(null);
  var SAFEQ = Object.create(null);
  Object.keys(C.Q).forEach(function (k) {
    if (C.Q[k].icon) PICON[C.Q[k].text] = C.Q[k].icon;
    if (C.Q[k].safety && C.Q[k].type === 'yn') SAFEQ[C.Q[k].text] = k;
  });
  var TITEM = { clinic: Object.create(null), field: Object.create(null) };
  Object.keys(TITEM).forEach(function (p) {
    C.TALK[p].forEach(function (cat) {
      cat.items.forEach(function (item) { if (!TITEM[p][item.p]) TITEM[p][item.p] = { item: item, cat: cat }; });
    });
  });

  var VITALS = [
    { k: 'temp', l: 'vit_temp', req: true, step: '0.1', min: 30, max: 45 },
    { k: 'pulse', l: 'vit_pulse', req: true, step: '1', min: 20, max: 250 },
    { k: 'sys', l: 'vit_sys', req: true, step: '1', min: 40, max: 300 },
    { k: 'dia', l: 'vit_dia', req: false, step: '1', min: 20, max: 200 },
    { k: 'spo2', l: 'vit_spo2', req: true, step: '1', min: 50, max: 100 },
    { k: 'rr', l: 'vit_rr', req: false, step: '1', min: 4, max: 80 }
  ];

  // ---------- Einstellungen und anonyme Zähler (nur diese landen im Browser-Speicher) ----------
  function pref(k, d) {
    try { var v = window.localStorage.getItem('sila.' + k); return v === null ? d : v; } catch (e) { return d; }
  }
  function setPref(k, v) {
    try { window.localStorage.setItem('sila.' + k, v); } catch (e) { /* ohne Speicher weiter */ }
  }
  // Der Zähler steht im Browser-Speicher und kann beschädigt sein: nur eine erwartete Form gilt.
  function stats() {
    try {
      var s = JSON.parse(pref('stats', '') || 'null');
      if (!s || typeof s !== 'object' || typeof s.n !== 'number' || !s.lang || typeof s.lang !== 'object' || !s.mode || typeof s.mode !== 'object') return null;
      if (typeof s.human !== 'number') s.human = 0;
      if (typeof s.since !== 'string') s.since = '';
      return s;
    } catch (e) { return null; }
  }
  // zählt einen beendeten Fall: nur Sprache, Betriebsart und Anfragen nach einem Menschen.
  // Beispielfälle zählen nicht, und ein Fehler beim Zählen darf das Löschen nie verhindern.
  function countCase() {
    if (OWN || st.sample || !st.startedAt || !st.selLang || !LANG[st.selLang]) return;
    try {
      var s = stats() || { since: new Date().toISOString().slice(0, 10), n: 0, lang: {}, mode: {}, human: 0 };
      s.n++;
      s.lang[st.selLang] = (Number(s.lang[st.selLang]) || 0) + 1;
      usedModes().forEach(function (m) { s.mode[m] = (Number(s.mode[m]) || 0) + 1; });
      s.human += st.human.length;
      setPref('stats', JSON.stringify(s));
    } catch (e) { /* ohne Zähler weiter */ }
  }

  var persistState = 'na';

  function blank() {
    var sl = OWN ? 'en' : pref('staffLang', 'de');
    return {
      screen: 'home',
      staffLang: SL[sl] ? sl : 'de',
      women: !OWN && pref('women', '0') === '1',
      tts: pref('tts', '0') === '1',
      mode: null, sex: null, sexBy: null, code: null, sample: false,
      selLang: null, pLang: 'en', consent: null,
      symptoms: [], queue: [], qi: 0,
      answers: {}, safety: {}, tries: {}, pending: null, sel: [], hist: [], autoDone: {},
      talk: { profile: 'clinic', cat: null, log: [], pend: null, show: null },
      vitals: {}, triageCat: '', human: [], companion: null, interp: null, free: null, rec: null,
      startedAt: null, t0: 0, endedAt: null, patientDoneAt: null, imported: false,
      returnTo: null, menuFrom: null, notice: null, dialog: null, scanErr: null, events: []
    };
  }
  var st = blank();
  var current = {};
  // Zeitpunkt des letzten Seitenwechsels und Sperrzeit gegen Doppeltippen (Millisekunden)
  var shownAt = 0;
  var TAP_GUARD_MS = 350;

  // ---------- Hilfsfunktionen ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fill(t, vars) {
    if (!vars) return t;
    return t.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
  }
  // fem: weibliche Form nutzen, wenn es sie in dieser Sprache gibt
  function look(dict, id, lang, fem) {
    var e = own(dict, id) ? dict[id] : null;
    if (!e) return '[' + id + ']';
    return (fem && e[lang + '_f']) || e[lang] || e.en;
  }
  // Trennzeichen in Aufzählungen: arabisches Komma in Sprachen mit arabischer Schrift
  function sep(lang) { return lang === 'ar' || lang === 'ur' || lang === 'fa' ? '، ' : ', '; }
  function isF() { return st.sex === 'f'; }
  // Text für die Pilgerin oder den Pilger (roh / HTML-sicher)
  function tp(id, vars) { return fill(look(C.P, id, st.pLang, isF()), vars); }
  function P(id, vars) { return esc(tp(id, vars)); }
  // Text für das Personal; Antwortbeschriftungen kommen aus den Patientenphrasen
  function ts(id, vars) { return fill(C.S[id] ? look(C.S, id, st.staffLang) : look(C.P, id, st.staffLang), vars); }
  function S(id, vars) { return esc(ts(id, vars)); }
  function pdir() { return LANG[st.pLang].dir; }
  // Patiententext in einer Personal-Ansicht, mit eigener Sprache und Schreibrichtung
  // Fehlt ein Satz in der Sprache der Person, erscheint er auf Englisch und wird auch so ausgezeichnet.
  function pspan(id, cls, vars) {
    var own = C.P[id] && C.P[id][st.pLang];
    return '<span class="' + (cls || '') + '" lang="' + (own ? st.pLang : 'en') + '" dir="' + (own ? pdir() : 'ltr') + '">' + P(id, vars) + '</span>';
  }
  // Sprachname für das Personal, z. B. „Urdu (اردو)"; Eigenname in Unicode-Isolation gegen Bidi-Durcheinander
  function langStaff(L, lang) {
    lang = lang || st.staffLang;
    var label = (L.label && (L.label[lang] || L.label.en)) || L.name;
    return label === L.name ? label : label + ' (⁨' + L.name + '⁩)';
  }
  function ic(name, cls) {
    var p = C.ICONS[name];
    if (!p) return '';
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  // Piktogramm in einem getönten Feld (Kacheln)
  function tic(name, cls) { var s = ic(name); return s ? '<span class="ticon ' + (cls || '') + '">' + s + '</span>' : ''; }
  function flags(L) {
    if (!L.flags || !L.flags.length) return '';
    return '<span class="flags">' + L.flags.map(function (c) {
      return '<img class="flag" src="vendor/flags/' + c + '.svg" alt="" width="28" height="21">';
    }).join('') + '</span>';
  }
  var LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1c1c1e"/>' +
    '<circle cx="25" cy="32" r="11" fill="none" stroke="#ffffff" stroke-width="4.5"/><circle cx="39" cy="32" r="11" fill="none" stroke="#5fc4ae" stroke-width="4.5"/></svg>';
  var BRAND = '<span class="brand">' + LOGO + '<span>Sila</span><span class="brand-ar" lang="ar">صلة</span></span>';
  // Datum für das Personal, gregorianisch und nach dem Umm-al-Qura-Kalender
  function todayLine() {
    var d = new Date();
    var loc = SL[st.staffLang].loc;
    try {
      var g = new Intl.DateTimeFormat(loc + '-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      var h = new Intl.DateTimeFormat(loc + '-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      return g + ' · ' + h;
    } catch (e) { return d.toDateString(); }
  }
  function elapsed() { return st.startedAt ? Math.round(performance.now() - st.t0) : 0; }
  function log(ev, d) { if (st.startedAt) st.events.push({ t: elapsed(), ev: ev, d: d === undefined ? null : d }); }
  function mmss(ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function dur() {
    if (!st.startedAt) return null;
    return Math.round(((st.endedAt || Date.now()) - st.startedAt.getTime()) / 1000);
  }
  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function hasSelf() { return st.imported || st.consent === 'yes' || st.symptoms.length > 0; }
  // Kurzer Zufallscode je Fall, damit Ausdruck, QR-Code und Person zusammenfinden. Kein Name, keine Nummer der Person.
  function newCode() {
    var A = 'ACDEFHJKLMNPRTUVWXY', D = '2345679', c = '';
    for (var i = 0; i < 2; i++) c += A.charAt(Math.floor(Math.random() * A.length));
    for (var j = 0; j < 2; j++) c += D.charAt(Math.floor(Math.random() * D.length));
    return c;
  }
  function codeChip() { return st.code ? '<span class="casecode" dir="ltr">' + S('case_code') + ' ' + esc(st.code) + '</span>' : ''; }
  function talkAnswers() { return st.talk.log.filter(function (e) { return e.v !== 'said'; }); }
  function talkSaid() { return st.talk.log.filter(function (e) { return e.v === 'said'; }); }
  function usedModes() {
    if (st.mode === 'field') return ['field'];
    var m = [];
    if (hasSelf()) m.push(st.imported ? 'own' : 'self');
    if (st.talk.log.length) m.push('talk');
    return m;
  }

  // ---------- Bausteine ----------
  // Lautsprecher-Knopf: liest vor, ohne etwas auszuwählen.
  // val: Phrasen-ID, „@screen" (Haupttext der Seite) oder „lang:xx" (Sprachname in dieser Sprache).
  function sayBtn(val, cls) {
    return '<button class="say' + (cls ? ' ' + cls : '') + '" data-act="say" data-val="' + val + '" aria-label="' + S('say_label') + '">' + ic('speaker') + '</button>';
  }
  function withSay(inner, val, cls) {
    return '<div class="saywrap' + (cls ? ' ' + cls : '') + '">' + inner + sayBtn(val) + '</div>';
  }
  // Überschrift einer Patientenseite mit Lautsprecher daneben
  function qline(html) {
    return '<div class="qline"><h1 class="q">' + html + '</h1>' + sayBtn('@screen', 'say-q') + '</div>';
  }
  function ansBtn(cls, act, val, icon, label) {
    return withSay('<button class="ans ' + cls + '" data-act="' + act + '"' + (val !== null ? ' data-val="' + val + '"' : '') + '>' + ic(icon) + '<span>' + label + '</span></button>', val !== null && C.P[val] ? val : '@screen', 'ans-wrap');
  }
  function ynButtons(act, withUnknown) {
    var opts = withUnknown ? ['yes', 'no', 'unknown'] : ['yes', 'no'];
    return '<div class="answers yn">' + opts.map(function (o) {
      return ansBtn('a-' + o, act, o, o, P(o));
    }).join('') + '</div>';
  }
  // Piktogramm einer Antwort: eigenes Bild, zugeordnetes Bild (C.OPT_ICON) oder das des Leitsymptoms; sonst keines
  function optIcon(o) {
    if (typeof o !== 'string') return '';
    return own(C.ICONS, o) ? o : (own(C.OPT_ICON, o) ? C.OPT_ICON[o] : (SYM[o] ? SYM[o].icon : ''));
  }
  function optButtons(opts, act, multi) {
    return '<div class="grid opts">' + opts.map(function (o) {
      var on = multi && st.sel.indexOf(o) >= 0;
      return withSay('<button class="tile opt' + (on ? ' on' : '') + (o === 'unknown' ? ' a-unknown' : '') + '" data-act="' + act + '" data-val="' + o + '"' +
        (multi ? ' aria-pressed="' + on + '"' : '') + '>' + tic(optIcon(o)) + '<span>' + P(o) + '</span></button>', o);
    }).join('') + '</div>';
  }
  function doneBtn(act, enabled) {
    return '<div class="done-row"><button class="primary done" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' +
      ic('yes') + '<span>' + P('done') + '</span></button></div>';
  }
  function scale(act) {
    var b = '';
    for (var i = 0; i <= 10; i++) {
      // ab 7 ist die Fläche so dunkel, dass die Zahl weiß stehen muss (Kontrast geprüft mit uebergabe_2026-11-14/kontrast.js)
      b += '<button class="num' + (i >= 7 ? ' dark' : '') + '" style="--h:' + i + '" data-act="' + act + '" data-val="' + i + '">' + i + '</button>';
    }
    return '<div class="scale" dir="ltr">' + b + '</div>';
  }
  function bodyMap() {
    var shapes = C.BODY.map(function (r) {
      var on = st.sel.indexOf(r.id) >= 0;
      var attrs = Object.keys(r.a).map(function (k) { return k + '="' + r.a[k] + '"'; }).join(' ');
      return '<' + r.shape + ' ' + attrs + ' class="reg' + (on ? ' on' : '') + '" data-act="sel" data-val="' + r.id +
        '" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + P(r.id) + '"><title>' + P(r.id) + '</title></' + r.shape + '>';
    }).join('');
    var backOn = st.sel.indexOf('reg_back') >= 0;
    var unkOn = st.sel.indexOf('unknown') >= 0;
    var chips = st.sel.map(function (x) { return '<span class="chip">' + P(x) + sayBtn(x, 'say-mini') + '</span>'; }).join('');
    return '<div class="bodywrap" dir="ltr">' +
      '<div class="side">' + P('side_right') + '</div>' +
      '<svg class="body" viewBox="0 0 200 400">' + shapes + '</svg>' +
      '<div class="side">' + P('side_left') + '</div>' +
      '<div class="body-extra">' +
      withSay('<button class="tile opt' + (backOn ? ' on' : '') + '" data-act="sel" data-val="reg_back" aria-pressed="' + backOn + '">' + tic('back') + '<span>' + P('reg_back') + '</span></button>', 'reg_back') +
      withSay('<button class="tile opt a-unknown' + (unkOn ? ' on' : '') + '" data-act="sel" data-val="unknown" aria-pressed="' + unkOn + '">' + tic('unknown') + '<span>' + P('unknown') + '</span></button>', 'unknown') +
      '</div></div><div class="chips" dir="' + pdir() + '">' + chips + '</div>';
  }
  function kv(k, v) { return '<div class="kv"><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }
  function valStaff(id, v) {
    if (v === undefined || v === null) return '–';
    var arr = Array.isArray(v) ? v : [v];
    return arr.map(function (x) {
      if (typeof x === 'number') return String(x) + (id === 'pain' || id === 'q_pain' ? ' / 10' : '');
      if (x === 'ok') return id === 'card' ? S('card_asked') : '✓';
      if (x === 'unclear') return S('t_unclear');
      return S(x);
    }).join(sep(st.staffLang));
  }
  function mark(ok) {
    return ' <span class="' + (ok ? 'okmark' : 'warnmark') + '">' + (ok ? '✓ ' + S('confirmed') : '⚠ ' + S('not_confirmed')) + '</span>';
  }
  function row(label, ctrl, hint) {
    return '<div class="row"><div class="row-l"><strong>' + label + '</strong>' + (hint ? '<small>' + hint + '</small>' : '') + '</div><div class="row-c">' + ctrl + '</div></div>';
  }
  function toggle(key, on) {
    return '<button class="toggle' + (on ? ' on' : '') + '" data-act="toggle" data-val="' + key + '" aria-pressed="' + on + '"><span>' + S(on ? 'on' : 'off') + '</span></button>';
  }
  function modeCard(key, act, icon) {
    return '<button class="mode" data-act="' + act + '">' +
      '<span class="mode-ic">' + ic(icon) + '</span>' +
      '<span class="pill">' + S('mode_' + key + '_tag') + '</span>' +
      '<strong class="mode-t">' + S('mode_' + key + '_title') + '</strong>' +
      '<span class="mode-x">' + S('mode_' + key + '_text') + '</span>' +
      '<span class="mode-foot"><span class="mode-go"><span>' + S('start') + '</span>' + ic('arrow', 'flip') + '</span></span></button>';
  }
  function navRow(key, icon, act, val) {
    return '<button class="navrow" data-act="' + act + '"' + (val ? ' data-val="' + val + '"' : '') + '>' + tic(icon, 'sm') +
      '<span class="navrow-t"><strong>' + S('row_' + key) + '</strong><small>' + S('row_' + key + '_hint') + '</small></span>' +
      '<span class="go">' + ic('arrow', 'flip') + '</span></button>';
  }
  // icon: Name des Piktogramms, optional mit Klasse dahinter („chev flip")
  function btn(cls, act, label, icon, val) {
    var ip = icon ? icon.split(' ') : null;
    return '<button class="' + cls + '" data-act="' + act + '"' + (val ? ' data-val="' + val + '"' : '') + '>' + (ip ? ic(ip[0], ip[1]) : '') + '<span>' + label + '</span></button>';
  }
  // Hinweis für das Personal auf einer Patientenseite, in Sprache und Schreibrichtung des Personals
  function staffBox(inner, cls) {
    return '<div class="staffbox' + (cls ? ' ' + cls : '') + '" dir="' + SL[st.staffLang].dir + '" lang="' + st.staffLang + '">' + inner + '</div>';
  }
  // Selbstauskunft noch nicht abgeschlossen und nicht vom Handy eingelesen
  function selfOpen() { return !st.imported && st.patientDoneAt === null; }

  // ---------- Bildschirme ----------
  var VIEWS = {
    home: function () {
      var persist = { yes: 'persist_yes', no: 'persist_no', na: 'persist_na' }[persistState];
      var s = stats();
      var statsHtml = '<p class="note">' + S('stats_none') + '</p>';
      if (s && s.n) {
        // nur bekannte Sprachen und nur Zahlen: der Zähler kommt aus dem Browser-Speicher
        var codes = Object.keys(s.lang).filter(function (k) { return LANG[k] && Number(s.lang[k]) > 0; });
        var max = Math.max.apply(null, codes.map(function (k) { return Number(s.lang[k]); }).concat([1]));
        statsHtml = '<p class="stats-line">' + S('stats_line', { n: Number(s.n), date: s.since }) + ' · ' + S('stats_human', { n: Number(s.human) || 0 }) + '</p><div class="bars">' +
          codes.sort(function (a, b) { return s.lang[b] - s.lang[a]; }).map(function (k) {
            var n = Number(s.lang[k]);
            return '<div class="bar-row"><span>' + esc(langStaff(LANG[k])) + '</span><span class="bar-track"><i style="width:' + Math.round(n / max * 100) + '%"></i></span><b>' + n + '</b></div>';
          }).join('') + '</div>';
      }
      return {
        html: '<section class="home">' +
          '<div class="hero"><p class="hero-date">' + esc(todayLine()) + '</p><h1 class="display">' + S('home_title') + '</h1><p class="hero-sub">' + S('home_sub') + '</p></div>' +
          '<div class="modes">' + modeCard('self', 'new-self', 'person') + modeCard('talk', 'new-talk', 'speech') + modeCard('field', 'new-field', 'compass') + '</div>' +
          '<div class="home-cols"><div>' +
          '<h2 class="sec">' + S('more_title') + '</h2><div class="rows">' + navRow('poster', 'qr', 'go', 'poster') + navRow('scan', 'scan', 'go', 'scan') + navRow('sample', 'doc', 'sample') + navRow('about', 'info', 'go', 'about') + '</div>' +
          '</div><div>' +
          '<h2 class="sec">' + S('settings_title') + '</h2><div class="settings">' +
          row(S('women_mode'), toggle('women', st.women), S('women_mode_hint')) +
          row(S('tts'), toggle('tts', st.tts), S('tts_hint')) +
          row(S('voices'), voiceStatus()) +
          row(S('offline'), '<span class="status s-' + persistState + '">' + S(persist) + '</span>') +
          '</div>' +
          '<h2 class="sec">' + S('stats_title') + '</h2><div class="settings statsbox">' + statsHtml + '<p class="small">' + S('stats_hint') +
          (s && s.n ? ' <button class="linkbtn" data-act="stats-reset">' + S('stats_reset') + '</button>' : '') + '</p></div>' +
          '</div></div>' +
          '<p class="principles">' + ic('lock') + '<span>' + S('principles') + '</span></p></section>'
      };
    },

    about: function () {
      function item(n, status) {
        return '<div class="ab-item"><div><strong>' + S('ab_' + n + 't') + '</strong><p>' + S('ab_' + n + 'x') + '</p></div><span class="pill st-' + status + '">' + S('st_' + status) + '</span></div>';
      }
      function group(title, tone, items) {
        return '<div class="ab-group"><span class="pill tone-' + tone + '">' + S(title) + '</span>' + items.join('') + '</div>';
      }
      return {
        html: '<section class="about"><h1 class="display sm">' + S('row_about') + '</h1><p class="lead">' + S('ab_intro') + '</p>' +
          '<div class="ab-grid">' +
          group('ab_g1', 'mint', [item(1, 'demo'), item(2, 'demo'), item(3, 'demo'), item(4, 'demo')]) +
          group('ab_g2', 'sand', [item(5, 'demo'), item(6, 'demo'), item(7, 'demo'), item(8, 'demo'), item(9, 'sim')]) +
          group('ab_g3', 'lav', [item(10, 'demo'), item(11, 'demo'), item(12, 'demo')]) +
          '<div class="ab-group"><span class="pill tone-grey">' + S('ab_g4') + '</span><ul class="limits">' +
          [1, 2, 3, 4, 5].map(function (n) { return '<li>' + S('ab_l' + n) + '</li>'; }).join('') + '</ul></div>' +
          '</div><div class="actions">' + btn('primary', 'go', S('to_home'), null, 'home') + '</div></section>'
      };
    },

    poster: function () {
      var isFile = !/^https?:$/.test(location.protocol || '');
      var url = (location.origin || '') + (location.pathname || '') + '?self=1';
      var lines = C.LANGS.filter(function (l) { return C.P.poster_scan[l.code]; }).map(function (l) {
        return '<div class="poster-line" lang="' + l.code + '" dir="' + l.dir + '"><b>' + esc(l.name) + '</b><p>' + esc(C.P.poster_scan[l.code]) + '</p></div>';
      }).join('');
      return {
        html: '<section class="card poster"><div class="poster-top">' + BRAND + '<span class="pill tone-mint">Hajj &amp; Umrah</span></div>' +
          '<div class="poster-body"><div class="poster-qr">' + qrSvg(url) + '<div class="poster-steps">' + ic('phone') + ic('arrow', 'flip') + ic('qr') + ic('arrow', 'flip') + ic('person') + '</div></div>' +
          '<div class="poster-lines">' + lines + '</div></div></section>' +
          '<div class="staffbox noprint"><p>' + S('poster_staff_hint') + '</p>' + (isFile ? '<p class="warnmark">' + S('poster_file_note') + '</p>' : '') +
          '<div class="actions">' + btn('primary', 'print', S('print'), 'print') + '<a class="secondary" href="?self=1">' + ic('phone') + '<span>' + S('poster_try') + '</span></a>' +
          btn('secondary', 'go', S('to_home'), null, 'home') + '</div></div>'
      };
    },

    scan: function () {
      var can = ('BarcodeDetector' in window) && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      return {
        html: '<section class="card scan"><h1>' + S('row_scan') + '</h1>' +
          (can ? '<p class="lead">' + S('scan_hint') + '</p><div class="scanbox"><video id="scan-video" playsinline muted></video></div>' +
            '<div class="actions">' + btn('primary', 'scan-start', S('scan_start'), 'camera') + '</div>'
            : '<p class="note">' + S('scan_nocam') + '</p>') +
          '<textarea class="free-text" data-field="scanText" rows="4" dir="ltr" placeholder="' + S('scan_paste') + '"></textarea>' +
          (st.scanErr ? '<p class="warnmark">' + S('scan_bad') + '</p>' : '') +
          '<div class="actions">' + btn('primary', 'scan-load', S('scan_load')) + btn('secondary', 'scan-sample', S('scan_sample')) +
          btn('secondary', 'go', S('to_home'), null, 'home') + '</div></section>'
      };
    },

    // Sprachwahl durch die Person: Eigenname in eigener Schrift, Flaggen als Zusatzhilfe
    lang: function () {
      var words = C.LANGS.map(function (l) { return '<span lang="' + l.code + '" dir="' + l.dir + '">' + esc(l.word) + '</span>'; }).join('<i aria-hidden="true">·</i>');
      var tiles = C.LANGS.map(function (l) {
        return withSay('<button class="tile lang' + (l.has ? '' : ' nolang') + '" data-act="lang" data-val="' + l.code + '">' +
          '<span class="lname" dir="' + l.dir + '" lang="' + l.code + '">' + esc(l.name) + '</span>' + flags(l) + '</button>', 'lang:' + l.code);
      }).join('');
      // Wer seine Sprache nicht findet, braucht einen Menschen. Die Kachel hat kein Wort, weil die Sprache unbekannt ist.
      var none = '<button class="tile lang lang-none" data-act="human" aria-label="' + P('human_btn') + '"><span class="none-ic">' + ic('unknown') + ic('person') + '</span></button>';
      return {
        patient: true, iconHuman: true,
        html: '<div class="langhead">' + ic('globe') + '<p class="langwords" dir="ltr">' + words + '</p></div><div class="grid langs">' + tiles + none + '</div>',
        speak: look(C.P, 'lang_pick', 'en')
      };
    },

    // Sprachwahl durch das Personal (Gespräch, Helfer)
    tlang: function () {
      var tiles = C.LANGS.map(function (l) {
        return '<button class="tile tlang" data-act="lang" data-val="' + l.code + '">' + flags(l) +
          '<strong>' + esc((l.label && (l.label[st.staffLang] || l.label.en)) || l.name) + '</strong>' +
          '<span class="lname" dir="' + l.dir + '" lang="' + l.code + '">' + esc(l.name) + '</span></button>';
      }).join('');
      return {
        html: '<section class="pick"><h1 class="display sm">' + S('tlang_title') + '</h1><div class="grid tlangs">' + tiles + '</div>' +
          '<div class="hintrow"><p class="note">' + S('tlang_hint') + '</p>' + btn('secondary', 'go', S('tlang_show'), 'show', 'lang') + '</div></section>'
      };
    },

    missing: function () {
      return {
        html: '<section class="card"><p class="lead">' + S('missing_tr', { lang: langStaff(LANG[st.selLang]) }) + '</p>' +
          '<div class="actions">' + btn('primary', 'go', S('continue'), null, 'langconfirm') + '</div></section>'
      };
    },

    langconfirm: function () {
      var t = tp('lang_confirm', { lang: LANG[st.selLang].name });
      return { patient: true, back: true, html: qline(esc(t)) + ynButtons('langconfirm', false), speak: t };
    },

    consent: function () {
      var key = OWN ? 'consent_text_own' : 'consent_text';
      return {
        patient: true, back: true,
        html: qline(pspan('consent_title')) + '<p class="lead">' + P(key) + '</p>' +
          '<p class="q">' + P('consent_q') + '</p>' + ynButtons('consent', false),
        speak: tp('consent_title') + '. ' + tp(key) + ' ' + tp('consent_q')
      };
    },

    consent_no: function () {
      return {
        patient: true, noHuman: OWN,
        html: qline(pspan('consent_no')) + (OWN ? '<div class="done-row">' + btn('secondary', 'end-now', P('back')) + '</div>'
          : staffBox('<strong>' + S('for_staff') + ':</strong> ' + S('consent_refused') +
            '<div class="actions">' + btn('secondary', 'end-now', S('to_home')) + '</div>')),
        speak: tp('consent_no')
      };
    },

    // Frau oder Mann: steuert die Anrede in Sprachen mit Geschlecht und die Frage nach einer Schwangerschaft
    sex: function () {
      return {
        patient: true, back: true,
        html: qline(pspan('q_sex')) + '<div class="answers">' +
          withSay('<button class="ans a-sex" data-act="sex" data-val="f">' + ic('woman') + '<span>' + P('sex_f') + '</span></button>', 'sex_f', 'ans-wrap') +
          withSay('<button class="ans a-sex" data-act="sex" data-val="m">' + ic('man') + '<span>' + P('sex_m') + '</span></button>', 'sex_m', 'ans-wrap') +
          '</div><div class="done-row">' + btn('secondary', 'sex', P('skip'), null, 'skip') + '</div>',
        speak: tp('q_sex')
      };
    },

    main: function () {
      var tiles = C.SYMPTOMS.map(function (s) {
        var on = st.symptoms.indexOf(s.id) >= 0;
        return withSay('<button class="tile sym' + (on ? ' on' : '') + '" data-act="sym" data-val="' + s.id + '" aria-pressed="' + on + '">' +
          tic(s.icon) + '<span>' + P(s.id) + '</span></button>', s.id);
      }).join('');
      return {
        patient: true, back: true,
        html: qline(pspan('q_main')) + '<div class="grid syms">' + tiles + '</div>' + doneBtn('sym-done', st.symptoms.length > 0),
        speak: tp('q_main')
      };
    },

    q: function () {
      var qid = st.queue[st.qi];
      var q = C.Q[qid];
      // Ohne Sprechmodus in dieser Sprache sagt die Seite das auch, statt zum Mikrofon aufzufordern
      var text = q.type === 'free' && C.FREE_LANGS.indexOf(st.selLang) < 0 ? 'free_no_speech' : q.text;
      var head = (q.icon ? '<div class="qicon">' + ic(q.icon, 'xl') + '</div>' : '') + qline(pspan(text));
      var body = '';
      if (q.type === 'yn') body = ynButtons('ans', true);
      else if (q.type === 'single') body = optButtons(q.options.indexOf('unknown') >= 0 ? q.options : q.options.concat(['unknown']), 'ans', false);
      else if (q.type === 'multi' || q.type === 'board') body = optButtons(q.options.concat(['unknown']), 'sel', true) + doneBtn('sel-done', st.sel.length > 0);
      else if (q.type === 'scale') body = scale('ans') + '<div class="answers">' + ansBtn('a-unknown', 'ans', 'unknown', 'unknown', P('unknown')) + '</div>';
      else if (q.type === 'body') body = bodyMap() + doneBtn('sel-done', st.sel.length > 0);
      else if (q.type === 'info') body = '<div class="done-row">' + btn('primary done', 'info-ok', P('ok'), 'yes') + '</div>';
      else if (q.type === 'free') body = freeBody();
      return { patient: true, back: true, progress: st.qi / st.queue.length, html: head + body, speak: tp(text) };
    },

    confirm: function () {
      var p = st.pending;
      var q = C.Q[p.qid];
      var vals = Array.isArray(p.value) ? p.value : [p.value];
      var t = tp('confirm_q', { answer: vals.map(function (x) { return typeof x === 'number' ? String(x) : tp(x); }).join(sep(st.pLang)) });
      // Die Bilder der gewählten Antworten stehen noch einmal neben dem Satz, für Menschen, die nicht lesen
      var icons = vals.map(function (v) { return ic(optIcon(v), 'md'); }).join('');
      if (icons) icons = '<span class="confirm-ics' + (vals.length > 1 ? ' many' : '') + '">' + icons + '</span>';
      return {
        patient: true, back: true, progress: st.qi / st.queue.length,
        html: (q.icon ? '<div class="qicon">' + ic(q.icon, 'xl') + '</div>' : '') + '<p class="lead center">' + P(q.text) + '</p>' +
          '<div class="confirm-box">' + icons + '<h1 class="q">' + esc(t) + '</h1>' + sayBtn('@screen', 'say-q') + '</div>' + ynButtons('confirm', false),
        speak: t
      };
    },

    freeconfirm: function () {
      var F = st.free;
      var shown = F.back || F.text;
      var t = tp('free_heard') + ' ' + shown + ' ' + tp('free_ok_q');
      return {
        patient: true, back: true,
        html: '<div class="qicon">' + ic('speech', 'xl') + '</div>' + qline(pspan('free_heard')) +
          '<div class="confirm-box free-box"><p class="free-shown" dir="auto">' + esc(shown) + '</p></div>' +
          '<p class="q">' + P('free_ok_q') + '</p>' + ynButtons('freeok', false),
        speak: t
      };
    },

    end_patient: function () {
      return {
        patient: true, progress: 1,
        html: '<div class="qicon ok">' + ic('yes', 'xl') + '</div>' + qline(pspan('end_patient')) + '<p class="lead center">' + P('give_back') + '</p>' +
          staffBox('<strong>' + S('patient_done') + '</strong> ' + codeChip() + '<div class="actions">' +
            btn('primary', 'go', S('to_vitals'), 'vitals', 'vitals') + btn('secondary', 'to-talk', S('to_talk'), 'speech') + btn('secondary', 'to-summary', S('to_summary'), 'doc') + '</div>'),
        speak: tp('end_patient') + ' ' + tp('give_back')
      };
    },

    // eigenes Handy: Ergebnis als Code für das Personal
    selfcode: function () {
      return {
        patient: true, noHuman: true, progress: 1,
        html: qline(pspan('self_code_title')) + '<div class="selfqr">' + qrSvg(ownSaved ? ownSaved.p : payload()) + '</div><p class="center">' + codeChip() + '</p><p class="lead center">' + P('self_code_hint') + '</p>',
        speak: tp('self_code_title')
      };
    },

    human: function () {
      var last = st.human[st.human.length - 1] || {};
      var f = !!last.f;
      // Ohne gewählte Sprache gibt es keine Sprache zu melden und niemanden zu rufen
      var L = st.selLang ? LANG[st.selLang] : null;
      if (OWN) {
        return {
          patient: true, noHuman: true,
          html: '<div class="qicon">' + ic(f ? 'woman' : 'person', 'xl') + '</div>' + qline(pspan('own_human')) + (L ? '<div class="ownhelp">' +
            ['ar', 'en'].map(function (l) {
              return '<p lang="' + l + '" dir="' + SL[l].dir + '">' + esc(fill(look(C.S, 'own_staff_note', l), { lang: langStaff(L, l) })) + '</p>';
            }).join('') + '</div>' : '') + '<div class="done-row">' + btn('secondary', 'resume', P('back')) + '</div>',
          speak: tp('own_human')
        };
      }
      var key = f ? 'human_wait_f' : 'human_wait';
      var reason = last.r === 'free' ? S('auto_free') : last.r === 'lost' ? S('auto_lost') : last.r === 'staff' ? '' : S(f ? 'human_req_f' : 'human_req');
      var comp = st.companion === 'yes' ? ' ' + S('human_companion_yes') : st.companion === 'no' ? ' ' + S('human_companion_no') : '';
      var interp = !L ? '' : !st.interp
        ? btn('primary', 'interp', S(f ? 'call_interp_f' : 'call_interp', { lang: langStaff(L) }), f ? 'woman' : 'person')
        : '<p class="interp i-' + st.interp.status + '">' + S(st.interp.status === 'connected' ? 'interp_connected' : 'interp_connecting', { lang: langStaff(L) }) + '</p>';
      var backLabel = st.returnTo === 'talk' ? S('t_back_list') : (st.queue.length ? S('resume') : S('back'));
      return {
        patient: true, noHuman: true,
        html: '<div class="qicon">' + ic(f ? 'woman' : 'person', 'xl') + '</div>' + qline(pspan(key)) +
          staffBox('<strong>' + S('for_staff') + ':</strong> ' + reason + ' ' + (L ? S('human_lang', { lang: langStaff(L) }) : S('human_no_lang')) + comp +
            '<div class="actions">' + interp + btn('secondary', 'resume', backLabel) + '</div>', 'alert'),
        speak: tp(key)
      };
    },

    staffmenu: function () {
      var field = st.mode === 'field';
      // Das Menü merkt sich selbst, woher es kam. Das Rücksprungziel der Seite „Person anfordern" bleibt unberührt.
      var from = st.menuFrom;
      var fromStaff = !from || ['talk', 'vitals', 'summary'].indexOf(from) >= 0;
      var items = [];
      if (from) items.push(btn('primary', 'menu-back', from === 'talk' ? S('t_back_list') : (from === 'q' || from === 'confirm' || from === 'freeconfirm' ? S('resume') : S('back')), 'chev flip'));
      if (field) {
        if (from !== 'talk') items.push(btn('secondary', 'to-talk', S('t_back_list'), 'speech'));
      } else {
        if (from !== 'talk') items.push(btn('secondary', 'to-talk', S('to_talk'), 'speech'));
        if (fromStaff && selfOpen()) items.push(btn('secondary', 'talk-self', hasSelf() ? S('resume') : S('to_self'), 'person'));
        items.push(btn('secondary', 'go', S('to_vitals'), 'vitals', 'vitals'));
        items.push(btn('secondary', 'to-summary', S('to_summary'), 'doc'));
      }
      items.push(btn('danger', 'end', S('end_case'), 'trash'));
      return {
        html: '<section class="card menu-card"><h1>' + S('staff_menu') + '</h1>' +
          (st.notice ? '<p class="notice">' + ic('yes') + '<span>' + S(st.notice) + '</span></p>' : '') +
          '<div class="menu">' + items.join('') + '</div></section>'
      };
    },

    // Gespräch: das Personal spielt feste Sätze ab und tippt die Antwort der Person an
    talk: function () {
      var L = LANG[st.selLang] || LANG.en;
      var field = st.talk.profile === 'field';
      var cats = talkCats();
      var cat = cats.filter(function (c) { return c.id === st.talk.cat; })[0] || cats[0];
      var nav = cats.map(function (c) {
        var n = c.items.filter(function (i) { return tEntry(i.p); }).length;
        return '<button class="cat' + (c.id === cat.id ? ' on' : '') + '" data-act="tcat" data-val="' + c.id + '" aria-pressed="' + (c.id === cat.id) + '">' + ic(c.icon) +
          '<span>' + S(c.label) + '</span>' + (n ? '<b>' + n + '</b>' : '') + '</button>';
      }).join('');
      var cards = cat.items.filter(function (i) { return !(i.women && st.sex === 'm'); }).map(phraseCard).join('');
      var answered = talkAnswers();
      // Hat die Person ihr Geschlecht selbst angegeben, bleibt es stehen; das Personal trägt es nur ein, wenn es fehlt
      var sexSegs = st.sexBy === 'person'
        ? '<span class="sexfix" title="' + S('sum_sex') + '">' + ic(st.sex === 'f' ? 'woman' : 'man') + '<span>' + S('sex_' + st.sex) + '</span></span>'
        : '<div class="segs" role="group" aria-label="' + S('t_person') + '">' + ['f', 'm'].map(function (x) {
          return '<button class="seg' + (st.sex === x ? ' on' : '') + '" data-act="tsex" data-val="' + x + '" aria-pressed="' + (st.sex === x) + '">' + ic(x === 'f' ? 'woman' : 'man') + '<span>' + S('sex_' + x) + '</span></button>';
        }).join('') + '</div>';
      var logHtml = answered.length ? '<div class="tlog"><h2>' + S('t_log') + '</h2><dl>' + answered.map(function (e) {
        return kv(esc(look(C.P, e.id, st.staffLang)), valStaff(e.id, e.v) + (e.ok === null || e.ok === undefined ? '' : mark(e.ok)));
      }).join('') + '</dl></div>' : '';
      return {
        html: '<section class="talk">' +
          '<div class="talk-head">' +
          '<button class="langchip" data-act="go" data-val="tlang" aria-label="' + S('t_change_lang') + '">' + flags(L) + '<strong>' + esc(langStaff(L)) + '</strong>' +
          (L.draft ? '<span class="pill st-sim">' + S('draft_chip') + '</span>' : (L.has ? '' : '<span class="pill st-plan">' + S('no_tr_chip') + '</span>')) +
          (hasVoice(L.code) === false ? '<span class="pill st-plan">' + S('no_voice_chip') + '</span>' : '') + ic('chev', 'rot') + '</button>' + sexSegs + '<span class="spacer"></span>' +
          (field ? btn('tool', 'end-field', S('t_end_field')) : btn('tool tool-dark', 'to-summary', S('summary_title'), 'doc')) +
          '</div>' +
          '<div class="talk-body"><nav class="cats">' + nav +
          (field ? '' : '<div class="cat-actions">' + btn('cat act', 'human-staff', S('sum_interp'), 'person') +
            (selfOpen() ? btn('cat act', 'talk-self', S('mode_self_tag'), 'show') : '') +
            btn('cat act', 'go', S('sum_vitals'), 'vitals', 'vitals') + '</div>') +
          '</nav><div class="phrases">' + cards +
          '<p class="rule">' + ic('info') + '<span>' + S(field ? 't_field_note' : 't_human_rule') + '</span></p>' + logHtml + '</div></div></section>'
      };
    },

    // Zeige-Ansicht: ein Satz groß für die Person, mit Antwortknöpfen zum Antippen
    tshow: function () {
      var id = st.talk.show;
      var item = tItem(id);
      var icon = PICON[id] || TITEM[st.talk.profile][id].cat.icon;
      var staffBar = staffBox('<strong>' + S('for_staff') + ':</strong> ' + esc(look(C.P, id, st.staffLang)) +
        '<div class="actions">' + btn('secondary', 'tshow-back', S('t_back_list'), 'chev flip') + '</div>');
      if (st.talk.pend && st.talk.pend.id === id) {
        var t = tp('confirm_q', { answer: tp(st.talk.pend.v) });
        return {
          patient: true, noHuman: true, staffBack: true,
          html: '<div class="qicon">' + ic(icon, 'xl') + '</div><p class="lead center">' + P(id) + '</p>' +
            '<div class="confirm-box"><h1 class="q">' + esc(t) + '</h1>' + sayBtn('@screen', 'say-q') + '</div>' + ynButtons('tshow-conf', false) + staffBar,
          speak: t
        };
      }
      var body = '';
      if (item.k === 'yn') body = ynButtons('tshow-ans', false);
      else if (item.k === 'scale') body = scale('tshow-ans');
      else if (item.k === 'body') body = bodyMap() + doneBtn('tshow-body', st.sel.length > 0);
      else body = '<div class="done-row">' + btn('primary done', 'tshow-back', P('ok'), 'yes') + '</div>';
      return {
        patient: true, noHuman: true, staffBack: true,
        html: '<div class="qicon">' + ic(icon, 'xl') + '</div>' + qline(pspan(id)) + body + staffBar,
        speak: tp(id)
      };
    },

    vitals: function () {
      var f = VITALS.map(function (v) {
        var val = st.vitals[v.k] !== undefined ? esc(st.vitals[v.k]) : '';
        return '<label class="vital"><span>' + S(v.l) + (v.req ? ' *' : '') + '</span>' +
          '<input type="number" inputmode="decimal" step="' + v.step + '" min="' + v.min + '" max="' + v.max + '" data-vital="' + v.k + '" value="' + val + '"></label>';
      }).join('');
      return {
        html: '<section class="card"><h1>' + S('vitals_title') + '</h1><div class="vitals">' + f + '</div>' +
          '<p id="vit-missing" class="missing">' + missingText() + '</p><p class="note">' + S('no_category') + '</p>' +
          row(S('sum_companion'), '<div class="segs">' + ['yes', 'no', 'unknown'].map(function (o) {
            return '<button class="seg' + (st.companion === o ? ' on' : '') + '" data-act="companion-staff" data-val="' + o + '">' + S(o) + '</button>';
          }).join('') + '</div>') +
          '<div class="actions">' + btn('primary', 'to-summary', S('to_summary'), 'doc') + btn('secondary', 'to-talk', S('to_talk'), 'speech') + '</div></section>'
      };
    },

    summary: function () {
      var L = LANG[st.selLang] || LANG.en;
      var modes = usedModes().map(function (m) { return S('sum_mode_' + m); }).join(' + ');
      var head = [
        kv(S('sum_lang'), esc(langStaff(L)) + (L.has ? (L.draft ? ' · ' + S('sum_lang_draft') : '') : ' · ' + S('sum_lang_demo'))),
        kv(S('sum_mode'), modes || '–'),
        kv(S(st.sexBy === 'person' || !st.sex ? 'sum_sex' : 'sum_sex_staff'), st.sex ? S('sex_' + st.sex) : '–'),
        st.women ? kv(S('sum_women'), S('on')) : '',
        kv(S('sum_consent'), st.consent ? S(st.consent) : '–'),
        kv(S('sum_companion'), st.companion ? S(st.companion) : '–'),
        kv(S('sum_main'), st.symptoms.map(function (s) { return S(s); }).join(sep(st.staffLang)) || '–')
      ].join('');
      var asked = st.queue.filter(function (id) { return QN[id]; });
      // Offene Punkte der Verständigung: nicht gefragt, nicht bestätigt, unklar, unterschiedlich beantwortet,
      // Pflichtwert fehlt. Keine klinische Wertung und keine Reihenfolge nach Schwere.
      var open = [];
      var ans = asked.filter(function (id) { return !QN[id].safety && !QN[id].pilgrim && QN[id].type !== 'board' && st.answers[id] !== undefined; })
        .map(function (id) {
          if (QN[id].type !== 'free') return kv(S(QN[id].label), valStaff(id, st.answers[id]));
          var a = st.answers[id];
          if (a.skip) open.push(S(QN[id].label) + ': ' + S('free_skipped'));
          else if (!(a.ok && a.bk)) open.push(S(QN[id].label) + ': ' + S(a.ok ? 'free_ok_orig' : 'not_confirmed'));
          return kv(S(QN[id].label) + (a.skip ? '' : ' <span class="small">(' + S('free_mt') + ')</span>'), freeStaff(a));
        }).join('');
      // Sicherheitsangaben: Jede Frage erscheint, auch wenn sie nicht gefragt oder nicht fertig bestätigt wurde.
      // Eine Antwort aus dem Gespräch zur selben Frage steht daneben; weicht sie ab, ist das ein offener Punkt.
      var talkBy = Object.create(null);
      talkAnswers().forEach(function (e) { if (SAFEQ[e.id] && e.v !== 'unclear') talkBy[SAFEQ[e.id]] = e; });
      function safParts(id) {
        var s = st.safety[id];
        var pend = !s && st.pending && st.pending.qid === id ? st.pending : null;
        var t = talkBy[id];
        var selfVal = s ? s.value : pend ? pend.value : null;
        var parts = [];
        if (s) parts.push(valStaff(id, s.value) + mark(s.ok));
        else if (pend) parts.push(valStaff(id, pend.value) + mark(false));
        if ((s && !s.ok) || pend) open.push(S(QN[id].label) + ': ' + S('not_confirmed'));
        if (t && selfVal !== t.v) {
          parts.push(valStaff(id, t.v) + mark(t.ok === true) + ' <span class="small">(' + S('sum_in_talk') + ')</span>');
          if (selfVal !== null) open.push(S(QN[id].label) + ': ' + S('sum_conflict'));
        }
        return parts;
      }
      var notAsked = [];
      var saf = '';
      C.SAFETY.filter(function (id) { return !(QN[id].notFor && QN[id].notFor === st.sex); }).forEach(function (id) {
        var parts = safParts(id);
        if (!parts.length) { parts.push('<span class="muted">' + S('sum_not_asked') + '</span>'); notAsked.push(ts(QN[id].label)); }
        saf += kv(S(QN[id].label), parts.join('<br>'));
        // Unterfragen (Art der Allergie, Art der Medikamente) nur, wenn sie gestellt wurden
        ((QN[id].then && QN[id].then.yes) || []).forEach(function (sub) {
          var sp = safParts(sub);
          if (sp.length) saf += kv(S(QN[sub].label), sp.join('<br>'));
        });
      });
      if (notAsked.length) open.push(S('sum_open_not_asked', { list: notAsked.join(sep(st.staffLang)) }));
      var pil = asked.filter(function (id) { return QN[id].pilgrim && st.answers[id] !== undefined; }).map(function (id) {
        return kv(S(QN[id].label), valStaff(id, st.answers[id]));
      }).join('');
      var tk = talkAnswers().map(function (e) {
        return kv(esc(look(C.P, e.id, st.staffLang)), valStaff(e.id, e.v) + (e.ok === null || e.ok === undefined ? '' : mark(e.ok)));
      }).join('');
      var said = talkSaid();
      var vit = VITALS.map(function (v) {
        var x = st.vitals[v.k];
        var empty = x === undefined || x === '';
        return kv(S(v.l), empty ? (v.req ? '<span class="warnmark">' + S('missing_value') + '</span>' : '–') : esc(x));
      }).join('');
      var timeLine = st.startedAt ? hhmm(st.startedAt) + ' · ' + mmss((dur() || 0) * 1000) + ' ' + S('minutes') : '–';
      var humanLine = st.human.length ? st.human.map(function (h) {
        var why = h.r === 'free' ? ' · ' + S('lbl_free') : h.r === 'lost' ? ' · ' + S('lbl_lost') : '';
        return '+' + mmss(h.t) + (h.f ? ' ♀' : '') + why;
      }).join(', ') : S('sum_none');
      var interpLine = st.interp ? S('sum_interp_val', { t: '+' + mmss(st.interp.t) }) : S('sum_none');
      var json = payload();
      talkAnswers().forEach(function (e) {
        if (e.ok === false) open.push(esc(look(C.P, e.id, st.staffLang)) + ' ' + S('not_confirmed'));
        else if (e.v === 'unclear') open.push(esc(look(C.P, e.id, st.staffLang)) + ' ' + S('t_unclear'));
      });
      if (missingList().length) open.push(missingText());
      function sec(title, body) { return body ? '<h2>' + S(title) + '</h2><dl>' + body + '</dl>' : ''; }
      return {
        html: '<section class="card summary"><div class="sum-head"><h1>' + S('summary_title') + '</h1>' + codeChip() +
          '<span class="sum-lang" lang="' + L.code + '" dir="' + L.dir + '">' + esc(L.name) + '</span></div>' +
          (open.length ? '<div class="openbox"><strong>' + S('sum_open') + '</strong><ul>' + open.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul></div>' : '') +
          '<div class="sum-grid"><div>' +
          '<dl>' + head + '</dl>' +
          '<h2>' + S('sum_vitals') + '</h2><dl class="vit-tiles">' + vit + '</dl>' +
          sec('sum_answers', ans) + sec('sum_safety', saf) + sec('sum_pilgrim', pil) +
          sec('sum_talk', tk + (said.length ? kv(S('sum_said'), said.map(function (e) { return esc(look(C.P, e.id, st.staffLang)); }).join(' · ')) : '')) +
          '<dl class="meta">' + kv(S('sum_time'), timeLine) + kv(S('sum_human'), humanLine) + kv(S('sum_interp'), interpLine) + '</dl>' +
          '<label class="tc"><span>' + S('triage_cat') + '</span><input type="text" maxlength="20" data-field="triageCat" value="' + esc(st.triageCat) + '"></label>' +
          '</div><div class="qrcol"><div id="qr" class="qr">' + qrSvg(json) + '</div><p class="small">' + S('qr_hint') + '</p>' +
          '<details class="noprint"><summary>' + S('qr_data') + '</summary><pre id="qr-json" dir="ltr">' + esc(json) + '</pre></details></div></div>' +
          '<p class="note">' + S('sum_note') + '</p>' +
          '<div class="actions noprint">' + btn('primary', 'print', S('print'), 'print') + btn('secondary', 'go', S('to_vitals'), 'vitals', 'vitals') +
          btn('secondary', 'to-talk', S('to_talk'), 'speech') + btn('secondary', 'export', S('export_log')) + btn('danger', 'end', S('end_case'), 'trash') + '</div></section>'
      };
    }
  };

  // ---------- Ablauflogik der Selbstauskunft ----------
  function missingList() {
    return VITALS.filter(function (v) { return v.req && (st.vitals[v.k] === undefined || st.vitals[v.k] === ''); });
  }
  function missingText() {
    var m = missingList();
    if (!m.length) return S('vit_complete');
    return S('vit_missing', { list: m.map(function (v) { return ts(v.l); }).join(sep(st.staffLang)) });
  }

  function buildQueue() {
    var q = [];
    st.symptoms.forEach(function (sid) {
      SYM[sid].follow.forEach(function (id) { if (q.indexOf(id) < 0) q.push(id); });
    });
    C.SAFETY.concat(C.PILGRIM).forEach(function (id) {
      if (C.Q[id].notFor && C.Q[id].notFor === st.sex) return;
      q.push(id);
    });
    return q;
  }
  // Trägt das Personal das Geschlecht nach, während die Selbstauskunft läuft, passt sich die Frage
  // nach einer Schwangerschaft an: bei „Mann" entfällt sie, sonst steht sie vor dem Fasten.
  function syncPreg() {
    if (!st.queue.length || st.patientDoneAt !== null || st.safety.preg || (st.pending && st.pending.qid === 'preg')) return;
    var i = st.queue.indexOf('preg');
    if (st.sex === 'm') { if (i >= st.qi) st.queue.splice(i, 1); return; }
    var j = st.queue.indexOf('fasting');
    if (i < 0 && j >= st.qi) st.queue.splice(j, 0, 'preg');
  }

  function goQ() {
    st.sel = [];
    var qid = st.queue[st.qi];
    var q = QN[qid];
    // Auf dem eigenen Handy gibt es keinen Sprechmodus (kein Ton an den Browser-Anbieter): Das Anliegen
    // steht in der Übergabe als „persönlich klären".
    if (q && q.type === 'free' && OWN) { st.answers[qid] = { skip: true }; log('free', 'own-skip'); show(advance()); return; }
    if (q && q.type === 'free' && (!st.free || st.free.qid !== qid)) {
      st.free = { qid: qid, text: '', tr: null, back: null, mt: null, tries: 0, err: null, busy: false };
    }
    go('q');
  }

  // Stand vor einer Antwort merken, damit „Zurück" die letzte Antwort zurücknehmen kann
  function snap() {
    var last = st.hist.length ? JSON.parse(st.hist[st.hist.length - 1]) : null;
    if (last && last.qi === st.qi && last.queue.length === st.queue.length) return;
    st.hist.push(JSON.stringify({ queue: st.queue, qi: st.qi, answers: st.answers, safety: st.safety, tries: st.tries, symptoms: st.symptoms }));
  }
  function back() {
    log('back', st.screen);
    if (st.screen === 'confirm') { st.pending = null; goQ(); return; }
    if (st.screen === 'freeconfirm') { go('q'); return; }
    if (st.screen === 'q') {
      // Den Stand derselben Frage überspringen (er liegt oben, wenn man aus der Rückbestätigung zurückkam).
      // Die Zahl der Versuche bleibt stehen, damit „nicht bestätigt" sich nicht durch Zurück umgehen lässt.
      var h = null;
      while (st.hist.length && !h) {
        h = JSON.parse(st.hist.pop());
        if (h.qi === st.qi && h.queue.length === st.queue.length) h = null;
      }
      if (h) {
        st.queue = h.queue; st.qi = h.qi; st.answers = h.answers; st.safety = h.safety; st.symptoms = h.symptoms;
        st.pending = null; st.free = null;
        goQ();
      } else { st.queue = []; st.qi = 0; st.free = null; go('main'); }
      return;
    }
    if (st.screen === 'main') { go(st.women ? 'consent' : 'sex'); return; }
    if (st.screen === 'sex') { go('consent'); return; }
    if (st.screen === 'consent') { go('langconfirm'); return; }
    if (st.screen === 'langconfirm') { st.selLang = null; st.pLang = 'en'; go('lang'); }
  }

  // ---------- Freies Sprechen (Stufe 2 des Konzepts, hier als Demo) ----------
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function freeBody() {
    if (C.FREE_LANGS.indexOf(st.selLang) < 0) {
      return '<div class="answers">' +
        ansBtn('a-next', 'human', null, isF() ? 'woman' : 'person', P(isF() ? 'women_btn' : 'human_btn')) + '</div>' +
        '<div class="done-row">' + btn('secondary', 'free-skip', P('ok')) + '</div>';
    }
    var F = st.free;
    var on = !!st.rec;
    return '<div class="free">' +
      '<button class="mic' + (on ? ' on' : '') + '" data-act="mic">' + ic('mic') + '<span>' + P(on ? 'free_mic_stop' : 'free_mic_start') + '</span></button>' +
      (F.err ? '<p class="warnmark">' + P('free_nomic') + '</p>' : '') +
      '<textarea class="free-text" data-field="freeText" dir="auto" rows="3" placeholder="' + P('free_or_type') + '">' + esc(F.text) + '</textarea>' +
      (F.busy ? '<p class="note">' + S('free_busy') + '</p>' : '') +
      '<p class="small">' + S('free_note') + '</p></div>' +
      '<div class="done-row"><button id="free-done" class="primary done" data-act="free-done"' + (F.text.trim() ? '' : ' disabled') + '>' +
      ic('yes') + '<span>' + P('done') + '</span></button></div>';
  }
  function updateFreeDone() {
    var b = document.getElementById('free-done');
    if (b) b.disabled = !st.free.text.trim();
  }
  function micToggle() {
    if (st.rec) { try { st.rec.stop(); } catch (e) { st.rec = null; render(); } return; }
    if (!Rec) { st.free.err = 'nomic'; render(); return; }
    var r;
    try { r = new Rec(); } catch (e) { st.free.err = 'nomic'; render(); return; }
    r.lang = LANG[st.selLang].bcp;
    r.interimResults = true;
    r.continuous = true;
    var base = st.free.text ? st.free.text.replace(/\s+$/, '') + ' ' : '';
    r.onresult = function (e) {
      var s = '';
      for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      st.free.text = base + s;
      var ta = app.querySelector('.free-text');
      if (ta) ta.value = st.free.text;
      updateFreeDone();
    };
    r.onerror = function (e) { st.free.err = (e && e.error) || 'error'; };
    r.onend = function () { st.rec = null; log('mic', 'stop'); if (st.screen === 'q') render(); };
    st.rec = r;
    st.free.err = null;
    log('mic', 'start');
    try { r.start(); } catch (e) { st.rec = null; st.free.err = 'nomic'; }
    render();
  }
  // Übersetzung auf dem Gerät über die Translator-Schnittstelle von Chrome, falls vorhanden
  function translate(text, from, to) {
    try {
      var T = window.Translator;
      return T.availability({ sourceLanguage: from, targetLanguage: to }).then(function (a) {
        if (a === 'unavailable') return null;
        return T.create({ sourceLanguage: from, targetLanguage: to }).then(function (t) { return t.translate(text); });
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function freeDone() {
    if (st.rec) { try { st.rec.stop(); } catch (e) { /* schon beendet */ } st.rec = null; }
    var F = st.free;
    var text = F.text.trim();
    if (!text) return;
    var src = LANG[st.selLang].code;
    var dst = st.staffLang;
    log('free', { len: text.length });
    if (src === dst) { F.tr = text; F.back = null; F.mt = 'same'; go('freeconfirm'); return; }
    if (!('Translator' in window)) { F.tr = null; F.back = null; F.mt = 'none'; go('freeconfirm'); return; }
    F.busy = true;
    render();
    translate(text, src, dst).then(function (tr) {
      if (!tr) return [null, null];
      return translate(tr, dst, src).then(function (bk) { return [tr, bk]; });
    }).then(function (r) {
      F.busy = false;
      // Inzwischen kann die Seite gewechselt oder der Fall beendet sein: dann nichts mehr anzeigen
      if (st.free !== F || st.screen !== 'q' || st.queue[st.qi] !== F.qid) return;
      F.tr = r[0]; F.back = r[1]; F.mt = r[0] ? 'device' : 'none';
      go('freeconfirm');
    });
  }
  function freeConfirm(ok) {
    var F = st.free;
    F.tries++;
    var qid = st.queue[st.qi];
    log('free_confirm', ok);
    if (ok || F.tries >= 2) {
      snap();
      // bk: Die Person hat eine Rückübersetzung gesehen (oder Personal und Person teilen die Sprache)
      st.answers[qid] = { text: F.text.trim().slice(0, 500), tr: F.tr, mt: F.mt, ok: ok, bk: !!F.back || F.mt === 'same' };
      if (ok) next(); else requestHuman('free', advance(), true);
      return;
    }
    go('q');
  }
  function freeStaff(a) {
    if (!a || a.skip) return '<span class="warnmark">' + S('free_skipped') + '</span>';
    var parts = [];
    if (a.tr && a.mt !== 'same') parts.push(esc(a.tr) + ' <span class="small">(' + S('free_mt') + ')</span>');
    parts.push((a.mt === 'same' ? '' : S('free_orig') + ': ') + '<span dir="auto">' + esc(a.text) + '</span>' +
      (a.mt === 'none' ? ' <span class="small">(' + S('free_no_tr') + ')</span>' : ''));
    // „bestätigt" nur, wenn die Person die Rückübersetzung gesehen hat; sonst hat sie nur ihren eigenen Wortlaut bestätigt
    parts.push(a.ok && a.bk ? '<span class="okmark">✓ ' + S('confirmed') + '</span>'
      : a.ok ? '<span class="small">' + S('free_ok_orig') + '</span>'
      : '<span class="warnmark">⚠ ' + S('not_confirmed') + '</span>');
    return parts.join('<br>');
  }

  function answer(val) {
    var qid = st.queue[st.qi];
    var q = C.Q[qid];
    log('answer', { q: qid, v: val });
    snap();
    if (q.safety) { st.pending = { qid: qid, value: val }; go('confirm'); return; }
    st.answers[qid] = val;
    if (q.type === 'board') {
      // Weitere Anliegen von der zweiten Bildtafel: als Leitsymptom übernehmen, Folgefragen einreihen
      var add = [];
      (Array.isArray(val) ? val : [val]).forEach(function (sid) {
        var sym = SYM[sid];
        if (!sym) return;
        if (st.symptoms.indexOf(sid) < 0) st.symptoms.push(sid);
        sym.follow.forEach(function (id) { if (st.queue.indexOf(id) < 0 && add.indexOf(id) < 0) add.push(id); });
      });
      Array.prototype.splice.apply(st.queue, [st.qi + 1, 0].concat(add));
    }
    if (q.autoHuman && !st.autoDone[qid]) { st.autoDone[qid] = true; requestHuman(q.autoHuman, advance(), true); return; }
    next();
  }

  // fresh: Das Rücksprungziel ist eine neue Frage (automatische Anfrage), nicht die Seite, von der man kam
  function requestHuman(reason, returnTo, fresh) {
    st.returnTo = returnTo;
    st.returnFresh = !!fresh;
    st.human.push({ t: elapsed(), f: isF(), r: reason });
    log('human', { f: isF(), r: reason });
    go('human');
  }

  function confirmAnswer(ok) {
    var p = st.pending;
    st.tries[p.qid] = (st.tries[p.qid] || 0) + 1;
    log('confirm', { q: p.qid, ok: ok });
    if (ok || st.tries[p.qid] >= 2) {
      st.safety[p.qid] = { value: p.value, ok: ok, tries: st.tries[p.qid] };
      st.pending = null;
      next();
    } else {
      st.pending = null;
      goQ();
    }
  }

  // rückt zur nächsten Frage vor und gibt die nächste Seite zurück, ohne sie anzuzeigen
  function advance() {
    var qid = st.queue[st.qi];
    var q = C.Q[qid];
    var val = q.safety ? (st.safety[qid] && st.safety[qid].value) : st.answers[qid];
    if (q.then && typeof val === 'string' && q.then[val]) {
      var add = q.then[val].filter(function (id) { return st.queue.indexOf(id) < 0; });
      Array.prototype.splice.apply(st.queue, [st.qi + 1, 0].concat(add));
    }
    st.qi++;
    if (st.qi >= st.queue.length) { st.patientDoneAt = elapsed(); log('patient_done'); return OWN ? 'selfcode' : 'end_patient'; }
    return 'q';
  }
  function next() { show(advance()); }
  function show(screen) { if (screen === 'q') goQ(); else go(screen); }

  function selToggle(v) {
    var q = C.Q[st.queue[st.qi]] || {};
    var excl = (st.screen === 'q' && q.exclusive ? q.exclusive : []).concat(['unknown']);
    var i = st.sel.indexOf(v);
    if (i >= 0) { st.sel.splice(i, 1); return; }
    if (excl.indexOf(v) >= 0) st.sel = [v];
    else { st.sel = st.sel.filter(function (x) { return excl.indexOf(x) < 0; }); st.sel.push(v); }
  }

  function chooseLang(v) {
    if (!LANG[v]) return;
    st.selLang = v;
    st.pLang = LANG[v].has ? v : 'en';
    log('lang', v);
    if (st.mode === 'self') { go(LANG[v].has ? 'langconfirm' : 'missing'); return; }
    if (!st.talk.cat) st.talk.cat = talkCats()[0].id;
    go('talk');
  }

  function startCase(mode) {
    st = blank();
    st.mode = mode;
    st.startedAt = new Date();
    st.t0 = performance.now();
    st.code = newCode();
    if (st.women) { st.sex = 'f'; st.sexBy = 'staff'; }
    log('start', mode);
  }
  // ---------- Eigenes Handy: Der fertige Code übersteht ein Neuladen ----------
  // Handys räumen wartende Seiten aus dem Speicher; ohne das müsste die Person nach dem Warten alles neu
  // beantworten. Der Code liegt nur im Sitzungsspeicher dieses Fensters und verschwindet, wenn die Seite
  // geschlossen wird. Genau das sagt der Text unter dem Code.
  var ownSaved = null;
  function ownStore() { try { return window.sessionStorage || null; } catch (e) { return null; } }
  function saveOwn() {
    var s = ownStore();
    ownSaved = { p: payload(), c: st.code, l: st.pLang, s: st.selLang };
    if (s) { try { s.setItem('sila.own', JSON.stringify(ownSaved)); } catch (e) { /* ohne Speicher weiter */ } }
  }
  function clearOwn() {
    var s = ownStore();
    ownSaved = null;
    if (s) { try { s.removeItem('sila.own'); } catch (e) { /* ohne Speicher weiter */ } }
  }
  // Der Speicher kann beschädigt sein: Nur eine erwartete Form gilt, sonst beginnt die Seite neu.
  function loadOwn() {
    var s = ownStore();
    if (!s) return null;
    try {
      var o = JSON.parse(s.getItem('sila.own') || 'null');
      if (o && typeof o.p === 'string' && o.p.length < 4000 && JSON.parse(o.p).v === 1 &&
        typeof o.c === 'string' && /^[A-Z]{2}\d{2}$/.test(o.c) && own(LANG, o.l) && own(LANG, o.s)) return o;
    } catch (e) { /* beschädigt */ }
    return null;
  }
  function restoreOwn(o) {
    startCase('self');
    st.code = o.c; st.pLang = o.l; st.selLang = o.s; st.patientDoneAt = 1;
    ownSaved = o;
    go('selfcode');
  }

  function resetCase(count) {
    if (OWN) clearOwn();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (st.rec) { try { st.rec.stop(); } catch (e) { /* schon beendet */ } }
    stopScan();
    if (count) countCase();
    if (OWN) { startCase('self'); go('lang'); return; }
    st = blank();
    go('home');
  }
  function askEnd() {
    st.dialog = { text: 'end_case_confirm', yes: 'dlg_end' };
    render();
  }

  // ---------- Gespräch ----------
  function talkCats() {
    return C.TALK[st.talk.profile].filter(function (c) { return !(c.women && st.sex === 'm'); });
  }
  function tItem(id) { var x = TITEM[st.talk.profile][id]; return x ? x.item : null; }
  function tEntry(id) {
    for (var i = st.talk.log.length - 1; i >= 0; i--) if (st.talk.log[i].id === id) return st.talk.log[i];
    return null;
  }
  function tLog(id, v, ok) {
    var e = tEntry(id);
    if (e && v === 'said') { e.n++; return; }
    if (e) { e.v = v; e.ok = ok; e.t = elapsed(); e.n++; } else st.talk.log.push({ t: elapsed(), id: id, v: v, ok: ok, n: 1 });
  }
  // Antwort erfassen; Sicherheitsfragen warten auf die Rückbestätigung
  function tAnswer(id, val) {
    var item = tItem(id);
    if (!item) return false;
    tFlush(id);
    log('talk', { p: id, v: val });
    if (item.safety && val !== 'unclear') { st.talk.pend = { id: id, v: val }; return true; }
    tLog(id, val, null);
    return false;
  }
  // Eine Antwort, deren Rückbestätigung offen bleibt, geht nicht verloren: Sie gilt als nicht bestätigt.
  // exceptId: Dieselbe Frage wird gerade neu beantwortet, die alte offene Antwort entfällt.
  function tFlush(exceptId) {
    var p = st.talk.pend;
    if (!p) return;
    if (p.id !== exceptId) tLog(p.id, p.v, false);
    st.talk.pend = null;
  }
  function tConfirm(ok) {
    var p = st.talk.pend;
    if (!p) return;
    log('talk_confirm', { p: p.id, ok: ok });
    tLog(p.id, p.v, ok);
    st.talk.pend = null;
  }
  function phraseCard(item) {
    var id = item.p;
    var e = tEntry(id);
    var pend = st.talk.pend && st.talk.pend.id === id ? st.talk.pend : null;
    var act = '';
    if (pend) {
      act = '<div class="readback"><span class="rb-l">' + S('t_readback') + '</span>' +
        '<button class="ph-play sm" data-act="tplay-conf" aria-label="' + S('t_play') + '">' + ic('play') + '</button>' +
        pspan('confirm_q', 'rb-t', { answer: tp(pend.v) }) +
        '<span class="rb-b"><button class="chipbtn c-yes" data-act="tconf" data-val="yes">' + S('t_confirmed') + '</button>' +
        '<button class="chipbtn" data-act="tconf" data-val="no">' + S('t_not_confirmed') + '</button></span></div>';
    } else if (item.k === 'yn') {
      act = '<div class="ph-ans"><div class="ynseg" role="group">' + ['yes', 'no', 'unclear'].map(function (o) {
        var on = e && e.v === o;
        return '<button class="chipbtn c-' + o + (on ? ' on' : '') + '" data-act="tans" data-val="' + id + '|' + o + '" aria-pressed="' + !!on + '">' + (o === 'unclear' ? S('t_unclear') : S(o)) + '</button>';
      }).join('') + '</div>' + (e && e.ok !== null && e.ok !== undefined ? mark(e.ok) : '') + '</div>';
    } else if (e && e.v !== 'said') {
      act = '<div class="ph-ans"><span class="chip">' + valStaff(id, e.v) + '</span></div>';
    } else if (e) {
      act = '<div class="ph-ans"><span class="okmark">✓ ' + S('t_said') + '</span></div>';
    }
    return '<article class="ph' + (e ? ' done' : '') + (item.safety ? ' ph-safety' : '') + '">' +
      '<button class="ph-play" data-act="tplay" data-val="' + id + '" aria-label="' + S('t_play') + '">' + ic('play') + '</button>' +
      '<div class="ph-text"><strong>' + esc(look(C.P, id, st.staffLang)) + '</strong>' + pspan(id, 'ph-pat') + '</div>' +
      '<button class="ph-show" data-act="tshow" data-val="' + id + '" aria-label="' + S('t_show') + '" title="' + S('t_show') + '">' + ic('show') + '</button>' +
      act + '</article>';
  }

  // ---------- Übergabe: QR-Code, Einlesen, Testprotokoll ----------
  function payload() {
    var o = {
      v: 1, app: 'sila-demo-' + C.VERSION, id: st.code, l: st.selLang, ui: st.pLang, x: st.sex, xb: st.sexBy === 'person' ? 1 : 0, w: st.women ? 1 : 0, m: usedModes(),
      t: st.startedAt ? st.startedAt.toISOString().slice(0, 16) + 'Z' : null, d: dur(),
      c: st.symptoms.map(function (s) { return s.replace('sym_', ''); }),
      a: {}, s: {}, tk: [], vt: {}, h: st.human.length,
      cp: st.companion || null, i: st.interp ? 1 : 0
    };
    Object.keys(st.answers).forEach(function (k) {
      var v = st.answers[k];
      // freie Angabe kompakt: Original und Übersetzung gekürzt, Bestätigung als 1/0
      o.a[k] = v && typeof v === 'object' && !Array.isArray(v)
        ? (v.skip ? 'skip' : { t: (v.text || '').slice(0, 200), tr: v.tr ? v.tr.slice(0, 200) : null, ok: v.ok ? 1 : 0, bk: v.bk ? 1 : 0 })
        : v;
    });
    Object.keys(st.safety).forEach(function (k) { o.s[k] = [st.safety[k].value, st.safety[k].ok ? 1 : 0]; });
    talkAnswers().forEach(function (e) { o.tk.push(e.ok === null || e.ok === undefined ? [e.id, e.v] : [e.id, e.v, e.ok ? 1 : 0]); });
    Object.keys(st.vitals).forEach(function (k) { if (st.vitals[k] !== '') o.vt[k] = Number(st.vitals[k]); });
    if (st.triageCat) o.tc = st.triageCat.slice(0, 20);
    return JSON.stringify(o);
  }
  // Übernimmt eine Selbstauskunft vom Handy der Person. Der Inhalt ist fremd: Übernommen werden nur bekannte
  // Fragen mit Werten, die diese Frage zulässt. Angezeigt wird später nur über esc() und bekannte Phrasen-IDs.
  function validAnswer(q, v) {
    if (q.type === 'yn') return v === 'yes' || v === 'no' || v === 'unknown';
    if (q.type === 'scale') return v === 'unknown' || (typeof v === 'number' && v >= 0 && v <= 10 && Math.floor(v) === v);
    if (q.type === 'info') return v === 'ok';
    if (q.type === 'single') return typeof v === 'string' && (v === 'unknown' || q.options.indexOf(v) >= 0);
    if (q.type === 'multi' || q.type === 'board' || q.type === 'body') {
      var opts = q.type === 'body' ? C.BODY.map(function (r) { return r.id; }).concat(['reg_back']) : q.options;
      return Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every(function (x) { return x === 'unknown' || opts.indexOf(x) >= 0; });
    }
    return false;
  }
  function importPayload(text) {
    var o;
    try { o = JSON.parse(String(text).slice(0, 6000)); } catch (e) { return false; }
    if (!o || typeof o !== 'object' || o.v !== 1 || typeof o.app !== 'string' || o.app.indexOf('sila-') !== 0 || typeof o.l !== 'string' || !LANG[o.l]) return false;
    var a = o.a && typeof o.a === 'object' ? o.a : {};
    var s = o.s && typeof o.s === 'object' ? o.s : {};
    startCase('self');
    st.imported = true;
    st.selLang = o.l;
    st.pLang = typeof o.ui === 'string' && LANG[o.ui] && LANG[o.ui].has ? o.ui : 'en';
    if (typeof o.id === 'string' && /^[A-Z0-9]{4}$/.test(o.id)) st.code = o.id;
    if (o.x === 'f' || o.x === 'm') { st.sex = o.x; st.sexBy = o.xb ? 'person' : 'staff'; }
    st.consent = 'yes';
    st.symptoms = (Array.isArray(o.c) ? o.c : []).map(function (x) { return 'sym_' + x; }).filter(function (x) { return SYM[x]; });
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      var q = QN[k];
      if (!q || q.safety) return;
      if (q.type === 'free') {
        if (v === 'skip') st.answers[k] = { skip: true };
        else if (v && typeof v === 'object') st.answers[k] = { text: String(v.t || '').slice(0, 500), tr: v.tr ? String(v.tr).slice(0, 500) : null, mt: v.tr ? 'device' : 'none', ok: !!v.ok, bk: !!v.bk };
      } else if (validAnswer(q, v)) st.answers[k] = v;
    });
    Object.keys(s).forEach(function (k) {
      var v = s[k];
      var q = QN[k];
      if (q && q.safety && Array.isArray(v) && validAnswer(q, v[0])) st.safety[k] = { value: v[0], ok: !!v[1], tries: 1 };
    });
    st.queue = Object.keys(st.answers).concat(Object.keys(st.safety));
    st.qi = st.queue.length;
    st.patientDoneAt = 0;
    st.notice = 'scan_ok';
    st.returnTo = null;
    log('import', { l: o.l });
    return true;
  }
  function qrSvg(text) {
    try {
      var lib = window.qrcode;
      if (lib.stringToBytesFuncs && lib.stringToBytesFuncs['UTF-8']) lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
      var q = lib(0, 'M');
      q.addData(text);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 8, scalable: true, title: 'Sila QR' });
    } catch (e) {
      return '<p class="warnmark">QR: ' + esc(e && e.message ? e.message : e) + '</p>';
    }
  }
  function exportLog() {
    var data = {
      app: 'Sila v' + C.VERSION + ' (Demo)', exportedAt: new Date().toISOString(),
      startedAt: st.startedAt ? st.startedAt.toISOString() : null, durationSec: dur(),
      patientPartSec: st.patientDoneAt ? Math.round(st.patientDoneAt / 1000) : null,
      modes: usedModes(), language: st.selLang, uiLanguage: st.pLang, sex: st.sex, womenArea: st.women, consent: st.consent,
      symptoms: st.symptoms, questions: st.queue, answers: st.answers, safety: st.safety, talk: st.talk.log,
      vitals: st.vitals, triageCategoryByStaff: st.triageCat || null, humanRequests: st.human, companionCanTranslate: st.companion || null, interpreter: st.interp || null, events: st.events,
      note: 'Keine Namen, keine Audiodaten. Nur für Tests mit dem Prototyp.'
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sila-testprotokoll-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // Kamera-Scan des Ergebnis-Codes, wo der Browser es kann (BarcodeDetector)
  var scanner = { stream: null, timer: null };
  function stopScan() {
    if (scanner.timer) { clearInterval(scanner.timer); scanner.timer = null; }
    if (scanner.stream) { try { scanner.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* schon beendet */ } scanner.stream = null; }
  }
  function startScan() {
    var video = document.getElementById('scan-video');
    if (!video || scanner.stream) return;
    var det;
    try { det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (stream) {
      scanner.stream = stream;
      video.srcObject = stream;
      video.play();
      scanner.timer = setInterval(function () {
        det.detect(video).then(function (codes) {
          if (st.screen !== 'scan' || !codes || !codes.length) return;
          if (importPayload(codes[0].rawValue)) { stopScan(); go('staffmenu'); }
        }).catch(function () { /* nächster Versuch */ });
      }, 400);
    }).catch(function () { st.scanErr = true; render(); });
  }

  // ---------- Vorlesen ----------
  // Zuerst geprüfte Aufnahme (C.AUDIO[sprache][phrasen-id]), sonst Gerätestimme (nur Demo).
  // ---------- Stimmen des Geräts ----------
  // Die Demo liest mit der Stimme des Geräts vor. Fehlt die Stimme für eine Sprache, bleibt der Lautsprecher
  // stumm. Das Personal soll das sehen, bevor es sich in einer Vorführung oder bei einer Person zeigt.
  // voices: null = noch nicht bekannt, sonst die Sprachkürzel (zwei Buchstaben) der vorhandenen Stimmen.
  var voices = null;
  // Manche Geräte nennen ihre Stimmen nie. Dann bleibt die Lage unbekannt und es wird wie bisher versucht vorzulesen.
  var voicesGaveUp = false;
  function loadVoices() {
    try {
      var list = window.speechSynthesis.getVoices();
      if (!list || !list.length) return false;
      voices = Object.create(null);
      for (var i = 0; i < list.length; i++) {
        var p = String(list[i].lang || '').toLowerCase().slice(0, 2);
        voices[p === 'in' ? 'id' : p] = true;   // „in" ist das alte Kürzel mancher Android-Geräte für Indonesisch
      }
      return true;
    } catch (e) { return false; }
  }
  // true = Stimme oder Aufnahmen vorhanden, false = sicher nicht, null = noch unbekannt
  function hasVoice(code) {
    if (C.AUDIO && C.AUDIO[code]) return true;
    if (!('speechSynthesis' in window)) return false;
    if (!voices) return null;
    return !!voices[LANG[code].bcp.toLowerCase().slice(0, 2)];
  }
  function voiceStatus() {
    var known = C.LANGS.map(function (l) { return hasVoice(l.code); });
    if (known.some(function (k) { return k === null; })) return '<span class="status s-na">' + S(voicesGaveUp ? 'voices_unknown' : 'voices_wait') + '</span>';
    var missing = C.LANGS.filter(function (l, i) { return !known[i]; });
    if (!missing.length) return '<span class="status s-yes">' + S('voices_all', { n: C.LANGS.length }) + '</span>';
    if (missing.length === C.LANGS.length) return '<span class="status s-no">' + S('voices_none') + '</span>';
    return '<span class="status s-no">' + S('voices_some', {
      n: C.LANGS.length - missing.length, m: C.LANGS.length,
      list: missing.map(function (l) { return esc(langStaff(l)); }).join(sep(st.staffLang))
    }) + '</span>';
  }
  // Knopf kurz als stumm zeigen, wenn es für die Sprache keine Stimme gibt
  function markMute(el) {
    if (!el || !el.classList) return;
    el.classList.add('mute');
    setTimeout(function () { el.classList.remove('mute'); }, 1200);
  }
  function markPlaying(el, on) {
    if (el && el.classList) { if (on) el.classList.add('playing'); else el.classList.remove('playing'); }
  }
  function playRecorded(id, lang, el) {
    var src = id && C.AUDIO && C.AUDIO[lang] && C.AUDIO[lang][id];
    if (!src || typeof Audio === 'undefined') return false;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      var a = new Audio(src);
      markPlaying(el, true);
      a.onended = a.onerror = function () { markPlaying(el, false); };
      a.play();
      return true;
    } catch (e) { return false; }
  }
  function speak(text, lang, el) {
    lang = lang || st.pLang;
    if (!text || !('speechSynthesis' in window)) return;
    if (hasVoice(lang) === false) { markMute(el); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = LANG[lang].bcp;
      markPlaying(el, true);
      u.onend = u.onerror = function () { markPlaying(el, false); };
      window.speechSynthesis.speak(u);
    } catch (e) { markPlaying(el, false); }
  }
  function say(val, el) {
    if (!val) return;
    log('say', val);
    if (val === '@screen') { speak(current.speak, st.pLang, el); return; }
    if (val.indexOf('lang:') === 0) {
      var L = LANG[val.slice(5)];
      if (L && !playRecorded('lang_name', L.code, el)) speak(L.name, L.code, el);
      return;
    }
    if (!playRecorded(val, st.pLang, el)) speak(tp(val), st.pLang, el);
  }

  // ---------- Darstellung ----------
  function shell(view) {
    var sdir = SL[st.staffLang].dir;
    var top;
    if (view.patient) {
      var fem = isF();
      top = '<header class="bar bar-patient" dir="' + pdir() + '">' +
        (view.back ? '<button class="tool tool-round" data-act="back" aria-label="' + P('back') + '">' + ic('chev', 'flip') + '</button>' : '') +
        BRAND + '<span class="spacer"></span>' +
        (st.tts ? '<button class="tool tool-round" data-act="speak" aria-label="' + S('tts') + '">' + ic('speaker') + '</button>' : '') +
        (view.noHuman ? '' : '<button class="tool tool-human' + (view.iconHuman ? ' tool-round' : '') + '" data-act="human"' + (view.iconHuman ? ' aria-label="' + P('human_btn') + '"' : '') + '>' +
          ic(fem ? 'woman' : 'person') + (view.iconHuman ? '' : '<span>' + P(fem ? 'women_btn' : 'human_btn') + '</span>') + '</button>') +
        (OWN ? '' : '<button class="tool tool-staff" data-act="' + (view.staffBack ? 'tshow-back' : 'staffmenu') + '" dir="' + sdir + '">' + S('staff_btn') + '</button>') + '</header>' +
        (view.progress !== undefined ? '<div class="prog" dir="' + pdir() + '"><i style="width:' + Math.round(view.progress * 100) + '%"></i></div>' : '');
    } else {
      var segs = '<div class="segs lang-segs">' + C.STAFF_LANGS.map(function (l) {
        return '<button class="seg' + (st.staffLang === l.code ? ' on' : '') + '" data-act="staffLang" data-val="' + l.code + '" lang="' + l.code + '" aria-pressed="' + (st.staffLang === l.code) + '">' +
          '<span class="wide">' + esc(l.name) + '</span><span class="narrow">' + esc(l.short) + '</span></button>';
      }).join('') + '</div>';
      var nav = st.startedAt
        ? (st.screen === 'staffmenu' ? '' : '<button class="tool" data-act="staffmenu" aria-label="' + S('staff_menu') + '">' + ic('menu') + '<span>' + S('menu_btn') + '</span></button>')
        : (st.screen === 'home' ? '' : '<button class="tool" data-act="go" data-val="home">' + ic('home') + '<span>' + S('home_btn') + '</span></button>');
      top = '<header class="bar bar-staff" dir="' + sdir + '">' + BRAND + '<span class="tag">' + S('app_tag') + '</span><span class="spacer"></span>' + nav + segs + '</header>';
    }
    var dir = view.patient ? pdir() : sdir;
    var lang = view.patient ? st.pLang : st.staffLang;
    var draftNote = view.patient && LANG[st.pLang].draft ? ' ' + S('draft_banner', { lang: langStaff(LANG[st.pLang]) }) : '';
    if (view.patient && st.screen !== 'lang' && hasVoice(st.pLang) === false) draftNote += ' ' + S('no_voice', { lang: langStaff(LANG[st.pLang]) });
    var dialog = st.dialog ? '<div class="overlay" dir="' + sdir + '"><div class="dialog" role="alertdialog" aria-modal="true"><p>' + S(st.dialog.text) + '</p><div class="actions">' +
      btn('secondary', 'dlg-no', S('dlg_cancel')) + btn('danger solid', 'dlg-yes', S(st.dialog.yes)) + '</div></div></div>' : '';
    return '<div class="page ' + (view.patient ? 'page-patient' : 'page-staff') + '">' + top +
      '<main class="screen ' + (view.patient ? 'patient' : 'staff') + ' v-' + st.screen + '" dir="' + dir + '" lang="' + lang + '">' + view.html + '</main></div>' +
      '<footer class="demo" dir="' + sdir + '">' + S('demo_banner') + draftNote + '</footer>' + dialog;
  }

  function render() {
    var fn = VIEWS[st.screen] || VIEWS.home;
    current = fn();
    app.innerHTML = shell(current);
    document.documentElement.lang = current.patient ? st.pLang : st.staffLang;
  }

  function go(screen) {
    if (st.screen === 'scan' && screen !== 'scan') stopScan();
    // Beim Seitenwechsel: Mikrofon aus, laufendes Vorlesen aus, offene Rückbestätigung im Gespräch sichern
    if (st.rec && screen !== 'q') { try { st.rec.stop(); } catch (e) { /* schon beendet */ } st.rec = null; }
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { /* ohne Vorlesen weiter */ } }
    if (st.talk.pend && screen !== 'talk' && screen !== 'tshow') tFlush();
    if (screen !== 'staffmenu') st.notice = null;
    if (screen === 'selfcode' && OWN && !ownSaved) saveOwn();
    st.screen = screen;
    log('screen', screen);
    render();
    shownAt = Date.now();
    window.scrollTo(0, 0);
    // automatisches Vorlesen nur beim Seitenwechsel, nicht bei jedem Antippen
    if (current.patient && st.tts && current.speak && screen !== 'tshow') speak(current.speak, st.pLang);
  }

  // ---------- Bedienung ----------
  function act(a, v, el) {
    if (st.dialog && a !== 'dlg-yes' && a !== 'dlg-no') return;
    var parts;
    switch (a) {
      case 'new-self': startCase('self'); go('lang'); break;
      case 'new-talk': startCase('talk'); go('tlang'); break;
      case 'new-field': startCase('field'); st.talk.profile = 'field'; go('tlang'); break;
      case 'sample': sampleCase(); go('summary'); break;
      case 'staffLang': if (SL[v]) { st.staffLang = v; setPref('staffLang', v); render(); } break;
      case 'toggle': if (v === 'women' || v === 'tts') { st[v] = !st[v]; setPref(v, st[v] ? '1' : '0'); render(); } break;
      case 'stats-reset': setPref('stats', ''); render(); break;
      case 'go': if (VIEWS[v]) go(v); break;
      case 'lang': chooseLang(v); break;
      case 'langconfirm':
        if (v === 'yes') go('consent'); else { st.selLang = null; st.pLang = 'en'; go('lang'); }
        break;
      case 'consent': st.consent = v; log('consent', v); go(v === 'yes' ? (st.sex ? 'main' : 'sex') : 'consent_no'); break;
      case 'sex': st.sex = v === 'f' || v === 'm' ? v : null; st.sexBy = st.sex ? 'person' : null; log('sex', st.sex); go('main'); break;
      case 'back': back(); break;
      case 'companion-staff': st.companion = v; log('companion', v); render(); break;
      case 'mic': micToggle(); break;
      case 'free-done': freeDone(); break;
      case 'freeok': freeConfirm(v === 'yes'); break;
      case 'free-skip': snap(); st.answers[st.queue[st.qi]] = { skip: true }; log('free', 'skip'); next(); break;
      case 'sym': if (SYM[v]) { toggleIn(st.symptoms, v); render(); } break;
      case 'sym-done':
        if (!st.symptoms.length) return;
        st.queue = buildQueue(); st.qi = 0; st.hist = []; st.answers = {}; st.safety = {}; st.tries = {};
        log('symptoms', st.symptoms.slice()); goQ();
        break;
      case 'ans': answer(/^\d+$/.test(v) ? Number(v) : v); break;
      case 'sel':
        selToggle(v); render();
        if (st.tts && st.sel.indexOf(v) >= 0) say(v);
        break;
      case 'sel-done': if (st.sel.length) answer(st.sel.slice()); break;
      case 'info-ok': answer('ok'); break;
      case 'confirm': confirmAnswer(v === 'yes'); break;
      case 'human': if (st.screen !== 'human') requestHuman('button', st.screen); break;
      case 'human-staff': requestHuman('staff', 'talk'); break;
      case 'resume': {
        var rt = st.returnTo || (st.mode === 'self' ? 'lang' : 'talk');
        // zurück auf dieselbe Frage: Auswahl bleibt erhalten; nach einer automatischen Anfrage beginnt die nächste Frage neu
        if (rt === 'q' && !st.returnFresh && st.queue[st.qi] !== undefined) go('q'); else show(rt);
        break;
      }
      case 'interp':
        st.interp = { t: elapsed(), status: 'connecting', f: isF(), lang: st.selLang };
        log('interp', 'request');
        render();
        setTimeout(function () {
          if (st.interp && st.interp.status === 'connecting') {
            st.interp.status = 'connected';
            log('interp', 'connected');
            if (st.screen === 'human') render();
          }
        }, 2500);
        break;
      case 'staffmenu': st.menuFrom = st.screen; go('staffmenu'); break;
      case 'menu-back': {
        var mf = st.menuFrom && VIEWS[st.menuFrom] ? st.menuFrom : (st.mode === 'self' ? 'lang' : 'talk');
        if (mf === 'talk' && !st.selLang) mf = 'tlang';
        go(mf);
        break;
      }
      case 'to-summary': st.endedAt = Date.now(); go('summary'); break;
      case 'to-talk':
        if (st.mode !== 'field') { st.mode = 'talk'; st.talk.profile = 'clinic'; }
        if (!st.selLang) { go('tlang'); break; }
        if (!st.talk.cat) st.talk.cat = talkCats()[0].id;
        go('talk');
        break;
      case 'talk-self':
        if (!selfOpen() || st.mode === 'field') break;
        st.mode = 'self';
        if (st.pending) go('confirm');
        else if (st.queue[st.qi] !== undefined) go('q');
        else go(st.consent === 'yes' ? (st.sex ? 'main' : 'sex') : 'consent');
        break;
      // ----- Gespräch -----
      case 'tcat': tFlush(); st.talk.cat = v; render(); break;
      case 'tsex':
        if (st.sexBy === 'person' || (v !== 'f' && v !== 'm')) break;
        st.sex = st.sex === v ? null : v;
        st.sexBy = st.sex ? 'staff' : null;
        syncPreg();
        if (!talkCats().some(function (c) { return c.id === st.talk.cat; })) st.talk.cat = talkCats()[0].id;
        render();
        break;
      case 'tplay': {
        var item = tItem(v);
        if (!item) break;
        if (item.k === 'say') { tLog(v, 'said', null); render(); }
        say(v, app.querySelector('.ph-play[data-val="' + v + '"]'));
        break;
      }
      case 'tplay-conf': if (st.talk.pend) speak(tp('confirm_q', { answer: tp(st.talk.pend.v) }), st.pLang, el); break;
      case 'tans':
        parts = String(v).split('|');
        tAnswer(parts[0], parts[1]);
        render();
        break;
      case 'tconf': tConfirm(v === 'yes'); render(); break;
      case 'tshow':
        if (!tItem(v)) break;
        st.talk.show = v; st.sel = [];
        tFlush(v);
        if (tItem(v).k === 'say') tLog(v, 'said', null);
        go('tshow');
        speak(current.speak, st.pLang);
        break;
      case 'tshow-ans':
        if (tAnswer(st.talk.show, /^\d+$/.test(v) ? Number(v) : v)) { go('tshow'); speak(current.speak, st.pLang); } else go('talk');
        break;
      case 'tshow-conf': tConfirm(v === 'yes'); go('talk'); break;
      case 'tshow-body': if (st.sel.length) { tAnswer(st.talk.show, st.sel.slice()); st.sel = []; go('talk'); } break;
      case 'tshow-back': go('talk'); break;
      case 'end-field': resetCase(true); break;
      // ----- Aushang und Einlesen -----
      case 'scan-start': startScan(); break;
      case 'scan-load': {
        var ta = app.querySelector('[data-field="scanText"]');
        if (importPayload(ta ? ta.value : '')) go('staffmenu'); else { st.scanErr = true; render(); }
        break;
      }
      case 'scan-sample': sampleCase(); var code = payload(); st = blank(); importPayload(code); st.sample = true; go('staffmenu'); break;
      case 'print': window.print(); break;
      case 'export': exportLog(); break;
      case 'end': askEnd(); break;
      case 'dlg-yes': resetCase(true); break;
      case 'dlg-no': st.dialog = null; render(); break;
      case 'end-now': resetCase(true); break;
      case 'speak': say('@screen', el); break;
      case 'say': say(v, el); break;
    }
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    // Schutz vor Doppeltippen auf den Seiten der Person: Kurz nach einem Seitenwechsel zählt ein Tipp noch
    // nicht. Sonst beantwortet der zweite Tipp eines Doppeltipps die nächste Frage, deren Knopf an derselben
    // Stelle steht. Gilt nur für echte Berührungen, nicht für den automatischen Test.
    if (e.isTrusted && current && current.patient && Date.now() - shownAt < TAP_GUARD_MS) return;
    act(b.getAttribute('data-act'), b.getAttribute('data-val'), b);
  });
  app.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act]:not(button)')) {
      e.preventDefault();
      act(e.target.getAttribute('data-act'), e.target.getAttribute('data-val'));
    }
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.getAttribute('data-vital')) {
      st.vitals[t.getAttribute('data-vital')] = t.value;
      var m = document.getElementById('vit-missing');
      if (m) m.innerHTML = missingText();
    }
    if (t.getAttribute('data-field') === 'freeText' && st.free) {
      st.free.text = t.value;
      updateFreeDone();
    }
    if (t.getAttribute('data-field') === 'triageCat') {
      st.triageCat = t.value;
      var json = payload();
      var q = document.getElementById('qr');
      if (q) q.innerHTML = qrSvg(json);
      var j = document.getElementById('qr-json');
      if (j) j.textContent = json;
    }
  });

  // Ein versehentliches Neuladen oder Schließen würde den laufenden Fall löschen: Der Browser fragt dann nach.
  if (window.addEventListener) {
    window.addEventListener('beforeunload', function (e) {
      if (st.startedAt && !st.sample && st.mode !== 'field' && (hasSelf() || st.talk.log.length)) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  // ---------- Offline-Betrieb ----------
  function initOffline() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) { persistState = 'na'; return; }
    function done(p) { persistState = p; if (st.screen === 'home') render(); }
    navigator.serviceWorker.register('sw.js').then(function () {
      // erst „bereit" heißt: Alle Dateien liegen im Speicher, die App läuft ohne Netz
      return navigator.serviceWorker.ready;
    }).then(function () {
      if (navigator.storage && navigator.storage.persist) {
        return navigator.storage.persisted()
          .then(function (p) { return p || navigator.storage.persist(); })
          .then(function (p) { done(p ? 'yes' : 'no'); });
      }
      done('no');
    }).catch(function () { done('na'); });
  }

  // ---------- Beispielfall und Demo-Einstiege für Vorführung und Bildschirmfotos ----------
  // Beispiel: Pilgerin, Urdu, Hitze und Schwindel; Selbstauskunft, danach Gespräch und Vitalzeichen
  function sampleCase() {
    var keep = st.staffLang;
    startCase('self');
    st.staffLang = keep;
    st.sample = true; st.code = 'HK47';
    st.selLang = 'ur'; st.pLang = LANG.ur.has ? 'ur' : 'en'; st.sex = 'f'; st.sexBy = 'person'; st.consent = 'yes';
    st.startedAt = new Date(Date.now() - 372000);
    st.symptoms = ['sym_heat', 'sym_dizzy'];
    st.queue = buildQueue();
    st.queue.splice(st.queue.indexOf('allergy') + 1, 0, 'allergy_what');
    st.queue.splice(st.queue.indexOf('meds') + 1, 0, 'meds_what');
    st.queue.push('card');
    st.answers = { onset: 'on_hour', sun: 'yes', faint: 'yes', vomit: 'yes', drink: 'no', cramps: 'yes', head_hit: 'no', chestpain: 'no', group: 'yes', card: 'ok' };
    st.safety = {
      allergy: { value: 'yes', ok: true, tries: 1 }, allergy_what: { value: ['al_med'], ok: true, tries: 1 },
      meds: { value: 'yes', ok: true, tries: 1 }, meds_what: { value: ['md_diab', 'md_heart'], ok: true, tries: 1 },
      cond: { value: ['cd_diab', 'cd_bp'], ok: true, tries: 1 }, preg: { value: 'no', ok: true, tries: 1 },
      fasting: { value: 'yes', ok: true, tries: 1 }, meal: { value: 'ml_more', ok: false, tries: 2 }
    };
    st.qi = st.queue.length;
    st.patientDoneAt = 214000;
    st.talk.cat = 'heat';
    st.talk.log = [
      { t: 232000, id: 't_hello', v: 'said', ok: null, n: 1 },
      { t: 240000, id: 't_understand', v: 'yes', ok: null, n: 1 },
      { t: 251000, id: 't_drank_q', v: 'no', ok: null, n: 1 },
      { t: 262000, id: 'q_headache', v: 'yes', ok: null, n: 1 },
      { t: 270000, id: 't_shade', v: 'said', ok: null, n: 1 },
      { t: 281000, id: 't_cool', v: 'said', ok: null, n: 1 },
      { t: 296000, id: 't_diab_q', v: 'yes', ok: true, n: 1 },
      { t: 318000, id: 't_phone_q', v: 'yes', ok: null, n: 1 },
      { t: 330000, id: 't_inform_group', v: 'said', ok: null, n: 1 }
    ];
    st.vitals = { temp: '39.4', pulse: '118', sys: '100', dia: '60', spo2: '96', rr: '24' };
    st.human = [{ t: 95000, f: true, r: 'button' }];
    st.companion = 'no';
    st.interp = { t: 101000, status: 'connected', f: true, lang: 'ur' };
    st.endedAt = Date.now();
  }
  // ?demo=lang | main | body | pain | confirm | summary | talk | tshow | about | poster …, optional &staff=ar|en|de
  function demo(mode) {
    var sl = params.get('staff');
    var staffLang = SL[sl] ? sl : st.staffLang;
    function begin(m) { startCase(m); st.staffLang = staffLang; }
    st.staffLang = staffLang;
    if (mode === 'home') return false;
    if (mode === 'about' || mode === 'poster' || mode === 'scan') { go(mode); return true; }
    if (mode === 'summary') { sampleCase(); st.staffLang = staffLang; go('summary'); return true; }
    if (mode === 'talk' || mode === 'tshow' || mode === 'field') {
      begin(mode === 'field' ? 'field' : 'talk');
      if (mode === 'field') st.talk.profile = 'field';
      st.sample = true;
      if (mode !== 'field') { st.sex = 'f'; st.sexBy = 'staff'; }
      chooseLang(LANG[params.get('lang')] ? params.get('lang') : 'ur');
      if (mode === 'field') return true;
      st.talk.cat = 'heat';
      st.talk.log = [{ t: 4000, id: 'q_sun', v: 'yes', ok: null, n: 1 }, { t: 9000, id: 't_shade', v: 'said', ok: null, n: 1 }];
      if (mode === 'tshow') { st.talk.show = 't_drank_q'; go('tshow'); } else { st.talk.cat = 'safety'; st.talk.pend = { id: 'q_allergy', v: 'yes' }; go('talk'); }
      return true;
    }
    begin('self');
    st.sample = true;
    if (mode === 'lang') { go('lang'); return true; }
    if (mode === 'tlang') { st.mode = 'talk'; go('tlang'); return true; }
    var pl = params.get('lang');
    st.selLang = LANG[pl] ? pl : 'de'; st.pLang = LANG[st.selLang].has ? st.selLang : 'en'; st.consent = 'yes'; st.sex = 'f'; st.sexBy = 'person';
    if (mode === 'human') { st.companion = 'no'; requestHuman('button', 'main'); return true; }
    if (mode === 'consent') { st.consent = null; go('consent'); return true; }
    if (mode === 'sex') { st.sex = null; st.sexBy = null; go('sex'); return true; }
    if (mode === 'main') { st.symptoms = ['sym_heat']; go('main'); return true; }
    if (mode === 'more') { st.symptoms = ['sym_other']; st.queue = buildQueue(); st.qi = 0; goQ(); return true; }
    if (mode === 'free') { st.selLang = 'tr'; st.pLang = LANG.tr.has ? 'tr' : 'en'; st.symptoms = ['sym_other', 'sym_other2']; st.queue = ['other'].concat(C.SAFETY); st.qi = 0; goQ(); return true; }
    if (mode === 'vitals') { go('vitals'); return true; }
    if (mode === 'menu') { st.menuFrom = 'main'; go('staffmenu'); return true; }
    if (mode === 'body') { st.symptoms = ['sym_pain']; st.queue = buildQueue(); st.qi = 0; goQ(); st.sel = ['reg_chest', 'reg_arm_l']; render(); return true; }
    if (mode === 'pain') { st.symptoms = ['sym_pain']; st.queue = buildQueue(); st.qi = 2; goQ(); return true; }
    if (mode === 'heat') { st.symptoms = ['sym_heat']; st.queue = buildQueue(); st.qi = 1; goQ(); return true; }
    // Jede Frage einzeln ansehen: ?demo=q&q=cond, mit &sel=cd_diab,cd_bp samt Rückbestätigung dieser Antworten
    if (mode === 'q') {
      var dq = params.get('q');
      if (!dq || !own(C.Q, dq)) dq = 'onset';
      st.symptoms = ['sym_heat']; st.queue = [dq]; st.qi = 0;
      var dsel = (params.get('sel') || '').split(',').filter(function (o) { return (C.Q[dq].options || []).indexOf(o) >= 0; });
      if (dsel.length) { st.pending = { qid: dq, value: C.Q[dq].type === 'single' ? dsel[0] : dsel }; go('confirm'); } else goQ();
      return true;
    }
    if (mode === 'confirm') { st.symptoms = ['sym_heat']; st.queue = buildQueue(); st.qi = st.queue.indexOf('allergy'); st.pending = { qid: 'allergy', value: 'yes' }; go('confirm'); return true; }
    if (mode === 'end') { st.symptoms = ['sym_heat']; st.queue = buildQueue(); st.qi = st.queue.length; st.patientDoneAt = 1; go(OWN ? 'selfcode' : 'end_patient'); return true; }
    st = blank();
    return false;
  }

  initOffline();
  if ('speechSynthesis' in window) {
    loadVoices();
    try {
      // Viele Browser liefern die Stimmen erst kurz nach dem Laden. Neu gezeichnet wird nur beim ersten Mal
      // und nur auf Seiten ohne Eingabefeld, damit nichts Getipptes verloren geht.
      window.speechSynthesis.onvoiceschanged = function () {
        var first = !voices;
        if (loadVoices() && first && ['home', 'lang', 'tlang', 'talk'].indexOf(st.screen) >= 0 && !st.dialog) render();
      };
    } catch (e) { /* ohne Stimmenliste weiter */ }
    setTimeout(function () {
      if (voices) return;
      voicesGaveUp = true;
      if (st.screen === 'home' && !st.dialog) render();
    }, 3000);
  }
  var mode = params.get('demo');
  var savedOwn = OWN && !mode ? loadOwn() : null;
  if (mode && demo(mode)) { /* Demo-Einstieg gesetzt */ } else if (savedOwn) restoreOwn(savedOwn); else if (OWN) { startCase('self'); go('lang'); } else render();
})();
