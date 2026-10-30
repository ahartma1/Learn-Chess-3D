// Curated Visual Learning Strategies & Openings / Counter Tactics
// Board coordinate mapping:
// rank 8 = r:0 (Black back rank), rank 7 = r:1 (Black pawns)
// rank 2 = r:6 (White pawns), rank 1 = r:7 (White back rank)
// files a-h = c:0 through c:7

export interface StrategyMoveStep {
  step: number;
  notation: string;
  player: 'w' | 'b';
  from: { r: number; c: number };
  to: { r: number; c: number };
  stepName: string;
  actionExplanation: string;
  tacticalSquare: string;
  strategicFocus: string;
}

export interface LearningStrategy {
  id: string;
  name: string;
  category: 'White Opening' | 'Black Counter (vs 1.e4)' | 'Black Counter (vs 1.d4)' | 'Scholar Refutation' | 'Novel Wizard Strategy';
  badge: string;
  triggerCondition: 'initial' | 'e4' | 'd4' | 'scholar' | 'any';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  coreConcept: string;
  moves: StrategyMoveStep[];
}

export function sqToCoords(sq: string): { r: number; c: number } {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10);
  return {
    r: 8 - rank,
    c: file,
  };
}

export function coordsToSq(r: number, c: number): string {
  const fileChar = String.fromCharCode('a'.charCodeAt(0) + c);
  const rankNum = 8 - r;
  return `${fileChar}${rankNum}`;
}

