// ============================================================
// Ink Character — Generative Trait Engine v1
// Hand-drawn ink PFP style. Starburst eyes are the signature trait.
// Eye color drives the collection palette (ETH: blue default).
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: inlined into index.html by build.js -> window.InkGen
// ============================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(rng, pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[pool.length - 1];
}

// ---------- trait pools ----------
const TRAITS = {
  background: [
    { id: 'white_dots',    weight: 28, bg: '#f5f5f5', pattern: 'dots',       rarity: 'common' },
    { id: 'white_clean',   weight: 24, bg: '#f8f8f8', pattern: 'none',       rarity: 'common' },
    { id: 'light_hatch',   weight: 20, bg: '#efefef', pattern: 'hatch',      rarity: 'common' },
    { id: 'cross_hatch',   weight: 16, bg: '#f0f0f0', pattern: 'crosshatch', rarity: 'uncommon' },
    { id: 'ink_wash',      weight: 12, bg: '#1a1a1a', pattern: 'wash',       rarity: 'uncommon' },
    { id: 'scribble',      weight: 10, bg: '#f2f2f2', pattern: 'scribble',   rarity: 'uncommon' },
    { id: 'black_splat',   weight: 8,  bg: '#0a0a0a', pattern: 'splatter',   rarity: 'rare' },
    { id: 'black_clean',   weight: 8,  bg: '#0d0d0d', pattern: 'none',       rarity: 'rare' },
    { id: 'grey_wash',     weight: 8,  bg: '#888888', pattern: 'wash',       rarity: 'rare' },
    { id: 'chaos',         weight: 4,  bg: '#f5f5f5', pattern: 'chaos',      rarity: 'rare' }
  ],
  headShape: [
    { id: 'round',      weight: 26, rarity: 'common' },
    { id: 'oval',       weight: 22, rarity: 'common' },
    { id: 'square',     weight: 18, rarity: 'common' },
    { id: 'angular',    weight: 14, rarity: 'uncommon' },
    { id: 'skull',      weight: 12, rarity: 'uncommon' },
    { id: 'elongated',  weight: 10, rarity: 'uncommon' },
    { id: 'wide',       weight: 8,  rarity: 'rare' },
    { id: 'sunken',     weight: 6,  rarity: 'rare' },
    { id: 'abstract',   weight: 4,  rarity: 'rare' }
  ],
  headFill: [
    { id: 'outline',      weight: 30, rarity: 'common' },
    { id: 'light_shade',  weight: 26, rarity: 'common' },
    { id: 'hatch_shade',  weight: 20, rarity: 'common' },
    { id: 'heavy_shade',  weight: 14, rarity: 'uncommon' },
    { id: 'ink_black',    weight: 8,  rarity: 'rare' },
    { id: 'splatter',     weight: 4,  rarity: 'rare' }
  ],
  hair: [
    { id: 'none',        weight: 14, rarity: 'common' },
    { id: 'short_messy', weight: 16, rarity: 'common' },
    { id: 'spiky',       weight: 14, rarity: 'common' },
    { id: 'mohawk',      weight: 12, rarity: 'uncommon' },
    { id: 'long_wild',   weight: 12, rarity: 'uncommon' },
    { id: 'dreads',      weight: 10, rarity: 'uncommon' },
    { id: 'bush',        weight: 8,  rarity: 'uncommon' },
    { id: 'cap',         weight: 8,  rarity: 'uncommon' },
    { id: 'bandana',     weight: 6,  rarity: 'rare' },
    { id: 'horns',       weight: 4,  rarity: 'rare' },
    { id: 'tentacles',   weight: 2,  rarity: 'rare' }
  ],
  eyeColor: [
    { id: 'black',  weight: 38, hex: '#111111', glow: '#444444', rarity: 'common' },
    { id: 'blue',   weight: 32, hex: '#627eea', glow: '#8ba4ff', rarity: 'uncommon' },
    { id: 'orange', weight: 22, hex: '#f7931a', glow: '#ffb347', rarity: 'uncommon' },
    { id: 'green',  weight: 20, hex: '#2ecc40', glow: '#5eff70', rarity: 'uncommon' },
    { id: 'red',    weight: 10, hex: '#e63e3e', glow: '#ff6b6b', rarity: 'rare' },
    { id: 'white',  weight: 6,  hex: '#ffffff', glow: '#ffffff', rarity: 'rare' },
    { id: 'purple', weight: 8,  hex: '#a855f7', glow: '#d8b4fe', rarity: 'rare' }
  ],
  eyeStyle: [
    { id: 'starburst',     weight: 50, rarity: 'common' },
    { id: 'starburst_lg',  weight: 20, rarity: 'uncommon' },
    { id: 'hollow_star',   weight: 14, rarity: 'uncommon' },
    { id: 'x_eyes',        weight: 10, rarity: 'rare' },
    { id: 'spiral',        weight: 6,  rarity: 'rare' }
  ],
  mouth: [
    { id: 'flat',       weight: 18, rarity: 'common' },
    { id: 'grin',       weight: 20, rarity: 'common' },
    { id: 'teeth',      weight: 18, rarity: 'common' },
    { id: 'open',       weight: 14, rarity: 'uncommon' },
    { id: 'stitched',   weight: 12, rarity: 'uncommon' },
    { id: 'snarl',      weight: 10, rarity: 'uncommon' },
    { id: 'fangs',      weight: 6,  rarity: 'rare' },
    { id: 'none',       weight: 4,  rarity: 'rare' }
  ],
  clothing: [
    { id: 'none',        weight: 16, rarity: 'common' },
    { id: 'tshirt',      weight: 20, rarity: 'common' },
    { id: 'collar',      weight: 16, rarity: 'common' },
    { id: 'scarf',       weight: 14, rarity: 'uncommon' },
    { id: 'suit',        weight: 10, rarity: 'uncommon' },
    { id: 'robe',        weight: 8,  rarity: 'uncommon' },
    { id: 'tank',        weight: 8,  rarity: 'uncommon' },
    { id: 'chains',      weight: 6,  rarity: 'rare' },
    { id: 'armor',       weight: 4,  rarity: 'rare' }
  ],
  accessory: [
    { id: 'none',         weight: 30, rarity: 'common' },
    { id: 'glasses',      weight: 20, rarity: 'common' },
    { id: 'sunglasses',   weight: 14, rarity: 'uncommon' },
    { id: 'scar',         weight: 12, rarity: 'uncommon' },
    { id: 'earring',      weight: 10, rarity: 'uncommon' },
    { id: 'nose_ring',    weight: 8,  rarity: 'uncommon' },
    { id: 'tattoo_face',  weight: 6,  rarity: 'rare' },
    { id: 'graffiti_tag', weight: 4,  rarity: 'rare' }
  ],
  expression: [
    { id: 'neutral',   weight: 28, rarity: 'common' },
    { id: 'menacing',  weight: 22, rarity: 'common' },
    { id: 'goofy',     weight: 18, rarity: 'common' },
    { id: 'angry',     weight: 14, rarity: 'uncommon' },
    { id: 'dead',      weight: 10, rarity: 'uncommon' },
    { id: 'ecstatic',  weight: 8,  rarity: 'rare' }
  ],
  inkStyle: [
    { id: 'clean_line',  weight: 30, rarity: 'common' },
    { id: 'sketchy',     weight: 28, rarity: 'common' },
    { id: 'heavy_ink',   weight: 20, rarity: 'uncommon' },
    { id: 'loose',       weight: 14, rarity: 'uncommon' },
    { id: 'chaotic',     weight: 8,  rarity: 'rare' }
  ]
};

