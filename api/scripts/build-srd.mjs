/* global process, console, URL */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = process.argv[2]
if (!root) {
  console.error('Uso: node scripts/build-srd.mjs <pasta do 5e-database>/src/2014')
  process.exit(1)
}
const load = (lang, name) => JSON.parse(readFileSync(join(root, lang, `5e-SRD-${name}.json`), 'utf8'))
const text = (value) => (Array.isArray(value) ? value.join('\n\n') : (value ?? ''))
const names = (lang, name) => Object.fromEntries(load(lang, name).map((x) => [x.index, x.name]))

const schools = names('pt-BR', 'Magic-Schools')
const damageTypes = names('pt-BR', 'Damage-Types')
const entries = []
const add = (kind, index, name, lang, summary, meta, body, data = {}) =>
  entries.push({ kind, slug: `srd-${kind}-${index}`, name, lang, summary, meta, body, data })

for (const s of load('en', 'Spells')) {
  const level = s.level === 0 ? 'Truque' : `${s.level}º círculo`
  const school = schools[s.school.index] ?? s.school.name
  const higher = s.higher_level?.length ? `\n\n**At Higher Levels.** ${text(s.higher_level)}` : ''
  const material = s.material ? ` (${s.material})` : ''
  const damage = Array.isArray(s.damage) ? s.damage[0] : s.damage
  const dc = Array.isArray(s.dc) ? s.dc[0] : s.dc
  add(
    'spell',
    s.index,
    s.name,
    'en',
    `${level} de ${school.toLowerCase()}`,
    {
      level: s.level,
      school: s.school.index,
      classes: (s.classes ?? []).map((c) => c.index),
      ritual: s.ritual,
      concentration: s.concentration,
      castingTime: s.casting_time,
      range: s.range,
      duration: s.duration,
      components: `${s.components.join(', ')}${material}`
    },
    `${text(s.desc)}${higher}`,
    {
      attack: s.attack_type ?? null,
      save: dc?.dc_type?.index ?? null,
      damageType: damage?.damage_type?.index ? damageTypes[damage.damage_type.index] : null,
      damageBySlot: damage?.damage_at_slot_level ?? null,
      damageByLevel: damage?.damage_at_character_level ?? null,
      healBySlot: s.heal_at_slot_level ?? null
    }
  )
}

const ABILITY = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' }
const SIZES = { Tiny: 'Miúdo', Small: 'Pequeno', Medium: 'Médio', Large: 'Grande', Huge: 'Enorme', Gargantuan: 'Imenso' }
const TYPES = {
  aberration: 'aberração',
  beast: 'fera',
  celestial: 'celestial',
  construct: 'constructo',
  dragon: 'dragão',
  elemental: 'elemental',
  fey: 'fada',
  fiend: 'corruptor',
  giant: 'gigante',
  humanoid: 'humanoide',
  monstrosity: 'monstruosidade',
  ooze: 'limo',
  plant: 'planta',
  swarm: 'enxame',
  undead: 'morto-vivo'
}
const crLabel = (cr) => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr))
const action = (a) => ({
  name: a.name,
  desc: a.desc ?? '',
  attackBonus: a.attack_bonus ?? null,
  damage: (a.damage ?? [])
    .filter((d) => d.damage_dice)
    .map((d) => ({ dice: d.damage_dice.replace(/\s+/g, ''), type: d.damage_type?.index ? damageTypes[d.damage_type.index] : '' })),
  dc: a.dc ? { ability: a.dc.dc_type?.index ?? '', value: a.dc.dc_value } : null
})
for (const m of load('en', 'Monsters')) {
  add(
    'monster',
    m.index,
    m.name,
    'en',
    `${TYPES[m.type.startsWith('swarm') ? 'swarm' : m.type] ?? m.type} ${(SIZES[m.size] ?? m.size).toLowerCase()}, ND ${crLabel(m.challenge_rating)}`,
    {
      cr: m.challenge_rating,
      crLabel: crLabel(m.challenge_rating),
      type: m.type.startsWith('swarm') ? 'swarm' : m.type,
      size: m.size,
      ac: m.armor_class[0]?.value ?? 10,
      hp: m.hit_points,
      xp: m.xp
    },
    '',
    {
      subtype: m.subtype ?? null,
      alignment: m.alignment,
      armorClass: m.armor_class.map((a) => ({ value: a.value, type: a.type })),
      hitPoints: m.hit_points,
      hitDice: m.hit_points_roll ?? m.hit_dice,
      speed: m.speed,
      abilities: Object.fromEntries(Object.entries(ABILITY).map(([long, short]) => [short, m[long]])),
      proficiencies: (m.proficiencies ?? []).map((p) => ({ name: p.proficiency.name, value: p.value })),
      vulnerabilities: m.damage_vulnerabilities,
      resistances: m.damage_resistances,
      immunities: m.damage_immunities,
      conditionImmunities: (m.condition_immunities ?? []).map((c) => c.name),
      senses: m.senses,
      languages: m.languages,
      proficiencyBonus: m.proficiency_bonus,
      traits: (m.special_abilities ?? []).map(action),
      actions: (m.actions ?? []).map(action),
      reactions: (m.reactions ?? []).map(action),
      legendary: (m.legendary_actions ?? []).map(action)
    }
  )
}