export const LEARNING_STRATEGIES: LearningStrategy[] = [
  // --- White Openings ---
  {
    id: 'italian_game',
    name: 'Italian Game (Giuoco Piano)',
    category: 'White Opening',
    badge: 'Classical',
    triggerCondition: 'initial',
    difficulty: 'Beginner',
    summary: 'The world’s most famous classical opening: claim the center, develop bishops, and aim at Black’s vulnerable f7 square.',
    coreConcept: 'Fast development of knights and bishops toward the center before Black can castle.',
    moves: [
      {
        step: 1,
        notation: '1. e4',
        player: 'w',
        from: sqToCoords('e2'),
        to: sqToCoords('e4'),
        stepName: 'King’s Pawn Advance',
        actionExplanation: 'Stakes a claim on central squares d5/f5 and immediately frees paths for your Queen and light-square Bishop.',
        tacticalSquare: 'e4',
        strategicFocus: 'Center Control',
      },
      {
        step: 2,
        notation: '1... e5',
        player: 'b',
        from: sqToCoords('e7'),
        to: sqToCoords('e5'),
        stepName: 'Black Clashes in Center',
        actionExplanation: 'Black mirrors the pawn to block White from pushing e5 and secure equal center space.',
        tacticalSquare: 'e5',
        strategicFocus: 'Center Symmetry',
      },
      {
        step: 3,
        notation: '2. Nf3',
        player: 'w',
        from: sqToCoords('g1'),
        to: sqToCoords('f3'),
        stepName: 'Knight Attack',
        actionExplanation: 'Develops a minor piece while actively attacking Black’s unprotected e5 pawn.',
        tacticalSquare: 'f3',
        strategicFocus: 'Development with Threat',
      },
      {
        step: 4,
        notation: '2... Nc6',
        player: 'b',
        from: sqToCoords('b8'),
        to: sqToCoords('c6'),
        stepName: 'Knight Defense',
        actionExplanation: 'Black guards e5 and simultaneously develops toward central outposts.',
        tacticalSquare: 'c6',
        strategicFocus: 'Piece Protection',
      },
      {
        step: 5,
        notation: '3. Bc4',
        player: 'w',
        from: sqToCoords('f1'),
        to: sqToCoords('c4'),
        stepName: 'Italian Bishop Placement',
        actionExplanation: 'The defining move of the Italian Game! Trains laser sights directly onto Black’s sensitive f7 pawn.',
        tacticalSquare: 'f7',
        strategicFocus: 'Weak Square Infiltration',
      },
      {
        step: 6,
        notation: '3... Bc5',
        player: 'b',
        from: sqToCoords('f8'),
        to: sqToCoords('c5'),
        stepName: 'Symmetrical Bishop Response',
        actionExplanation: 'Black develops harmoniously, controlling d4 and preparing a quick kingside castle.',
        tacticalSquare: 'c5',
        strategicFocus: 'King Safety Prep',
      },
      {
        step: 7,
        notation: '4. c3',
        player: 'w',
        from: sqToCoords('c2'),
        to: sqToCoords('c3'),
        stepName: 'Preparing the Center Ram (d4)',
        actionExplanation: 'Prepares to hammer through Black’s center with d2-d4 to build an immovable two-pawn phalanx.',
        tacticalSquare: 'd4',
        strategicFocus: 'Center Domination',
      },
    ],
  },
  {
    id: 'queens_gambit',
    name: 'Queen’s Gambit',
    category: 'White Opening',
    badge: 'Strategic',
    triggerCondition: 'initial',
    difficulty: 'Intermediate',
    summary: 'Offer a wing pawn on c4 to seize complete command of the golden d4 and e4 squares.',
    coreConcept: 'Sacrifice space on the wing to conquer the grand center and dominate the board.',
    moves: [
      {
        step: 1,
        notation: '1. d4',
        player: 'w',
        from: sqToCoords('d2'),
        to: sqToCoords('d4'),
        stepName: 'Queen’s Pawn Foundation',
        actionExplanation: 'Solid pawn push protected by the Queen; controls e5 and opens lines for the dark-square Bishop.',
        tacticalSquare: 'd4',
        strategicFocus: 'Solid Center Anchor',
      },
      {
        step: 2,
        notation: '1... d5',
        player: 'b',
        from: sqToCoords('d7'),
        to: sqToCoords('d5'),
        stepName: 'Black Matches in Center',
        actionExplanation: 'Black claims their half of the center to prevent White from grabbing both d4 and e4.',
        tacticalSquare: 'd5',
        strategicFocus: 'Center Parity',
      },
      {
        step: 3,
        notation: '2. c4',
        player: 'w',
        from: sqToCoords('c2'),
        to: sqToCoords('c4'),
        stepName: 'The Gambit Offer',
        actionExplanation: 'White offers the c4 pawn! If Black takes, White pushes e4 and regains the pawn with overwhelming space.',
        tacticalSquare: 'c4',
        strategicFocus: 'Space Sacrifice',
      },
      {
        step: 4,
        notation: '2... e6',
        player: 'b',
        from: sqToCoords('e7'),
        to: sqToCoords('e6'),
        stepName: 'Declining with Solid Granite',
        actionExplanation: 'The classical Queen’s Gambit Declined: Black firmly reinforces d5 with the e-pawn.',
        tacticalSquare: 'd5',
        strategicFocus: 'Fortification',
      },
      {
        step: 5,
        notation: '3. Nc3',
        player: 'w',
        from: sqToCoords('b1'),
        to: sqToCoords('c3'),
        stepName: 'Knight Pressure',
        actionExplanation: 'Adds a second attacker against Black’s d5 bastion while preparing the e4 push.',
        tacticalSquare: 'd5',
        strategicFocus: 'Pressure Multiplication',
      },
      {
        step: 6,
        notation: '3... Nf6',
        player: 'b',
        from: sqToCoords('g8'),
        to: sqToCoords('f6'),
        stepName: 'Natural Knight Defense',
        actionExplanation: 'Brings defensive muscle to d5 and controls e4, denying White an effortless central sweep.',
        tacticalSquare: 'e4',
        strategicFocus: 'Prophylaxis',
      },
    ],
  },
  {
    id: 'sanctum_dragon_novelty',
    name: 'Sanctum Cathedral Gambit',
    category: 'Novel Wizard Strategy',
    badge: 'Wizard Novelty',
    triggerCondition: 'initial',
    difficulty: 'Advanced',
    summary: 'A sharp, unconventional wizard tactic: launch the b-pawn and bishop early to blow open dynamic tactical strike lanes.',
    coreConcept: 'Rapid sacrificial pawn sacrifice to dismantle the opponent’s king before they can finish castling.',
    moves: [
      {
        step: 1,
        notation: '1. e4',
        player: 'w',
        from: sqToCoords('e2'),
        to: sqToCoords('e4'),
        stepName: 'Sanctum Pulse',
        actionExplanation: 'White opens the cathedral nave with an assertive central thrust.',
        tacticalSquare: 'e4',
        strategicFocus: 'Center Initiative',
      },
      {
        step: 2,
        notation: '1... e5',
        player: 'b',
        from: sqToCoords('e7'),
        to: sqToCoords('e5'),
        stepName: 'Opponent Accepts Duel',
        actionExplanation: 'Black holds the central lane face-to-face.',
        tacticalSquare: 'e5',
        strategicFocus: 'Center Standoff',
      },
      {
        step: 3,
        notation: '2. Bc4',
        player: 'w',
        from: sqToCoords('f1'),
        to: sqToCoords('c4'),
        stepName: 'Direct Bishop Sights',
        actionExplanation: 'White targets the f7 heartstone before developing knights.',
        tacticalSquare: 'f7',
        strategicFocus: 'Direct Targeting',
      },
      {
        step: 4,
        notation: '2... Nf6',
        player: 'b',
        from: sqToCoords('g8'),
        to: sqToCoords('f6'),
        stepName: 'Opponent Counter-Threatens e4',
        actionExplanation: 'Black threatens White’s lead pawn.',
        tacticalSquare: 'e4',
        strategicFocus: 'Counter-Attack',
      },
      {
        step: 5,
        notation: '3. d4',
        player: 'w',
        from: sqToCoords('d2'),
        to: sqToCoords('d4'),
        stepName: 'The Center Sacrifice',
        actionExplanation: 'Rather than meekly defending e4, White detonates the center to open all attacking files!',
        tacticalSquare: 'd4',
        strategicFocus: 'Aggressive Gambit',
      },
      {
        step: 6,
        notation: '3... exd4',
        player: 'b',
        from: sqToCoords('e5'),
        to: sqToCoords('d4'),
        stepName: 'Black Captures the Bait',
        actionExplanation: 'Black is up a pawn, but their king sits completely exposed in the center.',
        tacticalSquare: 'd4',
        strategicFocus: 'Bait Taken',
      },
      {
        step: 7,
        notation: '4. Nf3',
        player: 'w',
        from: sqToCoords('g1'),
        to: sqToCoords('f3'),
        stepName: 'Sanctum Ambush',
        actionExplanation: 'White regains d4 or castles instantly, with unstoppable dynamic piece activity!',
        tacticalSquare: 'd4',
        strategicFocus: 'Cathedral Dominance',
      },
    ],
  },

  // --- Black Counters vs 1. e4 ---
  {
    id: 'counter_sicilian',
    name: 'Sicilian Defense (Open Counter-Punch)',
    category: 'Black Counter (vs 1.e4)',
    badge: 'Sharp Counter',
    triggerCondition: 'e4',
    difficulty: 'Intermediate',
    summary: 'The highest-scoring response against 1.e4: fight asymmetrically for the d4 square with the c-pawn.',
    coreConcept: 'Avoid symmetric copying. Black creates an unbalanced fight with counterplay on the half-open c-file.',
    moves: [
      {
        step: 1,
        notation: '1... c5',
        player: 'b',
        from: sqToCoords('c7'),
        to: sqToCoords('c5'),
        stepName: 'The Sicilian Thrust',
        actionExplanation: 'Controls the critical d4 square from the flank without committing the king’s pawns.',
        tacticalSquare: 'd4',
        strategicFocus: 'Asymmetric Counter',
      },
      {
        step: 2,
        notation: '2. Nf3',
        player: 'w',
        from: sqToCoords('g1'),
        to: sqToCoords('f3'),
        stepName: 'White Prepares d4 Push',
        actionExplanation: 'White develops a knight to support pushing d2-d4 next turn.',
        tacticalSquare: 'd4',
        strategicFocus: 'Central Preparation',
      },
      {
        step: 3,
        notation: '2... d6',
        player: 'b',
        from: sqToCoords('d7'),
        to: sqToCoords('d6'),
        stepName: 'Pawn Anchor',
        actionExplanation: 'Locks down e5 and opens up paths for Black’s light-squared bishop and queen.',
        tacticalSquare: 'e5',
        strategicFocus: 'Structure Support',
      },
      {
        step: 4,
        notation: '3. d4',
        player: 'w',
        from: sqToCoords('d2'),
        to: sqToCoords('d4'),
        stepName: 'Open Sicilian Explosion',
        actionExplanation: 'White opens the center, challenging Black to trade pawns.',
        tacticalSquare: 'd4',
        strategicFocus: 'Board Opening',
      },
      {
        step: 5,
        notation: '3... cxd4',
        player: 'b',
        from: sqToCoords('c5'),
        to: sqToCoords('d4'),
        stepName: 'Favorable Pawn Trade',
        actionExplanation: 'Black trades a flank c-pawn for White’s precious central d-pawn! Black now has two central pawns vs one.',
        tacticalSquare: 'd4',
        strategicFocus: 'Center Superiority',
      },
      {
        step: 6,
        notation: '4. Nxd4',
        player: 'w',
        from: sqToCoords('f3'),
        to: sqToCoords('d4'),
        stepName: 'White Recaptures Center',
        actionExplanation: 'White’s knight sits centrally on d4, ready to defend kingside territory.',
        tacticalSquare: 'd4',
        strategicFocus: 'Knight Outpost',
      },
      {
        step: 7,
        notation: '4... Nf6',
        player: 'b',
        from: sqToCoords('g8'),
        to: sqToCoords('f6'),
        stepName: 'Immediate Attack on e4',
        actionExplanation: 'Black brings the knight out attacking White’s undefended e4 pawn, forcing White onto the defensive!',
        tacticalSquare: 'e4',
        strategicFocus: 'Counter-Strike',
      },
    ],
  },
  {
    id: 'counter_french',
    name: 'French Defense (Granite Fortress)',
    category: 'Black Counter (vs 1.e4)',
    badge: 'Solid Fortress',
    triggerCondition: 'e4',
    difficulty: 'Beginner',
    summary: 'Build an impenetrable granite chain on e6 and d5 to blunt White’s attacking bishops, then counterattack along the c-file.',
    coreConcept: 'Give White space in exchange for an uncrackable fortress that later explodes into White’s overextended center.',
    moves: [
      {
        step: 1,
        notation: '1... e6',
        player: 'b',
        from: sqToCoords('e7'),
        to: sqToCoords('e6'),
        stepName: 'The Shield Lift',
        actionExplanation: 'Prepares to hammer White’s center with d7-d5 next turn, backed up by the e6 pawn.',
        tacticalSquare: 'd5',
        strategicFocus: 'Foundation Building',
      },
      {
        step: 2,
        notation: '2. d4',
        player: 'w',
        from: sqToCoords('d2'),
        to: sqToCoords('d4'),
        stepName: 'White Seizes Center',
        actionExplanation: 'White takes the opportunity to place two pawns side-by-side in the center.',
        tacticalSquare: 'd4',
        strategicFocus: 'Pawn Center',
      },
      {
        step: 3,
        notation: '2... d5',
        player: 'b',
        from: sqToCoords('d7'),
        to: sqToCoords('d5'),
        stepName: 'The French Counter-Strike',
        actionExplanation: 'Black challenges White’s e4 pawn immediately! White must decide to push, defend, or trade.',
        tacticalSquare: 'e4',
        strategicFocus: 'Direct Contest',
      },
      {
        step: 4,
        notation: '3. e5',
        player: 'w',
        from: sqToCoords('e4'),
        to: sqToCoords('e5'),
        stepName: 'Advance Variation Push',
        actionExplanation: 'White locks the center and gains space, but their pawn chain now has a weak root on d4.',
        tacticalSquare: 'e5',
        strategicFocus: 'Territory Lock',
      },
      {
        step: 5,
        notation: '3... c5',
        player: 'b',
        from: sqToCoords('c7'),
        to: sqToCoords('c5'),
        stepName: 'Under-Mining Strike',
        actionExplanation: 'The trademark French counter: Black attacks the base of White’s chain at d4 immediately!',
        tacticalSquare: 'd4',
        strategicFocus: 'Base Demolition',
      },
      {
        step: 6,
        notation: '4. c3',
        player: 'w',
        from: sqToCoords('c2'),
        to: sqToCoords('c3'),
        stepName: 'White Buttresses d4',
        actionExplanation: 'White shores up d4 with another pawn to maintain their center rampart.',
        tacticalSquare: 'd4',
        strategicFocus: 'Pawn Reinforcement',
      },
    ],
  },
  {
    id: 'counter_scandinavian',
    name: 'Scandinavian Defense (Instant Center Clash)',
    category: 'Black Counter (vs 1.e4)',
    badge: 'Direct Clash',
    triggerCondition: 'e4',
    difficulty: 'Beginner',
    summary: 'Instantly challenge White’s pawn on move one with 1...d5! No waiting, no memorizing endless theory.',
    coreConcept: 'Break White’s center instantly on turn one and position the Queen safely with open diagonals.',
    moves: [
      {
        step: 1,
        notation: '1... d5',
        player: 'b',
        from: sqToCoords('d7'),
        to: sqToCoords('d5'),
        stepName: 'Move 1 Strike',
        actionExplanation: 'Strikes White’s e4 pawn immediately, forcing White to respond right now.',
        tacticalSquare: 'e4',
        strategicFocus: 'Immediate Pressure',
      },
      {
        step: 2,
        notation: '2. exd5',
        player: 'w',
        from: sqToCoords('e4'),
        to: sqToCoords('d5'),
        stepName: 'White Captures',
        actionExplanation: 'White takes the free pawn in the center.',
        tacticalSquare: 'd5',
        strategicFocus: 'Material Take',
      },
      {
        step: 3,
        notation: '2... Qxd5',
        player: 'b',
        from: sqToCoords('d8'),
        to: sqToCoords('d5'),
        stepName: 'Queen Recapture',
        actionExplanation: 'Black’s Queen takes center stage with immense power radiating in all directions.',
        tacticalSquare: 'd5',
        strategicFocus: 'Queen Centralization',
      },
      {
        step: 4,
        notation: '3. Nc3',
        player: 'w',
        from: sqToCoords('b1'),
        to: sqToCoords('c3'),
        stepName: 'White Kicks Queen',
        actionExplanation: 'White develops a knight with tempo, threatening Black’s Queen.',
        tacticalSquare: 'd5',
        strategicFocus: 'Tempo Attack',
      },
      {
        step: 5,
        notation: '3... Qa5',
        player: 'b',
        from: sqToCoords('d5'),
        to: sqToCoords('a5'),
        stepName: 'The Safe Harbor',
        actionExplanation: 'Black tucks the Queen securely to a5, out of danger, while pinning or surveying White’s queenside!',
        tacticalSquare: 'a5',
        strategicFocus: 'Tactical Repositioning',
      },
      {
        step: 6,
        notation: '4. d4',
        player: 'w',
        from: sqToCoords('d2'),
        to: sqToCoords('d4'),
        stepName: 'White Reclaims Center',
        actionExplanation: 'White pushes d4, but Black’s pawn structure remains completely uncompromised.',
        tacticalSquare: 'd4',
        strategicFocus: 'Center Push',
      },
    ],
  },

  // --- Black Counters vs 1. d4 ---
  {
    id: 'counter_kings_indian',
    name: 'King’s Indian Defense (Dragon Attack)',
    category: 'Black Counter (vs 1.d4)',
    badge: 'Counter-Attack',
    triggerCondition: 'd4',
    difficulty: 'Intermediate',
    summary: 'Allow White to build a giant center, fortify your king with a dragon fianchetto, then unleash a devastating flank counter-attack.',
    coreConcept: 'Concede initial space, lock down the king behind a bishop shield, and storm the white monarch.',
    moves: [
      {
        step: 1,
        notation: '1... Nf6',
        player: 'b',
        from: sqToCoords('g8'),
        to: sqToCoords('f6'),
        stepName: 'Flexible Knight Outpost',
        actionExplanation: 'Prevents White from immediately playing e2-e4 without locking Black into any rigid structure.',
        tacticalSquare: 'e4',
        strategicFocus: 'Hypermodern Flexibility',
      },
      {
        step: 2,
        notation: '2. c4',
        player: 'w',
        from: sqToCoords('c2'),
        to: sqToCoords('c4'),
        stepName: 'White Clamps Down on d5',
        actionExplanation: 'White expands on the queenside and prepares Nc3.',
        tacticalSquare: 'd5',
        strategicFocus: 'Space Expansion',
      },
      {
        step: 3,
        notation: '2... g6',
        player: 'b',
        from: sqToCoords('g7'),
        to: sqToCoords('g6'),
        stepName: 'The Dragon Hatch',
        actionExplanation: 'Clears a majestic diagonal for the dark-square Bishop to breathe fire from g7.',
        tacticalSquare: 'g7',
        strategicFocus: 'Fianchetto Prep',
      },
      {
        step: 4,
        notation: '3. Nc3',
        player: 'w',
        from: sqToCoords('b1'),
        to: sqToCoords('c3'),
        stepName: 'White Strengthens Center',
        actionExplanation: 'White prepares e4 to conquer the central board.',
        tacticalSquare: 'e4',
        strategicFocus: 'Center Domination',
      },
      {
        step: 5,
        notation: '3... Bg7',
        player: 'b',
        from: sqToCoords('f8'),
        to: sqToCoords('g7'),
        stepName: 'Dragon Awakens',
        actionExplanation: 'The bishop nests on g7, aiming like an arrow straight through the heart of White’s queenside!',
        tacticalSquare: 'g7',
        strategicFocus: 'Long Diagonal Mastery',
      },
      {
        step: 6,
        notation: '4. e4',
        player: 'w',
        from: sqToCoords('e2'),
        to: sqToCoords('e4'),
        stepName: 'White Big Center',
        actionExplanation: 'White holds all 3 central pawns: c4, d4, e4.',
        tacticalSquare: 'e4',
        strategicFocus: 'Full Center',
      },
      {
        step: 7,
        notation: '4... d6',
        player: 'b',
        from: sqToCoords('d7'),
        to: sqToCoords('d6'),
        stepName: 'King’s Fortress Lockdown',
        actionExplanation: 'Black stops White from pushing e5, ready to castle and strike back with ...e5!',
        tacticalSquare: 'e5',
        strategicFocus: 'Center Clamp',
      },
    ],
  },

  // --- Scholar's Mate Refutation ---
  {
    id: 'scholars_mate_refutation',
    name: 'Sanctum Refutation (Anti-Scholar Queen Trap)',
    category: 'Scholar Refutation',
    badge: 'Tactical Refutation',
    triggerCondition: 'scholar',
    difficulty: 'Beginner',
    summary: 'Punish opponents who rush their Queen out early with 2.Qh5! Block the threat, kick the Queen, and win tempo.',
    coreConcept: 'Defend the f7 square calmly, then chase White’s greedy Queen around the board while building massive development.',
    moves: [
      {
        step: 1,
        notation: '1. e4 e5',
        player: 'w',
        from: sqToCoords('e2'),
        to: sqToCoords('e4'),
        stepName: 'Center Opening',
        actionExplanation: 'Game begins with standard king pawns.',
        tacticalSquare: 'e4',
        strategicFocus: 'Center',
      },
      {
        step: 2,
        notation: '2. Qh5',
        player: 'w',
        from: sqToCoords('d1'),
        to: sqToCoords('h5'),
        stepName: 'Premature Queen Attack',
        actionExplanation: 'White greedily targets e5 and f7. A beginner trap that experienced players easily punish!',
        tacticalSquare: 'f7',
        strategicFocus: 'Early Queen Blunder',
      },
      {
        step: 3,
        notation: '2... Nc6',
        player: 'b',
        from: sqToCoords('b8'),
        to: sqToCoords('c6'),
        stepName: 'Calm Guardian Knight',
        actionExplanation: 'Rule #1: First protect the hanging e5 pawn! Black develops a knight while keeping f7 secure.',
        tacticalSquare: 'e5',
        strategicFocus: 'Solid Defense',
      },
      {
        step: 4,
        notation: '3. Bc4',
        player: 'w',
        from: sqToCoords('f1'),
        to: sqToCoords('c4'),
        stepName: 'White Sets The Mate Trap',
        actionExplanation: 'White threatens Qxf7# (Checkmate). Black must defend f7 right now!',
        tacticalSquare: 'f7',
        strategicFocus: 'Mate Threat',
      },
      {
        step: 5,
        notation: '3... g6',
        player: 'b',
        from: sqToCoords('g7'),
        to: sqToCoords('g6'),
        stepName: 'The Granite Shield',
        actionExplanation: 'The refutation! Completely slams the door shut in front of White’s queen while attacking her!',
        tacticalSquare: 'g6',
        strategicFocus: 'Refutation Strike',
      },
      {
        step: 6,
        notation: '4. Qf3',
        player: 'w',
        from: sqToCoords('h5'),
        to: sqToCoords('f3'),
        stepName: 'White’s Second Mate Attempt',
        actionExplanation: 'White retreats Queen to f3, renewing the Qxf7# checkmate threat.',
        tacticalSquare: 'f7',
        strategicFocus: 'Stubborn Threat',
      },
      {
        step: 7,
        notation: '4... Nf6',
        player: 'b',
        from: sqToCoords('g8'),
        to: sqToCoords('f6'),
        stepName: 'Checkmate Refuted Forever',
        actionExplanation: 'Develops knight to best square, blocks the queen permanently, and prepares ...Nd4 fork! Black is winning.',
        tacticalSquare: 'f6',
        strategicFocus: 'Total Domination',
      },
    ],
  },
];