const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  const order = TIER_FALLBACK[tier] || ['common','uncommon','rare'];
  for (const t of order) {
    const sub = pool.filter(p => p.rarity === t);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}

// ---------- drawing helpers ----------
function rj(rng, v=2) { return (rng()-0.5)*v*2; }

function roughPath(pts, rng, jit=1.5) {
  return 'M'+pts.map(([x,y])=>`${(x+rj(rng,jit)).toFixed(1)},${(y+rj(rng,jit)).toFixed(1)}`).join('L')+'Z';
}

function roughLine(x1,y1,x2,y2,rng,w=2) {
  const mx=(x1+x2)/2+rj(rng,w), my=(y1+y2)/2+rj(rng,w);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

function roughEllipse(cx,cy,rx,ry,rng,segs=20,jit=1.5) {
  const pts=[];
  for(let i=0;i<=segs;i++){
    const a=(i/segs)*Math.PI*2;
    pts.push(`${(cx+Math.cos(a)*rx+rj(rng,jit)).toFixed(1)},${(cy+Math.sin(a)*ry+rj(rng,jit)).toFixed(1)}`);
  }
  return 'M'+pts.join('L')+'Z';
}

function roughRect(x,y,w,h,rng,jit=1.5) {
  return roughPath([[x,y],[x+w,y],[x+w,y+h],[x,y+h]], rng, jit);
}

function hatchLines(x,y,w,h,rng,step=8,angle=45,op=0.2) {
  const rad=angle*Math.PI/180, W=w+h, cx2=x+w/2, cy2=y+h/2;
  let d='';
  for(let i=-W;i<W;i+=step+(rng()-0.5)*step*0.3){
    const x1=cx2+i*Math.cos(rad)-W*Math.sin(rad), y1=cy2+i*Math.sin(rad)+W*Math.cos(rad);
    const x2=cx2+i*Math.cos(rad)+W*Math.sin(rad), y2=cy2+i*Math.sin(rad)-W*Math.cos(rad);
    if(rng()>0.08) d+=`M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d;
}

// ---------- starburst eye (the signature trait) ----------
function starburstEye(cx,cy,r,spikes,eyeColor,eyeGlow,rng,hollow=false,style='starburst') {
  let out='';
  const glowR=r+8;
  out+=`<circle cx="${cx}" cy="${cy}" r="${glowR+6}" fill="${eyeGlow}" opacity="0.15"/>`;
  out+=`<circle cx="${cx}" cy="${cy}" r="${glowR}" fill="${eyeGlow}" opacity="0.25"/>`;
  if(style==='spiral'){
    for(let i=0;i<3;i++){
      const rr=r*(1-i*0.28);
      out+=`<path d="${roughEllipse(cx,cy,rr,rr*0.85,rng,14,1)}" fill="none" stroke="${eyeColor}" stroke-width="1.5"/>`;
    }
    out+=`<circle cx="${cx}" cy="${cy}" r="${r*0.2}" fill="${eyeColor}"/>`;
    return out;
  }
  if(style==='x_eyes'){
    const w=r*0.9, sw=r*0.38;
    out+=`<line x1="${(cx-w).toFixed(1)}" y1="${(cy-w).toFixed(1)}" x2="${(cx+w).toFixed(1)}" y2="${(cy+w).toFixed(1)}" stroke="${eyeColor}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`;
    out+=`<line x1="${(cx+w).toFixed(1)}" y1="${(cy-w).toFixed(1)}" x2="${(cx-w).toFixed(1)}" y2="${(cy+w).toFixed(1)}" stroke="${eyeColor}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`;
    return out;
  }
  // starburst: inner circle + radiating spikes
  const innerR = r*0.38;
  let stard='';
  for(let i=0;i<spikes;i++){
    const a=(Math.PI*2/spikes)*i+(rng()-0.5)*0.12;
    const outerR=r*(0.85+rng()*0.3);
    const ax=cx+Math.cos(a)*outerR, ay=cy+Math.sin(a)*outerR;
    const a2=a+Math.PI/spikes;
    const bx=cx+Math.cos(a2)*innerR*0.7, by=cy+Math.sin(a2)*innerR*0.7;
    stard+=`L${ax.toFixed(1)},${ay.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)} `;
  }
  const firstA=0, firstX=cx+Math.cos(firstA)*r, firstY=cy+Math.sin(firstA)*r;
  stard=`M${firstX.toFixed(1)},${firstY.toFixed(1)} `+stard+'Z';
  if(hollow){
    out+=`<path d="${stard}" fill="none" stroke="${eyeColor}" stroke-width="1.8" stroke-linejoin="round"/>`;
  } else {
    out+=`<path d="${stard}" fill="${eyeColor}" stroke="none"/>`;
  }
  out+=`<circle cx="${cx}" cy="${cy}" r="${innerR.toFixed(1)}" fill="${eyeColor}"/>`;
  return out;
}

// ---------- background pattern ----------
function bgPattern(pattern, bg, rng, ink) {
  let out='';
  const W=400,H=480, isDark=bg<'#888888';
  const dotC=isDark?'#ffffff':'#000000';
  if(pattern==='dots'){
    for(let i=0;i<60;i++){
      const x=rng()*W,y=rng()*H,r=rng()*2+0.4;
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${dotC}" opacity="${(rng()*0.25+0.05).toFixed(2)}"/>`;
    }
  } else if(pattern==='hatch'){
    out+=`<path d="${hatchLines(0,0,W,H,rng,12,45)}" stroke="${dotC}" stroke-width="0.5" fill="none" opacity="0.12"/>`;
  } else if(pattern==='crosshatch'){
    out+=`<path d="${hatchLines(0,0,W,H,rng,10,45)}" stroke="${dotC}" stroke-width="0.5" fill="none" opacity="0.10"/>`;
    out+=`<path d="${hatchLines(0,0,W,H,mulberry32(rng()*99999|0),10,135)}" stroke="${dotC}" stroke-width="0.5" fill="none" opacity="0.10"/>`;
  } else if(pattern==='wash'){
    for(let i=0;i<8;i++){
      const x=rng()*W,y=rng()*H,rx=40+rng()*80,ry=20+rng()*50;
      out+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${dotC}" opacity="${(rng()*0.12+0.03).toFixed(2)}"/>`;
    }
  } else if(pattern==='splatter'){
    for(let i=0;i<30;i++){
      const x=rng()*W,y=rng()*H,r=rng()*5+0.5;
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${dotC}" opacity="${(rng()*0.4+0.1).toFixed(2)}"/>`;
    }
    for(let i=0;i<8;i++){
      const x=rng()*W,y=rng()*H;
      out+=`<path d="${roughLine(x,y,x+(rng()-0.5)*60,y+(rng()-0.5)*60,rng,5)}" stroke="${dotC}" stroke-width="${(rng()*2+0.5).toFixed(1)}" fill="none" opacity="${(rng()*0.3+0.05).toFixed(2)}"/>`;
    }
  } else if(pattern==='scribble'){
    for(let i=0;i<6;i++){
      const x=rng()*W,y=rng()*H;
      let d=`M${x.toFixed(0)},${y.toFixed(0)}`;
      for(let j=0;j<8;j++) d+=` L${(x+(rng()-0.5)*80).toFixed(0)},${(y+(rng()-0.5)*80).toFixed(0)}`;
      out+=`<path d="${d}" stroke="${dotC}" stroke-width="0.6" fill="none" opacity="0.15"/>`;
    }
  } else if(pattern==='chaos'){
    for(let i=0;i<20;i++){
      const x=rng()*W,y=rng()*H;
      let d=`M${x.toFixed(0)},${y.toFixed(0)}`;
      for(let j=0;j<12;j++) d+=` L${(rng()*W).toFixed(0)},${(rng()*H).toFixed(0)}`;
      out+=`<path d="${d}" stroke="${dotC}" stroke-width="${(rng()*1.5+0.3).toFixed(1)}" fill="none" opacity="${(rng()*0.18+0.04).toFixed(2)}"/>`;
    }
  }
  return out;
}

// ---------- hair markup ----------
function hairMarkup(style,cx,cy,headRx,headRy,ink,rng) {
  let out='';
  if(style==='spiky'){
    const count=5+Math.floor(rng()*4);
    for(let i=0;i<count;i++){
      const a=-Math.PI+(i/(count-1))*Math.PI;
      const len=28+rng()*22;
      const bx=cx+Math.cos(a)*headRx*0.85, by=cy+Math.sin(a)*headRy*0.85;
      const tx=bx+Math.cos(a)*len+(rng()-0.5)*8, ty=by+Math.sin(a)*len-(rng()-0.5)*6;
      const lx=bx+Math.cos(a-0.18)*(len*0.5), ly=by+Math.sin(a-0.18)*(len*0.5);
      const rx2=bx+Math.cos(a+0.18)*(len*0.5), ry2=by+Math.sin(a+0.18)*(len*0.5);
      out+=`<path d="M${lx.toFixed(1)},${ly.toFixed(1)} L${tx.toFixed(1)},${ty.toFixed(1)} L${rx2.toFixed(1)},${ry2.toFixed(1)}" fill="${ink}" stroke="${ink}" stroke-width="0.8" stroke-linejoin="round"/>`;
    }
  } else if(style==='mohawk'){
    const w=14+rng()*8;
    out+=`<path d="M${(cx-w/2+(rng()-0.5)*2).toFixed(1)},${(cy-headRy+4).toFixed(1)} L${(cx+(rng()-0.5)*4).toFixed(1)},${(cy-headRy-40-rng()*20).toFixed(1)} L${(cx+w/2+(rng()-0.5)*2).toFixed(1)},${(cy-headRy+4).toFixed(1)}" fill="${ink}" stroke="${ink}" stroke-width="1"/>`;
  } else if(style==='short_messy'){
    for(let i=0;i<16;i++){
      const a=-Math.PI+(i/15)*Math.PI;
      const r1=headRx*0.9, r2=r1+12+rng()*12;
      out+=`<path d="${roughLine(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1,cx+Math.cos(a)*r2,cy+Math.sin(a)*r2-4,rng,3)}" stroke="${ink}" stroke-width="${(0.9+rng()*0.8).toFixed(1)}" fill="none"/>`;
    }
  } else if(style==='long_wild'){
    [[-1,1],[1,1]].forEach(([side])=>{
      const rx2=cx+side*(headRx-4);
      for(let i=0;i<4;i++){
        const startY=cy-headRy*0.4+i*20;
        const endX=rx2+side*(30+rng()*30), endY=startY+80+rng()*60;
        out+=`<path d="M${rx2.toFixed(1)},${startY.toFixed(1)} Q${(rx2+side*(20+rng()*20)).toFixed(1)},${(startY+40+rng()*20).toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}" stroke="${ink}" stroke-width="${(1+rng()*0.8).toFixed(1)}" fill="none"/>`;
      }
    });
    // top mass
    for(let i=0;i<10;i++){
      const a=-Math.PI+(i/9)*Math.PI;
      const r=headRx+8+rng()*16;
      out+=`<path d="${roughLine(cx+Math.cos(a)*(headRx-4),cy+Math.sin(a)*(headRy-4),cx+Math.cos(a)*r,cy+Math.sin(a)*r-8,rng,4)}" stroke="${ink}" stroke-width="1.2" fill="none"/>`;
    }
  } else if(style==='dreads'){
    const count=6+Math.floor(rng()*4);
    for(let i=0;i<count;i++){
      const a=-Math.PI*0.7+(i/(count-1))*Math.PI*1.2;
      const len=50+rng()*60;
      const bx=cx+Math.cos(a)*headRx*0.7, by=cy+Math.sin(a)*headRy*0.7-10;
      const tx=bx+Math.cos(a)*len+(rng()-0.5)*12;
      const ty=by+len*0.8+(rng()-0.5)*10;
      const w=4+rng()*3;
      out+=`<path d="M${bx.toFixed(1)},${by.toFixed(1)} Q${(bx+(rng()-0.5)*20).toFixed(1)},${(by+len*0.4).toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}" stroke="${ink}" stroke-width="${w.toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // texture marks
      for(let j=1;j<4;j++){
        const py=by+ty*j*0.22;
        out+=`<path d="${roughLine(bx-w*0.4,py,bx+w*0.4,py,rng,0.5)}" stroke="${ink}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
      }
    }
  } else if(style==='bush'){
    for(let i=0;i<22;i++){
      const a=-Math.PI+(i/21)*Math.PI;
      const r=headRx*(0.85+rng()*0.5);
      out+=`<path d="${roughLine(cx+Math.cos(a)*headRx*0.75,cy+Math.sin(a)*headRy*0.75,cx+Math.cos(a)*r,cy+Math.sin(a)*r-6,rng,3)}" stroke="${ink}" stroke-width="${(0.8+rng()*1).toFixed(1)}" fill="none"/>`;
    }
  } else if(style==='cap'){
    const brimW=headRx+14;
    out+=`<path d="${roughRect(cx-brimW*0.8,cy-headRy-2,brimW*1.6,8,rng,2)}" fill="${ink}" stroke="${ink}" stroke-width="0.8"/>`;
    out+=`<path d="${roughRect(cx-headRx*0.85,cy-headRy-22,headRx*1.7,24,rng,1.5)}" fill="${ink}" stroke="${ink}" stroke-width="0.8"/>`;
    // brim extension
    out+=`<path d="${roughLine(cx-brimW*0.8,cy-headRy+6,cx-brimW*1.2,cy-headRy+10,rng,1)}" stroke="${ink}" stroke-width="3" fill="none"/>`;
  } else if(style==='bandana'){
    out+=`<path d="M${(cx-headRx-2).toFixed(0)},${(cy-headRy*0.3).toFixed(0)} Q${cx},${(cy-headRy*1.2).toFixed(0)} ${(cx+headRx+2).toFixed(0)},${(cy-headRy*0.3).toFixed(0)}" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    // knot
    out+=`<path d="${roughEllipse(cx+headRx+6,cy-headRy*0.3,8,6,rng,10,1)}" fill="${ink}"/>`;
  } else if(style==='horns'){
    [[-1,1],[1,1]].forEach(([side])=>{
      const bx=cx+side*headRx*0.5, by=cy-headRy*0.7;
      out+=`<path d="M${(bx-6*side+(rng()-0.5)*2).toFixed(1)},${by.toFixed(1)} L${(bx+side*(14+rng()*8)).toFixed(1)},${(by-30-rng()*20).toFixed(1)} L${(bx+10*side+(rng()-0.5)*2).toFixed(1)},${by.toFixed(1)}" fill="${ink}" stroke="${ink}" stroke-width="1"/>`;
    });
  } else if(style==='tentacles'){
    const count=5+Math.floor(rng()*4);
    for(let i=0;i<count;i++){
      const a=-Math.PI+(i/(count-1))*Math.PI*1.1;
      const len=40+rng()*50;
      const bx=cx+Math.cos(a)*headRx*0.8, by=cy+Math.sin(a)*headRy*0.8;
      let d=`M${bx.toFixed(1)},${by.toFixed(1)}`;
      let px=bx,py=by;
      for(let s=0;s<5;s++){
        px+=Math.cos(a)*len*0.2+(rng()-0.5)*18;
        py+=Math.sin(a)*len*0.2-8+(rng()-0.5)*10;
        d+=` L${px.toFixed(1)},${py.toFixed(1)}`;
      }
      out+=`<path d="${d}" stroke="${ink}" stroke-width="${(3-i*0.3).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // suckers
      for(let s=0;s<3;s++){
        const t=0.3+s*0.25;
        const sx2=bx+Math.cos(a)*len*t+(rng()-0.5)*8;
        const sy2=by+Math.sin(a)*len*t-s*8+(rng()-0.5)*6;
        out+=`<circle cx="${sx2.toFixed(1)}" cy="${sy2.toFixed(1)}" r="${(2+rng()*1.5).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="0.8"/>`;
      }
    }
  }
  return out;
}

