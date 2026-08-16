/* ============================================================
   AI社員アバター生成スクリプト
   public/avatars/ に23人分のSVGを書き出します
   実行： node tools/make-avatars.mjs
   ============================================================ */
import { writeFileSync, mkdirSync } from 'fs'

const OUT = new URL('../public/avatars/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const ACCENT = {
  cyan: '#22d3ee', blue: '#3b82f6', purple: '#a855f7',
  pink: '#ec4899', green: '#22c55e', amber: '#f59e0b',
}

// 髪型の描画（顔の中心 cx=128, 頭頂 y=52 前提）
const HAIR = {
  short: (c) => `<path d="M84 104c-2-34 18-52 44-52s46 18 44 52c-4-14-10-20-16-22-10 6-38 8-52 2-10 3-16 8-20 20z" fill="${c}"/>`,
  spiky: (c) => `<path d="M84 108c-3-33 17-56 44-56s47 23 44 56c-4-13-9-21-15-24-11 7-38 9-53 3-9 4-16 10-20 21z" fill="${c}"/><path d="M86 84l-8-22 20 13 4-21 14 17 12-20 12 20 14-17 4 21 20-13-8 22c-12-14-27-20-42-20s-30 6-42 20z" fill="${c}"/>`,
  medium: (c) => `<path d="M82 116c-6-40 16-64 46-64s52 24 46 64c-3-16-7-26-12-30-12 8-42 10-58 3-8 5-14 13-16 27z" fill="${c}"/><path d="M80 100c-2 22 0 34 4 44l-10-2c-4-14-4-30 0-44z" fill="${c}"/><path d="M176 100c2 22 0 34-4 44l10-2c4-14 4-30 0-44z" fill="${c}"/>`,
  long: (c) => `<path d="M80 120c-6-46 16-68 48-68s54 22 48 68c-2 26 2 44 6 60h-24c4-30 2-58-6-76-14 10-46 12-62 4-8 16-10 44-6 72H60c4-16 8-34 6-60z" fill="${c}"/>`,
  ponytail: (c) => `<path d="M84 108c-4-36 16-56 44-56s48 20 44 56c-4-16-9-24-14-27-12 7-40 9-56 3-9 5-15 12-18 24z" fill="${c}"/><path d="M172 88c14 4 22 16 22 34s-6 30-16 40l-12-8c8-8 12-20 12-32s-3-22-10-28z" fill="${c}"/>`,
  bun: (c) => `<path d="M84 106c-3-34 17-54 44-54s47 20 44 54c-4-14-9-22-15-25-11 7-38 9-53 3-9 4-16 10-20 22z" fill="${c}"/><circle cx="128" cy="42" r="16" fill="${c}"/>`,
  bob: (c) => `<path d="M80 112c-4-38 18-60 48-60s52 22 48 60c-1 12 0 20 2 28h-18c-3-24-6-40-12-48-14 9-44 11-60 4-6 10-9 26-11 44H60c2-8 3-16 2-28z" fill="${c}"/>`,
  cap: (c) => `<path d="M86 106c-8-8-6-20 2-22 2-20 18-32 40-32s38 12 40 32c8 2 10 14 2 22-6-12-12-18-18-20-12 7-40 9-56 3-4 3-8 8-10 17z" fill="${c}"/><path d="M166 96h30c5 0 8 4 8 8s-3 8-8 8h-30z" fill="${c}" opacity=".8"/><circle cx="128" cy="54" r="6" fill="${c}" opacity=".9"/>`,
}

const glasses = (c) => `
  <g fill="none" stroke="${c}" stroke-width="3" opacity=".9">
    <rect x="94" y="112" width="30" height="22" rx="6"/>
    <rect x="132" y="112" width="30" height="22" rx="6"/>
    <path d="M124 122h8M94 118l-10 3M162 118l10 3"/>
  </g>`

const headset = (c) => `
  <g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round">
    <path d="M84 116a44 44 0 0188 0"/>
  </g>
  <rect x="72" y="112" width="16" height="26" rx="7" fill="${c}"/>
  <rect x="168" y="112" width="16" height="26" rx="7" fill="${c}"/>
  <path d="M80 138c0 18 14 26 30 28" fill="none" stroke="${c}" stroke-width="3"/>
  <circle cx="112" cy="167" r="4" fill="${c}"/>`

const tie = (c) => `<path d="M128 196l-9 9 9 34 9-34z" fill="${c}" opacity=".9"/>`
const scarf = (c) => `<path d="M104 200c14 8 34 8 48 0l6 10c-18 10-42 10-60 0z" fill="${c}" opacity=".8"/>`

