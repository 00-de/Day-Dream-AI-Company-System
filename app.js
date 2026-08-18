/* ==========================================================
   SDayDream Music Studio — Phase 1.1 engine
   ブラウザ内（Web Audio API）で完結する手続き型の作曲・編曲エンジン
   ========================================================== */
"use strict";

/* ---------- 定数 ---------- */
const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SCALES = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], pentatonic:[0,2,4,7,9] };
const SCALE_LABEL = { major:"長調", minor:"短調", pentatonic:"ヨナ抜き" };
const METERS = { "4/4":[4,4], "3/4":[3,4], "6/8":[6,8] };

const MEMBERS = {
  "悠真":{role:"Keyboard・Vocal", g:"🎹", color:"#7FD4FF", vox:{base:0, bright:1.0, vib:4.6, breath:.16, formant:[520,1480,2500]}},
  "結衣":{role:"Main Vocal",      g:"🎤", color:"#FF4FA3", vox:{base:12,bright:1.25,vib:5.2, breath:.13, formant:[660,1720,2900]}},
  "葵":{role:"Guitar・Vocal",     g:"🎸", color:"#35E1F5", vox:{base:5, bright:1.1, vib:5.0, breath:.18, formant:[600,1600,2700]}},
  "蓮":{role:"Guitar・Chorus",    g:"🎸", color:"#9B7BFF", vox:{base:-5,bright:.92, vib:4.2, breath:.2,  formant:[480,1380,2400]}},
  "美琴":{role:"Enka Vocal",      g:"🎙", color:"#FFC24B", vox:{base:12,bright:1.05,vib:6.6, breath:.1,  formant:[620,1500,2600], kobushi:true}},
  "大地":{role:"Drums",           g:"🥁", color:"#7E90AC", vox:{base:-12,bright:.85,vib:3.6, breath:.24, formant:[440,1300,2300]}}
};
const BAND = {
  "エレキギター":{t:"egtr",c:"#FF4FA3",oct:0,g:"🎸"},"アコースティックギター":{t:"agtr",c:"#FFA65D",oct:0,g:"🪕"},
  "ベース":{t:"bass",c:"#9B7BFF",oct:-2,g:"🎻"},"ドラム":{t:"drums",c:"#7E90AC",oct:0,g:"🥁"},
  "キーボード":{t:"pad",c:"#7FD4FF",oct:0,g:"🎹"},"ピアノ":{t:"piano",c:"#E6EEF8",oct:0,g:"🎼"}
};
const ORCH = {
  "バイオリン":{t:"bow",c:"#35E1F5",oct:1,g:"🎻"},"ビオラ":{t:"bow",c:"#35E1F5",oct:0,g:"🎻"},
  "チェロ":{t:"bow",c:"#2FBCD0",oct:-1,g:"🎻"},"コントラバス":{t:"bow",c:"#26909F",oct:-2,g:"🎻"},
  "フルート":{t:"flute",c:"#BFEFFF",oct:1,g:"🎶"},"オーボエ":{t:"reed",c:"#A8D8F0",oct:1,g:"🎶"},
  "クラリネット":{t:"reed",c:"#8FC4E8",oct:0,g:"🎶"},"ファゴット":{t:"reed",c:"#6FA0C8",oct:-1,g:"🎶"},
  "ホルン":{t:"brass",c:"#FFC24B",oct:0,g:"📯"},"トランペット":{t:"brass",c:"#FFD87A",oct:1,g:"🎺"},
  "トロンボーン":{t:"brass",c:"#D9A32B",oct:-1,g:"🎺"},"チューバ":{t:"brass",c:"#A87F16",oct:-2,g:"🎺"},
  "ハープ":{t:"harp",c:"#F0DCA8",oct:1,g:"🪗"},"ティンパニ":{t:"timp",c:"#7E90AC",oct:-2,g:"🥁"}
};
const MAND = {
  "マンドリン":{t:"mand",c:"#9B7BFF",oct:1,g:"🪕"},"マンドラ":{t:"mand",c:"#8A73F0",oct:0,g:"🪕"},
  "マンドチェロ":{t:"mand",c:"#7460DC",oct:-1,g:"🪕"},"マンドロンチェロ":{t:"mand",c:"#6151C4",oct:-2,g:"🪕"}
};
const PRESETS = {
  "アイドル":{scale:"major",bpm:150,prog:[1,5,6,4],band:["エレキギター","ベース","ドラム","キーボード"],orch:[],mand:[],mv:["#FF4FA3","#35E1F5","#FFC24B"]},
  "ロック":{scale:"minor",bpm:168,prog:[6,4,1,5],band:["エレキギター","ベース","ドラム"],orch:[],mand:[],mv:["#FF4FA3","#2B1020","#FFC24B"]},
  "バラード":{scale:"major",bpm:68,prog:[1,5,6,3,4,1,4,5],band:["ピアノ","ベース","ドラム"],orch:["バイオリン","チェロ"],mand:[],mv:["#35E1F5","#141F3C","#E6EEF8"]},
  "夏ソング":{scale:"major",bpm:140,prog:[1,4,5,4],band:["アコースティックギター","ベース","ドラム","キーボード"],orch:[],mand:[],mv:["#35E1F5","#FFC24B","#7FD4FF"]},
  "冬ソング":{scale:"minor",bpm:84,prog:[6,4,1,5],band:["ピアノ","ベース"],orch:["バイオリン","フルート"],mand:[],mv:["#BFEFFF","#1B2647","#E6EEF8"]},
  "卒業ソング":{scale:"major",bpm:78,prog:[4,5,1,6],band:["ピアノ","アコースティックギター","ベース","ドラム"],orch:["バイオリン","チェロ"],mand:[],mv:["#FFA65D","#35E1F5","#E6EEF8"]},
  "ライブ":{scale:"major",bpm:162,prog:[1,5,6,4],band:["エレキギター","ベース","ドラム","キーボード"],orch:["トランペット"],mand:[],mv:["#FF4FA3","#FFC24B","#35E1F5"]},
  "映画音楽":{scale:"minor",bpm:96,prog:[1,6,4,5],band:[],orch:["バイオリン","ビオラ","チェロ","コントラバス","ホルン","ティンパニ","ハープ"],mand:[],mv:["#1B2647","#FFC24B","#060C18"]},
  "オーケストラ":{scale:"major",bpm:112,prog:[1,4,5,1],band:[],orch:["バイオリン","ビオラ","チェロ","コントラバス","フルート","オーボエ","クラリネット","ホルン","トランペット","ティンパニ"],mand:[],mv:["#E6EEF8","#FFC24B","#1B2647"]},
  "マンドリンアンサンブル":{scale:"major",bpm:120,prog:[1,5,6,4],band:["ベース"],orch:[],mand:["マンドリン","マンドラ","マンドチェロ","マンドロンチェロ"],mv:["#9B7BFF","#E6EEF8","#35E1F5"]},
  "演歌":{scale:"pentatonic",bpm:72,prog:[1,4,5,1],band:["ベース"],orch:["バイオリン","フルート"],mand:["マンドリン"],mv:["#FFC24B","#2B1020","#E6EEF8"]}
};
const FORM = [
  {n:"INTRO",w:1.0,e:.45,v:false},{n:"VERSE 1",w:2.0,e:.55,v:true},{n:"PRE-CHORUS",w:1.5,e:.7,v:true},
  {n:"CHORUS",w:2.0,e:1.0,v:true},{n:"BRIDGE",w:1.0,e:.75,v:false},{n:"VERSE 2",w:1.5,e:.6,v:true},
  {n:"CHORUS 2",w:2.2,e:1.0,v:true},{n:"OUTRO",w:1.0,e:.4,v:false}
];

/* ---------- 状態 ---------- */
const S = {
  preset:"アイドル", members:["結衣"], band:[], orch:[], mand:[],
  song:null, buffer:null, ctx:null, src:null, playing:false, startAt:0, offset:0,
  library:[], mixer:{}, rafT:0, _peaks:null, _peakKey:null, vizPane:"wave"
};

/* ---------- ユーティリティ ---------- */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const mtof=m=>440*Math.pow(2,(m-69)/12);
const fmt=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("on");clearTimeout(toast._i);toast._i=setTimeout(()=>t.classList.remove("on"),2400);}
function status(txt,active){$("#statustxt").textContent=txt;$("#genstatus").classList.toggle("act",!!active);}
function mora(line){
  const small="ゃゅょャュョぁぃぅぇぉァィゥェォっッーん・、。 　";
  let n=0; for(const ch of line){ if(small.includes(ch)) continue; n++; }
  return Math.max(2,n);
}

/* ---------- 画面切り替え ---------- */
const SCREENS=[["home","ホーム"],["studio","スタジオ"],["suno","SUNO"],["library","ライブラリ"],["playlist","プレイリスト"],["mv","MV"],["fav","お気に入り"],["settings","設定"]];
(function buildNav(){
  const nav=$("#nav");
  SCREENS.forEach(([id,label])=>{
    const b=document.createElement("button");b.textContent=label;b.dataset.id=id;b.onclick=()=>go(id);nav.appendChild(b);
  });
  const HM=[["studio","新規作成","歌詞から曲を組み立てる"],["suno","SUNOプロンプト","貼るだけの指示文と歌詞を作る"],["library","楽曲ライブラリ","作った曲を並べる"],
    ["playlist","プレイリスト","並び順を決める"],["mv","MVライブラリ","映像付きの曲"],
    ["fav","お気に入り","印を付けた曲"],["settings","設定","出力と接続先"]];
  const m=$("#homeMenu");
  HM.forEach(([id,t,d])=>{const b=document.createElement("button");b.innerHTML=`<b>${t}</b><small>${d}</small>`;b.onclick=()=>go(id);m.appendChild(b);});
})();
function go(id){
  $$(".screen").forEach(s=>s.classList.toggle("on",s.id==="s-"+id));
  $$("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.id===id));
  if(id==="library")renderList("#libList",S.library);
  if(id==="fav")renderList("#favList",S.library.filter(x=>x.fav));
  if(id==="mv")renderList("#mvList",S.library);
  if(id==="playlist")renderList("#plList",S.library);
  if(id==="studio"&&!S._drawerSeen){ S._drawerSeen=true; setTimeout(openDrawer,260); }
  if(id==="studio"){ setTimeout(()=>{ if(S.buffer){drawWave();drawScore();} drawViz(pos()); drawMvFrame(pos()); },30); }
}

/* ---------- ドロワー ---------- */
const openDrawer=()=>{$("#drawer").classList.add("on");$("#scrim").classList.add("on");};
const closeDrawer=()=>{$("#drawer").classList.remove("on");$("#scrim").classList.remove("on");};
$("#btn-drawer").onclick=openDrawer; $("#btn-drawer2").onclick=()=>{go("studio");openDrawer();};
$("#drawerClose").onclick=closeDrawer; $("#scrim").onclick=closeDrawer;
$("#btn-drawerOk").onclick=closeDrawer;
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeDrawer(); });

