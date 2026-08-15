/**
 * Password and passphrase generation.
 *
 * Randomness comes from `crypto.getRandomValues` and is drawn with rejection
 * sampling: taking `byte % alphabet.length` biases the first few characters of
 * the alphabet whenever 256 is not a multiple of its length.
 */

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
} as const

export type CharsetKey = keyof typeof CHARSETS

/** Characters that are easy to confuse in a copied-out password. */
const AMBIGUOUS = new Set(['l', 'I', '1', 'O', '0', 'o', '|', 'B', '8', 'S', '5', 'Z', '2'])

export function buildAlphabet(sets: CharsetKey[], excludeAmbiguous: boolean): string {
  const chars = sets.flatMap(key => [...CHARSETS[key]])
  const filtered = excludeAmbiguous ? chars.filter(c => !AMBIGUOUS.has(c)) : chars
  return [...new Set(filtered)].join('')
}

function randomIndex(bound: number): number {
  // Reject the tail of the byte range that does not divide evenly into `bound`.
  const limit = Math.floor(256 / bound) * bound
  const buf = new Uint8Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % bound
  }
}

export function generatePassword(length: number, alphabet: string): string {
  if (alphabet.length === 0 || length <= 0) return ''
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[randomIndex(alphabet.length)]
  return out
}

/**
 * EFF-style short wordlist. Kept deliberately small and bundled so the generator
 * works offline; entropy is reported honestly from this list's actual size.
 */
