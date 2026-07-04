// src/lib/shopItems/tierC.ts
// Tier C — paid $1–3. One-time-use consumables with real table impact but
// bounded power (single check / single round / single encounter effects).
// Exactly TWO `always` items (shown every day) + a large rotator pool.

import type { ShopItem } from '../shopData'

function c(id: string, name: string, desc: string, price: number, opts?: { url?: string | null; always?: boolean; category?: ShopItem['category'] }): ShopItem {
  return {
    id, tier: 'C', name, desc,
    price_usd: price,
    category: opts?.category ?? 'consumable',
    url: opts?.url ?? null,
    ...(opts?.always ? { always: true } : {}),
  }
}

export const TIER_C_ITEMS: ShopItem[] = [
  // ── ALWAYS (2) — legacy ids ─────────────────────────────────────────────────
  c('gender_bender', 'Gender Bender Potion',
    'Alters the drinker\'s physical gender for 24 hours. Fully reversible.', 2.00, { always: true }),
  c('potion_climbing', 'Potion of Climbing',
    'Gain a climbing speed equal to your walking speed for 1 hour.', 1.50,
    { always: true, url: 'https://www.dndbeyond.com/magic-items/4704-potion-of-climbing' }),

  // ── Rotators — legacy ids ───────────────────────────────────────────────────
  c('smoke_bomb', 'Smoke Bomb', 'Creates a 10-ft sphere of heavy obscurement for 1 minute when thrown.', 1.50),
  c('caltrops', 'Bag of Caltrops', 'Scatter to create difficult terrain in a 5-ft square. Stepping creatures take 1 piercing.', 1.00, { category: 'gear' }),
  c('alchemists_fire', "Alchemist's Fire", 'Ranged attack — target takes 1d4 fire damage at start of each turn until an action extinguishes it.', 1.50),
  c('tanglefoot_bag', 'Tanglefoot Bag', 'Hit a creature to reduce its speed to 0 for 1 minute (Str DC 13 ends early).', 2.00),

  // ── Rotators — new ──────────────────────────────────────────────────────────
  c('c_bomb_frost', 'Frost Bomb', 'Thrown (20 ft): 1d6 cold in a 5-ft square, speed halved 1 round (DC 12 Con negates slow).', 2.00),
  c('c_bomb_shock', 'Shock Bomb', 'Thrown (20 ft): 1d6 lightning; target can\'t take reactions until its next turn (DC 12 Con negates).', 2.00),
  c('c_bomb_acid', 'Acid Globe', 'Thrown (20 ft): 1d6 acid now and 1d4 acid at the start of the target\'s next turn.', 2.00),
  c('c_bomb_thunder', 'Thunderclap Charge', 'Set and trigger: 1d8 thunder in 10 ft, audible 300 ft (DC 12 Con half).', 2.50),
  c('c_bomb_stink', 'Stink Bomb', 'Thrown: 10-ft cloud, creatures inside are poisoned 1 round (DC 12 Con negates). Lingers 1 minute.', 1.50),
  c('c_vial_flash', 'Flashbang Vial', 'Thrown: creatures within 5 ft are blinded until end of their next turn (DC 12 Con negates).', 2.50),
  c('c_arrow_flight3', 'Flight Arrows (3)', 'Superbly fletched: +30 ft range on three shots, no other change.', 1.00, { category: 'gear' }),
  c('c_arrow_barbed3', 'Barbed Arrows (3)', 'On a hit, +1 damage and the wound bleeds 1 at the start of the target\'s next turn. Three arrows.', 1.50, { category: 'gear' }),
  c('c_arrow_whistle3', 'Whistling Arrows (3)', 'Scream in flight — signal allies or spook beasts (one Animal Handling check with advantage). Three arrows.', 1.00, { category: 'gear' }),
  c('c_bolt_piercer3', 'Piercer Bolts (3)', 'Punch through wood: ignore half cover on three crossbow shots.', 1.50, { category: 'gear' }),
  c('c_bullets_lead', 'Lead Sling Bullets (10)', 'Dense shot: sling attacks deal +1 damage until you\'ve fired all ten.', 1.00, { category: 'gear' }),
  c('c_oil_keen', 'Keen Edge Oil', 'Coat one blade: your next hit with it scores a critical on 19–20. Wears off after one hit or 1 hour.', 2.50),
  c('c_oil_silver', 'Silvering Paste', 'Coat one weapon or 10 pieces of ammo: counts as silvered for 1 hour.', 3.00),
  c('c_poison_basic', 'Basic Poison Vial', 'Coat one weapon: next hit deals +1d4 poison (DC 10 Con negates). Dries after 1 minute.', 2.00),
  c('c_powder_sneeze', 'Sneezing Powder Bomb', 'Thrown: target loses its reaction and has disadvantage on its next attack (DC 12 Con negates).', 1.50),
  c('c_glue_bomb', 'Glue Bomb', 'Thrown: target\'s feet stick — speed 0 until it uses an action to pull free (DC 11 Str).', 2.00),
  c('c_net_throwing', 'Alchemically-Treated Net', 'Thrown (10 ft): Large or smaller target restrained; the treated cords resist one slashing escape attempt.', 2.50, { category: 'gear' }),
  c('c_potion_ferocity', 'Draught of Ferocity', 'Your next weapon hit within 1 minute deals +1d6 damage. Then the rush fades.', 2.50),
  c('c_potion_focus', 'Draught of Focus', 'For 1 minute, +1 to concentration saving throws (drink as a bonus action).', 2.00),
  c('c_potion_swift', 'Sprinter\'s Draught', '+10 ft speed for 10 minutes. Your calves will remember this.', 2.00),
  c('c_potion_catfall', 'Catfall Tonic', 'For 1 hour, reduce falling damage you take by 1d10 (once).', 2.00),
  c('c_potion_glow', 'Glowskin Tonic', 'You shed dim light 10 ft for 1 hour. Great for reading; terrible for hiding.', 1.00),
  c('c_potion_voice', 'Songbird Cordial', 'Your voice turns golden for 10 minutes: advantage on one Performance check.', 2.00),
  c('c_potion_liquid_courage', 'Liquid Courage', 'For 10 minutes you are immune to the frightened condition. Then the shakes arrive: disadvantage on your next save.', 2.50),
  c('c_potion_warmth', 'Everwarm Flask', 'For 8 hours you are comfortable in cold down to -20°F. One drink.', 1.50),
  c('c_potion_cool', 'Desert Rose Elixir', 'For 8 hours you are comfortable in heat up to 120°F and need half the water.', 1.50),
  c('c_potion_stomach', 'Ironbelly Tonic', 'For 1 hour you can safely eat spoiled food and drink brackish water. Advantage vs. ingested poisons.', 1.50),
  c('c_lens_dark', 'Smoked Goggles', 'For 1 hour, advantage on saves vs. being blinded by bright light. Elastic snaps after a day.', 1.50, { category: 'gear' }),
  c('c_earplug_wax_plus', 'Silence-Wax Plugs', 'For 1 hour, advantage on saves vs. harmful sounds; you auto-fail hearing-based Perception. Single pair.', 1.50),
  c('c_torch_blue', 'Witchfire Torch', 'Burns cold blue for 1 hour: reveals invisible ink and secret chalk marks within its light.', 2.50),
  c('c_candle_scrying_block', 'Candle of Quiet Thoughts', 'While it burns (1 hour), divination that targets a creature in its 15-ft radius has disadvantage (contested rolls) — a budget ward.', 3.00),
  c('c_chalk_seal', 'Warding Chalk', 'Draw one 5-ft line: the first hostile creature to cross it takes 1d6 radiant. Fades at dawn.', 2.50),
  c('c_dust_tracking', 'Tracker\'s Dust', 'Blow a pinch: footprints made in the area within the last hour glow faintly for 10 minutes.', 2.50),
  c('c_dust_sparkle', 'Glitter Dust Pouch', 'Thrown (10-ft cube): invisible creatures inside are outlined for 1 round. No save — it\'s glitter.', 3.00),
  c('c_powder_dry', 'Desiccation Powder', 'Instantly dries one soaked object (book, bowstring, powder charge) or one drenched ally.', 1.00),
  c('c_firework_rocket', 'Signal Rocket', 'Launches 300 ft up and bursts red — visible for miles, day or night.', 1.50),
  c('c_lantern_bug', 'Jar of Glowbeetles', 'Living light: 10-ft dim glow for 8 hours, silent and heatless. The beetles escape at dawn.', 1.50),
  c('c_rope_silk30', 'Silk Rope (30 ft)', 'Light, strong, and quiet — Athletics checks to climb it have advantage. Frays after one adventure.', 2.50, { category: 'gear' }),
  c('c_grapnel_folding', 'Folding Grapnel', 'Collapses to fist-size. Holds one climber\'s weight for one ascent, then a fluke bends.', 2.00, { category: 'gear' }),
  c('c_kit_lockpick_1', 'Single-Use Lockpicks', 'Spring-steel picks: one Sleight of Hand check to pick a lock with +2. They snap either way.', 2.00, { category: 'gear' }),
  c('c_skeleton_key_crude', 'Crude Skeleton Key', 'Opens one SIMPLE mundane lock (GM\'s discretion), then shears off in the mechanism.', 3.00),
  c('c_kit_trapfinder', 'Trapfinder\'s Probe Set', 'Fine wires and mirrors: advantage on one Investigation check to find or study a trap. Bends after use.', 2.00, { category: 'gear' }),
  c('c_manacles_iron', 'Iron Manacles', 'DC 20 to escape, DC 15 to break. One key. One prisoner\'s worth of patience.', 2.00, { category: 'gear' }),
  c('c_hood_falcon', 'Calming Hood', 'Slip over the eyes of a beast up to Medium: it becomes docile for 10 minutes (DC 12 Wis negates).', 2.50),
  c('c_treat_royal', 'Royal Beast Treat', 'A confection beasts adore: one Animal Handling check made with advantage, and the beast remembers you fondly.', 1.50),
  c('c_scent_ghost', 'Ghost-Scent Vial', 'Erases your trail: scent-based tracking of your party auto-fails for the last hour of travel. One use.', 2.50),
  c('c_boots_grip_wrap', 'Gecko-Grip Wraps', 'Bind to boots: for 10 minutes, climb without a check on any rough surface. Adhesive spent after.', 3.00),
  c('c_cloak_rain', 'Stormproof Poncho', 'One day of total dryness in any natural rain. Dissolves in a week.', 1.00, { category: 'gear' }),
  c('c_vest_cork', 'Cork Swim Vest', 'Auto-float: you can\'t sink for 1 hour, willing or not. Advantage on Athletics checks to swim.', 1.50, { category: 'gear' }),
  c('c_breath_mint_troll', 'Trollmint Lozenge', 'Cures any breath, however cursed, for 4 hours. Advantage on one face-to-face Persuasion check.', 1.00),
  c('c_tongue_loosener', 'Gossip\'s Sherry', 'Share a glass: the drinker answers one casual question honestly (DC 11 Wis negates; not magic — just excellent sherry).', 3.00),
  c('c_letter_intro', 'Letter of Introduction', 'A genuine broker\'s letter: one merchant or guild treats you as a vetted customer today.', 2.00),
  c('c_badge_courier', 'Courier\'s Badge (day pass)', 'City gates and checkpoints wave you through once without search. Expires at midnight.', 2.50),
  c('c_scroll_case_trap', 'Trapped Scroll Case', 'Any snoop who opens it takes 1d4 piercing from a needle and yelps. You get one real compartment.', 2.00, { category: 'gear' }),
  c('c_coinpurse_wire', 'Wire-Mesh Coinpurse', 'Cut-proof against pickpockets: the next Sleight of Hand attempt against it auto-fails, loudly.', 1.50, { category: 'gear' }),
  c('c_snowshoes_reed', 'Reed Snowshoes', 'Cross snow at full speed for one day\'s march. They\'re kindling afterward.', 1.50, { category: 'gear' }),
  c('c_cleats_ice', 'Strap-On Ice Cleats', 'Ignore slipping on ice for one day; leather straps wear through by nightfall.', 1.50, { category: 'gear' }),
  c('c_float_bladder', 'Inflatable Bladder Raft', 'Carries one person and pack across calm water, once. Patches don\'t hold twice.', 2.50, { category: 'gear' }),
  c('c_smokestick_bee', 'Beekeeper\'s Smokestick', 'Calms one insect swarm for 1 minute (it takes no actions). Also excellent with actual bees.', 2.00),
  c('c_ward_doorbell', 'Portable Alarm Chime', 'Rig to one door/window: a magical-grade chime (audible 100 ft) rings once when opened. Single rigging.', 3.00),
  c('c_mask_breath', 'Charcoal Breath Mask', 'For 10 minutes, advantage on saves vs. inhaled gases and poisons. Filter clogs after.', 2.50),
  c('c_antivenom_snake', 'Serpent Antivenin', 'Drink within 1 minute of a snake or spider bite: end that poison entirely.', 3.00),
  c('c_tonic_clarity', 'Clarity Tonic', 'End one instance of the charmed condition on yourself (drink as an action).', 3.00),
  c('c_wakeful_brew', 'Sentinel\'s Brew', 'No sleep needed tonight; you keep watch all night and still gain your long rest (once — it does not stack).', 3.00),
]
