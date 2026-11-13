const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const key="timeBloomData";
const today=new Date();
let current=new Date(today.getFullYear(),today.getMonth(),1);
let selected=new Date(today.getFullYear(),today.getMonth(),today.getDate());
let data=JSON.parse(localStorage.getItem(key)||"null")||{
 events:[],tasks:[],goals:[],study:[]
};
const save=()=>localStorage.setItem(key,JSON.stringify(data));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const mins=t=>{let[a,b]=t.split(":").map(Number);return a*60+b};
const fmt=m=>`${Math.floor(m/60)}h ${m%60?m%60+"m":""}`.trim();

function seed(){
 if(data.events.length||data.tasks.length||data.goals.length)return;
 const m=iso(today);
 data.events=[
  {date:m,title:"University",category:"🏫 University",start:"09:00",end:"16:00"},
  {date:m,title:"Lab",category:"🔬 Research",start:"17:00",end:"19:00"}
 ];
 data.goals=[
  {title:"English study",category:"🇬🇧 English",target:30,actual:18,period:"monthly"},
  {title:"Chinese study",category:"🇨🇳 Chinese",target:20,actual:10,period:"monthly"}
 ];
 data.tasks=[{title:"University assignment",category:"🏫 University",due:m,estimated:5,spent:2}];
 save();
}
seed();

function renderCalendar(){
 const title=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(current);
 $("#monthTitle").textContent=title;
 const cal=$("#calendar");cal.innerHTML="";
 ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(x=>cal.innerHTML+=`<div class="dow">${x}</div>`);
 const first=new Date(current.getFullYear(),current.getMonth(),1);
 const start=(first.getDay()+6)%7;
 const days=new Date(current.getFullYear(),current.getMonth()+1,0).getDate();
 const prevDays=new Date(current.getFullYear(),current.getMonth(),0).getDate();
 for(let i=0;i<42;i++){
   let d,other=false;
   if(i<start){d=new Date(current.getFullYear(),current.getMonth()-1,prevDays-start+i+1);other=true}
   else if(i>=start+days){d=new Date(current.getFullYear(),current.getMonth()+1,i-start-days+1);other=true}
   else d=new Date(current.getFullYear(),current.getMonth(),i-start+1);
   const date=iso(d), events=data.events.filter(e=>e.date===date);
   const div=document.createElement("div");div.className="day"+(other?" other":"")+(date===iso(selected)?" selected":"");
   div.innerHTML=`<div class="daynum">${d.getDate()}</div>${events.slice(0,2).map(e=>`<div class="event-chip">${e.category.split(" ")[0]} ${e.title}</div>`).join("")}`;
   div.onclick=()=>{selected=d;renderAll()};cal.appendChild(div);
 }
}

function freeSlots(date){
 const dayStart=0, dayEnd=24*60;
 const ev=data.events.filter(e=>e.date===date).map(e=>({s:Math.max(dayStart,mins(e.start)),e:Math.min(dayEnd,mins(e.end))})).sort((a,b)=>a.s-b.s);
 let slots=[],cursor=dayStart;
 for(const x of ev){if(x.s>cursor)slots.push([cursor,x.s]);cursor=Math.max(cursor,x.e)}
 if(cursor<dayEnd)slots.push([cursor,dayEnd]);
 return slots.filter(x=>x[1]>x[0]);
}
function tstr(m){return `${pad(Math.floor(m/60))}:${pad(m%60)}`}

function renderDay(){
 const date=iso(selected);
 $("#selectedDateTitle").textContent=new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"short"}).format(selected);
 const ev=data.events.filter(e=>e.date===date);
 $("#eventsList").innerHTML=ev.length?ev.map(e=>`<div class="item">${e.category} <b>${e.title}</b><br><small>${e.start}–${e.end}</small></div>`).join(""):"<div class='item'>No fixed schedules yet 🌷</div>";
 const slots=freeSlots(date);
 $("#freeTimeList").innerHTML=slots.map(s=>`<div class="item">✨ ${tstr(s[0])}–${tstr(s[1])}</div>`).join("")||"<div class='item'>No free time</div>";
 $("#freeTotal").textContent="Total: "+fmt(slots.reduce((a,s)=>a+s[1]-s[0],0));
}

