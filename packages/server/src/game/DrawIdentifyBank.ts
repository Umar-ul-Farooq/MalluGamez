// ─── Draw & Identify Object Bank ─────────────────────────────────────────────
// Rich collection of recognizable everyday objects suitable for fast-paced sketching.

export interface DrawIdentifyWord {
  id: string;
  english: string;
  malayalam: string;
  manglish: string;
  category: 'everyday' | 'nature' | 'food' | 'transport' | 'household';
}

export const DRAW_IDENTIFY_WORDS: DrawIdentifyWord[] = [
  // ── Household & Everyday Items ──
  { id: 'umbrella', english: 'Umbrella', malayalam: 'കുട', manglish: 'Kuda', category: 'everyday' },
  { id: 'house', english: 'House', malayalam: 'വീട്', manglish: 'Veedu', category: 'household' },
  { id: 'cup', english: 'Tea Cup', malayalam: 'ചായക്കപ്പ്', manglish: 'Chayakkappu', category: 'household' },
  { id: 'chair', english: 'Chair', malayalam: 'കസേര', manglish: 'Kasera', category: 'household' },
  { id: 'book', english: 'Book', malayalam: 'പുസ്തകം', manglish: 'Pusthakam', category: 'everyday' },
  { id: 'clock', english: 'Clock', malayalam: 'വാച്ച്', manglish: 'Watch', category: 'everyday' },
  { id: 'hat', english: 'Hat', malayalam: 'തൊപ്പി', manglish: 'Thoppi', category: 'everyday' },
  { id: 'glasses', english: 'Glasses', malayalam: 'കണ്ണട', manglish: 'Kannada', category: 'everyday' },
  { id: 'key', english: 'Key', malayalam: 'താക്കോൽ', manglish: 'Thaakkol', category: 'everyday' },
  { id: 'shoe', english: 'Shoe', malayalam: 'ചെരുപ്പ്', manglish: 'Cheruppu', category: 'everyday' },
  { id: 'door', english: 'Door', malayalam: 'വാതിൽ', manglish: 'Vaathil', category: 'household' },
  { id: 'window', english: 'Window', malayalam: 'ജനൽ', manglish: 'Janal', category: 'household' },
  { id: 'bed', english: 'Bed', malayalam: 'കട്ടിൽ', manglish: 'Kattil', category: 'household' },
  { id: 'lamp', english: 'Lamp', malayalam: 'വിളക്ക്', manglish: 'Vilakku', category: 'household' },
  { id: 'candle', english: 'Candle', malayalam: 'മെഴുകുതിരി', manglish: 'Mezhukuthiri', category: 'everyday' },
  { id: 'bottle', english: 'Bottle', malayalam: 'കുപ്പി', manglish: 'Kuppi', category: 'household' },
  { id: 'spoon', english: 'Spoon', malayalam: 'തവി', manglish: 'Thavi', category: 'household' },
  { id: 'comb', english: 'Comb', malayalam: 'ചീപ്പ്', manglish: 'Cheeppu', category: 'everyday' },
  { id: 'mirror', english: 'Mirror', malayalam: 'കണ്ണാടി', manglish: 'Kannaadi', category: 'household' },
  { id: 'bucket', english: 'Bucket', malayalam: 'ബക്കറ്റ്', manglish: 'Bucket', category: 'household' },
  { id: 'scissors', english: 'Scissors', malayalam: 'കത്രിക', manglish: 'Kathrika', category: 'everyday' },
  { id: 'broom', english: 'Broom', malayalam: 'ചൂൽ', manglish: 'Chool', category: 'household' },
  { id: 'ladder', english: 'Ladder', malayalam: 'കോണി', manglish: 'Koni', category: 'household' },
  { id: 'box', english: 'Box', malayalam: 'പെട്ടി', manglish: 'Petti', category: 'everyday' },
  { id: 'bell', english: 'Bell', malayalam: 'മണി', manglish: 'Mani', category: 'everyday' },
  { id: 'camera', english: 'Camera', malayalam: 'ക്യാമറ', manglish: 'Camera', category: 'everyday' },
  { id: 'pot', english: 'Clay Pot', malayalam: 'കുടം', manglish: 'Kudam', category: 'household' },
  { id: 'balloon', english: 'Balloon', malayalam: 'ബലൂൺ', manglish: 'Balloon', category: 'everyday' },
  { id: 'kite', english: 'Kite', malayalam: 'പട്ടം', manglish: 'Pattam', category: 'everyday' },
  { id: 'ball', english: 'Ball', malayalam: 'പന്ത്', manglish: 'Panthu', category: 'everyday' },

  // ── Nature & Sky ──
  { id: 'tree', english: 'Tree', malayalam: 'മരം', manglish: 'Maram', category: 'nature' },
  { id: 'coconut_tree', english: 'Coconut Tree', malayalam: 'തെങ്ങ്', manglish: 'Thengu', category: 'nature' },
  { id: 'sun', english: 'Sun', malayalam: 'സൂര്യൻ', manglish: 'Sooryan', category: 'nature' },
  { id: 'moon', english: 'Moon', malayalam: 'ചന്ദ്രൻ', manglish: 'Chandran', category: 'nature' },
  { id: 'star', english: 'Star', malayalam: 'നക്ഷത്രം', manglish: 'Nakshathram', category: 'nature' },
  { id: 'cloud', english: 'Cloud', malayalam: 'മേഘം', manglish: 'Megham', category: 'nature' },
  { id: 'flower', english: 'Flower', malayalam: 'പൂവ്', manglish: 'Poovu', category: 'nature' },
  { id: 'leaf', english: 'Leaf', malayalam: 'ഇല', manglish: 'Ila', category: 'nature' },
  { id: 'mountain', english: 'Mountain', malayalam: 'മല', manglish: 'Mala', category: 'nature' },
  { id: 'rain', english: 'Rain', malayalam: 'മഴ', manglish: 'Mazha', category: 'nature' },
  { id: 'fire', english: 'Fire', malayalam: 'തീ', manglish: 'Thee', category: 'nature' },

  // ── Animals & Creatures ──
  { id: 'fish', english: 'Fish', malayalam: 'മീൻ', manglish: 'Meen', category: 'nature' },
  { id: 'cat', english: 'Cat', malayalam: 'പൂച്ച', manglish: 'Poocha', category: 'nature' },
  { id: 'dog', english: 'Dog', malayalam: 'നായ', manglish: 'Naaya', category: 'nature' },
  { id: 'elephant', english: 'Elephant', malayalam: 'ആന', manglish: 'Aana', category: 'nature' },
  { id: 'bird', english: 'Bird', malayalam: 'കിളി', manglish: 'Kili', category: 'nature' },
  { id: 'cow', english: 'Cow', malayalam: 'പശു', manglish: 'Pashu', category: 'nature' },
  { id: 'snake', english: 'Snake', malayalam: 'പാമ്പ്', manglish: 'Paambu', category: 'nature' },
  { id: 'butterfly', english: 'Butterfly', malayalam: 'ചിത്രശലഭം', manglish: 'Chithrashalabham', category: 'nature' },
  { id: 'turtle', english: 'Turtle', malayalam: 'ആമ', manglish: 'Aama', category: 'nature' },
  { id: 'duck', english: 'Duck', malayalam: 'താറാവ്', manglish: 'Thaaraavu', category: 'nature' },
  { id: 'chicken', english: 'Rooster', malayalam: 'കോഴി', manglish: 'Kozhi', category: 'nature' },
  { id: 'frog', english: 'Frog', malayalam: 'തവള', manglish: 'Thavala', category: 'nature' },
  { id: 'crow', english: 'Crow', malayalam: 'കാക്ക', manglish: 'Kaakka', category: 'nature' },
  { id: 'lion', english: 'Lion', malayalam: 'സിംഹം', manglish: 'Simham', category: 'nature' },

  // ── Food & Fruits ──
  { id: 'mango', english: 'Mango', malayalam: 'മാങ്ങ', manglish: 'Maanga', category: 'food' },
  { id: 'banana', english: 'Banana', malayalam: 'വാഴപ്പഴം', manglish: 'Vazhappazham', category: 'food' },
  { id: 'apple', english: 'Apple', malayalam: 'ആപ്പിൾ', manglish: 'Apple', category: 'food' },
  { id: 'egg', english: 'Egg', malayalam: 'മുട്ട', manglish: 'Mutta', category: 'food' },
  { id: 'coconut', english: 'Coconut', malayalam: 'തേങ്ങ', manglish: 'Thenga', category: 'food' },
  { id: 'pineapple', english: 'Pineapple', malayalam: 'കൈതച്ചക്ക', manglish: 'Kaithachakka', category: 'food' },
  { id: 'icecream', english: 'Ice Cream', malayalam: 'ഐസ്ക്രീം', manglish: 'Ice Cream', category: 'food' },
  { id: 'carrot', english: 'Carrot', malayalam: 'കാരറ്റ്', manglish: 'Carrot', category: 'food' },
  { id: 'chilli', english: 'Chilli', malayalam: 'പച്ചമുളക്', manglish: 'Pachamulaku', category: 'food' },
  { id: 'cake', english: 'Cake', malayalam: 'കേക്ക്', manglish: 'Cake', category: 'food' },

  // ── Vehicles & Transport ──
  { id: 'car', english: 'Car', malayalam: 'കാർ', manglish: 'Car', category: 'transport' },
  { id: 'bicycle', english: 'Bicycle', malayalam: 'സൈക്കിൾ', manglish: 'Cycle', category: 'transport' },
  { id: 'boat', english: 'Boat', malayalam: 'വഞ്ചി', manglish: 'Vanchi', category: 'transport' },
  { id: 'bus', english: 'Bus', malayalam: 'ബസ്', manglish: 'Bus', category: 'transport' },
  { id: 'train', english: 'Train', malayalam: 'തീവണ്ടി', manglish: 'Theevandi', category: 'transport' },
  { id: 'airplane', english: 'Airplane', malayalam: 'വിമാനം', manglish: 'Vimaanam', category: 'transport' },
  { id: 'rocket', english: 'Rocket', malayalam: 'റോക്കറ്റ്', manglish: 'Rocket', category: 'transport' },

  // ── Miscellaneous Fun Items ──
  { id: 'crown', english: 'Crown', malayalam: 'കിരീടം', manglish: 'Kireedam', category: 'everyday' },
  { id: 'flag', english: 'Flag', malayalam: 'പതാക', manglish: 'Pathaaka', category: 'everyday' },
  { id: 'sword', english: 'Sword', malayalam: 'വാൾ', manglish: 'Vaal', category: 'everyday' },
  { id: 'guitar', english: 'Guitar', malayalam: 'ഗിറ്റാർ', manglish: 'Guitar', category: 'everyday' },
  { id: 'drum', english: 'Chenda / Drum', malayalam: 'ചെണ്ട', manglish: 'Chenda', category: 'everyday' },
  { id: 'bow', english: 'Bow & Arrow', malayalam: 'വില്ലും അമ്പും', manglish: 'Villum Ambum', category: 'everyday' },
  { id: 'ring', english: 'Ring', malayalam: 'മോതിരം', manglish: 'Mothiram', category: 'everyday' },
  { id: 'heart', english: 'Heart', malayalam: 'ഹൃദയം', manglish: 'Hrudhayam', category: 'everyday' },
];

/**
 * Returns a random list of unique objects for the round.
 */
export function getRandomObjects(
  count: 6 | 9 | 12 | 15,
  language: 'english' | 'malayalam' = 'english'
): Array<{ index: number; name: string; englishName: string; malayalamName: string }> {
  const shuffled = [...DRAW_IDENTIFY_WORDS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((item, index) => ({
    index,
    name: language === 'malayalam' ? `${item.malayalam} (${item.english})` : item.english,
    englishName: item.english,
    malayalamName: `${item.malayalam} (${item.manglish})`,
  }));
}
