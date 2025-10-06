// MorrGolf Neo — clean & modern dark UI

if ("serviceWorker" in navigator) { window.addEventListener("load", ()=> navigator.serviceWorker.register("sw.js").catch(()=>{})); }

const $=(s,e=document)=>e.querySelector(s);
function el(t,a={},...k){const n=document.createElement(t);for(const x in a){const v=a[x];if(x==="class")n.className=v;else if(x.startsWith("on")&&typeof v==="function")n.addEventListener(x.slice(2),v);else if(x==="html")n.innerHTML=v;else n.setAttribute(x,v);}k.forEach(c=>n.append(c));return n;}
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));}};

// Workout plan Mon–Fri
const PLAN=[
  {dayKey:"Mon",title:"Mobility + Core + Rotation",items:[
    {name:"Cat-Cow",group:"core",target:12},{name:"Band Pull-Aparts",group:"upper",target:15},
    {name:"Torso Rotations",group:"core",target:12},{name:"Glute Bridge March",group:"lower",target:12},
    {name:"Dead Bug",group:"core",target:12},{name:"Anti-Rotation Press",group:"core",target:10}
  ]},
  {dayKey:"Tue",title:"Power + Lower Body",items:[
    {name:"Goblet Squat",group:"lower",target:10},{name:"Chop Pulls Low→High",group:"core",target:10},
    {name:"Band Deadlifts",group:"lower",target:10},{name:"Fast Swing Reps",group:"core",target:12}
  ]},
  {dayKey:"Wed",title:"Mobility + Core (Recovery)",items:[
    {name:"World's Greatest Stretch",group:"full",target:8},{name:"Thread the Needle",group:"upper",target:10},
    {name:"Hamstring Band Stretch",group:"lower",target:8},{name:"Bird Dogs",group:"core",target:12}
  ]},
  {dayKey:"Thu",title:"Strength + Rotation Power",items:[
    {name:"RDL",group:"lower",target:10},{name:"Push-Ups",group:"upper",target:12},
    {name:"Band Chop High→Low",group:"core",target:10},{name:"1‑Arm Row",group:"upper",target:10}
  ]},
  {dayKey:"Fri",title:"Conditioning + Flexibility",items:[
    {name:"Zone 2 Cardio",group:"cardio",target:20},{name:"Jacks",group:"cardio",target:30},
    {name:"Mountain Climbers",group:"cardio",target:20},{name:"Band Punch-Outs",group:"upper",target:12}
  ]}
];

// Rotating inspirational Bible verses (ESV-style paraphrases)
// Appears on Home and in Verses view; picked deterministically by date.
const VERSES=[
  {ref:"Proverbs 3:5–6", text:"Trust in the LORD with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths."},
  {ref:"Philippians 4:13", text:"I can do all things through him who strengthens me."},
  {ref:"Isaiah 40:31", text:"They who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint."},
  {ref:"Joshua 1:9", text:"Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go."},
  {ref:"Psalm 23:1–3", text:"The LORD is my shepherd; I shall not want… He restores my soul. He leads me in paths of righteousness for his name’s sake."},
  {ref:"Romans 8:31", text:"If God is for us, who can be against us?"},
  {ref:"Hebrews 12:1–2", text:"Let us run with endurance the race set before us, looking to Jesus, the founder and perfecter of our faith."},
  {ref:"Colossians 3:23", text:"Whatever you do, work heartily, as for the Lord and not for men."},
  {ref:"Psalm 27:1", text:"The LORD is my light and my salvation; whom shall I fear? The LORD is the stronghold of my life; of whom shall I be afraid?"},
  {ref:"2 Timothy 1:7", text:"God gave us a spirit not of fear but of power and love and self-control."}
];
function todayVerse(){
  const d=new Date(); const key=d.getFullYear()*1000 + d.getMonth()*50 + d.getDate();
  const i = key % VERSES.length; return VERSES[i];
}

const OPTIONAL_CARDIO=[
  {name:"Zone 2 Walk • 20 min",met:3.0,mins:20},
  {name:"Stationary Bike • 15 min",met:6.0,mins:15},
  {name:"Row (easy) • 12 min",met:5.0,mins:12},
  {name:"Jump Rope • 10 min",met:9.0,mins:10},
];
const EX_MET={core:4.0,upper:5.0,lower:6.0,cardio:7.0,full:4.5};
const poundsToKg = lb=>lb*0.45359237;
const kcalFor = (met, minutes, lb)=>Math.round((met*3.5*poundsToKg(lb)/200)*minutes);