export function getRecommendedStrategies(currentTurn: 'w' | 'b', moveHistory: Array<{ from: { r: number; c: number }; to: { r: number; c: number } }>): LearningStrategy[] {
  // If no moves played yet (move 0):
  if (moveHistory.length === 0) {
    return LEARNING_STRATEGIES.filter((s) => s.category === 'White Opening' || s.category === 'Novel Wizard Strategy');
  }

  const firstMove = moveHistory[0];
  const firstMoveSq = coordsToSq(firstMove.to.r, firstMove.to.c);

  // Check if White tried Scholar's mate (e4 followed by Qh5 or Bc4)
  const isScholar = moveHistory.some((m) => {
    const toSq = coordsToSq(m.to.r, m.to.c);
    return toSq === 'h5' || (toSq === 'c4' && moveHistory.length <= 4);
  });

  if (isScholar) {
    const scholarStrategy = LEARNING_STRATEGIES.find((s) => s.id === 'scholars_mate_refutation');
    const sicilian = LEARNING_STRATEGIES.find((s) => s.id === 'counter_sicilian');
    const french = LEARNING_STRATEGIES.find((s) => s.id === 'counter_french');
    return [scholarStrategy!, sicilian!, french!].filter(Boolean);
  }

  // If White opened 1. e4:
  if (firstMoveSq === 'e4') {
    return LEARNING_STRATEGIES.filter((s) => s.category === 'Black Counter (vs 1.e4)');
  }

  // If White opened 1. d4:
  if (firstMoveSq === 'd4') {
    return LEARNING_STRATEGIES.filter((s) => s.category === 'Black Counter (vs 1.d4)' || s.id === 'queens_gambit');
  }

  // Default: top 3 popular strategies
  return [
    LEARNING_STRATEGIES.find((s) => s.id === 'italian_game')!,
    LEARNING_STRATEGIES.find((s) => s.id === 'counter_sicilian')!,
    LEARNING_STRATEGIES.find((s) => s.id === 'sanctum_dragon_novelty')!,
  ].filter(Boolean);
}
