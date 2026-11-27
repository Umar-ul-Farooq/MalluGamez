export interface CinemaClueMovieItem {
  id: string;
  title: string;           // Malayalam Unicode title
  manglish: string;        // English title / transliteration
  altSpellings?: string[]; // Additional recognized aliases
  year: number;
  difficulty: 'easy' | 'medium' | 'hard';
  clues: [string, string, string, string]; // 4 progressive clues (10, 7, 5, 3 pts)
}

export const CINEMA_CLUE_MOVIES: CinemaClueMovieItem[] = [
  // ─── EASY ───────────────────────────────────────────────────────────────────
  {
    id: 'cc-e-01',
    title: 'ദൃശ്യം',
    manglish: 'Drishyam',
    altSpellings: ['drishyam 1', 'dhrishyam', 'drisyam'],
    year: 2013,
    difficulty: 'easy',
    clues: [
      'A cable TV operator builds an airtight alibi around a meditation retreat and restaurant bills.',
      'A police officer’s missing son sets off an intense family cover-up in Thodupuzha.',
      'A newly built local police station hides the biggest secret of the climax.',
      'Directed by Jeethu Joseph (2013), starring Mohanlal as Georgekutty.',
    ],
  },
  {
    id: 'cc-e-02',
    title: 'മണിച്ചിത്രത്താഴ്',
    manglish: 'Manichithrathazhu',
    altSpellings: ['manichitrathazhu', 'manichithrathazh', 'nagavalli'],
    year: 1993,
    difficulty: 'easy',
    clues: [
      'A locked ancestral room in a palatial Kerala tharavadu sparks strange incidents.',
      'A psychiatrist from Kolkata tries to unravel a psychological split tied to an ancient dancer.',
      'Contains the famous classical dance sequence "Oru Murai Vanthu Parthaya".',
      'Directed by Fazil (1993), starring Mohanlal as Dr. Sunny and Shobana as Ganga/Nagavalli.',
    ],
  },
  {
    id: 'cc-e-03',
    title: 'പ്രേമം',
    manglish: 'Premam',
    altSpellings: ['malare'],
    year: 2015,
    difficulty: 'easy',
    clues: [
      'A coming-of-age romantic drama told across three distinct chapters of a young man’s life.',
      'Includes black-shirt campus celebrations, a red-velvet cake bakery, and a college lecturer.',
      'Features the viral song "Malare" and "Aluva Puzha".',
      'Directed by Alphonse Puthren (2015), starring Nivin Pauly as George alongside Sai Pallavi.',
    ],
  },
  {
    id: 'cc-e-04',
    title: 'കിലുക്കം',
    manglish: 'Kilukkam',
    altSpellings: ['kilukam'],
    year: 1991,
    difficulty: 'easy',
    clues: [
      'Two broke friends working in a hill station get tangled up with a runaway woman claiming amnesia.',
      'A retired judge’s secret past and a lottery ticket misunderstanding drive non-stop comedy.',
      'Contains the iconic dialogue "Ennaalum ente ponno..." and a famous photography tour in Ooty.',
      'Directed by Priyadarshan (1991), starring Mohanlal, Jagathy Sreekumar, Revathi, and Thilakan.',
    ],
  },
  {
    id: 'cc-e-05',
    title: 'സ്ഫടികം',
    manglish: 'Spadikam',
    altSpellings: ['sphadikam', 'spatikam', 'aaduthoma'],
    year: 1995,
    difficulty: 'easy',
    clues: [
      'A mathematics teacher father’s obsession pushes his rebellious son into becoming a quarry strongman.',
      'A Ray-Ban glass, a silk mundu used in fights, and a lorry named Chekuthan define the hero.',
      'Features the legendary "Aadu Thoma" vs "Chacko Mash" rivalry.',
      'Directed by Bhadran (1995), starring Mohanlal and Thilakan.',
    ],
  },
  {
    id: 'cc-e-06',
    title: 'ലൂസിഫർ',
    manglish: 'Lucifer',
    altSpellings: ['stephen nedumpally', 'l2'],
    year: 2019,
    difficulty: 'easy',
    clues: [
      'The death of a powerful chief minister triggers a political succession battle inside his party.',
      'An adopted outsider wearing white mundu protects the family from drug cartel money.',
      'Famous for the dialogue "Narcotics is a dirty business" and "Khureshi Ab’raam".',
      'Prithviraj Sukumaran’s directorial debut (2019), starring Mohanlal as Stephen Nedumpally.',
    ],
  },
  {
    id: 'cc-e-07',
    title: 'ബാംഗ്ലൂർ ഡേയ്സ്',
    manglish: 'Bangalore Days',
    altSpellings: ['bangalore dayz'],
    year: 2014,
    difficulty: 'easy',
    clues: [
      'Three childhood cousins reunite in a bustling metro city to chase love, bikes, and careers.',
      'One is a software engineer in an arranged marriage, one is a wild bike mechanic, and one falls for an RJ.',
      'Features the song "Ethu Kari Raavilum" and "Maangalyam".',
      'Directed by Anjali Menon (2014), starring Dulquer Salmaan, Nivin Pauly, Nazriya, and Fahadh Faasil.',
    ],
  },
  {
    id: 'cc-e-08',
    title: 'കുമ്പളങ്ങി നൈറ്റ്സ്',
    manglish: 'Kumbalangi Nights',
    altSpellings: ['kumbalangi', 'shammi'],
    year: 2019,
    difficulty: 'easy',
    clues: [
      'Four dysfunctional brothers live in a half-built house by the backwaters with no proper doors.',
      'Bioluminescent glowing backwaters ("Kavaru") play a magical backdrop in a quiet love story.',
      'Features the haunting polite antagonist who claims "Shammi hero aada hero".',
      'Directed by Madhu C. Narayanan (2019), starring Soubin Shahir, Shane Nigam, and Fahadh Faasil.',
    ],
  },
  {
    id: 'cc-e-09',
    title: 'ആവേശം',
    manglish: 'Aavesham',
    altSpellings: ['avesham', 'ranga'],
    year: 2024,
    difficulty: 'easy',
    clues: [
      'Three first-year college students seek help from an eccentric local gangster to settle a ragging fight.',
      'The gangster owns an iconic black Ambassdor / Scorpio, loves reels, and calls everyone "Eda Mone".',
      'Contains the chartbuster tracks "Illuminati" and "Armadham".',
      'Directed by Jithu Madhavan (2024), starring Fahadh Faasil as Ranga.',
    ],
  },
  {
    id: 'cc-e-10',
    title: 'മിന്നൽ മുരളി',
    manglish: 'Minnal Murali',
    altSpellings: ['minnalmurali', 'jaison'],
    year: 2021,
    difficulty: 'easy',
    clues: [
      'A small-town tailor in the 1990s dreams of moving to America until a Christmas lightning strike changes him.',
      'A lonely tea-shop worker gains telekinesis from the exact same storm in Kurukkanmoola.',
      'Known as Malayalam cinema’s landmark grounded superhero origin movie.',
      'Directed by Basil Joseph (2021), starring Tovino Thomas and Guru Somasundaram.',
    ],
  },
  {
    id: 'cc-e-11',
    title: 'മഞ്ഞുമ്മൽ ബോയ്സ്',
    manglish: 'Manjummel Boys',
    altSpellings: ['manjummal boys', 'manjummel', 'guna caves'],
    year: 2024,
    difficulty: 'easy',
    clues: [
      'A group of friends from Kochi travel to Kodaikanal for an Onam vacation trip.',
      'One friend falls into a deep, forbidden crevice inside the Guna Caves.',
      'The classic Tamil song "Kanmani Anbodu" plays a crucial emotional role.',
      'Directed by Chidambaram (2024), starring Soubin Shahir and Sreenath Bhasi.',
    ],
  },
  {
    id: 'cc-e-12',
    title: 'സി.ഐ.ഡി മൂസ',
    manglish: 'C.I.D. Moosa',
    altSpellings: ['cid moosa', 'moosa'],
    year: 2003,
    difficulty: 'easy',
    clues: [
      'A clumsy aspiring detective adopts a super-smart white dog named Arjun and drives a gadget car.',
      'He accidentally foils assassination plots against a Chief Minister while fighting crooked police officers.',
      'Features Harisree Ashokan as Thorappan Kochunni and Salim Kumar as a hilarious lunatic.',
      'Directed by Johny Antony (2003), starring Dileep as Moolamkuzhiyil Sahadevan.',
    ],
  },
  {
    id: 'cc-e-13',
    title: 'നാടോടിക്കാറ്റ്',
    manglish: 'Nadodikkattu',
    altSpellings: ['nadodikattu', 'dasanaum vijayanum'],
    year: 1987,
    difficulty: 'easy',
    clues: [
      'Two educated unemployed friends try cattle farming before getting scammed by a fake travel agent.',
      'Instead of reaching Dubai, their boat drops them off on a beach in Madras (Chennai).',
      'Birth of the legendary duo Dasan and Vijayan alongside Pavanayi.',
      'Directed by Sathyan Anthikad (1987), written by Sreenivasan, starring Mohanlal and Sreenivasan.',
    ],
  },
  {
    id: 'cc-e-14',
    title: 'മീശമാധവൻ',
    manglish: 'Meesha Madhavan',
    altSpellings: ['meeshamadhavan', 'meesha madavan'],
    year: 2002,
    difficulty: 'easy',
    clues: [
      'A warm-hearted village thief in Chekk only steals when he twists his moustache.',
      'He vows to steal something from a strict moneylender’s daughter, leading to love and trouble.',
      'Features "Ente Ellam Ellam Alle", "Chingamasam", and Jagathy as Bhagirathan Pillai.',
      'Directed by Lal Jose (2002), starring Dileep and Kavya Madhavan.',
    ],
  },
  {
    id: 'cc-e-15',
    title: 'പ്രേമലു',
    manglish: 'Premalu',
    altSpellings: ['reethu', 'sachin'],
    year: 2024,
    difficulty: 'easy',
    clues: [
      'A recent engineering graduate fails to get a UK visa and joins a GATE coaching center in Hyderabad.',
      'He falls for an IT employee who prefers mature, well-settled men.',
      'Includes the iconic office rival Aadhi ("Just kidding!") and roommate Amal Davis.',
      'Directed by Girish A. D. (2024), starring Naslen and Mamitha Baiju.',
    ],
  },

  // ─── MEDIUM ─────────────────────────────────────────────────────────────────
  {
    id: 'cc-m-01',
    title: 'മഹേഷിന്റെ പ്രതികാരം',
    manglish: 'Maheshinte Prathikaaram',
    altSpellings: ['maheshinte prathikaram'],
    year: 2016,
    difficulty: 'medium',
    clues: [
      'A studio photographer in Idukki refuses to wear slippers after losing a public street brawl.',
      'He swears he won’t wear chappals until he settles the score with Jimson.',
      'Features the song "Idukki" and Soubin as Crispin.',
      'Directed by Dileesh Pothan (2016), starring Fahadh Faasil as Mahesh Bhavana.',
    ],
  },
  {
    id: 'cc-m-02',
    title: 'അയ്യപ്പനും കോശിയും',
    manglish: 'Ayyappanum Koshiyum',
    altSpellings: ['ayyappanum koshi'],
    year: 2020,
    difficulty: 'medium',
    clues: [
      'An arrogant ex-Havildar passes through Attappadi during prohibition checks with alcohol in his car.',
      'What starts as a minor arrest escalates into an ego war that threatens both families.',
      'Known for "Kalakkatha" folk song and fierce police-station confrontations.',
      'Directed by Sachy (2020), starring Prithviraj Sukumaran and Biju Menon.',
    ],
  },
  {
    id: 'cc-m-03',
    title: 'ഉസ്താദ് ഹോട്ടൽ',
    manglish: 'Ustad Hotel',
    altSpellings: ['usthad hotel', 'faizi'],
    year: 2012,
    difficulty: 'medium',
    clues: [
      'A London-trained chef has his passport confiscated by his conservative father.',
      'He begins working at his grandfather’s modest beachside eatery in Kozhikode.',
      'Teaches the lesson "Every Sulaimani needs a little bit of Mohabbat".',
      'Directed by Anwar Rasheed (2012), starring Dulquer Salmaan and Thilakan.',
    ],
  },
  {
    id: 'cc-m-04',
    title: 'രോമാഞ്ചം',
    manglish: 'Romancham',
    altSpellings: ['romancham'],
    year: 2023,
    difficulty: 'medium',
    clues: [
      'Seven jobless young bachelors living in a rented house in Bengaluru try an Ouija board out of boredom.',
      'A spirit named Anamika starts communicating through a broken carrom board and coin.',
      'Famous for the phrase "Aadhyaathmika chinthakal" and "Aadharanjali".',
      'Directed by Jithu Madhavan (2023), starring Soubin Shahir, Arjun Ashokan, and Sajin Gopu.',
    ],
  },
  {
    id: 'cc-m-05',
    title: 'സന്ദേശം',
    manglish: 'Sandesham',
    altSpellings: ['sandhesham', 'sandesam'],
    year: 1991,
    difficulty: 'medium',
    clues: [
      'A retired railway station master returns home hoping for peace after retirement.',
      'His two sons belong to rival political parties and turn the house into a battleground.',
      'Contains the evergreen satire line "Polandine patti oraksharam mindaruthu".',
      'Directed by Sathyan Anthikad (1991), starring Jayaram, Sreenivasan, and Thilakan.',
    ],
  },
  {
    id: 'cc-m-06',
    title: 'പഞ്ചാബി ഹൗസ്',
    manglish: 'Punjabi House',
    altSpellings: ['punjabihouse'],
    year: 1998,
    difficulty: 'medium',
    clues: [
      'A debt-ridden man pretends to be deaf-mute to find work at a wealthy Sikh family’s estate.',
      'His creditor Sikander Singh chases him across Kochi with Ramana.',
      'Features "Sonnare Sonnare" and classic Cochin Haneefa / Harisree Ashokan comedy.',
      'Directed by Rafi Mecartin (1998), starring Dileep, Mohini, and Lal.',
    ],
  },
  {
    id: 'cc-m-07',
    title: 'ജോജി',
    manglish: 'Joji',
    altSpellings: ['joji movie'],
    year: 2021,
    difficulty: 'medium',
    clues: [
      'Inspired by Shakespeare’s Macbeth, set in a wealthy rubber-plantation family in Kerala.',
      'An underachieving youngest son waits greedily for his strict father’s inheritance.',
      'Involves an airgun, tampered medicine tablets, and a sudden paralysis.',
      'Directed by Dileesh Pothan (2021), starring Fahadh Faasil and Baburaj.',
    ],
  },
  {
    id: 'cc-m-08',
    title: 'തൊണ്ടിമുതലും ദൃക്‌സാക്ഷിയും',
    manglish: 'Thondimuthalum Driksakshiyum',
    altSpellings: ['thondimuthalum driksakshiyum', 'thondimuthal'],
    year: 2017,
    difficulty: 'medium',
    clues: [
      'A newlywed couple traveling on a KSRTC bus has a gold chain snatched mid-journey.',
      'The petty thief swallows the stolen chain right inside the police station lockup.',
      'The entire police station waits days watching X-rays and bananas.',
      'Directed by Dileesh Pothan (2017), starring Fahadh Faasil, Suraj Venjaramoodu, and Nimisha Sajayan.',
    ],
  },
  {
    id: 'cc-m-09',
    title: 'ട്രാഫിക്',
    manglish: 'Traffic',
    altSpellings: ['traffic movie'],
    year: 2011,
    difficulty: 'medium',
    clues: [
      'Multiple strangers’ lives intersect on one tense rainy day across Kochi and Palakkad.',
      'A suspended traffic constable volunteers to drive a live beating heart across cities against the clock.',
      'Credited with kickstarting the Malayalam New Wave hyperlink thriller trend.',
      'Directed by Rajesh Pillai (2011), starring Sreenivasan, Kunchacko Boban, and Rahman.',
    ],
  },
  {
    id: 'cc-m-10',
    title: 'മുംബൈ പോലീസ്',
    manglish: 'Mumbai Police',
    altSpellings: ['mumbai police'],
    year: 2013,
    difficulty: 'medium',
    clues: [
      'An arrogant Assistant Commissioner solves the murder of his own best friend right before losing his memory.',
      'After a car accident, he has to re-investigate the case himself from scratch.',
      'Famous for one of Malayalam cinema’s boldest identity/motive twists in the climax.',
      'Directed by Rosshan Andrrews (2013), starring Prithviraj Sukumaran as Antony Moses.',
    ],
  },
  {
    id: 'cc-m-11',
    title: 'തല്ലുമാല',
    manglish: 'Thallumaala',
    altSpellings: ['thallumala', 'manavalan wazim'],
    year: 2022,
    difficulty: 'medium',
    clues: [
      'A non-linear action-comedy built around a chain of street fights and a ruined wedding.',
      'Starts inside an ice-cream shop and builds up to a chaos-filled marriage hall in Ponnani.',
      'Features "Manavalan Thug" and vibrant comic-book editing.',
      'Directed by Khalid Rahman (2022), starring Tovino Thomas and Kalyani Priyadarshan.',
    ],
  },
  {
    id: 'cc-m-12',
    title: 'ദേവാസുരം',
    manglish: 'Devasuram',
    altSpellings: ['devaasuram', 'neelakandan'],
    year: 1993,
    difficulty: 'medium',
    clues: [
      'A proud feudal landlord squanders wealth while locked in a bitter feud with a rival.',
      'A classical dancer curses his arrogance after he forces her to perform at his estate.',
      'Iconic "Mangalassery Neelakandan" vs "Mundakkal Shekaran".',
      'Directed by I. V. Sasi (1993), written by Ranjith, starring Mohanlal and Revathi.',
    ],
  },
  {
    id: 'cc-m-13',
    title: 'കിരീടം',
    manglish: 'Kireedam',
    altSpellings: ['kireedom', 'sethumadhavan'],
    year: 1989,
    difficulty: 'medium',
    clues: [
      'A gentle young man dreams only of clearing the police exam to satisfy his constable father.',
      'Saving his father at a local market forces him into a fatal clash with a dreaded goon.',
      'Known for the heartbreaking climax in front of his shocked father ("Kathi taazhe idada!").',
      'Directed by Sibi Malayil (1989), written by Lohithadas, starring Mohanlal as Sethumadhavan.',
    ],
  },
  {
    id: 'cc-m-14',
    title: 'അഞ്ചാം പാതിര',
    manglish: 'Anjaam Pathiraa',
    altSpellings: ['anjaam pathira', 'ancham pathira'],
    year: 2020,
    difficulty: 'medium',
    clues: [
      'A criminologist assists Kochi police when policemen begin getting murdered systematically.',
      'The killer removes victims’ eyes and hearts and leaves statues of justice behind.',
      'Involves hypnotism, a clockwork sound clue, and a childhood abuse revenge plot.',
      'Directed by Midhun Manuel Thomas (2020), starring Kunchacko Boban as Anwar Hussain.',
    ],
  },
  {
    id: 'cc-m-15',
    title: 'ഗോഡ്ഫാദർ',
    manglish: 'Godfather',
    altSpellings: ['anjooran'],
    year: 1991,
    difficulty: 'medium',
    clues: [
      'A stubborn patriarch hates women and vows none of his four sons will ever marry.',
      'Two rival families battle relentlessly for prestige in Thrissur until the youngest son falls in love.',
      'Famous for Anjooran vs Achamma and the record-breaking longest theatrical run in Kerala.',
      'Directed by Siddique-Lal (1991), starring N. N. Pillai, Mukesh, and Philomina.',
    ],
  },

  // ─── HARD ───────────────────────────────────────────────────────────────────
  {
    id: 'cc-h-01',
    title: 'ഭ്രമയുഗം',
    manglish: 'Bramayugam',
    altSpellings: ['brahmayugam'],
    year: 2024,
    difficulty: 'hard',
    clues: [
      'Shot entirely in stark monochrome black-and-white, set in 17th-century Malabar.',
      'A wandering folk singer stumbles into a decaying mana ruled by a sinister host and his silent cook.',
      'Revolves around a mystical lamp, a dice game ("Choothattam"), and a trapped Chaathan.',
      'Directed by Rahul Sadasivan (2024), starring Mammootty as Kodumon Potti.',
    ],
  },
  {
    id: 'cc-h-02',
    title: 'നൻപകൽ നേരത്ത് മയക്കം',
    manglish: 'Nanpakal Nerathu Mayakkam',
    altSpellings: ['nanpakal', 'nanpakal nerathu mayakam'],
    year: 2022,
    difficulty: 'hard',
    clues: [
      'A theatre troupe from Kerala stops their tourist bus near a sleepy Tamil Nadu village after lunch.',
      'While others nap, one man wanders away speaking fluent Tamil as if he is a long-missing villager.',
      'Minimalist, dreamlike study of identity with static camera frames and old Tamil songs.',
      'Directed by Lijo Jose Pellissery (2022), starring Mammootty as James/Sundaram.',
    ],
  },
  {
    id: 'cc-h-03',
    title: 'ജല്ലിക്കട്ട്',
    manglish: 'Jallikattu',
    altSpellings: ['jellikattu', 'jallikkattu'],
    year: 2019,
    difficulty: 'hard',
    clues: [
      'A butcher’s buffalo breaks free before slaughter and tears violently through a hilly village.',
      'What starts as an effort to capture one animal exposes primal greed and mob madness among men.',
      'India’s official entry to the 93rd Academy Awards, driven by frantic tribal percussion.',
      'Directed by Lijo Jose Pellissery (2019), starring Antony Varghese and Chemban Vinod Jose.',
    ],
  },
  {
    id: 'cc-h-04',
    title: 'ചുരുളി',
    manglish: 'Churuli',
    altSpellings: ['churuly'],
    year: 2021,
    difficulty: 'hard',
    clues: [
      'Two undercover officers cross a rickety wooden bridge into a remote forest village looking for a fugitive.',
      'Once inside the spiral village, time loops strangely and locals turn crude and unnerving.',
      'Famous for a haunting folk tale about a Perumadan and aliens at the end.',
      'Directed by Lijo Jose Pellissery (2021), starring Vinay Forrt, Chemban Vinod, and Joju George.',
    ],
  },
  {
    id: 'cc-h-05',
    title: 'ആട്ടം',
    manglish: 'Aattam',
    altSpellings: ['aattam movie', 'attam'],
    year: 2023,
    difficulty: 'hard',
    clues: [
      'A small theatre troupe holds a party after performing before the lone actress alleges assault in her sleep.',
      'Twelve men secretly cast anonymous votes inside a locked room, revealing shifting hypocrisies.',
      'Won the National Film Award for Best Feature Film (70th National Awards).',
      'Directed by Anand Ekarshi (2023), starring Zarin Shihab and Vinay Forrt.',
    ],
  },
  {
    id: 'cc-h-06',
    title: 'വിരുതൻ',
    manglish: 'Vidheyan',
    altSpellings: ['vidheyan', 'bhaskara patelar'],
    year: 1994,
    difficulty: 'hard',
    clues: [
      'A poor migrant Christian labourer becomes utterly submissive to a cruel feudal landlord.',
      'Even after enduring endless abuse, the servant finds it psychologically impossible to feel free after his master’s death.',
      'Based on Paul Zacharia’s novella "Bhaskara Patelarum Ente Jeevithavum".',
      'Directed by Adoor Gopalakrishnan (1994), starring Mammootty and M. R. Gopakumar.',
    ],
  },
  {
    id: 'cc-h-07',
    title: 'വാനപ്രസ്ഥം',
    manglish: 'Vanaprastham',
    altSpellings: ['vanaprastham'],
    year: 1999,
    difficulty: 'hard',
    clues: [
      'A master Kathakali performer struggles with caste stigma and the identity crisis of an illegitimate son.',
      'An aristocratic woman falls in love not with the man, but with the heroic Arjun he plays on stage.',
      'Screened in the Un Certain Regard section at Cannes 1999.',
      'Directed by Shaji N. Karun (1999), starring Mohanlal as Kunhikuttan.',
    ],
  },
  {
    id: 'cc-h-08',
    title: 'ഇലവീഴാപൂഞ്ചിറ',
    manglish: 'Ela Veezha Poonchira',
    altSpellings: ['elaveezhapoonchira', 'ilaveezhapoonchira'],
    year: 2022,
    difficulty: 'hard',
    clues: [
      'Two policemen guard a remote wireless relay station atop a misty, treeless hilltop in Kottayam.',
      'Body parts discovered nearby and heavy monsoon rain trap the two officers in paranoia.',
      'Known for its eerie hilltop wireless outpost mystery ("There are no trees here").',
      'Directed by Shahi Kabir (2022), starring Soubin Shahir and Sudhi Koppa.',
    ],
  },
  {
    id: 'cc-h-09',
    title: 'ഉള്ളൊഴുക്ക്',
    manglish: 'Ullozhukku',
    altSpellings: ['ullozhukku'],
    year: 2024,
    difficulty: 'hard',
    clues: [
      'In flooded Kuttanad during relentless monsoon rains, a daughter-in-law and mother-in-law await a funeral.',
      'Since water covers all burial ground, a coffin stays in the house while hidden secrets surface.',
      'Explores marriage pressure, truth, and quiet resilience under rising water.',
      'Directed by Christo Tomy (2024), starring Urvashi and Parvathy Thiruvothu.',
    ],
  },
  {
    id: 'cc-h-10',
    title: 'തൂവാനത്തുമ്പികൾ',
    manglish: 'Thoovanathumbikal',
    altSpellings: ['thoovanathumpikal', 'clara'],
    year: 1987,
    difficulty: 'hard',
    clues: [
      'A carefree man in Thrissur leads a double life between rural estate duties and city nights.',
      'Rain always accompanies the arrival of an independent woman named Clara.',
      'Famous for its Thrissur slang, haunting rain scenes, and "Jayakrishnan & Clara".',
      'Written and directed by P. Padmarajan (1987), starring Mohanlal and Sumalatha.',
    ],
  },
];