export const WORDLIST = [
  'acid', 'acorn', 'acre', 'actor', 'adobe', 'agile', 'aide', 'alarm', 'album', 'alien',
  'alley', 'alloy', 'alpha', 'amber', 'amend', 'amino', 'ample', 'anchor', 'angle', 'ankle',
  'apple', 'april', 'arena', 'argue', 'armor', 'array', 'arrow', 'ascot', 'aspen', 'asset',
  'atlas', 'attic', 'audio', 'audit', 'aunt', 'aura', 'avert', 'awake', 'award', 'axis',
  'bacon', 'badge', 'bagel', 'baker', 'balmy', 'banjo', 'barge', 'basil', 'basin', 'baton',
  'beach', 'beam', 'bean', 'bench', 'berry', 'bison', 'blade', 'blaze', 'blend', 'blimp',
  'blink', 'bloom', 'blues', 'blunt', 'board', 'bonus', 'boost', 'booth', 'bossy', 'botany',
  'boxer', 'brace', 'braid', 'brain', 'brake', 'brave', 'bread', 'brick', 'brisk', 'broad',
  'bronze', 'brook', 'broom', 'brush', 'bunch', 'bundle', 'bunny', 'burst', 'cabin', 'cable',
  'cache', 'cactus', 'cadet', 'camel', 'canal', 'candy', 'canoe', 'canyon', 'cargo', 'carol',
  'carve', 'cause', 'cedar', 'cello', 'chalk', 'charm', 'chart', 'chase', 'cheek', 'chess',
  'chill', 'chime', 'chip', 'chorus', 'cider', 'cinema', 'civic', 'clamp', 'clash', 'clean',
  'cliff', 'climb', 'cloak', 'clock', 'cloud', 'clover', 'clown', 'coach', 'cobra', 'cocoa',
  'coral', 'couch', 'cover', 'crane', 'crate', 'crawl', 'cream', 'creek', 'crest', 'cross',
  'crown', 'crumb', 'crust', 'cubic', 'cupid', 'curve', 'cycle', 'daisy', 'dance', 'dandy',
  'dawn', 'debug', 'decal', 'decoy', 'delta', 'dense', 'depot', 'depth', 'derby', 'diner',
  'dingo', 'ditch', 'diver', 'dizzy', 'dock', 'dodge', 'donor', 'donut', 'draft', 'drain',
  'drama', 'dream', 'dress', 'drift', 'drink', 'drive', 'drone', 'dryer', 'duet', 'dune',
  'eagle', 'early', 'earth', 'easel', 'ebony', 'echo', 'edge', 'eight', 'elbow', 'elder',
  'elite', 'elope', 'ember', 'emery', 'empty', 'enact', 'ensue', 'entry', 'envoy', 'equal',
  'error', 'essay', 'ether', 'ethic', 'evoke', 'exact', 'exile', 'exit', 'extra', 'fable',
  'fancy', 'fang', 'fern', 'ferry', 'fetch', 'fever', 'fiber', 'field', 'fifty', 'final',
  'finch', 'flair', 'flame', 'flank', 'flare', 'flash', 'fleet', 'flint', 'float', 'flock',
  'flora', 'flour', 'fluid', 'flute', 'foam', 'focal', 'foggy', 'forge', 'forum', 'fossil',
  'frame', 'fresh', 'frost', 'fruit', 'fudge', 'fuel', 'funny', 'gable', 'gadget', 'gala',
  'gamma', 'gauge', 'gecko', 'genre', 'ghost', 'giant', 'ginger', 'given', 'glade', 'gland',
  'glass', 'gleam', 'globe', 'gloss', 'glove', 'gnome', 'goose', 'grade', 'grain', 'grand',
  'grape', 'graph', 'grass', 'gravy', 'green', 'grid', 'grill', 'groom', 'grove', 'guide',
  'guild', 'gulf', 'gummy', 'habit', 'hail', 'halo', 'happy', 'harbor', 'hasty', 'hatch',
  'haven', 'hazel', 'heart', 'hedge', 'hefty', 'helix', 'hello', 'herb', 'heron', 'hilly',
  'hinge', 'hippo', 'hobby', 'honey', 'honor', 'horse', 'hotel', 'hound', 'house', 'hover',
  'human', 'humid', 'hurdle', 'husky', 'hydro', 'icing', 'igloo', 'image', 'imply', 'inbox',
  'index', 'inlet', 'inner', 'input', 'irony', 'islet', 'issue', 'ivory', 'jade', 'jazzy',
  'jelly', 'jewel', 'jockey', 'jolly', 'judge', 'juice', 'jumbo', 'juror', 'kayak', 'kettle',
  'khaki', 'kiosk', 'kite', 'kitten', 'knack', 'knee', 'knife', 'koala', 'label', 'lace',
  'lamp', 'lance', 'lapel', 'large', 'larva', 'laser', 'latch', 'later', 'latex', 'lava',
  'layer', 'ledge', 'lemon', 'lever', 'light', 'lilac', 'lily', 'limbo', 'lime', 'linen',
  'liner', 'lion', 'llama', 'lobby', 'local', 'lodge', 'lofty', 'logic', 'lotus', 'lucky',
  'lunar', 'lunch', 'lyric', 'macro', 'magic', 'magma', 'maize', 'major', 'mango', 'manor',
  'maple', 'marble', 'march', 'marsh', 'mason', 'match', 'medal', 'melon', 'mercy', 'merit',
  'mesa', 'metal', 'meter', 'micro', 'midst', 'might', 'mimic', 'mint', 'minor', 'mirth',
  'mixer', 'model', 'modem', 'moist', 'molar', 'money', 'month', 'moral', 'motor', 'mound',
  'mount', 'mouse', 'movie', 'mural', 'music', 'nacho', 'nasal', 'navy', 'nebula', 'nectar',
  'needle', 'nerve', 'nest', 'newt', 'niche', 'night', 'ninja', 'noble', 'noise', 'north',
  'notch', 'novel', 'nudge', 'nurse', 'oasis', 'oat', 'ocean', 'octave', 'olive', 'omega',
  'onion', 'onset', 'opal', 'opera', 'orbit', 'organ', 'otter', 'ounce', 'oval', 'owner',
  'oxide', 'oyster', 'ozone', 'paddle', 'pagan', 'paint', 'palm', 'panda', 'panel', 'pansy',
  'paper', 'parka', 'party', 'pasta', 'patch', 'patio', 'pause', 'peach', 'pearl', 'pecan',
  'pedal', 'penny', 'perch', 'petal', 'phase', 'phone', 'photo', 'piano', 'picnic', 'piece',
  'pilot', 'pinch', 'pine', 'pixel', 'pizza', 'place', 'plaid', 'plank', 'plant', 'plate',
  'plaza', 'plum', 'plush', 'poem', 'point', 'polar', 'poppy', 'porch', 'portal', 'poster',
  'pouch', 'pound', 'power', 'prawn', 'press', 'price', 'pride', 'prime', 'print', 'prism',
  'prize', 'probe', 'prong', 'proof', 'proud', 'prune', 'pulse', 'punch', 'puppy', 'purse',
  'quail', 'quart', 'queen', 'query', 'quest', 'quiet', 'quilt', 'quota', 'radar', 'radio',
  'raft', 'rally', 'ranch', 'range', 'rapid', 'raven', 'razor', 'reach', 'realm', 'rebel',
  'recap', 'reef', 'relay', 'relic', 'remix', 'renew', 'reply', 'reset', 'resin', 'retro',
  'rhino', 'rhyme', 'ridge', 'rifle', 'rigid', 'rinse', 'ripple', 'risky', 'rival', 'river',
  'roast', 'robin', 'robot', 'rocky', 'rodeo', 'rogue', 'roman', 'roost', 'rope', 'rotor',
  'rough', 'round', 'route', 'royal', 'ruby', 'rugby', 'ruler', 'rumor', 'runic', 'rural',
  'saber', 'salad', 'salon', 'salsa', 'sandy', 'satin', 'sauce', 'scale', 'scarf', 'scenic',
  'scoop', 'scout', 'scrap', 'sedan', 'seed', 'sepia', 'serum', 'shade', 'shaft', 'shale',
  'shark', 'sharp', 'shelf', 'shell', 'shine', 'shirt', 'shock', 'shore', 'shrub', 'siege',
  'sift', 'silk', 'silo', 'siren', 'sixty', 'skate', 'sketch', 'skirt', 'slate', 'sleek',
  'slice', 'slide', 'slope', 'small', 'smart', 'smile', 'smoke', 'snack', 'snail', 'snake',
  'sneak', 'snow', 'soap', 'sofa', 'solar', 'solid', 'sonic', 'sound', 'south', 'space',
  'spade', 'spark', 'spice', 'spine', 'spiral', 'spoke', 'spoon', 'sport', 'spray', 'spruce',
  'squad', 'stack', 'staff', 'stage', 'stair', 'stamp', 'stand', 'starch', 'steam', 'steel',
  'stem', 'stick', 'still', 'stock', 'stone', 'stool', 'storm', 'stove', 'strap', 'straw',
  'strut', 'stucco', 'study', 'sugar', 'suite', 'sunny', 'surf', 'swamp', 'swan', 'sweep',
  'swift', 'swirl', 'sword', 'syrup', 'table', 'tacit', 'taco', 'tally', 'tango', 'tapir',
  'tarot', 'taste', 'teal', 'tempo', 'tenor', 'tent', 'thorn', 'three', 'thumb', 'tidal',
  'tiger', 'tile', 'timber', 'tonic', 'topaz', 'torch', 'total', 'towel', 'tower', 'toxic',
  'trace', 'track', 'trade', 'trail', 'train', 'tram', 'trap', 'trend', 'tribe', 'trick',
  'trout', 'truck', 'trunk', 'tulip', 'tuna', 'tundra', 'tunnel', 'turbo', 'tutor', 'twine',
  'twist', 'ultra', 'umber', 'uncle', 'union', 'unite', 'unity', 'upper', 'urban', 'usage',
  'usher', 'utter', 'vague', 'valet', 'valid', 'valley', 'value', 'valve', 'vapor', 'vault',
  'velvet', 'venue', 'verge', 'verse', 'vinyl', 'viola', 'viper', 'vivid', 'vocal', 'vodka',
  'vogue', 'voice', 'voter', 'wafer', 'wagon', 'walnut', 'waltz', 'wander', 'watch', 'water',
  'wave', 'weave', 'wedge', 'whale', 'wharf', 'wheat', 'wheel', 'while', 'whisk', 'width',
  'willow', 'wind', 'wing', 'wiper', 'wire', 'wolf', 'woman', 'woven', 'wrist', 'yacht',
  'yard', 'yeast', 'yield', 'yoga', 'yogurt', 'zebra', 'zesty', 'zinc', 'zone', 'zoom',
] as const