let TAB=store.get("TAB","Home");
let history=store.get("HISTORY", PLAN.map(()=>({completed:false})));
let historyLog=store.get("HISTORY_LOG",[]);
let weight=store.get("WEIGHT_LB",190);
let hue=store.get("HUE",182);
let inkL=store.get("INKL",94);
let dowMap=store.get("DOWMAP",{0:null,1:0,2:1,3:2,4:3,5:4,6:null}); // Sun..Sat → plan index or null

function applyTheme(){ document.documentElement.style.setProperty("--hue",String(hue)); document.documentElement.style.setProperty("--inkL", String(inkL)+'%'); }
applyTheme();
function saveAll(){ store.set("TAB",TAB); store.set("HISTORY",history); store.set("HISTORY_LOG",historyLog); store.set("WEIGHT_LB",weight); store.set("HUE",hue); store.set("INKL",inkL); store.set("DOWMAP",dowMap); }

// Stopwatch
let swStart=0, swElapsed=0, swId=null;
function swRender(){ const t=$("#clock"); if(!t) return; const ms=(swId?Date.now()-swStart:0)+swElapsed; const s=Math.floor(ms/1000); const m=Math.floor(s/60), ss=String(s%60).padStart(2,'0'); t.textContent=String(m).padStart(2,'0')+':'+ss; }
function swStartFn(){ if(swId) return; swStart=Date.now(); swId=setInterval(swRender,250); }
function swPauseFn(){ if(!swId) return; clearInterval(swId); swId=null; swElapsed += Date.now()-swStart; swRender(); }
function swResetFn(){ if(swId){ clearInterval(swId); swId=null; } swStart=0; swElapsed=0; swRender(); }

function getTodayPlanIndex(){ const d=(new Date()).getDay(); const i=dowMap[d]; return (i in {0:1,1:1,2:1,3:1,4:1}) ? i : null; }
function adaptTarget(prev, performed, failure){ if(failure && performed < Math.ceil(prev*0.7)) return Math.max(6, prev-2); if(performed >= prev+3) return Math.min(25, prev+2); if(!failure && performed >= prev) return Math.min(25, prev+1); return prev; }

// Views
function HomeView(){
  const v=el("div",{});
  const idx=getTodayPlanIndex();
  if(idx===null){
    v.append(el("div",{class:"card"}, el("div",{class:"title"},"Chill Day"), el("div",{class:"small"},"Light mobility, walk, or putting.")));
  } else {
    const plan=PLAN[idx];
    const card=el("div",{class:"card"});
    card.append(el("div",{class:"small"},"TODAY"), el("div",{class:"title"}, plan.dayKey+" — "+plan.title));
    // exercise list preview
    plan.items.forEach((it,i)=>{
      const row=el("div",{class:"ex"});
      row.append(el("div",{class:"thumb"}, document.createTextNode(String(i+1))));
      const col=el("div",{class:"col"}); col.append(el("div",{class:"title"}, it.name)); col.append(el("div",{class:"small"}, "Target "+it.target+" • "+it.group)); row.append(col); card.append(row);
    });
    const open=el("button",{class:"btn primary", onclick:()=>{ TAB="Train"; saveAll(); render(); }}, "Open Full Workout");
    card.append(el("div",{style:"margin-top:8px"}, open));
    v.append(card);
// Verse of the day
const vcard=el("div",{class:"card"}); const vv=todayVerse();
vcard.append(el("div",{class:"small"},"VERSE OF THE DAY"), el("div",{class:"title"}, vv.ref), el("div",{class:"small"}, vv.text));
v.append(vcard);
    // cardio chips
    const chipCard=el("div",{class:"card"}, el("div",{class:"small"},"OPTIONAL CARDIO"));
    const chips=el("div",{class:"chips"}); OPTIONAL_CARDIO.forEach(c=> chips.append(el("div",{class:"chip"}, c.name))); chipCard.append(chips); v.append(chipCard);
  }
  // weekly quick
  const completed=history.filter(h=>h.completed).length; v.append(el("div",{class:"card"}, el("div",{class:"title"},"This Week"), el("div",{class:"small"}, `${completed} / 5 complete`)));
  return v;
}