/* ---------- フォーム構築 ---------- */
(function buildForm(){
  const sel=$("#f-key"); KEYS.forEach((k,i)=>{const o=document.createElement("option");o.value=i;o.textContent=k;sel.appendChild(o);});
  sel.value=0;
  const tr=$("#f-trans");
  [-15,-14,-13,-12,0,12,13,14,15].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=(v>0?"+":"")+v;tr.appendChild(o);});
  tr.value=0;
  $("#f-bpm").oninput=e=>{$("#v-bpm").textContent=e.target.value;$("#g-bpm").textContent=e.target.value;};
  $("#set-master").oninput=e=>$("#v-master").textContent=e.target.value;
  $("#f-key").onchange=$("#f-trans").onchange=$("#f-scale").onchange=$("#f-mood").onchange=updateGauges;

  const pc=$("#f-preset");
  Object.keys(PRESETS).forEach(name=>{
    const b=document.createElement("button");b.className="chip";b.textContent=name;
    b.onclick=()=>applyPreset(name); pc.appendChild(b);
  });
  const mc=$("#f-members");
  Object.entries(MEMBERS).forEach(([name,m])=>{
    const b=document.createElement("button");b.className="chip m";
    b.innerHTML=`<span class="dot" style="background:${m.color}"></span>${name}`;
    b.dataset.name=name;b.title=m.role;b.onclick=()=>toggleMember(name);mc.appendChild(b);
  });
  const mk=(host,dict,cls,key)=>{
    const h=$(host);
    Object.entries(dict).forEach(([name,inf])=>{
      const b=document.createElement("button");b.className="chip "+cls;
      b.innerHTML=`<span class="dot" style="background:${inf.c}"></span>${name}`;
      b.dataset.name=name;
      b.onclick=()=>{const i=S[key].indexOf(name); if(i<0)S[key].push(name); else S[key].splice(i,1); syncChips();};
      h.appendChild(b);
    });
  };
  mk("#f-band",BAND,"",  "band"); mk("#f-orch",ORCH,"a","orch"); mk("#f-mand",MAND,"v","mand");
  applyPreset("アイドル");
})();

function toggleMember(name){
  const max={solo:1,duet:2,trio:3,all:6}[$("#f-vmode").value];
  const i=S.members.indexOf(name);
  if(i>=0){ if(S.members.length>1) S.members.splice(i,1); }
  else { S.members.push(name); while(S.members.length>max) S.members.shift(); }
  syncChips();
}
$("#f-vmode").onchange=()=>{
  const v=$("#f-vmode").value, max={solo:1,duet:2,trio:3,all:6}[v];
  if(v==="all") S.members=Object.keys(MEMBERS);
  while(S.members.length>max) S.members.pop();
  syncChips();
};
function applyPreset(name){
  S.preset=name; const p=PRESETS[name];
  S.band=[...p.band]; S.orch=[...p.orch]; S.mand=[...p.mand];
  $("#f-bpm").value=p.bpm; $("#v-bpm").textContent=p.bpm; $("#f-scale").value=p.scale;
  if(name==="演歌"&&!S.members.includes("美琴")) S.members=["美琴"];
  syncChips();
}
function syncChips(){
  $$("#f-preset .chip").forEach(b=>b.classList.toggle("on",b.textContent===S.preset));
  $$("#f-members .chip").forEach(b=>b.classList.toggle("on",S.members.includes(b.dataset.name)));
  $$("#f-band .chip").forEach(b=>b.classList.toggle("on",S.band.includes(b.dataset.name)));
  $$("#f-orch .chip").forEach(b=>b.classList.toggle("on",S.orch.includes(b.dataset.name)));
  $$("#f-mand .chip").forEach(b=>b.classList.toggle("on",S.mand.includes(b.dataset.name)));
  updateGauges(); renderTrackRail(); renderPickSummary();
}
function renderPickSummary(){
  const h=$("#pickSummary"); if(!h)return;
  const line=(k,v)=>`<div class="pk"><b>${k}</b><span>${v||"—"}</span></div>`;
  h.innerHTML=line("PRESET",S.preset)+line("VOCAL",S.members.join("・"))
    +line("BAND",S.band.join("・"))+line("ORCH",S.orch.join("・"))+line("MAND",S.mand.join("・"));
  const set=(id,n,max)=>{const e=$(id); if(e) e.textContent=n+(max?" / "+max:"")+" 選択中";};
  set("#c-vocal",S.members.length,{solo:1,duet:2,trio:3,all:6}[$("#f-vmode").value]);
  set("#c-band",S.band.length); set("#c-orch",S.orch.length); set("#c-mand",S.mand.length);
}
function updateGauges(){
  const k=(parseInt($("#f-key").value,10)+parseInt($("#f-trans").value,10)+120)%12;
  $("#g-key").textContent=KEYS[k];
  $("#g-scale").textContent=SCALE_LABEL[$("#f-scale").value]||"";
  $("#g-bpm").textContent=$("#f-bpm").value;
  $("#g-mood").textContent=$("#f-mood").value;
}
function renderTrackRail(){
  const h=$("#trackRail"); h.innerHTML="";
  const add=(g,name,color,on)=>{
    const b=document.createElement("button"); b.className="ti"+(on?" on":"");
    b.innerHTML=`<span class="g" style="color:${color}">${g}</span>${name}`;
    b.title=name; b.onclick=()=>{ $("#drawer").classList.add("on"); $("#scrim").classList.add("on"); };
    h.appendChild(b);
  };
  S.members.forEach(n=>add(MEMBERS[n].g,n,MEMBERS[n].color,true));
  S.band.forEach(n=>add(BAND[n].g,n.length>6?n.slice(0,5)+"…":n,BAND[n].c,true));
  S.orch.slice(0,8).forEach(n=>add(ORCH[n].g,n.length>6?n.slice(0,5)+"…":n,ORCH[n].c,true));
  S.mand.forEach(n=>add(MAND[n].g,n.length>6?n.slice(0,5)+"…":n,MAND[n].c,true));
}
$("#f-quality").onchange=()=>{
  const q=$("#f-quality").value;
  $("#qhint").textContent={draft:"速い・確認用（22kHz／音数半分／残響なし）",
    normal:"ふつう（44.1kHz／残響あり）",high:"高音質・時間がかかります"}[q];
};
$("#btn-random").onclick=()=>{
  applyPreset(pick(Object.keys(PRESETS)));
  $("#f-title").value=pick(["夜明けのリハーサル","坂道のワルツ","七月の合図","風になる前に","声が届く場所"]);
  $("#f-theme").value=pick(["旅立ち","夏の終わり","約束","再会","始まりの朝"]);
  $("#lyricEdit").value=["夕暮れの坂道 君の影が伸びる","あと少しだけ このままでいたいよ","名前を呼ぶ声が 風にほどけていく","忘れないよ この夏のこと"].join("\n");
  toast("設定を埋めました");
};
$$("#lyricTabs button").forEach(b=>b.onclick=()=>{
  $$("#lyricTabs button").forEach(x=>x.classList.toggle("on",x===b));
  const sync=b.dataset.p==="sync";
  $("#lyricEdit").style.display=sync?"none":"block";
  $("#lyricSync").style.display=sync?"block":"none";
});
$$("#vizTabs button").forEach(b=>b.onclick=()=>{
  $$("#vizTabs button").forEach(x=>x.classList.toggle("on",x===b));
  S.vizPane=b.dataset.p;
  $$(".pane").forEach(p=>p.classList.toggle("on",p.dataset.p===S.vizPane));
  if(S.buffer){ if(S.vizPane==="wave")drawWave(); if(S.vizPane==="score")drawScore(); if(S.vizPane==="mv")drawMvFrame(pos()); }
});

/* ==========================================================
   作曲：構成 → コード → メロディー → 各パート（拍子対応）
   ========================================================== */
function planSong(cfg){
  const [bpb,unit]=METERS[cfg.meter]||[4,4];
  const beat=(60/cfg.bpm)*(unit===8?.5:1);
  const bar=beat*bpb;
  const totalBars=Math.max(4,Math.round(cfg.length/bar));
  let form=FORM.slice();
  if(cfg.length<=30) form=[FORM[0],FORM[1],FORM[3],FORM[7]];
  else if(cfg.length<=60) form=[FORM[0],FORM[1],FORM[2],FORM[3],FORM[7]];
  else if(cfg.length>=300) form=form.concat([FORM[2],FORM[3],FORM[7]]);
  const wsum=form.reduce((a,f)=>a+f.w,0);
  let acc=0;
  const sections=form.map(f=>{
    const b=Math.max(1,Math.round(totalBars*f.w/wsum));
    const s={name:f.n,bars:b,energy:f.e,vocal:f.v,startBar:acc}; acc+=b; return s;
  });
  const scale=SCALES[cfg.scale];
  const prog=PRESETS[cfg.preset].prog;
  const root=(cfg.key+cfg.trans)%12 + 60 + (cfg.trans<0?-12:0);
  return {beat,bar,bpb,unit,sections,totalBars:acc,scale,scaleName:cfg.scale,prog,root,cfg};
}
function degChord(plan,deg){
  const sc=plan.scale, n=sc.length, idx=(deg-1)%n;
  const tones=[0,2,4].map(o=>{const j=idx+o,oct=Math.floor(j/n);return sc[j%n]+oct*12;});
  if(["バラード","映画音楽","演歌"].includes(plan.cfg.preset)){
    const j=idx+6, oct=Math.floor(j/n); tones.push(sc[j%n]+oct*12);
  }
  return tones.map(t=>plan.root+t);
}
function chordName(plan,deg){
  const t=degChord(plan,deg), pc=((t[0])%12+12)%12;
  const third=t[1]-t[0], seventh=t.length>3?t[3]-t[0]:null;
  let q = third===3?"m" : third===4?"" : "sus";
  if(seventh===10) q+= q==="m"?"7":"7";
  else if(seventh===11) q+="maj7";
  return KEYS[pc]+q;
}
function composeMelody(plan,section,lyricLines,seedShift){
  const notes=[], sc=plan.scale, bpb=plan.bpb;
  let prev=plan.root+12+sc[Math.floor(sc.length/2)];
  for(let b=0;b<section.bars;b++){
    const deg=plan.prog[(section.startBar+b)%plan.prog.length];
    const ch=degChord(plan,deg);
    const line=lyricLines.length?lyricLines[(section.startBar+b+seedShift)%lyricLines.length]:"";
    const cnt=line?clamp(Math.round(mora(line)/2),2,bpb*2):clamp(Math.round(rnd(2,bpb+1)),2,bpb+2);
    const step=bpb/cnt;
    for(let i=0;i<cnt;i++){
      let target;
      if(i===0||Math.random()<.45) target=ch[Math.floor(Math.random()*3)]+12;
      else{
        const dir=Math.random()<.5?-1:1;
        const cands=sc.map(v=>plan.root+12+v).concat(sc.map(v=>plan.root+24+v));
        cands.sort((a,b2)=>Math.abs(a-(prev+dir*2))-Math.abs(b2-(prev+dir*2)));
        target=cands[0];
      }
      while(target-prev>9) target-=12; while(prev-target>9) target+=12;
      prev=target;
      notes.push({beat:(section.startBar+b)*bpb+i*step, dur:step*.92, midi:target,
        vel:.55+section.energy*.35, syl:line?[...line][i]||"":""});
    }
  }
  return notes;
}
function buildTracks(plan,lyricLines){
  const T=[], bpb=plan.bpb, mid=Math.floor(bpb/2);
  const fold=(m,lo,hi)=>{let v=Math.round(m);while(v<lo)v+=12;while(v>hi)v-=12;return clamp(v,lo,hi);};
  const RANGE={bass:[28,55],timp:[36,55],drums:[35,50],bow:[36,96],brass:[34,88],reed:[40,88],
    flute:[60,100],harp:[36,96],mand:[45,96],egtr:[40,88],agtr:[40,88],piano:[36,96],pad:[36,90]};
  const push=(name,type,color,notes,vol,pan,rev)=>{
    const r=type.startsWith("voice:")?[48,84]:(RANGE[type]||[36,90]);
    const fixed=type==="drums"?notes:notes.map(n=>({...n,midi:fold(n.midi,r[0],r[1])}));
    T.push({name,type,color,notes:fixed,vol,pan,rev});
  };
  const mel=[];
  plan.sections.forEach((s,i)=>{ if(s.vocal) mel.push(...composeMelody(plan,s,lyricLines,i)); });

  const mem=S.members.length?S.members:["結衣"];
  const vsections=plan.sections.filter(s=>s.vocal);
  const secOf=beat=>{const bar=Math.floor(beat/bpb);return plan.sections.find(s=>bar>=s.startBar&&bar<s.startBar+s.bars);};
  mem.forEach((name,mi)=>{
    const m=MEMBERS[name];
    const mine=mel.filter(n=>{
      const sec=secOf(n.beat); if(!sec) return false;
      if(mem.length===1) return true;
      if(sec.name.indexOf("CHORUS")===0) return true;
      return vsections.indexOf(sec)%mem.length===mi;
    }).map(n=>{
      const sec=secOf(n.beat);
      const isChorus=sec&&sec.name.indexOf("CHORUS")===0;
      let midi=n.midi;
      if(mi>0&&isChorus) midi+=(mi===1?-3:mi===2?-7:-12);
      return {...n,midi};
    });
    if(mine.length) push(name+"（歌）","voice:"+name,m.color,mine,mi===0?.95:.6,mi===0?0:(mi%2?-.25:.25),.34);
  });

  const chords=[];
  plan.sections.forEach(s=>{
    for(let b=0;b<s.bars;b++){
      const deg=plan.prog[(s.startBar+b)%plan.prog.length];
      const ch=degChord(plan,deg);
      const hits=s.energy>.8?Array.from({length:bpb},(_,i)=>i):s.energy>.5?[0,mid]:[0];
      hits.forEach(h=>ch.forEach(m=>chords.push({beat:(s.startBar+b)*bpb+h,dur:(bpb/hits.length)*.9,midi:m,vel:.3+s.energy*.2})));
    }
  });
  const bassN=[];
  plan.sections.forEach(s=>{
    for(let b=0;b<s.bars;b++){
      const deg=plan.prog[(s.startBar+b)%plan.prog.length];
      const r=degChord(plan,deg)[0]-24, t0=(s.startBar+b)*bpb;
      if(s.energy>.7){ for(let p=0;p<bpb;p++){ bassN.push({beat:t0+p,dur:.45,midi:r,vel:.6}); if(p%2===1)bassN.push({beat:t0+p+.5,dur:.3,midi:r,vel:.4}); } }
      else { [0,mid].forEach(p=>bassN.push({beat:t0+p,dur:.5,midi:r,vel:.55})); }
    }
  });
  const drumN=[];
  plan.sections.forEach(s=>{
    for(let b=0;b<s.bars;b++){
      const t0=(s.startBar+b)*bpb;
      if(s.energy<.5){ drumN.push({beat:t0,dur:.3,midi:36,vel:.5}); drumN.push({beat:t0+mid,dur:.3,midi:38,vel:.35}); continue; }
      drumN.push({beat:t0,dur:.3,midi:36,vel:.85});
      if(bpb>=4) drumN.push({beat:t0+mid,dur:.3,midi:36,vel:.7});
      for(let p=1;p<bpb;p+=2) drumN.push({beat:t0+p,dur:.3,midi:38,vel:.7});
      const st=s.energy>.85?.5:1;
      for(let p=0;p<bpb;p+=st) drumN.push({beat:t0+p,dur:.2,midi:42,vel:.3});
      if(b===s.bars-1&&s.energy>.6) for(let k=0;k<4;k++) drumN.push({beat:t0+bpb-1+k*.25,dur:.2,midi:45,vel:.6});
    }
  });
  const inst=(name,dict)=>{
    const inf=dict[name], oct=inf.oct*12;
    let notes;
    if(inf.t==="drums") notes=drumN;
    else if(inf.t==="bass") notes=bassN;
    else if(["egtr","agtr","pad","piano","harp","mand"].includes(inf.t)) notes=chords.map(n=>({...n,midi:n.midi+oct}));
    else if(inf.t==="timp") notes=bassN.filter((_,i)=>i%4===0).map(n=>({...n,midi:n.midi+oct,dur:1}));
    else notes=mel.map(n=>({...n,midi:n.midi+oct,vel:n.vel*.5}));
    push(name,inf.t,inf.c,notes,inf.t==="drums"?.8:.5,rnd(-.4,.4),inf.t==="bow"||inf.t==="brass"?.42:.28);
  };
  S.band.forEach(n=>inst(n,BAND));
  S.orch.forEach(n=>inst(n,ORCH));
  S.mand.forEach(n=>inst(n,MAND));
  if(!S.band.includes("ベース")&&!S.orch.includes("コントラバス"))
    push("ベース","bass",BAND["ベース"].c,bassN,.55,0,.2);
  return {tracks:T,melody:mel,chords};
}