export interface PassphraseOptions {
  words: number
  separator: string
  capitalise: boolean
  appendNumber: boolean
}

export function generatePassphrase({ words, separator, capitalise, appendNumber }: PassphraseOptions): string {
  const picked = Array.from({ length: words }, () => {
    const word = WORDLIST[randomIndex(WORDLIST.length)]
    return capitalise ? word[0].toUpperCase() + word.slice(1) : word
  })
  const base = picked.join(separator)
  return appendNumber ? `${base}${separator}${randomIndex(100).toString().padStart(2, '0')}` : base
}

/** Shannon entropy of the *generator*, i.e. log2(pool^length) — not of the string. */
export function entropyBits(poolSize: number, length: number): number {
  if (poolSize <= 1 || length <= 0) return 0
  return Math.log2(poolSize) * length
}

export type StrengthLevel = 'weak' | 'fair' | 'strong' | 'excellent'

export function strengthFor(bits: number): StrengthLevel {
  if (bits < 50) return 'weak'
  if (bits < 75) return 'fair'
  if (bits < 100) return 'strong'
  return 'excellent'
}

/**
 * Rough offline-cracking estimate at 10^11 guesses/second (a well-funded GPU rig
 * against a fast hash). Halved because the average search covers half the space.
 */
export function crackTimeSeconds(bits: number): number {
  return 2 ** bits / 2 / 1e11
}