function TrainView(){
  const grid=el("div",{});
  PLAN.forEach((p,i)=>{
    const c=el("div",{class:"card"});
    c.append(el("div",{class:"small"}, p.dayKey), el("div",{class:"title"}, p.title));
    p.items.forEach((it,ix)=>{
      const row=el("div",{class:"ex"});
      row.append(el("div",{class:"thumb"}, document.createTextNode(String(ix+1))));
      const col=el("div",{class:"col"});
      const key=p.dayKey+"-"+it.name; const rec=store.get("REC-"+key,{target:it.target});
      col.append(el("div",{class:"title"}, it.name));
      col.append(el("div",{class:"small"}, "Target "+rec.target+" • "+it.group));
      const reps=el("input",{class:"input",type:"number",placeholder:"Reps done"});
      const fail=document.createElement("input"); fail.type="checkbox";
      const save=el("button",{class:"btn primary", onclick:()=>{
        const performed=parseInt(reps.value||"0",10);
        const next=adaptTarget(rec.target, performed, fail.checked);
        store.set("REC-"+key,{target:next});
        const mins=Math.max(0.5,(performed||rec.target)/24);
        const kcal=kcalFor(EX_MET[it.group]||4.5, mins, weight);
        historyLog.unshift({at:new Date().toISOString(), name:it.name, group:it.group, performed, failure:fail.checked, nextTarget:next, kcal});
        historyLog=historyLog.slice(0,200);
        saveAll(); alert(it.name+" saved • next "+next+" • ~"+kcal+" kcal");
      }}, "Save");
      const line=el("div",{class:"row"}); line.append(reps, save, el("label",{}, fail, document.createTextNode(" Failure?")));
      col.append(line); row.append(col); c.append(row);
    });
    const mk=el("input"); mk.type="checkbox"; mk.checked=!!history[i]&&!!history[i].completed;
    mk.addEventListener("change",()=>{ history[i]={completed:mk.checked}; saveAll(); render(); });
    c.append(el("label",{}, mk, document.createTextNode(" Mark day complete")));
    grid.append(c);
  });
  return grid;
}

function TimerView(){
  let work=45, rest=30, rounds=3, state="idle", time=work, round=1, id=null;
  const card=el("div",{class:"card"}, el("div",{class:"title"},"Interval Timer"));
  const row=el("div",{class:"row"});
  const w=el("input",{class:"input",type:"number",value:String(work)});
  const r=el("input",{class:"input",type:"number",value:String(rest)});
  const n=el("input",{class:"input",type:"number",value:String(rounds)});
  w.addEventListener("input",()=>{ work=parseInt(w.value,10)||0; if(state==="idle"){ time=work; t.textContent=time+'s'; }});
  r.addEventListener("input",()=>{ rest=parseInt(r.value,10)||0; });
  n.addEventListener("input",()=>{ rounds=parseInt(n.value,10)||1; });
  row.append(el("div",{class:"col"}, el("div",{class:"small"},"Work (sec)"), w),
             el("div",{class:"col"}, el("div",{class:"small"},"Rest (sec)"), r),
             el("div",{class:"col"}, el("div",{class:"small"},"Rounds"), n));
  card.append(row);
  const trow=el("div",{class:"row",style:"margin-top:12px"});
  const t=el("div",{class:"title"}, time+'s'); const s=el("div",{class:"small"}, "State: "+state+" • Round "+round+" / "+rounds);
  trow.append(t,s); card.append(trow);
  const Sound=(()=>{ let ctx; function ensure(){ if(!ctx){ ctx=new (window.AudioContext||window.webkitAudioContext)(); } if(ctx.state==="suspended") ctx.resume(); return ctx; } function tone(f=880,d=0.12,v=0.03){ const c=ensure(),o=c.createOscillator(),g=c.createGain(); o.frequency.value=f; g.gain.value=v; o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+d); } function countdown(){ [600,520,440].forEach((f,i)=>setTimeout(()=>tone(f,0.12,0.05),i*400)); } function startCue(){ tone(820,0.12,0.06); setTimeout(()=>tone(1200,0.1,0.05),100);} function nearEnd(){ tone(700,0.08,0.045);} return {ensure,tone,countdown,startCue,nearEnd};})();
  function upd(){ t.textContent=(state==='done'?'Done!':(time+'s')); s.textContent="State: "+state+" • Round "+Math.min(round,rounds)+" / "+rounds; }
  function start(){ Sound.ensure(); Sound.countdown(); setTimeout(()=>{ round=1; state='work'; time=work; upd(); Sound.startCue(); if(id) clearInterval(id); id=setInterval(()=>{ time--; if(time===5) Sound.nearEnd(); if(time<0){ if(state==='work'){ state='rest'; time=rest; } else if(state==='rest'){ if(round<rounds){ round++; state='work'; time=work; Sound.startCue(); } else { state='done'; clearInterval(id); id=null; } } } upd(); },1000); },1200); }
  function reset(){ if(id){ clearInterval(id); id=null; } state='idle'; time=work; round=1; upd(); }
  card.append(el("div",{class:"row",style:"margin-top:12px"}, el("button",{class:"btn primary",onclick:start},"Start"), el("button",{class:"btn",onclick:reset},"Reset")));
  return card;
}