function taskStatus(t){
 const remaining=Math.max(0,(+t.estimated||0)-(+t.spent||0))*60;
 const due=t.due?new Date(t.due+"T23:59:00"):new Date(current.getFullYear(),current.getMonth()+1,0,23,59);
 let available=0, d=new Date(today); d.setHours(0,0,0,0);
 while(d<=due){available+=freeSlots(iso(d)).reduce((a,s)=>a+s[1]-s[0],0);d.setDate(d.getDate()+1)}
 if(remaining===0)return ["safe","🟢 Completed"];
 if(available>=remaining*2)return ["safe","🟢 Looks achievable"];
 if(available>=remaining)return ["warn","🟡 Possible, but little room"];
 return ["danger","🔴 Not enough free time"];
}

function renderTasks(){
 const list=$("#tasksList");
 if(!data.tasks.length){list.innerHTML="<div class='card'>No tasks yet 🌷</div>";return}
 list.innerHTML=data.tasks.map((t,i)=>{const[s,msg]=taskStatus(t);return `<div class="card"><b>${t.title}</b><p>${t.category} · Due: ${t.due||"No deadline"}</p><div class="progress"><div style="width:${Math.min(100,(t.spent/t.estimated)*100)||0}%"></div></div><p>${t.spent||0}h / ${t.estimated||0}h · ${msg}</p><button class="small-btn" onclick="suggestTask(${i})">💡 Suggest time</button></div>`}).join("");
}

function renderGoals(){
 $("#goalsList").innerHTML=data.goals.length?data.goals.map((g,i)=>`<div class="card"><b>${g.category} ${g.title}</b><p>${g.actual||0} / ${g.target||0} hours</p><div class="progress"><div style="width:${Math.min(100,(g.actual/g.target)*100)||0}%"></div></div><p>${goalMessage(g)}</p></div>`).join(""):"<div class='card'>No goals yet 🌷</div>";
}
function monthFree(){
 let total=0, d=new Date(today);d.setHours(0,0,0,0);
 const end=new Date(current.getFullYear(),current.getMonth()+1,0);
 while(d<=end && d.getMonth()===current.getMonth()){total+=freeSlots(iso(d)).reduce((a,s)=>a+s[1]-s[0],0);d.setDate(d.getDate()+1)}
 return total;
}
function goalMessage(g){
 const rem=Math.max(0,g.target-g.actual)*60;
 const available=monthFree();
 if(rem===0)return "🟢 Goal achieved!";
 if(available>=rem*2)return "🟢 Looks achievable!";
 if(available>=rem)return "🟡 Possible, but plan time soon.";
 return "🔴 Not enough free time at the moment.";
}
function renderTime(){
 const free=monthFree();
 const req=data.tasks.reduce((a,t)=>a+Math.max(0,(+t.estimated||0)-(+t.spent||0))*60,0)+data.goals.reduce((a,g)=>a+Math.max(0,(+g.target||0)-(+g.actual||0))*60,0);
 $("#monthFree").textContent=fmt(free);
 $("#requiredTime").textContent=fmt(req);
 const sugg=$("#suggestions");
 let first=data.tasks.find(t=>taskStatus(t)[0]!=="safe")||data.tasks[0];
 sugg.innerHTML=first?`<div class="suggestion">💡 For <b>${first.title}</b>, try reserving the next available free-time blocks before its deadline.</div>`:"<div class='suggestion'>Add a task and Time Bloom will suggest available time 🌷</div>";
}
function renderInsights(){
 const cats={};
 data.goals.forEach(g=>cats[g.category]=(cats[g.category]||0)+(g.actual||0));
 $("#categoryStats").innerHTML=Object.keys(cats).length?Object.entries(cats).map(([k,v])=>`<div class="item">${k}<b style="float:right">${v}h</b></div>`).join(""):"<p>No study data yet.</p>";
}
function renderAlerts(){
 const items=[];
 data.tasks.forEach(t=>{const[s,msg]=taskStatus(t);items.push(`<div class="alert ${s}"><b>${t.title}</b><br>${msg}</div>`)});
 data.goals.forEach(g=>{const msg=goalMessage(g),cl=msg.includes("🔴")?"danger":msg.includes("🟡")?"warn":"safe";items.push(`<div class="alert ${cl}"><b>${g.title}</b><br>${msg}</div>`)});
 $("#alerts").innerHTML=items.length?items.join(""):"<div class='alert safe'>🌷 Everything looks clear!</div>";
}
function renderAll(){renderCalendar();renderDay();renderTasks();renderGoals();renderTime();renderInsights();renderAlerts()}