/* ==========================================================
   音源：各楽器のシンセ定義
   ========================================================== */
function noiseBuffer(ctx,sec){
  const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  return b;
}
function reverbImpulse(ctx,sec,decay){
  const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}
  return b;
}
function env(g,t,a,d,s,r,dur,peak){
  const G=g.gain; G.setValueAtTime(0.0001,t);
  G.exponentialRampToValueAtTime(peak,t+a);
  G.exponentialRampToValueAtTime(Math.max(.0002,peak*s),t+a+d);
  G.setValueAtTime(Math.max(.0002,peak*s),t+Math.max(a+d,dur));
  G.exponentialRampToValueAtTime(.0001,t+Math.max(a+d,dur)+r);
}
function playNote(ctx,dest,type,midi,t,dur,vel,extra){
  const f=mtof(midi), v=clamp(vel,.05,1);
  const g=ctx.createGain(); g.connect(dest);
  const NB=extra&&extra.noise;
  const osc=(wave,detune,gain)=>{const o=ctx.createOscillator();o.type=wave;o.frequency.value=f;
    if(detune)o.detune.value=detune;const og=ctx.createGain();og.gain.value=gain;o.connect(og);return {o,og};};

  const SIMPLE=!!(extra&&extra.simple);
  if(type.startsWith("voice:")){
    const m=MEMBERS[type.split(":")[1]]||MEMBERS["結衣"], vx=m.vox;
    const mix=ctx.createGain(); mix.gain.value=SIMPLE?.8:.5;
    (SIMPLE?[0]:[0,-7,7]).forEach((dt,i)=>{const {o,og}=osc("sawtooth",dt,i?.35:.7);o.connect(og);og.connect(mix);
      const lfo=ctx.createOscillator(),la=ctx.createGain();
      lfo.frequency.value=vx.vib+(vx.kobushi?Math.sin(t*3)*1.5:0); la.gain.value=f*(vx.kobushi?.016:.008);
      lfo.connect(la); la.connect(o.frequency); lfo.start(t); lfo.stop(t+dur+.4);
      o.start(t); o.stop(t+dur+.35);});
    // フォルマント（3バンド）
    let last=mix;
    (SIMPLE?vx.formant.slice(0,1):vx.formant).forEach((fr,i)=>{
      const bp=ctx.createBiquadFilter(); bp.type="peaking"; bp.frequency.value=fr*vx.bright; bp.Q=6; bp.gain.value=10-i*2;
      last.connect(bp); last=bp;
    });
    const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3600*vx.bright; lp.Q=.7;
    last.connect(lp); lp.connect(g);
    // ブレス（下書きでは省略）
    if(SIMPLE){ env(g,t,.055,.12,.82,.28,dur,v*.5); return; }
    const nb=ctx.createBufferSource(); nb.buffer=NB; nb.loop=true;
    const nf=ctx.createBiquadFilter(); nf.type="bandpass"; nf.frequency.value=2400; nf.Q=.8;
    const ng=ctx.createGain(); ng.gain.value=0;
    ng.gain.setValueAtTime(vx.breath*v*.5,t); ng.gain.exponentialRampToValueAtTime(.0001,t+Math.min(.22,dur));
    nb.connect(nf); nf.connect(ng); ng.connect(g); nb.start(t); nb.stop(t+dur+.2);
    env(g,t,.055,.12,.82,.28,dur,v*.5);
    return;
  }
  switch(type){
    case "drums":{
      const kind=midi;
      if(kind===36){ // キック
        const o=ctx.createOscillator(); o.type="sine";
        o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(44,t+.12);
        o.connect(g); env(g,t,.004,.11,.02,.06,.11,v); o.start(t); o.stop(t+.32);
      } else if(kind===38||kind===45){ // スネア／タム
        const nb=ctx.createBufferSource(); nb.buffer=NB;
        const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=kind===38?1900:900; bp.Q=.9;
        nb.connect(bp); bp.connect(g);
        const o=ctx.createOscillator(); o.type="triangle"; o.frequency.value=kind===38?190:130; o.connect(g);
        env(g,t,.003,.09,.02,.07,.08,v*.9); nb.start(t); nb.stop(t+.3); o.start(t); o.stop(t+.16);
      } else { // ハイハット
        const nb=ctx.createBufferSource(); nb.buffer=NB;
        const hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=7200;
        nb.connect(hp); hp.connect(g); env(g,t,.002,.04,.02,.03,.04,v*.55); nb.start(t); nb.stop(t+.2);
      } return;
    }
    case "bass":{
      const {o,og}=osc("sawtooth",0,.8); const s2=ctx.createOscillator(); s2.type="sine"; s2.frequency.value=f/2;
      const sg=ctx.createGain(); sg.gain.value=.7; s2.connect(sg);
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=420; lp.Q=4;
      o.connect(og); og.connect(lp); sg.connect(lp); lp.connect(g);
      env(g,t,.01,.14,.5,.1,dur,v*.75); o.start(t); o.stop(t+dur+.15); s2.start(t); s2.stop(t+dur+.15); return;
    }
    case "egtr": case "agtr": case "mand": case "harp":{
      const tremolo=(type==="mand");
      const reps=tremolo?Math.max(1,Math.round(dur*(SIMPLE?5:11))):1;
      for(let r=0;r<reps;r++){
        const tt=t+r*(dur/reps), dd=dur/reps;
        const gg=ctx.createGain(); gg.connect(g);
        const o=ctx.createOscillator(); o.type=type==="agtr"?"triangle":"sawtooth"; o.frequency.value=f;
        const lp=ctx.createBiquadFilter(); lp.type="lowpass";
        lp.frequency.setValueAtTime(type==="egtr"?3200:4200,tt);
        lp.frequency.exponentialRampToValueAtTime(700,tt+dd);
        o.connect(lp); lp.connect(gg);
        env(gg,tt,.004,dd*.7,.05,.12,dd*.8,v*(type==="harp"?.4:.32)/(tremolo?1.5:1));
        o.start(tt); o.stop(tt+dd+.2);
      }
      env(g,t,.001,.01,1,.02,dur,1); return;
    }
    case "piano":{
      const gg=ctx.createGain(); gg.connect(g);
      (SIMPLE?[[1,.65,"triangle"]]:[[1,.6,"triangle"],[2,.18,"sine"],[3,.08,"sine"]]).forEach(([h,a,w])=>{
        const o=ctx.createOscillator(); o.type=w; o.frequency.value=f*h;
        const og2=ctx.createGain(); og2.gain.value=a; o.connect(og2); og2.connect(gg);
        o.start(t); o.stop(t+dur+.5);
      });
      env(gg,t,.006,Math.min(1.2,dur*.9),.12,.4,dur,v*.4); env(g,t,.001,.01,1,.02,dur,1); return;
    }
    case "pad":{
      const gg=ctx.createGain(); gg.connect(g);
      (SIMPLE?[0]:[-8,0,8]).forEach(dt=>{const o=ctx.createOscillator();o.type="sawtooth";o.frequency.value=f;o.detune.value=dt;
        const og2=ctx.createGain();og2.gain.value=.22;o.connect(og2);og2.connect(gg);o.start(t);o.stop(t+dur+.4);});
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2200; gg.connect(lp); lp.connect(g);
      env(gg,t,.12,.2,.8,.35,dur,v*.3); env(g,t,.001,.01,1,.02,dur,1); return;
    }
    case "bow":{
      const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.value=f;
      if(!SIMPLE){const lfo=ctx.createOscillator(), la=ctx.createGain(); lfo.frequency.value=5.1; la.gain.value=f*.006;
      lfo.connect(la); la.connect(o.frequency); lfo.start(t); lfo.stop(t+dur+.3);}
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2600; lp.Q=1.2;
      o.connect(lp); lp.connect(g);
      env(g,t,.09,.1,.85,.3,dur,v*.3); o.start(t); o.stop(t+dur+.3); return;
    }
    case "brass":{
      const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.value=f;
      const lp=ctx.createBiquadFilter(); lp.type="lowpass";
      lp.frequency.setValueAtTime(700,t); lp.frequency.linearRampToValueAtTime(3400,t+.09); lp.Q=2;
      o.connect(lp); lp.connect(g);
      env(g,t,.05,.1,.8,.2,dur,v*.3); o.start(t); o.stop(t+dur+.25); return;
    }
    case "reed":{
      const o=ctx.createOscillator(); o.type="square"; o.frequency.value=f;
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1900; lp.Q=1;
      o.connect(lp); lp.connect(g);
      env(g,t,.045,.08,.85,.2,dur,v*.22); o.start(t); o.stop(t+dur+.24); return;
    }
    case "flute":{
      const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=f;
      if(!SIMPLE){const lfo=ctx.createOscillator(), la=ctx.createGain(); lfo.frequency.value=5.6; la.gain.value=f*.005;
      lfo.connect(la); la.connect(o.frequency); lfo.start(t); lfo.stop(t+dur+.3);}
      o.connect(g);
      if(SIMPLE){ env(g,t,.07,.08,.9,.22,dur,v*.3); o.start(t); o.stop(t+dur+.3); return; }
      const nb=ctx.createBufferSource(); nb.buffer=NB; nb.loop=true;
      const hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=3000;
      const ng=ctx.createGain(); ng.gain.value=v*.03; nb.connect(hp); hp.connect(ng); ng.connect(g);
      nb.start(t); nb.stop(t+dur+.2);
      env(g,t,.07,.08,.9,.22,dur,v*.3); o.start(t); o.stop(t+dur+.3); return;
    }
    case "timp":{
      const o=ctx.createOscillator(); o.type="sine";
      o.frequency.setValueAtTime(f*1.4,t); o.frequency.exponentialRampToValueAtTime(f,t+.1);
      const nb=ctx.createBufferSource(); nb.buffer=NB;
      const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=180; bp.Q=1.4;
      nb.connect(bp); bp.connect(g); o.connect(g);
      env(g,t,.006,.5,.06,.5,.5,v*.5); o.start(t); o.stop(t+1.2); nb.start(t); nb.stop(t+.7); return;
    }
    default:{
      const o=ctx.createOscillator(); o.type="triangle"; o.frequency.value=f; o.connect(g);
      env(g,t,.02,.1,.6,.2,dur,v*.3); o.start(t); o.stop(t+dur+.25);
    }
  }
}