function SettingsView(){
  const card=el("div",{class:"card"}, el("div",{class:"title"},"Settings"));
  const wRow=el("div",{class:"row"}); const w=el("input",{class:"input",type:"number",value:String(weight)});
  w.addEventListener("input",()=>{ weight=parseInt(w.value||'0',10)||190; saveAll(); });
  wRow.append(el("div",{class:"col"}, el("div",{class:"small"},"Body Weight (lb)"), w)); card.append(wRow);
  // sliders in drawer
  card.append(el("div",{class:"small"},"Accent & text sliders are in the menu drawer (bottom)."));
  card.append(el("hr"));
  const map=el("div",{class:"row"}); const col=el("div",{class:"col"});
  col.append(el("div",{class:"small"},"Map Sun..Sat → Plan index (0..4) or blank = Off"));
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach((d,i)=>{
    const inp=el("input",{class:"input",type:"text",placeholder:"Off or 0..4", value:(dowMap[i]===null?'':String(dowMap[i]))});
    inp.addEventListener("input",()=>{ const val=inp.value.trim(); if(val===''){ dowMap[i]=null; } else { const num=parseInt(val,10); dowMap[i]=(isNaN(num)||num<0||num>4)?null:num; } saveAll(); });
    col.append(el("div",{}, el("div",{class:"small"},d), inp));
  });
  map.append(col); card.append(map);
  card.append(el("hr"));
  const reset=el("button",{class:"btn",onclick:()=>{ history=PLAN.map(()=>({completed:false})); historyLog=[]; saveAll(); render(); }},"Reset All Data");
  card.append(reset);
  return card;
}

// Navigation & rendering
let TAB_ORDER=["Home","Train","Timer","Progress","Settings","Verses"];
function openDrawer(){ const d=$("#drawer"), s=$("#scrim"); if(d) d.classList.add("open"); if(s) s.hidden=false; }
function closeDrawer(){ const d=$("#drawer"), s=$("#scrim"); if(d) d.classList.remove("open"); if(s) s.hidden=true; }
function renderDrawer(){ const nav=$("#drawerNav"); if(!nav) return; nav.innerHTML=""; TAB_ORDER.forEach(key=> nav.append(el("button",{class:"nav-item"+(TAB===key?" active":""), onclick:()=>{ TAB=key; saveAll(); closeDrawer(); render(); }}, el("span",{class:"nav-ico"}, document.createTextNode(key[0])), el("span",{}, document.createTextNode(key)))) ); }
function render(){ const v=$("#view"); if(!v) return; v.innerHTML=""; if(TAB==="Home") v.append(HomeView()); if(TAB==="Train") v.append(TrainView()); if(TAB==="Timer") v.append(TimerView()); if(TAB==="Settings") v.append(SettingsView()); if(TAB==="Progress") v.append(ProgressView()); if(TAB==="Verses") v.append(VersesView()); }

