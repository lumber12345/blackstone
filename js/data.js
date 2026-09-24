/* =========================================================
   BLACKSTONE — static game data
   ========================================================= */
'use strict';

const DATA = {};

/* ---------- player base stats ---------- */
DATA.BASE = { hp: 500, energy: 250, nerve: 50, happiness: 100 };

/* ---------- trained stats ---------- */
DATA.SKILLS = [
  { key: 'str', name: 'Strength',  icon: '💪', desc: 'Raises the damage you deal with every weapon.' },
  { key: 'def', name: 'Defense',   icon: '🛡️', desc: 'Soaks incoming damage and shrinks injury/hospital time.' },
  { key: 'spd', name: 'Speed',     icon: '⚡', desc: 'Fills your attack meter faster — more swings per fight.' },
  { key: 'dex', name: 'Dexterity', icon: '🎯', desc: 'Accuracy, critical chance, and success on crimes & escapes.' }
];

/* ---------- jobs ---------- */
DATA.JOBS = [
  { id: 'gym',     company: 'Iron Temple Gym',      boss: 'Coach Rusk',        icon: '🏋️',
    levels: [ { title: 'Towel Attendant', pay: [200, 300],     xp: 6,  skill: 'str', req: 0 },
              { title: 'Sparring Partner', pay: [700, 1000],   xp: 12, skill: 'str', req: 10 },
              { title: 'Head Trainer',     pay: [2200, 3100],  xp: 22, skill: 'str', req: 25 } ] },
  { id: 'bar',     company: 'The Rusty Nail Bar',   boss: 'Marge',             icon: '🍺',
    levels: [ { title: 'Glass Collector',  pay: [220, 330],    xp: 6,  skill: 'dex', req: 0 },
              { title: 'Bartender',        pay: [750, 1100],   xp: 13, skill: 'dex', req: 10 },
              { title: 'Bar Manager',      pay: [2400, 3400],  xp: 24, skill: 'spd', req: 25 } ] },
  { id: 'clinic',  company: 'St. Verna Clinic',     boss: 'Dr. Amani',         icon: '🏥',
    levels: [ { title: 'Janitor',          pay: [210, 310],    xp: 6,  skill: 'def', req: 0 },
              { title: 'Orderly',          pay: [720, 1050],   xp: 13, skill: 'def', req: 10 },
              { title: 'Night Surgeon',    pay: [2500, 3500],  xp: 25, skill: 'def', req: 25 } ] },
  { id: 'press',   company: 'Blackstone Herald',    boss: 'Editor Vance',      icon: '📰',
    levels: [ { title: 'Paper Route Kid',  pay: [190, 290],    xp: 7,  skill: 'dex', req: 0 },
              { title: 'Reporter',         pay: [700, 1000],   xp: 14, skill: 'spd', req: 10 },
              { title: 'Investigator',     pay: [2600, 3700],  xp: 26, skill: 'dex', req: 25 } ] },
  { id: 'docks',   company: 'Harbor Freight Co.',   boss: 'Foreman Doyle',     icon: '⚓',
    levels: [ { title: 'Deckhand',         pay: [250, 360],    xp: 7,  skill: 'str', req: 0 },
              { title: 'Longshoreman',     pay: [820, 1180],   xp: 14, skill: 'str', req: 10 },
              { title: 'Dock Boss',        pay: [2900, 4100],  xp: 28, skill: 'def', req: 25 } ] },
  { id: 'corp',    company: 'Vexx Corporation',     boss: 'Ms. Calloway',      icon: '🏢',
    levels: [ { title: 'Mail Clerk',       pay: [300, 420],    xp: 8,  skill: 'spd', req: 5 },
              { title: 'Analyst',          pay: [950, 1350],   xp: 16, skill: 'dex', req: 15 },
              { title: 'Executive',        pay: [3600, 5200],  xp: 34, skill: 'spd', req: 30 } ] }
];
DATA.WORK_PER_DAY = 8;