/* ==========================================================
   レンダリング（OfflineAudioContext）
   ========================================================== */
async function renderSong(song,onStep,opt){
  opt=opt||{};
  let sr=opt.sr||parseInt($("#set-sr").value,10)||44100;
  const beat=song.plan.beat;
  const dur=song.plan.totalBars*song.plan.bpb*beat+2.2;
  if(sr*dur>26000000) sr=22050;                 // 長尺は自動で軽くする
  const ctx=new OfflineAudioContext(2,Math.ceil(sr*dur),sr);
  S._noteErrors=0; S._lastErr=null;
  const NB=noiseBuffer(ctx,2);

  // マスター：コンプ → リミッター相当 → 出力
  const master=ctx.createGain();
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-16; comp.knee.value=8; comp.ratio.value=3.2; comp.attack.value=.006; comp.release.value=.22;
  const hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=32;      // ノイズ除去
  const eqLo=ctx.createBiquadFilter(); eqLo.type="lowshelf"; eqLo.frequency.value=120; eqLo.gain.value=1.5;
  const eqHi=ctx.createBiquadFilter(); eqHi.type="highshelf"; eqHi.frequency.value=8000; eqHi.gain.value=2;
  const limit=ctx.createDynamicsCompressor();
  limit.threshold.value=-2; limit.knee.value=0; limit.ratio.value=20; limit.attack.value=.001; limit.release.value=.1;
  const outGain=ctx.createGain();
  outGain.gain.value=Math.pow(10,parseFloat($("#set-master").value)/20);
  master.connect(hp); hp.connect(eqLo); eqLo.connect(eqHi); eqHi.connect(comp); comp.connect(limit); limit.connect(outGain); outGain.connect(ctx.destination);

  // 残響：畳み込みは曲全体にかかるので下書きでは短く／省く
  let rev=null;
  if(!opt.noReverb){
    rev=ctx.createConvolver(); rev.buffer=reverbImpulse(ctx,opt.revSec||2.4,2.6);
    const revGain=ctx.createGain(); revGain.gain.value=.9; rev.connect(revGain); revGain.connect(master);
  }

  let tracks=song.tracks;
  if(opt.essentialOnly)
    tracks=tracks.filter(t=>t.type.startsWith("voice:")||t.type==="drums"||t.type==="bass"||t.type==="piano"||t.type==="pad");
  if(!tracks.length) tracks=song.tracks.slice(0,3);
  tracks.forEach(tr=>{
    const st=S.mixer[tr.name]||{vol:tr.vol,pan:tr.pan,rev:tr.rev};
    const g=ctx.createGain(); g.gain.value=st.vol;
    const p=ctx.createStereoPanner(); p.pan.value=clamp(st.pan,-1,1);
    g.connect(p); p.connect(master);
    if(rev){ const sendG=ctx.createGain(); sendG.gain.value=st.rev; p.connect(sendG); sendG.connect(rev); }
    const notes=opt.stride>1?tr.notes.filter((_,i)=>i%opt.stride===0):tr.notes;
    notes.forEach(n=>{
      const t0=n.beat*beat+.05, d=Math.max(.06,n.dur*beat), m=Math.round(n.midi);
      if(!isFinite(t0)||!isFinite(d)||!isFinite(m)||m<0||m>127||t0>=dur) return;
      try{ playNote(ctx,g,tr.type,m,t0,d,clamp(n.vel||.5,.05,1),{noise:NB,simple:!!opt.simple}); }
      catch(err){ S._noteErrors++; if(!S._lastErr) S._lastErr=err; }
    });
  });
  if(onStep) onStep("書き出し");
  // 途中で止めて進捗を返す（対応していないブラウザでは黙って通常処理）
  if(opt.onProg){
    try{
      const N=10;
      for(let i=1;i<N;i++){
        const at=dur*i/N;
        ctx.suspend(at).then(()=>{ opt.onProg(i/N); ctx.resume(); }).catch(()=>{});
      }
    }catch(e){}
  }
  return await ctx.startRendering();
}

/* ==========================================================
   生成フロー
   ========================================================== */
function readCfg(){
  return {
    title:$("#f-title").value.trim()||"無題の曲",
    theme:$("#f-theme").value.trim(),
    scale:$("#f-scale").value, mood:$("#f-mood").value, preset:S.preset,
    bpm:parseInt($("#f-bpm").value,10), key:parseInt($("#f-key").value,10),
    trans:parseInt($("#f-trans").value,10), length:parseInt($("#f-len").value,10),
    meter:$("#f-meter").value, vmode:$("#f-vmode").value, members:[...S.members],
    band:[...S.band], orch:[...S.orch], mand:[...S.mand], lyrics:$("#lyricEdit").value
  };
}
$("#btn-gen").onclick=async()=>{
  const cfg=readCfg();
  const lines=cfg.lyrics.split("\n").map(s=>s.trim()).filter(Boolean);
  const steps=["歌詞を読む","構成を決める","コード進行","メロディー","ベースとドラム","楽器を重ねる","ミックス","マスタリング"];
  closeDrawer();
  $("#gen").classList.add("on"); status("GENERATING",true);
  try{
    for(let i=0;i<6;i++){ $("#genstep").textContent=steps[i]; $("#genbar").style.width=(i/steps.length*100)+"%"; await new Promise(r=>setTimeout(r,110)); }
    const plan=planSong(cfg);
    const {tracks,melody,chords}=buildTracks(plan,lines);
    let total=tracks.reduce((a,t)=>a+t.notes.length,0);
    const BUDGET=16000;
    if(total>BUDGET){
      tracks.forEach(t=>{
        if(t.type.startsWith("voice:")||t.type==="drums"||t.type==="bass") return;
        const keep=Math.max(1,Math.floor(t.notes.length*BUDGET/total));
        const stride=Math.ceil(t.notes.length/keep);
        t.notes=t.notes.filter((_,i)=>i%stride===0);
      });
    }
    const song={cfg,plan,tracks,melody,chords,lyricLines:lines,id:"s"+Date.now(),fav:false};
    S.mixer={}; tracks.forEach(t=>S.mixer[t.name]={vol:t.vol,pan:t.pan,rev:t.rev});
    $("#genstep").textContent=steps[6]; $("#genbar").style.width="80%";
    const QP={
      draft:{sr:22050,stride:2,simple:true,noReverb:true},
      normal:{stride:1,revSec:2.0},
      high:{stride:1,revSec:2.6}
    };
    const q=$("#f-quality").value;
    const base=QP[q]||QP.normal;
    const attempts=[base,
      Object.assign({},base,{sr:22050,stride:2,simple:true,noReverb:true}),
      {sr:22050,stride:3,simple:true,noReverb:true,essentialOnly:true}];
    let buf=null, lastErr=null;
    for(let a=0;a<attempts.length;a++){
      try{
        if(a>0) $("#genstep").textContent="軽い設定で再試行（"+a+"回目）";
        const t0=Date.now();
        clearInterval(S._tick);
        S._tick=setInterval(()=>{ $("#genelapsed").textContent=((Date.now()-t0)/1000).toFixed(1)+" 秒"; },100);
        const o=Object.assign({},attempts[a],{onProg:r=>{
          $("#genbar").style.width=(80+r*20)+"%";
          $("#genstep").textContent="音を書き出しています "+Math.round(r*100)+"%";
        }});
        buf=await renderSong(song,x=>{$("#genstep").textContent=x;},o);
        clearInterval(S._tick);
        if(a>0) toast("軽い設定で書き出しました（楽器や音数を減らしています）");
        break;
      }catch(err){ console.error("render attempt",a,err); lastErr=err; }
    }
    if(!buf) throw lastErr||new Error("レンダリングに失敗しました");
    $("#genbar").style.width="100%";
    S.song=song; S.buffer=buf;
    afterRender(); toast("曲ができました"); status("READY",false);
    if(S._noteErrors>0) console.warn("skipped notes:",S._noteErrors,S._lastErr);
  }catch(e){
    console.error(e); status("ERROR",false);
    showError(e,{preset:cfg.preset,len:cfg.length,meter:cfg.meter,bpm:cfg.bpm,
      tracks:(S.song&&S.song.tracks?S.song.tracks.length:0),
      band:cfg.band.length,orch:cfg.orch.length,mand:cfg.mand.length,
      noteErrors:S._noteErrors||0});
  }finally{
    clearInterval(S._tick);
    $("#gen").classList.remove("on"); $("#genbar").style.width="0"; $("#genelapsed").textContent="";
  }
};
$("#btn-remix").onclick=async()=>{
  if(!S.song)return;
  $("#gen").classList.add("on"); $("#genstep").textContent="ミックスを反映"; $("#genbar").style.width="60%"; status("MIXING",true);
  try{ const q=$("#f-quality").value;
    const QP={draft:{sr:22050,stride:2,simple:true,noReverb:true},normal:{stride:1,revSec:2.0},high:{stride:1,revSec:2.6}};
    S.buffer=await renderSong(S.song,null,QP[q]||QP.normal); afterRender(); toast("ミックスを反映しました"); status("READY",false); }
  catch(e){ toast("反映に失敗しました"); status("ERROR",false); }
  finally{ $("#gen").classList.remove("on"); $("#genbar").style.width="0"; }
};
function afterRender(){
  S._peakKey=null; S._peaks=null;
  stopAudio();
  drawWave(); drawScore(); renderLyricSync(); renderTimeline(); renderMixer(); renderChords();
  ["#ex-wav","#ex-midi","#ex-json","#btn-save","#btn-remix","#btn-rec"].forEach(s=>$(s).disabled=false);
  const c=S.song.cfg;
  $("#t-meta").textContent=`${KEYS[(c.key+c.trans+120)%12]} · ${c.meter} · ${c.bpm}BPM · ${S.song.tracks.length}trk`;
  $("#t-time").textContent="0:00 / "+fmt(S.buffer.duration);
  drawViz(0); drawMvFrame(0);
}

