export type AbilityScores = {
str: number; dex: number; con: number; int: number; wis: number; cha: number;
}


export type SavingThrows = {
str: boolean; dex: boolean; con: boolean; int: boolean; wis: boolean; cha: boolean;
}


export type SkillsMap = Record<string, boolean>;


export type CharacterInput = {
name: string;
class_name: string;
ancestry: string;
level: number;
abilities: AbilityScores;
background: string;
alignment: string;
avatar_url: string;
backstory: string;
visibility: 'private' | 'public';
saving_throws: SavingThrows;
skills: SkillsMap;
// NEW — XP support
xp?: number; // optional for backward compatibility
}