const CATEGORY = { weapon: 'weapon', armor: 'armor', 'adventuring-gear': 'gear', tools: 'tool', 'mounts-and-vehicles': 'mount' }
const WEAPON = {
  'Simple Melee': 'Arma simples corpo a corpo',
  'Simple Ranged': 'Arma simples à distância',
  'Martial Melee': 'Arma marcial corpo a corpo',
  'Martial Ranged': 'Arma marcial à distância'
}
const ARMOR = { Light: 'Armadura leve', Medium: 'Armadura média', Heavy: 'Armadura pesada', Shield: 'Escudo' }
const cost = (c) => (c ? `${c.quantity} ${c.unit}` : '')
for (const e of load('en', 'Equipment')) {
  const category = CATEGORY[e.equipment_category.index] ?? 'gear'
  const weapon = category === 'weapon'
  const armor = category === 'armor'
  add(
    'item',
    e.index,
    e.name,
    'en',
    weapon
      ? `${WEAPON[e.category_range] ?? e.category_range}, ${e.damage?.damage_dice ?? '—'}`
      : armor
        ? `${ARMOR[e.armor_category] ?? e.armor_category}, CA ${e.armor_class?.base}`
        : (e.gear_category?.name ?? e.equipment_category.name),
    { category, rarity: null, cost: cost(e.cost), weight: e.weight ?? null },
    text(e.desc),
    weapon
      ? {
          damage: e.damage?.damage_dice ?? null,
          damageType: e.damage?.damage_type?.index ? damageTypes[e.damage.damage_type.index] : null,
          twoHanded: e.two_handed_damage?.damage_dice ?? null,
          ranged: e.weapon_range === 'Ranged',
          properties: (e.properties ?? []).map((p) => p.index),
          range: e.range ?? null
        }
      : armor
        ? { armorClass: e.armor_class, strength: e.str_minimum ?? 0, stealthDisadvantage: e.stealth_disadvantage ?? false }
        : {}
  )
}

const RARITY = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  'Very Rare': 'very-rare',
  Legendary: 'legendary',
  Artifact: 'artifact',
  Varies: 'varies'
}
for (const e of load('en', 'Magic-Items')) {
  if (e.variant) continue
  const [typeLine, ...rest] = e.desc
  add(
    'item',
    `magic-${e.index}`,
    e.name,
    'en',
    typeLine ?? 'Magic item',
    { category: 'magic', rarity: RARITY[e.rarity?.name] ?? 'varies', cost: '', weight: null },
    text(rest),
    {}
  )
}

for (const c of load('pt-BR', 'Conditions')) add('condition', c.index, c.name, 'pt-BR', 'Condição', {}, text(c.desc))

for (const r of load('pt-BR', 'Races')) {
  const bonuses = r.ability_bonuses.map((b) => `${b.ability_score.name} +${b.bonus}`).join(', ')
  const traits = (r.traits ?? []).map((t) => t.name).join(', ')
  add(
    'race',
    r.index,
    r.name,
    'pt-BR',
    `${bonuses} · deslocamento ${r.speed} m`,
    { speed: r.speed, size: r.size },
    [
      `**Aumento no valor de habilidade.** ${bonuses}.`,
      `**Idade.** ${r.age}`,
      `**Tendência.** ${r.alignment}`,
      `**Tamanho.** ${r.size_description}`,
      `**Deslocamento.** ${r.speed} metros.`,
      traits && `**Traços.** ${traits}.`,
      `**Idiomas.** ${r.language_desc}`
    ]
      .filter(Boolean)
      .join('\n\n')
  )
}

for (const f of load('pt-BR', 'Feats')) add('feat', f.index, f.name, 'pt-BR', 'Talento', {}, text(f.desc))

for (const b of load('pt-BR', 'Backgrounds')) {
  const skills = b.starting_proficiencies.map((p) => p.name.replace(/^Perícia: /, '')).join(', ')
  add(
    'background',
    b.index,
    b.name,
    'pt-BR',
    `Perícias: ${skills}`,
    {},
    [`**Perícias.** ${skills}.`, `**${b.feature.name}.** ${text(b.feature.desc)}`].join('\n\n')
  )
}

const out = new URL('../srd/srd-5.1.json.gz', import.meta.url)
writeFileSync(out, gzipSync(JSON.stringify(entries)))
const counts = entries.reduce((acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] ?? 0) + 1 }), {})
console.log(`${entries.length} entradas`, counts)