/* ---------- エラー表示（内容をそのまま出す） ---------- */
function showError(e,info){
  const txt=[
    "SDayDream Music Studio 生成エラー",
    "name: "+(e&&e.name||"-"),
    "message: "+(e&&e.message||String(e)),
    "info: "+JSON.stringify(info||{}),
    "ua: "+navigator.userAgent,
    "stack: "+((e&&e.stack||"").split("\n").slice(0,4).join(" / "))
  ].join("\n");
  const box=$("#errbox"), pre=$("#errtext");
  pre.textContent=txt; box.classList.add("on");
  $("#errcopy").onclick=()=>{
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast("コピーしました"),()=>{});
    else toast("上の文字を手で選んでコピーしてください");
  };
  $("#errclose").onclick=()=>box.classList.remove("on");
}
window.addEventListener("error",ev=>{ if(ev&&ev.error) console.error(ev.error); });

/* ---------- ピーク・波形 ---------- */
function computePeaks(W){
  const key=W+"x"+(S.buffer?S.buffer.length:0);
  if(S._peakKey===key) return S._peaks;
  const d0=S.buffer.getChannelData(0), d1=S.buffer.numberOfChannels>1?S.buffer.getChannelData(1):d0;
  const N=Math.max(1,Math.floor(W)), step=Math.max(1,Math.floor(d0.length/N)), out=new Float32Array(N);
  for(let i=0;i<N;i++){ let mx=0; const s0=i*step, e=Math.min(d0.length,s0+step);
    for(let j=s0;j<e;j+=4){ const v=Math.abs((d0[j]+d1[j])*.5); if(v>mx)mx=v; }
    out[i]=mx; }
  S._peaks=out; S._peakKey=key; return out;
}
function energyAt(t){
  if(!S.buffer)return 0;
  const p=computePeaks(600);
  return p[clamp(Math.floor(t/S.buffer.duration*p.length),0,p.length-1)]||0;
}
function drawWave(){
  const cv=$("#wave"); if(!cv||!cv.clientWidth)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=cv.clientWidth*dpr; cv.height=112*dpr;
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const W=cv.clientWidth,H=112;
  g.fillStyle="#04070F"; g.fillRect(0,0,W,H);
  if(!S.buffer)return;
  const total=S.buffer.duration, bar=S.song.plan.bar;
  S.song.plan.sections.forEach((s,i)=>{
    const x=(s.startBar*bar/total)*W, w=(s.bars*bar/total)*W;
    g.fillStyle=i%2?"rgba(27,42,69,.55)":"rgba(27,42,69,.25)"; g.fillRect(x,0,w,H);
  });
  const peaks=computePeaks(W), N=peaks.length;
  const grad=g.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,"#35E1F5"); grad.addColorStop(.5,"#9B7BFF"); grad.addColorStop(1,"#FF4FA3");
  g.strokeStyle=grad; g.lineWidth=1; g.beginPath();
  for(let i=0;i<N;i++){ const h=Math.max(1,peaks[i]*H*.9); g.moveTo(i+.5,H/2-h/2); g.lineTo(i+.5,H/2+h/2); }
  g.stroke();
  g.strokeStyle="rgba(230,238,248,.14)"; g.beginPath(); g.moveTo(0,H/2); g.lineTo(W,H/2); g.stroke();
}
function drawWaveHead(t){
  const cv=$("#wave"); if(!cv||!S.buffer||S.vizPane!=="wave")return;
  const g=cv.getContext("2d"), W=cv.clientWidth, H=112, x=(t/S.buffer.duration)*W;
  g.save(); g.strokeStyle="#E6EEF8"; g.lineWidth=1.4; g.shadowColor="#35E1F5"; g.shadowBlur=8;
  g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); g.restore();
}
$("#wave").onclick=e=>{
  if(!S.buffer)return;
  const r=e.currentTarget.getBoundingClientRect();
  seek(((e.clientX-r.left)/r.width)*S.buffer.duration);
};
$("#progress").onclick=e=>{
  if(!S.buffer)return;
  const r=e.currentTarget.getBoundingClientRect();
  seek(((e.clientX-r.left)/r.width)*S.buffer.duration);
};

/* ---------- リアルタイム可視化 ---------- */
const VIZ_NOTES=["♪","♫","♩","♬","𝄞"];
function drawViz(t){
  const cv=$("#viz"); if(!cv||!cv.clientWidth)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const W=cv.clientWidth, H=Math.round(W*8/16);
  if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const fx=$("#set-mvfx").value;
  g.fillStyle="#04070F"; g.fillRect(0,0,W,H);
  const e=energyAt(t), pulse=.5+e*1.6;

  // 遠近グリッド（下半分）
  const hz=H*.52;
  g.strokeStyle="rgba(53,225,245,.20)"; g.lineWidth=1;
  for(let i=0;i<=10;i++){
    const z=i/10, y=hz+Math.pow(z,1.9)*(H-hz);
    const spread=.08+z*.95;
    g.globalAlpha=.15+z*.5;
    g.beginPath(); g.moveTo(W*.5-W*spread*.5,y); g.lineTo(W*.5+W*spread*.5,y); g.stroke();
  }
  for(let i=-6;i<=6;i++){
    g.globalAlpha=.22;
    g.beginPath(); g.moveTo(W*.5+i*W*.008,hz); g.lineTo(W*.5+i*W*.085,H); g.stroke();
  }
  g.globalAlpha=1;

  if(fx!=="off"){
    // 浮遊する音符
    const n=fx==="full"?26:12;
    const colors=S.song?S.song.tracks.map(x=>x.color):["#35E1F5","#FF4FA3","#9B7BFF"];
    for(let i=0;i<n;i++){
      const sd=i*57.31;
      const x=((Math.sin(sd)*.5+.5)*W + t*(16+(i%5)*9)*(i%2?1:-1)%W+W*2)%W;
      const y=hz*.15+(Math.cos(sd*1.7)*.5+.5)*hz*.8+Math.sin(t*1.6+i)*7;
      const sz=(11+(i%4)*5)*(1+pulse*.28);
      g.globalAlpha=.35+.5*Math.abs(Math.sin(t*1.3+i));
      g.fillStyle=colors[i%colors.length];
      g.shadowColor=g.fillStyle; g.shadowBlur=fx==="full"?14:6;
      g.font=`${Math.round(sz)}px "Zen Kaku Gothic New",sans-serif`;
      g.fillText(VIZ_NOTES[i%VIZ_NOTES.length],x,y);
    }
    g.shadowBlur=0; g.globalAlpha=1;
  }
  // 中央の帯（音量に反応）
  if(S.buffer){
    const p=computePeaks(Math.floor(W/3));
    const idx=Math.floor(t/S.buffer.duration*p.length);
    g.strokeStyle="rgba(53,225,245,.85)"; g.lineWidth=2; g.beginPath();
    for(let i=0;i<p.length;i++){
      const v=p[(idx+i)%p.length];
      const x=i*3, y=hz*.62+Math.sin(i*.35+t*4)*8-v*hz*.34;
      i?g.lineTo(x,y):g.moveTo(x,y);
    }
    g.stroke();
  }
  // ラベル
  g.font='600 9px "Chakra Petch",sans-serif'; g.fillStyle="rgba(126,144,172,.85)";
  g.fillText(S.song?`${S.song.cfg.preset} / ${S.song.cfg.meter} / ${S.song.cfg.bpm}BPM`:"STANDBY",10,15);
}

/* ---------- 楽譜 ---------- */
function drawScore(){
  const cv=$("#score"); if(!cv||!cv.clientWidth)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=cv.clientWidth*dpr; cv.height=130*dpr;
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const W=cv.clientWidth,H=130;
  g.fillStyle="#0A1220"; g.fillRect(0,0,W,H);
  if(!S.song)return;
  g.strokeStyle="rgba(53,225,245,.35)"; g.lineWidth=1;
  for(let i=0;i<5;i++){const y=36+i*12;g.beginPath();g.moveTo(12,y);g.lineTo(W-12,y);g.stroke();}
  g.fillStyle="#7E90AC"; g.font='600 9px "Chakra Petch",sans-serif';
  g.fillText("MELODY  "+KEYS[(S.song.cfg.key+S.song.cfg.trans+120)%12]+"  "+S.song.cfg.meter,12,20);
  const mel=S.song.melody.slice(0,120); if(!mel.length)return;
  const b0=mel[0].beat, b1=mel[mel.length-1].beat+1;
  mel.forEach(n=>{
    const x=12+((n.beat-b0)/(b1-b0))*(W-34);
    const y=clamp(36+60-((n.midi-S.song.plan.root)/2)*6.2,8,H-14);
    g.fillStyle="#35E1F5"; g.beginPath(); g.ellipse(x,y,4,3,-.2,0,Math.PI*2); g.fill();
    g.strokeStyle="rgba(53,225,245,.7)"; g.beginPath(); g.moveTo(x+4,y); g.lineTo(x+4,y-15); g.stroke();
  });
}

/* ---------- 歌詞同期・構成・コード・ミキサー ---------- */
function renderLyricSync(){
  const box=$("#lyricSync"); box.innerHTML="";
  const lines=S.song.lyricLines.length?S.song.lyricLines:["（インスト）"];
  lines.forEach((l,i)=>{const p=document.createElement("p");p.textContent=l;p.dataset.i=i;box.appendChild(p);});
}
function renderTimeline(){
  const h=$("#timeline"); h.innerHTML="";
  const bar=S.song.plan.bar;
  S.song.plan.sections.forEach((s,i)=>{
    const b=document.createElement("button"); b.className="seg"; b.dataset.i=i;
    b.style.borderTopColor=["#35E1F5","#FF4FA3","#9B7BFF","#FFC24B"][i%4];
    b.innerHTML=`<b>${s.name}</b><small>${fmt(s.startBar*bar)} · ${s.bars}bar</small>`;
    b.onclick=()=>seek(s.startBar*bar);
    h.appendChild(b);
  });
}
function renderChords(){
  const h=$("#chords"); h.innerHTML="";
  S.song.plan.prog.forEach((deg,i)=>{
    if(i){const a=document.createElement("span");a.className="ar";a.textContent="—";h.appendChild(a);}
    const c=document.createElement("span"); c.className="cd"; c.textContent=chordName(S.song.plan,deg); h.appendChild(c);
  });
}
function renderMixer(){
  const h=$("#mixer"); h.innerHTML="";
  S.song.tracks.forEach(tr=>{
    const st=S.mixer[tr.name];
    const d=document.createElement("div"); d.className="mrow";
    d.innerHTML=`<div class="nm"><span class="dot" style="background:${tr.color}"></span>${tr.name}</div>
      <input type="range" min="0" max="1.4" step="0.02" value="${st.vol}" title="音量">
      <div class="sub">
        <input type="range" min="-1" max="1" step="0.05" value="${st.pan}" title="パン">
        <input type="range" min="0" max="1" step="0.05" value="${st.rev}" title="残響">
      </div>`;
    const [v,p,r]=d.querySelectorAll("input");
    v.oninput=()=>st.vol=parseFloat(v.value);
    p.oninput=()=>st.pan=parseFloat(p.value);
    r.oninput=()=>st.rev=parseFloat(r.value);
    h.appendChild(d);
  });
}