/* ---------- crimes ---------- */
DATA.CRIMES = [
  { id: 'pickpocket', name: 'Pickpocket', icon: '👛', minLvl: 1, nerve: 3, energy: 1, base: 34,
    cash: [180, 520], xp: [8, 15], jail: [30, 90], hosp: [30, 60],
    desc: 'Lift a wallet in the market crowd. Barely a crime, barely a living.' },
  { id: 'shoplift', name: 'Shoplift', icon: '🛒', minLvl: 2, nerve: 4, energy: 1, base: 30,
    cash: [450, 1250], xp: [13, 22], jail: [60, 150], hosp: [60, 120],
    desc: 'Walk out of a corner store with your coat full of goods.' },
  { id: 'mugging', name: 'Mug a Drunk', icon: '🥴', minLvl: 4, nerve: 6, energy: 2, base: 28,
    cash: [950, 2400], xp: [20, 34], jail: [90, 210], hosp: [120, 240],
    desc: 'Roll a drunk outside the Rusty Nail. He will not remember your face.' },
  { id: 'burglary', name: 'Burglary', icon: '🪟', minLvl: 6, nerve: 8, energy: 2, base: 26,
    cash: [2000, 5200], xp: [30, 50], jail: [150, 300], hosp: [120, 300],
    desc: 'Pry a window in the Heights. Alarm systems are a rumor until they are not.' },
  { id: 'grandtheft', name: 'Grand Theft Auto', icon: '🚗', minLvl: 9, nerve: 11, energy: 3, base: 26,
    cash: [4200, 10500], xp: [48, 78], jail: [240, 450], hosp: [180, 360],
    desc: 'Hotwire a sedan and dump it at the docks. Chop shops pay by the hour.' },
  { id: 'armedrobbery', name: 'Armed Robbery', icon: '🏦', minLvl: 13, nerve: 15, energy: 3, base: 28,
    cash: [9000, 21000], xp: [75, 120], jail: [360, 660], hosp: [240, 480],
    desc: 'Mask, weapon, three minutes. The teller has been trained to cooperate.' },
  { id: 'heist', name: 'Diamond Heist', icon: '💎', minLvl: 18, nerve: 20, energy: 4, base: 30,
    cash: [21000, 48000], xp: [120, 190], jail: [540, 900], hosp: [360, 660],
    desc: 'The Vanmeer vault. Sixty seconds of laser grid and a very loud alarm.' },
  { id: 'assassination', name: 'Assassination Contract', icon: '🎯', minLvl: 24, nerve: 26, energy: 5, base: 34,
    cash: [60000, 140000], xp: [220, 350], jail: [720, 1200], hosp: [480, 900],
    desc: 'A name, an address and a wire transfer. Nobody asks who signed the cheque.' }
];
DATA.MAX_LAW = 100;

/* ---------- gym ---------- */
DATA.GYM = {
  energyCost: 5,
  minHappy: 20,
  trainers: [
    { id: 'rusk',  name: 'Coach Rusk',       icon: '🏋️', skill: 'str', minLvl: 1,  cost: 250,   bonus: 1.00, line: '"Pain is just weakness leaving the building."' },
    { id: 'okafor',name: 'Ada Okafor',       icon: '🥊', skill: 'def', minLvl: 3,  cost: 600,   bonus: 1.12, line: '"Hit me. Go on. I have been hit by worse than you."' },
    { id: 'kimura',name: 'Ren Kimura',       icon: '🏃', skill: 'spd', minLvl: 5,  cost: 1400,  bonus: 1.25, line: '"Fast feet, slow funeral."' },
    { id: 'vance', name: 'Silas Vance',      icon: '🎯', skill: 'dex', minLvl: 8,  cost: 3000,  bonus: 1.40, line: '"Aim small, miss small, bury small."' },
    { id: 'blackstone', name: 'The Blackstone Method', icon: '🖤', skill: 'all', minLvl: 12, cost: 7500, bonus: 1.62,
      line: 'An illegal stim-program in the old rail tunnels. It trains everything and costs everything.' }
  ]
};
/* points needed to reach the next trained-stat point */
DATA.gymNeed = function (cur) { return Math.ceil(16 + 3.2 * cur); };
DATA.gymGain = function (eff, bonus, happy) {
  return (1.45 * eff * bonus) * (0.65 + 0.35 * (happy / 100));
};

/* ---------- items ---------- */
const I = DATA.ITEMS = {};
function item(id, o) { o.id = id; I[id] = o; return o; }

