export type ShopItem = {
  id: string;
  name: string;
  kind: 'consumable'|'cosmetic'|'monster';
  price: number; // in credits (web2). Later map to token.
  img: string;
  desc: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id:'potion', name:'Healing Draught', kind:'consumable', price: 50, img:'https://images.unsplash.com/photo-1613482184847-5f50f52f8afe?q=80&w=600&auto=format&fit=crop', desc:'Restore a downed PC to 1 HP once.' },
  { id:'torch', name:'Endless Torch', kind:'cosmetic', price: 30, img:'https://images.unsplash.com/photo-1520975682031-ae7d1df62e1e?q=80&w=600&auto=format&fit=crop', desc:'Adds a flickering torch token to the map.' },
  { id:'banner', name:'Guild Banner', kind:'cosmetic', price: 40, img:'https://images.unsplash.com/photo-1520975979651-7f1fcb2a0ec1?q=80&w=600&auto=format&fit=crop', desc:'Custom party banner on the map.' },
  { id:'s_monster_gob', name:'Sponsored Goblin Mob', kind:'monster', price: 120, img:'https://images.unsplash.com/photo-1605649487219-93c0b1df2d2a?q=80&w=600&auto=format&fit=crop', desc:'Spawns 3 goblins into the current encounter.' },
  { id:'s_monster_ogre', name:'Sponsored Ogre', kind:'monster', price: 200, img:'https://images.unsplash.com/photo-1630631728096-1e1f93a4668f?q=80&w=600&auto=format&fit=crop', desc:'Spawns a CR-appropriate ogre.' },
  { id:'music', name:'Bardic Backing Track', kind:'cosmetic', price: 25, img:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop', desc:'Play a hype track in the session lobby.' },
];
