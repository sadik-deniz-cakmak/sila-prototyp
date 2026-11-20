# Prüfhinweise für Muttersprachler

Stand 14.11.2026. Alle Sprachdateien in diesem Ordner sind Entwürfe von Claude (KI) und ungeprüft. Diese Liste nennt je Sprache die Stellen, bei denen der Entwurf am unsichersten ist. Sie ersetzt keine vollständige Durchsicht, sie zeigt nur, wo man anfangen sollte. Die Regeln für die Übersetzung stehen in `README.md`.

So prüfen Sie: Öffnen Sie die App, wählen Sie Ihre Sprache und gehen Sie einmal durch die Selbstauskunft und durch das Gespräch. Notieren Sie je Satz den Schlüssel (steht in der Sprachdatei links) und Ihren Vorschlag.

Über alle Sprachen hinweg bitte besonders prüfen:

- **Feste Begriffe:** Reisegruppe und ihr Leiter, Pilgerkarte, Armband der Gruppe, Sanitätsstation, religiöse Beratung. Gesucht ist das Wort, das Pilger dieser Sprache wirklich benutzen.
- **Knöpfe:** „Person anfordern" (`human_btn`) und „Eine Frau anfordern" (`women_btn`) müssen kurz und unmissverständlich sein.
- **Einverständnis:** Sätze mit „Ist das in Ordnung?" (`t_clothes`, `t_uncover`, `t_ok_q`). Ein „Ja" muss eindeutig Zustimmung bedeuten.
- **Dritte Personen:** Arzt, Dolmetscher und Begleitperson stehen meist in der allgemeinen Form. Wo die Sprache das Geschlecht zeigt, kann eine Patientin etwas anderes erwarten.

## Urdu (`ur.js`)