/* weapons */
item('fists',        { name: 'Bare Fists',        cat: 'weapon', slot: 'primary', req: 0,   icon: '✊', str: 6,   spd: 1.10, price: 0,     desc: 'What you were born with. Desperate, not effective.' });
item('bat',          { name: 'Wooden Baseball Bat', cat: 'weapon', slot: 'primary', req: 1, icon: '🏏', str: 11,  spd: 0.95, price: 420,   desc: 'Ash wood, taped grip. A Blackstone classic.' });
item('knife',        { name: 'Folding Knife',     cat: 'weapon', slot: 'primary', req: 3,   icon: '🔪', str: 15,  spd: 1.12, price: 780,   desc: 'Fast, quiet, illegal in nine districts.' });
item('pipe',         { name: 'Lead Pipe',         cat: 'weapon', slot: 'primary', req: 5,   icon: '🔧', str: 22,  spd: 0.84, price: 1250,  desc: 'Salvaged from the rail yard. Heavy enough to end arguments.' });
item('machete',      { name: 'Machete',           cat: 'weapon', slot: 'primary', req: 8,   icon: '🪓', str: 31,  spd: 0.96, price: 2900,  desc: 'Clears brush. Also clears rooms.' });
item('pistol',       { name: '.38 Revolver',      cat: 'weapon', slot: 'primary', req: 11,   icon: '🔫', str: 44,  spd: 1.06, price: 6200,  desc: 'Six shots, no serial number.' });
item('sawnoff',      { name: 'Sawn-Off Shotgun',  cat: 'weapon', slot: 'primary', req: 15,   icon: '💥', str: 62,  spd: 0.74, price: 11800, desc: 'Devastating up close. Subtle never.' });
item('smg',          { name: 'Skorpion SMG',      cat: 'weapon', slot: 'primary', req: 19,   icon: '🔫', str: 86,  spd: 1.32, price: 24500, desc: 'Chatterbox. Shreds light armor.' });
item('rifle',        { name: 'Assault Rifle',     cat: 'weapon', slot: 'primary', req: 24,   icon: '🎯', str: 124, spd: 1.02, price: 48000, desc: 'Military surplus from a war nobody admits to.' });
item('katana',       { name: 'Blacksteel Katana', cat: 'weapon', slot: 'primary', req: 30,   icon: '⚔️', str: 168, spd: 1.24, price: 92000, desc: 'Folded black steel. Whispers when it swings.' });
item('minigun',      { name: '"Widowmaker" Minigun', cat: 'weapon', slot: 'primary', req: 38, icon: '🌀', str: 235, spd: 1.48, price: 190000, desc: 'The last word in any conversation.' });

/* armor */
item('hoodie',       { name: 'Leather Hoodie',    cat: 'armor', slot: 'armor', req: 1, icon: '🧥', def: 6,   price: 380,    desc: 'Scuffed leather. Stops a bottle, not a bullet.' });
item('kevlar',       { name: 'Kevlar Vest',       cat: 'armor', slot: 'armor', req: 5, icon: '🦺', def: 20,  price: 2400,   desc: 'Standard issue for people with enemies.' });
item('riot',         { name: 'Riot Plating',      cat: 'armor', slot: 'armor', req: 9, icon: '🛡️', def: 44,  price: 9500,   desc: 'Stripped from a police van. It still smells of teargas.' });
item('tactical',     { name: 'Tactical Exo-Suit', cat: 'armor', slot: 'armor', req: 16, icon: '🤖', def: 88,  price: 34000,  desc: 'Servo-assisted ceramic plating. You feel immortal.' });
item('blacksteel',   { name: 'Blacksteel Aegis',  cat: 'armor', slot: 'armor', req: 26, icon: '🖤', def: 160, price: 96000,  desc: 'Prototype from the Vanmeer labs. Nothing gets through.' });

/* medical */
item('bandage',      { name: 'Field Bandage',     cat: 'medical', heal: 60,   price: 320,   icon: '🩹', desc: 'Restores 60 HP instantly. Stings.' });
item('firstaid',     { name: 'First Aid Kit',     cat: 'medical', heal: 200,  price: 1150,  icon: '🧰', desc: 'Restores 200 HP instantly.' });
item('medkit',       { name: 'Trauma Medkit',     cat: 'medical', heal: 600,  price: 4200,  icon: '⚕️', desc: 'Restores 600 HP instantly. Hospital grade.' });
item('adrenaline',   { name: 'Adrenaline Shot',   cat: 'medical', heal: 0, energy: 25, happy: -6, price: 900, icon: '💉',
  desc: '+25 energy, −6 happiness. For the third fight of the night.' });