export function normalizeCinemaClueAnswer(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Checks whether a submitted movie guess matches a movie item in Malayalam Unicode,
 * English/Manglish title, configured altSpellings, or safe Latin fuzzy match.
 */
export function validateCinemaClueAnswer(guess: string, movie: CinemaClueMovieItem): boolean {
  const cleanGuess = normalizeCinemaClueAnswer(guess);
  if (!cleanGuess) return false;
  const cleanGuessNoSpaces = cleanGuess.replace(/\s+/g, '');

  const cleanTitle = normalizeCinemaClueAnswer(movie.title);
  if (cleanGuess === cleanTitle || cleanGuessNoSpaces === cleanTitle.replace(/\s+/g, '')) {
    return true;
  }

  const cleanManglish = normalizeCinemaClueAnswer(movie.manglish);
  if (cleanGuess === cleanManglish || cleanGuessNoSpaces === cleanManglish.replace(/\s+/g, '')) {
    return true;
  }

  if (movie.altSpellings) {
    for (const alt of movie.altSpellings) {
      const cleanAlt = normalizeCinemaClueAnswer(alt);
      if (cleanGuess === cleanAlt || cleanGuessNoSpaces === cleanAlt.replace(/\s+/g, '')) {
        return true;
      }
    }
  }

  const latinCandidates = [cleanManglish, ...(movie.altSpellings || []).map(normalizeCinemaClueAnswer)];
  for (const cand of latinCandidates) {
    if (/^[a-z0-9 ]+$/.test(cand) && /^[a-z0-9 ]+$/.test(cleanGuess)) {
      const allowedDistance = cand.length > 8 ? 2 : cand.length >= 4 ? 1 : 0;
      if (
        levenshteinDistance(cleanGuess, cand) <= allowedDistance ||
        levenshteinDistance(cleanGuessNoSpaces, cand.replace(/\s+/g, '')) <= allowedDistance
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns canonical key for duplicate-guess prevention across already submitted movie guesses.
 * If the text matches any movie in CINEMA_CLUE_MOVIES (either Malayalam or English),
 * returns `movie:<id>` so even Malayalam+English variants of the same movie are treated as duplicates.
 */
export function canonicalMovieGuessKey(guess: string): string {
  const clean = normalizeCinemaClueAnswer(guess);
  if (!clean) return '';
  for (const m of CINEMA_CLUE_MOVIES) {
    if (validateCinemaClueAnswer(guess, m)) {
      return `movie:${m.id}`;
    }
  }
  return `raw:${clean.replace(/\s+/g, '')}`;
}
