// Maps a monster name to its bundled artwork in /public/monsters.
//
// Filenames are the PascalCase of the monster's name (e.g. "Young Red Dragon"
// → YoungRedDragon.png). We match on a normalized key (lowercase, alphanumeric
// only) so spacing/casing differences don't matter. Monsters with no matching
// image return null and fall back to the plain colored token.

export const MONSTER_IMAGE_FILES: string[] = [
  'Aboleth.png', 'AirElemental.png', 'AnimatedArmor.png', 'Bandit.png', 'Banshee.png',
  'Basilisk.png', 'BeardedDevil.png', 'BogWisp.png', 'BoneDevil.png', 'Bugbear.png',
  'BugbearChief.png', 'Chimera.png', 'CloudGiant.png', 'Cockatrice.png', 'Cyclops.png',
  'DireWolf.png', 'Doppelganger.png', 'Dretch.png', 'EarthElemental.png', 'Ettin.png',
  'FireElemental.png', 'FireGiant.png', 'FrostGiant.png', 'Gargoyle.png', 'GelatinousCube.png',
  'Ghoul.png', 'GiantBat.png', 'GiantCentipede.png', 'GiantFrog.png', 'GiantRat.png',
  'GiantSpider.png', 'Glabrezu.png', 'Gnoll.png', 'Goblin.png', 'Gorgon.png',
  'Grick.png', 'Grimlock.png', 'Harpy.png', 'HellHound.png', 'HillGiant.png',
  'Hippogriff.png', 'Hobgoblin.png', 'HobgoblinWarlord.png', 'HookHorror.png', 'HornedDevil.png',
  'Hydra.png', 'IceMephit.png', 'Imp.png', 'Kenku.png', 'Kobold.png',
  'Lemure.png', 'Lich.png', 'Manticore.png', 'Medusa.png', 'Mimic.png',
  'Minotaur.png', 'NeedleBlight.png', 'Ogre.png', 'Orc.png', 'OrcWarchief.png',
  'Otyugh.png', 'Owlbear.png', 'Pseudodragon.png', 'PurpleWorm.png', 'Quasit.png',
  'Roper.png', 'RustMonster.png', 'Sahuagin.png', 'Salamander.png', 'Skeleton.png',
  'SteamMephit.png', 'Stirge.png', 'StoneGiant.png', 'StoneGolem.png', 'Troll.png',
  'TwigBlight.png', 'Vampire.png', 'WaterElemental.png', 'Werewolf.png', 'Wight.png',
  'Wolf.png', 'Wraith.png', 'Wyvern.png', 'YoungBlackDragon.png', 'YoungBlueDragon.png',
  'YoungGreenDragon.png', 'YoungRedDragon.png', 'YoungWhiteDragon.png', 'Zombie.png',
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// normalized monster name → "/monsters/<File>.png"
const INDEX: Record<string, string> = Object.fromEntries(
  MONSTER_IMAGE_FILES.map((f) => [norm(f.replace(/\.png$/i, '')), `/monsters/${f}`]),
)

/** Resolve a monster's bundled artwork URL by name, or null if none exists. */
export function monsterImageUrl(name: string | null | undefined): string | null {
  if (!name) return null
  return INDEX[norm(name)] ?? null
}