/* boosters */
item('cola',         { name: 'Energy Cola',       cat: 'booster', energy: 45,  happy: 4,  price: 700,   icon: '🥤', desc: '+45 energy, +4 happiness.' });
item('candy',        { name: 'Sugar Candy',       cat: 'booster', happy: 18,   price: 420,   icon: '🍬', desc: '+18 happiness. Cheap joy.' });
item('ecstasy',      { name: 'Ecstasy',           cat: 'booster', happy: 65,   price: 2600,  icon: '💊', desc: '+65 happiness. Everything feels possible.' });
item('nervebrew',    { name: 'Nerve Brew',        cat: 'booster', nerve: 12,   happy: -3, price: 1300,  icon: '🫗', desc: '+12 nerve, −3 happiness. Dutch courage.' });
item('xanax',        { name: 'Xanax',             cat: 'booster', happy: 200, energy: -25, price: 14000, icon: '🌀',
  desc: '+200 happiness, −25 energy. The rich man\'s smile.' });
item('steroids',     { name: 'Black Market Steroids', cat: 'booster', happy: -12, price: 9000, icon: '🧪',
  desc: '−12 happiness now, but gym gains are doubled for 30 minutes.' });

/* loot / misc */
item('phone',        { name: 'Burner Phone',      cat: 'loot', price: 260,   icon: '📱', desc: 'Stolen. Still has someone\'s photos on it.' });
item('watch',        { name: 'Gold Watch',        cat: 'loot', price: 900,   icon: '⌚', desc: 'Engraved: "To R. — 30 years of service."' });
item('jewelry',      { name: 'Jewelry',           cat: 'loot', price: 1800,  icon: '💍', desc: 'Rings, a chain, one earring. Somebody\'s whole life.' });
item('cashbundle',   { name: 'Banded Cash',       cat: 'loot', price: 3200,  icon: '💵', desc: 'A stack held with a rubber band. No questions asked.' });
item('docs',         { name: 'Forged Documents',  cat: 'loot', price: 5400,  icon: '📄', desc: 'Three identities, all with good credit.' });
item('drillbit',     { name: 'Tungsten Drill Bit',cat: 'loot', price: 8600,  icon: '🪛', desc: 'Cut through the Vanmeer vault door. Warm to the touch.' });
item('dossier',      { name: 'Encrypted Dossier', cat: 'loot', price: 15500, icon: '🗂️', desc: 'Names, accounts, dates. Somebody would pay a lot — or kill — for this.' });
item('diamond',      { name: 'Uncut Diamond',     cat: 'loot', price: 26000, icon: '💎', desc: 'The size of a knuckle. Flawless.' });

/* item categories for the market */
DATA.CATS = [
  { id: 'weapon',  name: 'Weapons',  icon: '⚔️' },
  { id: 'armor',   name: 'Armor',    icon: '🛡️' },
  { id: 'medical', name: 'Medical',  icon: '⚕️' },
  { id: 'booster', name: 'Boosters', icon: '💊' },
  { id: 'loot',    name: 'Fences & Loot', icon: '💰' }
];

