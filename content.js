/*
 * Sila – MVP v0.5 – Inhalte
 *
 * Eine Software, drei Wege, eine Übergabe:
 *   Selbstauskunft – die Person antwortet selbst (Tablet der Klinik oder eigenes Handy)
 *   Gespräch       – das Personal spielt feste Sätze ab, die Person antwortet mit Ja, Nein oder Zeigen
 *   Helfer im Feld – Satzbuch für Freiwillige, ohne Falldaten
 *
 * WICHTIG: Alle Texte sind Entwürfe (Claude, Stand 14.11.2026), klinisch nicht geprüft.
 * Quelltexte hier auf Englisch und Deutsch. Alle weiteren Sprachen liegen als ungeprüfte
 * Entwurfsübersetzungen in lang/<code>.js und werden unten eingemischt. Vor jedem Einsatz:
 * Übersetzungsprozess aus dem Prototyp-Plan (zwei Fachübersetzungen, Rückübersetzung,
 * kognitive Interviews, klinische Freigabe).
 * Die Fragen sind eine eigene Liste nach allgemeinen Anamnese-Grundsätzen,
 * keine Kopie von CTAS- oder CEDIS-Material.
 */
window.SILA = (function () {
  'use strict';

  // Patientensprachen in der Reihenfolge der Sprachwahl (häufige Pilgersprachen zuerst).
  // word: das Wort „Sprache" in dieser Sprache, für die Überschrift der Sprachwahl.
  // flags: kleine Zusatzhilfe für Menschen, die nicht lesen (vorläufige Auswahl, flag-icons, MIT).
  // Arabisch bewusst ohne Flagge (viele Länder); Afghanistan offen, weil zwei Flaggen im Umlauf sind.
  var LANGS = [
    { code: 'ur', name: 'اردو', word: 'زبان', label: { en: 'Urdu', de: 'Urdu', ar: 'الأردية' }, dir: 'rtl', bcp: 'ur-PK', flags: ['pk', 'in'] },
    { code: 'ar', name: 'العربية', word: 'اللغة', label: { en: 'Arabic', de: 'Arabisch', ar: 'العربية' }, dir: 'rtl', bcp: 'ar-SA', flags: [] },
    { code: 'id', name: 'Bahasa Indonesia', word: 'Bahasa', label: { en: 'Indonesian', de: 'Indonesisch', ar: 'الإندونيسية' }, dir: 'ltr', bcp: 'id-ID', flags: ['id'] },
    { code: 'tr', name: 'Türkçe', word: 'Dil', label: { en: 'Turkish', de: 'Türkisch', ar: 'التركية' }, dir: 'ltr', bcp: 'tr-TR', flags: ['tr'] },
    { code: 'bn', name: 'বাংলা', word: 'ভাষা', label: { en: 'Bengali', de: 'Bengalisch', ar: 'البنغالية' }, dir: 'ltr', bcp: 'bn-BD', flags: ['bd', 'in'] },
    { code: 'fa', name: 'فارسی · دری', word: 'زبان', label: { en: 'Persian (Farsi, Dari)', de: 'Persisch (Farsi, Dari)', ar: 'الفارسية (الدرية)' }, dir: 'rtl', bcp: 'fa-IR', flags: ['ir'] },
    { code: 'ha', name: 'Hausa', word: 'Harshe', label: { en: 'Hausa', de: 'Hausa', ar: 'الهوسا' }, dir: 'ltr', bcp: 'ha-NG', flags: ['ng', 'ne'] },
    { code: 'fr', name: 'Français', word: 'Langue', label: { en: 'French', de: 'Französisch', ar: 'الفرنسية' }, dir: 'ltr', bcp: 'fr-FR', flags: ['sn', 'ml', 'fr'] },
    { code: 'en', name: 'English', word: 'Language', label: { en: 'English', de: 'Englisch', ar: 'الإنجليزية' }, dir: 'ltr', bcp: 'en-GB', has: true, flags: ['gb', 'us'] },
    { code: 'de', name: 'Deutsch', word: 'Sprache', label: { en: 'German', de: 'Deutsch', ar: 'الألمانية' }, dir: 'ltr', bcp: 'de-DE', has: true, flags: ['de', 'at', 'ch'] }
  ];

  // Sprachen der Bedienoberfläche für das Personal
  var STAFF_LANGS = [
    { code: 'ar', name: 'العربية', short: 'ع', dir: 'rtl', loc: 'ar-SA' },
    { code: 'en', name: 'English', short: 'EN', dir: 'ltr', loc: 'en-GB' },
    { code: 'de', name: 'Deutsch', short: 'DE', dir: 'ltr', loc: 'de-DE' }
  ];

  // Festphrasen für Pilgerinnen und Pilger. Dieselben IDs dienen in der Übergabe
  // als Antwortbeschriftung in der Sprache des Personals.
  var P = {
    // ----- Sprache, Einwilligung, Bedienung -----
    lang_pick: { en: 'Please tap your language.', de: 'Bitte tippen Sie auf Ihre Sprache.' },
    lang_confirm: { en: 'Your language: {lang}. Is that right?', de: 'Ihre Sprache: {lang}. Stimmt das?' },
    consent_title: { en: 'Before we start', de: 'Bevor wir beginnen' },
    consent_text: {
      en: 'This tablet asks you short questions in your language. Nothing is recorded. Your answers go only to the staff treating you. You can ask for a person at any time.',
      de: 'Dieses Tablet stellt Ihnen kurze Fragen in Ihrer Sprache. Es wird nichts aufgenommen. Ihre Antworten gehen nur an das Personal, das Sie behandelt. Sie können jederzeit nach einem Menschen fragen.'
    },
    consent_text_own: {
      en: 'You answer short questions in your language on your own phone. Nothing is recorded. Your answers stay on your phone until you show the code to the staff.',
      de: 'Sie beantworten kurze Fragen in Ihrer Sprache auf Ihrem eigenen Handy. Es wird nichts aufgenommen. Ihre Antworten bleiben auf Ihrem Handy, bis Sie den Code dem Personal zeigen.'
    },
    consent_q: { en: 'Do you agree?', de: 'Sind Sie einverstanden?' },
    consent_no: { en: 'That is fine. A staff member will help you.', de: 'Das ist in Ordnung. Eine Person vom Personal hilft Ihnen.' },
    q_sex: { en: 'Are you a woman or a man?', de: 'Sind Sie eine Frau oder ein Mann?' },
    sex_f: { en: 'Woman', de: 'Frau' },
    sex_m: { en: 'Man', de: 'Mann' },
    women_btn: { en: 'Ask for a woman', de: 'Eine Frau anfordern' },
    human_btn: { en: 'Ask for a person', de: 'Person anfordern' },
    human_wait: { en: 'The staff has been told and is getting help in your language. Please wait.', de: 'Das Personal ist informiert und holt Hilfe in Ihrer Sprache. Bitte warten Sie.' },
    human_wait_f: { en: 'The staff knows that you want a woman and is getting help in your language. Please wait.', de: 'Das Personal weiß, dass Sie eine Frau wünschen, und holt Hilfe in Ihrer Sprache. Bitte warten Sie.' },
    own_human: { en: 'Please go to the staff and show them this screen.', de: 'Bitte gehen Sie zum Personal und zeigen Sie diesen Bildschirm.' },
    yes: { en: 'Yes', de: 'Ja' },
    no: { en: 'No', de: 'Nein' },
    unknown: { en: 'I don’t know', de: 'Weiß nicht' },
    done: { en: 'Done', de: 'Fertig' },
    ok: { en: 'OK', de: 'OK' },
    back: { en: 'Back', de: 'Zurück' },
    skip: { en: 'Skip', de: 'Überspringen' },

    // ----- Leitsymptome -----
    q_main: { en: 'What is your main problem? You can tap more than one.', de: 'Was ist Ihr Hauptproblem? Sie können mehreres antippen.' },
    sym_pain: { en: 'Pain', de: 'Schmerzen' },
    sym_chest: { en: 'Chest pain or pressure', de: 'Schmerz oder Druck in der Brust' },
    sym_breath: { en: 'Hard to breathe', de: 'Atemnot' },
    sym_fever: { en: 'Fever or chills', de: 'Fieber oder Schüttelfrost' },
    sym_heat: { en: 'Too much heat or sun', de: 'Zu viel Hitze oder Sonne' },
    sym_cough: { en: 'Cough or sore throat', de: 'Husten oder Halsschmerzen' },
    sym_dizzy: { en: 'Dizzy or fainted', de: 'Schwindel oder Ohnmacht' },
    sym_vomit: { en: 'Vomiting or diarrhoea', de: 'Erbrechen oder Durchfall' },
    sym_bleed: { en: 'Bleeding or wound', de: 'Blutung oder Wunde' },
    sym_injury: { en: 'Fall or injury', de: 'Sturz oder Verletzung' },
    sym_weak: { en: 'Weakness or numbness', de: 'Schwäche oder Taubheit' },
    sym_other: { en: 'Something else', de: 'Etwas anderes' },

    q_more: { en: 'What else is it? You can tap more than one.', de: 'Was ist es noch? Sie können mehreres antippen.' },
    sym_feet: { en: 'Feet: blisters, burns or wounds', de: 'Füße: Blasen, Verbrennung oder Wunden' },
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

    // ----- Körperkarte -----
    q_where: { en: 'Where is it? Tap the place on the picture of the body.', de: 'Wo ist es? Tippen Sie im Bild auf die Stelle am Körper.' },
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

    // ----- Folgefragen -----
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
    q_walk: { en: 'Can you walk?', de: 'Können Sie gehen?' },
    q_sun: { en: 'Were you in the sun for a long time today?', de: 'Waren Sie heute lange in der Sonne?' },
    q_headache: { en: 'Do you have a headache?', de: 'Haben Sie Kopfschmerzen?' },
    q_cramps: { en: 'Do you have muscle cramps?', de: 'Haben Sie Muskelkrämpfe?' },
    q_lost: { en: 'The staff will help you to reach your group.', de: 'Das Personal hilft Ihnen, Ihre Gruppe zu erreichen.' },

    // ----- freie Angabe (nur außerhalb der Sicherheitsfragen, deutlich gekennzeichnet) -----
    q_free: { en: 'Please say in your own words what is wrong. Tap the microphone and speak.', de: 'Bitte sagen Sie in Ihren eigenen Worten, was los ist. Tippen Sie auf das Mikrofon und sprechen Sie.' },
    free_mic_start: { en: 'Speak', de: 'Sprechen' },
    free_mic_stop: { en: 'Stop', de: 'Stopp' },
    free_or_type: { en: 'Or type here', de: 'Oder hier tippen' },
    free_heard: { en: 'This is how we understood you:', de: 'So haben wir Sie verstanden:' },
    free_ok_q: { en: 'Is that right?', de: 'Stimmt das?' },
    free_no_speech: { en: 'Speaking is not available for your language yet. Please tap “Ask for a person”.', de: 'Sprechen gibt es für Ihre Sprache noch nicht. Bitte tippen Sie auf „Person anfordern".' },
    free_nomic: { en: 'The microphone is not available. Please type or ask for a person.', de: 'Das Mikrofon ist nicht verfügbar. Bitte tippen Sie oder fordern Sie eine Person an.' },

    // ----- Sicherheitsfragen (jede Antwort wird wiederholt und bestätigt) -----
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
    q_fasting: { en: 'Are you fasting today?', de: 'Fasten Sie heute?' },
    q_meal: { en: 'When did you last eat?', de: 'Wann haben Sie zuletzt gegessen?' },
    ml_2: { en: 'Less than 2 hours ago', de: 'Vor weniger als 2 Stunden' },
    ml_6: { en: '2 to 6 hours ago', de: 'Vor 2 bis 6 Stunden' },
    ml_more: { en: 'More than 6 hours ago', de: 'Vor mehr als 6 Stunden' },
    confirm_q: { en: 'You answered: {answer}. Is that right?', de: 'Ihre Antwort: {answer}. Stimmt das?' },

    // ----- Angaben zur Pilgerreise -----
    q_group: { en: 'Are you here with a group?', de: 'Sind Sie mit einer Gruppe hier?' },
    q_card: { en: 'If you have a pilgrim card or a wristband from your group, please show it to the staff.', de: 'Wenn Sie eine Pilgerkarte oder ein Armband Ihrer Gruppe haben, zeigen Sie es bitte dem Personal.' },

    // ----- Abschluss der Selbstauskunft -----
    end_patient: { en: 'Thank you. The staff will now look at your answers. Please stay here.', de: 'Danke. Das Personal sieht sich jetzt Ihre Antworten an. Bitte bleiben Sie hier.' },
    give_back: { en: 'Please give the tablet back to the staff.', de: 'Bitte geben Sie das Tablet dem Personal zurück.' },
    self_code_title: { en: 'Thank you. Please show this code to the staff.', de: 'Danke. Bitte zeigen Sie diesen Code dem Personal.' },
    self_code_hint: { en: 'Your answers are only on this phone. They are deleted when you close this page.', de: 'Ihre Antworten liegen nur auf diesem Handy. Sie werden gelöscht, wenn Sie diese Seite schließen.' },
    poster_scan: { en: 'Scan the code with your phone. Answer in your language. Show the result to the staff.', de: 'Scannen Sie den Code mit Ihrem Handy. Antworten Sie in Ihrer Sprache. Zeigen Sie das Ergebnis dem Personal.' },

    // ===== Gespräch: Sätze, die das Personal abspielt =====
    // Begrüßung
    t_hello: { en: 'Hello. I am here to help you.', de: 'Guten Tag. Ich bin hier, um Ihnen zu helfen.' },
    t_staff: { en: 'I belong to the medical team.', de: 'Ich gehöre zum medizinischen Team.' },
    t_tablet: { en: 'I use this tablet to speak with you in your language. Nothing is recorded.', de: 'Ich nutze dieses Tablet, um mit Ihnen in Ihrer Sprache zu sprechen. Es wird nichts aufgenommen.' },
    t_answer_how: { en: 'Please answer with yes or no. You can also tap the green or the red button.', de: 'Bitte antworten Sie mit Ja oder Nein. Sie können auch auf den grünen oder den roten Knopf tippen.' },
    t_understand: { en: 'Do you understand me?', de: 'Verstehen Sie mich?' },
    t_calm: { en: 'You are safe here. We are taking care of you.', de: 'Sie sind hier in Sicherheit. Wir kümmern uns um Sie.' },
    t_interp: { en: 'I am calling an interpreter who speaks your language.', de: 'Ich rufe einen Dolmetscher, der Ihre Sprache spricht.' },
    // Beschwerden
    t_pain_q: { en: 'Do you have pain?', de: 'Haben Sie Schmerzen?' },
    t_dizzy_q: { en: 'Do you feel dizzy?', de: 'Ist Ihnen schwindelig?' },
    t_fall_q: { en: 'Did you fall?', de: 'Sind Sie gestürzt?' },
    // Sicherheit
    t_diab_q: { en: 'Do you have diabetes?', de: 'Haben Sie Diabetes (Zuckerkrankheit)?' },
    t_heart_q: { en: 'Do you have a heart disease?', de: 'Haben Sie eine Herzkrankheit?' },
    t_meds_show: { en: 'Please show me your medicine or the packet.', de: 'Bitte zeigen Sie mir Ihre Medikamente oder die Packung.' },
    // Hitze
    t_drank_q: { en: 'Did you drink water in the last hours?', de: 'Haben Sie in den letzten Stunden Wasser getrunken?' },
    t_cool: { en: 'I am cooling you with water now.', de: 'Ich kühle Sie jetzt mit Wasser.' },
    t_shade: { en: 'We are taking you to a cool place.', de: 'Wir bringen Sie an einen kühlen Ort.' },
    t_drink_slow: { en: 'Please drink slowly, in small sips.', de: 'Bitte trinken Sie langsam, in kleinen Schlucken.' },
    t_clothes: { en: 'I am loosening your clothing so that you can cool down. Is that okay?', de: 'Ich lockere Ihre Kleidung, damit Sie abkühlen. Ist das in Ordnung?' },
    // Untersuchung
    t_sit: { en: 'Please sit down.', de: 'Bitte setzen Sie sich.' },
    t_lie: { en: 'Please lie down.', de: 'Bitte legen Sie sich hin.' },
    t_still: { en: 'Please hold still.', de: 'Bitte halten Sie still.' },
    t_bp: { en: 'I am measuring your blood pressure.', de: 'Ich messe Ihren Blutdruck.' },
    t_temp: { en: 'I am measuring your temperature.', de: 'Ich messe Ihre Temperatur.' },
    t_finger: { en: 'I am putting a small clip on your finger. It does not hurt.', de: 'Ich setze einen kleinen Clip auf Ihren Finger. Das tut nicht weh.' },
    t_breathe_deep: { en: 'Please breathe in and out deeply.', de: 'Bitte atmen Sie tief ein und aus.' },
    t_needle: { en: 'I am putting a small needle into your arm. It hurts for a moment.', de: 'Ich lege eine kleine Nadel in Ihren Arm. Das tut kurz weh.' },
    t_uncover: { en: 'I need to uncover this part of your body to examine you. Is that okay?', de: 'Ich muss diese Körperstelle freimachen, um Sie zu untersuchen. Ist das in Ordnung?' },
    t_ok_q: { en: 'Is that okay for you?', de: 'Ist das für Sie in Ordnung?' },
    // Gruppe und Begleitung
    t_family_q: { en: 'Is a family member or companion with you?', de: 'Ist ein Familienmitglied oder eine Begleitperson bei Ihnen?' },
    t_card: { en: 'Please show me your pilgrim card or the wristband of your group.', de: 'Bitte zeigen Sie mir Ihre Pilgerkarte oder das Armband Ihrer Gruppe.' },
    t_phone_q: { en: 'Do you have the phone number of your group leader?', de: 'Haben Sie die Telefonnummer Ihres Gruppenleiters?' },
    t_inform_group: { en: 'We will inform your group.', de: 'Wir informieren Ihre Gruppe.' },
    t_lost_q: { en: 'Have you lost your group?', de: 'Haben Sie Ihre Gruppe verloren?' },
    t_stay_here: { en: 'Please stay here. We will help you.', de: 'Bitte bleiben Sie hier. Wir helfen Ihnen.' },
    // Frauen
    t_female_staff_q: { en: 'Would you like a female staff member?', de: 'Möchten Sie eine Mitarbeiterin?' },
    t_female_coming: { en: 'A female colleague is coming.', de: 'Eine Kollegin kommt.' },
    t_companion_stay: { en: 'Your companion may stay with you.', de: 'Ihre Begleitperson darf bei Ihnen bleiben.' },
    t_private: { en: 'We are taking you to a private area.', de: 'Wir bringen Sie in einen geschützten Bereich.' },
    // Nächste Schritte
    t_wait: { en: 'Please wait here. The doctor will come to you.', de: 'Bitte warten Sie hier. Die Ärztin oder der Arzt kommt zu Ihnen.' },
    t_hospital: { en: 'We are taking you to the hospital.', de: 'Wir bringen Sie ins Krankenhaus.' },
    t_explain_interp: { en: 'An interpreter will explain the next steps to you.', de: 'Ein Dolmetscher erklärt Ihnen die nächsten Schritte.' },
    t_better_q: { en: 'Do you feel better now?', de: 'Geht es Ihnen jetzt besser?' },
    t_thanks: { en: 'Thank you. Get well soon.', de: 'Danke. Gute Besserung.' },

    // ===== Helfer im Feld: Satzbuch für Freiwillige =====
    f_help_q: { en: 'Do you need help?', de: 'Brauchen Sie Hilfe?' },
    f_follow: { en: 'Please come with me.', de: 'Bitte kommen Sie mit mir.' },
    f_hotel_card_q: { en: 'Do you have the card or the address of your hotel or camp?', de: 'Haben Sie die Karte oder die Adresse Ihres Hotels oder Lagers?' },
    f_toilet: { en: 'The toilets are over there.', de: 'Die Toiletten sind dort drüben.' },
    f_water: { en: 'There is drinking water over there.', de: 'Dort drüben gibt es Trinkwasser.' },
    f_medical: { en: 'The medical point is over there. I will take you there.', de: 'Die Sanitätsstation ist dort drüben. Ich bringe Sie hin.' },
    f_shade: { en: 'Please come into the shade.', de: 'Bitte kommen Sie in den Schatten.' },
    f_drink: { en: 'Please drink some water.', de: 'Bitte trinken Sie etwas Wasser.' },
    f_rest: { en: 'Please sit down and rest.', de: 'Bitte setzen Sie sich und ruhen Sie sich aus.' },
    f_call_medic: { en: 'I am calling the medical team.', de: 'Ich rufe das medizinische Team.' },
    f_ritual_ref: { en: 'For questions about your rituals, please ask the religious guidance service.', de: 'Bei Fragen zu Ihren Riten wenden Sie sich bitte an die religiöse Beratung.' }
  };

  // Oberfläche und Übergabe für das Personal (Englisch, Deutsch; Arabisch als Entwurf in lang/ar.js).
  var S = {
    app_tag: { en: 'Hajj & Umrah', de: 'Hajj & Umrah' },
    demo_banner: {
      en: 'Demo. Phrases are drafts, not clinically reviewed; translations are unverified drafts. Do not use with real patients.',
      de: 'Demo. Die Phrasen sind Entwürfe und klinisch nicht geprüft, die Übersetzungen ungeprüfte Entwürfe. Nicht bei echten Patientinnen und Patienten verwenden.'
    },
    for_staff: { en: 'For staff', de: 'Für das Personal' },
    staff_btn: { en: 'Staff', de: 'Personal' },
    home_btn: { en: 'Start', de: 'Start' },
    menu_btn: { en: 'Menu', de: 'Menü' },

    // ----- Startseite -----
    home_title: { en: 'Understood in every language.', de: 'Verständigung in jeder Sprache.' },
    home_sub: { en: 'For emergency departments, field clinics and helpers during Hajj and Umrah.', de: 'Für Notaufnahme, Feldklinik und Helfer bei Hajj und Umrah.' },
    mode_self_tag: { en: 'Self-report', de: 'Selbstauskunft' },
    mode_self_title: { en: 'The person answers', de: 'Die Person antwortet selbst' },
    mode_self_text: { en: 'Choose a language, tap symptoms, safety questions with read-back. With pictures and audio, also for people who cannot read.', de: 'Sprache wählen, Beschwerden antippen, Sicherheitsfragen mit Rückbestätigung. Mit Bildern und Vorlesen, auch ohne Lesen.' },
    mode_talk_tag: { en: 'Conversation', de: 'Gespräch' },
    mode_talk_title: { en: 'Staff lead the conversation', de: 'Das Personal führt das Gespräch' },
    mode_talk_text: { en: 'Play fixed, pre-translated sentences. The person answers with yes, no or by pointing.', de: 'Feste, vorübersetzte Sätze abspielen. Die Person antwortet mit Ja, Nein oder Zeigen.' },
    mode_field_tag: { en: 'Helpers in the field', de: 'Helfer im Feld' },
    mode_field_title: { en: 'Phrasebook for volunteers', de: 'Satzbuch für Freiwillige' },
    mode_field_text: { en: 'Directions, heat and water, lost group. No case data.', de: 'Wegweisung, Hitze und Wasser, verlorene Gruppe. Ohne Falldaten.' },
    start: { en: 'Start', de: 'Starten' },
    more_title: { en: 'More', de: 'Weiteres' },
    row_poster: { en: 'Self-report on the person’s own phone', de: 'Selbstauskunft auf dem eigenen Handy' },
    row_poster_hint: { en: 'Show or print a poster with a QR code for the waiting area.', de: 'Aushang mit QR-Code für den Wartebereich zeigen oder drucken.' },
    row_scan: { en: 'Read the code from a phone', de: 'Code vom Handy einlesen' },
    row_scan_hint: { en: 'Takes the answers from the person’s phone into a case on this device.', de: 'Übernimmt die Antworten vom Handy der Person in einen Fall auf diesem Gerät.' },
    row_sample: { en: 'View a sample case', de: 'Beispielfall ansehen' },
    row_sample_hint: { en: 'Finished handover with self-report, conversation and vital signs.', de: 'Fertige Übergabe mit Selbstauskunft, Gespräch und Vitalzeichen.' },
    row_about: { en: 'What Sila adds for Hajj and Umrah', de: 'Was Sila für Hajj und Umrah mitbringt' },
    row_about_hint: { en: 'Overview of the adaptations and the limits of this demo.', de: 'Überblick über die Anpassungen und die Grenzen dieser Demo.' },
    settings_title: { en: 'This device', de: 'Dieses Gerät' },
    women_mode: { en: 'Women’s area', de: 'Frauenbereich' },
    women_mode_hint: { en: 'For devices in the women’s section: female forms of address, “Ask for a woman” on every page, noted in the handover.', de: 'Für Geräte im Frauenbereich: weibliche Anrede, „Eine Frau anfordern" auf jeder Seite, Vermerk in der Übergabe.' },
    tts: { en: 'Read aloud automatically', de: 'Automatisch vorlesen' },
    tts_hint: {
      en: 'Every text has a speaker button. “On” also reads each new question automatically. The demo uses the device voice; the real system plays recorded, checked audio.',
      de: 'Neben jedem Text steht ein Lautsprecher-Knopf. „An" liest zusätzlich jede neue Frage automatisch vor. Die Demo nutzt die Gerätestimme; das echte System spielt geprüfte Aufnahmen ab.'
    },
    say_label: { en: 'Read aloud', de: 'Vorlesen' },
    voices: { en: 'Voices for reading aloud', de: 'Stimmen zum Vorlesen' },
    voices_all: { en: 'available for all {n} languages', de: 'für alle {n} Sprachen vorhanden' },
    voices_some: { en: '{n} of {m} languages; missing: {list}', de: '{n} von {m} Sprachen; es fehlen: {list}' },
    voices_none: { en: 'none: this device cannot read aloud', de: 'keine: Dieses Gerät kann nicht vorlesen' },
    voices_wait: { en: 'checking …', de: 'wird geprüft …' },
    voices_unknown: { en: 'cannot be determined on this device', de: 'auf diesem Gerät nicht feststellbar' },
    no_voice: { en: 'No voice for {lang} on this device: the speaker buttons stay silent.', de: 'Auf diesem Gerät fehlt eine Stimme für {lang}: Die Lautsprecher-Knöpfe bleiben stumm.' },
    no_voice_chip: { en: 'no sound', de: 'ohne Ton' },
    on: { en: 'On', de: 'An' },
    off: { en: 'Off', de: 'Aus' },
    offline: { en: 'Offline storage', de: 'Offline-Speicher' },
    persist_yes: { en: 'permanent, app works without internet', de: 'dauerhaft, App läuft ohne Internet' },
    persist_no: { en: 'cached, but the browser may delete it when storage is low', de: 'zwischengespeichert, der Browser darf ihn bei Speicherknappheit löschen' },
    persist_na: { en: 'not active (open the app through a web address or a local server)', de: 'nicht aktiv (App über eine Internetadresse oder einen lokalen Server öffnen)' },
    stats_title: { en: 'Use on this device (anonymous)', de: 'Nutzung auf diesem Gerät (anonym)' },
    stats_none: { en: 'No cases yet.', de: 'Noch keine Fälle.' },
    stats_line: { en: '{n} cases since {date}', de: '{n} Fälle seit {date}' },
    stats_human: { en: 'Requests for a person: {n}', de: 'Anfragen nach einem Menschen: {n}' },
    stats_hint: { en: 'Counters only: language and mode. No answers, no names.', de: 'Nur Zähler: Sprache und Betriebsart. Keine Antworten, keine Namen.' },
    stats_reset: { en: 'Reset', de: 'Zurücksetzen' },
    principles: { en: 'Fixed phrases only. No diagnosis and no triage suggestion. Case data stay on this device and are deleted when the case ends.', de: 'Nur feste Phrasen. Keine Diagnose und kein Triage-Vorschlag. Falldaten bleiben auf diesem Gerät und werden nach Fallende gelöscht.' },

    // ----- Sprachwahl -----
    tlang_title: { en: 'Which language does the person speak?', de: 'Welche Sprache spricht die Person?' },
    tlang_hint: { en: 'Not sure? Let the person choose: they tap their language in their own script.', de: 'Unsicher? Lassen Sie die Person wählen: Sie tippt ihre Sprache in der eigenen Schrift an.' },
    tlang_show: { en: 'Let the person choose', de: 'Die Person wählen lassen' },
    draft_chip: { en: 'Draft', de: 'Entwurf' },
    no_tr_chip: { en: 'English only', de: 'nur Englisch' },
    missing_tr: { en: 'There is no translation for {lang} yet. The demo continues in English. The language is noted in the handover.', de: 'Für {lang} gibt es noch keine Übersetzung. Die Demo läuft auf Englisch weiter. Die Sprache wird in der Übergabe vermerkt.' },
    continue: { en: 'Continue', de: 'Weiter' },
    draft_banner: { en: '{lang}: draft translation by Claude, not yet checked by native speakers.', de: '{lang}: Entwurfsübersetzung von Claude, von Muttersprachlern noch nicht geprüft.' },

    // ----- Selbstauskunft: Hinweise für das Personal -----
    consent_refused: { en: 'The person declined. Use an interpreter or your usual procedure.', de: 'Die Person hat abgelehnt. Bitte Dolmetscher oder das übliche Vorgehen nutzen.' },
    to_home: { en: 'Back to start', de: 'Zurück zum Start' },
    human_req: { en: 'The person asked for a human.', de: 'Die Person möchte mit einem Menschen sprechen.' },
    human_req_f: { en: 'The person asked for a woman (interpreter or staff member).', de: 'Die Person wünscht eine Frau (Dolmetscherin oder Mitarbeiterin).' },
    auto_lost: { en: 'Requested automatically: the person has lost their group. Please help to reach the group.', de: 'Automatisch angefordert: Die Person hat ihre Gruppe verloren. Bitte beim Kontakt zur Gruppe helfen.' },
    auto_free: { en: 'Requested automatically: the free description could not be confirmed.', de: 'Automatisch angefordert: Die freie Angabe ließ sich nicht bestätigen.' },
    human_lang: { en: 'Language: {lang}.', de: 'Sprache: {lang}.' },
    human_no_lang: { en: 'Language not chosen yet.', de: 'Sprache noch nicht gewählt.' },
    human_companion_yes: { en: 'A companion can translate.', de: 'Eine Begleitperson kann übersetzen.' },
    human_companion_no: { en: 'No companion who can translate.', de: 'Keine Begleitperson, die übersetzen kann.' },
    call_interp: { en: 'Call video interpreter for {lang} (simulated)', de: 'Video-Dolmetschung für {lang} rufen (simuliert)' },
    call_interp_f: { en: 'Call female video interpreter for {lang} (simulated)', de: 'Video-Dolmetscherin für {lang} rufen (simuliert)' },
    interp_connecting: { en: 'Connecting to an interpreter for {lang} … Demo, no real connection.', de: 'Verbindung zu einer Dolmetschung für {lang} wird aufgebaut … Demo, keine echte Verbindung.' },
    interp_connected: { en: 'Connected (simulated). In the real system an interpreter from the pool joins by video, first from residents in the Kingdom.', de: 'Verbunden (simuliert). Im echten System kommt eine Person aus dem Dolmetscherpool per Video dazu, zuerst aus Residenten im Königreich.' },
    own_staff_note: { en: 'This person needs help in: {lang}', de: 'Diese Person braucht Hilfe auf: {lang}' },
    resume: { en: 'Back to the questions', de: 'Zurück zu den Fragen' },
    staff_menu: { en: 'Staff menu', de: 'Menü für das Personal' },
    to_vitals: { en: 'Enter vital signs', de: 'Vitalzeichen eingeben' },
    to_summary: { en: 'Show handover', de: 'Zur Übergabe' },
    to_talk: { en: 'Continue with the conversation', de: 'Gespräch fortsetzen' },
    to_self: { en: 'Start self-report', de: 'Selbstauskunft starten' },
    end_case: { en: 'End case and delete data', de: 'Fall beenden und Daten löschen' },
    end_case_confirm: { en: 'End the case? All answers on this device will be deleted.', de: 'Fall beenden? Alle Antworten auf diesem Gerät werden gelöscht.' },
    dlg_cancel: { en: 'Cancel', de: 'Abbrechen' },
    dlg_end: { en: 'Yes, end and delete', de: 'Ja, beenden und löschen' },
    patient_done: { en: 'Staff: how to continue?', de: 'Personal: wie geht es weiter?' },

    // ----- Gespräch -----
    tk_greet: { en: 'Greeting', de: 'Begrüßung' },
    tk_complaint: { en: 'Complaints', de: 'Beschwerden' },
    tk_safety: { en: 'Safety', de: 'Sicherheit' },
    tk_heat: { en: 'Heat', de: 'Hitze' },
    tk_exam: { en: 'Examination', de: 'Untersuchung' },
    tk_group: { en: 'Group', de: 'Gruppe' },
    tk_women: { en: 'Women', de: 'Frauen' },
    tk_next: { en: 'Next steps', de: 'Nächste Schritte' },
    tk_orient: { en: 'Directions', de: 'Wegweisung' },
    tk_water: { en: 'Heat and water', de: 'Hitze und Wasser' },
    tk_lost: { en: 'Lost group', de: 'Gruppe verloren' },
    tk_calm: { en: 'Reassure', de: 'Beruhigen' },
    t_play: { en: 'Play', de: 'Abspielen' },
    t_show: { en: 'Show to the person', de: 'Der Person zeigen' },
    t_unclear: { en: 'Unclear', de: 'Unklar' },
    t_said: { en: 'said', de: 'gesagt' },
    t_readback: { en: 'Read back', de: 'Rückbestätigung' },
    t_confirmed: { en: 'Confirmed', de: 'Bestätigt' },
    t_not_confirmed: { en: 'Not confirmed', de: 'Nicht bestätigt' },
    t_person: { en: 'Person', de: 'Person' },
    t_change_lang: { en: 'Change language', de: 'Sprache ändern' },
    t_back_list: { en: 'Back to the sentences', de: 'Zurück zu den Sätzen' },
    t_log: { en: 'Recorded in this conversation', de: 'In diesem Gespräch erfasst' },
    t_human_rule: { en: 'Diagnosis, consent and bad news: always with an interpreter.', de: 'Diagnose, Einwilligung und schlechte Nachrichten: immer mit Dolmetscher.' },
    t_field_note: { en: 'Phrasebook for helpers. No case data is kept. Questions about rituals go to the religious guidance service.', de: 'Satzbuch für Helfer. Es werden keine Falldaten gespeichert. Fragen zu Riten gehen an die religiöse Beratung.' },
    t_end_field: { en: 'End', de: 'Beenden' },

    // ----- Vitalzeichen -----
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

    // ----- Übergabe -----
    summary_title: { en: 'Handover', de: 'Übergabe' },
    sum_open: { en: 'Still to clarify', de: 'Noch zu klären' },
    sum_not_asked: { en: 'not asked', de: 'nicht gefragt' },
    sum_open_not_asked: { en: 'Not asked: {list}', de: 'Nicht gefragt: {list}' },
    sum_conflict: { en: 'different answers in self-report and conversation', de: 'unterschiedliche Angaben in Selbstauskunft und Gespräch' },
    sum_in_talk: { en: 'in the conversation', de: 'im Gespräch' },
    case_code: { en: 'Case', de: 'Fall' },
    sum_lang: { en: 'Language of the person', de: 'Sprache der Person' },
    sum_lang_demo: { en: 'demo ran in English, no translation yet', de: 'Demo lief auf Englisch, noch keine Übersetzung' },
    sum_lang_draft: { en: 'draft translation, unverified', de: 'Entwurfsübersetzung, ungeprüft' },
    sum_sex: { en: 'Sex (stated by the person)', de: 'Geschlecht (Angabe der Person)' },
    sum_sex_staff: { en: 'Sex (entered by staff)', de: 'Geschlecht (vom Personal eingetragen)' },
    sum_mode: { en: 'Recorded by', de: 'Erfasst über' },
    sum_mode_self: { en: 'self-report', de: 'Selbstauskunft' },
    sum_mode_talk: { en: 'conversation led by staff', de: 'Gespräch durch das Personal' },
    sum_mode_own: { en: 'self-report on own phone, read in by code', de: 'Selbstauskunft auf dem eigenen Handy, per Code eingelesen' },
    sum_women: { en: 'Women’s area', de: 'Frauenbereich' },
    sum_consent: { en: 'Consent', de: 'Einwilligung' },
    sum_main: { en: 'Main problem', de: 'Hauptproblem' },
    sum_answers: { en: 'Answers', de: 'Antworten' },
    sum_safety: { en: 'Safety questions', de: 'Sicherheitsfragen' },
    sum_pilgrim: { en: 'Pilgrimage details', de: 'Angaben zur Pilgerreise' },
    sum_talk: { en: 'Conversation (led by staff)', de: 'Gespräch (vom Personal geführt)' },
    sum_said: { en: 'Sentences played', de: 'Abgespielte Sätze' },
    sum_vitals: { en: 'Vital signs', de: 'Vitalzeichen' },
    sum_time: { en: 'Start and duration', de: 'Beginn und Dauer' },
    sum_human: { en: 'Requests for a person', de: 'Anfragen nach einem Menschen' },
    sum_companion: { en: 'Companion who can translate', de: 'Begleitperson, die übersetzen kann' },
    sum_interp: { en: 'Interpreter', de: 'Dolmetschung' },
    sum_interp_val: { en: 'video interpreter requested at {t} (simulated)', de: 'Video-Dolmetschung angefordert bei {t} (simuliert)' },
    sum_none: { en: 'none', de: 'keine' },
    confirmed: { en: 'confirmed by the person', de: 'von der Person bestätigt' },
    not_confirmed: { en: 'NOT confirmed, clarify with an interpreter', de: 'NICHT bestätigt, mit Dolmetscher klären' },
    missing_value: { en: 'missing', de: 'fehlt' },
    triage_cat: { en: 'Triage category (assigned by staff with the clinic’s system)', de: 'Triage-Kategorie (vergibt das Personal nach dem System der Klinik)' },
    sum_note: {
      en: 'Pre-translated fixed phrases. Safety answers were repeated to the person; anything not confirmed or not asked is listed under “Still to clarify”. No diagnosis and no triage suggestion by the system. Demo version, not validated.',
      de: 'Vorübersetzte feste Phrasen. Sicherheitsantworten wurden der Person wiederholt; was nicht bestätigt oder nicht gefragt wurde, steht unter „Noch zu klären". Keine Diagnose und kein Triage-Vorschlag durch das System. Demo-Fassung, nicht validiert.'
    },
    qr_hint: { en: 'QR code: compact record without a name, for transfer to the record system.', de: 'QR-Code: kompakter Datensatz ohne Namen, zur Übernahme ins Aktensystem.' },
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
    lbl_walk: { en: 'Able to walk', de: 'Kann gehen' },
    lbl_sun: { en: 'Long time in the sun today', de: 'Heute lange in der Sonne' },
    lbl_headache: { en: 'Headache', de: 'Kopfschmerzen' },
    lbl_cramps: { en: 'Muscle cramps', de: 'Muskelkrämpfe' },
    lbl_lost: { en: 'Lost group', de: 'Gruppe verloren' },
    lbl_free: { en: 'Free description', de: 'Freie Angabe' },
    lbl_more: { en: 'Further problems', de: 'Weitere Anliegen' },
    lbl_allergy: { en: 'Allergy', de: 'Allergie' },
    lbl_allergy_what: { en: 'Allergic to', de: 'Allergisch gegen' },
    lbl_meds: { en: 'Daily medication', de: 'Dauermedikation' },
    lbl_meds_what: { en: 'Type of medication', de: 'Art der Medikamente' },
    lbl_cond: { en: 'Known conditions', de: 'Vorerkrankungen' },
    lbl_preg: { en: 'Possible pregnancy', de: 'Mögliche Schwangerschaft' },
    lbl_fasting: { en: 'Fasting today', de: 'Fastet heute' },
    lbl_meal: { en: 'Last meal', de: 'Letzte Mahlzeit' },
    lbl_group: { en: 'Here with a group', de: 'Mit einer Gruppe hier' },
    lbl_card: { en: 'Pilgrim card or wristband', de: 'Pilgerkarte oder Armband' },
    card_asked: { en: 'asked to show it to the staff', de: 'gebeten, sie dem Personal zu zeigen' },
    free_note: {
      en: 'Demo: the browser’s speech recognition sends audio to the browser vendor. Use only with role-play cases. Translation runs on the device if the browser supports it.',
      de: 'Demo: Die Spracherkennung des Browsers schickt Ton an den Browser-Anbieter. Nur mit gespielten Fällen verwenden. Die Übersetzung läuft auf dem Gerät, wenn der Browser das kann.'
    },
    free_mt: { en: 'machine-translated, unverified', de: 'maschinell übersetzt, ungeprüft' },
    free_no_tr: { en: 'no translation available in this browser, original text only', de: 'keine Übersetzung in diesem Browser, nur Originaltext' },
    free_orig: { en: 'Original', de: 'Original' },
    free_skipped: { en: 'not described, clarify in person', de: 'nicht beschrieben, persönlich klären' },
    free_ok_orig: { en: 'own wording confirmed; the person did not check the translation', de: 'eigener Wortlaut bestätigt; die Übersetzung hat die Person nicht geprüft' },
    free_busy: { en: 'Translating …', de: 'Wird übersetzt …' },

    // ----- Aushang und Einlesen -----
    poster_staff_hint: { en: 'Hang this poster in the waiting area or show it on a screen. The person scans the code, answers on their own phone and shows the result code to the staff.', de: 'Hängen Sie diesen Aushang im Wartebereich auf oder zeigen Sie ihn auf einem Bildschirm. Die Person scannt den Code, antwortet auf dem eigenen Handy und zeigt den Ergebnis-Code dem Personal.' },
    poster_file_note: { en: 'The code only works when the app is opened through a web address (https), not from a local file.', de: 'Der Code funktioniert nur, wenn die App über eine Internetadresse (https) geöffnet ist, nicht aus einer lokalen Datei.' },
    poster_try: { en: 'Try it on this device', de: 'Auf diesem Gerät ausprobieren' },
    scan_hint: { en: 'Hold the code on the person’s phone in front of the camera.', de: 'Halten Sie den Code auf dem Handy der Person vor die Kamera.' },
    scan_start: { en: 'Start camera', de: 'Kamera starten' },
    scan_nocam: { en: 'This browser cannot read codes with the camera. Paste the code content or load the sample code.', de: 'Dieser Browser kann keine Codes mit der Kamera lesen. Fügen Sie den Inhalt des Codes ein oder laden Sie den Beispielcode.' },
    scan_paste: { en: 'Paste the code content here', de: 'Inhalt des Codes hier einfügen' },
    scan_load: { en: 'Take over', de: 'Übernehmen' },
    scan_sample: { en: 'Load sample code', de: 'Beispielcode laden' },
    scan_bad: { en: 'This is not a valid Sila code.', de: 'Das ist kein gültiger Sila-Code.' },
    scan_ok: { en: 'Self-report taken over from the phone. Continue with vital signs or the conversation.', de: 'Selbstauskunft vom Handy übernommen. Weiter mit Vitalzeichen oder Gespräch.' },

    // ----- Über Sila -----
    ab_intro: { en: 'Sila joins two proven principles in one workflow: the person’s own report and a conversation led by staff with fixed sentences. This version is adapted for pilgrims in Makkah and Madinah.', de: 'Sila verbindet zwei erprobte Prinzipien in einem Ablauf: die Selbstauskunft der Person und das vom Personal geführte Gespräch mit festen Sätzen. Diese Fassung ist für Pilgerinnen und Pilger in Mekka und Medina angepasst.' },
    ab_g1: { en: 'For pilgrims', de: 'Für Pilgerinnen und Pilger' },
    ab_g2: { en: 'For staff', de: 'Für das Personal' },
    ab_g3: { en: 'Beyond the clinic', de: 'Darüber hinaus' },
    ab_g4: { en: 'Limits of this demo', de: 'Grenzen dieser Demo' },
    ab_1t: { en: 'Pilgrim languages', de: 'Pilgersprachen' },
    ab_1x: { en: 'Urdu, Arabic, Indonesian, Turkish, Bengali, Persian, Hausa, French and English, each in its own script.', de: 'Urdu, Arabisch, Indonesisch, Türkisch, Bengalisch, Persisch, Hausa, Französisch und Englisch, jeweils in der eigenen Schrift.' },
    ab_2t: { en: 'Usable without reading', de: 'Ohne Lesen bedienbar' },
    ab_2x: { en: 'Picture boards, body map, number scale and a speaker button next to every text.', de: 'Bildtafeln, Körperkarte, Zahlenskala und ein Lautsprecher-Knopf neben jedem Text.' },
    ab_3t: { en: 'Women', de: 'Frauen' },
    ab_3x: { en: 'Female forms of address, “Ask for a woman” on every page, noted in the handover.', de: 'Weibliche Anrede, „Eine Frau anfordern" auf jeder Seite, Vermerk in der Übergabe.' },
    ab_4t: { en: 'Pilgrim topics', de: 'Pilgerthemen' },
    ab_4x: { en: 'Heat, fasting, feet, lost group, medicine that has run out, pilgrim card.', de: 'Hitze, Fasten, Füße, verlorene Gruppe, aufgebrauchte Medikamente, Pilgerkarte.' },
    ab_5t: { en: 'Arabic for staff', de: 'Arabisch für das Personal' },
    ab_5x: { en: 'Interface and handover in Arabic, English or German, with right-to-left layout.', de: 'Bedienung und Übergabe auf Arabisch, Englisch oder Deutsch, mit Schrift von rechts nach links.' },
    ab_6t: { en: 'One workflow for the emergency department', de: 'Ein Ablauf für die Notaufnahme' },
    ab_6x: { en: 'Self-report in the waiting area, then vital signs and conversation in the same case.', de: 'Selbstauskunft im Wartebereich, danach Vitalzeichen und Gespräch im selben Fall.' },
    ab_7t: { en: 'Safety', de: 'Sicherheit' },
    ab_7x: { en: 'Allergies, medication, pregnancy and fasting are repeated and confirmed. Missing required values are flagged.', de: 'Allergien, Medikamente, Schwangerschaft und Fasten werden wiederholt und bestätigt. Fehlende Pflichtwerte werden angezeigt.' },
    ab_8t: { en: 'Handover', de: 'Übergabe' },
    ab_8x: { en: 'Summary with a QR code without a name, and a printout. A link to the patient record follows with the partners.', de: 'Zusammenfassung mit QR-Code ohne Namen und Ausdruck. Die Anbindung an die Patientenakte folgt mit den Partnern.' },
    ab_9t: { en: 'Ask for a person', de: 'Person anfordern' },
    ab_9x: { en: 'On every page. Diagnosis, consent and bad news always belong to a human. Video interpreting is only simulated here.', de: 'Auf jeder Seite. Diagnose, Einwilligung und schlechte Nachrichten gehören immer zu einem Menschen. Die Video-Dolmetschung ist hier nur simuliert.' },
    ab_10t: { en: 'Helpers in the field', de: 'Helfer im Feld' },
    ab_10x: { en: 'Phrasebook for volunteers: directions, heat and water, lost group.', de: 'Satzbuch für Freiwillige: Wegweisung, Hitze und Wasser, verlorene Gruppe.' },
    ab_11t: { en: 'Own phone', de: 'Eigenes Handy' },
    ab_11x: { en: 'A poster with a QR code starts the self-report on the person’s phone. The result comes to the staff as a code.', de: 'Ein Aushang mit QR-Code startet die Selbstauskunft auf dem Handy der Person. Das Ergebnis kommt als Code zum Personal.' },
    ab_12t: { en: 'Rules', de: 'Regeln' },
    ab_12x: { en: 'No diagnosis and no triage suggestion. No religious rulings by the system. Case data stay on the device and are deleted when the case ends.', de: 'Keine Diagnose und kein Triage-Vorschlag. Keine religiösen Auskünfte durch das System. Falldaten bleiben auf dem Gerät und werden nach Fallende gelöscht.' },
    ab_l1: { en: 'Phrases are not clinically reviewed.', de: 'Die Phrasen sind klinisch nicht geprüft.' },
    ab_l2: { en: 'All translations are unverified drafts.', de: 'Alle Übersetzungen sind ungeprüfte Entwürfe.' },
    ab_l3: { en: 'Pictograms are placeholders and not yet tested with pilgrims.', de: 'Die Piktogramme sind Platzhalter und noch nicht mit Pilgern getestet.' },
    ab_l4: { en: 'Audio uses the device voice instead of recorded, checked audio.', de: 'Das Vorlesen nutzt die Gerätestimme statt geprüfter Aufnahmen.' },
    ab_l5: { en: 'No link to a patient record or an interpreter pool yet.', de: 'Noch keine Anbindung an eine Patientenakte oder einen Dolmetscherpool.' },
    st_demo: { en: 'in this demo', de: 'in dieser Demo' },
    st_sim: { en: 'simulated', de: 'simuliert' }
  };

  // Fragen. type: yn = Ja/Nein/Weiß nicht, single, multi, scale (0–10), body, info, board, free.
  // safety: Antwort wird wiederholt und muss bestätigt werden.
  // then: Folgefrage abhängig von der Antwort. notFor: Frage entfällt für dieses Geschlecht.
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
    walk: { type: 'yn', text: 'q_walk', label: 'lbl_walk', icon: 'walk' },
    sun: { type: 'yn', text: 'q_sun', label: 'lbl_sun', icon: 'heat' },
    headache: { type: 'yn', text: 'q_headache', label: 'lbl_headache', icon: 'head' },
    cramps: { type: 'yn', text: 'q_cramps', label: 'lbl_cramps', icon: 'muscle' },
    other: { type: 'free', text: 'q_free', label: 'lbl_free', icon: 'speech' },
    lost: { type: 'info', text: 'q_lost', label: 'lbl_lost', icon: 'group', autoHuman: 'lost' },
    more: { type: 'board', text: 'q_more', label: 'lbl_more', icon: 'other' },

    allergy: { type: 'yn', text: 'q_allergy', label: 'lbl_allergy', icon: 'allergy', safety: true, then: { yes: ['allergy_what'] } },
    allergy_what: { type: 'multi', text: 'q_allergy_what', label: 'lbl_allergy_what', icon: 'allergy', safety: true, options: ['al_med', 'al_food', 'al_other'] },
    meds: { type: 'yn', text: 'q_meds', label: 'lbl_meds', icon: 'pill', safety: true, then: { yes: ['meds_what'] } },
    meds_what: { type: 'multi', text: 'q_meds_what', label: 'lbl_meds_what', icon: 'pill', safety: true, options: ['md_blood', 'md_diab', 'md_heart', 'md_lung', 'md_other'] },
    cond: { type: 'multi', text: 'q_cond', label: 'lbl_cond', icon: 'cond', safety: true, options: ['cd_diab', 'cd_heart', 'cd_bp', 'cd_lung', 'cd_kidney', 'cd_none'], exclusive: ['cd_none'] },
    preg: { type: 'yn', text: 'q_preg', label: 'lbl_preg', icon: 'preg', safety: true, notFor: 'm' },
    fasting: { type: 'yn', text: 'q_fasting', label: 'lbl_fasting', icon: 'fast', safety: true },
    meal: { type: 'single', text: 'q_meal', label: 'lbl_meal', icon: 'meal', safety: true, options: ['ml_2', 'ml_6', 'ml_more'] },

    group: { type: 'yn', text: 'q_group', label: 'lbl_group', icon: 'group', pilgrim: true, then: { yes: ['card'] } },
    card: { type: 'info', text: 'q_card', label: 'lbl_card', icon: 'card', pilgrim: true }
  };

  // Leitsymptome mit Folgefragen (eigene Liste, keine CEDIS-Kopie).
  var SYMPTOMS = [
    { id: 'sym_pain', icon: 'pain', follow: ['where', 'onset', 'pain'] },
    { id: 'sym_chest', icon: 'chest', follow: ['onset', 'pain', 'spread', 'breath', 'sweat'] },
    { id: 'sym_breath', icon: 'breath', follow: ['onset', 'chestpain', 'cough', 'fever'] },
    { id: 'sym_fever', icon: 'fever', follow: ['onset', 'cough', 'vomit', 'drink'] },
    { id: 'sym_heat', icon: 'heat', follow: ['onset', 'sun', 'faint', 'vomit', 'drink', 'cramps'] },
    { id: 'sym_cough', icon: 'cough', follow: ['onset', 'fever', 'breath'] },
    { id: 'sym_dizzy', icon: 'dizzy', follow: ['onset', 'faint', 'head_hit', 'chestpain'] },
    { id: 'sym_vomit', icon: 'vomit', follow: ['onset', 'vomit_count', 'blood_vomit', 'drink'] },
    { id: 'sym_bleed', icon: 'bleed', follow: ['where', 'onset', 'bleed_now'] },
    { id: 'sym_injury', icon: 'injury', follow: ['where', 'onset', 'pain', 'head_hit'] },
    { id: 'sym_weak', icon: 'weak', follow: ['onset', 'one_side', 'speech'] },
    { id: 'sym_other', icon: 'other', follow: ['more'] }
  ];

  // Zweite Bildtafel hinter „Etwas anderes", damit weniger Fälle in einer Sackgasse enden.
  var SYMPTOMS2 = [
    { id: 'sym_feet', icon: 'foot', follow: ['onset', 'pain', 'walk'] },
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

  // Sicherheitsfragen, immer, in dieser Reihenfolge; danach die Angaben zur Pilgerreise.
  var SAFETY = ['allergy', 'meds', 'cond', 'preg', 'fasting', 'meal'];
  var PILGRIM = ['group'];

  // Gespräch: Kategorien und Sätze. k: say = Aussage, yn = Ja/Nein-Frage, body = Körperkarte,
  // scale = Zahlenskala. safety: Antwort wird wiederholt und bestätigt. women: nur, wenn die Person kein Mann ist.
  function it(p, k, extra) { var o = { p: p, k: k || 'say' }; if (extra) Object.keys(extra).forEach(function (x) { o[x] = extra[x]; }); return o; }
  var TALK = {
    clinic: [
      { id: 'greet', icon: 'hand', label: 'tk_greet', items: [it('t_hello'), it('t_staff'), it('t_tablet'), it('t_answer_how'), it('t_understand', 'yn'), it('t_calm'), it('t_interp')] },
      { id: 'complaint', icon: 'pain', label: 'tk_complaint', items: [it('t_pain_q', 'yn'), it('q_where', 'body'), it('q_pain', 'scale'), it('q_breath', 'yn'), it('q_chestpain', 'yn'), it('t_dizzy_q', 'yn'), it('q_faint', 'yn'), it('q_fever', 'yn'), it('q_vomit', 'yn'), it('t_fall_q', 'yn'), it('q_head_hit', 'yn'), it('q_one_side', 'yn')] },
      { id: 'safety', icon: 'shield', label: 'tk_safety', items: [it('q_allergy', 'yn', { safety: true }), it('q_meds', 'yn', { safety: true }), it('t_meds_show'), it('t_diab_q', 'yn', { safety: true }), it('t_heart_q', 'yn', { safety: true }), it('q_preg', 'yn', { safety: true, women: true }), it('q_fasting', 'yn', { safety: true })] },
      { id: 'heat', icon: 'heat', label: 'tk_heat', items: [it('q_sun', 'yn'), it('t_drank_q', 'yn'), it('q_headache', 'yn'), it('q_cramps', 'yn'), it('q_drink', 'yn'), it('t_shade'), it('t_cool'), it('t_clothes', 'yn'), it('t_drink_slow')] },
      { id: 'exam', icon: 'steth', label: 'tk_exam', items: [it('t_sit'), it('t_lie'), it('t_still'), it('t_bp'), it('t_temp'), it('t_finger'), it('t_breathe_deep'), it('t_needle'), it('t_uncover', 'yn'), it('t_ok_q', 'yn')] },
      { id: 'group', icon: 'group', label: 'tk_group', items: [it('q_group', 'yn'), it('t_lost_q', 'yn'), it('t_family_q', 'yn'), it('t_card'), it('t_phone_q', 'yn'), it('t_inform_group'), it('t_stay_here')] },
      { id: 'women', icon: 'woman', label: 'tk_women', women: true, items: [it('t_female_staff_q', 'yn'), it('t_female_coming'), it('t_companion_stay'), it('t_private'), it('t_uncover', 'yn')] },
      { id: 'next', icon: 'clock', label: 'tk_next', items: [it('t_wait'), it('t_explain_interp'), it('t_hospital'), it('t_better_q', 'yn'), it('t_thanks')] }
    ],
    field: [
      { id: 'orient', icon: 'compass', label: 'tk_orient', items: [it('t_hello'), it('f_help_q', 'yn'), it('f_follow'), it('f_hotel_card_q', 'yn'), it('f_toilet'), it('f_water'), it('f_medical')] },
      { id: 'water', icon: 'heat', label: 'tk_water', items: [it('f_shade'), it('f_drink'), it('f_rest'), it('t_dizzy_q', 'yn'), it('f_call_medic')] },
      { id: 'lost', icon: 'group', label: 'tk_lost', items: [it('t_lost_q', 'yn'), it('t_card'), it('t_phone_q', 'yn'), it('t_inform_group'), it('t_stay_here')] },
      { id: 'calm', icon: 'hand', label: 'tk_calm', items: [it('t_calm'), it('t_understand', 'yn'), it('t_interp'), it('f_ritual_ref')] }
    ]
  };

  // Körperkarte, Vorderansicht. Die rechte Körperseite der Person liegt
  // für die Betrachtenden links.
  var BODY = [
    { id: 'reg_head', shape: 'circle', a: { cx: 100, cy: 38, r: 26 } },
    { id: 'reg_neck', shape: 'rect', a: { x: 82, y: 62, width: 36, height: 20, rx: 6 } },
    { id: 'reg_chest', shape: 'rect', a: { x: 60, y: 82, width: 80, height: 68, rx: 14 } },
    { id: 'reg_belly', shape: 'rect', a: { x: 62, y: 150, width: 76, height: 50, rx: 6 } },
    { id: 'reg_pelvis', shape: 'rect', a: { x: 62, y: 200, width: 76, height: 42, rx: 10 } },
    { id: 'reg_arm_r', shape: 'rect', a: { x: 20, y: 86, width: 36, height: 146, rx: 15 } },
    { id: 'reg_arm_l', shape: 'rect', a: { x: 144, y: 86, width: 36, height: 146, rx: 15 } },
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
    // „Etwas anderes": drei Punkte. Das Fragezeichen gehört allein zu „Weiß nicht", beide stehen oft auf derselben Seite.
    other: '<circle cx="11" cy="24" r="3.4" fill="currentColor"/><circle cx="24" cy="24" r="3.4" fill="currentColor"/><circle cx="37" cy="24" r="3.4" fill="currentColor"/>',
    clock: '<circle cx="24" cy="24" r="18"/><path d="M24 13v11l8 5"/>',
    allergy: '<path d="M24 6 44 40H4z"/><path d="M24 18v10"/><circle cx="24" cy="34" r="1.6" fill="currentColor"/>',
    pill: '<rect x="5" y="17" width="38" height="14" rx="7" transform="rotate(-35 24 24)"/><path d="M19 16l10 16"/>',
    cond: '<rect x="11" y="8" width="26" height="34" rx="3"/><path d="M19 8V5h10v3M17 19h14M17 26h14M17 33h8"/>',
    preg: '<circle cx="22" cy="8" r="4"/><path d="M22 13c-4 2-5 7-4 11 1 3 3 4 3 7v13M22 13c3 0 7 4 9 10 2 6-2 10-7 10M26 33v11"/>',
    meal: '<path d="M6 25h36a18 13 0 0 1-36 0z"/><path d="M15 19c0-4 4-4 4-8M24 19c0-4 4-4 4-8M33 19c0-4 4-4 4-8"/>',
    fast: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="7"/><path d="M9 39 39 9"/>',
    water: '<path d="M14 8h20l-3 34H17z"/><path d="M15 18h18"/>',
    sweat: '<circle cx="20" cy="22" r="14"/><path d="M14 20h3M23 20h3M15 28c3 2 7 2 10 0"/><path d="M38 6c-3 5-5 8-5 11a5 5 0 0 0 10 0c0-3-2-6-5-11z"/>',
    cough: '<path d="M6 18h22a5 5 0 1 0-5-5M6 26h30a5 5 0 1 1-5 5M6 34h14"/>',
    speech: '<path d="M8 10h32v22H22l-9 8v-8H8z"/><path d="M16 21h16"/>',
    yes: '<path d="M10 25l9 9 19-20"/>',
    no: '<path d="M13 13l22 22M35 13 13 35"/>',
    unknown: '<path d="M17 17a7 7 0 1 1 10 6c-2 1-3 2-3 5v2"/><circle cx="24" cy="37" r="1.6" fill="currentColor"/>',
    person: '<circle cx="24" cy="14" r="7"/><path d="M10 42c0-9 6-15 14-15s14 6 14 15"/>',
    woman: '<circle cx="24" cy="11" r="6"/><path d="M24 18l-10 19h20z"/><path d="M20 37v7M28 37v7"/>',
    man: '<circle cx="24" cy="11" r="6"/><path d="M16 19h16v15h-4v10h-8V34h-4z"/><path d="M24 35v9"/>',
    speaker: '<path d="M8 19h8l10-8v26l-10-8H8z"/><path d="M32 18c3 3 3 9 0 12M36 14c6 6 6 14 0 20"/>',
    back: '<path d="M14 6h20v36H14z"/><path d="M24 12v24"/>',
    mic: '<rect x="18" y="5" width="12" height="23" rx="6"/><path d="M11 22a13 13 0 0 0 26 0M24 35v8M17 43h14"/>',
    eye: '<path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z"/><circle cx="24" cy="24" r="6"/>',
    ear: '<path d="M15 19a10 10 0 1 1 20 0c0 6-6 8-6 14a6 6 0 0 1-12 0"/><path d="M21 19a4 4 0 0 1 8 0c0 3-3 4-3 6"/>',
    tooth: '<path d="M14 8c4-2 7 1 10 1s6-3 10-1c5 3 3 12 1 17-2 6-2 15-5 15s-3-9-6-9-3 9-6 9-3-9-5-15c-2-5-4-14 1-17z"/>',
    // Hautstelle als unregelmäßiger Fleck mit ungleichen Punkten. Kein Viereck mit Punkten: das sähe wie ein Würfel aus.
    skin: '<path d="M25 6c9-1 17 6 18 15s-5 19-16 20S7 35 6 25 14 7 25 6z"/><circle cx="17" cy="20" r="2.6" fill="currentColor"/><circle cx="29" cy="15" r="1.6" fill="currentColor"/><circle cx="32" cy="27" r="2.8" fill="currentColor"/><circle cx="20" cy="32" r="1.8" fill="currentColor"/><circle cx="25" cy="23" r="1.3" fill="currentColor"/>',
    urine: '<path d="M12 7h12v14H12z"/><path d="M7 21h34c0 8-6 13-13 13h-3l2 7H16l2-7c-7-1-11-6-11-13z"/>',
    fear: '<circle cx="24" cy="24" r="18"/><path d="M15 20l5-3M33 20l-5-3"/><circle cx="18" cy="23" r="1.6" fill="currentColor"/><circle cx="30" cy="23" r="1.6" fill="currentColor"/><path d="M17 34c4-4 10-4 14 0"/>',
    group: '<circle cx="14" cy="15" r="5"/><circle cx="34" cy="15" r="5"/><circle cx="24" cy="11" r="5"/><path d="M4 38c0-7 4-12 10-12M44 38c0-7-4-12-10-12M14 40c0-8 4-14 10-14s10 6 10 14"/>',
    foot: '<path d="M21 14c5 0 8 5 7 11-1 5 0 7 1 10 1 5-2 8-6 8s-7-3-7-8c0-4 1-6 0-10-1-6 1-11 5-11z"/><circle cx="14" cy="9" r="2.2"/><circle cx="20" cy="6" r="2.2"/><circle cx="26" cy="6" r="2.2"/><circle cx="32" cy="9" r="2.2"/>',
    walk: '<circle cx="27" cy="8" r="4"/><path d="M26 15l-6 9 7 6v13M20 24l-7 3M27 19l7 6 5-1M21 31l-6 12"/>',
    head: '<circle cx="24" cy="28" r="13"/><path d="M19 27h.1M29 27h.1M19 35c3-2 7-2 10 0"/><path d="M24 4v6M11 8l4 5M37 8l-4 5"/>',
    muscle: '<path d="M17 5c-2 9 3 13 2 21-1 6 0 11 2 17h9M31 5c2 8 0 12 0 18s1 12 0 20"/><path d="M37 15l5 3-5 3 5 3-5 3"/>',
    card: '<rect x="6" y="11" width="36" height="26" rx="4"/><circle cx="17" cy="21" r="4"/><path d="M11 32c1-4 11-4 12 0M28 20h9M28 27h9"/>',
    hand: '<path d="M17 25V12a3 3 0 0 1 6 0v10M23 22V8a3 3 0 0 1 6 0v14M29 22V12a3 3 0 0 1 6 0v17c0 9-5 15-13 15-6 0-9-3-12-9l-4-9a3 3 0 0 1 5-3l6 7"/>',
    shield: '<path d="M24 5l15 6v11c0 10-6 17-15 21-9-4-15-11-15-21V11z"/><path d="M17 24l5 5 9-10"/>',
    steth: '<path d="M12 6v12a9 9 0 0 0 18 0V6M12 6H9M30 6h3M21 27v6a8 8 0 0 0 16 0v-3"/><circle cx="37" cy="26" r="4"/>',
    compass: '<circle cx="24" cy="24" r="18"/><path d="M31 17l-4 10-10 4 4-10z"/>',
    qr: '<rect x="7" y="7" width="13" height="13" rx="2"/><rect x="28" y="7" width="13" height="13" rx="2"/><rect x="7" y="28" width="13" height="13" rx="2"/><path d="M28 28h5v5h-5zM36 36h5v5M41 28v3M28 38v3h3"/>',
    phone: '<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 37h6"/>',
    scan: '<path d="M8 16v-6a2 2 0 0 1 2-2h6M32 8h6a2 2 0 0 1 2 2v6M40 32v6a2 2 0 0 1-2 2h-6M16 40h-6a2 2 0 0 1-2-2v-6M8 24h32"/>',
    info: '<circle cx="24" cy="24" r="18"/><path d="M24 22v12"/><circle cx="24" cy="15" r="1.6" fill="currentColor"/>',
    doc: '<path d="M13 5h15l9 9v29H13z"/><path d="M28 5v9h9M19 24h12M19 31h12M19 17h4"/>',
    play: '<path d="M17 10l20 14-20 14z" fill="currentColor"/>',
    show: '<rect x="6" y="9" width="36" height="24" rx="3"/><path d="M18 41h12M24 33v8"/>',
    arrow: '<path d="M10 24h28M28 14l10 10-10 10"/>',
    chev: '<path d="M29 10 15 24l14 14"/>',
    globe: '<circle cx="24" cy="24" r="18"/><path d="M6 24h36M24 6c-6 5-9 11-9 18s3 13 9 18c6-5 9-11 9-18s-3-13-9-18z"/>',
    vitals: '<path d="M4 26h9l4-10 7 20 5-14 3 4h12"/>',
    lock: '<rect x="11" y="21" width="26" height="20" rx="4"/><path d="M16 21v-6a8 8 0 0 1 16 0v6"/>',
    trash: '<path d="M10 13h28M19 13V8h10v5M14 13l2 28h16l2-28M21 20v14M27 20v14"/>',
    print: '<path d="M14 18V7h20v11M14 34H8V20a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v14h-6"/><rect x="14" y="28" width="20" height="13" rx="1"/>',
    home: '<path d="M7 22 24 7l17 15M12 19v21h24V19M20 40V28h8v12"/>',
    menu: '<path d="M8 14h32M8 24h32M8 34h32"/>',
    camera: '<path d="M6 15h8l3-5h14l3 5h8v24H6z"/><circle cx="24" cy="26" r="7"/>',

    // --- Antwortkacheln (Auswahlfragen). Zeitspannen und Mengen wachsen sichtbar von klein nach groß. ---
    // Zeitspanne als gefülltes Stück einer Uhr: kurz, mittel, lang
    span_s: '<circle cx="24" cy="24" r="18"/><path d="M24 24V11a13 13 0 0 1 11.26 6.5z" fill="currentColor"/>',
    span_m: '<circle cx="24" cy="24" r="18"/><path d="M24 24V11a13 13 0 0 1 0 26z" fill="currentColor"/>',
    span_l: '<circle cx="24" cy="24" r="18"/><path d="M24 24V11a13 13 0 1 1-11.26 6.5z" fill="currentColor"/>',
    // Tage als Punkte auf einem Kalenderblatt: heute, wenige Tage, viele Tage
    cal_1: '<rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 19h32M16 6v8M32 6v8"/><circle cx="24" cy="29.5" r="3.4" fill="currentColor"/>',
    cal_3: '<rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 19h32M16 6v8M32 6v8"/><circle cx="16" cy="29.5" r="2.7" fill="currentColor"/><circle cx="24" cy="29.5" r="2.7" fill="currentColor"/><circle cx="32" cy="29.5" r="2.7" fill="currentColor"/>',
    cal_n: '<rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 19h32M16 6v8M32 6v8"/><circle cx="16" cy="25.5" r="2.1" fill="currentColor"/><circle cx="24" cy="25.5" r="2.1" fill="currentColor"/><circle cx="32" cy="25.5" r="2.1" fill="currentColor"/><circle cx="16" cy="33.5" r="2.1" fill="currentColor"/><circle cx="24" cy="33.5" r="2.1" fill="currentColor"/><circle cx="32" cy="33.5" r="2.1" fill="currentColor"/>',
    // Häufigkeit als Punkte: wenig, einige, viele
    dots_2: '<circle cx="16" cy="30" r="5" fill="currentColor"/><circle cx="32" cy="18" r="5" fill="currentColor"/>',
    dots_4: '<circle cx="15" cy="15" r="4.6" fill="currentColor"/><circle cx="33" cy="15" r="4.6" fill="currentColor"/><circle cx="15" cy="33" r="4.6" fill="currentColor"/><circle cx="33" cy="33" r="4.6" fill="currentColor"/>',
    dots_9: '<circle cx="11" cy="11" r="3.4" fill="currentColor"/><circle cx="24" cy="11" r="3.4" fill="currentColor"/><circle cx="37" cy="11" r="3.4" fill="currentColor"/><circle cx="11" cy="24" r="3.4" fill="currentColor"/><circle cx="24" cy="24" r="3.4" fill="currentColor"/><circle cx="37" cy="24" r="3.4" fill="currentColor"/><circle cx="11" cy="37" r="3.4" fill="currentColor"/><circle cx="24" cy="37" r="3.4" fill="currentColor"/><circle cx="37" cy="37" r="3.4" fill="currentColor"/>',
    // Medikamente: Organ oder Gerät, dazu eine Kapsel (kein Kreis mit Strich: der sähe wie ein Verbotszeichen aus)
    md_blood: '<path d="M18 5c-5 8-9 13-9 18a9 9 0 0 0 18 0c0-5-4-10-9-18z"/><rect x="27" y="31" width="18" height="9" rx="4.5" transform="rotate(-35 36 35.5)"/><path d="M33.4 31.8l5.2 7.4"/>',
    md_diab: '<g transform="rotate(45 24 24)"><path d="M19 5h10M24 5v9M24 34v10"/><rect x="18" y="14" width="12" height="20" rx="2"/><path d="M18 20h4M18 26h4"/></g>',
    md_heart: '<path d="M19 33C8 25 4 19 4 13.5a7.5 7.5 0 0 1 15-2.4 7.5 7.5 0 0 1 15 2.4c0 5.5-4 11.5-15 19.5z"/><rect x="27" y="31" width="18" height="9" rx="4.5" transform="rotate(-35 36 35.5)"/><path d="M33.4 31.8l5.2 7.4"/>',
    md_lung: '<path d="M26 14h14v26H16a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h10z"/><path d="M29 14V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7"/><path d="M10 32l-4-2M9 35H4M10 38l-4 2"/>',
    // Krankheiten
    cd_diab: '<rect x="11" y="15" width="19" height="28" rx="4"/><rect x="15" y="20" width="11" height="8" rx="1.5"/><path d="M18 15V7h5v8"/><circle cx="20.5" cy="35" r="2.4"/><path d="M38 9c-3 4-5 7-5 9.5a5 5 0 0 0 10 0c0-2.5-2-5.5-5-9.5z"/>',
    cd_heart: '<path d="M24 41C10 31 5 23 5 16a9.5 9.5 0 0 1 19-3 9.5 9.5 0 0 1 19 3c0 7-5 15-19 25z"/><path d="M11 23h7l3-6 5 11 3-5h8"/>',
    cd_bp: '<circle cx="24" cy="20" r="15"/><path d="M24 20l7-8M24 8v3M12 20h3M36 20h-3"/><circle cx="24" cy="20" r="1.8" fill="currentColor"/><path d="M24 35v4"/><rect x="16" y="39" width="16" height="6" rx="3"/>',
    cd_kidney: '<path d="M15 9c-5 0-9 5-9 13s4 15 9 15c4 0 6-3 5-7-1-3-3-4-3-7s2-4 3-7c1-4-1-7-5-7z"/><path d="M33 9c5 0 9 5 9 13s-4 15-9 15c-4 0-6-3-5-7 1-3 3-4 3-7s-2-4-3-7c-1-4 1-7 5-7z"/><path d="M18 24c3 2 4 6 4 11v8M30 24c-3 2-4 6-4 11v8"/>'
  };

  // Piktogramm je Antwortkachel, wo die Kachel kein eigenes hat. Auf einer Seite darf kein Bild doppelt
  // vorkommen (prüft tools/flowtest.js). Platzhalter wie alle Piktogramme, nicht mit Menschen getestet.
  var OPT_ICON = {
    on_hour: 'span_s', on_today: 'cal_1', on_days: 'cal_3', on_long: 'cal_n',
    cnt_1: 'dots_2', cnt_3: 'dots_4', cnt_6: 'dots_9',
    al_med: 'pill', al_food: 'meal', al_other: 'other',
    md_other: 'pill', cd_lung: 'breath', cd_none: 'no',
    ml_2: 'span_s', ml_6: 'span_m', ml_more: 'span_l'
  };

  // Eingesprochene oder geprüfte synthetische Aufnahmen. Sobald es sie gibt, hier je Sprache und
  // Phrase eintragen, z. B. AUDIO.ur = { q_breath: 'audio/ur/q_breath.mp3', lang_name: 'audio/ur/lang_name.mp3' }.
  // Die App spielt dann die Aufnahme statt der Gerätestimme ab. Dateien auch in sw.js aufnehmen.
  var AUDIO = {};

  Q.more.options = SYMPTOMS2.map(function (s) { return s.id; });

  // Freies Sprechen nur, wo die Spracherkennung laut Plan voraussichtlich trägt (Gruppe 1)
  // und für die Demo-Sprachen; Urdu und Persisch erst nach Messung, Bengali und Hausa nicht.
  var FREE_LANGS = ['ar', 'tr', 'id', 'fr', 'en', 'de'];

  // Entwurfsübersetzungen (lang/<code>.js) einmischen und die Sprachen als Entwurf markieren.
  // Schlüssel „id|f" sind weibliche Formen und werden genutzt, wenn die Person eine Frau ist.
  var D = window.SILA_LANG || {};
  Object.keys(D).forEach(function (code) {
    var pack = D[code] || {};
    var n = 0;
    Object.keys(pack.P || {}).forEach(function (k) {
      var base = k.split('|')[0];
      var fem = k.indexOf('|f') > 0;
      if (!P[base] || typeof pack.P[k] !== 'string' || !pack.P[k]) return;
      P[base][code + (fem ? '_f' : '')] = pack.P[k];
      if (!fem) n++;
    });
    Object.keys(pack.S || {}).forEach(function (k) { if (S[k] && typeof pack.S[k] === 'string' && pack.S[k]) S[k][code] = pack.S[k]; });
    LANGS.forEach(function (l) { if (l.code === code && n > 0) { l.has = true; l.draft = true; } });
  });

  return {
    LANGS: LANGS, STAFF_LANGS: STAFF_LANGS, P: P, S: S, Q: Q, SYMPTOMS: SYMPTOMS, SYMPTOMS2: SYMPTOMS2,
    SAFETY: SAFETY, PILGRIM: PILGRIM, TALK: TALK, BODY: BODY, ICONS: ICONS, OPT_ICON: OPT_ICON, AUDIO: AUDIO,
    FREE_LANGS: FREE_LANGS, VERSION: '0.6.0'
  };
})();