document.addEventListener("DOMContentLoaded",()=>{
  const y=$("#year"); if(y) y.textContent=String(new Date().getFullYear());
  $("#menuBtn")?.addEventListener("click", openDrawer);
  $("#scrim")?.addEventListener("click", closeDrawer);
  // Stopwatch buttons
  const start=$("#swStart"), lap=$("#swLap"), reset=$("#swReset");
  if(start) start.addEventListener("click", ()=>{ if(!swId){ swStartFn(); start.textContent="Pause"; } else { swPauseFn(); start.textContent="Resume"; } });
  if(lap) lap.addEventListener("click", ()=>{});
  if(reset) reset.addEventListener("click", ()=>{ swResetFn(); const s=$("#swStart"); if(s) s.textContent="Start"; });
  // Bottom nav
  document.querySelectorAll(".navbtn").forEach(b=> b.addEventListener("click", ()=>{ TAB=b.dataset.tab; saveAll(); render(); }));
  // Drawer sliders
  const hueInp=$("#hue"); if(hueInp){ hueInp.value=String(hue); hueInp.addEventListener("input",()=>{ hue=parseInt(hueInp.value,10)||182; applyTheme(); saveAll(); }); }
  const inkInp=$("#ink"); if(inkInp){ inkInp.value=String(inkL); inkInp.addEventListener("input",()=>{ inkL=parseInt(inkInp.value,10)||94; applyTheme(); saveAll(); }); }
  swRender(); renderDrawer(); render();
});

// Progress view: streaks, totals, calories, and a simple sparkline
function calcStats(){
  const totalWorkouts = history.filter(h=>h && h.completed).length;
  // Streak: count back from today across Mon-Fri mapping
  let streak=0;
  // Build a shallow log by date for workouts completed (days)
  // Also summarize calories from historyLog
  let calories=0;
  const repsTotal = historyLog.reduce((acc,x)=>{ calories += (x.kcal||0); return acc + (x.performed||0); }, 0);
  // crude streak: if any history entry today, +1; iterate back across previous days having any entry
  const dates = new Set(historyLog.map(x=> new Date(x.at).toDateString()));
  const today = new Date(); for(let i=0;i<30;i++){ const d=new Date(today); d.setDate(today.getDate()-i); if(dates.has(d.toDateString())) streak++; else break; }
  return {totalWorkouts, streak, calories:Math.round(calories), repsTotal};
}

function sparkline(data, width=260, height=48){
  const c=document.createElement('canvas'); c.width=width; c.height=height;
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,width,height);
  if(data.length===0){ ctx.fillStyle='#8894a3'; ctx.fillText('No data yet', 6, height/2); return c; }
  const min=Math.min(...data), max=Math.max(...data); const pad=6;
  const xStep=(width-2*pad)/Math.max(1,data.length-1);
  ctx.strokeStyle='hsla('+hue+',65%,48%,1)'; ctx.lineWidth=2; ctx.beginPath();
  data.forEach((v,i)=>{ const x=pad + i*xStep; const y=height-pad - ((v-min)/(max-min||1))*(height-2*pad); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  return c;
}

function ProgressView(){
  const v=el('div',{});
  const s=calcStats();
  const card=el('div',{class:'card'}, el('div',{class:'title'},'Progress'));
  card.append(el('div',{class:'small'},`Streak: ${s.streak} day(s)`));
  card.append(el('div',{class:'small'},`Completed days: ${s.totalWorkouts} / 5 this week`));
  card.append(el('div',{class:'small'},`Estimated calories: ~${s.calories} kcal`));
  card.append(el('div',{class:'small'},`Total reps logged: ${s.repsTotal}`));
  // build a tiny series from last 20 history entries (performed count)
  const series = historyLog.slice(0,20).reverse().map(x=>x.performed||0);
  const spark = sparkline(series, 320, 60);
  card.append(el('div',{style:'margin-top:8px'}, spark));
  v.append(card);

  // Recent logs
  const h=el('div',{class:'card'}, el('div',{class:'title'},'Recent Logs'));
  const l=el('ul'); if(historyLog.length===0) l.append(el('li',{},'No entries yet.'));
  historyLog.slice(0,12).forEach(x=> l.append(el('li',{}, `${new Date(x.at).toLocaleString()} • ${x.name} • reps ${x.performed}${x.failure?' (failure)':''} • next ${x.nextTarget} • ~${x.kcal} kcal`)));
  h.append(l); v.append(h);
  return v;
}

function VersesView(){
  const v=el('div',{});
  const card=el('div',{class:'card'}, el('div',{class:'title'},'Verses'));
  VERSES.forEach(x=> card.append(el('div',{class:'row'}, el('div',{class:'col'}, el('div',{class:'small'},x.ref), el('div',{}, x.text)))));
  v.append(card); return v;
}