/* ---------- enemies ---------- */
DATA.ENEMIES = [
  { id: 'rat',      name: 'Sewer Rat Pack',        lvl: 1,  hp: 110,  dmg: [6, 10],   def: 2,   spd: 6,  dex: 6,  acc: 74,
    cash: [25, 90],      xp: [7, 14],    icon: '🐀', tier: 'The Gutter',   note: 'Dozens of them. All of them angry.' },
  { id: 'thug',     name: 'Corner Thug',           lvl: 2,  hp: 200,  dmg: [9, 15],   def: 5,   spd: 9,  dex: 9,  acc: 76,
    cash: [90, 260],     xp: [11, 20],   icon: '🧔', tier: 'The Gutter',   note: 'Territorial, underfed, carrying a pipe.' },
  { id: 'dog',      name: 'Stray Pitbull',         lvl: 4,  hp: 280,  dmg: [13, 21],  def: 8,   spd: 18, dex: 11, acc: 82,
    cash: [40, 130],     xp: [16, 28],   icon: '🐕', tier: 'The Gutter',   note: 'Fast. Bites low and does not let go.' },
  { id: 'junkie',   name: 'Tunnel Junkie',         lvl: 6,  hp: 340,  dmg: [17, 27],  def: 12,  spd: 11, dex: 14, acc: 74,
    cash: [180, 520],    xp: [22, 38],   icon: '💉', tier: 'The Gutter',   note: 'Unpredictable. Feels nothing you do to him.' },
  { id: 'dealer',   name: 'Street Dealer',         lvl: 8,  hp: 400,  dmg: [21, 33],  def: 16,  spd: 14, dex: 19, acc: 80,
    cash: [420, 1150],   xp: [32, 52],   icon: '🧢', tier: 'Midtown',      note: 'Two bodyguards nearby. He is not one of them.' },
  { id: 'bouncer',  name: 'Club Bouncer',          lvl: 11, hp: 520,  dmg: [27, 42],  def: 24,  spd: 12, dex: 20, acc: 82,
    cash: [800, 1900],   xp: [46, 74],   icon: '🕴️', tier: 'Midtown',      note: 'Ex-wrestler. The door is his whole personality.' },
  { id: 'arsonist', name: 'Arsonist',              lvl: 14, hp: 640,  dmg: [33, 52],  def: 30,  spd: 19, dex: 28, acc: 85,
    cash: [1300, 3000],  xp: [64, 100],  icon: '🔥', tier: 'Midtown',      note: 'Sets you alight. Burns for several rounds.' },
  { id: 'enforcer', name: 'Cartel Enforcer',       lvl: 18, hp: 820,  dmg: [42, 66],  def: 40,  spd: 22, dex: 36, acc: 87,
    cash: [2400, 5600],  xp: [95, 148],  icon: '🕶️', tier: 'The Docks',    note: 'Professional. Will not be talked out of it.' },
  { id: 'ripper',   name: 'Dock Ripper',           lvl: 22, hp: 1000, dmg: [52, 82],  def: 50,  spd: 28, dex: 46, acc: 89,
    cash: [4200, 9200],  xp: [130, 200], icon: '🪓', tier: 'The Docks',    note: 'Something happened to him in the containers.' },
  { id: 'bodyguard',name: 'Vanmeer Bodyguard',     lvl: 27, hp: 1300, dmg: [66, 104], def: 68,  spd: 26, dex: 56, acc: 91,
    cash: [7500, 15500], xp: [185, 285], icon: '🛡️', tier: 'The Docks',    note: 'Armored, earpieced, paid extremely well.' },
  { id: 'hitman',   name: 'Contract Hitman',       lvl: 33, hp: 1700, dmg: [86, 134], def: 88,  spd: 36, dex: 76, acc: 93,
    cash: [13000, 26000],xp: [255, 390], icon: '🎯', tier: 'Uptown',       note: 'You are already on his list. He is just being polite.' },
  { id: 'yakuza',   name: 'Yakuza Lieutenant',     lvl: 40, hp: 2200, dmg: [110, 172],def: 115, spd: 40, dex: 92, acc: 94,
    cash: [21000, 42000],xp: [350, 540], icon: '🐉', tier: 'Uptown',       note: 'Missing half a finger. Has taken many more.' },
  { id: 'cyborg',   name: 'Vexx Security Cyborg',  lvl: 48, hp: 2900, dmg: [145, 228],def: 155, spd: 48, dex: 112,acc: 95,
    cash: [34000, 68000],xp: [470, 720], icon: '🤖', tier: 'Uptown',       note: 'Corporate property. Destroying it is a felony twice over.' },
  { id: 'kingpin',  name: 'Mr. Calloway, Kingpin', lvl: 58, hp: 4200, dmg: [195, 305],def: 210, spd: 52, dex: 140,acc: 96,
    cash: [62000, 128000],xp: [680, 1040],icon: '👑', tier: 'Kingpin',     note: 'Owns the docks, the judges and half the police. Ends here.' }
];
DATA.TIERS = ['The Gutter', 'Midtown', 'The Docks', 'Uptown', 'Kingpin'];
DATA.LOOT = ['phone', 'watch', 'jewelry', 'cashbundle', 'docs', 'drillbit', 'dossier', 'diamond'];