/* ---------- 再生 ---------- */
function audioCtx(){ if(!S.ctx) S.ctx=new (window.AudioContext||window.webkitAudioContext)(); return S.ctx; }
function stopSource(){ if(S.src){try{S.src.onended=null;S.src.stop();}catch(e){} S.src=null;} }
function playAudio(from){
  if(!S.buffer)return;
  const ctx=audioCtx(); if(ctx.state==="suspended") ctx.resume();
  stopSource();
  const src=ctx.createBufferSource(); src.buffer=S.buffer; src.connect(ctx.destination);
  src.start(0,clamp(from,0,S.buffer.duration-.05));
  S.src=src; S.startAt=ctx.currentTime; S.offset=from; S.playing=true;
  $("#btn-play").textContent="❚❚ PAUSE"; status("PLAYING",true);
  loop();
}
function pauseAudio(){ if(!S.playing)return; S.offset=pos(); stopSource(); S.playing=false;
  $("#btn-play").textContent="▶ PLAY"; status("PAUSED",false); cancelAnimationFrame(S.rafT); }
function stopAudio(){ stopSource(); S.playing=false; S.offset=0; $("#btn-play").textContent="▶ PLAY";
  cancelAnimationFrame(S.rafT);
  if(S.buffer){ drawWave(); $("#t-time").textContent="0:00 / "+fmt(S.buffer.duration);
    $("#progress i").style.width="0"; drawViz(0); drawMvFrame(0); status("READY",false); } }
function pos(){ return S.playing? S.offset+(audioCtx().currentTime-S.startAt) : S.offset; }
function seek(t){
  if(!S.buffer)return;
  if(S.playing) playAudio(t);
  else{ S.offset=t; drawWave(); drawWaveHead(t); frameUpdate(t); }
}
$("#btn-play").onclick=()=>{ if(!S.buffer){toast("先に曲を作ってください");return;} S.playing?pauseAudio():playAudio(S.offset); };
$("#btn-stop").onclick=stopAudio;
$("#btn-rec").onclick=()=>{ if(S.buffer){ download(wavBlob(S.buffer),safeName(S.song.cfg.title)+".wav"); toast("WAVを書き出しました"); } };
function frameUpdate(t){
  $("#t-time").textContent=fmt(t)+" / "+fmt(S.buffer.duration);
  $("#progress i").style.width=(t/S.buffer.duration*100)+"%";
  highlight(t); drawViz(t);
  if(S.vizPane==="mv") drawMvFrame(t);
}
function loop(){
  const t=pos();
  drawWave(); drawWaveHead(t); frameUpdate(t);
  if(S.playing&&t<S.buffer.duration) S.rafT=requestAnimationFrame(loop);
  else if(S.playing) stopAudio();
}
function highlight(t){
  if(!S.song)return;
  const bar=S.song.plan.bar, barIdx=Math.floor(t/bar);
  const lines=S.song.lyricLines;
  if(lines.length){
    const i=((barIdx%lines.length)+lines.length)%lines.length;
    $$("#lyricSync p").forEach(p=>p.classList.toggle("cur",+p.dataset.i===i));
  }
  const secs=S.song.plan.sections;
  let si=0; secs.forEach((s,k)=>{ if(barIdx>=s.startBar) si=k; });
  $$("#timeline .seg").forEach(b=>b.classList.toggle("cur",+b.dataset.i===si));
}

/* ---------- MV ---------- */
function drawMvFrame(t){
  const cv=$("#mv"); if(!cv||!cv.clientWidth)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const W=cv.clientWidth, H=Math.round(W*9/16);
  if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const fx=$("#set-mvfx").value;
  const pal=S.song?PRESETS[S.song.cfg.preset].mv:["#1B2647","#FFC24B","#060C18"];
  const bar=S.song?S.song.plan.bar:2, ph=(t%bar)/bar, scene=S.song?Math.floor(t/(bar*4)):0;
  const grad=g.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,pal[scene%pal.length]); grad.addColorStop(1,"#04070F");
  g.fillStyle=grad; g.fillRect(0,0,W,H);
  const b=pal[(scene+1)%pal.length];
  if(fx!=="off"){
    const n=fx==="full"?70:28;
    for(let i=0;i<n;i++){
      const sd=i*97.13+scene*13.7;
      const x=((sd*37)%W+t*(18+i%7)*(i%2?1:-1)+W*3)%W;
      const y=(Math.sin(sd)*.5+.5)*H;
      const r=1+((i%5)*.8)*(1+Math.sin(t*3+i)*.3);
      g.globalAlpha=.18+.5*Math.abs(Math.sin(t*1.7+i));
      g.fillStyle=b; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
    g.globalAlpha=1;
    if(fx==="full"){
      g.strokeStyle=b; g.globalAlpha=.35*(1-ph); g.lineWidth=2;
      g.beginPath(); g.arc(W*.5,H*.5,H*.15+ph*H*.5,0,Math.PI*2); g.stroke(); g.globalAlpha=1;
    }
  }
  if(S.song){
    const lines=S.song.lyricLines;
    const cur=lines.length?lines[Math.floor(t/bar)%lines.length]:"";
    g.textAlign="center";
    g.font=`700 ${Math.round(H*.085)}px "Shippori Mincho",serif`;
    g.fillStyle="rgba(0,0,0,.45)"; g.fillText(cur,W/2+2,H*.82+2);
    g.fillStyle="#E6EEF8"; g.fillText(cur,W/2,H*.82);
    g.font=`500 ${Math.round(H*.042)}px "Zen Kaku Gothic New",sans-serif`;
    g.fillStyle="rgba(230,238,248,.62)";
    g.fillText(S.song.cfg.title+"  /  DayDream＋",W/2,H*.93);
    const mem=S.song.cfg.members[scene%S.song.cfg.members.length];
    if(mem){ g.textAlign="left"; g.font=`700 ${Math.round(H*.05)}px "Chakra Petch",sans-serif`;
      g.fillStyle=MEMBERS[mem].color; g.fillText(mem,W*.045,H*.12); }
  }else{
    g.textAlign="center"; g.fillStyle="rgba(126,144,172,.7)";
    g.font='500 13px "Zen Kaku Gothic New",sans-serif';
    g.fillText("曲を作るとMVが動きます",W/2,H/2);
  }
}
let rsz;
window.addEventListener("resize",()=>{ clearTimeout(rsz); rsz=setTimeout(()=>{
  if(S.buffer){drawWave();drawScore();} drawViz(pos()); drawMvFrame(pos()); },160); });

/* ==========================================================
   書き出し
   ========================================================== */
function download(blob,name){
  const u=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
const safeName=s=>s.replace(/[\\/:*?"<>|]/g,"_");
function wavBlob(buf){
  const ch=buf.numberOfChannels, len=buf.length, sr=buf.sampleRate;
  const ab=new ArrayBuffer(44+len*ch*2), v=new DataView(ab);
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,"RIFF"); v.setUint32(4,36+len*ch*2,true); w(8,"WAVE"); w(12,"fmt ");
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,ch,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*ch*2,true); v.setUint16(32,ch*2,true); v.setUint16(34,16,true);
  w(36,"data"); v.setUint32(40,len*ch*2,true);
  const data=[]; for(let c=0;c<ch;c++) data.push(buf.getChannelData(c));
  let o=44;
  for(let i=0;i<len;i++) for(let c=0;c<ch;c++){ const s=clamp(data[c][i],-1,1); v.setInt16(o,s<0?s*0x8000:s*0x7FFF,true); o+=2; }
  return new Blob([ab],{type:"audio/wav"});
}
function vlq(n){let v=Math.max(0,Math.round(n));const out=[v&0x7F];v>>=7;
  while(v>0){out.unshift((v&0x7F)|0x80);v>>=7;} return out;}
function midiBlob(song){
  const bytes=[], push=(...a)=>a.forEach(x=>bytes.push(x));
  const str=s=>[...s].map(c=>c.charCodeAt(0));
  const u32=n=>[(n>>24)&255,(n>>16)&255,(n>>8)&255,n&255];
  const u16=n=>[(n>>8)&255,n&255];
  const TPQ=480, plan=song.plan;
  const q=plan&&plan.unit===8?.5:1;               // 8分音符基準なら4分音符換算で半分
  const [bpb,unit]=[plan?plan.bpb:4, plan?plan.unit:4];
  const us=Math.round(60000000/song.cfg.bpm);
  const tracks=[[...vlq(0),0xFF,0x51,0x03,(us>>16)&255,(us>>8)&255,us&255,
    ...vlq(0),0xFF,0x58,0x04,bpb,unit===8?3:2,24,8, ...vlq(0),0xFF,0x2F,0x00]];
  song.tracks.forEach((tr,i)=>{
    const evs=[];
    tr.notes.forEach(n=>{
      const on=Math.round(n.beat*q*TPQ), off=Math.round((n.beat+Math.max(.1,n.dur))*q*TPQ);
      const midi=clamp(Math.round(n.midi),0,127), vel=clamp(Math.round(n.vel*100),1,127);
      const chan=tr.type==="drums"?9:Math.min(15,i);
      evs.push({t:on,d:[0x90|chan,midi,vel]}); evs.push({t:off,d:[0x80|chan,midi,0]});
    });
    evs.sort((a,b)=>a.t-b.t);
    const out=[]; let last=0;
    const nm=[...new TextEncoder().encode(tr.name)];
    out.push(...vlq(0),0xFF,0x03,...vlq(nm.length),...nm);
    evs.forEach(e=>{ out.push(...vlq(e.t-last),...e.d); last=e.t; });
    out.push(...vlq(0),0xFF,0x2F,0x00);
    tracks.push(out);
  });
  push(...str("MThd"),...u32(6),...u16(1),...u16(tracks.length),...u16(TPQ));
  tracks.forEach(t=>{ push(...str("MTrk"),...u32(t.length),...t); });
  return new Blob([new Uint8Array(bytes)],{type:"audio/midi"});
}
$("#ex-wav").onclick=()=>{ download(wavBlob(S.buffer),safeName(S.song.cfg.title)+".wav"); toast("WAVを書き出しました"); };
$("#ex-midi").onclick=()=>{ download(midiBlob(S.song),safeName(S.song.cfg.title)+".mid"); toast("MIDIを書き出しました"); };
$("#ex-json").onclick=()=>{
  const out={app:"SDayDream Music Studio",version:"1.1.0-phase1",cfg:S.song.cfg,mixer:S.mixer,
    sections:S.song.plan.sections,chords:S.song.plan.prog.map(d=>chordName(S.song.plan,d)),
    noteCount:S.song.tracks.reduce((a,t)=>a+t.notes.length,0)};
  download(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}),safeName(S.song.cfg.title)+".sdms.json");
  toast("プロジェクトを書き出しました");
};

