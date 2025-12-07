//// SECTION 1 START
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { roll } from "@/lib/dice";
import { proficiencyForLevel } from "@/lib/rules";
import type { Abilities } from "../../../types/character";
import {
  SRD_SPELLS,
  type SrdSpell,
} from "@/lib/srdspells";
import {
  getWeapon,
  type Weapon,
  WEAPONS,
} from "@/lib/weapons";
import {
  getArmor,
  getArmorAcFromDex,
  type Armor,
  ARMORS,
} from "@/lib/armor";
import {
  getGear,
  getPack,
  type GearItem,
  type Pack,
  GEAR,
} from "@/lib/equipment";
import { RACES } from "@/lib/races";
import { BACKGROUNDS } from "@/lib/backgrounds";

type SpellSlotsSummary = {
  byLevel: Record<number, number>;
  currentByLevel: Record<number, number>;
};

type CharacterSheetData = {
  id: string;
  wallet_address: string | null;
  name: string;
  race_key: string | null;
  race: string | null; // legacy / fallback
  main_job: string | null;
  subclass: string | null;
  level: number | null;
  alignment: string | null;
  background_key: string | null;
  background: string | null; // legacy / fallback
  ac: number | null;
  hp: number | null;
  hit_points_current: number | null;
  hit_points_max: number | null;
  proficiency: number | null;
  abilities: any;
  saving_throw_profs: string[] | null;
  skill_proficiencies: Record<string, string> | null;
  passive_perception: number | null;
  spellcasting_ability: keyof Abilities | null;
  spell_save_dc: number | null;
  spell_attack_bonus: number | null;
  spell_slots: SpellSlotsSummary | null;
  spells_known: string[] | null;
  spells_prepared: string[] | null;
  racial_traits: string[] | null;
  background_feature: string | null; // fallback if needed
  equipment_pack: string | null;
  equipment_items: string[] | null;
  main_weapon_key: string | null;
  armor_key: string | null;
  notes: string | null;
  personality_traits: string | null;
  ideals: string | null;
  bonds: string | null;
  flaws: string | null;
  nft_contract: string | null;
  nft_token_id: string | null;
  avatar_url: string | null;
};

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}
function formatMod(mod: number) {
  return (mod >= 0 ? "+" : "") + mod;
}

type SkillDef = { key: string; label: string; ability: keyof Abilities };

const ALL_SKILLS: SkillDef[] = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animal_handling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleight_of_hand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