/* ---------- bank ---------- */
DATA.BANK = {
  dailyRate: 0.004,          // 0.4% per day on savings
  loanRate: 0.02,            // 2% per day on debt
  loanCap: lvl => 2500 * lvl * lvl + 5000
};

/* ---------- medical / jail ---------- */
DATA.MEDICAL = {
  docFeePerMin: lvl => Math.round(14 * lvl + 60),
  bailPerMin:   lvl => Math.round(22 * lvl + 90),
  injHealRate:  3
};

/* ---------- hospital / jail natural regen ---------- */
DATA.REGEN = { hp: 25, energy: 24, nerve: 12, happy: 6 };   // per minute

/* ---------- achievements ---------- */
DATA.ACHIEVEMENTS = [
  { id: 'lvl5',   name: 'Getting Noticed',   icon: '🌱', desc: 'Reach level 5',                 reward: 2000,     check: s => s.level >= 5 },
  { id: 'lvl10',  name: 'A Name in the Gutter', icon: '🔥', desc: 'Reach level 10',            reward: 10000,    check: s => s.level >= 10 },
  { id: 'lvl20',  name: 'Made Man',          icon: '🕴️', desc: 'Reach level 20',              reward: 45000,    check: s => s.level >= 20 },
  { id: 'lvl35',  name: 'King of Blackstone',icon: '👑', desc: 'Reach level 35',              reward: 200000,   check: s => s.level >= 35 },
  { id: 'cr10',   name: 'Petty Criminal',    icon: '👛', desc: 'Pull off 10 crimes',          reward: 3000,     check: s => s.stats.crimes >= 10 },
  { id: 'cr100',  name: 'Career Criminal',   icon: '🎭', desc: 'Pull off 100 crimes',         reward: 30000,    check: s => s.stats.crimes >= 100 },
  { id: 'cr500',  name: 'Public Enemy',      icon: '🚨', desc: 'Pull off 500 crimes',         reward: 150000,   check: s => s.stats.crimes >= 500 },
  { id: 'jail10', name: 'Frequent Flyer',    icon: '🔒', desc: 'Get jailed 10 times',         reward: 5000,     check: s => s.stats.jails >= 10 },
  { id: 'esc5',   name: 'Houdini',           icon: '🗝️', desc: 'Break out of jail 5 times',   reward: 12000,    check: s => s.stats.escapes >= 5 },
  { id: 'kill50', name: 'Violent Tendencies',icon: '🩸', desc: 'Win 50 street fights',        reward: 15000,    check: s => s.stats.kills >= 50 },
  { id: 'kill500',name: 'Reaper',            icon: '💀', desc: 'Win 500 street fights',       reward: 90000,    check: s => s.stats.kills >= 500 },
  { id: 'kingpin',name: 'Dethroned',         icon: '🏆', desc: 'Defeat Mr. Calloway',         reward: 250000,   check: s => (s.kills.kingpin || 0) >= 1 },
  { id: 'rich100',name: 'Six Figures',       icon: '💰', desc: 'Hold $100,000 at once',       reward: 20000,    check: s => s.money + s.bank >= 100000 },
  { id: 'rich1m', name: 'Millionaire',       icon: '🏦', desc: 'Hold $1,000,000 at once',     reward: 150000,   check: s => s.money + s.bank >= 1000000 },
  { id: 'train500',name:'Body of Work',      icon: '🏋️', desc: 'Reach 500 total trained stat points', reward: 25000,
    check: s => s.str + s.def + s.spd + s.dex >= 500 },
  { id: 'work100',name: 'Honest Living',     icon: '💼', desc: 'Complete 100 shifts',         reward: 18000,    check: s => s.stats.works >= 100 }
];

