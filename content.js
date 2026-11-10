/*
 * Sila – Triage-Übersetzer, Klick-Prototyp v0.1 – Inhalte
 *
 * WICHTIG: Alle Texte sind Entwürfe (Claude, 09.11.2026), klinisch nicht geprüft
 * und nicht fachlich übersetzt. Für die acht Startsprachen gibt es bewusst noch
 * keine Übersetzungen: Diese entstehen nach dem Prozess im Prototyp-Plan
 * (zwei unabhängige Fachübersetzungen, Rückübersetzung, kognitive Interviews).
 * Die Fragen sind eine eigene Liste nach allgemeinen Anamnese-Grundsätzen,
 * keine Kopie von CTAS- oder CEDIS-Material.
 */
window.SILA = (function () {
  'use strict';

  // Patientensprachen. has: true = Demo-Texte vorhanden.
  // flags: kleine Zusatzhilfe für Menschen, die nicht lesen (vorläufige Auswahl, Flaggen aus
  // flag-icons, MIT-Lizenz). Arabisch bewusst ohne Flagge (viele Länder); Afghanistan offen,
  // weil zwei Flaggen im Umlauf sind – Entscheidung mit den saudischen Partnern.
  var LANGS = [
    { code: 'en', name: 'English', label: { en: 'English', de: 'Englisch' }, dir: 'ltr', bcp: 'en-GB', has: true, flags: ['gb', 'us'] },
    { code: 'de', name: 'Deutsch', label: { en: 'German', de: 'Deutsch' }, dir: 'ltr', bcp: 'de-DE', has: true, flags: ['de', 'at', 'ch'] },
    { code: 'ar', name: 'العربية', label: { en: 'Arabic', de: 'Arabisch' }, dir: 'rtl', bcp: 'ar-SA', has: false, flags: [] },
    { code: 'ur', name: 'اردو', label: { en: 'Urdu', de: 'Urdu' }, dir: 'rtl', bcp: 'ur-PK', has: false, flags: ['pk', 'in'] },
    { code: 'bn', name: 'বাংলা', label: { en: 'Bengali', de: 'Bengalisch' }, dir: 'ltr', bcp: 'bn-BD', has: false, flags: ['bd', 'in'] },
    { code: 'id', name: 'Bahasa Indonesia', label: { en: 'Indonesian', de: 'Indonesisch' }, dir: 'ltr', bcp: 'id-ID', has: false, flags: ['id'] },
    { code: 'tr', name: 'Türkçe', label: { en: 'Turkish', de: 'Türkisch' }, dir: 'ltr', bcp: 'tr-TR', has: false, flags: ['tr'] },
    { code: 'fa', name: 'فارسی · دری', label: { en: 'Persian (Farsi, Dari)', de: 'Persisch (Farsi, Dari)' }, dir: 'rtl', bcp: 'fa-IR', has: false, flags: ['ir'] },
    { code: 'ha', name: 'Hausa', label: { en: 'Hausa', de: 'Hausa' }, dir: 'ltr', bcp: 'ha-NG', has: false, flags: ['ng', 'ne'] },
    { code: 'fr', name: 'Français', label: { en: 'French', de: 'Französisch' }, dir: 'ltr', bcp: 'fr-FR', has: false, flags: ['sn', 'ml', 'fr'] }
  ];

  // Festphrasen für Patientinnen und Patienten. Dieselben IDs dienen in der
  // Übergabe als Antwortbeschriftung in der Sprache des Personals.
  var P = {
    lang_pick: { en: 'Please tap your language.', de: 'Bitte tippen Sie auf Ihre Sprache.' },
    lang_confirm: { en: 'Your language: {lang}. Is that right?', de: 'Ihre Sprache: {lang}. Stimmt das?' },

    consent_title: { en: 'Before we start', de: 'Bevor wir beginnen' },
    consent_text: {
      en: 'This tablet asks you short questions in your language. Nothing is recorded. Your answers go only to the staff treating you. You can ask for a person at any time.',
      de: 'Dieses Tablet stellt Ihnen kurze Fragen in Ihrer Sprache. Es wird nichts aufgenommen. Ihre Antworten gehen nur an das Personal, das Sie behandelt. Sie können jederzeit nach einem Menschen fragen.'
    },
    consent_q: { en: 'Do you agree?', de: 'Sind Sie einverstanden?' },
    consent_no: { en: 'That is fine. A staff member will help you.', de: 'Das ist in Ordnung. Eine Person vom Personal hilft Ihnen.' },

    women_offer: { en: 'You can ask for a female interpreter or a female staff member.', de: 'Sie können eine Dolmetscherin oder eine Mitarbeiterin anfordern.' },
    women_btn: { en: 'Ask for a woman', de: 'Eine Frau anfordern' },

    human_btn: { en: 'Ask for a person', de: 'Person anfordern' },
    human_wait: { en: 'The staff has been told and is getting help in your language. Please wait.', de: 'Das Personal ist informiert und holt Hilfe in Ihrer Sprache. Bitte warten Sie.' },
    human_wait_f: { en: 'The staff knows that you want a woman and is getting help in your language. Please wait.', de: 'Das Personal weiß, dass Sie eine Frau wünschen, und holt Hilfe in Ihrer Sprache. Bitte warten Sie.' },
    q_companion: { en: 'Is someone with you who can translate for you?', de: 'Ist jemand bei Ihnen, der für Sie übersetzen kann?' },

    yes: { en: 'Yes', de: 'Ja' },
    no: { en: 'No', de: 'Nein' },
    unknown: { en: 'I don’t know', de: 'Weiß nicht' },
    not_applicable: { en: 'Does not apply', de: 'Trifft nicht zu' },
    done: { en: 'Done', de: 'Fertig' },
    ok: { en: 'OK', de: 'OK' },

    q_main: { en: 'What is your main problem? You can tap more than one.', de: 'Was ist Ihr Hauptproblem? Sie können mehreres antippen.' },
    sym_pain: { en: 'Pain', de: 'Schmerzen' },
    sym_chest: { en: 'Chest pain or pressure', de: 'Schmerz oder Druck in der Brust' },
    sym_breath: { en: 'Hard to breathe', de: 'Atemnot' },
    sym_fever: { en: 'Fever or chills', de: 'Fieber oder Schüttelfrost' },
    sym_heat: { en: 'Too much heat or sun', de: 'Zu viel Hitze oder Sonne' },
    sym_dizzy: { en: 'Dizzy or fainted', de: 'Schwindel oder Ohnmacht' },
    sym_vomit: { en: 'Vomiting or diarrhoea', de: 'Erbrechen oder Durchfall' },
    sym_bleed: { en: 'Bleeding or wound', de: 'Blutung oder Wunde' },
    sym_injury: { en: 'Fall or injury', de: 'Sturz oder Verletzung' },
    sym_weak: { en: 'Weakness or numbness', de: 'Schwäche oder Taubheit' },
    sym_other: { en: 'Something else', de: 'Etwas anderes' },

    q_more: { en: 'What else is it? You can tap more than one.', de: 'Was ist es noch? Sie können mehreres antippen.' },
    sym_eye: { en: 'Eye problem', de: 'Problem mit den Augen' },
    sym_ear: { en: 'Ear problem', de: 'Problem mit den Ohren' },
    sym_tooth: { en: 'Toothache', de: 'Zahnschmerzen' },
    sym_skin: { en: 'Skin problem or rash', de: 'Hautproblem oder Ausschlag' },
    sym_urine: { en: 'Problem when passing urine', de: 'Probleme beim Wasserlassen' },
    sym_women: { en: 'Women’s health or pregnancy', de: 'Frauengesundheit oder Schwangerschaft' },
    sym_fear: { en: 'Fear, worry or confusion', de: 'Angst, Sorgen oder Verwirrtheit' },
    sym_lost: { en: 'I lost my group', de: 'Ich habe meine Gruppe verloren' },
    sym_meds_out: { en: 'My medicine has run out', de: 'Meine Medikamente sind aufgebraucht' },
    sym_other2: { en: 'Still something else', de: 'Noch etwas anderes' },

    q_where: { en: 'Where is it? Tap the place on the body.', de: 'Wo ist es? Tippen Sie auf die Stelle am Körper.' },
    side_right: { en: 'your right', de: 'Ihre rechte Seite' },
    side_left: { en: 'your left', de: 'Ihre linke Seite' },
    reg_head: { en: 'Head', de: 'Kopf' },
    reg_neck: { en: 'Neck', de: 'Hals' },
    reg_chest: { en: 'Chest', de: 'Brust' },
    reg_belly: { en: 'Belly', de: 'Bauch' },
    reg_pelvis: { en: 'Lower belly', de: 'Unterbauch' },
    reg_back: { en: 'Back', de: 'Rücken' },
    reg_arm_r: { en: 'Right arm', de: 'Rechter Arm' },
    reg_arm_l: { en: 'Left arm', de: 'Linker Arm' },
    reg_leg_r: { en: 'Right leg', de: 'Rechtes Bein' },
    reg_leg_l: { en: 'Left leg', de: 'Linkes Bein' },

    q_onset: { en: 'When did it start?', de: 'Wann hat es angefangen?' },
    on_hour: { en: 'Less than 1 hour ago', de: 'Vor weniger als 1 Stunde' },
    on_today: { en: 'Today', de: 'Heute' },
    on_days: { en: '1 to 3 days ago', de: 'Vor 1 bis 3 Tagen' },
    on_long: { en: 'More than 3 days ago', de: 'Vor mehr als 3 Tagen' },

    q_pain: { en: 'How strong is the pain? Tap a number. 0 means no pain. 10 means the worst pain.', de: 'Wie stark ist der Schmerz? Tippen Sie auf eine Zahl. 0 heißt kein Schmerz. 10 heißt stärkster Schmerz.' },
    q_breath: { en: 'Is it hard to breathe?', de: 'Fällt Ihnen das Atmen schwer?' },
    q_sweat: { en: 'Are you sweating a lot?', de: 'Schwitzen Sie stark?' },
    q_spread: { en: 'Does the pain go to the arm, the jaw or the back?', de: 'Zieht der Schmerz in den Arm, den Kiefer oder den Rücken?' },
    q_cough: { en: 'Do you have a cough?', de: 'Haben Sie Husten?' },
    q_chestpain: { en: 'Do you have pain in the chest?', de: 'Haben Sie Schmerzen in der Brust?' },
    q_fever: { en: 'Do you have a fever?', de: 'Haben Sie Fieber?' },
    q_faint: { en: 'Did you faint?', de: 'Waren Sie ohnmächtig?' },
    q_drink: { en: 'Can you drink water?', de: 'Können Sie Wasser trinken?' },
    q_vomit: { en: 'Are you vomiting?', de: 'Müssen Sie sich übergeben?' },
    q_vomit_count: { en: 'How many times today?', de: 'Wie oft heute?' },
    cnt_1: { en: '1 or 2 times', de: '1- oder 2-mal' },
    cnt_3: { en: '3 to 5 times', de: '3- bis 5-mal' },
    cnt_6: { en: 'More than 5 times', de: 'Mehr als 5-mal' },
    q_blood_vomit: { en: 'Is there blood in it?', de: 'Ist Blut darin?' },
    q_bleed_now: { en: 'Is it still bleeding a lot?', de: 'Blutet es noch stark?' },
    q_head_hit: { en: 'Did you hit your head?', de: 'Haben Sie sich den Kopf gestoßen?' },
    q_one_side: { en: 'Is one side of the body weak or numb?', de: 'Ist eine Körperseite schwach oder taub?' },
    q_speech: { en: 'Is it hard to speak?', de: 'Fällt Ihnen das Sprechen schwer?' },
    q_free: { en: 'Please say in your own words what is wrong. Tap the microphone and speak.', de: 'Bitte sagen Sie in Ihren eigenen Worten, was los ist. Tippen Sie auf das Mikrofon und sprechen Sie.' },
    free_mic_start: { en: 'Speak', de: 'Sprechen' },
    free_mic_stop: { en: 'Stop', de: 'Stopp' },
    free_or_type: { en: 'Or type here', de: 'Oder hier tippen' },
    free_heard: { en: 'This is how we understood you:', de: 'So haben wir Sie verstanden:' },
    free_ok_q: { en: 'Is that right?', de: 'Stimmt das?' },
    free_no_speech: { en: 'Speaking is not available for your language yet. Please tap “Ask for a person”.', de: 'Sprechen gibt es für Ihre Sprache noch nicht. Bitte tippen Sie auf „Person anfordern".' },
    free_nomic: { en: 'The microphone is not available. Please type or ask for a person.', de: 'Das Mikrofon ist nicht verfügbar. Bitte tippen Sie oder fordern Sie eine Person an.' },
    q_lost: { en: 'The staff will help you to reach your group.', de: 'Das Personal hilft Ihnen, Ihre Gruppe zu erreichen.' },

    q_allergy: { en: 'Are you allergic to anything?', de: 'Haben Sie eine Allergie?' },
    q_allergy_what: { en: 'What are you allergic to? Tap all that fit.', de: 'Wogegen sind Sie allergisch? Tippen Sie alles an, was passt.' },
    al_med: { en: 'Medicine', de: 'Medikamente' },
    al_food: { en: 'Food', de: 'Lebensmittel' },
    al_other: { en: 'Something else', de: 'Etwas anderes' },
    q_meds: { en: 'Do you take medicine every day?', de: 'Nehmen Sie jeden Tag Medikamente?' },
    q_meds_what: { en: 'Which medicine? Tap all that fit. If you have the packet, show it to the staff.', de: 'Welche Medikamente? Tippen Sie alles an, was passt. Wenn Sie die Packung dabeihaben, zeigen Sie sie dem Personal.' },
    md_blood: { en: 'Medicine that thins the blood', de: 'Mittel zur Blutverdünnung' },
    md_diab: { en: 'Medicine for diabetes or insulin', de: 'Mittel gegen Diabetes oder Insulin' },
    md_heart: { en: 'Medicine for the heart or blood pressure', de: 'Mittel für Herz oder Blutdruck' },
    md_lung: { en: 'Inhaler for asthma', de: 'Spray gegen Asthma' },
    md_other: { en: 'Other medicine', de: 'Andere Medikamente' },
    q_cond: { en: 'Do you have one of these illnesses? Tap all that fit.', de: 'Haben Sie eine dieser Krankheiten? Tippen Sie alles an, was passt.' },
    cd_diab: { en: 'Diabetes', de: 'Zuckerkrankheit (Diabetes)' },
    cd_heart: { en: 'Heart disease', de: 'Herzkrankheit' },
    cd_bp: { en: 'High blood pressure', de: 'Bluthochdruck' },
    cd_lung: { en: 'Lung disease or asthma', de: 'Lungenkrankheit oder Asthma' },
    cd_kidney: { en: 'Kidney disease', de: 'Nierenkrankheit' },
    cd_none: { en: 'None of these', de: 'Keine davon' },
    q_preg: { en: 'Could you be pregnant?', de: 'Könnten Sie schwanger sein?' },
    q_meal: { en: 'When did you last eat?', de: 'Wann haben Sie zuletzt gegessen?' },
    ml_2: { en: 'Less than 2 hours ago', de: 'Vor weniger als 2 Stunden' },
    ml_6: { en: '2 to 6 hours ago', de: 'Vor 2 bis 6 Stunden' },
    ml_more: { en: 'More than 6 hours ago', de: 'Vor mehr als 6 Stunden' },

    confirm_q: { en: 'You answered: {answer}. Is that right?', de: 'Ihre Antwort: {answer}. Stimmt das?' },
    end_patient: { en: 'Thank you. The staff will now look at your answers. Please stay here.', de: 'Danke. Das Personal sieht sich jetzt Ihre Antworten an. Bitte bleiben Sie hier.' },
    give_back: { en: 'Please give the tablet back to the staff.', de: 'Bitte geben Sie das Tablet dem Personal zurück.' }
  };

  // Oberfläche und Übergabe für das Personal.
  var S = {
    subtitle: { en: 'Triage Translator · click prototype v0.4', de: 'Triage-Übersetzer · Klick-Prototyp v0.4' },
    demo_banner: {
      en: 'Demo. Phrases are drafts, not clinically reviewed and not professionally translated. Do not use with real patients.',
      de: 'Demo. Die Phrasen sind Entwürfe, klinisch nicht geprüft und nicht fachlich übersetzt. Nicht bei echten Patientinnen und Patienten verwenden.'
    },
    for_staff: { en: 'For staff', de: 'Für das Personal' },
    staff_btn: { en: 'Staff', de: 'Personal' },
    new_patient: { en: 'New patient', de: 'Neuer Patient' },
    new_patient_hint: { en: 'Then hand the tablet to the patient.', de: 'Danach das Tablet der Patientin oder dem Patienten geben.' },
    staff_lang: { en: 'Staff language', de: 'Sprache des Personals' },
    women_mode: { en: 'Women’s mode', de: 'Frauenmodus' },
    women_mode_hint: { en: 'Offers a female interpreter or staff member and notes it in the handover.', de: 'Bietet eine Dolmetscherin oder Mitarbeiterin an und vermerkt das in der Übergabe.' },
    tts: { en: 'Read aloud automatically', de: 'Automatisch vorlesen' },
    tts_hint: {
      en: 'Every text has a speaker button that reads it aloud. “On” also reads each new question automatically. The demo uses the device voice; the real system plays phrases recorded by interpreters.',
      de: 'Neben jedem Text steht ein Lautsprecher-Knopf, der ihn vorliest. „An" liest zusätzlich jede neue Frage automatisch vor. Die Demo nutzt die Gerätestimme; das echte System spielt von Dolmetschern eingesprochene Phrasen ab.'
    },
    say_label: { en: 'Read aloud', de: 'Vorlesen' },
    on: { en: 'On', de: 'An' },
    off: { en: 'Off', de: 'Aus' },
    offline: { en: 'Offline storage', de: 'Offline-Speicher' },
    persist_yes: { en: 'permanent, app works without internet', de: 'dauerhaft, App läuft ohne Internet' },
    persist_no: { en: 'cached, but the browser may delete it when storage is low', de: 'zwischengespeichert, der Browser darf ihn bei Speicherknappheit löschen' },
    persist_na: { en: 'not active (open the app through a local server, see README)', de: 'nicht aktiv (App über einen lokalen Server öffnen, siehe README)' },
    principles: { en: 'Fixed phrases only. No diagnosis and no triage suggestion. Nothing is stored after the case ends.', de: 'Nur feste Phrasen. Keine Diagnose und kein Triage-Vorschlag. Nach Fallende wird nichts gespeichert.' },
    missing_tr: { en: 'There is no translation for {lang} yet. The demo continues in English. The language is noted in the handover.', de: 'Für {lang} gibt es noch keine Übersetzung. Die Demo läuft auf Englisch weiter. Die Sprache wird in der Übergabe vermerkt.' },
    continue: { en: 'Continue', de: 'Weiter' },
    consent_refused: { en: 'The patient declined. Use an interpreter or your usual procedure.', de: 'Die Person hat abgelehnt. Bitte Dolmetscher oder das übliche Vorgehen nutzen.' },
    to_home: { en: 'Back to start', de: 'Zurück zum Start' },
    human_req: { en: 'The patient asked for a person.', de: 'Die Person möchte mit einem Menschen sprechen.' },
    human_req_f: { en: 'The patient asked for a woman (interpreter or staff member).', de: 'Die Person wünscht eine Frau (Dolmetscherin oder Mitarbeiterin).' },
    auto_other: { en: 'Requested automatically: the patient chose “Still something else”.', de: 'Automatisch angefordert: Die Person hat „Noch etwas anderes" gewählt.' },
    auto_lost: { en: 'Requested automatically: the patient has lost their group. Please help to reach the group.', de: 'Automatisch angefordert: Die Person hat ihre Gruppe verloren. Bitte beim Kontakt zur Gruppe helfen.' },
    human_lang: { en: 'Language: {lang}.', de: 'Sprache: {lang}.' },
    human_companion_yes: { en: 'A companion can translate.', de: 'Eine Begleitperson kann übersetzen.' },
    human_companion_no: { en: 'No companion who can translate.', de: 'Keine Begleitperson, die übersetzen kann.' },
    call_interp: { en: 'Call video interpreter for {lang} (simulated)', de: 'Video-Dolmetschung für {lang} rufen (simuliert)' },
    call_interp_f: { en: 'Call female video interpreter for {lang} (simulated)', de: 'Video-Dolmetscherin für {lang} rufen (simuliert)' },
    interp_connecting: { en: 'Connecting to an interpreter for {lang} … Demo, no real connection.', de: 'Verbindung zu einer Dolmetschung für {lang} wird aufgebaut … Demo, keine echte Verbindung.' },
    interp_connected: { en: 'Connected (simulated). In the real system an interpreter from the pool joins by video, first from residents in the Kingdom.', de: 'Verbunden (simuliert). Im echten System kommt eine Person aus dem Dolmetscherpool per Video dazu, zuerst aus Residenten im Königreich.' },
    resume: { en: 'Back to the questions', de: 'Zurück zu den Fragen' },
    staff_menu: { en: 'Staff menu', de: 'Menü für das Personal' },
    to_vitals: { en: 'Enter vital signs', de: 'Vitalzeichen eingeben' },
    to_summary: { en: 'Show handover', de: 'Zur Übergabe' },
    end_case: { en: 'End case and delete data', de: 'Fall beenden und Daten löschen' },
    end_case_confirm: { en: 'End the case? All answers on this device will be deleted.', de: 'Fall beenden? Alle Antworten auf diesem Gerät werden gelöscht.' },
    patient_done: { en: 'Staff: continue to vital signs', de: 'Personal: weiter zu den Vitalzeichen' },

    vitals_title: { en: 'Vital signs (measured by staff)', de: 'Vitalzeichen (vom Personal gemessen)' },
    vit_temp: { en: 'Temperature (°C)', de: 'Temperatur (°C)' },
    vit_pulse: { en: 'Pulse (per minute)', de: 'Puls (pro Minute)' },
    vit_sys: { en: 'Blood pressure, systolic (mmHg)', de: 'Blutdruck systolisch (mmHg)' },
    vit_dia: { en: 'Blood pressure, diastolic (mmHg)', de: 'Blutdruck diastolisch (mmHg)' },
    vit_spo2: { en: 'Oxygen saturation (%)', de: 'Sauerstoffsättigung (%)' },
    vit_rr: { en: 'Breathing rate (per minute)', de: 'Atemfrequenz (pro Minute)' },
    vit_missing: { en: 'Required values missing: {list}', de: 'Es fehlen Pflichtwerte: {list}' },
    vit_complete: { en: 'All required values entered.', de: 'Alle Pflichtwerte sind eingetragen.' },
    no_category: { en: 'Sila does not suggest a triage category. Staff decide using the clinic’s system.', de: 'Sila schlägt keine Triage-Kategorie vor. Das Personal entscheidet nach dem System der Klinik.' },

    summary_title: { en: 'Handover', de: 'Übergabe' },
    sum_lang: { en: 'Patient language', de: 'Sprache der Person' },
    sum_lang_demo: { en: 'demo ran in English, no translation yet', de: 'Demo lief auf Englisch, noch keine Übersetzung' },
    sum_women: { en: 'Women’s mode', de: 'Frauenmodus' },
    sum_consent: { en: 'Consent', de: 'Einwilligung' },
    sum_main: { en: 'Main problem', de: 'Hauptproblem' },
    sum_answers: { en: 'Answers', de: 'Antworten' },
    sum_safety: { en: 'Safety questions', de: 'Sicherheitsfragen' },
    sum_vitals: { en: 'Vital signs', de: 'Vitalzeichen' },
    sum_time: { en: 'Start and duration', de: 'Beginn und Dauer' },
    sum_human: { en: 'Requests for a person', de: 'Anfragen nach einem Menschen' },
    sum_companion: { en: 'Companion who can translate', de: 'Begleitperson, die übersetzen kann' },
    sum_interp: { en: 'Interpreter', de: 'Dolmetschung' },
    sum_interp_val: { en: 'video interpreter requested at {t} (simulated)', de: 'Video-Dolmetschung angefordert bei {t} (simuliert)' },
    sum_none: { en: 'none', de: 'keine' },
    confirmed: { en: 'confirmed by the patient', de: 'von der Person bestätigt' },
    not_confirmed: { en: 'NOT confirmed, clarify with an interpreter', de: 'NICHT bestätigt, mit Dolmetscher klären' },
    missing_value: { en: 'missing', de: 'fehlt' },
    triage_cat: { en: 'Triage category (assigned by staff with the clinic’s system)', de: 'Triage-Kategorie (vergibt das Personal nach dem System der Klinik)' },
    sum_note: {
      en: 'Pre-translated fixed phrases. Safety answers were repeated to the patient and confirmed. No diagnosis and no triage suggestion by the system. Demo version, not validated.',
      de: 'Vorübersetzte feste Phrasen. Sicherheitsantworten wurden der Person wiederholt und bestätigt. Keine Diagnose und kein Triage-Vorschlag durch das System. Demo-Fassung, nicht validiert.'
    },
    qr_hint: { en: 'QR code: compact record without name, for transfer to the record system.', de: 'QR-Code: kompakter Datensatz ohne Namen, zur Übernahme ins Aktensystem.' },
    qr_data: { en: 'Show QR content', de: 'Inhalt des QR-Codes anzeigen' },
    print: { en: 'Print', de: 'Drucken' },
    export_log: { en: 'Export test log (JSON)', de: 'Testprotokoll exportieren (JSON)' },
    minutes: { en: 'min', de: 'Min.' },

    lbl_where: { en: 'Location', de: 'Ort' },
    lbl_onset: { en: 'Onset', de: 'Beginn' },
    lbl_pain: { en: 'Pain score (0–10)', de: 'Schmerzwert (0–10)' },
    lbl_breath: { en: 'Difficulty breathing', de: 'Atemnot' },
    lbl_sweat: { en: 'Heavy sweating', de: 'Starkes Schwitzen' },
    lbl_spread: { en: 'Pain radiating to arm, jaw or back', de: 'Ausstrahlung in Arm, Kiefer oder Rücken' },
    lbl_cough: { en: 'Cough', de: 'Husten' },
    lbl_chestpain: { en: 'Chest pain', de: 'Brustschmerz' },
    lbl_fever: { en: 'Fever (reported)', de: 'Fieber (berichtet)' },
    lbl_faint: { en: 'Fainted', de: 'Ohnmacht' },
    lbl_drink: { en: 'Able to drink', de: 'Kann trinken' },
    lbl_vomit: { en: 'Vomiting', de: 'Erbrechen' },
    lbl_vomit_count: { en: 'Vomiting today', de: 'Erbrechen heute' },
    lbl_blood_vomit: { en: 'Blood in vomit', de: 'Blut im Erbrochenen' },
    lbl_bleed_now: { en: 'Still bleeding heavily', de: 'Blutet noch stark' },
    lbl_head_hit: { en: 'Hit the head', de: 'Kopfanprall' },
    lbl_one_side: { en: 'One-sided weakness or numbness', de: 'Einseitige Schwäche oder Taubheit' },
    lbl_speech: { en: 'Difficulty speaking', de: 'Schwierigkeiten beim Sprechen' },
    lbl_other: { en: 'Other problem, clarify in person', de: 'Anderes Anliegen, persönlich klären' },
    lbl_lost: { en: 'Lost group', de: 'Gruppe verloren' },
    lbl_free: { en: 'Free description', de: 'Freie Angabe' },
    auto_free: { en: 'Requested automatically: the free description could not be confirmed.', de: 'Automatisch angefordert: Die freie Angabe ließ sich nicht bestätigen.' },
    free_note: {
      en: 'Demo: the browser’s speech recognition sends audio to the browser vendor. Use only with role-play cases. Translation runs on the device if the browser supports it.',
      de: 'Demo: Die Spracherkennung des Browsers schickt Ton an den Browser-Anbieter. Nur mit gespielten Fällen verwenden. Die Übersetzung läuft auf dem Gerät, wenn der Browser das kann.'
    },
    free_mt: { en: 'machine-translated, unverified', de: 'maschinell übersetzt, ungeprüft' },
    free_no_tr: { en: 'no translation available in this browser, original text only', de: 'keine Übersetzung in diesem Browser, nur Originaltext' },
    free_orig: { en: 'Original', de: 'Original' },
    free_busy: { en: 'Translating …', de: 'Wird übersetzt …' },
    draft_tr: {
      en: 'For {lang} there is a draft translation by Claude that native speakers have not yet checked. Only for demonstrations and tests with native speakers.',
      de: 'Für {lang} gibt es eine Entwurfsübersetzung von Claude, die Muttersprachler noch nicht geprüft haben. Nur für Vorführungen und Tests mit Muttersprachlern.'
    },
    draft_banner: { en: '{lang}: draft translation by Claude, not yet checked by native speakers.', de: '{lang}: Entwurfsübersetzung von Claude, von Muttersprachlern noch nicht geprüft.' },
    sum_lang_draft: { en: 'draft translation, unverified', de: 'Entwurfsübersetzung, ungeprüft' },
    lbl_more: { en: 'Further problems', de: 'Weitere Anliegen' },
    lbl_allergy: { en: 'Allergy', de: 'Allergie' },
    lbl_allergy_what: { en: 'Allergic to', de: 'Allergisch gegen' },
    lbl_meds: { en: 'Daily medication', de: 'Dauermedikation' },
    lbl_meds_what: { en: 'Type of medication', de: 'Art der Medikamente' },
    lbl_cond: { en: 'Known conditions', de: 'Vorerkrankungen' },
    lbl_preg: { en: 'Possible pregnancy', de: 'Mögliche Schwangerschaft' },
    lbl_meal: { en: 'Last meal', de: 'Letzte Mahlzeit' }
  };

  // Fragen. type: yn = Ja/Nein/Weiß nicht, single, multi, scale (0–10), body, info.
  // safety: Antwort wird wiederholt und muss bestätigt werden.
  // then: Folgefrage abhängig von der bestätigten Antwort.
  var Q = {
    where: { type: 'body', text: 'q_where', label: 'lbl_where' },
    onset: { type: 'single', text: 'q_onset', label: 'lbl_onset', icon: 'clock', options: ['on_hour', 'on_today', 'on_days', 'on_long'] },
    pain: { type: 'scale', text: 'q_pain', label: 'lbl_pain', icon: 'pain' },
    breath: { type: 'yn', text: 'q_breath', label: 'lbl_breath', icon: 'breath' },
    sweat: { type: 'yn', text: 'q_sweat', label: 'lbl_sweat', icon: 'sweat' },
    spread: { type: 'yn', text: 'q_spread', label: 'lbl_spread', icon: 'chest' },
    cough: { type: 'yn', text: 'q_cough', label: 'lbl_cough', icon: 'cough' },
    chestpain: { type: 'yn', text: 'q_chestpain', label: 'lbl_chestpain', icon: 'chest' },
    fever: { type: 'yn', text: 'q_fever', label: 'lbl_fever', icon: 'fever' },
    faint: { type: 'yn', text: 'q_faint', label: 'lbl_faint', icon: 'dizzy' },
    drink: { type: 'yn', text: 'q_drink', label: 'lbl_drink', icon: 'water' },
    vomit: { type: 'yn', text: 'q_vomit', label: 'lbl_vomit', icon: 'vomit' },
    vomit_count: { type: 'single', text: 'q_vomit_count', label: 'lbl_vomit_count', icon: 'vomit', options: ['cnt_1', 'cnt_3', 'cnt_6'] },
    blood_vomit: { type: 'yn', text: 'q_blood_vomit', label: 'lbl_blood_vomit', icon: 'bleed' },
    bleed_now: { type: 'yn', text: 'q_bleed_now', label: 'lbl_bleed_now', icon: 'bleed' },
    head_hit: { type: 'yn', text: 'q_head_hit', label: 'lbl_head_hit', icon: 'injury' },
    one_side: { type: 'yn', text: 'q_one_side', label: 'lbl_one_side', icon: 'weak' },
    speech: { type: 'yn', text: 'q_speech', label: 'lbl_speech', icon: 'speech' },
    other: { type: 'free', text: 'q_free', label: 'lbl_free', icon: 'speech' },
    lost: { type: 'info', text: 'q_lost', label: 'lbl_lost', icon: 'group', autoHuman: 'lost' },
    more: { type: 'board', text: 'q_more', label: 'lbl_more', icon: 'other' },

    allergy: { type: 'yn', text: 'q_allergy', label: 'lbl_allergy', icon: 'allergy', safety: true, then: { yes: ['allergy_what'] } },
    allergy_what: { type: 'multi', text: 'q_allergy_what', label: 'lbl_allergy_what', icon: 'allergy', safety: true, options: ['al_med', 'al_food', 'al_other'] },
    meds: { type: 'yn', text: 'q_meds', label: 'lbl_meds', icon: 'pill', safety: true, then: { yes: ['meds_what'] } },
    meds_what: { type: 'multi', text: 'q_meds_what', label: 'lbl_meds_what', icon: 'pill', safety: true, options: ['md_blood', 'md_diab', 'md_heart', 'md_lung', 'md_other'] },
    cond: { type: 'multi', text: 'q_cond', label: 'lbl_cond', icon: 'cond', safety: true, options: ['cd_diab', 'cd_heart', 'cd_bp', 'cd_lung', 'cd_kidney', 'cd_none'], exclusive: ['cd_none'] },
    preg: { type: 'single', text: 'q_preg', label: 'lbl_preg', icon: 'preg', safety: true, options: ['yes', 'no', 'unknown', 'not_applicable'] },
    meal: { type: 'single', text: 'q_meal', label: 'lbl_meal', icon: 'meal', safety: true, options: ['ml_2', 'ml_6', 'ml_more'] }
  };

  // Leitsymptome mit Folgefragen (eigene Liste, keine CEDIS-Kopie).
  var SYMPTOMS = [
    { id: 'sym_pain', icon: 'pain', follow: ['where', 'onset', 'pain'] },
    { id: 'sym_chest', icon: 'chest', follow: ['onset', 'pain', 'spread', 'breath', 'sweat'] },
    { id: 'sym_breath', icon: 'breath', follow: ['onset', 'chestpain', 'cough', 'fever'] },
    { id: 'sym_fever', icon: 'fever', follow: ['onset', 'cough', 'vomit', 'drink'] },
    { id: 'sym_heat', icon: 'heat', follow: ['onset', 'faint', 'vomit', 'drink'] },
    { id: 'sym_dizzy', icon: 'dizzy', follow: ['onset', 'faint', 'head_hit', 'chestpain'] },
    { id: 'sym_vomit', icon: 'vomit', follow: ['onset', 'vomit_count', 'blood_vomit', 'drink'] },
    { id: 'sym_bleed', icon: 'bleed', follow: ['where', 'onset', 'bleed_now'] },
    { id: 'sym_injury', icon: 'injury', follow: ['where', 'onset', 'pain', 'head_hit'] },
    { id: 'sym_weak', icon: 'weak', follow: ['onset', 'one_side', 'speech'] },
    { id: 'sym_other', icon: 'other', follow: ['more'] }
  ];

  // Zweite Bildtafel hinter „Etwas anderes", damit weniger Fälle in einer Sackgasse enden.
  var SYMPTOMS2 = [
    { id: 'sym_eye', icon: 'eye', follow: ['onset', 'pain'] },
    { id: 'sym_ear', icon: 'ear', follow: ['onset', 'pain', 'fever'] },
    { id: 'sym_tooth', icon: 'tooth', follow: ['onset', 'pain'] },
    { id: 'sym_skin', icon: 'skin', follow: ['onset', 'fever'] },
    { id: 'sym_urine', icon: 'urine', follow: ['onset', 'pain', 'fever'] },
    { id: 'sym_women', icon: 'woman', follow: ['onset', 'pain'] },
    { id: 'sym_fear', icon: 'fear', follow: ['onset'] },
    { id: 'sym_lost', icon: 'group', follow: ['lost'] },
    { id: 'sym_meds_out', icon: 'pill', follow: [] },
    { id: 'sym_other2', icon: 'other', follow: ['other'] }
  ];

  // Sicherheitsfragen, immer, in dieser Reihenfolge.
  var SAFETY = ['allergy', 'meds', 'cond', 'preg', 'meal'];

  // Körperkarte, Vorderansicht. Die rechte Körperseite der Person liegt
  // für die Betrachtenden links.
  var BODY = [
    { id: 'reg_head', shape: 'circle', a: { cx: 100, cy: 38, r: 26 } },
    { id: 'reg_neck', shape: 'rect', a: { x: 88, y: 64, width: 24, height: 18, rx: 4 } },
    { id: 'reg_chest', shape: 'rect', a: { x: 60, y: 82, width: 80, height: 68, rx: 14 } },
    { id: 'reg_belly', shape: 'rect', a: { x: 62, y: 150, width: 76, height: 50, rx: 6 } },
    { id: 'reg_pelvis', shape: 'rect', a: { x: 62, y: 200, width: 76, height: 42, rx: 10 } },
    { id: 'reg_arm_r', shape: 'rect', a: { x: 28, y: 86, width: 28, height: 146, rx: 13 } },
    { id: 'reg_arm_l', shape: 'rect', a: { x: 144, y: 86, width: 28, height: 146, rx: 13 } },
    { id: 'reg_leg_r', shape: 'rect', a: { x: 64, y: 244, width: 33, height: 150, rx: 14 } },
    { id: 'reg_leg_l', shape: 'rect', a: { x: 103, y: 244, width: 33, height: 150, rx: 14 } }
  ];

  // Platzhalter-Piktogramme (eigene einfache Linienzeichnungen, 48 × 48),
  // nicht nach ISO 9186 getestet.
  var ICONS = {
    pain: '<path d="M27 4 12 27h11l-3 17 16-24H25z"/>',
    chest: '<path d="M24 41C10 31 5 23 5 16a9.5 9.5 0 0 1 19-3 9.5 9.5 0 0 1 19 3c0 7-5 15-19 25z"/>',
    breath: '<path d="M24 5v15"/><path d="M24 19c-3 0-5-1-7-4-3-4-11 3-11 15 0 7 2 11 6 11 6 0 10-6 12-11z"/><path d="M24 19c3 0 5-1 7-4 3-4 11 3 11 15 0 7-2 11-6 11-6 0-10-6-12-11z"/>',
    fever: '<path d="M20 29V9a4 4 0 0 1 8 0v20a9 9 0 1 1-8 0z"/><path d="M24 15v18"/><circle cx="24" cy="36" r="3" fill="currentColor"/>',
    heat: '<circle cx="24" cy="24" r="8"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/>',
    dizzy: '<path d="M25 24a2 2 0 1 0-2-2c0 3 3 5 6 5a6 6 0 0 0 6-6c0-5-4-9-10-9S14 16 14 23s5 13 12 13 15-6 15-14"/>',
    vomit: '<circle cx="24" cy="24" r="18"/><path d="M16 19h4M28 19h4"/><path d="M15 31c3-3 6 3 9 0s6 3 9 0"/>',
    bleed: '<path d="M24 5C17 16 12 23 12 30a12 12 0 0 0 24 0c0-7-5-14-12-25z"/>',
    injury: '<rect x="6" y="18" width="36" height="12" rx="6" transform="rotate(-45 24 24)"/><path d="M21 21h.1M27 27h.1M27 21h.1M21 27h.1"/>',
    weak: '<rect x="5" y="15" width="33" height="18" rx="3"/><path d="M42 21v6"/><rect x="9" y="19" width="6" height="10" fill="currentColor"/>',
    other: '<path d="M17 17a7 7 0 1 1 10 6c-2 1-3 2-3 5v2"/><circle cx="24" cy="37" r="1.6" fill="currentColor"/>',
    clock: '<circle cx="24" cy="24" r="18"/><path d="M24 13v11l8 5"/>',
    allergy: '<path d="M24 6 44 40H4z"/><path d="M24 18v10"/><circle cx="24" cy="34" r="1.6" fill="currentColor"/>',
    pill: '<rect x="5" y="17" width="38" height="14" rx="7" transform="rotate(-35 24 24)"/><path d="M19 16l10 16"/>',
    cond: '<rect x="11" y="8" width="26" height="34" rx="3"/><path d="M19 8V5h10v3M17 19h14M17 26h14M17 33h8"/>',
    preg: '<circle cx="22" cy="8" r="4"/><path d="M22 13c-4 2-5 7-4 11 1 3 3 4 3 7v13M22 13c3 0 7 4 9 10 2 6-2 10-7 10M26 33v11"/>',
    meal: '<path d="M6 25h36a18 13 0 0 1-36 0z"/><path d="M15 19c0-4 4-4 4-8M24 19c0-4 4-4 4-8M33 19c0-4 4-4 4-8"/>',
    water: '<path d="M14 8h20l-3 34H17z"/><path d="M15 18h18"/>',
    sweat: '<circle cx="20" cy="22" r="14"/><path d="M14 20h3M23 20h3M15 28c3 2 7 2 10 0"/><path d="M38 6c-3 5-5 8-5 11a5 5 0 0 0 10 0c0-3-2-6-5-11z"/>',
    cough: '<path d="M6 18h22a5 5 0 1 0-5-5M6 26h30a5 5 0 1 1-5 5M6 34h14"/>',
    speech: '<path d="M8 10h32v22H22l-9 8v-8H8z"/><path d="M16 21h16"/>',
    yes: '<path d="M10 25l9 9 19-20"/>',
    no: '<path d="M13 13l22 22M35 13 13 35"/>',
    unknown: '<path d="M17 17a7 7 0 1 1 10 6c-2 1-3 2-3 5v2"/><circle cx="24" cy="37" r="1.6" fill="currentColor"/>',
    not_applicable: '<circle cx="24" cy="24" r="17"/><path d="M14 24h20"/>',
    person: '<circle cx="24" cy="14" r="7"/><path d="M10 42c0-9 6-15 14-15s14 6 14 15"/>',
    woman: '<circle cx="24" cy="11" r="6"/><path d="M24 18l-10 19h20z"/><path d="M20 37v7M28 37v7"/>',
    speaker: '<path d="M8 19h8l10-8v26l-10-8H8z"/><path d="M32 18c3 3 3 9 0 12M36 14c6 6 6 14 0 20"/>',
    back: '<path d="M14 6h20v36H14z"/><path d="M24 12v24"/>',
    mic: '<rect x="18" y="5" width="12" height="23" rx="6"/><path d="M11 22a13 13 0 0 0 26 0M24 35v8M17 43h14"/>',
    eye: '<path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z"/><circle cx="24" cy="24" r="6"/>',
    ear: '<path d="M15 19a10 10 0 1 1 20 0c0 6-6 8-6 14a6 6 0 0 1-12 0"/><path d="M21 19a4 4 0 0 1 8 0c0 3-3 4-3 6"/>',
    tooth: '<path d="M14 8c4-2 7 1 10 1s6-3 10-1c5 3 3 12 1 17-2 6-2 15-5 15s-3-9-6-9-3 9-6 9-3-9-5-15c-2-5-4-14 1-17z"/>',
    skin: '<rect x="7" y="9" width="34" height="30" rx="7"/><circle cx="17" cy="19" r="2" fill="currentColor"/><circle cx="29" cy="17" r="2" fill="currentColor"/><circle cx="22" cy="29" r="2" fill="currentColor"/><circle cx="32" cy="29" r="2" fill="currentColor"/>',
    urine: '<path d="M12 7h12v14H12z"/><path d="M7 21h34c0 8-6 13-13 13h-3l2 7H16l2-7c-7-1-11-6-11-13z"/>',
    fear: '<circle cx="24" cy="24" r="18"/><path d="M15 20l5-3M33 20l-5-3"/><circle cx="18" cy="23" r="1.6" fill="currentColor"/><circle cx="30" cy="23" r="1.6" fill="currentColor"/><path d="M17 34c4-4 10-4 14 0"/>',
    group: '<circle cx="14" cy="15" r="5"/><circle cx="34" cy="15" r="5"/><circle cx="24" cy="11" r="5"/><path d="M4 38c0-7 4-12 10-12M44 38c0-7-4-12-10-12M14 40c0-8 4-14 10-14s10 6 10 14"/>'
  };

  // Eingesprochene Aufnahmen. Sobald es sie gibt, hier je Sprache und Phrase eintragen,
  // z. B. AUDIO.ur = { q_breath: 'audio/ur/q_breath_f.mp3', lang_name: 'audio/ur/lang_name.mp3' }.
  // Die App spielt dann die Aufnahme statt der Gerätestimme ab. Dateien auch in sw.js aufnehmen.
  var AUDIO = {};

  Q.more.options = SYMPTOMS2.map(function (s) { return s.id; });

  // Freies Sprechen nur, wo die Spracherkennung laut Plan voraussichtlich trägt (Gruppe 1)
  // und für die Demo-Sprachen; Urdu und Persisch erst nach Messung, Bengali und Hausa nicht.
  var FREE_LANGS = ['ar', 'tr', 'id', 'fr', 'en', 'de'];

  // Entwurfsübersetzungen (drafts.js) einmischen und die Sprachen als Entwurf markieren
  var D = window.SILA_DRAFTS || {};
  Object.keys(D).forEach(function (code) {
    if (code === 'meta') return;
    Object.keys(D[code]).forEach(function (k) { if (P[k]) P[k][code] = D[code][k]; });
    LANGS.forEach(function (l) { if (l.code === code) { l.has = true; l.draft = true; } });
  });

  return { LANGS: LANGS, P: P, S: S, Q: Q, SYMPTOMS: SYMPTOMS, SYMPTOMS2: SYMPTOMS2, SAFETY: SAFETY, BODY: BODY, ICONS: ICONS, AUDIO: AUDIO, FREE_LANGS: FREE_LANGS, VERSION: '0.4.0' };
})();