type RollLogEntry = { label: string; formula: string; result: number };

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [c, setC] = useState<CharacterSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  const [spellSearch, setSpellSearch] = useState("");
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | "all">("all");
  const [currentSlots, setCurrentSlots] = useState<SpellSlotsSummary | null>(null);
  const [onlyMyClassSpells, setOnlyMyClassSpells] = useState(false);
  const [browseAllSpells, setBrowseAllSpells] = useState(false);

  const [newGearKey, setNewGearKey] = useState("");
  const [rollLog, setRollLog] = useState<RollLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load character", error);
        setLoading(false);
        return;
      }

      setC(data as any);
      setCurrentSlots((data as any)?.spell_slots ?? null);
      setLoading(false);
    })();
  }, [id]);

  const abilities: Abilities = useMemo(() => {
    const fallback: Abilities = {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    };
    if (!c || !c.abilities) return fallback;

    const raw = c.abilities as any;
    if (
      typeof raw === "object" &&
      raw !== null &&
      ["str", "dex", "con", "int", "wis", "cha"].every((k) => k in raw)
    ) {
      return {
        str: Number(raw.str ?? 10),
        dex: Number(raw.dex ?? 10),
        con: Number(raw.con ?? 10),
        int: Number(raw.int ?? 10),
        wis: Number(raw.wis ?? 10),
        cha: Number(raw.cha ?? 10),
      };
    }
    if (raw?.final) {
      const f = raw.final;
      return {
        str: Number(f.str ?? 10),
        dex: Number(f.dex ?? 10),
        con: Number(f.con ?? 10),
        int: Number(f.int ?? 10),
        wis: Number(f.wis ?? 10),
        cha: Number(f.cha ?? 10),
      };
    }
    return fallback;
  }, [c]);

  const profBonus = useMemo(() => proficiencyForLevel(c?.level ?? 1), [c?.level]);

  const savingThrowSet = useMemo(() => {
    const raw = (c?.saving_throw_profs ?? []) as string[];
    return new Set(raw.map((v) => v.toLowerCase()));
  }, [c?.saving_throw_profs]);

  const passivePerception = useMemo(
    () => c?.passive_perception ?? 10,
    [c?.passive_perception]
  );

  const mainWeapon = useMemo<Weapon | undefined>(
    () => (c?.main_weapon_key ? getWeapon(c.main_weapon_key) : undefined),
    [c?.main_weapon_key]
  );

  const armor = useMemo<Armor | undefined>(
    () => (c?.armor_key ? getArmor(c.armor_key) : undefined),
    [c?.armor_key]
  );

  const armorAcFromDex = useMemo(() => {
    if (!armor) return null;
    const dexMod = abilityMod(abilities.dex);
    return getArmorAcFromDex(armor, dexMod);
  }, [armor, abilities.dex]);

  const equippedPack = useMemo<Pack | undefined>(
    () => (c?.equipment_pack ? getPack(c.equipment_pack as any) : undefined),
    [c?.equipment_pack]
  );

  const inventoryItems = useMemo<GearItem[]>(() => {
    const raw = (c?.equipment_items ?? []) as string[];
    return raw.map((key) => getGear(key as any)).filter((g): g is GearItem => !!g);
  }, [c?.equipment_items]);

  const allArmors = useMemo(
    () =>
      Object.values(ARMORS).sort((a, b) =>
        a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)
      ),
    []
  );

  const allWeapons = useMemo(
    () =>
      Object.values(WEAPONS).sort((a, b) =>
        a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)
      ),
    []
  );

  const allGear = useMemo(
    () => Object.values(GEAR).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const spellSlots = useMemo<SpellSlotsSummary | null>(
    () => c?.spell_slots ?? null,
    [c?.spell_slots]
  );

  const knownSpellNames = useMemo(
    () => new Set((c?.spells_known ?? []) as string[]),
    [c?.spells_known]
  );

  const preparedSpellNames = useMemo(
    () => new Set((c?.spells_prepared ?? []) as string[]),
    [c?.spells_prepared]
  );

  const classSpellTag = useMemo(() => {
    const jobRaw = (c?.main_job ?? "").toLowerCase();
    if (!jobRaw) return null;
    if (jobRaw.includes("wizard")) return "wizard";
    if (jobRaw.includes("sorcerer")) return "sorcerer";
    if (jobRaw.includes("warlock")) return "warlock";
    if (jobRaw.includes("cleric")) return "cleric";
    if (jobRaw.includes("paladin")) return "paladin";
    if (jobRaw.includes("ranger")) return "ranger";
    if (jobRaw.includes("bard")) return "bard";
    if (jobRaw.includes("druid")) return "druid";
    return null;
  }, [c?.main_job]);

  const filteredSpells = useMemo(() => {
    const baseList = browseAllSpells
      ? SRD_SPELLS
      : SRD_SPELLS.filter((s) => knownSpellNames.has(s.name));

    return baseList.filter((spell: SrdSpell) => {
      if (
        spellLevelFilter !== "all" &&
        (spell.level ?? 0) !== spellLevelFilter
      ) {
        return false;
      }

      if (onlyMyClassSpells && classSpellTag) {
        const spellClasses =
          (spell as any).classes as string[] | undefined;
        if (!spellClasses?.includes(classSpellTag)) return false;
      }

      const q = spellSearch.trim().toLowerCase();
      if (!q) return true;

      return (
        spell.name.toLowerCase().includes(q) ||
        spell.school.toLowerCase().includes(q)
      );
    });
  }, [
    spellSearch,
    spellLevelFilter,
    onlyMyClassSpells,
    classSpellTag,
    browseAllSpells,
    knownSpellNames,
  ]);

  const raceInfo = useMemo(
    () =>
      c?.race_key
        ? RACES[c.race_key as keyof typeof RACES]
        : null,
    [c?.race_key]
  );

  const backgroundInfo = useMemo(
    () =>
      c?.background_key
        ? BACKGROUNDS[c.background_key as keyof typeof BACKGROUNDS]
        : null,
    [c?.background_key]
  );
    const raceTraits = useMemo(
    () => ((raceInfo as any)?.traits ?? []) as any[],
    [raceInfo]
  );

  const backgroundFeatureText = useMemo(() => {
    const f = (backgroundInfo as any)?.feature;
    if (!f) return "";
    if (typeof f === "string") return f;
    if (typeof f.description === "string") return f.description;
    if (typeof f.text === "string") return f.text;
    if (typeof f.name === "string") return f.name;
    return String(f);
  }, [backgroundInfo]);


  function showRoll(label: string, formula: string, result: number) {
    setRollLog((prev) => [
      { label, formula: formula.trim(), result },
      ...prev.slice(0, 9),
    ]);
  }

  async function handleEquipArmor(armorKey: string) {
    if (!c) return;
    const selected = armorKey || null;

    const dexMod = abilityMod(abilities.dex);
    let newAc = c.ac ?? 10 + dexMod;

    if (selected) {
      const a = getArmor(selected);
      if (a) {
        if (a.category === "shield") {
          newAc = 10 + dexMod + a.baseAc;
        } else {
          newAc = getArmorAcFromDex(a, dexMod);
        }
      }
    } else {
      newAc = 10 + dexMod;
    }

    const { error } = await supabase
      .from("characters")
      .update({ armor_key: selected, ac: newAc })
      .eq("id", c.id);

    if (error) {
      console.error("Failed to update armor", error);
      return;
    }

    setC((prev) =>
      prev
        ? {
            ...prev,
            armor_key: selected,
            ac: newAc,
          }
        : prev
    );
  }


  async function handleEquipWeapon(weaponKey: string) {
    if (!c) return;
    const selected = weaponKey || null;

    const { error } = await supabase
      .from("characters")
      .update({ main_weapon_key: selected })
      .eq("id", c.id);

    if (error) {
      console.error("Failed to update weapon", error);
      return;
    }

    setC((prev) =>
      prev
        ? {
            ...prev,
            main_weapon_key: selected,
          }
        : prev
    );
  }

  async function handleAddInventoryItem() {
    if (!c || !newGearKey) return;
    const current = (c.equipment_items ?? []) as string[];
    const updated = [...current, newGearKey];

    const { error } = await supabase
      .from("characters")
      .update({ equipment_items: updated })
      .eq("id", c.id);

    if (error) {
      console.error("Failed to add inventory item", error);
      return;
    }

    setC((prev) =>
      prev
        ? {
            ...prev,
            equipment_items: updated,
          }
        : prev
    );

    setNewGearKey("");
  }

  function rollAbilityCheck(abilityKey: keyof Abilities) {
    if (!c) return;

    const base = abilityMod(abilities[abilityKey]);
    const raw = roll(`1d20 + ${base}`) as any;
    const total =
      typeof raw === "number" ? raw : raw?.total ?? 0;

    showRoll(
      `${abilityKey.toUpperCase()} check`,
      `1d20 + ${base}`,
      total
    );
  }

  function rollSkillCheck(skillKey: string, label: string, total: number) {
    const raw = roll(`1d20 + ${total}`) as any;
    const rollTotal =
      typeof raw === "number" ? raw : raw?.total ?? 0;

    showRoll(label, `1d20 + ${total}`, rollTotal);
  }

  function rollSave(abilityKey: keyof Abilities) {
    if (!c) return;

    const isProf = savingThrowSet.has(abilityKey.toLowerCase());
    const base = abilityMod(abilities[abilityKey]);
    const total = base + (isProf ? profBonus : 0);

    const raw = roll(`1d20 + ${total}`) as any;
    const rollTotal =
      typeof raw === "number" ? raw : raw?.total ?? 0;

    showRoll(
      `${abilityKey.toUpperCase()} save`,
      `1d20 + ${total}`,
      rollTotal
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#020617] text-slate-400">
        Loading character...
      </div>
    );
  }

  if (!c) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#020617] text-slate-400">
        Character not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#020617] to-[#050816]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.14),_transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-6 text-slate-100">

        {/* ======================= HEADER ======================= */}
        <header className="mb-4 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-[0_20px_60px_rgba(15,23,42,0.95)] backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400" />

          <div className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">

                {/* Avatar */}
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-sky-500/80 bg-[#020617] shadow-[0_0_0_1px_rgba(15,23,42,0.9),0_16px_40px_rgba(8,47,73,0.9)]">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                      No avatar
                    </div>
                  )}
                </div>

                {/* Basic identity */}
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-50">
                      {c.name}
                    </h1>

                    {c.level != null && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-sky-200 ring-1 ring-sky-500/40">
                        Level {c.level}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300">
                    <span className="font-medium text-sky-200">
                      {raceInfo?.name ??
                        c.race ??
                        "Unknown race"}
                    </span>{" "}
                    • {c.main_job ?? "Adventurer"}
                    {c.subclass ? (
                      <span className="text-sky-300"> — {c.subclass}</span>
                    ) : null}
                  </p>

                  {/* AC / HP / Prof chips */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">

                    {/* AC */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] ring-1 ring-sky-800/60">
                      <span className="text-sky-300">🛡</span>
                      AC{" "}
                      <span className="font-mono text-slate-50">
                        {c.ac ?? 10}
                      </span>
                    </span>

                    {/* HP */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] ring-1 ring-rose-800/70">
                      <span className="text-rose-300">♥</span>
                      HP{" "}
                      <span className="font-mono text-slate-50">
                        {c.hit_points_current ??
                          c.hit_points_max ??
                          c.hp ??
                          0}
                        /
                        {c.hit_points_max ?? c.hp ?? 0}
                      </span>
                    </span>

                    {/* Prof */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] ring-1 ring-indigo-800/70">
                      <span className="text-indigo-300">★</span>
                      Prof{" "}
                      <span className="font-mono text-slate-50">
                        {formatMod(profBonus)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Alignment / background / wallet */}
              <div className="flex flex-col items-start gap-2 text-[11px] text-slate-300 md:items-end">

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] ring-1 ring-slate-700/80">
                    <span className="text-slate-400">Alignment</span>
                    <span className="font-medium text-slate-100">
                      {c.alignment ?? "—"}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] ring-1 ring-slate-700/80">
                    <span className="text-slate-400">Background</span>
                    <span className="font-medium text-slate-100">
                      {backgroundInfo?.name ??
                        c.background ??
                        "—"}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Wallet:{" "}
                  <span className="font-mono text-[10px] text-slate-300">
                    {c.wallet_address
                      ? `${c.wallet_address.slice(0, 6)}...${c.wallet_address.slice(-4)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ======================= 3 COLUMN LAYOUT ======================= */}
        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1.25fr)_minmax(0,1.1fr)]">

          {/* ===================== COLUMN 1 — ABILITIES + SAVES ===================== */}
          <div className="space-y-3">

            {/* ------- Abilities Panel ------- */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_16px_45px_rgba(15,23,42,0.95)] backdrop-blur">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Abilities
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(abilities) as (keyof Abilities)[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => rollAbilityCheck(k)}
                    className="group flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/80 p-2 transition hover:border-sky-500/80 hover:bg-slate-900"
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 group-hover:text-sky-300">
                      {k}
                    </div>

                    <div className="text-lg font-semibold text-slate-50">
                      {abilities[k]}
                    </div>

                    <div className="text-[10px] text-sky-300">
                      {formatMod(abilityMod(abilities[k]))}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ------- Saving Throws Panel ------- */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_16px_45px_rgba(15,23,42,0.95)] backdrop-blur">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Saving Throws
              </h2>

              <div className="space-y-1">
                {(Object.keys(abilities) as (keyof Abilities)[]).map((k) => {
                  const base = abilityMod(abilities[k]);
                  const isProf = savingThrowSet.has(k.toLowerCase());
                  const total = base + (isProf ? profBonus : 0);

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => rollSave(k)}
                      className="flex w-full items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1 text-left transition hover:bg-slate-900"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/80">
                          {isProf && (
                            <span className="block h-3 w-3 rounded-full bg-sky-500/90" />
                          )}
                        </span>

                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100">
                          {k}
                        </span>
                      </span>

                      <span className="font-mono text-[11px] text-slate-50">
                        {formatMod(total)}
                      </span>
                    </button>
                  );
                })}

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Proficiency bonus</span>
                  <span className="font-mono text-sky-200">
                    {formatMod(profBonus)}
                  </span>
                </div>
              </div>
            </section>
          </div>


          {/* ===================== COLUMN 2 — SKILLS, TRAITS, GEAR ===================== */}
          <div className="space-y-3">

            {/* ------- Skills Panel ------- */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.95)] backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Skills
                </h2>

                <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-[3px] text-[10px] text-slate-300 ring-1 ring-sky-800/60">
                  Passive Perception:{" "}
                  <span className="font-mono text-sky-200">
                    {passivePerception}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                {ALL_SKILLS.map((s) => {
                  const abilityScore = abilities[s.ability];
                  const base = abilityMod(abilityScore);

                  const profState =
                    c?.skill_proficiencies?.[s.key] === "expertise"
                      ? "expertise"
                      : c?.skill_proficiencies?.[s.key] === "proficient"
                      ? "proficient"
                      : "none";

                  let bonus = 0;
                  let mark: string | null = null;

                  if (profState === "proficient") {
                    bonus = profBonus;
                    mark = "•";
                  } else if (profState === "expertise") {
                    bonus = profBonus * 2;
                    mark = "••";
                  }

                  const total = base + bonus;

                  return (
                    <div
                      key={s.key}
                      className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1"
                    >
                      <div className="flex items-center gap-1">
                        {mark && (
                          <span className="text-[10px] text-sky-300">
                            {mark}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-100">
                          {s.label}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          ({s.ability.toUpperCase()})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          rollSkillCheck(s.key, s.label, total)
                        }
                        className="font-mono text-[11px] text-slate-50 transition hover:text-sky-300"
                      >
                        {formatMod(total)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ------- Traits & Features Panel ------- */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.95)] backdrop-blur">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Traits & Features
              </h2>

              <div className="space-y-3 text-xs text-slate-200">

               {raceTraits.length > 0 && (
  <div>
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      Racial Traits
    </div>
    <ul className="ml-4 list-disc space-y-1 text-[11px] text-slate-200">
      {raceTraits.map((t, idx) => {
        const text =
          typeof t === "string"
            ? t
            : typeof t?.description === "string"
            ? t.description
            : typeof t?.name === "string"
            ? t.name
            : String(t);

        return <li key={idx}>{text}</li>;
      })}
    </ul>
  </div>
)}


                {backgroundFeatureText && (
  <div>
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      Background Feature
    </div>
    <p className="whitespace-pre-wrap text-[11px] text-slate-200">
      {backgroundFeatureText}
    </p>
  </div>
)}


                {(!raceInfo?.traits || raceInfo.traits.length === 0) &&
                  !backgroundInfo?.feature && (
                    <p className="text-[11px] text-slate-500">
                      No traits or features recorded.
                    </p>
                  )}
              </div>
            </section>

            {/* ------- Weapons / Armor / Inventory Panel ------- */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_20px_55px_rgba(15,23,42,0.96)] backdrop-blur">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Weapons, Armor & Inventory
              </h2>

              <div className="grid gap-2 md:grid-cols-2">

                {/* ===================== MAIN WEAPON ===================== */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Main Weapon
                    </div>

                    <select
                      className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-100 outline-none transition hover:border-sky-500/60"
                      value={c.main_weapon_key ?? ""}
                      onChange={(e) => handleEquipWeapon(e.target.value)}
                    >
                      <option value="">None</option>
                      {allWeapons.map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mainWeapon ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-slate-50">
                          {mainWeapon.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-200">
                          {mainWeapon.damageDice} {mainWeapon.damageType}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span>
                          Type:{" "}
                          <span className="text-slate-200">
                            {mainWeapon.category} {mainWeapon.group}
                          </span>
                        </span>

                        {mainWeapon.range && (
                          <span>
                            Range:{" "}
                            <span className="text-slate-200">
                              {mainWeapon.range.normal}/
                              {mainWeapon.range.long}
                            </span>
                          </span>
                        )}

                        {mainWeapon.properties.length > 0 && (
                          <span>
                            Props:{" "}
                            <span className="text-slate-200">
                              {mainWeapon.properties.join(", ")}
                            </span>
                          </span>
                        )}

                        <span>Wt {mainWeapon.weight} lb.</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      No main weapon selected.
                    </p>
                  )}
                </div>

                {/* ===================== ARMOR ===================== */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Armor
                    </div>

                    <select
                      className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-100 outline-none transition hover:border-sky-500/60"
                      value={c.armor_key ?? ""}
                      onChange={(e) => handleEquipArmor(e.target.value)}
                    >
                      <option value="">None</option>
                      {allArmors.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {armor ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-slate-50">
                          {armor.name}
                        </span>
                        <span className="text-[11px] text-slate-200">
                          Base AC {armor.baseAc}
                        </span>
                      </div>

                      <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                        <div>
                          Category:{" "}
                          <span className="text-slate-200 capitalize">
                            {armor.category}
                          </span>
                        </div>

                        {armorAcFromDex != null && (
                          <div>
                            Armor AC w/ Dex:{" "}
                            <span className="text-sky-200">
                              {armorAcFromDex}
                            </span>
                          </div>
                        )}

                        {armor.strengthRequirement && (
                          <div>
                            Str {armor.strengthRequirement} required
                          </div>
                        )}

                        {armor.disadvantageOnStealth && (
                          <div className="text-amber-300">
                            Disadvantage on Stealth
                          </div>
                        )}

                        <div>Wt {armor.weight} lb.</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      No armor selected.
                    </p>
                  )}
                </div>
              </div>

              {/* ===================== INVENTORY ===================== */}
              <div className="mt-3 border-t border-slate-800/80 pt-2">
                <div className="mb-2 flex items-center justify-between text-[10px]">
                  <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Inventory
                  </span>

                  <span className="text-slate-500">
                    Pack:{" "}
                    {equippedPack
                      ? equippedPack.name
                      : c.equipment_pack ?? "—"}
                  </span>
                </div>

                {/* Add inventory item */}
                <div className="mb-3 flex items-center gap-2">
                  <select
                    className="flex-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-100 outline-none transition hover:border-sky-500/70"
                    value={newGearKey}
                    onChange={(e) => setNewGearKey(e.target.value)}
                  >
                    <option value="">Add item…</option>
                    {allGear.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!newGearKey}
                    onClick={handleAddInventoryItem}
                    className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-slate-50 shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700"
                  >
                    Add
                  </button>
                </div>

                {/* Inventory list */}
                {inventoryItems.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No extra gear recorded.
                  </p>
                )}

                {inventoryItems.length > 0 && (
                  <ul className="space-y-1">
                    {inventoryItems.map((item) => (
                      <li
                        key={item.key}
                        className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1"
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-100">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.category}
                          </span>
                        </div>

                        <div className="text-right text-[10px] text-slate-400">
                          <div>Wt {item.weight} lb.</div>
                          {item.costGp && <div>{item.costGp} gp</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>


          {/* ===================== COLUMN 3 — SPELLS + ROLL LOG + NOTES ===================== */}
          <div className="space-y-3">

            {/* ================= SPELLS PANEL ================= */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_22px_60px_rgba(15,23,42,0.96)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Spells
                </h2>

                <label className="flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={browseAllSpells}
                    onChange={(e) => setBrowseAllSpells(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                  />
                  Browse All
                </label>
              </div>

              {/* ---- Search + Filters ---- */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="text"
                  placeholder="Search spells..."
                  value={spellSearch}
                  onChange={(e) => setSpellSearch(e.target.value)}
                  className="flex-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-100 outline-none"
                />

                <select
                  className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100"
                  value={spellLevelFilter}
                  onChange={(e) =>
                    setSpellLevelFilter(
                      e.target.value === "all"
                        ? "all"
                        : Number(e.target.value)
                    )
                  }
                >
                  <option value="all">All levels</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Level {lvl}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                    checked={onlyMyClassSpells}
                    onChange={(e) => setOnlyMyClassSpells(e.target.checked)}
                  />
                  Class only
                </label>
              </div>

              {/* ---- Spell Slot Display ---- */}
              {spellSlots && (
                <div className="mb-3 grid grid-cols-5 gap-1 text-center text-[10px]">
                  {Object.entries(spellSlots.byLevel).map(([lvl, max]) => {
                    const used = max - (spellSlots.currentByLevel[Number(lvl)] ?? 0);
                    return (
                      <div
                        key={lvl}
                        className="rounded-xl bg-slate-900/80 p-1 text-slate-300 ring-1 ring-slate-800"
                      >
                        <div className="text-[9px] text-slate-500">Lv {lvl}</div>
                        <div className="font-mono text-[11px] text-sky-200">
                          {used}/{max}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ---- Spell list ---- */}
              <div className="space-y-1">
                {filteredSpells.map((spell) => {
                  const isKnown = knownSpellNames.has(spell.name);
                  const isPrepared = preparedSpellNames.has(spell.name);

                  const desc: string =
                    (spell as any).shortDescription ??
                    (spell as any).desc ??
                    "";

                  return (
                    <div
                      key={spell.name}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[12px] font-semibold text-slate-50">
                            {spell.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Level {spell.level} • {spell.school}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          {isKnown && (
                            <span className="rounded-full bg-sky-600/20 px-2 py-[2px] text-[9px] font-semibold text-sky-300">
                              Known
                            </span>
                          )}
                          {isPrepared && (
                            <span className="rounded-full bg-indigo-600/20 px-2 py-[2px] text-[9px] font-semibold text-indigo-300">
                              Prepared
                            </span>
                          )}
                        </div>
                      </div>

                      {desc && (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-300">
                          {desc}
                        </p>
                      )}
                    </div>
                  );
                })}

                {filteredSpells.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No spells match your filters.
                  </p>
                )}
              </div>
            </section>

            {/* ================= ROLL LOG ================= */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_20px_55px_rgba(15,23,42,0.96)] backdrop-blur">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Roll Log
              </h2>

              {rollLog.length === 0 && (
                <p className="text-[11px] text-slate-500">No rolls yet.</p>
              )}

              <ul className="space-y-1 text-[11px]">
                {rollLog.map((entry, i) => (
                  <li
                    key={i}
                    className="rounded-xl bg-slate-900/80 px-2 py-1 text-slate-200 ring-1 ring-slate-800"
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-100">
                        {entry.label}
                      </span>
                      <span className="font-mono text-sky-300">
                        {entry.result}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {entry.formula}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* ================= PERSONALITY & NOTES ================= */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-[0_20px_55px_rgba(15,23,42,0.96)] backdrop-blur">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Personality & Notes
              </h2>

              <div className="space-y-3 text-[11px] text-slate-300">
                {c.personality_traits && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Personality Traits
                    </div>
                    <p className="whitespace-pre-wrap">{c.personality_traits}</p>
                  </div>
                )}

                {c.ideals && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Ideals
                    </div>
                    <p className="whitespace-pre-wrap">{c.ideals}</p>
                  </div>
                )}

                {c.bonds && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Bonds
                    </div>
                    <p className="whitespace-pre-wrap">{c.bonds}</p>
                  </div>
                )}

                {c.flaws && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Flaws
                    </div>
                    <p className="whitespace-pre-wrap">{c.flaws}</p>
                  </div>
                )}

                {c.notes && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Notes
                    </div>
                    <p className="whitespace-pre-wrap">{c.notes}</p>
                  </div>
                )}

                {!c.personality_traits &&
                  !c.ideals &&
                  !c.bonds &&
                  !c.flaws &&
                  !c.notes && (
                    <p className="text-slate-500">No notes recorded.</p>
                  )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