/* ---------- random street events ---------- */
DATA.EVENTS = [
  { w: 12, text: 'You find a wallet in a storm drain.', fn: s => { const c = U.rand(60, 340); s.money += c; return { msg: `+$${U.fmt(c)}`, kind: 'good' }; } },
  { w: 8,  text: 'A stranger buys you a drink at the Rusty Nail.', fn: s => { s.happy = Math.min(s.happy + 12, U.maxHappy(s)); return { msg: '+12 happiness', kind: 'good' }; } },
  { w: 8,  text: 'You spot a loose brick of cash behind a laundromat.', fn: s => { const c = U.rand(400, 2200); s.money += c; return { msg: `+$${U.fmt(c)}`, kind: 'good' }; } },
  { w: 7,  text: 'A kid sells you a scratch card. It wins.', fn: s => { const c = U.rand(200, 1500); s.money += c; return { msg: `+$${U.fmt(c)}`, kind: 'good' }; } },
  { w: 7,  text: 'Somebody picks your pocket on the subway.', fn: s => { const c = Math.min(s.money, U.rand(50, 600)); s.money -= c; return { msg: c > 0 ? `−$${U.fmt(c)}` : 'nothing to take', kind: 'bad' }; } },
  { w: 6,  text: 'A drunk swings at you outside the bar. You duck, he hits a post.', fn: s => { const d = U.rand(15, 60); s.hp = Math.max(1, s.hp - d); return { msg: `−${d} HP`, kind: 'bad' }; } },
  { w: 6,  text: 'A fence slips you something "for later".', fn: s => { const id = U.pick(['bandage', 'cola', 'candy', 'nervebrew']); s.inv[id] = (s.inv[id] || 0) + 1; return { msg: `+1 ${DATA.ITEMS[id].name}`, kind: 'good' }; } },
  { w: 5,  text: 'Rain, neon, a long empty street. Nothing happens. Somehow that is the best part.', fn: s => ({ msg: '+3 happiness', kind: 'info', after: () => { s.happy = Math.min(s.happy + 3, U.maxHappy(s)); } }) },
  { w: 4,  text: 'You help an old woman with her groceries. She tips you like a mob wife.', fn: s => { const c = U.rand(150, 900); s.money += c; s.happy = Math.min(s.happy + 6, U.maxHappy(s)); return { msg: `+$${U.fmt(c)}, +6 happiness`, kind: 'good' }; } },
  { w: 4,  text: 'A police spotter logs your face. Your record thickens.', fn: s => { s.law = Math.min(DATA.MAX_LAW, s.law + U.rand(3, 9)); return { msg: '+ law suspicion', kind: 'bad' }; } },
  { w: 3,  text: 'You wake up energized for no reason at all.', fn: s => { s.energy = Math.min(s.energy + 40, U.maxEnergy(s)); return { msg: '+40 energy', kind: 'good' }; } },
  { w: 3,  text: 'A rival crew jumps you in the alley.', fn: s => { const d = U.rand(40, 130); s.hp = Math.max(1, s.hp - d); const c = Math.min(s.money, U.rand(100, 800)); s.money -= c; return { msg: `−${d} HP, −$${U.fmt(c)}`, kind: 'bad' }; } },
  { w: 2,  text: 'You win a back-room dice game.', fn: s => { const c = U.rand(900, 4200); s.money += c; return { msg: `+$${U.fmt(c)}`, kind: 'gold' }; } },
  { w: 2,  text: 'A dead drop you forgot about. Inside: banded cash.', fn: s => { s.inv.cashbundle = (s.inv.cashbundle || 0) + 1; return { msg: '+1 Banded Cash', kind: 'gold' }; } }
];

/* ---------- level thresholds ---------- */
DATA.xpForLevel = lvl => Math.round(90 * Math.pow(lvl, 1.9));
DATA.xpFor = lvl => {                       // xp needed to go from lvl -> lvl+1
  return DATA.xpForLevel(lvl + 1) - DATA.xpForLevel(lvl);
};
DATA.maxHP      = s => DATA.BASE.hp     + s.lvl * 22 + Math.round(s.def * 3.6);
DATA.maxEnergy  = s => DATA.BASE.energy + s.lvl * 6  + Math.round(s.spd * 0.9);
DATA.maxNerve   = s => DATA.BASE.nerve  + Math.floor(s.lvl / 3) + Math.round(s.dex * 0.12);
DATA.maxHappy   = s => DATA.BASE.happiness + Math.round(s.lvl * 2);

DATA.AVATARS = ['🕵️', '🥷', '🧛', '🦹', '🧟', '👤', '🎩', '🐺', '🦂', '☠️', '🃏', '🚬'];
DATA.STATS = { str: 'str', def: 'def', spd: 'spd', dex: 'dex' };
