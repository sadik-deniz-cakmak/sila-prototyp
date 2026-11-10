/*
 * Sila – Triage-Übersetzer, Klick-Prototyp v0.1 – Ablauf
 *
 * Grundsätze aus dem Konzept, hier technisch umgesetzt:
 *  - nur feste Phrasen, keine freie Maschinenübersetzung
 *  - keine Diagnose und kein Triage-Vorschlag
 *  - Sicherheitsantworten werden wiederholt und bestätigt
 *  - Falldaten nur im Arbeitsspeicher; nach „Fall beenden" gelöscht
 *    (gespeichert werden nur Einstellungen: Sprache des Personals,
 *    Frauenmodus, Vorlesen)
 */
(function () {
  'use strict';

  var C = window.SILA;
  var app = document.getElementById('app');
  var LANG = {};
  C.LANGS.forEach(function (l) { LANG[l.code] = l; });
  var SYM = {};
  C.SYMPTOMS.concat(C.SYMPTOMS2).forEach(function (s) { SYM[s.id] = s; });

  var VITALS = [
    { k: 'temp', l: 'vit_temp', req: true, step: '0.1', min: 30, max: 45 },
    { k: 'pulse', l: 'vit_pulse', req: true, step: '1', min: 20, max: 250 },
    { k: 'sys', l: 'vit_sys', req: true, step: '1', min: 40, max: 300 },
    { k: 'dia', l: 'vit_dia', req: false, step: '1', min: 20, max: 200 },
    { k: 'spo2', l: 'vit_spo2', req: true, step: '1', min: 50, max: 100 },
    { k: 'rr', l: 'vit_rr', req: false, step: '1', min: 4, max: 80 }
  ];

  // ---------- Einstellungen (nur diese landen im Browser-Speicher) ----------
  function pref(k, d) {
    try { var v = window.localStorage.getItem('sila.' + k); return v === null ? d : v; } catch (e) { return d; }
  }
  function setPref(k, v) {
    try { window.localStorage.setItem('sila.' + k, v); } catch (e) { /* ohne Speicher weiter */ }
  }

  var persistState = 'na';

  function blank() {
    return {
      screen: 'home',
      staffLang: pref('staffLang', 'de'),
      women: pref('women', '0') === '1',
      tts: pref('tts', '0') === '1',
      selLang: null, pLang: 'en', consent: null,
      symptoms: [], queue: [], qi: 0,
      answers: {}, safety: {}, tries: {}, pending: null, sel: [],
      vitals: {}, triageCat: '', human: [], companion: null, interp: null, free: null, rec: null,
      startedAt: null, t0: 0, endedAt: null, patientDoneAt: null,
      returnTo: null, events: []
    };
  }
  var st = blank();
  var current = {};

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
  function look(dict, id, lang) {
    var e = dict[id];
    if (!e) return '[' + id + ']';
    return e[lang] || e.en;
  }
  // Text für die Patientin oder den Patienten (roh / HTML-sicher)
  function tp(id, vars) { return fill(look(C.P, id, st.pLang), vars); }
  function P(id, vars) { return esc(tp(id, vars)); }
  // Text für das Personal; Antwortbeschriftungen kommen aus den Patientenphrasen
  function ts(id, vars) { return fill(C.S[id] ? look(C.S, id, st.staffLang) : look(C.P, id, st.staffLang), vars); }
  function S(id, vars) { return esc(ts(id, vars)); }
  // Sprachname für das Personal, z. B. „Urdu (اردو)"; Eigenname in Unicode-Isolation gegen Bidi-Durcheinander
  function langStaff(L) {
    var label = (L.label && (L.label[st.staffLang] || L.label.en)) || L.name;
    return label === L.name ? label : label + ' (⁨' + L.name + '⁩)';
  }
  function ic(name, cls) {
    var p = C.ICONS[name];
    if (!p) return '';
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  // Piktogramm in einem getönten Feld (Kacheln)
  function tic(name) { var s = ic(name); return s ? '<span class="ticon">' + s + '</span>' : ''; }
  var LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1e2124"/>' +
    '<circle cx="25" cy="32" r="11" fill="none" stroke="#f7f6f2" stroke-width="4.5"/><circle cx="39" cy="32" r="11" fill="none" stroke="#e2b260" stroke-width="4.5"/></svg>';
  // Datum für das Personal, gregorianisch und nach dem Umm-al-Qura-Kalender
  function todayLine() {
    var d = new Date();
    var loc = st.staffLang === 'de' ? 'de-DE' : 'en-GB';
    try {
      var g = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      var h = new Intl.DateTimeFormat(loc + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
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
  function optButtons(opts, act, multi) {
    return '<div class="grid opts">' + opts.map(function (o) {
      var on = multi && st.sel.indexOf(o) >= 0;
      return withSay('<button class="tile opt' + (on ? ' on' : '') + (o === 'unknown' ? ' a-unknown' : '') + '" data-act="' + act + '" data-val="' + o + '"' +
        (multi ? ' aria-pressed="' + on + '"' : '') + '>' + tic(C.ICONS[o] ? o : (SYM[o] ? SYM[o].icon : '')) + '<span>' + P(o) + '</span></button>', o);
    }).join('') + '</div>';
  }
  function doneBtn(act, enabled) {
    return '<div class="done-row"><button class="primary done" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' +
      ic('yes') + '<span>' + P('done') + '</span></button></div>';
  }
  function scale() {
    var b = '';
    for (var i = 0; i <= 10; i++) {
      b += '<button class="num' + (i >= 6 ? ' dark' : '') + '" style="--h:' + i + '" data-act="ans" data-val="' + i + '">' + i + '</button>';
    }
    return '<div class="scale" dir="ltr">' + b + '</div>' +
      '<div class="answers">' + ansBtn('a-unknown', 'ans', 'unknown', 'unknown', P('unknown')) + '</div>';
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
      '</div></div><div class="chips">' + chips + '</div>';
  }
  function kv(k, v) { return '<div class="kv"><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }
  function valStaff(id, v) {
    if (v === undefined || v === null) return '–';
    var arr = Array.isArray(v) ? v : [v];
    return arr.map(function (x) {
      if (typeof x === 'number') return String(x) + (id === 'pain' ? ' / 10' : '');
      if (x === 'ok') return '✓';
      return S(x);
    }).join(', ');
  }

  // ---------- Bildschirme ----------
  function row(label, ctrl, hint) {
    return '<div class="row"><div class="row-l"><strong>' + label + '</strong>' + (hint ? '<small>' + hint + '</small>' : '') + '</div><div class="row-c">' + ctrl + '</div></div>';
  }
  function toggle(key, on) {
    return '<button class="toggle' + (on ? ' on' : '') + '" data-act="toggle" data-val="' + key + '" aria-pressed="' + on + '">' + S(on ? 'on' : 'off') + '</button>';
  }

  var VIEWS = {
    home: function () {
      var langs = ['de', 'en'].map(function (l) {
        return '<button class="seg' + (st.staffLang === l ? ' on' : '') + '" data-act="staffLang" data-val="' + l + '">' + (l === 'de' ? 'Deutsch' : 'English') + '</button>';
      }).join('');
      var persist = { yes: 'persist_yes', no: 'persist_no', na: 'persist_na' }[persistState];
      return {
        html: '<section class="home"><p class="date">' + esc(todayLine()) + '</p>' +
          '<button class="primary big" data-act="new">' + ic('person') + '<span>' + S('new_patient') + '</span></button>' +
          '<p class="hint">' + S('new_patient_hint') + '</p>' +
          '<div class="settings">' +
          row(S('staff_lang'), '<div class="segs">' + langs + '</div>') +
          row(S('women_mode'), toggle('women', st.women), S('women_mode_hint')) +
          row(S('tts'), toggle('tts', st.tts), S('tts_hint')) +
          row(S('offline'), '<span class="status s-' + persistState + '">' + S(persist) + '</span>') +
          '</div><p class="principles">' + S('principles') + '</p></section>'
      };
    },

    lang: function () {
      var tiles = C.LANGS.map(function (l) {
        return withSay('<button class="tile lang' + (l.has ? '' : ' nolang') + '" data-act="lang" data-val="' + l.code + '">' +
          '<span class="lname" dir="' + l.dir + '" lang="' + l.code + '">' + esc(l.name) + '</span>' +
          (l.flags && l.flags.length ? '<span class="flags">' + l.flags.map(function (c) {
            return '<img class="flag" src="vendor/flags/' + c + '.svg" alt="" width="30" height="22">';
          }).join('') + '</span>' : '') + '</button>', 'lang:' + l.code);
      }).join('');
      return {
        patient: true,
        html: qline(esc(look(C.P, 'lang_pick', 'en')) + '<br><span class="q2" lang="de">' + esc(look(C.P, 'lang_pick', 'de')) + '</span>') +
          '<div class="grid langs">' + tiles + '</div>',
        speak: look(C.P, 'lang_pick', 'en')
      };
    },

    missing: function () {
      return {
        html: '<section class="card"><p class="lead">' + S('missing_tr', { lang: langStaff(LANG[st.selLang]) }) + '</p>' +
          '<div class="actions"><button class="primary" data-act="go" data-val="langconfirm">' + S('continue') + '</button></div></section>'
      };
    },

    draft: function () {
      return {
        html: '<section class="card"><p class="lead">' + S('draft_tr', { lang: langStaff(LANG[st.selLang]) }) + '</p>' +
          '<div class="actions"><button class="primary" data-act="go" data-val="langconfirm">' + S('continue') + '</button></div></section>'
      };
    },

    freeconfirm: function () {
      var F = st.free;
      var shown = F.back || F.text;
      var t = tp('free_heard') + ' ' + shown + ' ' + tp('free_ok_q');
      return {
        patient: true,
        html: '<div class="qicon">' + ic('speech', 'xl') + '</div>' + qline(P('free_heard')) +
          '<div class="confirm-box free-box"><p class="free-shown" dir="auto">' + esc(shown) + '</p></div>' +
          '<p class="q">' + P('free_ok_q') + '</p>' + ynButtons('freeok', false),
        speak: t
      };
    },

    langconfirm: function () {
      var t = tp('lang_confirm', { lang: LANG[st.selLang].name });
      return { patient: true, html: qline(esc(t)) + ynButtons('langconfirm', false), speak: t };
    },

    consent: function () {
      return {
        patient: true,
        html: qline(P('consent_title')) + '<p class="lead">' + P('consent_text') + '</p>' +
          '<p class="q">' + P('consent_q') + '</p>' + ynButtons('consent', false),
        speak: tp('consent_title') + '. ' + tp('consent_text') + ' ' + tp('consent_q')
      };
    },

    consent_no: function () {
      return {
        patient: true,
        html: qline(P('consent_no')) + '<div class="staffbox"><strong>' + S('for_staff') + ':</strong> ' + S('consent_refused') +
          '<div class="actions"><button class="secondary" data-act="end-now">' + S('to_home') + '</button></div></div>',
        speak: tp('consent_no')
      };
    },

    women: function () {
      return {
        patient: true,
        html: '<div class="qicon">' + ic('woman', 'xl') + '</div>' + qline(P('women_offer')) +
          '<div class="answers">' + withSay('<button class="ans a-woman" data-act="human">' + ic('woman') + '<span>' + P('women_btn') + '</span></button>', 'women_btn', 'ans-wrap') +
          withSay('<button class="ans a-next" data-act="go" data-val="companion">' + ic('yes') + '<span>' + P('ok') + '</span></button>', 'ok', 'ans-wrap') + '</div>',
        speak: tp('women_offer')
      };
    },

    main: function () {
      var tiles = C.SYMPTOMS.map(function (s) {
        var on = st.symptoms.indexOf(s.id) >= 0;
        return withSay('<button class="tile sym' + (on ? ' on' : '') + '" data-act="sym" data-val="' + s.id + '" aria-pressed="' + on + '">' +
          tic(s.icon) + '<span>' + P(s.id) + '</span></button>', s.id);
      }).join('');
      return {
        patient: true,
        html: qline(P('q_main')) + '<div class="grid syms">' + tiles + '</div>' + doneBtn('sym-done', st.symptoms.length > 0),
        speak: tp('q_main')
      };
    },

    q: function () {
      var qid = st.queue[st.qi];
      var q = C.Q[qid];
      var head = '<div class="progress"><span>' + (st.qi + 1) + ' / ' + st.queue.length + '</span></div>' +
        (q.icon ? '<div class="qicon">' + ic(q.icon, 'xl') + '</div>' : '') + qline(P(q.text));
      var body = '';
      if (q.type === 'yn') body = ynButtons('ans', true);
      else if (q.type === 'single') body = optButtons(q.options.indexOf('unknown') >= 0 ? q.options : q.options.concat(['unknown']), 'ans', false);
      else if (q.type === 'multi' || q.type === 'board') body = optButtons(q.options.concat(['unknown']), 'sel', true) + doneBtn('sel-done', st.sel.length > 0);
      else if (q.type === 'scale') body = scale();
      else if (q.type === 'body') body = bodyMap() + doneBtn('sel-done', st.sel.length > 0);
      else if (q.type === 'info') body = '<div class="done-row"><button class="primary done" data-act="info-ok">' + ic('yes') + '<span>' + P('ok') + '</span></button></div>';
      else if (q.type === 'free') body = freeBody();
      return { patient: true, html: head + body, speak: tp(q.text) };
    },

    confirm: function () {
      var p = st.pending;
      var q = C.Q[p.qid];
      var vals = Array.isArray(p.value) ? p.value : [p.value];
      var t = tp('confirm_q', { answer: vals.map(function (x) { return typeof x === 'number' ? String(x) : tp(x); }).join(', ') });
      var icons = vals.map(function (v) { return C.ICONS[v] ? ic(v, 'md') : ''; }).join('');
      return {
        patient: true,
        html: (q.icon ? '<div class="qicon">' + ic(q.icon, 'xl') + '</div>' : '') + '<p class="lead">' + P(q.text) + '</p>' +
          '<div class="confirm-box">' + icons + '<h1 class="q">' + esc(t) + '</h1>' + sayBtn('@screen', 'say-q') + '</div>' + ynButtons('confirm', false),
        speak: t
      };
    },

    end_patient: function () {
      return {
        patient: true, noHuman: false,
        html: '<div class="qicon ok">' + ic('yes', 'xl') + '</div>' + qline(P('end_patient')) + '<p class="lead">' + P('give_back') + '</p>' +
          '<div class="staffbox"><button class="primary" data-act="go" data-val="vitals">' + S('patient_done') + '</button></div>',
        speak: tp('end_patient') + ' ' + tp('give_back')
      };
    },

    human: function () {
      var last = st.human[st.human.length - 1] || {};
      var f = !!last.f;
      var key = f ? 'human_wait_f' : 'human_wait';
      var L = LANG[st.selLang] || LANG[st.pLang];
      var reason = last.r === 'free' ? S('auto_free') : last.r === 'lost' ? S('auto_lost') : S(f ? 'human_req_f' : 'human_req');
      var comp = st.companion === 'yes' ? ' ' + S('human_companion_yes') : st.companion === 'no' ? ' ' + S('human_companion_no') : '';
      var interp = !st.interp
        ? '<button class="primary" data-act="interp">' + ic(f ? 'woman' : 'person') + '<span>' + S(f ? 'call_interp_f' : 'call_interp', { lang: langStaff(L) }) + '</span></button>'
        : '<p class="interp i-' + st.interp.status + '">' + S(st.interp.status === 'connected' ? 'interp_connected' : 'interp_connecting', { lang: langStaff(L) }) + '</p>';
      return {
        patient: true, noHuman: true,
        html: '<div class="qicon">' + ic(f ? 'woman' : 'person', 'xl') + '</div>' + qline(P(key)) +
          '<div class="staffbox alert"><strong>' + S('for_staff') + ':</strong> ' + reason + ' ' + S('human_lang', { lang: langStaff(L) }) + comp +
          '<div class="actions">' + interp + '<button class="secondary" data-act="resume">' + S('resume') + '</button></div></div>',
        speak: tp(key)
      };
    },

    companion: function () {
      return {
        patient: true,
        html: '<div class="qicon">' + ic('group', 'xl') + '</div>' + qline(P('q_companion')) + ynButtons('companion', true),
        speak: tp('q_companion')
      };
    },

    staffmenu: function () {
      return {
        html: '<section class="card"><h1>' + S('staff_menu') + '</h1><div class="menu">' +
          '<button class="primary" data-act="resume">' + S('resume') + '</button>' +
          '<button class="secondary" data-act="go" data-val="vitals">' + S('to_vitals') + '</button>' +
          '<button class="secondary" data-act="to-summary">' + S('to_summary') + '</button>' +
          '<button class="danger" data-act="end">' + S('end_case') + '</button></div></section>'
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
          '<div class="actions"><button class="primary" data-act="to-summary">' + S('to_summary') + '</button></div></section>'
      };
    },

    summary: function () {
      var L = LANG[st.selLang] || LANG.en;
      var head = [
        kv(S('sum_lang'), esc(langStaff(L)) + (L.has ? (L.draft ? ' · ' + S('sum_lang_draft') : '') : ' · ' + S('sum_lang_demo'))),
        kv(S('sum_women'), S(st.women ? 'on' : 'off')),
        kv(S('sum_consent'), st.consent ? S(st.consent) : '–'),
        kv(S('sum_companion'), st.companion ? S(st.companion) : '–'),
        kv(S('sum_main'), st.symptoms.map(function (s) { return S(s); }).join(', ') || '–')
      ].join('');
      var ans = st.queue.filter(function (id) { return !C.Q[id].safety && C.Q[id].type !== 'board' && st.answers[id] !== undefined; })
        .map(function (id) {
          return kv(S(C.Q[id].label) + (C.Q[id].type === 'free' ? ' <span class="small">(' + S('free_mt') + ')</span>' : ''),
            C.Q[id].type === 'free' ? freeStaff(st.answers[id]) : valStaff(id, st.answers[id]));
        }).join('');
      var saf = st.queue.filter(function (id) { return C.Q[id].safety && st.safety[id]; }).map(function (id) {
        var s = st.safety[id];
        return kv(S(C.Q[id].label), valStaff(id, s.value) + ' <span class="' + (s.ok ? 'okmark' : 'warnmark') + '">' +
          (s.ok ? '✓ ' + S('confirmed') : '⚠ ' + S('not_confirmed')) + '</span>');
      }).join('');
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
      return {
        html: '<section class="card summary" id="print-area"><h1>' + S('summary_title') + '</h1>' +
          '<div class="sum-grid"><div>' +
          '<dl>' + head + '</dl>' +
          '<h2>' + S('sum_answers') + '</h2><dl>' + (ans || kv('–', '')) + '</dl>' +
          '<h2>' + S('sum_safety') + '</h2><dl>' + (saf || kv('–', '')) + '</dl>' +
          '<h2>' + S('sum_vitals') + '</h2><dl>' + vit + '</dl>' +
          '<dl class="meta">' + kv(S('sum_time'), timeLine) + kv(S('sum_human'), humanLine) + kv(S('sum_interp'), interpLine) + '</dl>' +
          '<label class="tc"><span>' + S('triage_cat') + '</span><input type="text" maxlength="20" data-field="triageCat" value="' + esc(st.triageCat) + '"></label>' +
          '</div><div class="qrcol"><div id="qr" class="qr">' + qrSvg(json) + '</div><p class="small">' + S('qr_hint') + '</p>' +
          '<details class="noprint"><summary>' + S('qr_data') + '</summary><pre id="qr-json">' + esc(json) + '</pre></details></div></div>' +
          '<p class="note">' + S('sum_note') + '</p>' +
          '<div class="actions noprint"><button class="secondary" data-act="print">' + S('print') + '</button>' +
          '<button class="secondary" data-act="export">' + S('export_log') + '</button>' +
          '<button class="danger" data-act="end">' + S('end_case') + '</button></div></section>'
      };
    }
  };

  // ---------- Ablauflogik ----------
  function missingList() {
    return VITALS.filter(function (v) { return v.req && (st.vitals[v.k] === undefined || st.vitals[v.k] === ''); });
  }
  function missingText() {
    var m = missingList();
    if (!m.length) return S('vit_complete');
    return S('vit_missing', { list: m.map(function (v) { return ts(v.l); }).join(', ') });
  }

  function buildQueue() {
    var q = [];
    st.symptoms.forEach(function (sid) {
      var sym = C.SYMPTOMS.filter(function (x) { return x.id === sid; })[0];
      sym.follow.forEach(function (id) { if (q.indexOf(id) < 0) q.push(id); });
    });
    C.SAFETY.forEach(function (id) { q.push(id); });
    return q;
  }

  function goQ() {
    st.sel = [];
    var qid = st.queue[st.qi];
    if (C.Q[qid] && C.Q[qid].type === 'free' && (!st.free || st.free.qid !== qid)) {
      st.free = { qid: qid, text: '', tr: null, back: null, mt: null, tries: 0, err: null, busy: false };
    }
    go('q');
  }

  // ---------- Freies Sprechen (Stufe 2 des Konzepts, hier als Demo) ----------
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function freeBody() {
    if (C.FREE_LANGS.indexOf(st.selLang) < 0) {
      return '<p class="lead">' + P('free_no_speech') + '</p><div class="answers">' +
        ansBtn('a-next', 'human', null, st.women ? 'woman' : 'person', P(st.women ? 'women_btn' : 'human_btn')) + '</div>' +
        '<div class="done-row"><button class="secondary" data-act="free-skip">' + P('ok') + '</button></div>';
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
      return translate(tr, dst, src).then(function (back) { return [tr, back]; });
    }).then(function (r) {
      F.busy = false; F.tr = r[0]; F.back = r[1]; F.mt = r[0] ? 'device' : 'none';
      go('freeconfirm');
    });
  }
  function freeConfirm(ok) {
    var F = st.free;
    F.tries++;
    var qid = st.queue[st.qi];
    log('free_confirm', ok);
    if (ok || F.tries >= 2) {
      st.answers[qid] = { text: F.text.trim().slice(0, 500), tr: F.tr, mt: F.mt, ok: ok };
      if (ok) next(); else requestHuman('free', advance());
      return;
    }
    go('q');
  }
  function freeStaff(a) {
    if (!a || a.skip) return '–';
    var parts = [];
    if (a.tr && a.mt !== 'same') parts.push(esc(a.tr) + ' <span class="small">(' + S('free_mt') + ')</span>');
    parts.push((a.mt === 'same' ? '' : S('free_orig') + ': ') + '<span dir="auto">' + esc(a.text) + '</span>' +
      (a.mt === 'none' ? ' <span class="small">(' + S('free_no_tr') + ')</span>' : ''));
    parts.push('<span class="' + (a.ok ? 'okmark' : 'warnmark') + '">' + (a.ok ? '✓ ' + S('confirmed') : '⚠ ' + S('not_confirmed')) + '</span>');
    return parts.join('<br>');
  }

  function answer(val) {
    var qid = st.queue[st.qi];
    var q = C.Q[qid];
    log('answer', { q: qid, v: val });
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
    if (q.autoHuman) { requestHuman(q.autoHuman, advance()); return; }
    next();
  }

  function requestHuman(reason, returnTo) {
    st.returnTo = returnTo;
    st.human.push({ t: elapsed(), f: st.women, r: reason });
    log('human', { f: st.women, r: reason });
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
    if (st.qi >= st.queue.length) { st.patientDoneAt = elapsed(); log('patient_done'); return 'end_patient'; }
    return 'q';
  }
  function next() { show(advance()); }
  function show(screen) { if (screen === 'q') goQ(); else go(screen); }

  function selToggle(v) {
    var q = C.Q[st.queue[st.qi]];
    var excl = (q.exclusive || []).concat(['unknown']);
    var i = st.sel.indexOf(v);
    if (i >= 0) { st.sel.splice(i, 1); return; }
    if (excl.indexOf(v) >= 0) st.sel = [v];
    else { st.sel = st.sel.filter(function (x) { return excl.indexOf(x) < 0; }); st.sel.push(v); }
  }

  function startCase() {
    st = blank();
    st.startedAt = new Date();
    st.t0 = performance.now();
    log('start');
  }
  function resetCase() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (st.rec) { try { st.rec.stop(); } catch (e) { /* schon beendet */ } }
    st = blank();
    go('home');
  }

  // ---------- Übergabe: QR-Code und Testprotokoll ----------
  function payload() {
    var o = {
      v: 1, app: 'sila-demo-' + C.VERSION, l: st.selLang, ui: st.pLang, w: st.women ? 1 : 0,
      t: st.startedAt ? st.startedAt.toISOString().slice(0, 16) + 'Z' : null, d: dur(),
      c: st.symptoms.map(function (s) { return s.replace('sym_', ''); }),
      a: {}, s: {}, vt: {}, h: st.human.length,
      cp: st.companion || null, i: st.interp ? 1 : 0
    };
    Object.keys(st.answers).forEach(function (k) {
      var v = st.answers[k];
      // freie Angabe kompakt: Original und Übersetzung gekürzt, Bestätigung als 1/0
      o.a[k] = v && typeof v === 'object' && !Array.isArray(v)
        ? (v.skip ? 'skip' : { t: (v.text || '').slice(0, 200), tr: v.tr ? v.tr.slice(0, 200) : null, ok: v.ok ? 1 : 0 })
        : v;
    });
    Object.keys(st.safety).forEach(function (k) { o.s[k] = [st.safety[k].value, st.safety[k].ok ? 1 : 0]; });
    Object.keys(st.vitals).forEach(function (k) { if (st.vitals[k] !== '') o.vt[k] = Number(st.vitals[k]); });
    if (st.triageCat) o.tc = st.triageCat.slice(0, 20);
    return JSON.stringify(o);
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
      language: st.selLang, uiLanguage: st.pLang, womenMode: st.women, consent: st.consent,
      symptoms: st.symptoms, questions: st.queue, answers: st.answers, safety: st.safety,
      vitals: st.vitals, triageCategoryByStaff: st.triageCat || null, humanRequests: st.human, companionCanTranslate: st.companion || null, interpreter: st.interp || null, events: st.events,
      note: 'Keine Namen, keine Audiodaten. Nur für Tests mit dem Klick-Prototyp.'
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sila-testprotokoll-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- Vorlesen ----------
  // Zuerst eingesprochene Aufnahme (C.AUDIO[sprache][phrasen-id]), sonst Gerätestimme (nur Demo).
  function mark(el, on) {
    if (el && el.classList) { if (on) el.classList.add('playing'); else el.classList.remove('playing'); }
  }
  function playRecorded(id, lang, el) {
    var src = id && C.AUDIO && C.AUDIO[lang] && C.AUDIO[lang][id];
    if (!src || typeof Audio === 'undefined') return false;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      var a = new Audio(src);
      mark(el, true);
      a.onended = a.onerror = function () { mark(el, false); };
      a.play();
      return true;
    } catch (e) { return false; }
  }
  function speak(text, lang, el) {
    lang = lang || st.pLang;
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = LANG[lang].bcp;
      mark(el, true);
      u.onend = u.onerror = function () { mark(el, false); };
      window.speechSynthesis.speak(u);
    } catch (e) { mark(el, false); }
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
    var top;
    if (view.patient) {
      top = '<header class="bar bar-patient"><span class="brand">' + LOGO + 'Sila <span class="brand-ar" lang="ar">صلة</span></span><span class="spacer"></span>' +
        (st.tts ? '<button class="tool" data-act="speak" aria-label="' + S('tts') + '">' + ic('speaker') + '</button>' : '') +
        (view.noHuman ? '' : '<button class="tool tool-human" data-act="human">' + ic(st.women ? 'woman' : 'person') + '<span>' + P(st.women ? 'women_btn' : 'human_btn') + '</span></button>') +
        '<button class="tool tool-staff" data-act="staffmenu">' + S('staff_btn') + '</button></header>';
    } else {
      top = '<header class="bar bar-staff"><span class="brand">' + LOGO + 'Sila <span class="brand-ar" lang="ar">صلة</span></span><span class="sub">' + S('subtitle') + '</span><span class="spacer"></span><span class="tag">' + S('for_staff') + '</span></header>';
    }
    var dir = view.patient ? LANG[st.pLang].dir : 'ltr';
    var lang = view.patient ? st.pLang : st.staffLang;
    var draftNote = view.patient && LANG[st.pLang].draft ? ' ' + S('draft_banner', { lang: langStaff(LANG[st.pLang]) }) : '';
    return top + '<main class="screen ' + (view.patient ? 'patient' : 'staff') + '" dir="' + dir + '" lang="' + lang + '">' + view.html + '</main>' +
      '<footer class="demo">' + S('demo_banner') + draftNote + '</footer>';
  }

  function render() {
    var fn = VIEWS[st.screen] || VIEWS.home;
    current = fn();
    app.innerHTML = shell(current);
    document.documentElement.lang = current.patient ? st.pLang : st.staffLang;
  }

  function go(screen) {
    st.screen = screen;
    log('screen', screen);
    render();
    window.scrollTo(0, 0);
    // automatisches Vorlesen nur beim Seitenwechsel, nicht bei jedem Antippen
    if (current.patient && st.tts && current.speak) speak(current.speak, st.pLang);
  }

  // ---------- Bedienung ----------
  function act(a, v, el) {
    switch (a) {
      case 'new': startCase(); go('lang'); break;
      case 'staffLang': st.staffLang = v; setPref('staffLang', v); render(); break;
      case 'toggle': st[v] = !st[v]; setPref(v, st[v] ? '1' : '0'); render(); break;
      case 'go': go(v); break;
      case 'lang':
        st.selLang = v; log('lang', v);
        if (LANG[v].has) { st.pLang = v; go(LANG[v].draft ? 'draft' : 'langconfirm'); } else { st.pLang = 'en'; go('missing'); }
        break;
      case 'langconfirm':
        if (v === 'yes') go('consent'); else { st.selLang = null; st.pLang = 'en'; go('lang'); }
        break;
      // Frauenmodus zeigt den Knopf „Eine Frau anfordern" oben; Begleitperson trägt das Personal ein
      case 'consent': st.consent = v; log('consent', v); go(v === 'yes' ? 'main' : 'consent_no'); break;
      case 'companion-staff': st.companion = v; log('companion', v); render(); break;
      case 'mic': micToggle(); break;
      case 'free-done': freeDone(); break;
      case 'freeok': freeConfirm(v === 'yes'); break;
      case 'free-skip': st.answers[st.queue[st.qi]] = { skip: true }; log('free', 'skip'); next(); break;
      case 'sym': toggleIn(st.symptoms, v); render(); break;
      case 'sym-done':
        if (!st.symptoms.length) return;
        st.queue = buildQueue(); st.qi = 0; log('symptoms', st.symptoms.slice()); goQ();
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
      case 'resume': show(st.returnTo || 'home'); break;
      case 'companion': st.companion = v; log('companion', v); go('main'); break;
      case 'interp':
        st.interp = { t: elapsed(), status: 'connecting', f: st.women, lang: st.selLang };
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
      case 'staffmenu': st.returnTo = st.screen; go('staffmenu'); break;
      case 'to-summary': if (!st.endedAt) st.endedAt = Date.now(); go('summary'); break;
      case 'print': window.print(); break;
      case 'export': exportLog(); break;
      case 'end': if (window.confirm(ts('end_case_confirm'))) resetCase(); break;
      case 'end-now': resetCase(); break;
      case 'speak': say('@screen', el); break;
      case 'say': say(v, el); break;
    }
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
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

  // ---------- Offline-Betrieb ----------
  function initOffline() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) { persistState = 'na'; return; }
    function done(p) { persistState = p; if (st.screen === 'home') render(); }
    navigator.serviceWorker.register('sw.js').then(function () {
      if (navigator.storage && navigator.storage.persist) {
        return navigator.storage.persisted()
          .then(function (p) { return p || navigator.storage.persist(); })
          .then(function (p) { done(p ? 'yes' : 'no'); });
      }
      done('no');
    }).catch(function () { done('na'); });
  }

  // ---------- Demo-Einstiege für Vorführung und Bildschirmfotos ----------
  // ?demo=lang | main | body | pain | confirm | summary, optional &staff=en
  function demo(mode) {
    var params = new URLSearchParams(location.search);
    if (params.get('staff') === 'en' || params.get('staff') === 'de') st.staffLang = params.get('staff');
    var staffLang = st.staffLang;
    startCase();
    st.staffLang = staffLang;
    if (mode === 'lang') { go('lang'); return true; }
    if (mode === 'human') { st.selLang = 'ur'; st.pLang = 'en'; st.consent = 'yes'; st.companion = 'no'; requestHuman('button', 'main'); return true; }
    st.selLang = 'de'; st.pLang = 'de'; st.consent = 'yes';
    if (mode === 'main') { st.symptoms = ['sym_heat']; go('main'); return true; }
    if (mode === 'more') { st.symptoms = ['sym_other']; st.queue = buildQueue(); st.qi = 0; goQ(); return true; }
    if (mode === 'companion') { go('companion'); return true; }
    if (mode === 'free') { st.selLang = 'tr'; st.pLang = 'tr'; st.symptoms = ['sym_other', 'sym_other2']; st.queue = ['other'].concat(C.SAFETY); st.qi = 0; goQ(); return true; }
    if (mode === 'urdu') { st.selLang = 'ur'; st.pLang = 'ur'; st.symptoms = ['sym_heat']; go('main'); return true; }
    if (mode === 'vitals') { go('vitals'); return true; }
    if (mode === 'body') { st.symptoms = ['sym_pain']; st.queue = buildQueue(); st.qi = 0; goQ(); st.sel = ['reg_chest', 'reg_arm_l']; render(); return true; }
    if (mode === 'pain') { st.symptoms = ['sym_pain']; st.queue = buildQueue(); st.qi = 2; goQ(); return true; }
    if (mode === 'confirm') { st.symptoms = ['sym_heat']; st.queue = buildQueue(); st.qi = st.queue.indexOf('allergy'); st.pending = { qid: 'allergy', value: 'yes' }; go('confirm'); return true; }
    if (mode === 'summary') {
      st.selLang = 'ur'; st.pLang = 'en'; st.women = true;
      st.startedAt = new Date(Date.now() - 238000);
      st.symptoms = ['sym_heat', 'sym_dizzy'];
      st.queue = buildQueue();
      st.queue.splice(st.queue.indexOf('allergy') + 1, 0, 'allergy_what');
      st.queue.splice(st.queue.indexOf('meds') + 1, 0, 'meds_what');
      st.answers = { onset: 'on_hour', faint: 'yes', vomit: 'yes', drink: 'no', head_hit: 'no', chestpain: 'no' };
      st.safety = {
        allergy: { value: 'yes', ok: true, tries: 1 }, allergy_what: { value: ['al_med'], ok: true, tries: 1 },
        meds: { value: 'yes', ok: true, tries: 1 }, meds_what: { value: ['md_diab', 'md_heart'], ok: true, tries: 1 },
        cond: { value: ['cd_diab', 'cd_bp'], ok: true, tries: 1 }, preg: { value: 'not_applicable', ok: true, tries: 1 },
        meal: { value: 'ml_6', ok: false, tries: 2 }
      };
      st.vitals = { temp: '39.4', pulse: '118', sys: '100', dia: '60', spo2: '96', rr: '24' };
      st.human = [{ t: 95000, f: true, r: 'button' }];
      st.companion = 'no';
      st.interp = { t: 101000, status: 'connected', f: true, lang: 'ur' };
      st.endedAt = Date.now();
      go('summary');
      return true;
    }
    st = blank();
    return false;
  }

  initOffline();
  var mode = new URLSearchParams(location.search).get('demo');
  if (!(mode && demo(mode))) render();
})();