function svg(o) {
  const a = ACCENT[o.accent]
  const hair = HAIR[o.hair](o.hairColor)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="${o.label}">
  <defs>
    <radialGradient id="bg" cx="35%" cy="15%" r="95%">
      <stop offset="0%" stop-color="${a}" stop-opacity=".38"/>
      <stop offset="55%" stop-color="#0d1530"/>
      <stop offset="100%" stop-color="#05070f"/>
    </radialGradient>
    <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${o.suit}"/>
      <stop offset="100%" stop-color="#0a1024"/>
    </linearGradient>
    <clipPath id="clip"><rect width="256" height="256" rx="26"/></clipPath>
  </defs>

  <g clip-path="url(#clip)">
    <rect width="256" height="256" fill="url(#bg)"/>
    <g stroke="${a}" stroke-opacity=".14" stroke-width="1">
      <path d="M0 64h256M0 128h256M0 192h256M64 0v256M128 0v256M192 0v256"/>
    </g>
    <circle cx="128" cy="150" r="86" fill="${a}" opacity=".07"/>

    <!-- 肩 -->
    <path d="M128 188c-42 0-72 22-80 68h160c-8-46-38-68-80-68z" fill="url(#suit)"/>
    <path d="M112 190l16 18 16-18c-6-4-10-6-16-6s-10 2-16 6z" fill="#e8edf7" opacity=".92"/>
    ${o.accessory2 === 'tie' ? tie(a) : ''}
    ${o.accessory2 === 'scarf' ? scarf(a) : ''}

    <!-- 首 -->
    <path d="M114 164h28v26c0 6-28 6-28 0z" fill="${o.skinShade}"/>
    <!-- 顔 -->
    <ellipse cx="128" cy="126" rx="44" ry="50" fill="${o.skin}"/>
    <!-- 髪 -->
    ${hair}
    <!-- 目 -->
    <g fill="#1b2334">
      <ellipse cx="110" cy="128" rx="4.6" ry="5.6"/>
      <ellipse cx="146" cy="128" rx="4.6" ry="5.6"/>
    </g>
    <g fill="#ffffff" opacity=".85">
      <circle cx="111.6" cy="126" r="1.6"/>
      <circle cx="147.6" cy="126" r="1.6"/>
    </g>
    <!-- 眉 -->
    <g stroke="${o.hairColor}" stroke-width="3.4" stroke-linecap="round" opacity=".95">
      <path d="M101 117l17 ${o.brow}"/>
      <path d="M155 117l-17 ${o.brow}"/>
    </g>
    <!-- 口 -->
    <path d="M118 149c6 ${o.mouth} 14 ${o.mouth} 20 0" fill="none" stroke="#8a5a52" stroke-width="3" stroke-linecap="round"/>

    ${o.accessory === 'glasses' ? glasses(a) : ''}
    ${o.accessory === 'headset' ? headset(a) : ''}

    <!-- 稼働ランプ -->
    <circle cx="226" cy="30" r="7" fill="${a}"/>
    <circle cx="226" cy="30" r="12" fill="none" stroke="${a}" stroke-opacity=".4" stroke-width="2"/>
  </g>
  <rect x="1" y="1" width="254" height="254" rx="26" fill="none" stroke="${a}" stroke-opacity=".55" stroke-width="2"/>
</svg>`
}

// 肌の色バリエーション
const SKIN = { a: ['#f2d3bd', '#e4bda4'], b: ['#eccbb2', '#dcb497'], c: ['#f5dcc8', '#e6c6ae'] }

const STAFF = [
  // コア部門
  { id:'ceo', label:'AI社長', accent:'cyan', hair:'short', hairColor:'#2b2f3d', suit:'#1b2540', skin:'a', accessory:'glasses', accessory2:'tie', brow:'-4', mouth:'6' },
  { id:'secretary', label:'AI秘書', accent:'blue', hair:'bob', hairColor:'#3a2a24', suit:'#1a2338', skin:'c', accessory:'none', accessory2:'scarf', brow:'-3', mouth:'8' },
  { id:'strategy', label:'AI戦略', accent:'purple', hair:'medium', hairColor:'#262a38', suit:'#20203c', skin:'b', accessory:'none', accessory2:'tie', brow:'-5', mouth:'5' },
  { id:'analyst', label:'AI分析官', accent:'cyan', hair:'ponytail', hairColor:'#2f2620', suit:'#182740', skin:'a', accessory:'glasses', accessory2:'none', brow:'-3', mouth:'6' },
  { id:'sales', label:'AI営業', accent:'green', hair:'spiky', hairColor:'#241f1a', suit:'#162c30', skin:'b', accessory:'none', accessory2:'tie', brow:'-6', mouth:'10' },
  { id:'writer', label:'AIライター', accent:'pink', hair:'long', hairColor:'#4a2f2a', suit:'#2a1c30', skin:'c', accessory:'none', accessory2:'none', brow:'-3', mouth:'7' },
  { id:'marketer', label:'AIマーケター', accent:'amber', hair:'bob', hairColor:'#2e2620', suit:'#2e2418', skin:'a', accessory:'none', accessory2:'scarf', brow:'-4', mouth:'9' },
  { id:'designer', label:'AIデザイナー', accent:'purple', hair:'bun', hairColor:'#2a2233', suit:'#26203a', skin:'c', accessory:'glasses', accessory2:'none', brow:'-3', mouth:'7' },
  { id:'researcher', label:'AIリサーチャー', accent:'blue', hair:'short', hairColor:'#2a2a30', suit:'#18233a', skin:'b', accessory:'glasses', accessory2:'tie', brow:'-2', mouth:'5' },
  { id:'programmer', label:'AIプログラマー', accent:'cyan', hair:'medium', hairColor:'#20242e', suit:'#14263a', skin:'a', accessory:'glasses', accessory2:'none', brow:'-2', mouth:'4' },
  { id:'qa', label:'AI品質管理', accent:'green', hair:'ponytail', hairColor:'#33261e', suit:'#152e2a', skin:'c', accessory:'none', accessory2:'none', brow:'-4', mouth:'6' },
  { id:'security', label:'AIセキュリティ', accent:'blue', hair:'spiky', hairColor:'#1d2028', suit:'#141f38', skin:'b', accessory:'none', accessory2:'tie', brow:'-6', mouth:'3' },
  { id:'cloud', label:'AIクラウド', accent:'cyan', hair:'short', hairColor:'#2c2b33', suit:'#152a3c', skin:'a', accessory:'headset', accessory2:'none', brow:'-3', mouth:'6' },

  // DayDream Plus メンバーAI
  { id:'yuma', label:'悠真AI', accent:'blue', hair:'medium', hairColor:'#1e2330', suit:'#16203c', skin:'a', accessory:'none', accessory2:'tie', brow:'-4', mouth:'8' },
  { id:'aoi', label:'葵AI', accent:'cyan', hair:'long', hairColor:'#1f2b38', suit:'#132c3a', skin:'c', accessory:'none', accessory2:'scarf', brow:'-3', mouth:'9' },
  { id:'ren', label:'蓮AI', accent:'purple', hair:'spiky', hairColor:'#3a241c', suit:'#241a34', skin:'b', accessory:'none', accessory2:'none', brow:'-6', mouth:'5' },
  { id:'yui', label:'結衣AI', accent:'pink', hair:'long', hairColor:'#40261f', suit:'#331a2a', skin:'c', accessory:'none', accessory2:'scarf', brow:'-2', mouth:'11' },
  { id:'daichi', label:'大地AI', accent:'amber', hair:'short', hairColor:'#4a3520', suit:'#302512', skin:'b', accessory:'none', accessory2:'none', brow:'-5', mouth:'9' },
  { id:'mikoto', label:'美琴AI', accent:'pink', hair:'bun', hairColor:'#5a4028', suit:'#30203a', skin:'c', accessory:'none', accessory2:'scarf', brow:'-2', mouth:'10' },

  // 運営スタッフAI（実在メンバーの体型を参考にしたイメージ）
  { id:'takagi', label:'高木', accent:'cyan', hair:'short', hairColor:'#3a3a42', suit:'#1a2b40', skin:'b', accessory:'glasses', accessory2:'tie', brow:'-3', mouth:'7' },
  { id:'ota', label:'太田', accent:'amber', hair:'short', hairColor:'#2e2a26', suit:'#2c2416', skin:'a', accessory:'none', accessory2:'tie', brow:'-4', mouth:'8' },
  { id:'nakao', label:'中尾', accent:'purple', hair:'medium', hairColor:'#2a2530', suit:'#241c38', skin:'a', accessory:'headset', accessory2:'none', brow:'-3', mouth:'5' },
  { id:'shun', label:'シュン', accent:'blue', hair:'cap', hairColor:'#3a5f96', suit:'#152038', skin:'c', accessory:'none', accessory2:'none', brow:'-4', mouth:'9' },
]

// 高木さん（58歳・体格しっかり）は肩幅を広く、白髪まじりに
const WIDE = new Set(['takagi', 'ota'])

let count = 0
for (const s of STAFF) {
  const [skin, skinShade] = SKIN[s.skin]
  let out = svg({ ...s, skin, skinShade })
  if (WIDE.has(s.id)) {
    out = out.replace(
      'M128 188c-42 0-72 22-80 68h160c-8-46-38-68-80-68z',
      'M128 186c-48 0-80 24-88 70h176c-8-46-40-70-88-70z',
    )
  }
  writeFileSync(new URL(`${s.id}.svg`, OUT), out, 'utf8')
  count++
}
console.log(`${count} 個のアバターを public/avatars/ に生成しました`)