/* ---------- ライブラリ ---------- */
$("#btn-save").onclick=()=>{
  S.library.unshift({id:S.song.id,title:S.song.cfg.title,cfg:S.song.cfg,song:S.song,
    dur:S.buffer.duration,at:new Date(),fav:false,buffer:S.buffer});
  toast("ライブラリに保存しました（この画面を閉じるまで保持）");
};
function renderList(sel,items){
  const h=$(sel); if(!h)return; h.innerHTML="";
  if(!items.length){
    h.innerHTML=`<div class="empty"><b>まだ何もありません</b>スタジオで曲を作って「ライブラリに保存」を押すとここに並びます。</div>`;
    return;
  }
  items.forEach(it=>{
    const d=document.createElement("div"); d.className="li";
    d.innerHTML=`<div style="flex:1;min-width:0"><b>${it.title}</b>
      <div class="meta">${it.cfg.preset}・${it.cfg.bpm}BPM・${it.cfg.meter}・${KEYS[(it.cfg.key+it.cfg.trans+120)%12]}・${fmt(it.dur)}・${it.cfg.members.join("／")}</div></div>`;
    const fav=document.createElement("button"); fav.className="btn"; fav.textContent=it.fav?"★":"☆";
    fav.onclick=()=>{ it.fav=!it.fav; fav.textContent=it.fav?"★":"☆"; };
    const play=document.createElement("button"); play.className="btn"; play.textContent="再生";
    play.onclick=()=>{ S.song=it.song; S.buffer=it.buffer; S.mixer={};
      it.song.tracks.forEach(t=>S.mixer[t.name]={vol:t.vol,pan:t.pan,rev:t.rev});
      go("studio"); afterRender(); playAudio(0); };
    d.appendChild(fav); d.appendChild(play); h.appendChild(d);
  });
}

/* ---------- 初期表示 ---------- */
$("#lyricEdit").value="夕暮れの坂道 君の影が伸びる\nあと少しだけ このままでいたいよ\n名前を呼ぶ声が 風にほどけていく\n忘れないよ この夏のこと";
$("#f-title").value="七月の合図";
$("#f-theme").value="夏の終わり";
updateGauges(); renderTrackRail(); renderPickSummary(); $("#f-quality").onchange(); drawViz(0); drawMvFrame(0); status("STANDBY",false);

/* ==========================================================
   SUNO プロンプト生成
   ========================================================== */
const SP_VOX = {
  "悠真":{en:"warm mid-range male lead vocal, calm and steady, band leader on keys", jp:"落ち着いた中音域の男性ボーカル、キーボード担当"},
  "結衣":{en:"bright clear female lead vocal, agile and emotive, main vocalist", jp:"澄んだ高音の女性メインボーカル"},
  "葵":{en:"husky male vocal with edge, guitar-driven delivery", jp:"かすれ気味で芯のある男性ボーカル、ギター担当"},
  "蓮":{en:"soft male harmony vocal, airy backing lines", jp:"やわらかい男性ハーモニー、コーラス担当"},
  "美琴":{en:"enka-style female vocal, deep vibrato and kobushi ornamentation", jp:"演歌調の女性ボーカル、深いビブラートとこぶし"},
  "大地":{en:"low male backing shouts and chants, drummer", jp:"低音の掛け声とコーラス、ドラム担当"}
};
const SP_GENRE = {
  "アイドルポップ":{en:"Japanese idol pop, J-pop, upbeat group vocals", inst:"electric guitar, bass, drums, bright synth keys"},
  "バンドロック":{en:"Japanese rock band, J-rock, driving guitars", inst:"distorted electric guitar, bass, live drums"},
  "バラード":{en:"Japanese pop ballad, emotional and spacious", inst:"grand piano, strings, soft bass, brushed drums"},
  "夏ソング":{en:"summer J-pop, bright and breezy", inst:"acoustic guitar, bass, drums, marimba, hand claps"},
  "冬ソング":{en:"winter J-pop, warm and intimate", inst:"piano, strings, glockenspiel, soft bass"},
  "卒業ソング":{en:"Japanese graduation song, nostalgic and uplifting", inst:"piano, acoustic guitar, strings, drums"},
  "オーケストラポップ":{en:"orchestral J-pop, cinematic arrangement", inst:"full string section, brass, timpani, harp, piano"},
  "マンドリンアンサンブル":{en:"mandolin ensemble pop, tremolo-driven", inst:"mandolin, mandola, mandocello, contrabass"},
  "演歌":{en:"enka, traditional Japanese ballad", inst:"shakuhachi-like flute, strings, mandolin tremolo, upright bass"},
  "シティポップ":{en:"Japanese city pop, 80s groove", inst:"electric piano, slap bass, clean guitar, gated drums"},
  "映画音楽":{en:"cinematic score with vocals, epic build", inst:"strings, horns, choir, timpani, piano"},
  "ライブアンセム":{en:"live anthem J-pop, stadium energy, crowd chants", inst:"electric guitar, bass, drums, brass stabs, synth"}
};
const SP_MOOD = {"疾走":"driving, energetic, forward-moving","やさしい":"gentle, warm, tender",
  "壮大":"grand, sweeping, cinematic","切ない":"bittersweet, wistful, melancholic","祝祭":"celebratory, festive, triumphant"};
const SP_SIZE = {solo:1,duet:2,trio:3,fourth:4,all:6};
const SP_SIZE_JP = {solo:"ソロ",duet:"デュエット",trio:"トリオ",fourth:"フォース",all:"全員"};

const SP = { members:["結衣","悠真"], mode:"duet", lyrics:"", titles:[] };

/* ---------- 語彙バンク（歌詞・タイトルの下書き生成用） ---------- */
const W = {
  n1:["夕暮れ","改札","坂道","教室","屋上","交差点","潮風","制服","花火","星屑","白い息","蝉時雨",
      "放課後","傘の中","終電","窓辺","運動場","桜並木","真夜中","朝焼け","河川敷","自転車","踏切","体育館"],
  n2:["約束","合図","足音","名前","背中","手のひら","まなざし","季節","歌","地図","願い","涙",
      "記憶","言葉","鼓動","横顔","つづき","答え"],
  vA:["こぼれ落ちる","ほどけていく","響いて消えた","光っていた","溶けていく","揺れている","にじんでいく","遠ざかる"],
  vB:["歩いていく","駆け出した","手を振った","立ち止まった","目を閉じた","うつむいた","走り出す","呼んでいる","振り返った"],
  adj:["まぶしい","小さな","確かな","遠い","あたたかい","静かな","新しい","やわらかい","はじめての"],
  hook:["君と","二人で","もう一度","この街で","いつまでも","何度でも","ここから"],
  en:["we run through the light","hold on to this moment","never let it fade",
      "one more time with you","the summer never ends","say it out loud tonight"]
};

let _lastT=-1,_lastN="";
function spLine(theme,words){
  const kw=()=>words.length?pick(words):pick(W.n1);
  const t=[
    ()=>`${pick(W.n1)}の${pick(W.n2)}が ${pick(W.vA)}`,
    ()=>`${pick(W.adj)}${pick(W.n2)}が ${pick(W.vA)}`,
    ()=>`${pick(W.n1)}で ${pick(W.hook)}${pick(W.vB)}`,
    ()=>`${kw()}の向こうで ${pick(W.vB)}`,
    ()=>`${theme?theme+"の":""}${pick(W.n2)}が ${pick(W.vA)}`,
    ()=>`${pick(W.n1)} ${pick(W.adj)}${pick(W.n2)}`,
    ()=>`${pick(W.hook)}${pick(W.vB)} ${kw()}のそばで`
  ];
  let i=Math.floor(Math.random()*t.length);
  if(i===_lastT) i=(i+1+Math.floor(Math.random()*(t.length-1)))%t.length;
  _lastT=i;
  let line=t[i]();
  for(let k=0;k<3&&_lastN&&line.indexOf(_lastN)===0;k++) line=t[i]();
  _lastN=line.slice(0,3);
  return line;
}
function spHook(theme,words,lang){
  if(lang==="en") return pick(W.en);
  const kw=words.length?pick(words):pick(W.n1);
  return pick([
    `${pick(W.hook)}${pick(W.vB)}`,
    `${theme||pick(W.n2)}は ${pick(W.adj)}まま`,
    `${kw}が ${pick(W.vA)}`,
    `${pick(W.hook)}${pick(W.adj)}${pick(W.n2)}を`
  ]);
}
function spTitles(theme,words){
  const out=new Set();
  while(out.size<5){
    out.add(pick([
      `${pick(W.n1)}の${pick(W.n2)}`,
      `${pick(W.adj)}${pick(W.n2)}`,
      `${theme||pick(W.n2)}のかけら`,
      `${words.length?pick(words):pick(W.n1)}まで`,
      `${pick(W.hook)}${pick(W.n2)}を`
    ]));
  }
  return [...out];
}

/* ---------- 構成 ---------- */
const SP_FORM = {
  std:[["Intro",0],["Verse 1",4],["Pre-Chorus",2],["Chorus",4],["Verse 2",4],["Pre-Chorus",2],["Chorus",4],["Bridge",3],["Final Chorus",4],["Outro",1]],
  short:[["Intro",0],["Verse 1",3],["Chorus",4],["Outro",1]],
  ballad:[["Intro",0],["Verse 1",4],["Chorus",4],["Verse 2",4],["Bridge",3],["Final Chorus",5],["Outro",2]],
  live:[["Intro",0],["Call and Response",2],["Verse 1",4],["Pre-Chorus",2],["Chorus",4],["Call and Response",2],["Final Chorus",4],["Outro",1]]
};

/* ---------- 生成 ---------- */
function spBuildLyrics(){
  const theme=$("#sp-theme").value.trim();
  const words=$("#sp-words").value.split(/[,、\s]+/).map(s=>s.trim()).filter(Boolean);
  const lang=$("#sp-lang").value, form=SP_FORM[$("#sp-form").value];
  const mem=SP.members.length?SP.members:["結衣"];
  const all=mem.join(" & ");
  const hook=spHook(theme,words,lang==="en"?"en":"ja");
  const out=[];
  let vi=0;
  form.forEach(([name,lines])=>{
    if(lines===0){ out.push(`[${name}]`,""); return; }
    let who;
    if(/^(Chorus|Final Chorus|Call)/.test(name)) who=all;
    else if(name==="Pre-Chorus") who=mem.slice(0,Math.min(2,mem.length)).join(" & ");
    else if(name==="Bridge") who=mem[mem.length-1];
    else { who=mem[vi%mem.length]; vi++; }
    out.push(`[${name}: ${who}]`);
    if(name==="Call and Response"){
      out.push(`（${mem[0]}）${spLine(theme,words)}`);
      out.push(`（${all}）オー オー オー`);
      out.push("");
      return;
    }
    for(let i=0;i<lines;i++){
      const isChorus=/^(Chorus|Final Chorus)/.test(name);
      if(isChorus&&i===0){ out.push(hook); continue; }
      if(isChorus&&lang==="mix"&&i===lines-1){ out.push(pick(W.en)); continue; }
      out.push(spLine(theme,words));
    }
    out.push("");
  });
  return out.join("\n").trim();
}
function spBuild(regenLyricsOnly){
  const g=$("#sp-genre").value, gi=SP_GENRE[g];
  const mood=$("#sp-mood").value, lang=$("#sp-lang").value;
  const bpm=$("#sp-bpm").value, key=KEYS[parseInt($("#sp-key").value,10)];
  const scale=$("#sp-scale").value==="major"?"major":"minor";
  const meter=$("#sp-meter").value, mem=SP.members.length?SP.members:["結衣"];
  const theme=$("#sp-theme").value.trim();
  const words=$("#sp-words").value.split(/[,、\s]+/).map(s=>s.trim()).filter(Boolean);

  SP.lyrics=spBuildLyrics();
  $("#sp-lyrics").textContent=SP.lyrics;
  if(regenLyricsOnly) return;

  const langEn={ja:"Japanese lyrics",mix:"Japanese lyrics with English hook",en:"English lyrics"}[lang];
  const voxEn=mem.map(n=>SP_VOX[n].en).join("; ");
  const ens={1:"solo vocal",2:"male-female duet, alternating lines",3:"three-part vocal trio",
    4:"four-part vocal arrangement",6:"six-member group with layered unison chorus"}[mem.length]||"group vocal";

  $("#sp-style").textContent=[
    gi.en, mood?SP_MOOD[mood]:"", langEn, ens,
    gi.inst, `${bpm} BPM`, `key of ${key} ${scale}`, `${meter} time`,
    "clean modern production, wide stereo chorus, radio-ready mix"
  ].filter(Boolean).join(", ");

  $("#sp-dd").textContent=[
    "=== DayDream＋ SONG BRIEF ===",
    `Project : DayDream Plus (DayDream＋) original song`,
    `Title   : ${$("#sp-title").value.trim()||"(未定 / タイトル案から選択)"}`,
    `Theme   : ${theme||"(未設定)"}${words.length?" / keywords: "+words.join(", "):""}`,
    `Genre   : ${g} — ${gi.en}`,
    `Mood    : ${mood} — ${SP_MOOD[mood]}`,
    `Tempo   : ${bpm} BPM / ${meter} / key of ${key} ${scale}`,
    `Language: ${langEn}`,
    "",
    `Vocal formation : ${SP_SIZE_JP[SP.mode]}（${mem.length}名）`,
    ...mem.map((n,i)=>`  ${i===0?"Lead ":"Sub  "}${n}（${MEMBERS[n].role}） : ${SP_VOX[n].jp} / ${SP_VOX[n].en}`),
    "",
    `Arrangement : ${gi.inst}`,
    "Chorus      : layered unison by all selected members, wide stereo double-track",
    "Structure   : "+SP_FORM[$("#sp-form").value].map(f=>f[0]).join(" → "),
    "Production  : clean modern J-pop mix, vocals forward, no clipping",
    "",
    "※ 実在のメンバー本人の声は再現されません。声質の方向づけとして指定しています。"
  ].join("\n");

  const neg=$("#sp-neg").value.trim();
  $("#sp-exclude").textContent=[neg,"lo-fi, muddy mix, off-key vocals, excessive autotune, distorted clipping"]
    .filter(Boolean).join(", ");

  SP.titles=spTitles(theme,words);
  const h=$("#sp-titles"); h.innerHTML="";
  SP.titles.forEach(t=>{
    const b=document.createElement("button"); b.textContent=t;
    b.onclick=()=>{ $("#sp-title").value=t; spBuild(); toast("曲名に入れました"); };
    h.appendChild(b);
  });
}

