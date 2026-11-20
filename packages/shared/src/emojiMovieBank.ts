export type EmojiDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type EmojiGameMode = 'race' | 'turn';

export interface EmojiMovieItem {
  id: string;
  title: string;           // Malayalam Unicode title
  manglish: string;        // English transliteration
  altSpellings?: string[]; // Accepted common variations / aliases
  emojis: string;          // Emojis representing the movie
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string;            // Helpful clue / star cast / director
  category: string;        // Movie genre / category
  year: number;            // Release year
}

export const EMOJI_MOVIES: EmojiMovieItem[] = [
  // ─── 🟢 EASY (Iconic Blockbusters & Well-known Cult Classics) ───────────────────
  {
    id: 'em-e-01',
    title: 'കുമ്പളങ്ങി നൈറ്റ്സ്',
    manglish: 'Kumbalangi Nights',
    altSpellings: ['kumbalangi', 'kumbalangy nights', 'kumbalangy', 'kumbalangi night'],
    emojis: '🎳 🌙 🐟 🏝️',
    difficulty: 'easy',
    hint: '2019 superhit directed by Madhu C. Narayanan, starring Soubin, Shane Nigam, and Fahadh Faasil (Shammi).',
    category: 'Family Drama',
    year: 2019,
  },
  {
    id: 'em-e-02',
    title: 'മണിച്ചിത്രത്താഴ്',
    manglish: 'Manichithrathazhu',
    altSpellings: ['manichitrathazhu', 'manichithrathazu', 'manichithrathaazhu', 'nagavalli', 'manichithram'],
    emojis: '🔔 🗝️ 🔒 💃 👻',
    difficulty: 'easy',
    hint: '1993 psychological horror classic starring Shobana as Nagavalli, Mohanlal as Dr. Sunny, Suresh Gopi.',
    category: 'Psychological Thriller',
    year: 1993,
  },
  {
    id: 'em-e-03',
    title: 'സ്ഫടികം',
    manglish: 'Spadikam',
    altSpellings: ['sphadikam', 'spatikam', 'aadu thoma', 'aaduthoma'],
    emojis: '🕶️ 🥋 🚚 📐 🐐',
    difficulty: 'easy',
    hint: '1995 action drama directed by Bhadran. Aadu Thoma removes his mundu and Ray-Ban glasses!',
    category: 'Action Drama',
    year: 1995,
  },
  {
    id: 'em-e-04',
    title: 'മീശമാധവൻ',
    manglish: 'Meeshamadhavan',
    altSpellings: ['meesha madhavan', 'meesamadhavan', 'madhavan'],
    emojis: '🥸 💍 🐓 🚲 💰',
    difficulty: 'easy',
    hint: '2002 comedy blockbuster directed by Lal Jose. Dileep twists his moustache before every theft!',
    category: 'Comedy Romance',
    year: 2002,
  },
  {
    id: 'em-e-05',
    title: 'ദൃശ്യം',
    manglish: 'Drishyam',
    altSpellings: ['dhrishyam', 'drishyam 1', 'drishyam 2', 'georgekutty'],
    emojis: '👁️ 🕵️‍♂️ 🚔 📅 🪦',
    difficulty: 'easy',
    hint: '2013 thriller directed by Jeethu Joseph. Georgekutty and family visit the church & hotel on August 2.',
    category: 'Suspense Thriller',
    year: 2013,
  },
  {
    id: 'em-e-06',
    title: 'പ്രേമം',
    manglish: 'Premam',
    altSpellings: ['premam', 'george', 'malar miss', 'mary'],
    emojis: '🦋 🕶️ 🎓 💖 🍰',
    difficulty: 'easy',
    hint: '2015 romantic blockbuster by Alphonse Puthren starring Nivin Pauly, Sai Pallavi (Malar Miss).',
    category: 'Romance Coming-of-Age',
    year: 2015,
  },
  {
    id: 'em-e-07',
    title: 'ലൂസിഫർ',
    manglish: 'Lucifer',
    altSpellings: ['lucifer', 'stephen nedumpally', 'stephen', 'abram qureshi'],
    emojis: '😈 🕶️ 🚁 🩸 🗳️',
    difficulty: 'easy',
    hint: '2019 political mass action directed by Prithviraj Sukumaran starring Mohanlal as Stephen Nedumpally.',
    category: 'Political Action',
    year: 2019,
  },
  {
    id: 'em-e-08',
    title: 'ആവേശം',
    manglish: 'Aavesham',
    altSpellings: ['avesham', 'ranga', 'ranga annan', 'aavesam'],
    emojis: '🕺 💥 🔫 🕶️ 🍻',
    difficulty: 'easy',
    hint: '2024 mass comedy blockbuster directed by Jithu Madhavan starring Fahadh Faasil as Ranga Annan!',
    category: 'Action Comedy',
    year: 2024,
  },
  {
    id: 'em-e-09',
    title: 'രോമാഞ്ചം',
    manglish: 'Romancham',
    altSpellings: ['romancham', 'ouija', 'ouija board'],
    emojis: '👻 ☕ 🕯️ 🔮 🏠',
    difficulty: 'easy',
    hint: '2023 horror comedy based on real incidents of 7 bachelors using an Ouija board in Bangalore.',
    category: 'Horror Comedy',
    year: 2023,
  },
  {
    id: 'em-e-10',
    title: 'നാടോടിക്കാറ്റ്',
    manglish: 'Nadodikkattu',
    altSpellings: ['nadodikkatu', 'nadodikattu', 'dasan and vijayan', 'dasan vijayan'],
    emojis: '⛵ 🐄 🕶️ 🏜️ 💼',
    difficulty: 'easy',
    hint: '1987 legendary comedy directed by Sathyan Anthikad. Dasan and Vijayan land in Chennai instead of Dubai!',
    category: 'Comedy Classic',
    year: 1987,
  },
  {
    id: 'em-e-11',
    title: 'കിലുക്കം',
    manglish: 'Kilukkam',
    altSpellings: ['kilukkam', 'joji', 'nandhini', 'nischal'],
    emojis: '🔔 🏔️ 🤪 📸 🚂',
    difficulty: 'easy',
    hint: '1991 all-time comedy classic set in Ooty starring Mohanlal, Revathi, and Jagathy Sreekumar.',
    category: 'Comedy Musical',
    year: 1991,
  },
  {
    id: 'em-e-12',
    title: 'ബാംഗ്ലൂർ ഡേയ്സ്',
    manglish: 'Bangalore Days',
    altSpellings: ['bangalore days', 'banglore days', 'bangalore dayz'],
    emojis: '🏙️ 🏍️ 🛹 👫 ☕',
    difficulty: 'easy',
    hint: '2014 youthful drama directed by Anjali Menon starring Dulquer, Fahadh, Nivin Pauly, and Nazriya.',
    category: 'Youth Drama',
    year: 2014,
  },
  {
    id: 'em-e-13',
    title: 'സി.ഐ.ഡി മൂസ',
    manglish: 'C.I.D Moosa',
    altSpellings: ['cid moosa', 'cid moosaa', 'cidmusa', 'moosa'],
    emojis: '🕵️‍♂️ 🐕 💣 🚗 🔍',
    difficulty: 'easy',
    hint: '2003 slapstick comedy directed by Johny Antony starring Dileep, Jagathy, and Arjun the brave dog!',
    category: 'Slapstick Comedy',
    year: 2003,
  },
  {
    id: 'em-e-14',
    title: 'പഞ്ചാബി ഹൗസ്',
    manglish: 'Punjabi House',
    altSpellings: ['punjabi house', 'punjabihouse', 'unni', 'ramanathan'],
    emojis: '👳 🏠 🌊 🤐 🥘',
    difficulty: 'easy',
    hint: '1998 comedy classic directed by Rafi Mecartin. Unni jumps into sea and pretends to be mute in a Punjabi home.',
    category: 'Comedy Classic',
    year: 1998,
  },
  {
    id: 'em-e-15',
    title: 'തേന്മാവിൻ കൊമ്പത്ത്',
    manglish: 'Thenmavin Kombathu',
    altSpellings: ['thenmavin kombath', 'thenmaavin kombathu', 'manikyan', 'karthumbi'],
    emojis: '🥭 🌳 🐂 💃 🪕',
    difficulty: 'easy',
    hint: '1994 Priyadarshan musical romance starring Mohanlal as Manikyan and Shobana as Karthumbi.',
    category: 'Romance Musical',
    year: 1994,
  },
  {
    id: 'em-e-16',
    title: 'മിന്നൽ മുരളി',
    manglish: 'Minnal Murali',
    altSpellings: ['minnal murali', 'minnalmurali', 'murali', 'shibu'],
    emojis: '⚡ 🦸‍♂️ 🧵 🎭 🎪',
    difficulty: 'easy',
    hint: '2021 Malayalam superhero film directed by Basil Joseph starring Tovino Thomas and Guru Somasundaram.',
    category: 'Superhero Fantasy',
    year: 2021,
  },
  {
    id: 'em-e-17',
    title: 'മഞ്ഞുമ്മൽ ബോയ്സ്',
    manglish: 'Manjummel Boys',
    altSpellings: ['manjummel boys', 'manjumal boys', 'manjummal boys', 'guna cave'],
    emojis: '🕳️ 🧗‍♂️ 🪢 👬 🌧️',
    difficulty: 'easy',
    hint: '2024 survival thriller by Chidambaram. Friends rescue Subhash trapped inside the treacherous Guna Caves!',
    category: 'Survival Thriller',
    year: 2024,
  },
  {
    id: 'em-e-18',
    title: 'പുലിമുരുകൻ',
    manglish: 'Pulimurugan',
    altSpellings: ['puli murugan', 'pulimurukan', 'murugan'],
    emojis: '🐅 🌲 🏹 🪵 🩸',
    difficulty: 'easy',
    hint: '2016 record-breaking action film directed by Vysakh starring Mohanlal fighting wild leopards.',
    category: 'Action Adventure',
    year: 2016,
  },
  {
    id: 'em-e-19',
    title: 'ആട് ഒരു ഭീകരജീവിയാണ്',
    manglish: 'Aadu',
    altSpellings: ['aadu', 'aadu 2', 'shaji pappan', 'aadu oru bheegara jeeviyanu', 'aadu oru bheekara jeeviyanu'],
    emojis: '🐐 🏆 🚐 🗡️ 🥊',
    difficulty: 'easy',
    hint: '2015 cult comedy directed by Midhun Manuel Thomas starring Jayasurya as Shaji Pappan with his red mundu.',
    category: 'Comedy Cult',
    year: 2015,
  },
  {
    id: 'em-e-20',
    title: 'ഉസ്താദ് ഹോട്ടൽ',
    manglish: 'Ustad Hotel',
    altSpellings: ['ustad hotel', 'usthad hotel', 'faizi', 'kareem ikka'],
    emojis: '☕ 🍛 👴 👨‍🍳 🌊',
    difficulty: 'easy',
    hint: '2012 Anwar Rasheed drama starring Dulquer Salmaan (Faizi) and Thilakan (Kareem Ikka) brewing Sulaimani.',
    category: 'Drama',
    year: 2012,
  },

  // ─── 🟡 MEDIUM (Popular Classics, Satirical Comedies & Blockbusters) ───────────
  {
    id: 'em-m-01',
    title: 'സന്ദേശം',
    manglish: 'Sandhesham',
    altSpellings: ['sandhesam', 'sandesham', 'poland', 'kotthuparamban'],
    emojis: '🚩 📢 📰 👨‍👦‍👦 🤝',
    difficulty: 'medium',
    hint: '1991 political satire directed by Sathyan Anthikad. "പോളണ്ടിനെ പറ്റി ഒരക്ഷരം മിണ്ടരുത്!"',
    category: 'Political Satire',
    year: 1991,
  },
  {
    id: 'em-m-02',
    title: 'ഇൻ ഹരിഹർ നഗർ',
    manglish: 'In Harihar Nagar',
    altSpellings: ['in harihar nagar', 'harihar nagar', 'hariharnagar', 'appukuttan'],
    emojis: '🏡 4️⃣ 👨‍🦱 👩 💐',
    difficulty: 'medium',
    hint: '1990 comedy directed by Siddique-Lal. Mahadevan, Govindan Kutty, Appukuttan, and Thomaskutty.',
    category: 'Comedy Classic',
    year: 1990,
  },
  {
    id: 'em-m-03',
    title: 'ഗോഡ്ഫാദർ',
    manglish: 'Godfather',
    altSpellings: ['god father', 'godfather', 'anjooran', 'achamma'],
    emojis: '👴 ⚔️ 👵 💔 🏛️',
    difficulty: 'medium',
    hint: '1991 comedy drama directed by Siddique-Lal. Anjooran family vs Anappara Achamma clan feud!',
    category: 'Family Comedy',
    year: 1991,
  },
  {
    id: 'em-m-04',
    title: 'രാജമാണിക്യം',
    manglish: 'Rajamanikyam',
    altSpellings: ['raja manikyam', 'rajamanikyam', 'bellary raja'],
    emojis: '🕶️ 🐃 👑 💰 🏰',
    difficulty: 'medium',
    hint: '2005 mega blockbuster starring Mammootty as Bellary Raja with iconic Trivandrum dialect.',
    category: 'Action Comedy',
    year: 2005,
  },
  {
    id: 'em-m-05',
    title: 'തട്ടത്തിൻ മറയത്ത്',
    manglish: 'Thattathin Marayathu',
    altSpellings: ['thattathin marayath', 'thattathin marayathu', 'vinod', 'ayesha'],
    emojis: '🧕 💖 🕌 🚲 🌧️',
    difficulty: 'medium',
    hint: '2012 musical romantic hit directed by Vineeth Sreenivasan starring Nivin Pauly and Isha Talwar.',
    category: 'Romance Musical',
    year: 2012,
  },
  {
    id: 'em-m-06',
    title: 'ചാർലി',
    manglish: 'Charlie',
    altSpellings: ['charlie', 'charli', 'tessa'],
    emojis: '🎨 🧞‍♂️ 🎈 🗺️ 🪄',
    difficulty: 'medium',
    hint: '2015 Martin Prakkat film starring Dulquer Salmaan as the free-spirited bohemian magician Charlie.',
    category: 'Romance Drama',
    year: 2015,
  },
  {
    id: 'em-m-07',
    title: 'അയ്യപ്പനും കോശിയും',
    manglish: 'Ayyappanum Koshiyum',
    altSpellings: ['ayyappanum koshiyum', 'ayyappan koshi', 'ayappanum koshiyum'],
    emojis: '👮‍♂️ 🥊 🚙 🥃 🌲',
    difficulty: 'medium',
    hint: '2020 action drama by Sachy featuring clash of egos between SI Ayyappan Nair and Havildar Koshy.',
    category: 'Action Drama',
    year: 2020,
  },
  {
    id: 'em-m-08',
    title: 'ജയ ജയ ജയ ജയ ഹേ',
    manglish: 'Jaya Jaya Jaya Jaya Hey',
    altSpellings: ['jaya jaya jaya jaya hey', 'jaya hey', 'jayajayajayahey', 'rajesh'],
    emojis: '🥋 🥊 🧕 🍗 🐔',
    difficulty: 'medium',
    hint: '2022 family satire starring Darshana Rajendran and Basil Joseph. Taekwondo kicks against domestic patriarchy!',
    category: 'Comedy Satire',
    year: 2022,
  },
  {
    id: 'em-m-09',
    title: 'പ്രാഞ്ചിയേട്ടൻ & ദ സെയ്ന്റ്',
    manglish: 'Pranchiyettan and the Saint',
    altSpellings: ['pranchiyettan', 'pranchiyettan and the saint', 'aripranchi'],
    emojis: '🍚 🪙 ⛪ 😇 🎙️',
    difficulty: 'medium',
    hint: '2010 satirical comedy directed by Ranjith starring Mammootty as rice merchant Francis in Thrissur.',
    category: 'Satire Comedy',
    year: 2010,
  },
  {
    id: 'em-m-10',
    title: 'കല്ല്യാണരാമൻ',
    manglish: 'Kalyanaraman',
    altSpellings: ['kalyanaraman', 'kalyana raman', 'pyari'],
    emojis: '💒 🍲 💍 🤹 🧑‍🍳',
    difficulty: 'medium',
    hint: '2002 Shafi comedy starring Dileep, Navya Nair, and Salim Kumar as the beloved catering assistant Pyari.',
    category: 'Comedy Romance',
    year: 2002,
  },
  {
    id: 'em-m-11',
    title: 'പാണ്ടിപ്പട',
    manglish: 'Pandippada',
    altSpellings: ['pandippada', 'pandi pada', 'bhuvanachandran'],
    emojis: '🌾 🤼‍♂️ 💥 🛺 🥊',
    difficulty: 'medium',
    hint: '2005 Rafi Mecartin comedy starring Dileep caught between two warring landlords in Tamil Nadu.',
    category: 'Slapstick Comedy',
    year: 2005,
  },
  {
    id: 'em-m-12',
    title: 'യോദ്ധാ',
    manglish: 'Yoddha',
    altSpellings: ['yodha', 'yoddha', 'asokan', 'unnikkuttan'],
    emojis: '🧘‍♂️ 🏔️ 🥊 🧒 🛕',
    difficulty: 'medium',
    hint: '1992 Sangeeth Sivan action comedy set in Nepal. Mohanlal as Thaiparambil Ashokan protecting Rimpoche.',
    category: 'Action Fantasy',
    year: 1992,
  },
  {
    id: 'em-m-13',
    title: 'ചിത്രം',
    manglish: 'Chithram',
    altSpellings: ['chithram', 'chitram', 'vishnu', 'kalyani'],
    emojis: '🖼️ 📸 🏰 ⏳ 👮',
    difficulty: 'medium',
    hint: '1988 Priyadarshan classic starring Mohanlal as Vishnu who poses as a wealthy husband for 14 days.',
    category: 'Drama Comedy',
    year: 1988,
  },
  {
    id: 'em-m-14',
    title: 'കിരീടം',
    manglish: 'Kireedam',
    altSpellings: ['kireedam', 'kireetam', 'sethumadhavan', 'keerikadan jose'],
    emojis: '👑 👮‍♂️ 🔪 🩸 ⛓️',
    difficulty: 'medium',
    hint: '1989 tragic masterpiece directed by Sibi Malayil. Sethumadhavan dreams of becoming a police officer.',
    category: 'Tragedy Drama',
    year: 1989,
  },
  {
    id: 'em-m-15',
    title: 'ചോട്ടാ മുംബൈ',
    manglish: 'Chotta Mumbai',
    altSpellings: ['chotta mumbai', 'chotta mumby', 'vasco da gama', 'thalai'],
    emojis: '🌆 🍺 🎲 🏍️ 🕶️',
    difficulty: 'medium',
    hint: '2007 Anwar Rasheed comedy starring Mohanlal as Vasco da Gama (Thalai) and his gang in Fort Kochi.',
    category: 'Action Comedy',
    year: 2007,
  },
  {
    id: 'em-m-16',
    title: 'ഭീഷ്മ പർവ്വം',
    manglish: 'Bheeshma Parvam',
    altSpellings: ['bheeshma parvam', 'bheeshmaparvam', 'michael', 'michael anjootikkaran'],
    emojis: '🕶️ 🚗 🧔 ✝️ 🩸',
    difficulty: 'medium',
    hint: '2022 stylish period crime drama directed by Amal Neerad starring Mammootty as Michael Anjootti.',
    category: 'Action Crime',
    year: 2022,
  },
  {
    id: 'em-m-17',
    title: 'പ്രേമലു',
    manglish: 'Premalu',
    altSpellings: ['premalu', 'sachin', 'reenu', 'jk'],
    emojis: '💖 🍕 💻 ✈️ 🍻',
    difficulty: 'medium',
    hint: '2024 romantic comedy blockbuster directed by Girish A.D. set in Hyderabad starring Naslen & Mamitha.',
    category: 'Romance Comedy',
    year: 2024,
  },
  {
    id: 'em-m-18',
    title: 'വാഴ',
    manglish: 'Vazha',
    altSpellings: ['vazha', 'vaazha', 'biopic of a billion boys'],
    emojis: '🍌 🏫 👬 💔 🍺',
    difficulty: 'medium',
    hint: '2024 youth comedy drama subtitled "Biopic of a Billion Boys" about boys labeled useless by parents.',
    category: 'Youth Comedy',
    year: 2024,
  },

  // ─── 🔴 HARD (Cult Classics, Clever Metaphors & Deeper Cinema) ──────────────────
  {
    id: 'em-h-01',
    title: 'റാംജി റാവു സ്പീക്കിംഗ്',
    manglish: 'Ramji Rao Speaking',
    altSpellings: ['ramji rao speaking', 'ramjirao speaking', 'ramji rao', 'mannar mathai'],
    emojis: '📞 💰 🎭 🏠 📦',
    difficulty: 'hard',
    hint: '1989 Siddique-Lal comedy where three broke bachelors receive a wrong phone call kidnapping ransom!',
    category: 'Comedy Cult',
    year: 1989,
  },
  {
    id: 'em-h-02',
    title: 'ആമേൻ',
    manglish: 'Amen',
    altSpellings: ['amen', 'aamen', 'solomon', 'shoshanna'],
    emojis: '🎺 ⛪ ⛵ 🕊️ 💩',
    difficulty: 'hard',
    hint: '2013 musical satire directed by Lijo Jose Pellissery set around the St. George clarinet band in Kumarankary.',
    category: 'Musical Satire',
    year: 2013,
  },
  {
    id: 'em-h-03',
    title: 'ചന്ദ്രലേഖ',
    manglish: 'Chandralekha',
    altSpellings: ['chandralekha', 'chandra lekha', 'appukuttan nair'],
    emojis: '🏥 🌙 👩‍🦽 💍 💰',
    difficulty: 'hard',
    hint: '1997 Priyadarshan comedy where unemployed Appukuttan rescues a coma patient and poses as her husband.',
    category: 'Comedy Romance',
    year: 1997,
  },
  {
    id: 'em-h-04',
    title: 'ട്രാഫിക്',
    manglish: 'Traffic',
    altSpellings: ['traffic', 'drishyam', 'rajesh pillai'],
    emojis: '🚦 🫀 🚑 🌧️ ⏱️',
    difficulty: 'hard',
    hint: '2011 road thriller by Rajesh Pillai about transporting a harvested human heart through stormy highway traffic.',
    category: 'Road Thriller',
    year: 2011,
  },
  {
    id: 'em-h-05',
    title: 'നരസിംഹം',
    manglish: 'Narasimham',
    altSpellings: ['narasimham', 'induchoodan', 'poovalli induchoodan'],
    emojis: '🦁 ⚖️ 🗡️ 🥃 ⚡',
    difficulty: 'hard',
    hint: '2000 mass film directed by Shaji Kailas. Mohanlal as Poovalli Induchoodan defending the innocent.',
    category: 'Mass Action',
    year: 2000,
  },
  {
    id: 'em-h-06',
    title: 'വെള്ളിമൂങ്ങ',
    manglish: 'Vellimoonga',
    altSpellings: ['vellimoonga', 'velli moonga', 'cp mamachan'],
    emojis: '🦉 🤍 🗳️ 🌾 🛵',
    difficulty: 'hard',
    hint: '2014 political satire directed by Jibu Jacob starring Biju Menon as bachelor politician CP Mamachan.',
    category: 'Political Comedy',
    year: 2014,
  },
  {
    id: 'em-h-07',
    title: 'മേരിക്കുണ്ടൊരു കുഞ്ഞാട്',
    manglish: 'Marykkundoru Kunjaadu',
    altSpellings: ['marykkundoru kunjaadu', 'marykkundoru kunjaad', 'solomon', 'kunjaadu'],
    emojis: '🐑 ⛪ 🌾 🏃 🔔',
    difficulty: 'hard',
    hint: '2010 Shafi comedy starring Dileep as Solomon, a timid village boy terrified of everything.',
    category: 'Comedy',
    year: 2010,
  },
  {
    id: 'em-h-08',
    title: 'വിയറ്റ്നാം കോളനി',
    manglish: 'Vietnam Colony',
    altSpellings: ['vietnam colony', 'vietnamcolony', 'krishnamoorthy'],
    emojis: '🏚️ 🏗️ 🤼 🗡️ 🥊',
    difficulty: 'hard',
    hint: '1992 Siddique-Lal comedy drama starring Mohanlal as Krishnamoorthy sent to evict a rowdy slum colony.',
    category: 'Comedy Drama',
    year: 1992,
  },
  {
    id: 'em-h-09',
    title: 'മേഘം',
    manglish: 'Megham',
    altSpellings: ['megham', 'megam', 'major col ravivarma'],
    emojis: '☁️ 🌧️ 🪖 🐎 💔',
    difficulty: 'hard',
    hint: '1999 Priyadarshan film starring Mammootty as an authoritarian army major visiting Kerala for recovery.',
    category: 'Drama Comedy',
    year: 1999,
  },
  {
    id: 'em-h-10',
    title: 'അനിയത്തിപ്രാവ്',
    manglish: 'Aniyathipraavu',
    altSpellings: ['aniyathipraavu', 'aniyathipravu', 'sudhi', 'mini'],
    emojis: '🕊️ 💌 🚣 💔 🏡',
    difficulty: 'hard',
    hint: '1997 romantic classic directed by Fazil, marking Kunchacko Boban and Shalini as an iconic on-screen pair.',
    category: 'Romantic Drama',
    year: 1997,
  },
  {
    id: 'em-h-11',
    title: 'മഴവിൽക്കാവടി',
    manglish: 'Mazhavilkavadi',
    altSpellings: ['mazhavilkavadi', 'mazhavil kavadi', 'velayudhankutty'],
    emojis: '🌈 🦚 🪓 🌴 🐂',
    difficulty: 'hard',
    hint: '1989 Sathyan Anthikad rural comedy drama starring Jayaram as a simple villager who travels to Madurai.',
    category: 'Comedy Drama',
    year: 1989,
  },
  {
    id: 'em-h-12',
    title: 'തുറുപ്പുഗുലാൻ',
    manglish: 'Thuruppugulan',
    altSpellings: ['thuruppugulan', 'thuruppu gulan', 'gulan'],
    emojis: '🃏 🏨 🥋 🍴 💥',
    difficulty: 'hard',
    hint: '2006 Johny Antony action comedy starring Mammootty as Gulan, a streetwise five-star hotel boss.',
    category: 'Action Comedy',
    year: 2006,
  },
];