Die 111 Sätze aus der ersten Fassung sind unverändert bis auf drei Korrekturen vom 14.11.2026: `q_preg` war zweideutig („Können Sie schwanger werden?") und lautet jetzt „کیا ممکن ہے کہ آپ حاملہ ہوں؟"; bei `sym_vomit` und `q_vomit` steht das Alltagswort vorn („الٹی (قے)"); `q_where` nennt jetzt das Bild des Körpers. Dazu kommen 11 weibliche Formen (`|f`), die sich nur in der Verbform unterscheiden.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `q_card`, `t_card` | „زائر کارڈ", „کلائی کا بینڈ" | „Pilgerkarte" ist vermutlich eine eigene Wortbildung; für das Armband sagen Pilger vielleicht „کڑا" oder „بریسلٹ" |
| `t_phone_q` | „گروپ لیڈر" | indische Pilger kennen eher „خادم الحجاج" |
| `q_cramps` | „پٹھوں میں کھچاؤ (اینٹھن)" | „کھچاؤ" kann auch Zerrung heißen; volkstümlich „نس چڑھنا" |
| `f_medical` | „طبی امداد کا مرکز" | „میڈیکل کیمپ" ist im Alltag wohl geläufiger |
| `f_ritual_ref` | „دینی رہنمائی کے شعبے", „مناسک" | „Abteilung" statt „Dienst"; „مناسک" ist manchen zu gelehrt |
| `t_private` | „پردے والی جگہ" | wörtlich „Ort mit Sichtschutz"; enger als „geschützter Bereich" |
| `t_tablet`, `t_cool`, `t_bp`, `t_temp`, `t_finger`, `t_needle`, `t_clothes`, `t_interp`, `f_call_medic`, `f_medical` | „ہم … رہے ہیں" | „wir" statt „ich", damit das Geschlecht der sprechenden Person nicht markiert ist. Klingt das bei einer einzelnen Pflegekraft natürlich? |
| `t_wait`, `t_companion_stay` | „ڈاکٹر آپ کے پاس آئیں گے" | dritte Personen in der allgemeinen männlichen Mehrzahl |
| `reg_back`, `q_spread` | „کمر" | meint vor allem den unteren Rücken; für „Rücken" allgemein wäre „پیٹھ" genauer |
| `sym_fear` | „الجھن" | eher Ratlosigkeit als Verwirrtheit im klinischen Sinn |
| `t_staff`, `f_call_medic` | „طبی ٹیم" | hochsprachlich; „میڈیکل ٹیم" verstehen Ältere vielleicht besser |
| `on_*`, `cnt_*`, `ml_*` | Zahlen ausgeschrieben | Die App zeigt sonst Ziffern; einheitlich machen |

## Arabisch (`ar.js`)

Einfaches Hocharabisch ohne Vokalzeichen. Fast alle Sätze sind so gebaut, dass sie für Frauen und Männer gleich **geschrieben** werden («يرجى» mit Verbalsubstantiv, Nominalsätze mit عندك). Nur sechs Sätze haben eine eigene weibliche Form (`consent_text_own`, `consent_q`, `free_mic_start`, `free_or_type`, `q_meds`, `q_fasting`). **Gesprochen unterscheiden sich die Formen trotzdem** (ـكَ/ـكِ, ـتَ/ـتِ). Für geprüfte Aufnahmen braucht es deshalb je Satz zwei Fassungen oder eine bewusst endungslose Sprechweise.

Die Datei enthält auch die Oberfläche für das arabischsprachige Personal (Block `S`, 237 Texte).

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `consent_text`, `q_lost`, `give_back` u. a. | «الفريق الطبي» | „Personal"; auch «الطاقم الطبي» oder «الكادر الطبي» |
| `human_btn`, `women_btn` | «طلب شخص», «طلب امرأة» | kann wie „einen Menschen bestellen" klingen; Alternative «طلب مساعدة شخص» |
| `q_group`, `sym_lost`, `t_lost_q` | «مجموعة» | überall verstanden, aber nicht das Pilgerwort: Golf, Irak, Levante «حملة», Ägypten und Maghreb «فوج» |
| `t_phone_q` | «مشرف مجموعتك» | je nach Land «قائد», «رئيس», «مسؤول», «أمير الفوج» |
| `q_card`, `t_card` | «بطاقة الحاج», «سوار» | fühlen sich Umrah-Pilger gemeint? Armband umgangssprachlich «إسورة» |
| `lang_pick`, `q_allergy_what`, `q_cond` | «الضغط على», «كل ما ينطبق عليك» | «ينطبق» ist Formularsprache |
| `sym_heat` | «حَرّ شديد أو شمس شديدة» | «حرارة» vermieden, weil es auch Fieber heißt |
| `sym_feet` | «فقاعات (بثور)» | «بثور» wird oft als Pickel verstanden |
| `sym_fear` | «تشوش ذهني» | kein einfaches Wort für Verwirrtheit; Alternative «ارتباك» |
| `sym_weak`, `q_one_side` | «تنميل (خدر)» | «تنميل» ist eigentlich Kribbeln |
| `q_cramps`, `md_blood` | «شد عضلي (تشنج عضلي)», «مسيل للدم (مميع)» | «شد عضلي» kann Zerrung heißen, «تشنج» Krampfanfall |
| `sym_cough`, `sym_vomit` | «كحة (سعال)», «استفراغ (قيء)» | Alltagswort vorn; zu umgangssprachlich? |
| `t_uncover`, `t_clothes`, `t_ok_q` | «هل هذا مناسب (لك)؟» | als Bitte um Erlaubnis vielleicht zu schwach; deutlicher «هل توافق؟ / هل توافقين؟» |
| `t_lie`, `t_private` | «يرجى الاستلقاء», «مكان خاص» | schriftsprachlich; «مكان خاص» unbestimmt, Alternative «مكان مستور» |
| `f_medical`, `f_ritual_ref` | «النقطة الطبية», «خدمة الإرشاد الديني» | vor Ort eher «نقطة الإسعاف», «المركز الصحي», «إجابة السائلين» oder «التوعية الإسلامية» |

Für die Oberfläche des Personals (Block `S`) sollte ein saudischer Kliniker prüfen:

| Schlüssel | Entwurf | Frage |
|---|---|---|
| `summary_title`, `to_summary` | «تسليم الحالة» | oder «ملخص الحالة», «التسليم والاستلام»? |
| `mode_self_tag`, `sum_mode_self` | «إفادة ذاتية» | oder «التقييم الذاتي», «الإدخال الذاتي»? |
| `triage_cat`, `no_category`, `principles` | «فئة الفرز» | oder «مستوى الفرز», «تصنيف الفرز»? |
| `sum_main`, `tk_complaint` | «الشكوى الرئيسية» | klinischer Begriff; die Pilgerfrage sagt «مشكلتك الرئيسية» |
| `lbl_cond` | «الأمراض المزمنة» | der Quelltext sagt „Vorerkrankungen", das ist weiter gefasst |
| `t_readback`, `sum_safety` | «تأكيد الإجابة», «أسئلة السلامة» | Fachbegriff wäre «إعادة القراءة والتأكيد» |
| `call_interp`, `for_staff` | «مترجم عبر الاتصال المرئي», «الفريق الطبي» | üblich im Klinikalltag? |
| `vit_*`, `lbl_*` | «تشبع الأكسجين», «ضغط الدم الانقباضي», «قيء», «سعال» | gegen den Klinikalltag prüfen; `vit_temp` nutzt «°م» statt „°C" |

## Indonesisch (`id.js`)

Am 14.11.2026 korrigiert: `human_btn` („Minta bantuan petugas" statt „Minta bantuan orang"), `human_wait_f`, `q_faint` („sempat pingsan"), `free_heard`, `free_no_speech`, `free_nomic`, `q_where`.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `consent_text_own`, `self_code_hint`, `poster_scan` | „telepon genggam" | auch in Malaysia verständlich; Indonesier sagen „HP" |
| `q_card`, `t_card` | „kartu jemaah" | der tatsächliche Name des Ausweises ist zu prüfen |
| `t_uncover` | „membuka pakaian di bagian tubuh Anda ini" | „pakaian" ist ergänzt, weil „membuka bagian tubuh" nach Aufschneiden klingt |
| `t_private` | „tempat yang tertutup" | „abgeschirmt" statt „pribadi", das nach Einzelzimmer klingt |
| `f_ritual_ref` | „layanan bimbingan ibadah" | angelehnt an den Begriff der indonesischen Hajj-Mission |
| `sym_feet` | „Kaki: melepuh, luka bakar, atau luka" | „kaki" heißt Fuß und Bein |
| `sym_dizzy`, `t_dizzy_q` | „pusing" | heißt im Alltag auch Kopfschmerz; Abgrenzung zu `q_headache` („sakit kepala") prüfen |
| `f_hotel_card_q` | „kemah" | Pilger sagen eher „tenda" oder „maktab" |
| `poster_scan` | „Pindai" | amtliches Wort; Ältere sagen „scan" |

## Türkisch (`tr.js`)

Am 14.11.2026 korrigiert: `lang_pick` (las sich auch als „Berühren Sie Ihre Zunge"), `human_btn` („Bir görevli iste"), `human_wait_f`, der letzte Satz von `consent_text`, die Spannen in `on_days`, `cnt_3`, `ml_6` („1 ila 3 …"), `sym_other2`, `sym_weak` („Güçsüzlük"), `q_one_side` („uyuşmuş"), `free_no_speech`, `free_nomic`, `q_where`.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `t_phone_q` | „grup başkanı" | Pilger sagen vielleicht „kafile başkanı", „grup hocası" oder „rehber" |
| `q_card`, `t_card` | „hacı kartı" | fühlen sich Umrah-Pilger angesprochen? |
| `t_private` | „mahremiyetinizin korunduğu bir alan" | Umschreibung, weil „özel alan" nach Privatklinik klingt |
| `t_clothes`, `t_uncover`, `t_ok_q` | „Uygun mu?" | gesprochen wäre „Olur mu?" natürlicher |
| `f_medical` | „Sağlık noktası" | vielleicht „ilk yardım noktası" oder „revir" |
| `f_ritual_ref` | „dini rehberlik hizmeti" | amtlicher Name des Dienstes unbekannt |
| `t_finger`, `t_needle` | „mandal", „iğne takıyorum" | Alltagswörter, vielleicht zu salopp |
| `sym_feet` | „su toplaması" | Volkssprache für Blasen |

## Bengalisch (`bn.js`)

**Bei Bengalisch und Hausa ist der Entwurf am unsichersten. Beide brauchen als Erste eine vollständige Durchsicht.** Bengalisch ist gar nicht gegen fremde Quellen abgeglichen. Die Wortwahl folgt Bangladesch („পানি", „রোজা").

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `sym_lost`, `q_group`, `q_lost`, `t_inform_group`, `t_lost_q` | „গ্রুপ" | Lehnwort; sagen Pilger eher „কাফেলা" oder „দল"? |
| `t_phone_q` | „গ্রুপ লিডার" | auch „মোয়াল্লেম", „হজ গাইড" oder „কাফেলা প্রধান" denkbar |
| `q_card`, `t_card` | „হজ বা ওমরাহর পরিচয়পত্র", „হাতের ব্যান্ড" | umschrieben, weil ein neutrales Wort für „Pilger" fehlt; das Armband ist geraten |
| `consent_text`, `give_back`, `t_tablet` | „ট্যাব" | bewusst nicht „ট্যাবলেট" (heißt zuerst „Tablette"); kennen Ältere „ট্যাব"? |
| durchgehend | „স্বাস্থ্যকর্মী" | „Gesundheitsarbeiter"; in Bangladesch denkt man dabei oft an Gemeindehelfer |
| durchgehend | „চাপ দিন" | „drücken" für tippen; in Westbengalen eher „টিপুন" |
| `q_preg` | „এমন কি হতে পারে যে আপনি গর্ভবতী?" | umschrieben, damit es nicht „Können Sie schwanger werden?" heißt; etwas umständlich |
| `q_cramps` | „মাংসপেশিতে টান ধরছে" | Volksausdruck; regional „খিল ধরা" |
| `sym_fear` | „দিশেহারা লাগা" | eher „ratlos" als „verwirrt" |
| `sym_weak`, `q_one_side` | „অবশ" | bedeutet auch „gelähmt" |
| `q_lost` | „গ্রুপের কাছে পৌঁছাতে" | „hinkommen"; ist „Kontakt aufnehmen" gemeint, wäre „যোগাযোগ করতে" richtig |
| `f_ritual_ref` | „ধর্মীয় পরামর্শ সেবা" | frei gebildet |
| `t_ok_q`, `t_clothes`, `t_uncover` | „এটা কি ঠিক আছে?" | Lehnübersetzung; natürlicher vielleicht „আপনি কি রাজি?" |
| `q_meds` | „ওষুধ খান" | passt schlecht zu Insulin und Spray |
| `done`, `back` | „হয়ে গেছে", „পিছনে" | in Apps üblich: „সম্পন্ন", „ফিরে যান" |

## Hausa (`ha.js`)

Durchgehend in der höflichen Mehrzahl (ku, kuna), damit die Anrede für Frauen und Männer gleich ist. Nur wenige Wörter sind gegen Hausa-Presse abgeglichen; „tsinka jini" war dabei nicht belegt.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `q_cramps` | „tsokokinku suna murɗewa da ciwo" | kein gesichertes Wort für Muskelkrampf |
| `md_blood` | „Maganin tsinka jini (na hana jini daskarewa)" | „tsinka jini" nicht belegt; die Klammer ist die sichere Umschreibung |
| `sym_weak`, `q_one_side` | „sagewar jiki", „ya sage" | Wörterbuchwort; Alltagsgebrauch unsicher |
| `q_allergy`, `q_allergy_what` | „abu da jikinku ba ya so (alerji)" | könnte als bloße Abneigung verstanden werden |
| `sym_feet` | „ƙuraje masu ruwa" | Umschreibung für Blasen; das eigentliche Wort ist unbekannt |
| `q_group`, `sym_lost`, `t_lost_q`, `t_phone_q` | „tawaga", „Na rasa tawagata" | „tawaga" heißt eigentlich Delegation; vielleicht „rukuni", „ayari"; statt „rasa" eher „ɓace" |
| `q_card`, `t_card` | „katin shaidar alhazai", „awarwaron hannu" | „awarwaro" ist ein Schmuck-Armreif; „alhazai" deckt Umrah nur lose |
| `consent_text`, `give_back`, `t_tablet`, `t_finger` | „na'ura" | „Gerät" für Tablet und für den Fingerclip |
| `consent_text`, `consent_text_own`, `t_tablet` | „Ba a ɗaukar murya ko hoto" | verengt auf „weder Stimme noch Bild wird aufgenommen" |
| `self_code_title`, `poster_scan` | „lambar QR" | „lamba" heißt auch „Zahl" |
| `q_sex` | „Ku mace ce ko namiji?" | Mehrzahl mit Prädikat in der Einzahl klingt vielleicht schief |
| `q_preg`, `human_wait_f` | „kuna da juna biyu", „kuna son taimakon mace" | in der Mehrzahl belassen; natürlicher wäre die weibliche Einzahl |
| `t_thanks` | „Ina yi muku fatan samun sauƙi da wuri" | übliche Genesungswünsche sind religiös („Allah ya ba ku lafiya") |
| `f_ritual_ref`, `f_medical` | „sashen jagorancin addini", „Wurin kula da lafiya" | frei gebildet |
| `q_head_hit` | „kun samu bugu a kai" | umschrieben, weil „kun bugu" auch „betrunken" heißen kann |
| `cd_lung` | „asma (fuka)" | „fuka" liegt nahe an „tarin fuka" (Tuberkulose) |

## Persisch (`fa.js`)

Der Entwurf soll in Iran und in Afghanistan (Dari) verstanden werden. Wo die Wörter auseinandergehen, steht das afghanische Wort in Klammern, zum Beispiel „بیمارستان (شفاخانه)". Am 14.11.2026 korrigiert: In `sym_feet` stand „آبله" für Blasen, das in Iran „Pocken" heißt; die Klammer ist gestrichen.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| `sym_lost`, `q_group`, `q_lost`, `t_lost_q`, `t_inform_group` | „کاروان" | Wort iranischer Pilger; afghanische sagen eher „گروپ" |
| `t_phone_q` | „مدیر کاروان (سرگروه)" | iranischer Amtstitel; in Afghanistan „سرگروپ" oder „معلم" |
| `q_card`, `t_card` | „کارت شناسایی زائر", „دستبند کاروان" | allgemein übersetzt; verbinden Pilger das mit ihrer Karte? |
| `al_med`, `q_meds`, `sym_meds_out`, `t_meds_show` | „دارو (دوا)" | die Klammer steht nur an vier Stellen; einheitlich machen |
| `human_btn`, `women_btn` | „یک نفر را صدا بزنید", „یک خانم را صدا بزنید" | vier Wörter sind für einen Knopf lang |
| `skip` | „رد شدن" | kann als „abgelehnt werden" gelesen werden; in Dari „تیر شدن" |
| `t_understand` | „آیا حرف مرا می‌فهمید؟" | kann in Iran schroff klingen |
| `cd_lung`, `md_lung` | „شُش", „نفس‌تنگی" | Dari-Namen aus dem Gedächtnis; „نفس‌تنگی" liegt nah an `sym_breath` |
| `q_spread` | „فک (الاشه)" | „الاشه" kennt in Iran niemand |
| `q_cramps` | „گرفتگی عضلات" | eher schriftsprachlich |
| `f_medical`, `f_ritual_ref` | „مرکز کمک‌های اولیه", „خدمات راهنمایی دینی" | Umschreibungen; die vor Ort üblichen Namen sind unbekannt |

## Französisch (`fr.js`)

Zielgruppe sind vor allem Pilger aus Westafrika und dem Maghreb. Am 14.11.2026 korrigiert: `q_where` nennt jetzt die Zeichnung des Körpers.

| Schlüssel | Entwurf | Warum unsicher |
|---|---|---|
| mehrere, z. B. `give_back` | „le personnel soignant" | in Westafrika vielleicht „personnel de santé" oder „agents de santé" |
| `q_faint`, `sym_dizzy` | „perdu connaissance", „évanouissement" | zwei Wörter für Ohnmacht |
| `sym_weak`, `q_one_side` | „engourdi" | richtig, aber für Zweitsprachler schwer |
| `md_blood` | „fluidifier le sang" | üblich, aber kein einfaches Wort |
| `md_lung` | „Spray pour l’asthme (inhalateur)" | Volkswort unbekannt (vielleicht „pompe") |
| `q_preg` | „Est-il possible que vous soyez enceinte ?" | braucht den Subjonctif |
| `t_private` | „un endroit à l’abri des regards" | Umschreibung |
| `t_uncover` | „découvrir cette partie de votre corps" | „découvrir" heißt auch „entdecken" |
| `q_fasting`, `t_lie`, `t_breathe_deep` | „jeûnez", „Allongez-vous", „expirez" | in Westafrika oft „faire le carême", „Couchez-vous"; „expirer" heißt auch sterben |
| `t_phone_q`, `q_card`, `f_medical`, `f_ritual_ref` | „chef de groupe", „carte de pèlerin", „poste médical", „service d’orientation religieuse" | feste Begriffe, siehe oben |