function modal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")}

$("#addEvent").onclick=()=>modal(`<h2>➕ Add schedule</h2><form id="eventForm">
<label>Title<input name="title" required placeholder="University / Work / Appointment"></label>
<label>Category<input name="category" value="📅 Other"></label>
<label>Start time<input name="start" type="time" required></label>
<label>End time<input name="end" type="time" required></label>
<button>Add</button></form>`);
$("#addTask").onclick=()=>modal(`<h2>➕ Add task</h2><form id="taskForm">
<label>Task name<input name="title" required></label><label>Category<input name="category" value="🏫 University"></label>
<label>Due date<input name="due" type="date"></label><label>Estimated hours<input name="estimated" type="number" step="0.5" value="1"></label>
<label>Hours already spent<input name="spent" type="number" step="0.5" value="0"></label><button>Add task</button></form>`);
$("#addGoal").onclick=()=>modal(`<h2>➕ Add goal</h2><form id="goalForm">
<label>Goal<input name="title" required placeholder="English study"></label><label>Category<input name="category" value="📚 Study"></label>
<label>Target hours<input name="target" type="number" step="0.5" value="10"></label><label>Actual hours<input name="actual" type="number" step="0.5" value="0"></label><button>Add goal</button></form>`);

document.addEventListener("submit",e=>{
 if(e.target.id==="eventForm"){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));data.events.push({...f,date:iso(selected)});save();$("#modal").classList.add("hidden");renderAll()}
 if(e.target.id==="taskForm"){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.estimated=+f.estimated;f.spent=+f.spent;data.tasks.push(f);save();$("#modal").classList.add("hidden");renderAll()}
 if(e.target.id==="goalForm"){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.target=+f.target;f.actual=+f.actual;f.period="monthly";data.goals.push(f);save();$("#modal").classList.add("hidden");renderAll()}
});

window.suggestTask=i=>{
 const t=data.tasks[i], date=t.due?new Date(t.due+"T23:59:00"):new Date(today.getTime()+7*86400000);
 const need=Math.max(0,(t.estimated-t.spent)*60), options=[];
 let d=new Date(today);d.setHours(0,0,0,0);
 while(d<=date&&options.reduce((a,x)=>a+x.m,0)<need){for(const s of freeSlots(iso(d))){options.push({date:iso(d),start:tstr(s[0]),end:tstr(s[1]),m:s[1]-s[0]});if(options.reduce((a,x)=>a+x.m,0)>=need)break}d.setDate(d.getDate()+1)}
 modal(`<h2>💡 Suggested time</h2><p><b>${t.title}</b> needs about ${fmt(need)}.</p>${options.length?options.map(o=>`<div class="item">${o.date} · ${o.start}–${o.end} (${fmt(o.m)})</div>`).join(""):"<p>⚠️ No sufficient free time found before the deadline.</p>"}`);
};

$("#prevMonth").onclick=()=>{current.setMonth(current.getMonth()-1);renderAll()};
$("#nextMonth").onclick=()=>{current.setMonth(current.getMonth()+1);renderAll()};
$("#todayBtn").onclick=()=>{current=new Date(today.getFullYear(),today.getMonth(),1);selected=new Date(today);renderAll()};
$$("nav button").forEach(b=>b.onclick=()=>{$$(".view").forEach(v=>v.classList.remove("active"));$$("nav button").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.view).classList.add("active");b.classList.add("active");});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
renderAll();