// ─── Answer Normalisation & Fuzzy Validation ───────────────────────────────────

/**
 * Strips whitespace, punctuation, case and accents for reliable matching.
 */
export function normalizeAnswer(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, '') // keep letters, numbers and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Validates a user guess against a movie item.
 * Supports:
 *  - Malayalam Unicode title exact / space-agnostic match
 *  - English transliteration (manglish) match
 *  - Any item from altSpellings list
 *  - Fuzzy phonetic match (distance <= 1 for short, <= 2 for long strings)
 */
export function validateMovieAnswer(guess: string, movie: EmojiMovieItem): boolean {
  const cleanGuess = normalizeAnswer(guess);
  if (!cleanGuess) return false;

  const cleanGuessNoSpaces = cleanGuess.replace(/\s+/g, '');

  // 1. Direct Malayalam Unicode match
  const cleanTitle = normalizeAnswer(movie.title);
  if (cleanGuess === cleanTitle || cleanGuessNoSpaces === cleanTitle.replace(/\s+/g, '')) {
    return true;
  }

  // 2. Transliteration (Manglish) match
  const cleanManglish = normalizeAnswer(movie.manglish);
  if (cleanGuess === cleanManglish || cleanGuessNoSpaces === cleanManglish.replace(/\s+/g, '')) {
    return true;
  }

  // 3. Alternative spellings list
  if (movie.altSpellings && movie.altSpellings.length > 0) {
    for (const alt of movie.altSpellings) {
      const cleanAlt = normalizeAnswer(alt);
      if (cleanGuess === cleanAlt || cleanGuessNoSpaces === cleanAlt.replace(/\s+/g, '')) {
        return true;
      }
    }
  }

  // 4. Fuzzy match for English transliterations
  const candidates = [cleanManglish, ...(movie.altSpellings || []).map(normalizeAnswer)];
  for (const cand of candidates) {
    // Only apply fuzzy matching if candidate is in latin letters
    if (/^[a-z0-9 ]+$/.test(cand) && /^[a-z0-9 ]+$/.test(cleanGuess)) {
      const allowedDistance = cand.length > 8 ? 2 : cand.length >= 4 ? 1 : 0;
      if (levenshteinDistance(cleanGuess, cand) <= allowedDistance) {
        return true;
      }
      if (levenshteinDistance(cleanGuessNoSpaces, cand.replace(/\s+/g, '')) <= allowedDistance) {
        return true;
      }
    }
  }

  return false;
}
