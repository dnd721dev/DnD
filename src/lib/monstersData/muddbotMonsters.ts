// AUTO-GENERATED from MuddBot's monster library — 140 monsters (Merrow already in monstrosities.ts). Do not edit by hand.
import type { Monster } from './types'

export const MUDDBOT_MONSTERS: Monster[] = [
  {
    "id": "goblin",
    "name": "Goblin",
    "cr": 0.25,
    "size": "Small",
    "type": "fey",
    "alignment": "chaotic neutral",
    "armorClass": 15,
    "hitPoints": 10,
    "hitDice": "3d6",
    "speed": "30 ft.",
    "abilities": {
      "str": 8,
      "dex": 15,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 8
    },
    "skills": [
      "Stealth +6"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "actions": [
      {
        "name": "Scimitar",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.",
        "attackBonus": 4,
        "damage": "1d6+2 slashing"
      },
      {
        "name": "Shortbow",
        "type": "attack",
        "description": "Ranged Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.",
        "attackBonus": 4,
        "damage": "1d6+2 piercing"
      },
      {
        "name": "Nimble Escape",
        "type": "ability",
        "description": "The goblin takes the Disengage or Hide action."
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "kobold",
    "name": "Kobold Warrior",
    "cr": 0.125,
    "size": "Small",
    "type": "dragon",
    "alignment": "neutral",
    "armorClass": 14,
    "hitPoints": 7,
    "hitDice": "3d6-3",
    "speed": "30 ft.",
    "abilities": {
      "str": 7,
      "dex": 15,
      "con": 9,
      "int": 8,
      "wis": 7,
      "cha": 8
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 8"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The kobold has Advantage on an attack roll against a creature if at least one of the kobold's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      },
      {
        "name": "Sunlight Sensitivity",
        "type": "trait",
        "description": "While in sunlight, the kobold has Disadvantage on ability checks and attack rolls."
      }
    ],
    "actions": [
      {
        "name": "Dagger",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +4, reach 5 ft. or range 20/60 ft. Hit: 4 (1d4 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d4+2 piercing"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "bandit",
    "name": "Bandit",
    "cr": 0.125,
    "size": "Medium",
    "type": "humanoid",
    "alignment": "neutral",
    "armorClass": 12,
    "hitPoints": 11,
    "hitDice": "2d8+2",
    "speed": "30 ft.",
    "abilities": {
      "str": 11,
      "dex": 12,
      "con": 12,
      "int": 10,
      "wis": 10,
      "cha": 10
    },
    "senses": [
      "Passive Perception 10"
    ],
    "languages": [
      "Common"
    ],
    "actions": [
      {
        "name": "Scimitar",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 4 (1d6 + 1) Slashing damage.",
        "attackBonus": 3,
        "damage": "1d6+1 slashing"
      },
      {
        "name": "Light Crossbow",
        "type": "attack",
        "description": "Ranged Attack Roll: +3, range 80/320 ft. Hit: 5 (1d8 + 1) Piercing damage.",
        "attackBonus": 3,
        "damage": "1d8+1 piercing"
      }
    ],
    "tags": [
      "humanoid"
    ]
  },
  {
    "id": "giant-frog",
    "name": "Giant Frog",
    "cr": 0.25,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 18,
    "hitDice": "4d8",
    "speed": "30 ft., swim 30 ft.",
    "abilities": {
      "str": 12,
      "dex": 13,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "skills": [
      "Perception +2",
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The frog can breathe air and water."
      },
      {
        "name": "Standing Leap",
        "type": "trait",
        "description": "The frog's Long Jump is up to 20 feet and its High Jump is up to 10 feet with or without a running start."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 11).",
        "attackBonus": 3,
        "damage": "1d6+2 piercing",
        "saveDc": 11
      },
      {
        "name": "Swallow",
        "type": "attack",
        "description": "The frog swallows a Small or smaller target it is grappling. While swallowed, the target isn't Grappled but has the Blinded and Restrained conditions, and it has Total Cover against attacks and other effects outside the frog. While swallowing the target, the frog can't use Bite, and if the frog dies, the swallowed target is no longer Restrained and can escape from the corpse using 5 feet of movement, exiting with the Prone condition. At the end of the frog's next turn, the swallowed target takes 5 (2d4) Acid damage. If that damage doesn't kill it, the frog disgorges it, causing it to exit Prone.",
        "damage": "2d4 acid",
        "saveDc": 11
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "stirge",
    "name": "Stirge",
    "cr": 0.125,
    "size": "Tiny",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 5,
    "hitDice": "2d4",
    "speed": "10 ft., fly 40 ft.",
    "abilities": {
      "str": 4,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 8,
      "cha": 6
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "actions": [
      {
        "name": "Proboscis",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Piercing damage, and the stirge attaches to the target. While attached, the stirge can't make Proboscis attacks, and the target takes 5 (2d4) Necrotic damage at the start of each of the stirge's turns. The stirge can detach itself by spending 5 feet of its movement. The target or a creature within 5 feet of it can detach the stirge as an action.",
        "attackBonus": 5,
        "damage": "1d6+3 piercing"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "twig-blight",
    "name": "Twig Blight",
    "cr": 0.125,
    "size": "Small",
    "type": "plant",
    "alignment": "neutral evil",
    "armorClass": 13,
    "hitPoints": 4,
    "hitDice": "1d6+1",
    "speed": "20 ft.",
    "abilities": {
      "str": 6,
      "dex": 13,
      "con": 12,
      "int": 4,
      "wis": 8,
      "cha": 3
    },
    "senses": [
      "Blindsight 60 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "False Appearance",
        "type": "trait",
        "description": "While the twig blight remains motionless, it is indistinguishable from a dead shrub."
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "blinded, deafened"
      }
    ],
    "actions": [
      {
        "name": "Claws",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Piercing damage.",
        "attackBonus": 3,
        "damage": "1d4+1 piercing"
      }
    ],
    "tags": [
      "plant"
    ]
  },
  {
    "id": "steam-mephit",
    "name": "Steam Mephit",
    "cr": 0.25,
    "size": "Small",
    "type": "elemental",
    "alignment": "neutral evil",
    "armorClass": 10,
    "hitPoints": 17,
    "hitDice": "5d6",
    "speed": "30 ft., fly 30 ft.",
    "abilities": {
      "str": 5,
      "dex": 11,
      "con": 10,
      "int": 11,
      "wis": 10,
      "cha": 12
    },
    "skills": [
      "Stealth +2"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Primordial"
    ],
    "traits": [
      {
        "name": "Blurred Form",
        "type": "trait",
        "description": "Attack rolls against the mephit are made with Disadvantage unless the mephit has the Incapacitated condition."
      },
      {
        "name": "Death Burst",
        "type": "trait",
        "description": "The mephit explodes when it dies. Dexterity Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Fire damage. Success: Half damage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 2 (1d4) Slashing damage plus 2 (1d4) Fire damage.",
        "attackBonus": 2,
        "damage": "1d4 slashing"
      },
      {
        "name": "Steam Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 10, each creature in a 15-foot Cone. Failure: 5 (2d4) Fire damage, and the target’s Speed decreases by 10 feet until the end of the mephit’s next turn. Success: Half damage only. Failure or Success: Being underwater doesn’t grant Resistance to this Fire damage.",
        "damage": "2d4 fire",
        "saveDc": 10,
        "saveType": "con"
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "ice-mephit",
    "name": "Ice Mephit",
    "cr": 0.5,
    "size": "Small",
    "type": "elemental",
    "alignment": "neutral evil",
    "armorClass": 11,
    "hitPoints": 21,
    "hitDice": "6d6",
    "speed": "30 ft., fly 30 ft.",
    "abilities": {
      "str": 7,
      "dex": 13,
      "con": 10,
      "int": 9,
      "wis": 11,
      "cha": 12
    },
    "skills": [
      "Perception +2",
      "Stealth +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "languages": [
      "Primordial"
    ],
    "traits": [
      {
        "name": "Death Burst",
        "type": "trait",
        "description": "The mephit explodes when it dies. Constitution Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Cold damage. Success: Half damage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold, poison"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Slashing damage plus 2 (1d4) Cold damage.",
        "attackBonus": 3,
        "damage": "1d4+1 slashing"
      },
      {
        "name": "Fog Cloud",
        "type": "ability",
        "description": "The mephit casts Fog Cloud, requiring no spell components and using Charisma as the spellcasting ability."
      },
      {
        "name": "Frost Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 10, each creature in a 15-foot Cone. Failure: 7 (3d4) Cold damage. Success: Half damage.",
        "damage": "3d4 cold",
        "saveDc": 10,
        "saveType": "con"
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "grimlock",
    "name": "Grimlock",
    "cr": 0.25,
    "size": "Medium",
    "type": "aberration",
    "alignment": "neutral evil",
    "armorClass": 11,
    "hitPoints": 11,
    "hitDice": "2d8+2",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 12,
      "int": 9,
      "wis": 8,
      "cha": 6
    },
    "skills": [
      "Athletics +5",
      "Perception +3",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Passive Perception 13"
    ],
    "actions": [
      {
        "name": "Bone Cudgel",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage plus 2 (1d4) Psychic damage.",
        "attackBonus": 5,
        "damage": "1d6+3 bludgeoning"
      }
    ],
    "tags": [
      "aberration"
    ]
  },
  {
    "id": "needle-blight",
    "name": "Needle Blight",
    "cr": 0.25,
    "size": "Medium",
    "type": "plant",
    "alignment": "neutral evil",
    "armorClass": 12,
    "hitPoints": 11,
    "hitDice": "2d8+2",
    "speed": "30 ft.",
    "abilities": {
      "str": 12,
      "dex": 12,
      "con": 13,
      "int": 4,
      "wis": 8,
      "cha": 3
    },
    "senses": [
      "Blindsight 60 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "False Appearance",
        "type": "trait",
        "description": "While the needle blight remains motionless, it is indistinguishable from a dead shrub."
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "blinded, deafened"
      }
    ],
    "actions": [
      {
        "name": "Claws",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 5 (2d4) Piercing damage.",
        "attackBonus": 3,
        "damage": "2d4 piercing"
      },
      {
        "name": "Needles",
        "type": "attack",
        "description": "Ranged Attack Roll: +3, range 30/60 ft. Hit: 8 (2d6) Piercing damage.",
        "attackBonus": 3,
        "damage": "2d6 piercing"
      }
    ],
    "tags": [
      "plant"
    ]
  },
  {
    "id": "orc",
    "name": "Orc",
    "cr": 0.5,
    "size": "Medium",
    "type": "humanoid",
    "alignment": "chaotic evil",
    "armorClass": 13,
    "hitPoints": 15,
    "hitDice": "2d8+6",
    "speed": "30 ft.",
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 16,
      "int": 7,
      "wis": 11,
      "cha": 10
    },
    "skills": [
      "Intimidation +2"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common",
      "Orc"
    ],
    "traits": [
      {
        "name": "Adrenaline Rush",
        "type": "trait",
        "description": "The orc can take the Dash action as a Bonus Action. When it does so, it gains Temporary Hit Points equal to its Proficiency Bonus. It can use this trait a number of times equal to its Proficiency Bonus, regaining all uses on a Short or Long Rest."
      },
      {
        "name": "Relentless Endurance",
        "type": "trait",
        "description": "When the orc is reduced to 0 Hit Points but not killed outright, it can drop to 1 Hit Point instead. Once it uses this trait, it can't do so again until it finishes a Long Rest."
      }
    ],
    "actions": [
      {
        "name": "Greataxe",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 9 (1d12 + 3) Slashing damage.",
        "attackBonus": 5,
        "damage": "1d12+3 slashing"
      },
      {
        "name": "Javelin",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +5, reach 5 ft. or range 30/120 ft. Hit: 6 (1d6 + 3) Piercing damage.",
        "attackBonus": 5,
        "damage": "1d6+3 piercing"
      }
    ],
    "tags": [
      "humanoid"
    ]
  },
  {
    "id": "hobgoblin",
    "name": "Hobgoblin Warrior",
    "cr": 0.5,
    "size": "Medium",
    "type": "fey",
    "alignment": "lawful evil",
    "armorClass": 18,
    "hitPoints": 11,
    "hitDice": "2d8+2",
    "speed": "30 ft.",
    "abilities": {
      "str": 13,
      "dex": 12,
      "con": 12,
      "int": 10,
      "wis": 10,
      "cha": 9
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The hobgoblin has Advantage on an attack roll against a creature if at least one of the hobgoblin's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Longsword",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 5 (1d8 + 1) Slashing damage.",
        "attackBonus": 3,
        "damage": "1d8+1 slashing"
      },
      {
        "name": "Longbow",
        "type": "attack",
        "description": "Ranged Attack Roll: +3, range 150/600 ft. Hit: 5 (1d8 + 1) Piercing damage plus 7 (3d4) Poison damage.",
        "attackBonus": 3,
        "damage": "1d8+1 piercing"
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "bugbear",
    "name": "Bugbear Warrior",
    "cr": 1,
    "size": "Medium",
    "type": "fey",
    "alignment": "chaotic evil",
    "armorClass": 14,
    "hitPoints": 33,
    "hitDice": "6d8+6",
    "speed": "30 ft.",
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 13,
      "int": 8,
      "wis": 11,
      "cha": 9
    },
    "skills": [
      "Stealth +6",
      "Survival +2"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "traits": [
      {
        "name": "Abduct",
        "type": "trait",
        "description": "The bugbear needn't spend extra movement to move a creature it is grappling."
      }
    ],
    "actions": [
      {
        "name": "Grab",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 10 ft. Hit: 9 (2d6 + 2) Bludgeoning damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 12).",
        "attackBonus": 4,
        "damage": "2d6+2 bludgeoning"
      },
      {
        "name": "Light Hammer",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +4 (with Advantage if the target is Grappled by the bugbear), reach 10 ft. or range 20/60 ft. Hit: 9 (3d4 + 2) Bludgeoning damage.",
        "attackBonus": 4,
        "damage": "3d4+2 bludgeoning"
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "gnoll",
    "name": "Gnoll Warrior",
    "cr": 0.5,
    "size": "Medium",
    "type": "fiend",
    "alignment": "chaotic evil",
    "armorClass": 15,
    "hitPoints": 27,
    "hitDice": "6d8",
    "speed": "30 ft.",
    "abilities": {
      "str": 14,
      "dex": 12,
      "con": 11,
      "int": 6,
      "wis": 10,
      "cha": 7
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Abyssal"
    ],
    "actions": [
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d6+2 piercing"
      },
      {
        "name": "Bone Bow",
        "type": "attack",
        "description": "Ranged Attack Roll: +3, range 150/600 ft. Hit: 6 (1d10 + 1) Piercing damage.",
        "attackBonus": 3,
        "damage": "1d10+1 piercing"
      },
      {
        "name": "Rampage",
        "type": "ability",
        "description": "Immediately after dealing damage to a creature that is already Bloodied, the gnoll moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "fiend"
    ]
  },
  {
    "id": "mimic",
    "name": "Mimic",
    "cr": 2,
    "size": "Medium",
    "type": "monstrosity",
    "alignment": "neutral",
    "armorClass": 12,
    "hitPoints": 58,
    "hitDice": "9d8+18",
    "speed": "20 ft.",
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 15,
      "int": 5,
      "wis": 13,
      "cha": 8
    },
    "skills": [
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Adhesive (Object Form Only)",
        "type": "trait",
        "description": "The mimic adheres to anything that touches it. A Huge or smaller creature adhered to the mimic has the Grappled condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "prone"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the mimic), reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage—or 12 (2d8 + 3) Piercing damage if the target is Grappled by the mimic—plus 4 (1d8) Acid damage.",
        "attackBonus": 5,
        "damage": "1d8+3 piercing"
      },
      {
        "name": "Pseudopod",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Bludgeoning damage plus 4 (1d8) Acid damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage.",
        "attackBonus": 5,
        "damage": "1d8+3 bludgeoning"
      },
      {
        "name": "Shape-Shift",
        "type": "ability",
        "description": "The mimic shape-shifts to resemble a Medium or Small object while retaining its game statistics, or it returns to its true blob form. Any equipment it is wearing or carrying isn't transformed."
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "sahuagin",
    "name": "Sahuagin Warrior",
    "cr": 0.5,
    "size": "Medium",
    "type": "fiend",
    "alignment": "lawful evil",
    "armorClass": 12,
    "hitPoints": 22,
    "hitDice": "4d8+4",
    "speed": "30 ft., swim 40 ft.",
    "abilities": {
      "str": 13,
      "dex": 11,
      "con": 12,
      "int": 12,
      "wis": 13,
      "cha": 9
    },
    "skills": [
      "Perception +5"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 15"
    ],
    "traits": [
      {
        "name": "Blood Frenzy",
        "type": "trait",
        "description": "The sahuagin has Advantage on attack rolls against any creature that doesn't have all its Hit Points."
      },
      {
        "name": "Limited Amphibiousness",
        "type": "trait",
        "description": "The sahuagin can breathe air and water, but it must be submerged at least once every 4 hours to avoid suffocating outside water."
      },
      {
        "name": "Shark Telepathy",
        "type": "trait",
        "description": "The sahuagin can magically control sharks within 120 feet of itself, using a special telepathy."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "acid, cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The sahuagin makes two Claw attacks."
      },
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 4 (1d6 + 1) Slashing damage.",
        "attackBonus": 3,
        "damage": "1d6+1 slashing"
      },
      {
        "name": "Aquatic Charge",
        "type": "ability",
        "description": "The sahuagin swims up to its Swim Speed straight toward an enemy it can see."
      }
    ],
    "tags": [
      "fiend"
    ]
  },
  {
    "id": "bog-wisp",
    "name": "Bog Wisp",
    "cr": 2,
    "size": "Tiny",
    "type": "undead",
    "alignment": "chaotic evil",
    "armorClass": 19,
    "hitPoints": 22,
    "hitDice": "9d4",
    "speed": "0 ft., fly 50 ft.",
    "abilities": {
      "str": 1,
      "dex": 28,
      "con": 10,
      "int": 13,
      "wis": 14,
      "cha": 11
    },
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Consume Life",
        "type": "trait",
        "description": "As a Bonus Action, the bog wisp targets a creature it can see within 5 ft that has 0 Hit Points and is alive. The target must succeed on a DC 10 Constitution saving throw or die. If it dies, the bog wisp regains 10 (3d6) Hit Points."
      },
      {
        "name": "Ephemeral",
        "type": "trait",
        "description": "The bog wisp can't wear or carry anything."
      },
      {
        "name": "Variable Illumination",
        "type": "trait",
        "description": "The bog wisp sheds Dim Light in a 5- to 20-foot radius and can change the radius as a Bonus Action."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "acid, cold, fire, necrotic, thunder, bludgeoning, piercing, slashing"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, grappled, paralyzed, poisoned, prone, restrained, unconscious"
      }
    ],
    "actions": [
      {
        "name": "Drowning Shock",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 9 (2d8) Lightning damage.",
        "attackBonus": 4,
        "damage": "2d8 lightning"
      }
    ],
    "tags": [
      "undead"
    ]
  },
  {
    "id": "doppelganger",
    "name": "Doppelganger",
    "cr": 3,
    "size": "Medium",
    "type": "monstrosity",
    "alignment": "neutral",
    "armorClass": 14,
    "hitPoints": 52,
    "hitDice": "8d8+16",
    "speed": "30 ft.",
    "abilities": {
      "str": 11,
      "dex": 18,
      "con": 14,
      "int": 11,
      "wis": 12,
      "cha": 14
    },
    "skills": [
      "Deception +6",
      "Insight +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 11"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The doppelganger makes two Slam attacks and uses Unsettling Visage if available."
      },
      {
        "name": "Slam",
        "type": "attack",
        "description": "Melee Attack Roll: +6 (with Advantage during the first round of each combat), reach 5 ft. Hit: 11 (2d6 + 4) Bludgeoning damage.",
        "attackBonus": 6,
        "damage": "2d6+4 bludgeoning"
      },
      {
        "name": "Read Thoughts",
        "type": "ability",
        "description": "The doppelganger casts Detect Thoughts, requiring no spell components and using Charisma as the spellcasting ability (spell save DC 12).",
        "saveDc": 12
      },
      {
        "name": "Unsettling Visage",
        "type": "ability",
        "description": "Wisdom Saving Throw: DC 12, each creature in a 15-foot Emanation originating from the doppelganger that can see the doppelganger. Failure: The target has the Frightened condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 12,
        "saveType": "wis"
      },
      {
        "name": "Shape-Shift",
        "type": "ability",
        "description": "The doppelganger shape-shifts into a Medium or Small Humanoid, or it returns to its true form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "bearded-devil",
    "name": "Bearded Devil",
    "cr": 3,
    "size": "Medium",
    "type": "fiend",
    "alignment": "lawful evil",
    "armorClass": 13,
    "hitPoints": 58,
    "hitDice": "9d8+18",
    "speed": "30 ft.",
    "abilities": {
      "str": 16,
      "dex": 15,
      "con": 15,
      "int": 9,
      "wis": 11,
      "cha": 14
    },
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Infernal"
    ],
    "traits": [
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "The devil has Advantage on saving throws against spells and other magical effects."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "cold"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "frightened, poisoned"
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "Advantage on saving throws against spells and other magical effects."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The devil makes one Beard attack and one Infernal Glaive attack."
      },
      {
        "name": "Beard",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage, and the target has the Poisoned condition until the start of the devil's next turn. Until this poison ends, the target can't regain Hit Points.",
        "attackBonus": 5,
        "damage": "1d8+3 piercing"
      },
      {
        "name": "Infernal Glaive",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 10 ft. Hit: 8 (1d10 + 3) Slashing damage. If the target is a creature and doesn't already have an infernal wound, it is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target receives an infernal wound. While wounded, the target loses 5 (1d10) Hit Points at the start of each of its turns. The wound closes after 1 minute, after a spell restores Hit Points to the target, or after the target or a creature within 5 feet of it takes an action to stanch the wound, doing so by succeeding on a DC 12 Wisdom (Medicine) check.",
        "attackBonus": 5,
        "damage": "1d10+3 slashing",
        "saveDc": 12,
        "saveType": "con"
      }
    ],
    "tags": [
      "fiend"
    ]
  },
  {
    "id": "hook-horror",
    "name": "Hook Horror",
    "cr": 3,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "neutral",
    "armorClass": 15,
    "hitPoints": 75,
    "hitDice": "10d10+20",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 18,
      "dex": 10,
      "con": 15,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 10 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Echolocation",
        "type": "trait",
        "description": "The hook horror can't use its Blindsight while deafened."
      },
      {
        "name": "Keen Hearing",
        "type": "trait",
        "description": "The hook horror has advantage on Wisdom (Perception) checks that rely on hearing."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The hook horror makes two Hook attacks."
      },
      {
        "name": "Hook",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 11 (2d6 + 4) Piercing damage.",
        "attackBonus": 5,
        "damage": "2d6+4 piercing"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "werewolf",
    "name": "Werewolf",
    "cr": 3,
    "size": "Medium",
    "type": "monstrosity",
    "alignment": "chaotic evil",
    "armorClass": 15,
    "hitPoints": 71,
    "hitDice": "11d8+22",
    "speed": "30 ft.",
    "abilities": {
      "str": 16,
      "dex": 14,
      "con": 14,
      "int": 10,
      "wis": 11,
      "cha": 10
    },
    "skills": [
      "Perception +4",
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The werewolf has Advantage on an attack roll against a creature if at least one of the werewolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The werewolf makes two attacks, using Scratch or Longbow in any combination. It can replace one attack with a Bite attack."
      },
      {
        "name": "Bite (Wolf or Hybrid Form Only)",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Werewolf under the GM's control and has 10 Hit Points. Success: The target is immune to this werewolf's curse for 24 hours.",
        "attackBonus": 5,
        "damage": "2d8+3 piercing",
        "saveDc": 12,
        "saveType": "con"
      },
      {
        "name": "Scratch",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 10 (2d6 + 3) Slashing damage.",
        "attackBonus": 5,
        "damage": "2d6+3 slashing"
      },
      {
        "name": "Longbow (Humanoid or Hybrid Form Only)",
        "type": "attack",
        "description": "Ranged Attack Roll: +4, range 150/600 ft. Hit: 11 (2d8 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "2d8+2 piercing"
      },
      {
        "name": "Shape-Shift",
        "type": "ability",
        "description": "The werewolf shape-shifts into a Large wolf-humanoid hybrid or a Medium wolf, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "bugbear-chief",
    "name": "Bugbear Stalker",
    "cr": 3,
    "size": "Medium",
    "type": "fey",
    "alignment": "chaotic evil",
    "armorClass": 15,
    "hitPoints": 65,
    "hitDice": "10d8 + 20",
    "speed": "30 ft.",
    "abilities": {
      "str": 17,
      "dex": 14,
      "con": 14,
      "int": 11,
      "wis": 12,
      "cha": 11
    },
    "skills": [
      "Stealth +6",
      "Survival +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 11"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "traits": [
      {
        "name": "Abduct",
        "type": "trait",
        "description": "The bugbear needn't spend extra movement to move a creature it is grappling."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The bugbear makes two Javelin or Morningstar attacks."
      },
      {
        "name": "Javelin",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +5, reach 10 ft. or range 30/120 ft. Hit: 13 (3d6 + 3) Piercing damage.",
        "attackBonus": 5,
        "damage": "3d6+3 piercing"
      },
      {
        "name": "Morningstar",
        "type": "attack",
        "description": "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the bugbear), reach 10 ft. Hit: 12 (2d8 + 3) Piercing damage.",
        "attackBonus": 5,
        "damage": "2d8+3 piercing"
      },
      {
        "name": "Quick Grapple",
        "type": "ability",
        "description": "Dexterity Saving Throw: DC 13, one Medium or smaller creature the bugbear can see within 10 feet. Failure: The target has the Grappled condition (escape DC 13).",
        "saveDc": 13,
        "saveType": "dex"
      }
    ],
    "tags": [
      "fey",
      "boss"
    ]
  },
  {
    "id": "minotaur",
    "name": "Minotaur of Baphomet",
    "cr": 3,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "chaotic evil",
    "armorClass": 14,
    "hitPoints": 85,
    "hitDice": "10d10+30",
    "speed": "40 ft.",
    "abilities": {
      "str": 18,
      "dex": 11,
      "con": 16,
      "int": 6,
      "wis": 16,
      "cha": 9
    },
    "skills": [
      "Perception +7",
      "Survival +7"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 17"
    ],
    "languages": [
      "Abyssal"
    ],
    "actions": [
      {
        "name": "Abyssal Glaive",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 10 ft. Hit: 10 (1d12 + 4) Slashing damage plus 10 (3d6) Necrotic damage.",
        "attackBonus": 6,
        "damage": "1d12+4 slashing"
      },
      {
        "name": "Gore",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 18 (4d6 + 4) Piercing damage. If the target is a Large or smaller creature and the minotaur moved 10+ feet straight toward it immediately before the hit, the target takes an extra 10 (3d6) Piercing damage and has the Prone condition.",
        "attackBonus": 6,
        "damage": "4d6+4 piercing"
      }
    ],
    "tags": [
      "monstrosity",
      "boss"
    ]
  },
  {
    "id": "orc-warchief",
    "name": "Orc Warchief",
    "cr": 0.5,
    "size": "Medium",
    "type": "humanoid",
    "alignment": "chaotic evil",
    "armorClass": 13,
    "hitPoints": 15,
    "hitDice": "2d8+6",
    "speed": "30 ft.",
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 16,
      "int": 7,
      "wis": 11,
      "cha": 10
    },
    "skills": [
      "Intimidation +2"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common",
      "Orc"
    ],
    "traits": [
      {
        "name": "Adrenaline Rush",
        "type": "trait",
        "description": "The orc can take the Dash action as a Bonus Action. When it does so, it gains a number of Temporary Hit Points equal to its Proficiency Bonus. It can use this trait a number of times equal to its Proficiency Bonus, and it regains all expended uses when it finishes a Short or Long Rest."
      },
      {
        "name": "Relentless Endurance",
        "type": "trait",
        "description": "When the orc is reduced to 0 Hit Points but not killed outright, it can drop to 1 Hit Point instead. Once it uses this trait, it can't do so again until it finishes a Long Rest."
      }
    ],
    "actions": [
      {
        "name": "Greataxe",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 9 (1d12 + 3) Slashing damage.",
        "attackBonus": 5,
        "damage": "1d12+3 slashing"
      },
      {
        "name": "Adrenaline Rush (Dash)",
        "type": "ability",
        "description": "The orc takes the Dash action and gains Temporary Hit Points equal to its Proficiency Bonus (2). Usable a number of times equal to its Proficiency Bonus per Short or Long Rest."
      }
    ],
    "tags": [
      "humanoid",
      "boss"
    ]
  },
  {
    "id": "young-dragon",
    "name": "Young White Dragon",
    "cr": 6,
    "size": "Large",
    "type": "dragon",
    "alignment": "chaotic evil",
    "armorClass": 17,
    "hitPoints": 123,
    "hitDice": "13d10+52",
    "speed": "40 ft., burrow 20 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 18,
      "dex": 10,
      "con": 18,
      "int": 6,
      "wis": 11,
      "cha": 12
    },
    "skills": [
      "Perception +6",
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 16"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Ice Walk",
        "type": "trait",
        "description": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 9 (2d4 + 4) Slashing damage plus 2 (1d4) Cold damage.",
        "attackBonus": 7,
        "damage": "2d4+4 slashing"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 15, each creature in a 30-foot Cone. Failure: 40 (9d8) Cold damage. Success: Half damage.",
        "damage": "9d8 cold",
        "saveDc": 15,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon",
      "boss"
    ]
  },
  {
    "id": "hobgoblin-warlord",
    "name": "Hobgoblin Captain",
    "cr": 3,
    "size": "Medium",
    "type": "fey",
    "alignment": "lawful evil",
    "armorClass": 17,
    "hitPoints": 58,
    "hitDice": "9d8+18",
    "speed": "30 ft.",
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 14,
      "int": 12,
      "wis": 10,
      "cha": 13
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "traits": [
      {
        "name": "Aura of Authority",
        "type": "trait",
        "description": "While in a 10-foot Emanation originating from the hobgoblin, the hobgoblin and its allies have Advantage on attack rolls and saving throws, provided the hobgoblin doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The hobgoblin makes two attacks, using Greatsword or Longbow in any combination."
      },
      {
        "name": "Greatsword",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 9 (2d6 + 2) Slashing damage plus 3 (1d6) Poison damage.",
        "attackBonus": 4,
        "damage": "2d6+2 slashing"
      },
      {
        "name": "Longbow",
        "type": "attack",
        "description": "Ranged Attack Roll: +4, range 150/600 ft. Hit: 6 (1d8 + 2) Piercing damage plus 5 (2d4) Poison damage.",
        "attackBonus": 4,
        "damage": "1d8+2 piercing"
      }
    ],
    "tags": [
      "fey",
      "boss"
    ]
  },
  {
    "id": "gorgon",
    "name": "Gorgon",
    "cr": 5,
    "size": "Large",
    "type": "construct",
    "alignment": "unaligned",
    "armorClass": 19,
    "hitPoints": 114,
    "hitDice": "12d10+48",
    "speed": "40 ft.",
    "abilities": {
      "str": 20,
      "dex": 11,
      "con": 18,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +7"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 17"
    ],
    "traits": [
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, petrified"
      }
    ],
    "actions": [
      {
        "name": "Gore",
        "type": "attack",
        "description": "Melee Attack Roll: +8, reach 5 ft. Hit: 18 (2d12 + 5) Piercing damage. If the target is a Large or smaller creature and the gorgon moved 20+ feet straight toward it immediately before the hit, the target has the Prone condition.",
        "attackBonus": 8,
        "damage": "2d12+5 piercing"
      },
      {
        "name": "Petrifying Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 15, each creature in a 30-foot Cone. First Failure: The target has the Restrained condition and repeats the save at the end of its next turn if it is still Restrained, ending the effect on itself on a success. Second Failure: The target has the Petrified condition instead of the Restrained condition.",
        "saveDc": 15,
        "saveType": "con"
      },
      {
        "name": "Trample",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 16, one creature within 5 feet that has the Prone condition. Failure: 16 (2d10 + 5) Bludgeoning damage. Success: Half damage.",
        "damage": "2d10+5 bludgeoning",
        "saveDc": 16,
        "saveType": "dex"
      }
    ],
    "tags": [
      "construct",
      "boss"
    ]
  },
  {
    "id": "young-blue-dragon",
    "name": "Young Blue Dragon",
    "cr": 9,
    "size": "Large",
    "type": "dragon",
    "alignment": "lawful evil",
    "armorClass": 18,
    "hitPoints": 152,
    "hitDice": "16d10+64",
    "speed": "40 ft., burrow 20 ft., fly 80 ft.",
    "abilities": {
      "str": 21,
      "dex": 10,
      "con": 19,
      "int": 14,
      "wis": 13,
      "cha": 17
    },
    "skills": [
      "Perception +9",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 19"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +9, reach 10 ft. Hit: 12 (2d6 + 5) Slashing damage plus 5 (1d10) Lightning damage.",
        "attackBonus": 9,
        "damage": "2d6+5 slashing"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 16, each creature in a 60-foot-long, 5-foot-wide Line. Failure: 55 (10d10) Lightning damage. Success: Half damage.",
        "damage": "10d10 lightning",
        "saveDc": 16,
        "saveType": "dex"
      }
    ],
    "tags": [
      "dragon",
      "boss"
    ]
  },
  {
    "id": "horned-devil",
    "name": "Horned Devil",
    "cr": 11,
    "size": "Large",
    "type": "fiend",
    "alignment": "lawful evil",
    "armorClass": 18,
    "hitPoints": 199,
    "hitDice": "19d10+95",
    "speed": "30 ft., fly 60 ft.",
    "abilities": {
      "str": 22,
      "dex": 17,
      "con": 21,
      "int": 12,
      "wis": 16,
      "cha": 18
    },
    "senses": [
      "Darkvision 150 ft.",
      "Passive Perception 13"
    ],
    "languages": [
      "Infernal"
    ],
    "traits": [
      {
        "name": "Diabolical Restoration",
        "type": "trait",
        "description": "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "The devil has Advantage on saving throws against spells and other magical effects."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "cold"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "poisoned"
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "Advantage on saving throws against spells and other magical effects."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The devil makes three attacks, using Searing Fork or Hurl Flame in any combination. It can replace one attack with a use of Infernal Tail."
      },
      {
        "name": "Searing Fork",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 10 ft. Hit: 15 (2d8 + 6) Piercing damage plus 9 (2d8) Fire damage.",
        "attackBonus": 10,
        "damage": "2d8+6 piercing"
      },
      {
        "name": "Hurl Flame",
        "type": "attack",
        "description": "Ranged Attack Roll: +8, range 150 ft. Hit: 26 (5d8 + 4) Fire damage. If the target is a flammable object that isn't being worn or carried, it starts burning.",
        "attackBonus": 8,
        "damage": "5d8+4 fire"
      },
      {
        "name": "Infernal Tail",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 17, one creature the devil can see within 10 feet. Failure: 10 (1d8 + 6) Necrotic damage, and the target receives an infernal wound if it doesn't have one. While wounded, the target loses 10 (3d6) Hit Points at the start of each of its turns. The wound closes after 1 minute, after a spell restores Hit Points to the target, or after the target or a creature within 5 feet of it takes an action to stanch the wound, doing so by succeeding on a DC 17 Wisdom (Medicine) check.",
        "damage": "1d8+6 necrotic",
        "saveDc": 17,
        "saveType": "dex"
      }
    ],
    "tags": [
      "fiend",
      "boss"
    ]
  },
  {
    "id": "will-o-wisp",
    "name": "Will-o'-Wisp",
    "cr": 2,
    "size": "Tiny",
    "type": "undead",
    "alignment": "chaotic evil",
    "armorClass": 19,
    "hitPoints": 22,
    "hitDice": "9d4",
    "speed": "0 ft., fly 50 ft.",
    "abilities": {
      "str": 1,
      "dex": 28,
      "con": 10,
      "int": 13,
      "wis": 14,
      "cha": 11
    },
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Consume Life",
        "type": "trait",
        "description": "As a bonus action, the will-o'-wisp can target one creature it can see within 5 ft. of it that has 0 hit points and is still alive. The target must succeed on a DC 10 Constitution saving throw against this magic or die. If the target dies, the will-o'-wisp regains 10 (3d6) hit points."
      },
      {
        "name": "Ephemeral",
        "type": "trait",
        "description": "The will-o'-wisp can't wear or carry anything."
      },
      {
        "name": "Incorporeal Movement",
        "type": "trait",
        "description": "The will-o'-wisp can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object."
      },
      {
        "name": "Variable Illumination",
        "type": "trait",
        "description": "The will-o'-wisp sheds bright light in a 5- to 20-ft. radius and dim light for an additional number of ft. equal to the chosen radius. The will-o'-wisp can alter the radius as a bonus action."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "acid, cold, fire, necrotic, thunder, bludgeoning, piercing, slashing"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, grappled, paralyzed, poisoned, prone, restrained, unconscious"
      }
    ],
    "actions": [
      {
        "name": "Shock",
        "type": "attack",
        "description": "Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d8) lightning damage.",
        "attackBonus": 4,
        "damage": "2d8 lightning"
      },
      {
        "name": "Invisibility",
        "type": "ability",
        "description": "The will-o'-wisp and its light magically become invisible until it attacks or uses its Consume Life, or until its concentration ends (as if concentrating on a spell)."
      }
    ],
    "tags": [
      "undead"
    ]
  },
  {
    "id": "adult-blue-dragon",
    "name": "Adult Blue Dragon",
    "cr": 16,
    "size": "Huge",
    "type": "dragon",
    "alignment": "lawful evil",
    "armorClass": 19,
    "hitPoints": 212,
    "hitDice": "17d12 + 102",
    "speed": "40 ft., burrow 30 ft., fly 80 ft.",
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 23,
      "int": 16,
      "wis": 15,
      "cha": 20
    },
    "skills": [
      "Perception +12",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 22"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +12, reach 10 ft. Hit: 16 (2d8 + 7) Slashing damage plus 5 (1d10) Lightning damage.",
        "attackBonus": 12,
        "damage": "2d8+7 slashing+ 1d10 lightning"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Lightning Breath (Recharge 5-6). Dexterity Saving Throw: DC 19, each creature in a 90-foot-long, 5-foot-wide Line. Failure: 60 (11d10) Lightning damage. Success: Half damage.",
        "damage": "11d10 lightning",
        "saveDc": 19,
        "saveType": "dex"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 18): At Will: Detect Magic, Invisibility, Mage Hand, Shatter. 1/Day Each: Scrying, Sending."
      }
    ],
    "legendaryActions": [
      {
        "name": "Cloaked Flight",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Sonic Boom",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Shatter. The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Tail Swipe",
        "type": "ability",
        "description": "The dragon makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-brass-dragon",
    "name": "Adult Brass Dragon",
    "cr": 13,
    "size": "Huge",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 18,
    "hitPoints": 172,
    "hitDice": "15d12 + 75",
    "speed": "40 ft., burrow 30 ft., fly 80 ft.",
    "abilities": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 13,
      "cha": 17
    },
    "skills": [
      "History +7",
      "Perception +11",
      "Persuasion +8",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 21"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +11, reach 10 ft. Hit: 17 (2d10 + 6) Slashing damage plus 4 (1d8) Fire damage.",
        "attackBonus": 11,
        "damage": "2d10+6 slashing+ 1d8 fire"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 18, each creature in a 60-foot-long, 5-foot-wide Line. Failure: 45 (10d8) Fire damage. Success: Half damage.",
        "damage": "10d8 fire",
        "saveDc": 18,
        "saveType": "dex"
      },
      {
        "name": "Sleep Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.",
        "saveDc": 18,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 16): At Will: Detect Magic, Minor Illusion, Scorching Ray, Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), Speak with Animals. 1/Day Each: Detect Thoughts, Control Weather."
      }
    ],
    "legendaryActions": [
      {
        "name": "Blazing Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Scorching Ray."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      },
      {
        "name": "Scorching Sands",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 16, one creature the dragon can see within 120 feet. Failure: 27 (6d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "6d8 fire",
        "saveDc": 16,
        "saveType": "dex"
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-bronze-dragon",
    "name": "Adult Bronze Dragon",
    "cr": 15,
    "size": "Huge",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 18,
    "hitPoints": 212,
    "hitDice": "17d12 + 102",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 23,
      "int": 16,
      "wis": 15,
      "cha": 20
    },
    "skills": [
      "Insight +7",
      "Perception +12",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 22"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Repulsion Breath or (B) Spellcasting to cast Guiding Bolt (level 2 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +12, reach 10 ft. Hit: 16 (2d8 + 7) Slashing damage plus 5 (1d10) Lightning damage.",
        "attackBonus": 12,
        "damage": "2d8+7 slashing+ 1d10 lightning"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Lightning Breath (Recharge 5–6). Dexterity Saving Throw: DC 19, each creature in a 90-foot-long, 5-foot-wide Line. Failure: 55 (10d10) Lightning damage. Success: Half damage.",
        "damage": "10d10 lightning",
        "saveDc": 19,
        "saveType": "dex"
      },
      {
        "name": "Repulsion Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 19, each creature in a 30-foot Cone. Failure: The target is pushed up to 60 feet straight away from the dragon and has the Prone condition.",
        "saveDc": 19,
        "saveType": "str"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17, +10 to hit with spell attacks): At Will: Detect Magic, Guiding Bolt (level 2 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), Speak with Animals, Thaumaturgy. 1/Day Each: Detect Thoughts, Water Breathing."
      }
    ],
    "legendaryActions": [
      {
        "name": "Guiding Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version)."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      },
      {
        "name": "Thunderclap",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 17, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 90 feet. Failure: 10 (3d6) Thunder damage, and the target has the Deafened condition until the end of its next turn.",
        "damage": "3d6 thunder",
        "saveDc": 17,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-copper-dragon",
    "name": "Adult Copper Dragon",
    "cr": 14,
    "size": "Huge",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 18,
    "hitPoints": 184,
    "hitDice": "16d12 + 80",
    "speed": "40 ft., climb 40 ft., fly 80 ft.",
    "abilities": {
      "str": 23,
      "dex": 12,
      "con": 21,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "skills": [
      "Deception +9",
      "Perception +12",
      "Stealth +6"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 22"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast Mind Spike (level 4 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +11, reach 10 ft. Hit: 17 (2d10 + 6) Slashing damage plus 4 (1d8) Acid damage.",
        "attackBonus": 11,
        "damage": "2d10+6 slashing+ 1d8 acid"
      },
      {
        "name": "Acid Breath",
        "type": "attack",
        "description": "Acid Breath (Recharge 5-6). Dexterity Saving Throw: DC 18, each creature in an 60-foot-long, 5-foot-wide Line. Failure: 54 (12d8) Acid damage. Success: Half damage.",
        "damage": "12d8 acid",
        "saveDc": 18,
        "saveType": "dex"
      },
      {
        "name": "Slowing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.",
        "saveDc": 18,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17): At Will: Detect Magic, Mind Spike (level 4 version), Minor Illusion, Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Greater Restoration, Major Image."
      }
    ],
    "legendaryActions": [
      {
        "name": "Giggling Magic",
        "type": "attack",
        "description": "Charisma Saving Throw: DC 17, one creature the dragon can see within 90 feet. Failure: 24 (7d6) Psychic damage. Until the end of its next turn, the target rolls 1d6 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "7d6 psychic",
        "saveDc": 17,
        "saveType": "cha"
      },
      {
        "name": "Mind Jolt",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Mind Spike (level 4 version). The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-gold-dragon",
    "name": "Adult Gold Dragon",
    "cr": 17,
    "size": "Huge",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 19,
    "hitPoints": 243,
    "hitDice": "18d12 + 126",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 27,
      "dex": 14,
      "con": 25,
      "int": 16,
      "wis": 15,
      "cha": 24
    },
    "skills": [
      "Insight +8",
      "Perception +14",
      "Persuasion +13",
      "Stealth +8"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 24"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 2 version) or (B) Weakening Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +14, reach 10 ft. Hit: 17 (2d8 + 8) Slashing damage plus 4 (1d8) Fire damage.",
        "attackBonus": 14,
        "damage": "2d8+8 slashing+ 1d8 fire"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 21, each creature in a 60-foot Cone. Failure: 66 (12d10) Fire damage. Success: Half damage.",
        "damage": "12d10 fire",
        "saveDc": 21,
        "saveType": "dex"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21, +13 to hit with spell attacks): At Will: Detect Magic, Guiding Bolt (level 2 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Flame Strike, Zone of Truth."
      },
      {
        "name": "Weakening Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 21, each creature that isn't currently affected by this breath in a 60-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 3 (1d6) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 21,
        "saveType": "str"
      }
    ],
    "legendaryActions": [
      {
        "name": "Banish",
        "type": "attack",
        "description": "Charisma Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 10 (3d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "3d6 force",
        "saveDc": 21,
        "saveType": "cha"
      },
      {
        "name": "Guiding Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version)."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-green-dragon",
    "name": "Adult Green Dragon",
    "cr": 15,
    "size": "Huge",
    "type": "dragon",
    "alignment": "lawful evil",
    "armorClass": 19,
    "hitPoints": 207,
    "hitDice": "18d12 + 90",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 23,
      "dex": 12,
      "con": 21,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "skills": [
      "Deception +9",
      "Perception +12",
      "Persuasion +9",
      "Stealth +6"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 22"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "poisoned"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Mind Spike (level 3 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +11, reach 10 ft. Hit: 15 (2d8 + 6) Slashing damage plus 7 (2d6) Poison damage.",
        "attackBonus": 11,
        "damage": "2d8+6 slashing+ 2d6 poison"
      },
      {
        "name": "Poison Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: 56 (16d6) Poison damage. Success: Half damage.",
        "damage": "16d6 poison",
        "saveDc": 18,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17): At Will: Detect Magic, Mind Spike (level 3 version); 1/Day: Geas"
      }
    ],
    "legendaryActions": [
      {
        "name": "Mind Invasion",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Mind Spike (level 3 version)."
      },
      {
        "name": "Noxious Miasma",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 17, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 90 feet. Failure: 7 (2d6) Poison damage, and the target takes a -2 penalty to AC until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "2d6 poison",
        "saveDc": 17,
        "saveType": "con"
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-silver-dragon",
    "name": "Adult Silver Dragon",
    "cr": 16,
    "size": "Huge",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 19,
    "hitPoints": 216,
    "hitDice": "16d12 + 112",
    "speed": "40 ft., fly 80 ft.",
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 25,
      "int": 16,
      "wis": 13,
      "cha": 22
    },
    "skills": [
      "History +8",
      "Perception +11",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 21"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "Multiattack. The dragon makes three Rend attacks. It can replace one attack with a use of (A) Paralyzing Breath or (B) Spellcasting to cast Ice Knife."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Rend. Melee Attack Roll: +13, reach 10 ft. Hit: 17 (2d8 + 8) Slashing damage plus 4 (1d8) Cold damage.",
        "attackBonus": 13,
        "damage": "2d8+8 slashing+ 1d8 cold"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Cold Breath (Recharge 5-6). Constitution Saving Throw: DC 20, each creature in a 60-foot Cone. Failure: 54 (12d8) Cold damage. Success: Half damage.",
        "damage": "12d8 cold",
        "saveDc": 20,
        "saveType": "con"
      },
      {
        "name": "Paralyzing Breath",
        "type": "ability",
        "description": "Paralyzing Breath. Constitution Saving Throw: DC 20, each creature in a 60-foot Cone. First Failure: The target has the Incapacitated condition until the end of its next turn, when it repeats the save. Second Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 20,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "Spellcasting. The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 19, +11 to hit with spell attacks): At Will: Detect Magic, Hold Monster, Ice Knife, Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Ice Storm (level 5 version), Zone of Truth."
      }
    ],
    "legendaryActions": [
      {
        "name": "Chill",
        "type": "ability",
        "description": "Chill. The dragon uses Spellcasting to cast Hold Monster. The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Cold Gale",
        "type": "attack",
        "description": "Cold Gale. Dexterity Saving Throw: DC 19, each creature in a 60-foot-long, 10-foot-wide Line. Failure: 14 (4d6) Cold damage, and the target is pushed up to 30 feet straight away from the dragon. Success: Half damage only. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "4d6 cold",
        "saveDc": 19,
        "saveType": "dex"
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "Pounce. The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "adult-white-dragon",
    "name": "Adult White Dragon",
    "cr": 13,
    "size": "Huge",
    "type": "dragon",
    "alignment": "chaotic evil",
    "armorClass": 18,
    "hitPoints": 200,
    "hitDice": "16d12 + 96",
    "speed": "40 ft., burrow 30 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 22,
      "dex": 10,
      "con": 22,
      "int": 8,
      "wis": 12,
      "cha": 12
    },
    "skills": [
      "Perception +11",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 21"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Ice Walk",
        "type": "trait",
        "description": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +11, reach 10 ft. Hit: 13 (2d6 + 6) Slashing damage plus 4 (1d8) Cold damage.",
        "attackBonus": 11,
        "damage": "2d6+6 slashing+ 1d8 cold"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 19, each creature in a 60-foot Cone. Failure: 54 (12d8) Cold damage. Success: Half damage.",
        "damage": "12d8 cold",
        "saveDc": 19,
        "saveType": "con"
      }
    ],
    "legendaryActions": [
      {
        "name": "Freezing Burst",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 14, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 7 (2d6) Cold damage, and the target's Speed is 0 until the end of the target's next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "2d6 cold",
        "saveDc": 14,
        "saveType": "con"
      },
      {
        "name": "Frightful Presence",
        "type": "ability",
        "description": "The dragon casts Fear, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 14). The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "allosaurus",
    "name": "Allosaurus",
    "cr": 2,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 51,
    "hitDice": "6d10 + 18",
    "speed": "60 ft.",
    "abilities": {
      "str": 19,
      "dex": 13,
      "con": 17,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Perception +5"
    ],
    "senses": [
      "Passive Perception 15"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 15 (2d10 + 4) Piercing damage.",
        "attackBonus": 6,
        "damage": "2d10+4 piercing"
      },
      {
        "name": "Claws",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 8 (1d8 + 4) Slashing damage. If the target is a Large or smaller creature and the allosaurus moved 30+ feet straight toward it immediately before the hit, the target has the Prone condition, and the allosaurus can make one Bite attack against it.",
        "attackBonus": 6,
        "damage": "1d8+4 slashing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "ancient-black-dragon",
    "name": "Ancient Black Dragon",
    "cr": 21,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "chaotic evil",
    "armorClass": 22,
    "hitPoints": 367,
    "hitDice": "21d20 + 147",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 27,
      "dex": 14,
      "con": 25,
      "int": 16,
      "wis": 15,
      "cha": 22
    },
    "skills": [
      "Perception +16",
      "Stealth +9"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 26"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (4/Day, or 5/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Acid Arrow (level 4 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +15, reach 15 ft. Hit: 17 (2d8 + 8) Slashing damage plus 9 (2d8) Acid damage.",
        "attackBonus": 15,
        "damage": "2d8+8 slashing+ 2d8 acid"
      },
      {
        "name": "Acid Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 22, each creature in a 90-foot-long, 10-foot-wide Line. Failure: 67 (15d8) Acid damage. Success: Half damage.",
        "damage": "15d8 acid",
        "saveDc": 22,
        "saveType": "dex"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21, +13 to hit with spell attacks): At Will: Acid Arrow (level 4 version), Detect Magic, Fear. 1/Day Each: Create Undead, Speak with Dead, Vitriolic Sphere (level 5 version)."
      }
    ],
    "legendaryActions": [
      {
        "name": "Cloud of Insects",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 33 (6d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "6d10 poison",
        "saveDc": 21,
        "saveType": "dex"
      },
      {
        "name": "Frightful Presence",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Fear. The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-blue-dragon",
    "name": "Ancient Blue Dragon",
    "cr": 23,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "lawful evil",
    "armorClass": 22,
    "hitPoints": 481,
    "hitDice": "26d20 + 208",
    "speed": "40 ft., burrow 40 ft., fly 80 ft.",
    "abilities": {
      "str": 29,
      "dex": 10,
      "con": 27,
      "int": 18,
      "wis": 17,
      "cha": 25
    },
    "skills": [
      "Perception +17",
      "Stealth +7"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 27"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter (level 3 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +16, reach 15 ft. Hit: 18 (2d8 + 9) Slashing damage plus 11 (2d10) Lightning damage.",
        "attackBonus": 16,
        "damage": "2d8+9 slashing+ 2d10 lightning"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Lightning Breath (Recharge 5–6). Dexterity Saving Throw: DC 23, each creature in a 120-foot-long, 10-foot-wide Line. Failure: 88 (16d10) Lightning damage. Success: Half damage.",
        "damage": "16d10 lightning",
        "saveDc": 23,
        "saveType": "dex"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 22): At Will: Detect Magic, Invisibility, Mage Hand, Shatter (level 3 version). 1/Day Each: Scrying, Sending."
      }
    ],
    "legendaryActions": [
      {
        "name": "Cloaked Flight",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can’t take this action again until the start of its next turn."
      },
      {
        "name": "Sonic Boom",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Shatter (level 3 version). The dragon can’t take this action again until the start of its next turn."
      },
      {
        "name": "Tail Swipe",
        "type": "ability",
        "description": "The dragon makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-brass-dragon",
    "name": "Ancient Brass Dragon",
    "cr": 20,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 20,
    "hitPoints": 332,
    "hitDice": "19d20 + 133",
    "speed": "40 ft., burrow 40 ft., fly 80 ft.",
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 25,
      "int": 16,
      "wis": 15,
      "cha": 22
    },
    "skills": [
      "History +9",
      "Perception +14",
      "Persuasion +12",
      "Stealth +6"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 24"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray (level 3 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +14, reach 15 ft. Hit: 19 (2d10 + 8) Slashing damage plus 7 (2d6) Fire damage.",
        "attackBonus": 14,
        "damage": "2d10+8 slashing+ 2d6 fire"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 21, each creature in a 90-foot-long, 5-foot-wide Line. Failure: 58 (13d8) Fire damage. Success: Half damage.",
        "damage": "13d8 fire",
        "saveDc": 21,
        "saveType": "dex"
      },
      {
        "name": "Sleep Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 21, each creature in a 90-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.",
        "saveDc": 21,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 20): At Will: Detect Magic, Minor Illusion, Scorching Ray (level 3 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), Speak with Animals. 1/Day Each: Control Weather, Detect Thoughts."
      }
    ],
    "legendaryActions": [
      {
        "name": "Blazing Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Scorching Ray (level 3 version)."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      },
      {
        "name": "Scorching Sands",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 20, one creature the dragon can see within 120 feet. Failure: 36 (8d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "8d8 fire",
        "saveDc": 20,
        "saveType": "dex"
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-bronze-dragon",
    "name": "Ancient Bronze Dragon",
    "cr": 22,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 22,
    "hitPoints": 444,
    "hitDice": "24d20 + 192",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 29,
      "dex": 10,
      "con": 27,
      "int": 18,
      "wis": 17,
      "cha": 25
    },
    "skills": [
      "Insight +10",
      "Perception +17",
      "Stealth +7"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 27"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (4/Day, or 5/Day in Lair)",
        "type": "trait",
        "description": "Legendary Resistance (4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Repulsion Breath or (B) Spellcasting to cast Guiding Bolt (level 2 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +16, reach 15 ft. Hit: 18 (2d8 + 9) Slashing damage plus 9 (2d8) Lightning damage.",
        "attackBonus": 16,
        "damage": "2d8+9 slashing+ 2d8 lightning"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Lightning Breath (Recharge 5-6). Dexterity Saving Throw: DC 23, each creature in a 120-foot-long, 10-foot-wide Line. Failure: 82 (15d10) Lightning damage. Success: Half damage.",
        "damage": "15d10 lightning",
        "saveDc": 23,
        "saveType": "dex"
      },
      {
        "name": "Repulsion Breath",
        "type": "ability",
        "description": "Repulsion Breath. Strength Saving Throw: DC 23, each creature in a 30-foot Cone. Failure: The target is pushed up to 60 feet straight away from the dragon and has the Prone condition.",
        "saveDc": 23,
        "saveType": "str"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 22, +14 to hit with spell attacks): At Will: Detect Magic, Guiding Bolt (level 2 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), Speak with Animals, Thaumaturgy. 1/Day Each: Detect Thoughts, Control Water, Scrying, Water Breathing."
      }
    ],
    "legendaryActions": [
      {
        "name": "Guiding Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version)."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      },
      {
        "name": "Thunderclap",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 22, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 13 (3d8) Thunder damage, and the target has the Deafened condition until the end of its next turn.",
        "damage": "3d8 thunder",
        "saveDc": 22,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-copper-dragon",
    "name": "Ancient Copper Dragon",
    "cr": 21,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 21,
    "hitPoints": 367,
    "hitDice": "21d20 + 147",
    "speed": "40 ft., climb 40 ft., fly 80 ft.",
    "abilities": {
      "str": 27,
      "dex": 12,
      "con": 25,
      "int": 20,
      "wis": 17,
      "cha": 22
    },
    "skills": [
      "Deception +13",
      "Perception +17",
      "Stealth +8"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 27"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast Mind Spike (level 5 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +15, reach 15 ft. Hit: 19 (2d10 + 8) Slashing damage plus 9 (2d8) Acid damage.",
        "attackBonus": 15,
        "damage": "2d10+8 slashing+ 2d8 acid"
      },
      {
        "name": "Acid Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 22, each creature in a 90-foot-long, 10-foot-wide Line. Failure: 63 (14d8) Acid damage. Success: Half damage.",
        "damage": "14d8 acid",
        "saveDc": 22,
        "saveType": "dex"
      },
      {
        "name": "Slowing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 22, each creature in a 90-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.",
        "saveDc": 22,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21): At Will: Detect Magic, Mind Spike (level 5 version), Minor Illusion, Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Greater Restoration, Major Image, Project Image."
      }
    ],
    "legendaryActions": [
      {
        "name": "Giggling Magic",
        "type": "attack",
        "description": "Charisma Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 31 (9d6) Psychic damage. Until the end of its next turn, the target rolls 1d8 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "9d6 psychic",
        "saveDc": 21,
        "saveType": "cha"
      },
      {
        "name": "Mind Jolt",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Mind Spike (level 5 version). The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-gold-dragon",
    "name": "Ancient Gold Dragon",
    "cr": 24,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 22,
    "hitPoints": 546,
    "hitDice": "28d20 + 252",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 30,
      "dex": 14,
      "con": 29,
      "int": 18,
      "wis": 17,
      "cha": 28
    },
    "skills": [
      "Insight +10",
      "Perception +17",
      "Persuasion +16",
      "Stealth +9"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 27"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Legendary Resistance (4/Day, or 5/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 4 version) or (B) Weakening Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +17 to hit, reach 15 ft. Hit: 19 (2d8 + 10) Slashing damage plus 9 (2d8) Fire damage.",
        "attackBonus": 17,
        "damage": "2d8+10 slashing+ 2d8 fire"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 24, each creature in a 90-foot Cone. Failure: 71 (13d10) Fire damage. Success: Half damage.",
        "damage": "13d10 fire",
        "saveDc": 24,
        "saveType": "dex"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 24, +16 to hit with spell attacks): At Will: Detect Magic, Guiding Bolt (level 4 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Flame Strike (level 6 version), Word of Recall, Zone of Truth."
      },
      {
        "name": "Weakening Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 24, each creature that isn't currently affected by this breath in a 90-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 5 (1d10) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 24,
        "saveType": "str"
      }
    ],
    "legendaryActions": [
      {
        "name": "Banish",
        "type": "attack",
        "description": "Charisma Saving Throw: DC 24, one creature the dragon can see within 120 feet. Failure: 24 (7d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "7d6 force",
        "saveDc": 24,
        "saveType": "cha"
      },
      {
        "name": "Guiding Light",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Guiding Bolt (level 4 version)."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-silver-dragon",
    "name": "Ancient Silver Dragon",
    "cr": 23,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 22,
    "hitPoints": 468,
    "hitDice": "24d20 + 216",
    "speed": "40 ft., fly 80 ft.",
    "abilities": {
      "str": 30,
      "dex": 10,
      "con": 29,
      "int": 18,
      "wis": 15,
      "cha": 26
    },
    "skills": [
      "History +11",
      "Perception +16",
      "Stealth +7"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 26"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Legendary Resistance",
        "type": "trait",
        "description": "Legendary Resistance (4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Paralyzing Breath or (B) Spellcasting to cast Ice Knife (level 2 version)."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +17, reach 15 ft. Hit: 19 (2d8 + 10) Slashing damage plus 9 (2d8) Cold damage.",
        "attackBonus": 17,
        "damage": "2d8+10 slashing+ 2d8 cold"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 24, each creature in a 90-foot Cone. Failure: 67 (15d8) Cold damage. Success: Half damage.",
        "damage": "15d8 cold",
        "saveDc": 24,
        "saveType": "con"
      },
      {
        "name": "Paralyzing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 24, each creature in a 90-foot Cone. First Failure: The target has the Incapacitated condition until the end of its next turn, when it repeats the save. Second Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 23, +15 to hit with spell attacks): At Will: Detect Magic, Hold Monster, Ice Knife (level 2 version), Shapechange (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell). 1/Day Each: Control Weather, Ice Storm (level 7 version), Teleport, Zone of Truth."
      }
    ],
    "legendaryActions": [
      {
        "name": "Chill",
        "type": "ability",
        "description": "The dragon uses Spellcasting to cast Hold Monster. The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Cold Gale",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 23, each creature in a 60-foot-long, 10-foot-wide Line. Failure: 14 (4d6) Cold damage, and the target is pushed up to 30 feet straight away from the dragon. Success: Half damage only. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "4d6 cold",
        "saveDc": 23,
        "saveType": "dex"
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ancient-white-dragon",
    "name": "Ancient White Dragon",
    "cr": 20,
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "chaotic evil",
    "armorClass": 20,
    "hitPoints": 333,
    "hitDice": "18d20 + 144",
    "speed": "40 ft., burrow 40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 26,
      "dex": 10,
      "con": 26,
      "int": 10,
      "wis": 13,
      "cha": 18
    },
    "skills": [
      "Perception +13",
      "Stealth +6"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 23"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Ice Walk",
        "type": "trait",
        "description": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      },
      {
        "name": "Legendary Resistance (4/Day, or 5/Day in Lair)",
        "type": "trait",
        "description": "If the dragon fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +14, reach 15 ft. Hit: 17 (2d8 + 8) Slashing damage plus 7 (2d6) Cold damage.",
        "attackBonus": 14,
        "damage": "2d8+8 slashing+ 2d6 cold"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 22, each creature in a 90-foot Cone. Failure: 63 (14d8) Cold damage. Success: Half damage.",
        "damage": "14d8 cold",
        "saveDc": 22,
        "saveType": "con"
      }
    ],
    "legendaryActions": [
      {
        "name": "Freezing Burst",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 20, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 14 (4d6) Cold damage, and the target's Speed is 0 until the end of the target's next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.",
        "damage": "4d6 cold",
        "saveDc": 20,
        "saveType": "con"
      },
      {
        "name": "Frightful Presence",
        "type": "ability",
        "description": "The dragon casts Fear, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 18). The dragon can't take this action again until the start of its next turn."
      },
      {
        "name": "Pounce",
        "type": "ability",
        "description": "The dragon moves up to half its Speed, and it makes one Rend attack."
      }
    ],
    "tags": [
      "dragon",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "ankheg",
    "name": "Ankheg",
    "cr": 2,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 14,
    "hitPoints": 45,
    "hitDice": "6d10 + 12",
    "speed": "30 ft., burrow 10 ft.",
    "abilities": {
      "str": 17,
      "dex": 11,
      "con": 14,
      "int": 1,
      "wis": 13,
      "cha": 6
    },
    "senses": [
      "Darkvision 60 ft.",
      "Tremorsense 60 ft.",
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Tunneler",
        "type": "trait",
        "description": "The ankheg can burrow through solid rock at half its Burrow Speed and leaves a 10-foot-diameter tunnel in its wake."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the ankheg), reach 5 ft. Hit: 10 (2d6 + 3) Slashing damage plus 3 (1d6) Acid damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13).",
        "attackBonus": 5,
        "damage": "2d6+3 slashing+ 1d6 acid"
      },
      {
        "name": "Acid Spray",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 12, each creature in a 30-foot-long, 5-foot-wide Line. Failure: 14 (4d6) Acid damage. Success: Half damage.",
        "damage": "4d6 acid",
        "saveDc": 12,
        "saveType": "dex"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "ankylosaurus",
    "name": "Ankylosaurus",
    "cr": 3,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 15,
    "hitPoints": 68,
    "hitDice": "8d12 + 16",
    "speed": "30 ft.",
    "abilities": {
      "str": 19,
      "dex": 11,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      "Passive Perception 11"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The ankylosaurus makes two Tail attacks."
      },
      {
        "name": "Tail",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 10 ft. Hit: 9 (1d10 + 4) Bludgeoning damage. If the target is a Huge or smaller creature, it has the Prone condition.",
        "attackBonus": 6,
        "damage": "1d10+4 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "ape",
    "name": "Ape",
    "cr": 0.5,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 19,
    "hitDice": "3d8 + 6",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 16,
      "dex": 14,
      "con": 14,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Athletics +5",
      "Perception +3"
    ],
    "senses": [
      "Passive Perception 13"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The ape makes two Fist attacks."
      },
      {
        "name": "Fist",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Bludgeoning damage.",
        "attackBonus": 5,
        "damage": "1d4+3 bludgeoning"
      },
      {
        "name": "Rock",
        "type": "attack",
        "description": "Ranged Attack Roll: +5, range 25/50 ft. Hit: 10 (2d6 + 3) Bludgeoning damage.",
        "attackBonus": 5,
        "damage": "2d6+3 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "archelon",
    "name": "Archelon",
    "cr": 4,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 17,
    "hitPoints": 90,
    "hitDice": "12d12 + 12",
    "speed": "20 ft., swim 80 ft.",
    "abilities": {
      "str": 18,
      "dex": 16,
      "con": 13,
      "int": 4,
      "wis": 14,
      "cha": 6
    },
    "skills": [
      "Stealth +5"
    ],
    "senses": [
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The archelon can breathe air and water."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The archelon makes two Bite attacks."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 14 (3d6 + 4) Piercing damage.",
        "attackBonus": 6,
        "damage": "3d6+4 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "awakened-shrub",
    "name": "Awakened Shrub",
    "cr": 0,
    "size": "Small",
    "type": "plant",
    "alignment": "neutral",
    "armorClass": 9,
    "hitPoints": 10,
    "hitDice": "3d6",
    "speed": "20 ft.",
    "abilities": {
      "str": 3,
      "dex": 8,
      "con": 11,
      "int": 10,
      "wis": 10,
      "cha": 6
    },
    "senses": [
      "Passive Perception 10"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "piercing"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Rake",
        "type": "attack",
        "description": "Melee Attack Roll: +1, reach 5 ft. Hit: 1 Slashing damage.",
        "attackBonus": 1,
        "damage": "1 slashing"
      }
    ],
    "tags": [
      "plant"
    ]
  },
  {
    "id": "awakened-tree",
    "name": "Awakened Tree",
    "cr": 2,
    "size": "Huge",
    "type": "plant",
    "alignment": "neutral",
    "armorClass": 13,
    "hitPoints": 59,
    "hitDice": "7d12 + 14",
    "speed": "20 ft.",
    "abilities": {
      "str": 19,
      "dex": 6,
      "con": 15,
      "int": 10,
      "wis": 10,
      "cha": 7
    },
    "senses": [
      "Passive Perception 10"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "bludgeoning, piercing"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Slam",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 10 ft. Hit: 14 (3d6 + 4) Bludgeoning damage.",
        "attackBonus": 6,
        "damage": "3d6+4 bludgeoning"
      }
    ],
    "tags": [
      "plant"
    ]
  },
  {
    "id": "axe-beak",
    "name": "Axe Beak",
    "cr": 0.25,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 19,
    "hitDice": "3d10 + 3",
    "speed": "50 ft.",
    "abilities": {
      "str": 14,
      "dex": 12,
      "con": 12,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "senses": [
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Beak",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d8+2 slashing"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "azer-sentinel",
    "name": "Azer Sentinel",
    "cr": 2,
    "size": "Medium",
    "type": "elemental",
    "alignment": "lawful neutral",
    "armorClass": 17,
    "hitPoints": 39,
    "hitDice": "6d8 + 12",
    "speed": "30 ft.",
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 15,
      "int": 12,
      "wis": 13,
      "cha": 10
    },
    "senses": [
      "Passive Perception 11"
    ],
    "languages": [
      "Primordial"
    ],
    "traits": [
      {
        "name": "Fire Aura",
        "type": "trait",
        "description": "At the end of each of the azer's turns, each creature of the azer's choice in a 5-foot Emanation originating from the azer takes 5 (1d10) Fire damage unless the azer has the Incapacitated condition."
      },
      {
        "name": "Illumination",
        "type": "trait",
        "description": "The azer sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire, poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "poisoned"
      }
    ],
    "actions": [
      {
        "name": "Burning Hammer",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 8 (1d10 + 3) Bludgeoning damage plus 3 (1d6) Fire damage.",
        "attackBonus": 5,
        "damage": "1d10+3 bludgeoning+ 1d6 fire"
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "baboon",
    "name": "Baboon",
    "cr": 0,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 3,
    "hitDice": "1d6",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 8,
      "dex": 14,
      "con": 11,
      "int": 4,
      "wis": 12,
      "cha": 6
    },
    "senses": [
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The baboon has Advantage on an attack roll against a creature if at least one of the baboon's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +1, reach 5 ft. Hit: 1 (1d4 - 1) Piercing damage.",
        "attackBonus": 1,
        "damage": "1d4-1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "badger",
    "name": "Badger",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 5,
    "hitDice": "1d4 + 3",
    "speed": "20 ft., burrow 5 ft.",
    "abilities": {
      "str": 10,
      "dex": 11,
      "con": 16,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "poison"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 2,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "blink-dog",
    "name": "Blink Dog",
    "cr": 0.25,
    "size": "Medium",
    "type": "fey",
    "alignment": "lawful good",
    "armorClass": 13,
    "hitPoints": 22,
    "hitDice": "4d8 + 4",
    "speed": "40 ft.",
    "abilities": {
      "str": 12,
      "dex": 17,
      "con": 12,
      "int": 10,
      "wis": 13,
      "cha": 11
    },
    "skills": [
      "Perception +5",
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 15"
    ],
    "languages": [
      "Elvish",
      "Sylvan"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Piercing damage.",
        "attackBonus": 5,
        "damage": "1d4+3 piercing"
      },
      {
        "name": "Teleport",
        "type": "ability",
        "description": "The dog teleports up to 40 feet to an unoccupied space it can see."
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "blood-hawk",
    "name": "Blood Hawk",
    "cr": 0.125,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 7,
    "hitDice": "2d6",
    "speed": "10 ft., fly 60 ft.",
    "abilities": {
      "str": 6,
      "dex": 14,
      "con": 10,
      "int": 3,
      "wis": 14,
      "cha": 5
    },
    "skills": [
      "Perception +6"
    ],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The hawk has Advantage on an attack roll against a creature if at least one of the hawk's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Beak",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Piercing damage, or 6 (1d8 + 2) Piercing damage if the target is Bloodied.",
        "attackBonus": 4,
        "damage": "1d4+2 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "boar",
    "name": "Boar",
    "cr": 0.25,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 13,
    "hitDice": "2d8 + 4",
    "speed": "40 ft.",
    "abilities": {
      "str": 13,
      "dex": 11,
      "con": 14,
      "int": 2,
      "wis": 9,
      "cha": 5
    },
    "senses": [
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Bloodied Fury",
        "type": "trait",
        "description": "While Bloodied, the boar has Advantage on attack rolls."
      }
    ],
    "actions": [
      {
        "name": "Gore",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 4 (1d6 + 1) Piercing damage. If the target is a Medium or smaller creature and the boar moved 20+ feet straight toward it immediately before the hit, the target takes an extra 3 (1d6) Piercing damage and has the Prone condition.",
        "attackBonus": 3,
        "damage": "1d6+1 piercing+ 1d6 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "brass-dragon-wyrmling",
    "name": "Brass Dragon Wyrmling",
    "cr": 1,
    "size": "Medium",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 15,
    "hitPoints": 22,
    "hitDice": "4d8 + 4",
    "speed": "30 ft., burrow 15 ft., fly 60 ft.",
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 10,
      "wis": 11,
      "cha": 13
    },
    "skills": [
      "Perception +4",
      "Stealth +2"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (1d10 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d10+2 slashing"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 11, each creature in a 20-foot-long, 5-foot-wide Line. Failure: 14 (4d6) Fire damage. Success: Half damage.",
        "damage": "4d6 fire",
        "saveDc": 11,
        "saveType": "dex"
      },
      {
        "name": "Sleep Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 1 minute. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.",
        "saveDc": 11,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "bronze-dragon-wyrmling",
    "name": "Bronze Dragon Wyrmling",
    "cr": 2,
    "size": "Medium",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 15,
    "hitPoints": 39,
    "hitDice": "6d8 + 12",
    "speed": "30 ft., fly 60 ft., swim 30 ft.",
    "abilities": {
      "str": 17,
      "dex": 10,
      "con": 15,
      "int": 12,
      "wis": 11,
      "cha": 15
    },
    "skills": [
      "Perception +4",
      "Stealth +2"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes two Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 8 (1d10 + 3) Slashing damage.",
        "attackBonus": 5,
        "damage": "1d10+3 slashing"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 12, each creature in a 40-foot-long, 5-foot-wide Line. Failure: 16 (3d10) Lightning damage. Success: Half damage.",
        "damage": "3d10 lightning",
        "saveDc": 12,
        "saveType": "dex"
      },
      {
        "name": "Repulsion Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 12, each creature in a 30-foot Cone. Failure: The target is pushed up to 30 feet straight away from the dragon and has the Prone condition.",
        "saveDc": 12,
        "saveType": "str"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "camel",
    "name": "Camel",
    "cr": 0.125,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 17,
    "hitDice": "2d10 + 6",
    "speed": "50 ft.",
    "abilities": {
      "str": 15,
      "dex": 8,
      "con": 17,
      "int": 2,
      "wis": 11,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Bludgeoning damage.",
        "attackBonus": 4,
        "damage": "1d4+2 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "cat",
    "name": "Cat",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 2,
    "hitDice": "1d4",
    "speed": "40 ft., climb 40 ft.",
    "abilities": {
      "str": 3,
      "dex": 15,
      "con": 10,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +3",
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Jumper",
        "type": "trait",
        "description": "The cat's jump distance is determined using its Dexterity rather than its Strength."
      }
    ],
    "actions": [
      {
        "name": "Scratch",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Slashing damage.",
        "attackBonus": 4,
        "damage": "1 slashing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "constrictor-snake",
    "name": "Constrictor Snake",
    "cr": 0.25,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 13,
    "hitDice": "2d10 + 2",
    "speed": "30 ft., swim 30 ft.",
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "skills": [
      "Perception +2",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Passive Perception 12"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d8+2 piercing"
      },
      {
        "name": "Constrict",
        "type": "attack",
        "description": "Strength Saving Throw: DC 12, one Medium or smaller creature the snake can see within 5 feet. Failure: 7 (3d4) Bludgeoning damage, and the target has the Grappled condition (escape DC 12).",
        "damage": "3d4 bludgeoning",
        "saveDc": 12,
        "saveType": "str"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "copper-dragon-wyrmling",
    "name": "Copper Dragon Wyrmling",
    "cr": 1,
    "size": "Medium",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 16,
    "hitPoints": 22,
    "hitDice": "4d8 + 4",
    "speed": "30 ft., climb 30 ft., fly 60 ft.",
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 13,
      "int": 14,
      "wis": 11,
      "cha": 13
    },
    "skills": [
      "Perception +4",
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      }
    ],
    "actions": [
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (1d10 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d10+2 slashing"
      },
      {
        "name": "Acid Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 11, each creature in a 20-foot-long, 5-foot-wide Line. Failure: 18 (4d8) Acid damage. Success: Half damage.",
        "damage": "4d8 acid",
        "saveDc": 11,
        "saveType": "dex"
      },
      {
        "name": "Slowing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.",
        "saveDc": 11,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "crab",
    "name": "Crab",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 3,
    "hitDice": "1d4 + 1",
    "speed": "20 ft., swim 20 ft.",
    "abilities": {
      "str": 6,
      "dex": 11,
      "con": 12,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "skills": [
      "Stealth +2"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The crab can breathe air and water."
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 1 Bludgeoning damage.",
        "attackBonus": 2,
        "damage": "1 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "darkmantle",
    "name": "Darkmantle",
    "cr": 0.5,
    "size": "Small",
    "type": "aberration",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 22,
    "hitDice": "5d6 + 5",
    "speed": "10 ft., fly 30 ft.",
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "skills": [
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Crush",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage, and the darkmantle attaches to the target. If the target is a Medium or smaller creature and the darkmantle had Advantage on the attack roll, it covers the target, which has the Blinded condition and is suffocating while the darkmantle is attached in this way. While attached to a target, the darkmantle can attack only the target but has Advantage on its attack rolls. Its Speed becomes 0, it can't benefit from any bonus to its Speed, and it moves with the target. A creature can take an action to try to detach the darkmantle from itself, doing so with a successful DC 13 Strength (Athletics) check. On its turn, the darkmantle can detach itself by using 5 feet of movement.",
        "attackBonus": 5,
        "damage": "1d6+3 bludgeoning"
      },
      {
        "name": "Darkness Aura",
        "type": "ability",
        "description": "Magical Darkness fills a 15-foot Emanation originating from the darkmantle. This effect lasts while the darkmantle maintains Concentration on it, up to 10 minutes. Darkvision can't penetrate this area, and no light can illuminate it."
      }
    ],
    "tags": [
      "aberration"
    ]
  },
  {
    "id": "deer",
    "name": "Deer",
    "cr": 0,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 4,
    "hitDice": "1d8",
    "speed": "50 ft.",
    "abilities": {
      "str": 11,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 14,
      "cha": 5
    },
    "skills": [
      "Perception +4"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "traits": [
      {
        "name": "Agile",
        "type": "trait",
        "description": "The deer doesn't provoke an Opportunity Attack when it moves out of an enemy's reach."
      }
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 2 (1d4) Bludgeoning damage.",
        "attackBonus": 2,
        "damage": "1d4 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "draft-horse",
    "name": "Draft Horse",
    "cr": 0.25,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 15,
    "hitDice": "2d10 + 4",
    "speed": "40 ft.",
    "abilities": {
      "str": 18,
      "dex": 10,
      "con": 15,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "senses": [
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Hooves",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 6 (1d4 + 4) Bludgeoning damage.",
        "attackBonus": 6,
        "damage": "1d4+4 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "drider",
    "name": "Drider",
    "cr": 6,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "chaotic evil",
    "armorClass": 19,
    "hitPoints": 123,
    "hitDice": "13d10 + 52",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 16,
      "dex": 19,
      "con": 18,
      "int": 13,
      "wis": 16,
      "cha": 12
    },
    "skills": [
      "Perception +6",
      "Stealth +10"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 16"
    ],
    "languages": [
      "Elvish",
      "Undercommon"
    ],
    "traits": [
      {
        "name": "Spider Climb",
        "type": "trait",
        "description": "The drider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      },
      {
        "name": "Sunlight Sensitivity",
        "type": "trait",
        "description": "While in sunlight, the drider has Disadvantage on ability checks and attack rolls."
      },
      {
        "name": "Web Walker",
        "type": "trait",
        "description": "The drider ignores movement restrictions caused by webs, and the drider knows the location of any other creature in contact with the same web."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The drider makes three attacks, using Foreleg or Poison Burst in any combination."
      },
      {
        "name": "Foreleg",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 13 (2d8 + 4) Piercing damage.",
        "attackBonus": 7,
        "damage": "2d8+4 piercing"
      },
      {
        "name": "Poison Burst",
        "type": "attack",
        "description": "Ranged Attack Roll: +6, range 120 ft. Hit: 13 (3d6 + 3) Poison damage.",
        "attackBonus": 6,
        "damage": "3d6+3 poison"
      },
      {
        "name": "Magic of the Spider Queen",
        "type": "ability",
        "description": "The drider casts Darkness, Faerie Fire, or Web, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 14).",
        "saveDc": 14
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "dust-mephit",
    "name": "Dust Mephit",
    "cr": 0.5,
    "size": "Small",
    "type": "elemental",
    "alignment": "neutral evil",
    "armorClass": 12,
    "hitPoints": 17,
    "hitDice": "5d6",
    "speed": "30 ft., fly 30 ft.",
    "abilities": {
      "str": 5,
      "dex": 14,
      "con": 10,
      "int": 9,
      "wis": 11,
      "cha": 10
    },
    "skills": [
      "Perception +2",
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "languages": [
      "Primordial"
    ],
    "traits": [
      {
        "name": "Death Burst",
        "type": "trait",
        "description": "The mephit explodes when it dies. Dexterity Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Bludgeoning damage. Success: Half damage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "fire"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d4+2 slashing"
      },
      {
        "name": "Blinding Breath",
        "type": "ability",
        "description": "Dexterity Saving Throw: DC 10, each creature in a 15-foot Cone. Failure: The target has the Blinded condition until the end of the mephit's next turn.",
        "saveDc": 10,
        "saveType": "dex"
      },
      {
        "name": "Sleep",
        "type": "ability",
        "description": "The mephit casts the Sleep spell, requiring no spell components and using Charisma as the spellcasting ability (spell save DC 10)."
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "eagle",
    "name": "Eagle",
    "cr": 0,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 4,
    "hitDice": "1d6 + 1",
    "speed": "10 ft., fly 60 ft.",
    "abilities": {
      "str": 6,
      "dex": 15,
      "con": 12,
      "int": 2,
      "wis": 14,
      "cha": 7
    },
    "skills": [
      "Perception +6"
    ],
    "senses": [
      "Passive Perception 16"
    ],
    "actions": [
      {
        "name": "Talons",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 feet. Hit: 4 (1d4 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d4+2 slashing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "elk",
    "name": "Elk",
    "cr": 0.25,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 11,
    "hitDice": "2d10",
    "speed": "50 ft.",
    "abilities": {
      "str": 16,
      "dex": 10,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 6
    },
    "skills": [
      "Perception +2"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage. If the target is a Large or smaller creature and the elk moved 20+ feet straight toward it immediately before the hit, the target takes an extra 3 (1d6) Bludgeoning damage and has the Prone condition.",
        "attackBonus": 5,
        "damage": "1d6+3 bludgeoning+ 1d6 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "flying-snake",
    "name": "Flying Snake",
    "cr": 0.125,
    "size": "Tiny",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 14,
    "hitPoints": 5,
    "hitDice": "2d4",
    "speed": "30 ft., fly 60 ft., swim 30 ft.",
    "abilities": {
      "str": 4,
      "dex": 15,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      "Blindsight 10 ft.",
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Flyby",
        "type": "trait",
        "description": "The snake doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Piercing damage plus 5 (2d4) Poison damage.",
        "attackBonus": 4,
        "damage": "1 piercing+ 2d4 poison"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "frog",
    "name": "Frog",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "20 ft., swim 20 ft.",
    "abilities": {
      "str": 1,
      "dex": 13,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "skills": [
      "Perception +1",
      "Stealth +3"
    ],
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "Amphibious. The frog can breathe air and water."
      },
      {
        "name": "Standing Leap",
        "type": "trait",
        "description": "Standing Leap. The frog's Long Jump is up to 10 feet and its High Jump is up to 5 feet with or without a running start."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Bite. Melee Attack Roll: +3, reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 3,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-badger",
    "name": "Giant Badger",
    "cr": 0.25,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 15,
    "hitDice": "2d8 + 6",
    "speed": "30 ft., burrow 10 ft.",
    "abilities": {
      "str": 13,
      "dex": 10,
      "con": 17,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "poison"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 6 (2d4 + 1) Piercing damage.",
        "attackBonus": 3,
        "damage": "2d4+1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-crab",
    "name": "Giant Crab",
    "cr": 0.125,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 15,
    "hitPoints": 13,
    "hitDice": "3d8",
    "speed": "30 ft., swim 30 ft.",
    "abilities": {
      "str": 13,
      "dex": 13,
      "con": 11,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "skills": [
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The crab can breathe air and water."
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 4 (1d6 + 1) Bludgeoning damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 11) from one of two claws.",
        "attackBonus": 3,
        "damage": "1d6+1 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-elk",
    "name": "Giant Elk",
    "cr": 2,
    "size": "Huge",
    "type": "celestial",
    "alignment": "neutral good",
    "armorClass": 14,
    "hitPoints": 42,
    "hitDice": "5d12 + 10",
    "speed": "60 ft.",
    "abilities": {
      "str": 19,
      "dex": 18,
      "con": 14,
      "int": 7,
      "wis": 14,
      "cha": 10
    },
    "skills": [
      "Perception +4"
    ],
    "senses": [
      "Darkvision 90 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Celestial",
      "Common",
      "Elvish",
      "Sylvan"
    ],
    "traits": [
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic, radiant"
      }
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 10 ft. Hit: 11 (2d6 + 4) Bludgeoning damage plus 5 (2d4) Radiant damage. If the target is a Huge or smaller creature and the elk moved 20+ feet straight toward it immediately before the hit, the target takes an extra 5 (2d4) Bludgeoning damage and has the Prone condition.",
        "attackBonus": 6,
        "damage": "2d6+4 bludgeoning+ 2d4 radiant"
      }
    ],
    "tags": [
      "celestial"
    ]
  },
  {
    "id": "giant-fire-beetle",
    "name": "Giant Fire Beetle",
    "cr": 0,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 4,
    "hitDice": "1d6 + 1",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 8,
      "dex": 10,
      "con": 12,
      "int": 1,
      "wis": 7,
      "cha": 3
    },
    "senses": [
      "Blindsight 30 ft.",
      "Passive Perception 8"
    ],
    "traits": [
      {
        "name": "Illumination",
        "type": "trait",
        "description": "The beetle sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +1, reach 5 ft. Hit: 1 Fire damage.",
        "attackBonus": 1,
        "damage": "1 fire"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-fly",
    "name": "Giant Fly",
    "cr": 0,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 19,
    "hitDice": "3d10 + 3",
    "speed": "30 ft., fly 60 ft.",
    "abilities": {
      "str": 14,
      "dex": 13,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "actions": [],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-goat",
    "name": "Giant Goat",
    "cr": 0.5,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 19,
    "hitDice": "3d10 + 3",
    "speed": "40 ft., climb 30 ft.",
    "abilities": {
      "str": 17,
      "dex": 13,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage. If the target is a Large or smaller creature and the goat moved 20+ feet straight toward it immediately before the hit, the target takes an extra 5 (2d4) Bludgeoning damage and has the Prone condition.",
        "attackBonus": 5,
        "damage": "1d6+3 bludgeoning+ 2d4 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-insect",
    "name": "Giant Insect",
    "cr": 0.5,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 30,
    "hitDice": "",
    "speed": "40 ft., climb 40 ft., fly 40 ft.",
    "abilities": {
      "str": 17,
      "dex": 13,
      "con": 15,
      "int": 4,
      "wis": 14,
      "cha": 3
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Spider Climb",
        "type": "trait",
        "description": "The insect can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The insect makes a number of attacks equal to half this spell's level (round down)."
      },
      {
        "name": "Poison Jab",
        "type": "attack",
        "description": "Melee Attack Roll: Bonus equals your spell attack modifier, reach 10 ft. Hit: 1d6 + 3 plus the spell's level Piercing damage plus 1d4 Poison damage.",
        "attackBonus": 5,
        "damage": "1d6+3 piercing+ 1d4 poison"
      },
      {
        "name": "Web Bolt",
        "type": "attack",
        "description": "Ranged Attack Roll: Bonus equals your spell attack modifier, range 60 ft. Hit: 1d10 + 3 plus the spell's level Bludgeoning damage, and the target's Speed is reduced to 0 until the start of the insect's next turn.",
        "attackBonus": 5,
        "damage": "1d10+3 bludgeoning"
      },
      {
        "name": "Venomous Spew",
        "type": "ability",
        "description": "Constitution Saving Throw: Your spell save DC, one creature the insect can see within 10 feet. Failure: The target has the Poisoned condition until the start of the insect's next turn.",
        "saveDc": 13,
        "saveType": "con"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-lizard",
    "name": "Giant Lizard",
    "cr": 0.25,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 19,
    "hitDice": "3d10 + 3",
    "speed": "40 ft., climb 40 ft.",
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "traits": [
      {
        "name": "Spider Climb",
        "type": "trait",
        "description": "The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d8+2 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-owl",
    "name": "Giant Owl",
    "cr": 0.25,
    "size": "Large",
    "type": "celestial",
    "alignment": "neutral",
    "armorClass": 12,
    "hitPoints": 19,
    "hitDice": "3d10 + 3",
    "speed": "5 ft., fly 60 ft.",
    "abilities": {
      "str": 13,
      "dex": 15,
      "con": 12,
      "int": 10,
      "wis": 14,
      "cha": 10
    },
    "skills": [
      "Perception +6",
      "Stealth +6"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 16"
    ],
    "languages": [
      "Celestial",
      "Common",
      "Elvish",
      "Sylvan"
    ],
    "traits": [
      {
        "name": "Flyby",
        "type": "trait",
        "description": "The owl doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic, radiant"
      }
    ],
    "actions": [
      {
        "name": "Talons",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (1d10 + 2) Slashing damage.",
        "attackBonus": 4,
        "damage": "1d10+2 slashing"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The owl casts one of the following spells, requiring no spell components and using Wisdom as the spellcasting ability: At Will: Detect Evil and Good, Detect Magic. 1/Day: Clairvoyance"
      }
    ],
    "tags": [
      "celestial"
    ]
  },
  {
    "id": "giant-scorpion",
    "name": "Giant Scorpion",
    "cr": 3,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 15,
    "hitPoints": 52,
    "hitDice": "7d10 + 14",
    "speed": "40 ft.",
    "abilities": {
      "str": 16,
      "dex": 13,
      "con": 15,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "senses": [
      "Blindsight 60 ft.",
      "Passive Perception 9"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The scorpion makes two Claw attacks and one Sting attack."
      },
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13) from one of two claws.",
        "attackBonus": 5,
        "damage": "1d6+3 bludgeoning"
      },
      {
        "name": "Sting",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage plus 11 (2d10) Poison damage.",
        "attackBonus": 5,
        "damage": "1d8+3 piercing+ 2d10 poison"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-seahorse",
    "name": "Giant Seahorse",
    "cr": 0.5,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 14,
    "hitPoints": 16,
    "hitDice": "3d10",
    "speed": "5 ft., swim 40 ft.",
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The seahorse can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 9 (2d6 + 2) Bludgeoning damage, or 11 (2d8 + 2) Bludgeoning damage if the seahorse moved 20+ feet straight toward the target immediately before the hit.",
        "attackBonus": 4,
        "damage": "2d6+2 bludgeoning"
      },
      {
        "name": "Bubble Dash",
        "type": "ability",
        "description": "While underwater, the seahorse moves up to half its Swim Speed without provoking Opportunity Attacks."
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-shark",
    "name": "Giant Shark",
    "cr": 5,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 92,
    "hitDice": "8d12 + 40",
    "speed": "5 ft., swim 60 ft.",
    "abilities": {
      "str": 23,
      "dex": 11,
      "con": 21,
      "int": 1,
      "wis": 10,
      "cha": 5
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Blindsight 60 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The shark can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The shark makes two Bite attacks."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +9 (with Advantage if the target doesn't have all its Hit Points), reach 5 ft. Hit: 22 (3d10 + 6) Piercing damage.",
        "attackBonus": 9,
        "damage": "3d10+6 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-vulture",
    "name": "Giant Vulture",
    "cr": 1,
    "size": "Large",
    "type": "monstrosity",
    "alignment": "neutral evil",
    "armorClass": 10,
    "hitPoints": 25,
    "hitDice": "3d10 + 9",
    "speed": "10 ft., fly 60 ft.",
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 16,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The vulture has Advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic"
      }
    ],
    "actions": [
      {
        "name": "Gouge",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 9 (2d6 + 2) Piercing damage, and the target has the Poisoned condition until the end of its next turn.",
        "attackBonus": 4,
        "damage": "2d6+2 piercing"
      }
    ],
    "tags": [
      "monstrosity"
    ]
  },
  {
    "id": "giant-wasp",
    "name": "Giant Wasp",
    "cr": 0.5,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 22,
    "hitDice": "5d8",
    "speed": "10 ft., fly 50 ft.",
    "abilities": {
      "str": 10,
      "dex": 14,
      "con": 10,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "senses": [
      "Passive Perception 10"
    ],
    "traits": [
      {
        "name": "Flyby",
        "type": "trait",
        "description": "The wasp doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      }
    ],
    "actions": [
      {
        "name": "Sting",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage plus 5 (2d4) Poison damage.",
        "attackBonus": 4,
        "damage": "1d6+2 piercing+ 2d4 poison"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "giant-weasel",
    "name": "Giant Weasel",
    "cr": 0.125,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 9,
    "hitDice": "2d8",
    "speed": "40 ft., climb 30 ft.",
    "abilities": {
      "str": 11,
      "dex": 17,
      "con": 10,
      "int": 4,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Acrobatics +5",
      "Perception +3",
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Piercing damage.",
        "attackBonus": 5,
        "damage": "1d4+3 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "goat",
    "name": "Goat",
    "cr": 0,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 4,
    "hitDice": "1d8",
    "speed": "40 ft., climb 30 ft.",
    "abilities": {
      "str": 11,
      "dex": 10,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "skills": [
      "Perception +2"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "actions": [
      {
        "name": "Ram",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 1 Bludgeoning damage, or 2 (1d4) Bludgeoning damage if the goat moved 20+ feet straight toward the target immediately before the hit.",
        "attackBonus": 2,
        "damage": "1 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "goblin-boss",
    "name": "Goblin Boss",
    "cr": 1,
    "size": "Small",
    "type": "fey",
    "alignment": "chaotic neutral",
    "armorClass": 17,
    "hitPoints": 21,
    "hitDice": "6d6",
    "speed": "30 ft.",
    "abilities": {
      "str": 10,
      "dex": 15,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 10
    },
    "skills": [
      "Stealth +6"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The goblin makes two attacks, using Scimitar or Shortbow in any combination."
      },
      {
        "name": "Scimitar",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.",
        "attackBonus": 4,
        "damage": "1d6+2 slashing+ 1d4 slashing"
      },
      {
        "name": "Shortbow",
        "type": "attack",
        "description": "Ranged Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.",
        "attackBonus": 4,
        "damage": "1d6+2 piercing+ 1d4 piercing"
      },
      {
        "name": "Nimble Escape",
        "type": "ability",
        "description": "The goblin takes the Disengage or Hide action."
      },
      {
        "name": "Redirect Attack",
        "type": "ability",
        "description": "Trigger: A creature the goblin can see makes an attack roll against it. Response: The goblin chooses a Small or Medium ally within 5 feet of itself. The goblin and that ally swap places, and the ally becomes the target of the attack instead."
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "goblin-minion",
    "name": "Goblin Minion",
    "cr": 0.125,
    "size": "Small",
    "type": "fey",
    "alignment": "chaotic neutral",
    "armorClass": 12,
    "hitPoints": 7,
    "hitDice": "2d6",
    "speed": "30 ft.",
    "abilities": {
      "str": 8,
      "dex": 15,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 8
    },
    "skills": [
      "Stealth +6"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "languages": [
      "Common",
      "Goblin"
    ],
    "actions": [
      {
        "name": "Dagger",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +4, reach 5 ft. or range 20/60 ft. Hit: 4 (1d4 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d4+2 piercing"
      },
      {
        "name": "Nimble Escape",
        "type": "ability",
        "description": "The goblin takes the Disengage or Hide action."
      }
    ],
    "tags": [
      "fey"
    ]
  },
  {
    "id": "gold-dragon-wyrmling",
    "name": "Gold Dragon Wyrmling",
    "cr": 3,
    "size": "Medium",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 17,
    "hitPoints": 60,
    "hitDice": "8d8 + 24",
    "speed": "30 ft., fly 60 ft., swim 30 ft.",
    "abilities": {
      "str": 19,
      "dex": 14,
      "con": 17,
      "int": 14,
      "wis": 11,
      "cha": 16
    },
    "skills": [
      "Perception +4",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes two Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 9 (1d10 + 4) Slashing damage.",
        "attackBonus": 6,
        "damage": "1d10+4 slashing"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 13, each creature in a 15-foot Cone. Failure: 22 (4d10) Fire damage. Success: Half damage.",
        "damage": "4d10 fire",
        "saveDc": 13,
        "saveType": "dex"
      },
      {
        "name": "Weakening Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 13, each creature that isn't currently affected by this breath in a 15-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 2 (1d4) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 13,
        "saveType": "str"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "guardian-naga",
    "name": "Guardian Naga",
    "cr": 10,
    "size": "Large",
    "type": "celestial",
    "alignment": "lawful good",
    "armorClass": 18,
    "hitPoints": 136,
    "hitDice": "16d10 + 48",
    "speed": "40 ft., climb 40 ft., swim 40 ft.",
    "abilities": {
      "str": 19,
      "dex": 18,
      "con": 16,
      "int": 16,
      "wis": 19,
      "cha": 18
    },
    "skills": [
      "Arcana +11",
      "History +11",
      "Religion +11"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Celestial",
      "Common"
    ],
    "traits": [
      {
        "name": "Celestial Restoration",
        "type": "trait",
        "description": "If the naga dies, it returns to life in 1d6 days and regains all its Hit Points unless Dispel Evil and Good is cast on its remains."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed, paralyzed, poisoned, restrained"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The naga makes two Bite attacks. It can replace any attack with a use of Poisonous Spittle."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +8, reach 10 ft. Hit: 17 (2d12 + 4) Piercing damage plus 22 (4d10) Poison damage.",
        "attackBonus": 8,
        "damage": "2d12+4 piercing+ 4d10 poison"
      },
      {
        "name": "Poisonous Spittle",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 16, one creature the naga can see within 60 feet. Failure: 31 (7d8) Poison damage, and the target has the Blinded condition until the start of the naga's next turn. Success: Half damage only.",
        "damage": "7d8 poison",
        "saveDc": 16,
        "saveType": "con"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The naga casts one of the following spells, requiring no Somatic or Material components and using Wisdom as the spellcasting ability (spell save DC 16): At Will: Thaumaturgy; 1/Day Each: Clairvoyance, Cure Wounds (level 6 version), Flame Strike (level 6 version), Geas, True Seeing."
      }
    ],
    "tags": [
      "celestial",
      "boss"
    ]
  },
  {
    "id": "half-dragon",
    "name": "Half-Dragon",
    "cr": 5,
    "size": "Medium",
    "type": "dragon",
    "alignment": "neutral",
    "armorClass": 18,
    "hitPoints": 105,
    "hitDice": "14d8 + 42",
    "speed": "40 ft.",
    "abilities": {
      "str": 19,
      "dex": 14,
      "con": 16,
      "int": 10,
      "wis": 15,
      "cha": 14
    },
    "skills": [
      "Athletics +7",
      "Perception +5",
      "Stealth +5"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 15"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Draconic Origin",
        "type": "trait",
        "description": "The half-dragon is related to a type of dragon associated with one of the following damage types (GM's choice): Acid, Cold, Fire, Lightning, or Poison. This choice affects other aspects of the stat block."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The half-dragon makes two Claw attacks."
      },
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 6 (1d4 + 4) Slashing damage plus 7 (2d6) damage of the type chosen for the Draconic Origin trait.",
        "attackBonus": 7,
        "damage": "1d4+4 slashing+ 2d6"
      },
      {
        "name": "Dragon's Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: 28 (8d6) damage of the type chosen for the Draconic Origin trait. Success: Half damage.",
        "damage": "8d6",
        "saveDc": 14,
        "saveType": "dex"
      },
      {
        "name": "Leap",
        "type": "ability",
        "description": "The half-dragon jumps up to 30 feet by spending 10 feet of movement."
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "hawk",
    "name": "Hawk",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "10 ft., fly 60 ft.",
    "abilities": {
      "str": 5,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 14,
      "cha": 6
    },
    "skills": [
      "Perception +6"
    ],
    "senses": [
      "Passive Perception 16"
    ],
    "actions": [
      {
        "name": "Talons",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 1 Slashing damage.",
        "attackBonus": 5,
        "damage": "1 slashing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "hippopotamus",
    "name": "Hippopotamus",
    "cr": 4,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 14,
    "hitPoints": 82,
    "hitDice": "11d10 + 22",
    "speed": "30 ft., swim 30 ft.",
    "abilities": {
      "str": 21,
      "dex": 7,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Hold Breath",
        "type": "trait",
        "description": "The hippopotamus can hold its breath for 10 minutes."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The hippopotamus makes two Bite attacks."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 5 ft. Hit: 16 (2d10 + 5) Piercing damage.",
        "attackBonus": 7,
        "damage": "2d10+5 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "homunculus",
    "name": "Homunculus",
    "cr": 0,
    "size": "Tiny",
    "type": "construct",
    "alignment": "neutral",
    "armorClass": 13,
    "hitPoints": 4,
    "hitDice": "1d4 + 2",
    "speed": "20 ft., fly 40 ft.",
    "abilities": {
      "str": 4,
      "dex": 15,
      "con": 14,
      "int": 10,
      "wis": 10,
      "cha": 7
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Common"
    ],
    "traits": [
      {
        "name": "Telepathic Bond",
        "type": "trait",
        "description": "While the homunculus is on the same plane of existence as its master, the two of them can communicate telepathically with each other."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Piercing damage, and the target is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target has the Poisoned condition until the end of the homunculus's next turn. Failure by 5 or More: The target has the Poisoned condition for 1 minute. While Poisoned, the target has the Unconscious condition, which ends early if the target takes any damage.",
        "attackBonus": 4,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "construct"
    ]
  },
  {
    "id": "hyena",
    "name": "Hyena",
    "cr": 0,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 5,
    "hitDice": "1d8 + 1",
    "speed": "50 ft.",
    "abilities": {
      "str": 11,
      "dex": 13,
      "con": 12,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The hyena has Advantage on an attack roll against a creature if at least one of the hyena's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 3 (1d6) Piercing damage.",
        "attackBonus": 2,
        "damage": "1d6 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "jackal",
    "name": "Jackal",
    "cr": 0,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 3,
    "hitDice": "1d6",
    "speed": "40 ft.",
    "abilities": {
      "str": 8,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "skills": [
      "Perception +5",
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 90 ft.",
      "Passive Perception 15"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +1, reach 5 ft. Hit: 1 (1d4 - 1) Piercing damage.",
        "attackBonus": 1,
        "damage": "1d4-1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "killer-whale",
    "name": "Killer Whale",
    "cr": 3,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 90,
    "hitDice": "12d12 + 12",
    "speed": "5 ft., swim 60 ft.",
    "abilities": {
      "str": 19,
      "dex": 14,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +3",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 120 ft.",
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Hold Breath",
        "type": "trait",
        "description": "The whale can hold its breath for 30 minutes."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 21 (5d6 + 4) Piercing damage.",
        "attackBonus": 6,
        "damage": "5d6+4 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "lizard",
    "name": "Lizard",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 2,
    "hitDice": "1d4",
    "speed": "20 ft., climb 20 ft.",
    "abilities": {
      "str": 2,
      "dex": 11,
      "con": 10,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Spider Climb",
        "type": "trait",
        "description": "The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 2,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "magma-mephit",
    "name": "Magma Mephit",
    "cr": 0.5,
    "size": "Small",
    "type": "elemental",
    "alignment": "neutral evil",
    "armorClass": 11,
    "hitPoints": 18,
    "hitDice": "4d6 + 4",
    "speed": "30 ft., fly 30 ft.",
    "abilities": {
      "str": 8,
      "dex": 12,
      "con": 12,
      "int": 7,
      "wis": 10,
      "cha": 10
    },
    "skills": [
      "Stealth +3"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 10"
    ],
    "languages": [
      "Primordial"
    ],
    "traits": [
      {
        "name": "Death Burst",
        "type": "trait",
        "description": "The mephit explodes when it dies. Dexterity Saving Throw: DC 11, each creature in a 5-foot Emanation originating from the mephit. Failure: 7 (2d6) Fire damage. Success: Half damage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire, poison"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "cold"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Slashing damage plus 3 (1d6) Fire damage.",
        "attackBonus": 3,
        "damage": "1d4+1 slashing+ 1d6 fire"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: 7 (2d6) Fire damage. Success: Half damage.",
        "damage": "2d6 fire",
        "saveDc": 11,
        "saveType": "dex"
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "merfolk-skirmisher",
    "name": "Merfolk Skirmisher",
    "cr": 0.125,
    "size": "Medium",
    "type": "elemental",
    "alignment": "neutral",
    "armorClass": 11,
    "hitPoints": 11,
    "hitDice": "2d8 + 2",
    "speed": "10 ft., swim 40 ft.",
    "abilities": {
      "str": 10,
      "dex": 13,
      "con": 12,
      "int": 11,
      "wis": 14,
      "cha": 12
    },
    "senses": [
      "Passive Perception 12"
    ],
    "languages": [
      "Common",
      "Primordial"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The merfolk can breathe air and water."
      }
    ],
    "actions": [
      {
        "name": "Ocean Spear",
        "type": "attack",
        "description": "Melee or Ranged Attack Roll: +2, reach 5 ft. or range 20/60 ft. Hit: 3 (1d6) Piercing damage plus 2 (1d4) Cold damage. If the target is a creature, its Speed decreases by 10 feet until the end of its next turn. Hit or Miss: The spear magically returns to the merfolk's hand immediately after a ranged attack.",
        "attackBonus": 2,
        "damage": "1d6 piercing+ 1d4 cold"
      }
    ],
    "tags": [
      "elemental"
    ]
  },
  {
    "id": "minotaur-skeleton",
    "name": "Minotaur Skeleton",
    "cr": 2,
    "size": "Large",
    "type": "undead",
    "alignment": "lawful evil",
    "armorClass": 12,
    "hitPoints": 45,
    "hitDice": "6d10 + 12",
    "speed": "40 ft.",
    "abilities": {
      "str": 18,
      "dex": 11,
      "con": 15,
      "int": 6,
      "wis": 8,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "languages": [
      "Abyssal"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "bludgeoning"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Gore",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 11 (2d6 + 4) Piercing damage. If the target is a Large or smaller creature and the skeleton moved 20+ feet straight toward it immediately before the hit, the target takes an extra 9 (2d8) Piercing damage and has the Prone condition.",
        "attackBonus": 6,
        "damage": "2d6+4 piercing+ 2d8 piercing"
      },
      {
        "name": "Slam",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 15 (2d10 + 4) Bludgeoning damage.",
        "attackBonus": 6,
        "damage": "2d10+4 bludgeoning"
      }
    ],
    "tags": [
      "undead"
    ]
  },
  {
    "id": "mule",
    "name": "Mule",
    "cr": 0.125,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 11,
    "hitDice": "2d8 + 2",
    "speed": "40 ft.",
    "abilities": {
      "str": 14,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "senses": [
      "Passive Perception 10"
    ],
    "traits": [
      {
        "name": "Beast of Burden",
        "type": "trait",
        "description": "The mule counts as one size larger for the purpose of determining its carrying capacity."
      }
    ],
    "actions": [
      {
        "name": "Hooves",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Bludgeoning damage.",
        "attackBonus": 4,
        "damage": "1d4+2 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "nalfeshnee",
    "name": "Nalfeshnee",
    "cr": 13,
    "size": "Large",
    "type": "fiend",
    "alignment": "chaotic evil",
    "armorClass": 18,
    "hitPoints": 184,
    "hitDice": "16d10 + 96",
    "speed": "20 ft., fly 30 ft.",
    "abilities": {
      "str": 21,
      "dex": 10,
      "con": 22,
      "int": 19,
      "wis": 12,
      "cha": 15
    },
    "senses": [
      "Truesight 120 ft.",
      "Passive Perception 11"
    ],
    "languages": [
      "Abyssal"
    ],
    "traits": [
      {
        "name": "Demonic Restoration",
        "type": "trait",
        "description": "If the nalfeshnee dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "The nalfeshnee has Advantage on saving throws against spells and other magical effects."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "cold, fire, lightning"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "frightened, poisoned"
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "Advantage on saving throws against spells and other magical effects."
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The nalfeshnee makes three Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 10 ft. Hit: 16 (2d10 + 5) Slashing damage plus 11 (2d10) Force damage.",
        "attackBonus": 10,
        "damage": "2d10+5 slashing+ 2d10 force"
      },
      {
        "name": "Teleport",
        "type": "ability",
        "description": "The nalfeshnee teleports up to 120 feet to an unoccupied space it can see."
      },
      {
        "name": "Horror Nimbus",
        "type": "attack",
        "description": "Wisdom Saving Throw: DC 15, each creature in a 15-foot Emanation originating from the nalfeshnee. Failure: 28 (8d6) Psychic damage, and the target has the Frightened condition for 1 minute, until it takes damage, or until it ends its turn with the nalfeshnee out of line of sight. Success: The target is immune to this nalfeshnee's Horror Nimbus for 24 hours.",
        "damage": "8d6 psychic",
        "saveDc": 15,
        "saveType": "wis"
      },
      {
        "name": "Pursuit",
        "type": "ability",
        "description": "Trigger: Another creature the nalfeshnee can see ends its move within 120 feet of the nalfeshnee. Response: The nalfeshnee uses Teleport, but its destination space must be within 10 feet of the triggering creature."
      }
    ],
    "tags": [
      "fiend",
      "boss"
    ]
  },
  {
    "id": "octopus",
    "name": "Octopus",
    "cr": 0,
    "size": "Small",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 3,
    "hitDice": "1d6",
    "speed": "5 ft., swim 30 ft.",
    "abilities": {
      "str": 4,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 10,
      "cha": 4
    },
    "skills": [
      "Perception +2",
      "Stealth +6"
    ],
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Compression",
        "type": "trait",
        "description": "The octopus can move through a space as narrow as 1 inch without expending extra movement to do so."
      },
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The octopus can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Tentacles",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Bludgeoning damage.",
        "attackBonus": 4,
        "damage": "1 bludgeoning"
      },
      {
        "name": "Ink Cloud",
        "type": "ability",
        "description": "Trigger: A creature ends its turn within 5 feet of the octopus while underwater. Response: The octopus releases ink that fills a 5-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "ogre-zombie",
    "name": "Ogre Zombie",
    "cr": 2,
    "size": "Large",
    "type": "undead",
    "alignment": "neutral evil",
    "armorClass": 8,
    "hitPoints": 85,
    "hitDice": "9d10 + 36",
    "speed": "30 ft.",
    "abilities": {
      "str": 19,
      "dex": 6,
      "con": 18,
      "int": 3,
      "wis": 6,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 8"
    ],
    "languages": [
      "Common",
      "Giant"
    ],
    "traits": [
      {
        "name": "Undead Fortitude",
        "type": "trait",
        "description": "If damage reduces the zombie to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a successful save, the zombie drops to 1 Hit Point instead."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Slam",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 13 (2d8 + 4) Bludgeoning damage.",
        "attackBonus": 6,
        "damage": "2d8+4 bludgeoning"
      }
    ],
    "tags": [
      "undead"
    ]
  },
  {
    "id": "owl",
    "name": "Owl",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "5 ft., fly 60 ft.",
    "abilities": {
      "str": 3,
      "dex": 13,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "skills": [
      "Perception +5",
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 120 ft.",
      "Passive Perception 15"
    ],
    "traits": [
      {
        "name": "Flyby",
        "type": "trait",
        "description": "The owl doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      }
    ],
    "actions": [
      {
        "name": "Talons",
        "type": "attack",
        "description": "Melee Attack Roll: +3, reach 5 ft. Hit: 1 Slashing damage.",
        "attackBonus": 3,
        "damage": "1 slashing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "piranha",
    "name": "Piranha",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "5 ft., swim 40 ft.",
    "abilities": {
      "str": 2,
      "dex": 16,
      "con": 9,
      "int": 1,
      "wis": 7,
      "cha": 2
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 8"
    ],
    "traits": [
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The piranha can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5 (with Advantage if the target doesn't have all its Hit Points), reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 5,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "plesiosaurus",
    "name": "Plesiosaurus",
    "cr": 2,
    "size": "Large",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 68,
    "hitDice": "8d10 + 24",
    "speed": "20 ft., swim 40 ft.",
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": [
      "Perception +3",
      "Stealth +4"
    ],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Hold Breath",
        "type": "trait",
        "description": "The plesiosaurus can hold its breath for 1 hour."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 10 ft. Hit: 11 (2d6 + 4) Piercing damage.",
        "attackBonus": 6,
        "damage": "2d6+4 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "pony",
    "name": "Pony",
    "cr": 0.125,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 11,
    "hitDice": "2d8 + 2",
    "speed": "40 ft.",
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "senses": [
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Hooves",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Bludgeoning damage.",
        "attackBonus": 4,
        "damage": "1d4+2 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "pteranodon",
    "name": "Pteranodon",
    "cr": 0.25,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 13,
    "hitDice": "3d8",
    "speed": "10 ft., fly 60 ft.",
    "abilities": {
      "str": 12,
      "dex": 15,
      "con": 10,
      "int": 2,
      "wis": 9,
      "cha": 5
    },
    "skills": [
      "Perception +1"
    ],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": [
      {
        "name": "Flyby",
        "type": "trait",
        "description": "The pteranodon doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "1d8+2 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "raven",
    "name": "Raven",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 2,
    "hitDice": "1d4",
    "speed": "10 ft., fly 50 ft.",
    "abilities": {
      "str": 2,
      "dex": 14,
      "con": 10,
      "int": 5,
      "wis": 13,
      "cha": 6
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Mimicry",
        "type": "trait",
        "description": "The raven can mimic simple sounds it has heard, such as a whisper or chitter. A hearer can discern the sounds are imitations with a successful DC 10 Wisdom (Insight) check."
      }
    ],
    "actions": [
      {
        "name": "Beak",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 4,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "reef-shark",
    "name": "Reef Shark",
    "cr": 0.5,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 22,
    "hitDice": "4d8 + 4",
    "speed": "5 ft., swim 30 ft.",
    "abilities": {
      "str": 14,
      "dex": 15,
      "con": 13,
      "int": 1,
      "wis": 10,
      "cha": 4
    },
    "skills": [
      "Perception +2"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The shark has Advantage on an attack roll against a creature if at least one of the shark's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      },
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The shark can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (2d4 + 2) Piercing damage.",
        "attackBonus": 4,
        "damage": "2d4+2 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "remorhaz",
    "name": "Remorhaz",
    "cr": 11,
    "size": "Huge",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 17,
    "hitPoints": 195,
    "hitDice": "17d12 + 85",
    "speed": "40 ft., burrow 30 ft.",
    "abilities": {
      "str": 24,
      "dex": 13,
      "con": 21,
      "int": 4,
      "wis": 10,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Tremorsense 60 ft.",
      "Passive Perception 10"
    ],
    "traits": [
      {
        "name": "Heat Aura",
        "type": "trait",
        "description": "At the end of each of the remorhaz's turns, each creature in a 5-foot Emanation originating from the remorhaz takes 16 (3d10) Fire damage."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold, fire"
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +11, reach 10 ft. Hit: 18 (2d10 + 7) Piercing damage plus 14 (4d6) Fire damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 17), and it has the Restrained condition until the grapple ends.",
        "attackBonus": 11,
        "damage": "2d10+7 piercing+ 4d6 fire"
      },
      {
        "name": "Swallow",
        "type": "attack",
        "description": "Strength Saving Throw: DC 19, one Large or smaller creature Grappled by the remorhaz (it can have up to two creatures swallowed at a time). Failure: The target is swallowed by the remorhaz, and the Grappled condition ends. A swallowed creature has the Blinded and Restrained conditions, it has Total Cover against attacks and other effects outside the remorhaz, and it takes 10 (3d6) Acid damage plus 10 (3d6) Fire damage at the start of each of the remorhaz's turns. If the remorhaz takes 30 damage or more on a single turn from a creature inside it, the remorhaz must succeed on a DC 15 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, each of which falls in a space within 5 feet of the remorhaz and has the Prone condition. If the remorhaz dies, any swallowed creature no longer has the Restrained condition and can escape from the corpse by using 15 feet of movement, exiting Prone.",
        "damage": "3d6 acid+ 3d6 fire",
        "saveDc": 19,
        "saveType": "str"
      }
    ],
    "tags": [
      "monstrosity",
      "boss"
    ]
  },
  {
    "id": "roc",
    "name": "Roc",
    "cr": 11,
    "size": "Gargantuan",
    "type": "monstrosity",
    "alignment": "unaligned",
    "armorClass": 15,
    "hitPoints": 248,
    "hitDice": "16d20 + 80",
    "speed": "20 ft., fly 120 ft.",
    "abilities": {
      "str": 28,
      "dex": 10,
      "con": 20,
      "int": 3,
      "wis": 10,
      "cha": 9
    },
    "skills": [
      "Perception +8"
    ],
    "senses": [
      "Passive Perception 18"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The roc makes two Beak attacks. It can replace one attack with a Talons attack."
      },
      {
        "name": "Beak",
        "type": "attack",
        "description": "Melee Attack Roll: +13, reach 10 ft. Hit: 28 (3d12 + 9) Piercing damage.",
        "attackBonus": 13,
        "damage": "3d12+9 piercing"
      },
      {
        "name": "Talons",
        "type": "attack",
        "description": "Melee Attack Roll: +13, reach 5 ft. Hit: 23 (4d6 + 9) Slashing damage. If the target is a Huge or smaller creature, it has the Grappled condition (escape DC 19) from both talons, and it has the Restrained condition until the grapple ends.",
        "attackBonus": 13,
        "damage": "4d6+9 slashing"
      },
      {
        "name": "Swoop",
        "type": "ability",
        "description": "If the roc has a creature Grappled, the roc flies up to half its Fly Speed without provoking Opportunity Attacks and drops that creature."
      }
    ],
    "tags": [
      "monstrosity",
      "boss"
    ]
  },
  {
    "id": "scorpion",
    "name": "Scorpion",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 11,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "10 ft.",
    "abilities": {
      "str": 2,
      "dex": 11,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "senses": [
      "Blindsight 10 ft.",
      "Passive Perception 9"
    ],
    "actions": [
      {
        "name": "Sting",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 1 Piercing damage plus 3 (1d6) Poison damage.",
        "attackBonus": 2,
        "damage": "1 piercing+ 1d6 poison"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "seahorse",
    "name": "Seahorse",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "5 ft., swim 20 ft.",
    "abilities": {
      "str": 1,
      "dex": 12,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "skills": [
      "Perception +2",
      "Stealth +5"
    ],
    "senses": [
      "Passive Perception 12"
    ],
    "traits": [
      {
        "name": "Water Breathing",
        "type": "trait",
        "description": "The seahorse can breathe only underwater."
      }
    ],
    "actions": [
      {
        "name": "Bubble Dash",
        "type": "ability",
        "description": "While underwater, the seahorse moves up to its Swim Speed without provoking Opportunity Attacks."
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "silver-dragon-wyrmling",
    "name": "Silver Dragon Wyrmling",
    "cr": 2,
    "size": "Medium",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 17,
    "hitPoints": 45,
    "hitDice": "6d8 + 18",
    "speed": "30 ft., fly 60 ft.",
    "abilities": {
      "str": 19,
      "dex": 10,
      "con": 17,
      "int": 12,
      "wis": 11,
      "cha": 15
    },
    "skills": [
      "Perception +4",
      "Stealth +2"
    ],
    "senses": [
      "Blindsight 10 ft.",
      "Darkvision 60 ft.",
      "Passive Perception 14"
    ],
    "languages": [
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes two Rend attacks."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 9 (1d10 + 4) Piercing damage.",
        "attackBonus": 6,
        "damage": "1d10+4 piercing"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 13, each creature in a 15-foot Cone. Failure: 18 (4d8) Cold damage. Success: Half damage.",
        "damage": "4d8 cold",
        "saveDc": 13,
        "saveType": "con"
      },
      {
        "name": "Paralyzing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 13, each creature in a 15-foot Cone. First Failure: The target has the Incapacitated condition until the end of its next turn, when it repeats the save. Second Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 13,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "sphinx-of-lore",
    "name": "Sphinx of Lore",
    "cr": 11,
    "size": "Large",
    "type": "celestial",
    "alignment": "lawful neutral",
    "armorClass": 17,
    "hitPoints": 170,
    "hitDice": "20d10 + 60",
    "speed": "40 ft., fly 60 ft.",
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 18,
      "wis": 18,
      "cha": 18
    },
    "skills": [
      "Arcana +12",
      "History +12",
      "Perception +8",
      "Religion +12"
    ],
    "senses": [
      "Truesight 120 ft.",
      "Passive Perception 18"
    ],
    "languages": [
      "Celestial",
      "Common"
    ],
    "traits": [
      {
        "name": "Inscrutable",
        "type": "trait",
        "description": "No magic can observe the sphinx remotely or detect its thoughts without its permission. Wisdom (Insight) checks made to ascertain its intentions or sincerity are made with Disadvantage."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "Legendary Resistance (3/Day, or 4/Day in Lair). If the sphinx fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic, radiant"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "psychic"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed, frightened"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The sphinx makes three Claw attacks."
      },
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +8, reach 5 ft. Hit: 14 (3d6 + 4) Slashing damage.",
        "attackBonus": 8,
        "damage": "3d6+4 slashing"
      },
      {
        "name": "Mind-Rending Roar",
        "type": "attack",
        "description": "Wisdom Saving Throw: DC 16, each enemy in a 300-foot Emanation originating from the sphinx. Failure: 35 (10d6) Psychic damage, and the target has the Incapacitated condition until the start of the sphinx's next turn.",
        "damage": "10d6 psychic",
        "saveDc": 16,
        "saveType": "wis"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The sphinx casts one of the following spells, requiring no Material components and using Intelligence as the spellcasting ability (spell save DC 16): At Will: Detect Magic, Identify, Mage Hand, Minor Illusion, Prestidigitation. 1/Day Each: Dispel Magic, Legend Lore, Locate Object, Plane Shift, Remove Curse, Tongues."
      }
    ],
    "legendaryActions": [
      {
        "name": "Arcane Prowl",
        "type": "ability",
        "description": "The sphinx can teleport up to 30 feet to an unoccupied space it can see, and it makes one Claw attack."
      },
      {
        "name": "Weight of Years",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 16, one creature the sphinx can see within 120 feet. Failure: The target gains 1 Exhaustion level. While the target has any Exhaustion levels, it appears 3d10 years older. Failure or Success: The sphinx can't take this action again until the start of its next turn.",
        "saveDc": 16,
        "saveType": "con"
      }
    ],
    "tags": [
      "celestial",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "sphinx-of-valor",
    "name": "Sphinx of Valor",
    "cr": 17,
    "size": "Large",
    "type": "celestial",
    "alignment": "lawful neutral",
    "armorClass": 17,
    "hitPoints": 199,
    "hitDice": "19d10 + 95",
    "speed": "40 ft., fly 60 ft.",
    "abilities": {
      "str": 22,
      "dex": 10,
      "con": 20,
      "int": 16,
      "wis": 23,
      "cha": 18
    },
    "skills": [
      "Arcana +9",
      "Perception +12",
      "Religion +15"
    ],
    "senses": [
      "Truesight 120 ft.",
      "Passive Perception 22"
    ],
    "languages": [
      "Celestial",
      "Common"
    ],
    "traits": [
      {
        "name": "Inscrutable",
        "type": "trait",
        "description": "No magic can observe the sphinx remotely or detect its thoughts without its permission. Wisdom (Insight) checks made to ascertain its intentions or sincerity are made with Disadvantage."
      },
      {
        "name": "Legendary Resistance (3/Day, or 4/Day in Lair)",
        "type": "trait",
        "description": "If the sphinx fails a saving throw, it can choose to succeed instead."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic, radiant"
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "psychic"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed, frightened"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The sphinx makes two Claw attacks and uses Roar."
      },
      {
        "name": "Claw",
        "type": "attack",
        "description": "Melee Attack Roll: +12, reach 5 ft. Hit: 20 (4d6 + 6) Slashing damage.",
        "attackBonus": 12,
        "damage": "4d6+6 slashing"
      },
      {
        "name": "Roar (3/Day)",
        "type": "ability",
        "description": "The sphinx emits a magical roar. Whenever it roars, the roar has a different effect, as detailed below (the sequence resets when it takes a Long Rest): First Roar. Wisdom Saving Throw: DC 20, each enemy in a 500-foot Emanation originating from the sphinx. Failure: The target has the Frightened condition for 1 minute. Second Roar. Wisdom Saving Throw: DC 20, each enemy in a 500-foot Emanation originating from the sphinx. Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically. Third Roar. Constitution Saving Throw: DC 20, each enemy in a 500-foot Emanation originating from the sphinx. Failure: 44 (8d10) Thunder damage, and the target has the Prone condition. Success: Half damage only.",
        "saveDc": 20,
        "saveType": "wis"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The sphinx casts one of the following spells, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 20): At Will: Detect Evil and Good, Thaumaturgy. 1/Day Each: Detect Magic, Dispel Magic, Greater Restoration, Heroes' Feast, Zone of Truth."
      }
    ],
    "legendaryActions": [
      {
        "name": "Arcane Prowl",
        "type": "ability",
        "description": "The sphinx can teleport up to 30 feet to an unoccupied space it can see, and it makes one Claw attack."
      },
      {
        "name": "Weight of Years",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 16, one creature the sphinx can see within 120 feet. Failure: The target gains 1 Exhaustion level. While the target has any Exhaustion levels, it appears 3d10 years older. Failure or Success: The sphinx can't take this action again until the start of its next turn.",
        "saveDc": 16,
        "saveType": "con"
      }
    ],
    "tags": [
      "celestial",
      "boss",
      "legendary"
    ]
  },
  {
    "id": "sphinx-of-wonder",
    "name": "Sphinx of Wonder",
    "cr": 1,
    "size": "Tiny",
    "type": "celestial",
    "alignment": "lawful good",
    "armorClass": 13,
    "hitPoints": 24,
    "hitDice": "7d4 + 7",
    "speed": "20 ft., fly 40 ft.",
    "abilities": {
      "str": 6,
      "dex": 17,
      "con": 13,
      "int": 15,
      "wis": 12,
      "cha": 11
    },
    "skills": [
      "Arcana +4",
      "Religion +4",
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 11"
    ],
    "languages": [
      "Celestial",
      "Common"
    ],
    "traits": [
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "The sphinx has Advantage on saving throws against spells and other magical effects."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "necrotic, psychic, radiant"
      },
      {
        "name": "Magic Resistance",
        "type": "trait",
        "description": "Advantage on saving throws against spells and other magical effects."
      }
    ],
    "actions": [
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Slashing damage plus 7 (2d6) Radiant damage.",
        "attackBonus": 5,
        "damage": "1d4+3 slashing+ 2d6 radiant"
      },
      {
        "name": "Burst of Ingenuity",
        "type": "ability",
        "description": "Trigger: The sphinx or another creature within 30 feet makes an ability check or a saving throw. Response: The sphinx adds 2 to the roll."
      }
    ],
    "tags": [
      "celestial"
    ]
  },
  {
    "id": "spider",
    "name": "Spider",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 12,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "20 ft., climb 20 ft.",
    "abilities": {
      "str": 2,
      "dex": 14,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "skills": [
      "Stealth +4"
    ],
    "senses": [
      "Darkvision 30 ft.",
      "Passive Perception 10"
    ],
    "traits": [
      {
        "name": "Spider Climb",
        "type": "trait",
        "description": "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      },
      {
        "name": "Web Walker",
        "type": "trait",
        "description": "The spider ignores movement restrictions caused by webs, and the spider knows the location of any other creature in contact with the same web."
      }
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Piercing damage plus 2 (1d4) Poison damage.",
        "attackBonus": 4,
        "damage": "1 piercing+ 1d4 poison"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "spirit-naga",
    "name": "Spirit Naga",
    "cr": 8,
    "size": "Large",
    "type": "fiend",
    "alignment": "chaotic evil",
    "armorClass": 17,
    "hitPoints": 135,
    "hitDice": "18d10 + 36",
    "speed": "40 ft.",
    "abilities": {
      "str": 18,
      "dex": 17,
      "con": 14,
      "int": 16,
      "wis": 15,
      "cha": 16
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 12"
    ],
    "languages": [
      "Abyssal",
      "Common"
    ],
    "traits": [
      {
        "name": "Fiendish Restoration",
        "type": "trait",
        "description": "If it dies, the naga returns to life in 1d6 days and regains all its Hit Points. Only a Wish spell can prevent this trait from functioning."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "charmed, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The naga makes three attacks, using Bite or Necrotic Ray in any combination."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 7 (1d6 + 4) Piercing damage plus 14 (4d6) Poison damage.",
        "attackBonus": 7,
        "damage": "1d6+4 piercing+ 4d6 poison"
      },
      {
        "name": "Necrotic Ray",
        "type": "attack",
        "description": "Ranged Attack Roll: +6, range 60 ft. Hit: 21 (6d6) Necrotic damage.",
        "attackBonus": 6,
        "damage": "6d6 necrotic"
      },
      {
        "name": "Spellcasting",
        "type": "ability",
        "description": "The naga casts one of the following spells, requiring no Somatic or Material components and using Intelligence as the spellcasting ability (spell save DC 14): At Will: Detect Magic, Mage Hand, Minor Illusion, Water Breathing. 2/Day Each: Detect Thoughts, Dimension Door, Hold Person (level 3 version), Lightning Bolt (level 4 version)."
      }
    ],
    "tags": [
      "fiend"
    ]
  },
  {
    "id": "succubus",
    "name": "Succubus",
    "cr": 4,
    "size": "Medium",
    "type": "fiend",
    "alignment": "neutral evil",
    "armorClass": 15,
    "hitPoints": 71,
    "hitDice": "13d8 + 13",
    "speed": "30 ft., fly 60 ft.",
    "abilities": {
      "str": 8,
      "dex": 17,
      "con": 13,
      "int": 15,
      "wis": 12,
      "cha": 20
    },
    "skills": [
      "Deception +9",
      "Insight +5",
      "Perception +5",
      "Persuasion +9",
      "Stealth +7"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 15"
    ],
    "languages": [
      "Abyssal",
      "Common",
      "Infernal"
    ],
    "traits": [
      {
        "name": "Incubus Form",
        "type": "trait",
        "description": "When the succubus finishes a Long Rest, it can shape-shift into an Incubus, using that stat block instead of this one."
      },
      {
        "name": "Damage Resistances",
        "type": "trait",
        "description": "cold, fire, poison, psychic"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The succubus makes one Fiendish Touch attack and uses Charm or Draining Kiss."
      },
      {
        "name": "Fiendish Touch",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 5 ft. Hit: 16 (2d10 + 5) Psychic damage.",
        "attackBonus": 7,
        "damage": "2d10+5 psychic"
      },
      {
        "name": "Charm",
        "type": "ability",
        "description": "The succubus casts Dominate Person (level 8 version), requiring no spell components and using Charisma as the spellcasting ability (spell save DC 15)."
      },
      {
        "name": "Draining Kiss",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 15, one creature Charmed by the succubus within 5 feet. Failure: 13 (3d8) Psychic damage. Success: Half damage. Failure or Success: The target's Hit Point maximum decreases by an amount equal to the damage taken.",
        "damage": "3d8 psychic",
        "saveDc": 15,
        "saveType": "con"
      },
      {
        "name": "Shape-Shift",
        "type": "ability",
        "description": "The succubus shape-shifts into a Medium or Small Humanoid, or it returns to its true form. Its game statistics are the same in each form, except its Fly Speed is available only in its true form. Any equipment it is wearing or carrying isn't transformed."
      }
    ],
    "tags": [
      "fiend"
    ]
  },
  {
    "id": "triceratops",
    "name": "Triceratops",
    "cr": 5,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 14,
    "hitPoints": 114,
    "hitDice": "12d12 + 36",
    "speed": "50 ft.",
    "abilities": {
      "str": 22,
      "dex": 9,
      "con": 17,
      "int": 2,
      "wis": 11,
      "cha": 5
    },
    "senses": [
      "Passive Perception 10"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The triceratops makes two Gore attacks."
      },
      {
        "name": "Gore",
        "type": "attack",
        "description": "Melee Attack Roll: +9, reach 5 ft. Hit: 19 (2d12 + 6) Piercing damage. If the target is Huge or smaller and the triceratops moved 20+ feet straight toward it immediately before the hit, the target takes an extra 9 (2d8) Piercing damage and has the Prone condition.",
        "attackBonus": 9,
        "damage": "2d12+6 piercing+ 2d8 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "troll-limb",
    "name": "Troll Limb",
    "cr": 0.5,
    "size": "Small",
    "type": "giant",
    "alignment": "chaotic evil",
    "armorClass": 13,
    "hitPoints": 14,
    "hitDice": "4d6",
    "speed": "20 ft.",
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 10,
      "int": 1,
      "wis": 9,
      "cha": 1
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Regeneration",
        "type": "trait",
        "description": "The limb regains 5 Hit Points at the start of each of its turns. If the limb takes Acid or Fire damage, this trait doesn't function on the limb's next turn. The limb dies only if it starts its turn with 0 Hit Points and doesn't regenerate."
      },
      {
        "name": "Troll Spawn",
        "type": "trait",
        "description": "The limb uncannily has the same senses as a whole troll. If the limb isn't destroyed within 24 hours, roll 1d12. On a 12, the limb turns into a Troll. Otherwise, the limb withers away."
      }
    ],
    "actions": [
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 9 (2d4 + 4) Slashing damage.",
        "attackBonus": 6,
        "damage": "2d4+4 slashing"
      }
    ],
    "tags": [
      "giant"
    ]
  },
  {
    "id": "tyrannosaurus-rex",
    "name": "Tyrannosaurus Rex",
    "cr": 8,
    "size": "Huge",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 136,
    "hitDice": "13d12 + 52",
    "speed": "50 ft.",
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 19,
      "int": 2,
      "wis": 12,
      "cha": 9
    },
    "skills": [
      "Perception +4"
    ],
    "senses": [
      "Passive Perception 14"
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The tyrannosaurus makes one Bite attack and one Tail attack."
      },
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 10 ft. Hit: 33 (4d12 + 7) Piercing damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 17). While Grappled, the target has the Restrained condition and can't be targeted by the tyrannosaurus's Tail.",
        "attackBonus": 10,
        "damage": "4d12+7 piercing"
      },
      {
        "name": "Tail",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 15 ft. Hit: 25 (4d8 + 7) Bludgeoning damage. If the target is a Huge or smaller creature, it has the Prone condition.",
        "attackBonus": 10,
        "damage": "4d8+7 bludgeoning"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "vulture",
    "name": "Vulture",
    "cr": 0,
    "size": "Medium",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 10,
    "hitPoints": 5,
    "hitDice": "1d8 + 1",
    "speed": "10 ft., fly 50 ft.",
    "abilities": {
      "str": 7,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "skills": [
      "Perception +3"
    ],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": [
      {
        "name": "Pack Tactics",
        "type": "trait",
        "description": "The vulture has Advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      }
    ],
    "actions": [
      {
        "name": "Beak",
        "type": "attack",
        "description": "Melee Attack Roll: +2, reach 5 ft. Hit: 2 (1d4) Piercing damage.",
        "attackBonus": 2,
        "damage": "1d4 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "warhorse-skeleton",
    "name": "Warhorse Skeleton",
    "cr": 0.5,
    "size": "Large",
    "type": "undead",
    "alignment": "lawful evil",
    "armorClass": 13,
    "hitPoints": 22,
    "hitDice": "3d10 + 6",
    "speed": "60 ft.",
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 15,
      "int": 2,
      "wis": 8,
      "cha": 5
    },
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 9"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "poison"
      },
      {
        "name": "Damage Vulnerabilities",
        "type": "trait",
        "description": "bludgeoning"
      },
      {
        "name": "Condition Immunities",
        "type": "trait",
        "description": "exhaustion, poisoned"
      }
    ],
    "actions": [
      {
        "name": "Hooves",
        "type": "attack",
        "description": "Melee Attack Roll: +6, reach 5 ft. Hit: 7 (1d6 + 4) Bludgeoning damage. If the target is a Large or smaller creature and the skeleton moved 20+ feet straight toward it immediately before the hit, the target has the Prone condition.",
        "attackBonus": 6,
        "damage": "1d6+4 bludgeoning"
      }
    ],
    "tags": [
      "undead"
    ]
  },
  {
    "id": "weasel",
    "name": "Weasel",
    "cr": 0,
    "size": "Tiny",
    "type": "beast",
    "alignment": "unaligned",
    "armorClass": 13,
    "hitPoints": 1,
    "hitDice": "1d4 - 1",
    "speed": "30 ft., climb 30 ft.",
    "abilities": {
      "str": 3,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 3
    },
    "skills": [
      "Acrobatics +5",
      "Perception +3",
      "Stealth +5"
    ],
    "senses": [
      "Darkvision 60 ft.",
      "Passive Perception 13"
    ],
    "actions": [
      {
        "name": "Bite",
        "type": "attack",
        "description": "Melee Attack Roll: +5, reach 5 ft. Hit: 1 Piercing damage.",
        "attackBonus": 5,
        "damage": "1 piercing"
      }
    ],
    "tags": [
      "beast"
    ]
  },
  {
    "id": "young-brass-dragon",
    "name": "Young Brass Dragon",
    "cr": 6,
    "size": "Large",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 17,
    "hitPoints": 110,
    "hitDice": "13d10 + 39",
    "speed": "40 ft., burrow 20 ft., fly 80 ft.",
    "abilities": {
      "str": 19,
      "dex": 10,
      "con": 17,
      "int": 12,
      "wis": 11,
      "cha": 15
    },
    "skills": [
      "Perception +6",
      "Persuasion +5",
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 16"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace two attacks with a use of Sleep Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 15 (2d10 + 4) Slashing damage.",
        "attackBonus": 7,
        "damage": "2d10+4 slashing"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 14, each creature in a 40-foot-long, 5-foot-wide Line. Failure: 38 (11d6) Fire damage. Success: Half damage.",
        "damage": "11d6 fire",
        "saveDc": 14,
        "saveType": "dex"
      },
      {
        "name": "Sleep Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 1 minute. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.",
        "saveDc": 14,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "young-bronze-dragon",
    "name": "Young Bronze Dragon",
    "cr": 8,
    "size": "Large",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 17,
    "hitPoints": 142,
    "hitDice": "15d10 + 60",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 21,
      "dex": 10,
      "con": 19,
      "int": 14,
      "wis": 13,
      "cha": 17
    },
    "skills": [
      "Insight +4",
      "Perception +7",
      "Stealth +3"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 17"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "lightning"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Repulsion Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +8, reach 10 ft. Hit: 16 (2d10 + 5) Slashing damage.",
        "attackBonus": 8,
        "damage": "2d10+5 slashing"
      },
      {
        "name": "Lightning Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 15, each creature in a 60-foot-long, 5-foot-wide Line. Failure: 49 (9d10) Lightning damage. Success: Half damage.",
        "damage": "9d10 lightning",
        "saveDc": 15,
        "saveType": "dex"
      },
      {
        "name": "Repulsion Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 15, each creature in a 30-foot Cone. Failure: The target is pushed up to 40 feet straight away from the dragon and has the Prone condition.",
        "saveDc": 15,
        "saveType": "str"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "young-copper-dragon",
    "name": "Young Copper Dragon",
    "cr": 7,
    "size": "Large",
    "type": "dragon",
    "alignment": "chaotic good",
    "armorClass": 17,
    "hitPoints": 119,
    "hitDice": "14d10 + 42",
    "speed": "40 ft., climb 40 ft., fly 80 ft.",
    "abilities": {
      "str": 19,
      "dex": 12,
      "con": 17,
      "int": 16,
      "wis": 13,
      "cha": 15
    },
    "skills": [
      "Deception +5",
      "Perception +7",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 17"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "acid"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Slowing Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +7, reach 10 ft. Hit: 15 (2d10 + 4) Slashing damage.",
        "attackBonus": 7,
        "damage": "2d10+4 slashing"
      },
      {
        "name": "Acid Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 14, each creature in a 40-foot-long, 5-foot-wide Line. Failure: 40 (9d8) Acid damage. Success: Half damage.",
        "damage": "9d8 acid",
        "saveDc": 14,
        "saveType": "dex"
      },
      {
        "name": "Slowing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.",
        "saveDc": 14,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  },
  {
    "id": "young-gold-dragon",
    "name": "Young Gold Dragon",
    "cr": 10,
    "size": "Large",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 18,
    "hitPoints": 178,
    "hitDice": "17d10 + 85",
    "speed": "40 ft., fly 80 ft., swim 40 ft.",
    "abilities": {
      "str": 23,
      "dex": 14,
      "con": 21,
      "int": 16,
      "wis": 13,
      "cha": 20
    },
    "skills": [
      "Insight +5",
      "Perception +9",
      "Persuasion +9",
      "Stealth +6"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 19"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Amphibious",
        "type": "trait",
        "description": "The dragon can breathe air and water."
      },
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "fire"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Weakening Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 10 ft. Hit: 17 (2d10 + 6) Slashing damage.",
        "attackBonus": 10,
        "damage": "2d10+6 slashing"
      },
      {
        "name": "Fire Breath",
        "type": "attack",
        "description": "Dexterity Saving Throw: DC 17, each creature in a 30-foot Cone. Failure: 55 (10d10) Fire damage. Success: Half damage.",
        "damage": "10d10 fire",
        "saveDc": 17,
        "saveType": "dex"
      },
      {
        "name": "Weakening Breath",
        "type": "ability",
        "description": "Strength Saving Throw: DC 17, each creature that isn't currently affected by this breath in a 30-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 3 (1d6) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 17,
        "saveType": "str"
      }
    ],
    "tags": [
      "dragon",
      "boss"
    ]
  },
  {
    "id": "young-silver-dragon",
    "name": "Young Silver Dragon",
    "cr": 9,
    "size": "Large",
    "type": "dragon",
    "alignment": "lawful good",
    "armorClass": 18,
    "hitPoints": 168,
    "hitDice": "16d10 + 80",
    "speed": "40 ft., fly 80 ft.",
    "abilities": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 11,
      "cha": 19
    },
    "skills": [
      "History +6",
      "Perception +8",
      "Stealth +4"
    ],
    "senses": [
      "Blindsight 30 ft.",
      "Darkvision 120 ft.",
      "Passive Perception 18"
    ],
    "languages": [
      "Common",
      "Draconic"
    ],
    "traits": [
      {
        "name": "Damage Immunities",
        "type": "trait",
        "description": "cold"
      }
    ],
    "actions": [
      {
        "name": "Multiattack",
        "type": "ability",
        "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Paralyzing Breath."
      },
      {
        "name": "Rend",
        "type": "attack",
        "description": "Melee Attack Roll: +10, reach 10 ft. Hit: 15 (2d8 + 6) Slashing damage.",
        "attackBonus": 10,
        "damage": "2d8+6 slashing"
      },
      {
        "name": "Cold Breath",
        "type": "attack",
        "description": "Constitution Saving Throw: DC 17, each creature in a 30-foot Cone. Failure: 49 (11d8) Cold damage. Success: Half damage.",
        "damage": "11d8 cold",
        "saveDc": 17,
        "saveType": "con"
      },
      {
        "name": "Paralyzing Breath",
        "type": "ability",
        "description": "Constitution Saving Throw: DC 17, each creature in a 30-foot Cone. First Failure: The target has the Incapacitated condition until the end of its next turn, when it repeats the save. Second Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
        "saveDc": 17,
        "saveType": "con"
      }
    ],
    "tags": [
      "dragon"
    ]
  }
]
