import type { ImposterCategory, ImposterDifficulty } from '@chitram/shared';

export const IMPOSTER_CATEGORY_LABELS: Record<ImposterCategory, string> = {
  mixed: '🎲 എല്ലാം ചേർന്നത് / Mixed Categories',
  cinema: '🎬 സിനിമ / Malayalam Cinema',
  celebrities: '🌟 താരങ്ങൾ / Celebrities',
  kerala: '🌴 കേരള സംസ്കാരം / Kerala Traditions',
  food: '🍲 ഭക്ഷണം / Kerala Food',
  places: '📍 സ്ഥലങ്ങൾ / Kerala Places',
  objects: '📦 നിത്യോപയോഗ വസ്തുക്കൾ / Everyday Objects',
};

export interface ImposterWord {
  id: string;
  word: string;          // Malayalam Unicode script
  manglish: string;      // English transliteration
  category: ImposterCategory;
  categoryLabel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  aliases?: string[];    // acceptable answers when imposter guesses
}

export const IMPOSTER_WORDS: ImposterWord[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. 🎬 MALAYALAM CINEMA (സിനിമ)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'c1', word: 'ദൃശ്യം', manglish: 'Drishyam', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['drishyam', 'drishyam 1', 'drishyam 2', 'georgekutty'] },
  { id: 'c2', word: 'മണിച്ചിത്രത്താഴ്', manglish: 'Manichitrathazhu', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['manichitrathazhu', 'nagavalli', 'manichithrathazhu'] },
  { id: 'c3', word: 'ലൂസിഫർ', manglish: 'Lucifer', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['lucifer', 'stephen nedumpally'] },
  { id: 'c4', word: 'പ്രേമം', manglish: 'Premam', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['premam', 'george', 'malar'] },
  { id: 'c5', word: 'ആവേശം', manglish: 'Aavesham', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['aavesham', 'ranga', 'edamon'] },
  { id: 'c6', word: 'കുമ്പളങ്ങി നൈറ്റ്സ്', manglish: 'Kumbalangi Nights', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['kumbalangi nights', 'kumbalangi', 'shammi'] },
  { id: 'c7', word: 'ഗോഡ്ഫാദർ', manglish: 'Godfather', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['godfather', 'anjooppan'] },
  { id: 'c8', word: 'കിലുക്കം', manglish: 'Kilukkam', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['kilukkam', 'joji', 'nandini'] },
  { id: 'c9', word: 'നാടോടിക്കാറ്റ്', manglish: 'Nadodikkattu', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['nadodikkattu', 'dasan and vijayan', 'dasan vijayan'] },
  { id: 'c10', word: 'രോമാഞ്ചം', manglish: 'Romancham', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['romancham', 'ouija'] },
  { id: 'c11', word: 'ബാംഗ്ലൂർ ഡേയ്സ്', manglish: 'Bangalore Days', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['bangalore days'] },
  { id: 'c12', word: 'ചെമ്മീൻ', manglish: 'Chemmeen', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['chemmeen', 'karuthamma', 'pareekutty'] },
  { id: 'c13', word: 'സന്ദേശം', manglish: 'Sandhesham', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['sandhesham', 'sandesham', 'poland'] },
  { id: 'c14', word: 'മായാനദി', manglish: 'Mayaanadhi', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['mayaanadhi', 'mayanadhi', 'mathan'] },
  { id: 'c15', word: 'ആടുജീവിതം', manglish: 'Aadujeevitham', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['aadujeevitham', 'goat life', 'najeeb'] },
  { id: 'c16', word: 'ചുരുളി', manglish: 'Churuli', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['churuli', 'lijo jose pellissery'] },
  { id: 'c17', word: 'യോദ്ധാ', manglish: 'Yoddha', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'medium', aliases: ['yoddha', 'yodha', 'appukuttan', 'unnikkuttan'] },
  { id: 'c18', word: 'സിഐഡി മൂസ', manglish: 'CID Moosa', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'easy', aliases: ['cid moosa', 'moosa'] },
  { id: 'c19', word: 'തൂവാനത്തുമ്പികൾ', manglish: 'Thoovanathumbikal', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'hard', aliases: ['thoovanathumbikal', 'jayakrishnan', 'clara'] },
  { id: 'c20', word: 'വാത്സല്യം', manglish: 'Valsalyam', category: 'cinema', categoryLabel: IMPOSTER_CATEGORY_LABELS.cinema, difficulty: 'hard', aliases: ['valsalyam', 'meledathu raghavan'] },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. 🌟 MALAYALAM CELEBRITIES (താരങ്ങൾ)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'ce1', word: 'മോഹൻലാൽ', manglish: 'Mohanlal', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['mohanlal', 'lalettan', 'lal'] },
  { id: 'ce2', word: 'മമ്മൂട്ടി', manglish: 'Mammootty', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['mammootty', 'mammookka', 'ikkayi'] },
  { id: 'ce3', word: 'ഫഹദ് ഫാസിൽ', manglish: 'Fahadh Faasil', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['fahadh faasil', 'fahad', 'faFa'] },
  { id: 'ce4', word: 'പൃഥ്വിരാജ്', manglish: 'Prithviraj', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['prithviraj', 'raju', 'prithviraj sukumaran'] },
  { id: 'ce5', word: 'ടൊവിനോ തോമസ്', manglish: 'Tovino Thomas', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['tovino thomas', 'tovino', 'minnal murali'] },
  { id: 'ce6', word: 'ജയറാം', manglish: 'Jayaram', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['jayaram'] },
  { id: 'ce7', word: 'മഞ്ജു വാര്യർ', manglish: 'Manju Warrier', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['manju warrier', 'manju'] },
  { id: 'ce8', word: 'ഇന്നസെന്റ്', manglish: 'Innocent', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'medium', aliases: ['innocent'] },
  { id: 'ce9', word: 'ജഗതി ശ്രീകുമാർ', manglish: 'Jagathy Sreekumar', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'medium', aliases: ['jagathy', 'jagathy sreekumar', 'amby'] },
  { id: 'ce10', word: 'സലിം കുമാർ', manglish: 'Salim Kumar', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['salim kumar', 'manavalan'] },
  { id: 'ce11', word: 'നിവിൻ പോളി', manglish: 'Nivin Pauly', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'easy', aliases: ['nivin pauly', 'nivin'] },
  { id: 'ce12', word: 'സുരാജ് വെഞ്ഞാറമൂട്', manglish: 'Suraj Venjaramoodu', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'medium', aliases: ['suraj', 'suraj venjaramoodu', 'dashamoolam damu'] },
  { id: 'ce13', word: 'നെടുമുടി വേണു', manglish: 'Nedumudi Venu', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'hard', aliases: ['nedumudi venu', 'venu'] },
  { id: 'ce14', word: 'ഷോബി തിലകൻ', manglish: 'Thilakan', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'medium', aliases: ['thilakan'] },
  { id: 'ce15', word: 'ഉർവശി', manglish: 'Urvashi', category: 'celebrities', categoryLabel: IMPOSTER_CATEGORY_LABELS.celebrities, difficulty: 'medium', aliases: ['urvashi'] },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. 🌴 KERALA TRADITIONS & CULTURE (കേരള സംസ്കാരം)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'k1', word: 'ഓണം', manglish: 'Onam', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['onam', 'thiruvonam', 'maveli', 'mahabeli'] },
  { id: 'k2', word: 'വിഷു', manglish: 'Vishu', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['vishu', 'vishukani', 'kani'] },
  { id: 'k3', word: 'വള്ളംകളി', manglish: 'Vallamkali', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['vallamkali', 'boat race', 'chundan vallam'] },
  { id: 'k4', word: 'കഥകളി', manglish: 'Kathakali', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['kathakali'] },
  { id: 'k5', word: 'പുലിക്കളി', manglish: 'Pulikkali', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'medium', aliases: ['pulikkali', 'puli kali', 'tiger dance'] },
  { id: 'k6', word: 'തെയ്യം', manglish: 'Theyyam', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'medium', aliases: ['theyyam', 'thira'] },
  { id: 'k7', word: 'തൃശ്ശൂർ പൂരം', manglish: 'Thrissur Pooram', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['thrissur pooram', 'pooram', 'kudamattam'] },
  { id: 'k8', word: 'ചെണ്ടമേളം', manglish: 'Chendamelam', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'medium', aliases: ['chendamelam', 'chenda', 'melam', 'panchavadyam'] },
  { id: 'k9', word: 'തിരുവാതിരക്കളി', manglish: 'Thiruvathirakali', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'medium', aliases: ['thiruvathirakali', 'thiruvathira'] },
  { id: 'k10', word: 'കളരിപ്പയറ്റ്', manglish: 'Kalaripayattu', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'medium', aliases: ['kalaripayattu', 'kalari'] },
  { id: 'k11', word: 'കുമ്മാട്ടിക്കളി', manglish: 'Kummattikkali', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'hard', aliases: ['kummattikkali', 'kummatti'] },
  { id: 'k12', word: 'ഓണപ്പൂക്കളം', manglish: 'Pookkalam', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'easy', aliases: ['pookkalam', 'athapookkalam', 'flower carpet'] },
  { id: 'k13', word: 'മരമടി', manglish: 'Maramadi', category: 'kerala', categoryLabel: IMPOSTER_CATEGORY_LABELS.kerala, difficulty: 'hard', aliases: ['maramadi', 'bull race', 'pothu pootu'] },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. 🍲 KERALA FOOD (ഭക്ഷണം)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'f1', word: 'സദ്യ', manglish: 'Sadya', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['sadya', 'onasadya', 'ila sadya'] },
  { id: 'f2', word: 'പുട്ടും കടലയും', manglish: 'Puttu and Kadala', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['puttu and kadala', 'puttu', 'kadala curry', 'puttum kadalayum'] },
  { id: 'f3', word: 'പൊറോട്ടയും ബീഫും', manglish: 'Porotta and Beef', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['porotta and beef', 'parotta', 'beef fry', 'porotta'] },
  { id: 'f4', word: 'കപ്പയും മീൻകറിയും', manglish: 'Kappa and Meen Curry', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['kappa and meen curry', 'kappa', 'tapioca', 'fish curry'] },
  { id: 'f5', word: 'അടപ്രഥമൻ', manglish: 'Ada Pradhaman', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'medium', aliases: ['ada pradhaman', 'payasam', 'pradhaman'] },
  { id: 'f6', word: 'പഴംപൊരി', manglish: 'Pazham Pori', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['pazham pori', 'ethakka appam', 'banana fritter'] },
  { id: 'f7', word: 'ഉണ്ണിയപ്പം', manglish: 'Unniyappam', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['unniyappam', 'neyyappam'] },
  { id: 'f8', word: 'തലശ്ശേരി ബിരിയാണി', manglish: 'Thalassery Biriyani', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'medium', aliases: ['thalassery biriyani', 'biriyani', 'dum biriyani'] },
  { id: 'f9', word: 'കരിമീൻ പൊള്ളിച്ചത്', manglish: 'Karimeen Pollichathu', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'medium', aliases: ['karimeen pollichathu', 'karimeen', 'pearl spot'] },
  { id: 'f10', word: 'അപ്പവും സ്റ്റൂവും', manglish: 'Appam and Stew', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['appam and stew', 'palappam', 'stew', 'appam'] },
  { id: 'f11', word: 'സുഖിയൻ', manglish: 'Sukhiyan', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'hard', aliases: ['sukhiyan', 'sugiyan'] },
  { id: 'f12', word: 'പാലട പായസം', manglish: 'Palada Payasam', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['palada payasam', 'palada', 'payasam'] },
  { id: 'f13', word: 'പരിപ്പുവട', manglish: 'Parippuvada', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['parippuvada', 'parippu vada'] },
  { id: 'f14', word: 'ഉഴുന്നുവട', manglish: 'Uzhunnuvada', category: 'food', categoryLabel: IMPOSTER_CATEGORY_LABELS.food, difficulty: 'easy', aliases: ['uzhunnuvada', 'medu vada', 'vada'] },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. 📍 KERALA PLACES (സ്ഥലങ്ങൾ)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'p1', word: 'ആലപ്പുഴ', manglish: 'Alappuzha', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['alappuzha', 'alleppey', 'venice of the east'] },
  { id: 'p2', word: 'മൂന്നാർ', manglish: 'Munnar', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['munnar', 'tea garden', 'hill station'] },
  { id: 'p3', word: 'വയനാട്', manglish: 'Wayanad', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['wayanad', 'banasura', 'edakkal'] },
  { id: 'p4', word: 'കൊച്ചി', manglish: 'Kochi', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['kochi', 'cochin', 'fort kochi', 'marine drive'] },
  { id: 'p5', word: 'കോവളം', manglish: 'Kovalam', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['kovalam', 'beach', 'lighthouse'] },
  { id: 'p6', word: 'കോഴിക്കോട്', manglish: 'Kozhikode', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['kozhikode', 'calicut', 'mittayi theruvu', 'halwa'] },
  { id: 'p7', word: 'ശബരിമല', manglish: 'Sabarimala', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['sabarimala', 'ayyappa', 'swamiye saranam'] },
  { id: 'p8', word: 'വാഗമൺ', manglish: 'Vagamon', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'medium', aliases: ['vagamon', 'pine forest'] },
  { id: 'p9', word: 'വർക്കല', manglish: 'Varkala', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'medium', aliases: ['varkala', 'cliff', 'papanasam'] },
  { id: 'p10', word: 'ബേക്കൽ കോട്ട', manglish: 'Bekal Fort', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'medium', aliases: ['bekal fort', 'bekal', 'kasaragod'] },
  { id: 'p11', word: 'അതിരപ്പിള്ളി', manglish: 'Athirappilly', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'easy', aliases: ['athirappilly', 'waterfalls', 'bahubali'] },
  { id: 'p12', word: 'സൈലന്റ് വാലി', manglish: 'Silent Valley', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'hard', aliases: ['silent valley', 'national park'] },
  { id: 'p13', word: 'കുട്ടനാട്', manglish: 'Kuttanad', category: 'places', categoryLabel: IMPOSTER_CATEGORY_LABELS.places, difficulty: 'medium', aliases: ['kuttanad', 'paddy field'] },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. 📦 EVERYDAY OBJECTS (നിത്യോപയോഗ വസ്തുക്കൾ)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'o1', word: 'നിലവിളക്ക്', manglish: 'Nilavilakku', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['nilavilakku', 'vilakku', 'lamp'] },
  { id: 'o2', word: 'തൂശനില', manglish: 'Thoosanila', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['thoosanila', 'vazhayila', 'banana leaf', 'ila'] },
  { id: 'o3', word: 'കിണ്ടി', manglish: 'Kindi', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'medium', aliases: ['kindi', 'vessel'] },
  { id: 'o4', word: 'പായ', manglish: 'Paaya', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['paaya', 'mat', 'pullupaya'] },
  { id: 'o5', word: 'ഓലക്കുട', manglish: 'Olakuda', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'medium', aliases: ['olakuda', 'kuda', 'umbrella', 'palm umbrella'] },
  { id: 'o6', word: 'ഉരലും ഉലക്കയും', manglish: 'Ural and Ulakka', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'medium', aliases: ['ural and ulakka', 'ural', 'ulakka', 'mortar pestle'] },
  { id: 'o7', word: 'മുറം', manglish: 'Muram', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['muram', 'winnow'] },
  { id: 'o8', word: 'ചിരവ', manglish: 'Chirava', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['chirava', 'coconut scraper'] },
  { id: 'o9', word: 'റേഡിയോ', manglish: 'Radio', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['radio', 'transistor'] },
  { id: 'o10', word: 'തഴപ്പായ', manglish: 'Thazhapaaya', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'hard', aliases: ['thazhapaaya', 'thazha paya'] },
  { id: 'o11', word: 'മൺചട്ടി', manglish: 'Manchatti', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'easy', aliases: ['manchatti', 'chatti', 'clay pot'] },
  { id: 'o12', word: 'തൂക്കുവിളക്ക്', manglish: 'Thookkuvilakku', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'hard', aliases: ['thookkuvilakku', 'hanging lamp'] },
  { id: 'o13', word: 'മുണ്ടും നേരിയതും', manglish: 'Mundum Neriyathum', category: 'objects', categoryLabel: IMPOSTER_CATEGORY_LABELS.objects, difficulty: 'medium', aliases: ['mundum neriyathum', 'kasavu mundu', 'settu mundu'] },
];

export class ImposterWordSelector {
  private usedWordIds = new Set<string>();

  pickWord(category: ImposterCategory, difficulty: ImposterDifficulty): ImposterWord {
    // 1. Filter by category
    let pool = IMPOSTER_WORDS.filter(w => {
      if (category === 'mixed') return true;
      return w.category === category;
    });

    // 2. Filter by difficulty
    if (difficulty !== 'mixed') {
      const difficultyPool = pool.filter(w => w.difficulty === difficulty);
      if (difficultyPool.length > 0) pool = difficultyPool;
    }

    // 3. Exclude previously used words in this session if possible
    const freshPool = pool.filter(w => !this.usedWordIds.has(w.id));
    const activePool = freshPool.length > 0 ? freshPool : pool;

    if (activePool.length === 0) {
      // Fallback
      return IMPOSTER_WORDS[0];
    }

    const selected = activePool[Math.floor(Math.random() * activePool.length)];
    this.usedWordIds.add(selected.id);
    return selected;
  }

  reset() {
    this.usedWordIds.clear();
  }
}
