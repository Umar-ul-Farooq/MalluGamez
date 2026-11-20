import type { CharadesDifficulty } from '@chitram/shared';

export interface CharadesMovie {
  id: string;
  title: string;
  manglish: string;
  year?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const CHARADES_MOVIES: CharadesMovie[] = [
  // ─── 🟢 EASY (Well-known Blockbusters & Modern Classics) ───────────────────────
  { id: 'm-e-01', title: 'മണിച്ചിത്രത്താഴ്', manglish: 'Manichithrathazhu', year: 1993, difficulty: 'easy' },
  { id: 'm-e-02', title: 'സ്ഫടികം', manglish: 'Spadikam', year: 1995, difficulty: 'easy' },
  { id: 'm-e-03', title: 'മീശമാധവൻ', manglish: 'Meeshamadhavan', year: 2002, difficulty: 'easy' },
  { id: 'm-e-04', title: 'ദൃശ്യം', manglish: 'Drishyam', year: 2013, difficulty: 'easy' },
  { id: 'm-e-05', title: 'പ്രേമം', manglish: 'Premam', year: 2015, difficulty: 'easy' },
  { id: 'm-e-06', title: 'ലൂസിഫർ', manglish: 'Lucifer', year: 2019, difficulty: 'easy' },
  { id: 'm-e-07', title: 'കുമ്പളങ്ങി നൈറ്റ്സ്', manglish: 'Kumbalangi Nights', year: 2019, difficulty: 'easy' },
  { id: 'm-e-08', title: 'ആവേശം', manglish: 'Aavesham', year: 2024, difficulty: 'easy' },
  { id: 'm-e-09', title: 'രോമാഞ്ചം', manglish: 'Romancham', year: 2023, difficulty: 'easy' },
  { id: 'm-e-10', title: 'നാടോടിക്കാറ്റ്', manglish: 'Nadodikkattu', year: 1987, difficulty: 'easy' },
  { id: 'm-e-11', title: 'കിലുക്കം', manglish: 'Kilukkam', year: 1991, difficulty: 'easy' },
  { id: 'm-e-12', title: 'ബാംഗ്ലൂർ ഡേയ്സ്', manglish: 'Bangalore Days', year: 2014, difficulty: 'easy' },
  { id: 'm-e-13', title: 'സി.ഐ.ഡി മൂസ', manglish: 'C.I.D Moosa', year: 2003, difficulty: 'easy' },
  { id: 'm-e-14', title: 'പഞ്ചാബി ഹൗസ്', manglish: 'Punjabi House', year: 1998, difficulty: 'easy' },
  { id: 'm-e-15', title: 'ഇൻ ഹരിഹർ നഗർ', manglish: 'In Harihar Nagar', year: 1990, difficulty: 'easy' },
  { id: 'm-e-16', title: 'ഗോഡ്ഫാദർ', manglish: 'Godfather', year: 1991, difficulty: 'easy' },
  { id: 'm-e-17', title: 'തേന്മാവിൻ കൊമ്പത്ത്', manglish: 'Thenmavin Kombathu', year: 1994, difficulty: 'easy' },
  { id: 'm-e-18', title: 'കിരീടം', manglish: 'Kireedam', year: 1989, difficulty: 'easy' },
  { id: 'm-e-19', title: 'ചിത്രം', manglish: 'Chithram', year: 1988, difficulty: 'easy' },
  { id: 'm-e-20', title: 'യോദ്ധാ', manglish: 'Yoddha', year: 1992, difficulty: 'easy' },
  { id: 'm-e-21', title: 'മഞ്ഞുമ്മൽ ബോയ്സ്', manglish: 'Manjummel Boys', year: 2024, difficulty: 'easy' },
  { id: 'm-e-22', title: 'തുറുപ്പുഗുലാൻ', manglish: 'Thuruppugulan', year: 2006, difficulty: 'easy' },
  { id: 'm-e-23', title: 'പുലിമുരുകൻ', manglish: 'Pulimurugan', year: 2016, difficulty: 'easy' },
  { id: 'm-e-24', title: 'ആട് ഒരു ഭീകരജീവിയാണ്', manglish: 'Aadu Oru Bheegara Jeeviyanu', year: 2015, difficulty: 'easy' },
  { id: 'm-e-25', title: 'മഹേഷിന്റെ പ്രതികാരം', manglish: 'Maheshinte Prathikaaram', year: 2016, difficulty: 'easy' },
  { id: 'm-e-26', title: 'തട്ടത്തിൻ മറയത്ത്', manglish: 'Thattathin Marayathu', year: 2012, difficulty: 'easy' },
  { id: 'm-e-27', title: 'ഉസ്താദ് ഹോട്ടൽ', manglish: 'Ustad Hotel', year: 2012, difficulty: 'easy' },
  { id: 'm-e-28', title: 'ചാർലി', manglish: 'Charlie', year: 2015, difficulty: 'easy' },
  { id: 'm-e-29', title: 'അയ്യപ്പനും കോശിയും', manglish: 'Ayyappanum Koshiyum', year: 2020, difficulty: 'easy' },
  { id: 'm-e-30', title: 'മിന്നൽ മുരളി', manglish: 'Minnal Murali', year: 2021, difficulty: 'easy' },
  { id: 'm-e-31', title: 'രാജമാണിക്യം', manglish: 'Rajamanikyam', year: 2005, difficulty: 'easy' },
  { id: 'm-e-32', title: 'പ്രാഞ്ചിയേട്ടൻ & ദ സെയ്ന്റ്', manglish: 'Pranchiyettan and the Saint', year: 2010, difficulty: 'easy' },
  { id: 'm-e-33', title: 'കല്ല്യാണരാമൻ', manglish: 'Kalyanaraman', year: 2002, difficulty: 'easy' },
  { id: 'm-e-34', title: 'പാണ്ടിപ്പട', manglish: 'Pandippada', year: 2005, difficulty: 'easy' },
  { id: 'm-e-35', title: 'അനിയത്തിപ്രാവ്', manglish: 'Aniyathipraavu', year: 1997, difficulty: 'easy' },
  { id: 'm-e-36', title: 'മേഘം', manglish: 'Megham', year: 1999, difficulty: 'easy' },
  { id: 'm-e-37', title: 'വിയറ്റ്നാം കോളനി', manglish: 'Vietnam Colony', year: 1992, difficulty: 'easy' },
  { id: 'm-e-38', title: 'നരസിംഹം', manglish: 'Narasimham', year: 2000, difficulty: 'easy' },
  { id: 'm-e-39', title: 'റൺ ബേബി റൺ', manglish: 'Run Baby Run', year: 2012, difficulty: 'easy' },
  { id: 'm-e-40', title: 'ജയ ജയ ജയ ജയ ഹേ', manglish: 'Jaya Jaya Jaya Jaya Hey', year: 2022, difficulty: 'easy' },

  // ─── 🟡 MEDIUM (Popular Films, Comedy Classics & Cult Hits) ───────────────────
  { id: 'm-m-01', title: 'സന്ദേശം', manglish: 'Sandhesham', year: 1991, difficulty: 'medium' },
  { id: 'm-m-02', title: 'മഴവിൽക്കാവടി', manglish: 'Mazhavilkavadi', year: 1989, difficulty: 'medium' },
  { id: 'm-m-03', title: 'മേഘസന്ദേശം', manglish: 'Meghasandesham', year: 2001, difficulty: 'medium' },
  { id: 'm-m-04', title: 'ചോട്ടാ മുംബൈ', manglish: 'Chotta Mumbai', year: 2007, difficulty: 'medium' },
  { id: 'm-m-05', title: 'ആമേൻ', manglish: 'Amen', year: 2013, difficulty: 'medium' },
  { id: 'm-m-06', title: 'റാംജി റാവു സ്പീക്കിംഗ്', manglish: 'Ramji Rao Speaking', year: 1989, difficulty: 'medium' },
  { id: 'm-m-07', title: 'ചന്ദ്രലേഖ', manglish: 'Chandralekha', year: 1997, difficulty: 'medium' },
  { id: 'm-m-08', title: 'കമ്മട്ടിപ്പാടം', manglish: 'Kammattipaadam', year: 2016, difficulty: 'medium' },
  { id: 'm-m-09', title: 'ട്രാഫിക്', manglish: 'Traffic', year: 2011, difficulty: 'medium' },
  { id: 'm-m-10', title: 'ഇരുപതാം നൂറ്റാണ്ട്', manglish: 'Irupatham Noottandu', year: 1987, difficulty: 'medium' },
  { id: 'm-m-11', title: 'ദേവാസുരം', manglish: 'Devaasuram', year: 1993, difficulty: 'medium' },
  { id: 'm-m-12', title: 'ധ്രുവം', manglish: 'Dhruvam', year: 1993, difficulty: 'medium' },
  { id: 'm-m-13', title: 'കമ്മീഷണർ', manglish: 'Commissioner', year: 1994, difficulty: 'medium' },
  { id: 'm-m-14', title: 'വടക്കുനോക്കിയന്ത്രം', manglish: 'Vadakkunokkiyanthram', year: 1989, difficulty: 'medium' },
  { id: 'm-m-15', title: 'പട്ടണപ്രവേശം', manglish: 'Pattanapravesham', year: 1988, difficulty: 'medium' },
  { id: 'm-m-16', title: 'അക്കരെ അക്കരെ അക്കരെ', manglish: 'Akkare Akkare Akkare', year: 1990, difficulty: 'medium' },
  { id: 'm-m-17', title: 'വരവേൽപ്പ്', manglish: 'Varavelpu', year: 1989, difficulty: 'medium' },
  { id: 'm-m-18', title: 'കഥ പറയുമ്പോൾ', manglish: 'Katha Parayumpol', year: 2007, difficulty: 'medium' },
  { id: 'm-m-19', title: 'ക്ലാസ്മേറ്റ്സ്', manglish: 'Classmates', year: 2006, difficulty: 'medium' },
  { id: 'm-m-20', title: 'സുഡാനി ഫ്രം നൈജീരിയ', manglish: 'Sudani from Nigeria', year: 2018, difficulty: 'medium' },
  { id: 'm-m-21', title: 'ഹെലൻ', manglish: 'Helen', year: 2019, difficulty: 'medium' },
  { id: 'm-m-22', title: 'ആൻഡ്രോയിഡ് കുഞ്ഞപ്പൻ', manglish: 'Android Kunjappan Version 5.25', year: 2019, difficulty: 'medium' },
  { id: 'm-m-23', title: 'ജോജി', manglish: 'Joji', year: 2021, difficulty: 'medium' },
  { id: 'm-m-24', title: 'തിളക്കം', manglish: 'Thilakkam', year: 2003, difficulty: 'medium' },
  { id: 'm-m-25', title: 'നന്ദനം', manglish: 'Nandhanam', year: 2002, difficulty: 'medium' },
  { id: 'm-m-26', title: 'മീനത്തിൽ താലികെട്ട്', manglish: 'Meenathil Thalikettu', year: 1998, difficulty: 'medium' },
  { id: 'm-m-27', title: 'മധുരനൊമ്പരക്കാറ്റ്', manglish: 'Madhuranombarakattu', year: 2000, difficulty: 'medium' },
  { id: 'm-m-28', title: 'സി.ഐ.എ (സഖാവ്)', manglish: 'Comrade in America (CIA)', year: 2017, difficulty: 'medium' },
  { id: 'm-m-29', title: 'ഭീഷ്മ പർവ്വം', manglish: 'Bheeshma Parvam', year: 2022, difficulty: 'medium' },
  { id: 'm-m-30', title: 'കുരുതി', manglish: 'Kuruthi', year: 2021, difficulty: 'medium' },
  { id: 'm-m-31', title: 'തണ്ണീർമത്തൻ ദിനങ്ങൾ', manglish: 'Thanneer Mathan Dinangal', year: 2019, difficulty: 'medium' },
  { id: 'm-m-32', title: 'ബ്രോ ഡാഡി', manglish: 'Bro Daddy', year: 2022, difficulty: 'medium' },
  { id: 'm-m-33', title: 'ആർ.ഡി.എക്സ്', manglish: 'RDX', year: 2023, difficulty: 'medium' },
  { id: 'm-m-34', title: 'നേര്', manglish: 'Neru', year: 2023, difficulty: 'medium' },
  { id: 'm-m-35', title: 'ഭ്രമയുഗം', manglish: 'Bramayugam', year: 2024, difficulty: 'medium' },
  { id: 'm-m-36', title: 'വാഴ', manglish: 'Vaazha', year: 2024, difficulty: 'medium' },
  { id: 'm-m-37', title: 'കിഷ്കിന്ധാ കാണ്ഡം', manglish: 'Kishkindha Kaandam', year: 2024, difficulty: 'medium' },

  // ─── 🔴 HARD (Unique, Classic, Art-House or Challenging Titles) ────────────────
  { id: 'm-h-01', title: 'ഒന്നാനാം കുന്നിൽ ഓരടിക്കുന്നിൽ', manglish: 'Onnanu Kunnil Oradikkunnil', year: 1985, difficulty: 'hard' },
  { id: 'm-h-02', title: 'എലിപ്പത്തായം', manglish: 'Elippathayam', year: 1981, difficulty: 'hard' },
  { id: 'm-h-03', title: 'വിധേയൻ', manglish: 'Vidheyan', year: 1994, difficulty: 'hard' },
  { id: 'm-h-04', title: 'മൂന്നാം മുറ', manglish: 'Moonnam Mura', year: 1988, difficulty: 'hard' },
  { id: 'm-h-05', title: 'അപരൻ', manglish: 'Aparan', year: 1988, difficulty: 'hard' },
  { id: 'm-h-06', title: 'തനിയാവർത്തനം', manglish: 'Thaniyavarthanam', year: 1987, difficulty: 'hard' },
  { id: 'm-h-07', title: 'പഞ്ചവടിപ്പാലം', manglish: 'Panchavadi Palam', year: 1984, difficulty: 'hard' },
  { id: 'm-h-08', title: 'മതിലുകൾ', manglish: 'Mathilukal', year: 1990, difficulty: 'hard' },
  { id: 'm-h-09', title: 'ആദാമിന്റെ വാരിയെല്ല്', manglish: 'Aadaminte Variyellu', year: 1984, difficulty: 'hard' },
  { id: 'm-h-10', title: 'കാണാമറയത്ത്', manglish: 'Kanamarayathu', year: 1984, difficulty: 'hard' },
  { id: 'm-h-11', title: 'യവനിക', manglish: 'Yavanika', year: 1982, difficulty: 'hard' },
  { id: 'm-h-12', title: 'പെരുവഴിയമ്പലം', manglish: 'Peruvazhiyambalam', year: 1979, difficulty: 'hard' },
  { id: 'm-h-13', title: 'നമുക്കു പാർക്കാൻ മുന്തിരിത്തോപ്പുകൾ', manglish: 'Namukku Parkkan Munthirithoppukal', year: 1986, difficulty: 'hard' },
  { id: 'm-h-14', title: 'തൂവാനത്തുമ്പികൾ', manglish: 'Thoovanathumbikal', year: 1987, difficulty: 'hard' },
  { id: 'm-h-15', title: 'പെരുന്തച്ചൻ', manglish: 'Perumthachan', year: 1990, difficulty: 'hard' },
  { id: 'm-h-16', title: 'ഓടരുതമ്മാവാ ആളറിയാം', manglish: 'Odaruthammava Aalariyam', year: 1984, difficulty: 'hard' },
  { id: 'm-h-17', title: 'പൂച്ചക്കൊരു മൂക്കുത്തി', manglish: 'Poochakkoru Mookkuthi', year: 1984, difficulty: 'hard' },
  { id: 'm-h-18', title: 'ആര്യൻ', manglish: 'Aryan', year: 1988, difficulty: 'hard' },
  { id: 'm-h-19', title: 'അമൃതം ഗമയ', manglish: 'Amrutham Gamaya', year: 1987, difficulty: 'hard' },
  { id: 'm-h-20', title: 'ഉത്തരം', manglish: 'Utharam', year: 1989, difficulty: 'hard' },
  { id: 'm-h-21', title: 'ചെമ്മീൻ', manglish: 'Chemmeen', year: 1965, difficulty: 'hard' },
  { id: 'm-h-22', title: 'നീലക്കുയിൽ', manglish: 'Neelakkuyil', year: 1954, difficulty: 'hard' },
  { id: 'm-h-23', title: 'ഭാർഗ്ഗവീനിലയം', manglish: 'Bhargavi Nilayam', year: 1964, difficulty: 'hard' },
  { id: 'm-h-24', title: 'അരപ്പട്ട കെട്ടിയ ഗ്രാമത്തിൽ', manglish: 'Arappatta Kettiya Gramathil', year: 1986, difficulty: 'hard' },
  { id: 'm-h-25', title: 'ഉൾക്കടൽ', manglish: 'Ulkkadal', year: 1979, difficulty: 'hard' },
  { id: 'm-h-26', title: 'കരിയിലക്കാറ്റുപോലെ', manglish: 'Kariyilakkattu Pole', year: 1986, difficulty: 'hard' },
  { id: 'm-h-27', title: 'അനന്തഭദ്രം', manglish: 'Ananthabhadram', year: 2005, difficulty: 'hard' },
  { id: 'm-h-28', title: 'അടൂർ ഗോപാലകൃഷ്ണന്റെ അനന്തരം', manglish: 'Anantaram', year: 1987, difficulty: 'hard' },
  { id: 'm-h-29', title: 'ഓർമ്മയ്ക്കായി', manglish: 'Ormakkayi', year: 1982, difficulty: 'hard' },
  { id: 'm-h-30', title: 'ഇരകൾ', manglish: 'Irakal', year: 1985, difficulty: 'hard' },
];

export class MovieSelector {
  private usedMovieIds = new Set<string>();

  selectMovie(difficulty: CharadesDifficulty): CharadesMovie {
    let pool = CHARADES_MOVIES;
    if (difficulty !== 'mixed') {
      pool = pool.filter(m => m.difficulty === difficulty);
    }

    // Filter out movies already used in this game session
    let available = pool.filter(m => !this.usedMovieIds.has(m.id));

    // If all available have been played, reset history for this pool
    if (available.length === 0) {
      this.usedMovieIds.clear();
      available = pool;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const chosen = available[randomIndex];
    this.usedMovieIds.add(chosen.id);
    return chosen;
  }

  reset() {
    this.usedMovieIds.clear();
  }
}