// ---------- clothing markup ----------
function clothingMarkup(style,cx,cy,headRy,ink,eyeHex,rng) {
  const neckX=cx, neckY=cy+headRy-4;
  const bw=140, bh=110, bx=cx-bw/2, by=neckY+30;
  let out='';
  if(style==='none') {
    out+=`<path d="${roughLine(cx-14,neckY,cx-14,neckY+28,rng,1)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<path d="${roughLine(cx+14,neckY,cx+14,neckY+28,rng,1)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    return out;
  }
  // neck always
  out+=`<path d="${roughRect(cx-14,neckY,28,32,rng,1)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
  if(style==='tshirt'){
    out+=`<path d="${roughPath([[bx-20,by],[bx+bw+20,by],[bx+bw,by+bh],[bx,by+bh]],rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    // sleeves
    out+=`<path d="M${(bx-20).toFixed(0)},${by} L${(bx-50+(rng()-0.5)*4).toFixed(0)},${(by+40+(rng()-0.5)*4).toFixed(0)} L${(bx+10).toFixed(0)},${(by+50).toFixed(0)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<path d="M${(bx+bw+20).toFixed(0)},${by} L${(bx+bw+50+(rng()-0.5)*4).toFixed(0)},${(by+40+(rng()-0.5)*4).toFixed(0)} L${(bx+bw-10).toFixed(0)},${(by+50).toFixed(0)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
  } else if(style==='collar'){
    out+=`<path d="M${(cx-30).toFixed(0)},${(neckY+28).toFixed(0)} L${(cx-20).toFixed(0)},${(neckY+60).toFixed(0)} L${(cx+20).toFixed(0)},${(neckY+60).toFixed(0)} L${(cx+30).toFixed(0)},${(neckY+28).toFixed(0)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<path d="${roughRect(cx-60,neckY+28,120,bh*0.8,rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
  } else if(style==='scarf'){
    out+=`<path d="M${(cx-headRy*0.7).toFixed(0)},${(neckY+8).toFixed(0)} Q${cx},${(neckY+30).toFixed(0)} ${(cx+headRy*0.7).toFixed(0)},${(neckY+8).toFixed(0)}" stroke="${ink}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.85"/>`;
    // stripes
    for(let i=0;i<5;i++){
      const y2=neckY+8+i*3;
      out+=`<path d="${roughLine(cx-headRy*0.65,y2,cx+headRy*0.65,y2,rng,1)}" stroke="white" stroke-width="1" fill="none" opacity="0.3"/>`;
    }
    // tail
    out+=`<path d="M${(cx+headRy*0.6).toFixed(0)},${(neckY+8).toFixed(0)} Q${(cx+headRy+20+(rng()-0.5)*10).toFixed(0)},${(neckY+50).toFixed(0)} ${(cx+headRy+10+(rng()-0.5)*10).toFixed(0)},${(neckY+90).toFixed(0)}" stroke="${ink}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  } else if(style==='suit'){
    out+=`<path d="${roughPath([[bx,by],[bx+bw,by],[bx+bw+20,by+bh],[bx-20,by+bh]],rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    out+=`<path d="${roughLine(cx-16,neckY+28,cx-30,by+bh,rng,3)}" stroke="${ink}" stroke-width="3" fill="none"/>`;
    out+=`<path d="${roughLine(cx+16,neckY+28,cx+30,by+bh,rng,3)}" stroke="${ink}" stroke-width="3" fill="none"/>`;
    // tie
    out+=`<path d="M${(cx-8).toFixed(0)},${(neckY+30).toFixed(0)} L${cx},${(neckY+70+(rng()-0.5)*6).toFixed(0)} L${(cx+8).toFixed(0)},${(neckY+30).toFixed(0)}" fill="${ink}"/>`;
  } else if(style==='robe'){
    out+=`<path d="${roughPath([[bx-30,by],[bx+bw+30,by],[bx+bw+50,by+bh],[bx-50,by+bh]],rng,2)}" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
    // center line
    out+=`<path d="${roughLine(cx,neckY+30,cx+(rng()-0.5)*10,by+bh,rng,4)}" stroke="${ink}" stroke-width="1.5" fill="none"/>`;
    // hatch texture
    const rng2=mulberry32((rng()*99999)|0);
    out+=`<path d="${hatchLines(bx-30,by,bw+60,bh,rng2,9,75)}" stroke="${ink}" stroke-width="0.5" fill="none" opacity="0.18"/>`;
  } else if(style==='tank'){
    out+=`<path d="${roughPath([[bx+20,by],[bx+bw-20,by],[bx+bw,by+bh],[bx,by+bh]],rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
  } else if(style==='chains'){
    out+=`<path d="${roughRect(bx+10,by,bw-20,bh,rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    for(let i=0;i<3;i++){
      const cy2=neckY+20+i*14;
      out+=`<path d="${roughLine(cx-40,cy2,cx+40,cy2+(rng()-0.5)*4,rng,2)}" stroke="${eyeHex}" stroke-width="2.5" fill="none" opacity="0.8"/>`;
      for(let j=-3;j<=3;j++){
        out+=`<circle cx="${(cx+j*13+(rng()-0.5)*2).toFixed(0)}" cy="${(cy2+(rng()-0.5)*2).toFixed(0)}" r="3" fill="none" stroke="${eyeHex}" stroke-width="1.2"/>`;
      }
    }
  } else if(style==='armor'){
    out+=`<path d="${roughPath([[bx-10,by],[bx+bw+10,by],[bx+bw+20,by+bh],[bx-20,by+bh]],rng,1.5)}" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
    out+=`<path d="${roughPath([[bx+14,by+10],[bx+bw-14,by+10],[bx+bw-4,by+bh*0.6],[cx,by+bh*0.7],[bx+4,by+bh*0.6]],rng,2)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    for(let i=0;i<4;i++){
      out+=`<path d="${roughLine(bx+14,by+22+i*14,bx+bw-14,by+22+i*14,rng,2)}" stroke="${ink}" stroke-width="1" fill="none"/>`;
    }
  }
  return out;
}