/* ---------- UI 配線 ---------- */
(function spInit(){
  const g=$("#sp-genre");
  Object.keys(SP_GENRE).forEach(n=>{const o=document.createElement("option");o.textContent=n;g.appendChild(o);});
  const k=$("#sp-key"); KEYS.forEach((n,i)=>{const o=document.createElement("option");o.value=i;o.textContent=n;k.appendChild(o);});
  k.value=0;
  $("#sp-bpm").oninput=e=>$("#sp-vbpm").textContent=e.target.value;

  const mc=$("#sp-members");
  Object.entries(MEMBERS).forEach(([name,m])=>{
    const b=document.createElement("button"); b.className="chip m"; b.dataset.name=name; b.title=m.role;
    b.innerHTML=`<span class="dot" style="background:${m.color}"></span>${name}`;
    b.onclick=()=>{
      const max=SP_SIZE[SP.mode], i=SP.members.indexOf(name);
      if(i>=0){ if(SP.members.length>1) SP.members.splice(i,1); }
      else { SP.members.push(name); while(SP.members.length>max) SP.members.shift(); }
      spSync();
    };
    mc.appendChild(b);
  });
  $("#sp-mode").onchange=()=>{
    SP.mode=$("#sp-mode").value;
    const max=SP_SIZE[SP.mode];
    if(SP.mode==="all") SP.members=Object.keys(MEMBERS);
    while(SP.members.length>max) SP.members.pop();
    const order=["結衣","悠真","葵","蓮","美琴","大地"];
    for(const n of order){ if(SP.members.length>=max) break; if(!SP.members.includes(n)) SP.members.push(n); }
    spSync();
  };
  $("#sp-gen").onclick=()=>{ spBuild(); toast("プロンプトを作りました"); };
  $("#sp-re").onclick=()=>{ spBuild(true); toast("歌詞を作り直しました"); };
  $("#sp-rand").onclick=()=>{
    $("#sp-theme").value=pick(["夏の終わり","旅立ち","約束","再会","始まりの朝","放課後"]);
    $("#sp-words").value=pick(["改札, 花火","坂道, 白い息","屋上, 星屑","潮風, 制服"]);
    $("#sp-genre").selectedIndex=Math.floor(Math.random()*Object.keys(SP_GENRE).length);
    $("#sp-bpm").value=Math.round(rnd(70,175)); $("#sp-vbpm").textContent=$("#sp-bpm").value;
    $("#sp-key").value=Math.floor(Math.random()*12);
    spBuild(); toast("おまかせで作りました");
  };
  $$("[data-copy]").forEach(b=>b.onclick=()=>{
    const el=$(b.dataset.copy), txt=el.textContent;
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast("コピーしました"),()=>toast("選択してコピーしてください"));
    else toast("選択してコピーしてください");
  });
  spSync();
})();
function spSync(){
  $$("#sp-members .chip").forEach(b=>b.classList.toggle("on",SP.members.includes(b.dataset.name)));
  $("#sp-cnt").textContent=SP.members.length+" / "+SP_SIZE[SP.mode]+" 選択中";
}

/* ==========================================================
   Phase 3 : AI アシスト（/api/ai 経由で Groq / Gemini / OpenAI）
   APIキーはブラウザに置かず、サーバー側の環境変数から使います。
   ========================================================== */
const AI = { ready:false, providers:[], busy:false };

async function aiPing(){
  const set=(txt)=>{ const a=$("#ai-state"), b=$("#set-ai-state"); if(a)a.textContent=txt; if(b)b.textContent=txt; };
  if(location.protocol==="file:"){
    AI.ready=false; set("ローカルでは使えません（Vercelに上げると動きます）");
    $("#ai-hint").textContent="index.html を直接開いた状態では AI 機能は呼べません。下書き生成はそのまま使えます。";
    return;
  }
  try{
    const r=await fetch("/api/ai",{cache:"no-store"});
    const d=await r.json();
    AI.providers=d.providers||[]; AI.ready=AI.providers.length>0;
    set(AI.ready?("接続あり： "+AI.providers.join(" / ")):"APIキー未設定（下書き生成のみ）");
    $("#ai-hint").textContent=AI.ready
      ? "文章の生成はサーバー経由です。押してから数秒かかります。"
      : "Vercel の Environment Variables に GROQ_API_KEY などを入れると使えるようになります。";
  }catch(e){
    AI.ready=false; set("APIに繋がりません（下書き生成のみ）");
    $("#ai-hint").textContent="/api/ai が見つかりません。api フォルダごとデプロイされているか確認してください。";
  }
}
function aiPayload(){
  const mem=SP.members.length?SP.members:["結衣"];
  return {
    title:$("#sp-title").value.trim(), theme:$("#sp-theme").value.trim(),
    words:$("#sp-words").value.split(/[,、\s]+/).map(s=>s.trim()).filter(Boolean),
    genre:$("#sp-genre").value, mood:$("#sp-mood").value, lang:$("#sp-lang").value,
    bpm:$("#sp-bpm").value, key:KEYS[parseInt($("#sp-key").value,10)]+" "+$("#sp-scale").value,
    meter:$("#sp-meter").value, formation:SP_SIZE_JP[SP.mode], members:mem,
    structure:SP_FORM[$("#sp-form").value].map(f=>f[0]),
    lyrics:$("#sp-lyrics").textContent, style:$("#sp-style").textContent,
    negative:$("#sp-neg").value.trim()
  };
}
async function aiCall(task,extra){
  if(AI.busy) return null;
  if(!AI.ready){ toast("AIが未接続です。設定画面の説明を確認してください"); return null; }
  AI.busy=true;
  const card=$("#ai-lyrics").closest(".card"); card.classList.add("aibusy");
  const hint=$("#ai-hint"), t0=Date.now();
  const tick=setInterval(()=>{ hint.textContent="AIが考えています… "+((Date.now()-t0)/1000).toFixed(1)+" 秒"; },100);
  try{
    const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({task,provider:$("#ai-provider").value||undefined,
        payload:Object.assign(aiPayload(),extra||{})})});
    const d=await r.json();
    if(!d.ok) throw new Error(d.error||"失敗しました");
    hint.textContent=`${d.provider} / ${d.model} で生成（${((Date.now()-t0)/1000).toFixed(1)}秒）`;
    return d;
  }catch(e){
    hint.textContent="失敗しました： "+String(e.message||e).slice(0,180);
    toast("AIの呼び出しに失敗しました");
    return null;
  }finally{
    clearInterval(tick); AI.busy=false; card.classList.remove("aibusy");
  }
}
function aiBind(){
  const on=(id,fn)=>{ const b=$(id); if(b) b.onclick=fn; };
  on("#ai-lyrics",async()=>{
    const d=await aiCall("lyrics"); if(!d)return;
    SP.lyrics=d.text; $("#sp-lyrics").textContent=d.text; toast("AIが歌詞を書きました");
  });
  on("#ai-polish",async()=>{
    if(!$("#sp-lyrics").textContent.trim()||$("#sp-lyrics").textContent==="—"){ toast("先に歌詞を作ってください"); return; }
    const d=await aiCall("polish"); if(!d)return;
    SP.lyrics=d.text; $("#sp-lyrics").textContent=d.text; toast("歌詞を推敲しました");
  });
  on("#ai-yomi",async()=>{
    if(!$("#sp-lyrics").textContent.trim()||$("#sp-lyrics").textContent==="—"){ toast("先に歌詞を作ってください"); return; }
    const d=await aiCall("yomi"); if(!d)return;
    $("#sp-lyrics").textContent=d.text; toast("よみがなを付けました");
  });
  on("#ai-titles",async()=>{
    const d=await aiCall("titles"); if(!d)return;
    const list=(d.data&&d.data.titles)||d.text.split("\n").map(s=>s.replace(/^[-・\d.\s"]+|"$/g,"").trim()).filter(Boolean);
    const h=$("#sp-titles"); h.innerHTML="";
    list.slice(0,8).forEach(t=>{
      const b=document.createElement("button"); b.textContent=t;
      b.onclick=()=>{ $("#sp-title").value=t; toast("曲名に入れました"); };
      h.appendChild(b);
    });
    toast("タイトル案を作りました");
  });
  on("#ai-style",async()=>{
    const d=await aiCall("style"); if(!d)return;
    $("#sp-style").textContent=d.text.replace(/^["'\s]+|["'\s]+$/g,""); toast("スタイル文を整えました");
  });
  on("#ai-review",async()=>{
    const d=await aiCall("review"); if(!d)return;
    const h=$("#ai-reviews"); h.innerHTML="";
    const list=(d.data&&d.data.reviews)||[];
    if(!list.length){ const p=document.createElement("div"); p.className="rv"; p.innerHTML="<p>"+d.text+"</p>"; h.appendChild(p); }
    else list.forEach(r=>{
      const el=document.createElement("div"); el.className="rv";
      el.innerHTML=`<b>${r.name||""}</b><small>${r.role||""}</small><p>${r.comment||""}</p>`;
      h.appendChild(el);
    });
    $("#ai-rvmeta").textContent=d.provider+" / "+d.model;
    toast("レビューが届きました");
  });
  const chk=$("#set-ai-check"); if(chk) chk.onclick=()=>{ aiPing(); toast("接続を確認しました"); };
}
aiBind(); aiPing();