// ---------- accessory markup ----------
function accessoryMarkup(style,cx,cy,eyeL,eyeR,eyeY,eyeR2,ink,eyeHex,rng,headRy,hairId) {
  let out='';
  if(style==='glasses'){
    [[eyeL,eyeY],[eyeR,eyeY]].forEach(([gx,gy])=>{
      out+=`<path d="${roughEllipse(gx,gy,eyeR2+5,eyeR2+4,rng,14,1)}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    });
    out+=`<path d="${roughLine(eyeL+eyeR2+5,eyeY,eyeR-eyeR2-5,eyeY,rng,1)}" stroke="${ink}" stroke-width="1.8" fill="none"/>`;
    out+=`<path d="${roughLine(eyeL-eyeR2-5,eyeY,eyeL-eyeR2-20+(rng()-0.5)*4,eyeY+(rng()-0.5)*4,rng,1)}" stroke="${ink}" stroke-width="1.5" fill="none"/>`;
    out+=`<path d="${roughLine(eyeR+eyeR2+5,eyeY,eyeR+eyeR2+20+(rng()-0.5)*4,eyeY+(rng()-0.5)*4,rng,1)}" stroke="${ink}" stroke-width="1.5" fill="none"/>`;
  } else if(style==='sunglasses'){
    out+=`<path d="${roughRect(cx-55,eyeY-12,110,24,rng,1.5)}" fill="${ink}" stroke="${ink}" stroke-width="1"/>`;
    out+=`<path d="${roughLine(cx-55,eyeY,cx-80+(rng()-0.5)*4,eyeY+2,rng,1)}" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
    out+=`<path d="${roughLine(cx+55,eyeY,cx+80+(rng()-0.5)*4,eyeY+2,rng,1)}" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
    out+=`<line x1="${(cx-2).toFixed(0)}" y1="${(eyeY-12).toFixed(0)}" x2="${(cx+2).toFixed(0)}" y2="${(eyeY+12).toFixed(0)}" stroke="white" stroke-width="3"/>`;
  } else if(style==='scar'){
    const sx=cx+(rng()-0.5)*40, sy=cy-10;
    out+=`<path d="${roughLine(sx,sy-16,sx+(rng()-0.5)*6,sy+18,rng,2)}" stroke="${ink}" stroke-width="2" fill="none" opacity="0.85"/>`;
    for(let i=0;i<5;i++){
      const stitchy=sy-14+i*7+(rng()-0.5)*2;
      out+=`<path d="${roughLine(sx-4,stitchy,sx+4,stitchy,rng,0.5)}" stroke="${ink}" stroke-width="0.8" fill="none"/>`;
    }
  } else if(style==='earring'){
    out+=`<circle cx="${(cx-70).toFixed(0)}" cy="${(cy+22+(rng()-0.5)*6).toFixed(0)}" r="5" fill="none" stroke="${eyeHex}" stroke-width="2"/>`;
    out+=`<circle cx="${(cx-70).toFixed(0)}" cy="${(cy+36+(rng()-0.5)*4).toFixed(0)}" r="3" fill="${eyeHex}"/>`;
  } else if(style==='nose_ring'){
    out+=`<path d="${roughEllipse(cx,cy+28,8,5,rng,10,0.8)}" fill="none" stroke="${eyeHex}" stroke-width="2"/>`;
  } else if(style==='tattoo_face'){
    // abstract tribal mark — a small cluster of angular ink strokes, no symbols
    const tx=cx+(rng()-0.5)*30, ty=cy+(rng()-0.5)*20;
    const armCount=3+Math.floor(rng()*3);
    for(let i=0;i<armCount;i++){
      const a=(Math.PI*2/armCount)*i+(rng()-0.5)*0.4;
      const len=6+rng()*8;
      out+=`<path d="${roughLine(tx,ty,tx+Math.cos(a)*len,ty+Math.sin(a)*len,rng,1)}" stroke="${ink}" stroke-width="1" fill="none" opacity="0.5"/>`;
    }
    out+=`<circle cx="${tx.toFixed(0)}" cy="${ty.toFixed(0)}" r="1.5" fill="${ink}" opacity="0.5"/>`;
    // additional marks
    for(let i=0;i<3;i++){
      out+=`<path d="${roughLine(cx+(rng()-0.5)*50,cy+(rng()-0.5)*40,cx+(rng()-0.5)*50,cy+(rng()-0.5)*40,rng,15)}" stroke="${ink}" stroke-width="0.7" fill="none" opacity="0.3"/>`;
    }
  } else if(style==='graffiti_tag'){
    // Text color distribution: 20% red, 20% chain color (bitcoin or eth,
    // picked independently of the collection's UI chain toggle so the
    // engine stays self-contained), 60% the piece's own ink color.
    const bucket=rng();
    let textColor=ink;
    if(bucket<0.2) textColor='#e63e3e';
    else if(bucket<0.4) textColor=rng()<0.5?'#f7931a':'#627eea';
    // Top-of-head placement is allowed, but only for hairstyles where the
    // dead-center zone above the head is actually clear. 'none' has no hair
    // at all; 'horns' sit at ±0.5*headRx leaving the center gap open. Every
    // other style (mohawk, spiky, cap, bandana, etc.) covers that zone to
    // varying degrees, so those fall back to the neck/collar placement that
    // fixed the original overlap bug.
    const TOP_SAFE_HAIR=['none','horns'];
    let tx, ty, rot;
    if(TOP_SAFE_HAIR.includes(hairId)){
      tx=cx+(rng()-0.5)*8;
      ty=cy-(headRy||80)-18+(rng()-0.5)*6;
      rot=(rng()-0.5)*10;
    } else {
      tx=cx+(rng()-0.5)*8;
      ty=cy+(headRy||80)+46+(rng()-0.5)*8;
      rot=(rng()-0.5)*8;
    }
    out+=`<text x="${tx.toFixed(0)}" y="${ty.toFixed(0)}" font-size="15" fill="${textColor}" opacity="0.7" font-family="monospace" font-weight="bold" text-anchor="middle" transform="rotate(${rot.toFixed(0)} ${tx.toFixed(0)} ${ty.toFixed(0)})">COB</text>`;
  }
  return out;
}

// ---------- face expression modifier ----------
function expressionMod(expr,cx,cy,eyeY,ink,rng) {
  let out='';
  if(expr==='menacing'){
    // heavy brow lines
    [[cx-30,eyeY-14],[cx+30,eyeY-14]].forEach(([bx,by])=>{
      out+=`<path d="${roughLine(bx-12,by+4,bx+12,by-4,rng,2)}" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
    });
  } else if(expr==='angry'){
    [[cx-30,eyeY-14],[cx+30,eyeY-14]].forEach(([bx,by],i)=>{
      const dir=i===0?1:-1;
      out+=`<path d="${roughLine(bx-12,by-2*dir,bx+12,by+6*dir,rng,2)}" stroke="${ink}" stroke-width="3" fill="none"/>`;
    });
    // forehead vein
    out+=`<path d="M${(cx-4).toFixed(0)},${(eyeY-30).toFixed(0)} Q${(cx+8+(rng()-0.5)*4).toFixed(0)},${(eyeY-20).toFixed(0)} ${(cx+2).toFixed(0)},${(eyeY-12).toFixed(0)}" stroke="${ink}" stroke-width="1.5" fill="none"/>`;
  } else if(expr==='dead'){
    // drooping lines
    [[cx-30,eyeY],[cx+30,eyeY]].forEach(([bx,by])=>{
      out+=`<path d="${roughLine(bx-10,by-8,bx+10,by+2,rng,1)}" stroke="${ink}" stroke-width="1.8" fill="none" opacity="0.6"/>`;
    });
  } else if(expr==='ecstatic'){
    // arched brows high up
    [[cx-30,eyeY-18],[cx+30,eyeY-18]].forEach(([bx,by])=>{
      out+=`<path d="M${(bx-12).toFixed(0)},${(by+4).toFixed(0)} Q${bx},${(by-8).toFixed(0)} ${(bx+12).toFixed(0)},${(by+4).toFixed(0)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    });
  } else if(expr==='goofy'){
    // one brow raised
    out+=`<path d="${roughLine(cx-42,eyeY-10,cx-18,eyeY-16,rng,2)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<path d="${roughLine(cx+18,eyeY-18,cx+42,eyeY-12,rng,2)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
  } else {
    // neutral brows
    [[cx-30,eyeY-14],[cx+30,eyeY-14]].forEach(([bx,by])=>{
      out+=`<path d="${roughLine(bx-12,by,bx+12,by,rng,1)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    });
  }
  return out;
}

// ---------- mouth markup ----------
function mouthMarkup(style,cx,cy,ink,rng) {
  const my=cy+46;
  let out='';
  if(style==='flat'){
    out+=`<path d="${roughLine(cx-20,my,cx+20,my,rng,2)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
  } else if(style==='grin'){
    out+=`<path d="M${(cx-24).toFixed(0)},${my} Q${cx},${(my+18).toFixed(0)} ${(cx+24).toFixed(0)},${my}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<path d="M${(cx-22).toFixed(0)},${my} L${(cx+22).toFixed(0)},${my}" stroke="${ink}" stroke-width="1" fill="none"/>`;
  } else if(style==='teeth'){
    out+=`<path d="${roughRect(cx-24,my,48,14,rng,1.5)}" fill="white" stroke="${ink}" stroke-width="1.5"/>`;
    for(let i=0;i<5;i++) out+=`<line x1="${(cx-20+i*10).toFixed(0)}" y1="${my}" x2="${(cx-20+i*10).toFixed(0)}" y2="${(my+14).toFixed(0)}" stroke="${ink}" stroke-width="0.8"/>`;
    out+=`<path d="M${(cx-24).toFixed(0)},${my} Q${cx},${(my-8).toFixed(0)} ${(cx+24).toFixed(0)},${my}" stroke="${ink}" stroke-width="1.5" fill="none"/>`;
  } else if(style==='open'){
    out+=`<path d="${roughEllipse(cx,my+8,18,12,rng,12,1.5)}" fill="${ink}"/>`;
    out+=`<path d="${roughEllipse(cx,my+8,14,8,rng,12,1)}" fill="#1a1a1a"/>`;
  } else if(style==='stitched'){
    out+=`<path d="${roughLine(cx-24,my,cx+24,my,rng,1.5)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    for(let i=0;i<7;i++){
      const sx=cx-21+i*7;
      out+=`<path d="${roughLine(sx-2,my-5,sx+2,my+5,rng,1)}" stroke="${ink}" stroke-width="1.2" fill="none"/>`;
    }
  } else if(style==='snarl'){
    out+=`<path d="M${(cx-24).toFixed(0)},${(my-4).toFixed(0)} Q${(cx+4).toFixed(0)},${(my+8).toFixed(0)} ${(cx+24).toFixed(0)},${(my-8).toFixed(0)}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    out+=`<rect x="${(cx-22).toFixed(0)}" y="${(my-4).toFixed(0)}" width="${(8+rng()*8).toFixed(0)}" height="7" rx="1" fill="white" stroke="${ink}" stroke-width="1"/>`;
  } else if(style==='fangs'){
    out+=`<path d="M${(cx-26).toFixed(0)},${my} Q${cx},${(my+10).toFixed(0)} ${(cx+26).toFixed(0)},${my}" stroke="${ink}" stroke-width="2" fill="none"/>`;
    [[cx-10,my],[cx+10,my]].forEach(([fx,fy])=>{
      out+=`<path d="M${fx},${fy} L${(fx-4).toFixed(0)},${(fy+12).toFixed(0)} L${(fx+4).toFixed(0)},${(fy+12).toFixed(0)}Z" fill="white" stroke="${ink}" stroke-width="1"/>`;
    });
  }
  return out;
}

// ---------- head fill / shading ----------
function headFillMarkup(style,headPath,cx,cy,headRx,headRy,ink,rng) {
  if(style==='outline') return '';
  let out='';
  const clipId='hf_'+Math.abs((cx*cy+headRx)|0);
  out+=`<clipPath id="${clipId}"><path d="${headPath}"/></clipPath>`;
  out+=`<g clip-path="url(#${clipId})">`;
  if(style==='light_shade'){
    out+=`<path d="${hatchLines(cx-headRx,cy-headRy,headRx*2,headRy*2,rng,10,65)}" stroke="${ink}" stroke-width="0.6" fill="none" opacity="0.15"/>`;
  } else if(style==='hatch_shade'){
    out+=`<path d="${hatchLines(cx-headRx,cy-headRy,headRx*2,headRy*2,rng,7,60)}" stroke="${ink}" stroke-width="0.7" fill="none" opacity="0.20"/>`;
    out+=`<path d="${hatchLines(cx-headRx,cy-headRy,headRx*2,headRy*2,mulberry32((rng()*99999)|0),14,145)}" stroke="${ink}" stroke-width="0.5" fill="none" opacity="0.12"/>`;
  } else if(style==='heavy_shade'){
    out+=`<path d="${hatchLines(cx-headRx,cy-headRy,headRx*2,headRy*2,rng,5,60)}" stroke="${ink}" stroke-width="0.8" fill="none" opacity="0.28"/>`;
    out+=`<path d="${hatchLines(cx-headRx,cy-headRy,headRx*2,headRy*2,mulberry32((rng()*99999)|0),5,150)}" stroke="${ink}" stroke-width="0.6" fill="none" opacity="0.18"/>`;
  } else if(style==='ink_black'){
    out+=`<path d="${headPath}" fill="${ink}" opacity="0.85"/>`;
  } else if(style==='splatter'){
    for(let i=0;i<20;i++){
      const sx=cx+(rng()-0.5)*headRx*1.6, sy=cy+(rng()-0.5)*headRy*1.6, sr=rng()*6+1;
      out+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${ink}" opacity="${(rng()*0.4+0.1).toFixed(2)}"/>`;
    }
  }
  out+='</g>';
  return out;
}

// ---------- ink style (stroke weight + jitter) ----------
function inkParams(style,rng) {
  if(style==='clean_line') return { sw:1.8, jit:1.2 };
  if(style==='sketchy')    return { sw:2.0+(rng()-0.5)*0.4, jit:2.2 };
  if(style==='heavy_ink')  return { sw:3.0+(rng()-0.5)*0.6, jit:1.8 };
  if(style==='loose')      return { sw:1.6+(rng()-0.5)*0.6, jit:3.5 };
  if(style==='chaotic')    return { sw:2.2+(rng()-0.5)*1.0, jit:4.5 };
  return { sw:2, jit:2 };
}

// ---------- render from explicit trait objects (used by UI lock system) ----------
function renderFromTraits(picks, index, seed) {
  const { background, headShape, headFill, hair, eyeColor, eyeStyle, mouth, clothing, accessory, expression, inkStyle } = picks;
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  // consume the same 11 picks worth of rng so downstream salted streams line up
  for (let i = 0; i < 11; i++) rng();

  const W=400, H=480;
  const cx=200, cy=210;
  const isDark = background.bg < '#888888';
  const ink = isDark ? '#e8e8e8' : '#111111';
  const { sw, jit } = inkParams(inkStyle.id, rng);

  let headRx=70, headRy=80;
  if(headShape.id==='oval')      { headRx=60; headRy=90; }
  if(headShape.id==='square')    { headRx=72; headRy=72; }
  if(headShape.id==='angular')   { headRx=74; headRy=78; }
  if(headShape.id==='skull')     { headRx=66; headRy=82; }
  if(headShape.id==='elongated') { headRx=54; headRy=96; }
  if(headShape.id==='wide')      { headRx=88; headRy=68; }
  if(headShape.id==='sunken')    { headRx=64; headRy=76; }
  if(headShape.id==='abstract')  { headRx=76+rng()*16; headRy=84+rng()*16; }

  let headPath;
  if(headShape.id==='square'){
    headPath=roughPath([[cx-headRx,cy-headRy],[cx+headRx,cy-headRy],[cx+headRx,cy+headRy],[cx-headRx,cy+headRy]],rng,jit);
  } else if(headShape.id==='angular'){
    headPath=roughPath([[cx,cy-headRy],[cx+headRx,cy-headRy*0.3],[cx+headRx*0.9,cy+headRy],[cx,cy+headRy*1.05],[cx-headRx*0.9,cy+headRy],[cx-headRx,cy-headRy*0.3]],rng,jit);
  } else {
    headPath=roughEllipse(cx,cy,headRx,headRy,rng,24,jit);
  }

  const eyeY=cy-12;
  const eyeOffX=headRx*0.38;
  const eyeL=cx-eyeOffX, eyeR2_pos=cx+eyeOffX;
  const eyeSpikes=eyeStyle.id==='starburst_lg'?14:10;
  const eyeR=eyeStyle.id==='starburst_lg'?16:12;
  const hollow=eyeStyle.id==='hollow_star';

  let svg=`<svg width="400" height="480" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg+=`<rect width="${W}" height="${H}" fill="${background.bg}"/>`;
  svg+=bgPattern(background.pattern, background.bg, rng, ink);
  svg+=clothingMarkup(clothing.id, cx, cy, headRy, ink, eyeColor.hex, mulberry32((seed??0)*100003+index+5));
  svg+=headFillMarkup(headFill.id, headPath, cx, cy, headRx, headRy, ink, mulberry32((seed??0)*100003+index+6));
  svg+=`<path d="${headPath}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  svg+=hairMarkup(hair.id, cx, cy, headRx, headRy, ink, mulberry32((seed??0)*100003+index+7));
  svg+=expressionMod(expression.id, cx, cy, eyeY, ink, mulberry32((seed??0)*100003+index+8));
  const rngN=mulberry32((seed??0)*100003+index+9);
  const noseType=Math.floor(rngN()*3);
  if(noseType===0){
    svg+=`<path d="${roughLine(cx-6,cy+18,cx,cy+28,rngN,2)}" stroke="${ink}" stroke-width="${(sw*0.75).toFixed(1)}" fill="none"/>`;
    svg+=`<path d="${roughLine(cx,cy+28,cx+6,cy+18,rngN,2)}" stroke="${ink}" stroke-width="${(sw*0.75).toFixed(1)}" fill="none"/>`;
  } else if(noseType===1){
    svg+=`<path d="M${cx},${cy+14} Q${(cx+10).toFixed(0)},${cy+30} ${cx},${cy+30} Q${(cx-10).toFixed(0)},${cy+30} ${cx},${cy+14}" stroke="${ink}" stroke-width="${(sw*0.7).toFixed(1)}" fill="none"/>`;
  } else {
    svg+=`<circle cx="${(cx-6).toFixed(0)}" cy="${cy+26}" r="3" fill="${ink}" opacity="0.6"/>`;
    svg+=`<circle cx="${(cx+6).toFixed(0)}" cy="${cy+26}" r="3" fill="${ink}" opacity="0.6"/>`;
  }
  svg+=starburstEye(eyeL,eyeY,eyeR,eyeSpikes,eyeColor.hex,eyeColor.glow,mulberry32((seed??0)*100003+index+10),hollow,eyeStyle.id);
  svg+=starburstEye(eyeR2_pos,eyeY,eyeR,eyeSpikes,eyeColor.hex,eyeColor.glow,mulberry32((seed??0)*100003+index+11),hollow,eyeStyle.id);
  svg+=mouthMarkup(mouth.id, cx, cy, ink, mulberry32((seed??0)*100003+index+12));
  svg+=accessoryMarkup(accessory.id, cx, cy, eyeL, eyeR2_pos, eyeY, eyeR, ink, eyeColor.hex, mulberry32((seed??0)*100003+index+13), headRy, hair.id);
  svg+='</svg>';
  return svg;
}

// ---------- main composer ----------
// Eye colors in this list can ONLY appear on 1/1 pieces. They stay in the
// normal TRAITS.eyeColor pool (so pickByRarity's tier math still works for
// 1/1s and locks still function normally), but any non-1/1 draw that lands
// on one of these rerolls to a different color from the same tier fallback.
const ONE_OF_ONE_ONLY_EYE_COLORS = ['white'];
function pickEyeColorForPiece(rng, tier, isOneOfOne) {
  if (isOneOfOne) return pickOneOfOneEyeColor(rng);
  let choice = pickByRarity(rng, TRAITS.eyeColor, tier);
  if (ONE_OF_ONE_ONLY_EYE_COLORS.includes(choice.id)) {
    const pool = TRAITS.eyeColor.filter(e => !ONE_OF_ONE_ONLY_EYE_COLORS.includes(e.id));
    choice = pickByRarity(rng, pool, tier);
  }
  return choice;
}

function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);

  // 1/1s get a direct shot at a full signature combo before the normal
  // per-trait picks happen at all.
  const sigOverride = maybeSignatureCombo(rng, isOneOfOne);

  const background = sigOverride ? sigOverride.background : pickByRarity(rng, TRAITS.background, t);
  const headShape   = sigOverride ? sigOverride.headShape  : pickByRarity(rng, TRAITS.headShape, t);
  const headFill    = sigOverride ? sigOverride.headFill   : pickByRarity(rng, TRAITS.headFill, t);
  const hair        = sigOverride ? sigOverride.hair       : pickByRarity(rng, TRAITS.hair, t);
  const eyeColor    = sigOverride ? sigOverride.eyeColor   : pickEyeColorForPiece(rng, t, isOneOfOne);
  const resolvedBackground = sigOverride ? sigOverride.background : resolveEyeBackgroundConflict(background, eyeColor, rng);
  const eyeStyle    = sigOverride ? sigOverride.eyeStyle   : pickByRarity(rng, TRAITS.eyeStyle, t);
  const mouth       = sigOverride ? sigOverride.mouth      : pickByRarity(rng, TRAITS.mouth, t);
  const clothing    = sigOverride ? sigOverride.clothing   : pickByRarity(rng, TRAITS.clothing, t);
  const accessory   = sigOverride ? sigOverride.accessory  : pickByRarity(rng, TRAITS.accessory, t);
  let expression    = sigOverride ? sigOverride.expression : pickByRarity(rng, TRAITS.expression, t);
  const inkStyle    = sigOverride ? sigOverride.inkStyle   : pickByRarity(rng, TRAITS.inkStyle, t);

  let picks = { background: resolvedBackground, headShape, headFill, hair, eyeColor, eyeStyle, mouth, clothing, accessory, expression, inkStyle };
  // Non-1/1 pieces can never exactly reproduce a signature combo — if the
  // natural picks happen to land on one, expression mutates to break it.
  if (!isOneOfOne) picks = breakSignatureMatch(picks, rng, false);

  const svg = renderFromTraits(picks, index, seed);

  return {
    index, svg, tier: t,
    traits: {
      background: picks.background.id, headShape: picks.headShape.id, headFill: picks.headFill.id, hair: picks.hair.id,
      eyeColor: picks.eyeColor.id, eyeStyle: picks.eyeStyle.id, mouth: picks.mouth.id, clothing: picks.clothing.id,
      accessory: picks.accessory.id, expression: picks.expression.id, inkStyle: picks.inkStyle.id
    },
    rarity: {
      background: picks.background.rarity, headShape: picks.headShape.rarity, headFill: picks.headFill.rarity, hair: picks.hair.rarity,
      eyeColor: picks.eyeColor.rarity, eyeStyle: picks.eyeStyle.rarity, mouth: picks.mouth.rarity, clothing: picks.clothing.rarity,
      accessory: picks.accessory.rarity, expression: picks.expression.rarity, inkStyle: picks.inkStyle.rarity
    }
  };
}

function generateBatch(count, seed, tier) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier));
  return out;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

// ---------- eye color / background conflict resolution ----------
// White starburst eyes are nearly invisible against the light/white backgrounds
// — the glow and the fill both read as white-on-white. When that combo would
// occur, the background rerolls to one of the dark/mid options instead. Eye
// color is left alone (it's the more central trait); only background moves.
const LIGHT_BACKGROUND_IDS = ['white_dots','white_clean','light_hatch','cross_hatch','scribble','chaos'];
const DARK_BACKGROUND_FALLBACK_IDS = ['ink_wash','black_splat','black_clean','grey_wash'];
function resolveEyeBackgroundConflict(background, eyeColor, rng) {
  if (eyeColor.id === 'white' && LIGHT_BACKGROUND_IDS.includes(background.id)) {
    const pool = TRAITS.background.filter(b => DARK_BACKGROUND_FALLBACK_IDS.includes(b.id));
    return weightedPick(rng, pool);
  }
  return background;
}

// ---------- 1/1-exclusive signature combos ----------
// A full, exact 11-trait combination reserved for 1/1s. Regular generation
// can never land on the exact same combo — if it would, one low-impact trait
// (expression) mutates to break the match. 1/1 generation gets a real,
// direct chance to hit the signature outright, bypassing the usual per-trait
// randomization for that piece. Add more entries here for future signatures.
const ONE_OF_ONE_SIGNATURE_COMBOS = [
  {
    name: 'ghostwriter',
    background: 'black_clean', headShape: 'elongated', headFill: 'hatch_shade', hair: 'long_wild',
    eyeColor: 'white', eyeStyle: 'starburst_lg', mouth: 'grin', clothing: 'suit',
    accessory: 'glasses', expression: 'goofy', inkStyle: 'heavy_ink'
  }
];
const SIGNATURE_TRAIT_KEYS = ['background','headShape','headFill','hair','eyeColor','eyeStyle','mouth','clothing','accessory','expression','inkStyle'];

// Resolves a signature's id strings into actual trait objects from TRAITS.
function resolveSignatureCombo(sig) {
  const out = {};
  SIGNATURE_TRAIT_KEYS.forEach(k => { out[k] = TRAITS[k].find(t => t.id === sig[k]); });
  return out;
}

// 1/1s get a flat chance (per signature) to land on that exact combo directly.
function maybeSignatureCombo(rng, isOneOfOne) {
  if (!isOneOfOne) return null;
  for (const sig of ONE_OF_ONE_SIGNATURE_COMBOS) {
    if (rng() < 0.06) return resolveSignatureCombo(sig); // ~6% chance per signature
  }
  return null;
}

// Checks a picked trait-id set against every signature; true if it's an exact match.
function matchesAnySignature(traitIds) {
  return ONE_OF_ONE_SIGNATURE_COMBOS.some(sig =>
    SIGNATURE_TRAIT_KEYS.every(k => traitIds[k] === sig[k])
  );
}

// If a NON-1/1 piece's naturally-picked traits exactly match a signature,
// mutate expression (a low-visual-impact trait) to any other value so the
// exact combo stays 1/1-exclusive. Skipped if expression is explicitly
// locked by the user — an explicit lock is a deliberate choice and wins.
function breakSignatureMatch(picks, rng, expressionLocked) {
  const ids = {}; SIGNATURE_TRAIT_KEYS.forEach(k => ids[k] = picks[k].id);
  if (!matchesAnySignature(ids)) return picks;
  if (expressionLocked) return picks;
  const alt = TRAITS.expression.filter(e => e.id !== picks.expression.id);
  if (alt.length) picks.expression = weightedPick(rng, alt);
  return picks;
}

const ONE_OF_ONE_EXCLUDED = [];

// 1/1 eye color gets its own curated weighting instead of just "whatever is
// rare-tier." Red and blue lead, orange has real presence, purple is
// deliberately scarce (5%) and white sits between. Regular (non-1/1)
// generation is untouched — this table only governs 1/1 selection.
const ONE_OF_ONE_EYE_WEIGHTS = [
  { id: 'red',    weight: 30 },
  { id: 'blue',   weight: 30 },
  { id: 'orange', weight: 25 },
  { id: 'white',  weight: 10 },
  { id: 'purple', weight: 5  }
];
function pickOneOfOneEyeColor(rng) {
  const total = ONE_OF_ONE_EYE_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng()*total;
  for (const w of ONE_OF_ONE_EYE_WEIGHTS) {
    if (r < w.weight) return TRAITS.eyeColor.find(e=>e.id===w.id);
    r -= w.weight;
  }
  return TRAITS.eyeColor.find(e=>e.id===ONE_OF_ONE_EYE_WEIGHTS[ONE_OF_ONE_EYE_WEIGHTS.length-1].id);
}
const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea' };

const api = { generatePiece, generateBatch, TRAITS, TIER_FALLBACK,
  renderFromTraits,
  mulberry32, weightedPick, pickByRarity, shadeColor,
  ONE_OF_ONE_EXCLUDED, CHAIN_THEMES,
  ONE_OF_ONE_EYE_WEIGHTS, pickOneOfOneEyeColor,
  ONE_OF_ONE_ONLY_EYE_COLORS, pickEyeColorForPiece,
  LIGHT_BACKGROUND_IDS, DARK_BACKGROUND_FALLBACK_IDS, resolveEyeBackgroundConflict,
  ONE_OF_ONE_SIGNATURE_COMBOS, SIGNATURE_TRAIT_KEYS, resolveSignatureCombo,
  maybeSignatureCombo, matchesAnySignature, breakSignatureMatch };
// Browser detection: check for a real DOM (`document` with createElement) rather
// than inferring Node from "no module var" — some sandboxed preview environments
// define a stray `module` object for their own bundling, which would otherwise
// misdirect this export to module.exports and silently skip window.InkGen.
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.InkGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
