/* ========= بيانات أساسية + تخزين ========= */
const CLASSES = ["التاسع/1","التاسع/2","التاسع/3","التاسع/4","التاسع/5"];
const STORAGE_KEY = 'leaderboardData_full_final_wheel_timer';
const DEFAULT_AVATAR =
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
       <rect width='100%' height='100%' rx='28' fill='#1e3a8a'/>
       <circle cx='128' cy='108' r='44' fill='#f2f6ff' fill-opacity='0.9'/>
       <rect x='56' y='156' width='144' height='60' rx='22' fill='#f2f6ff' fill-opacity='0.9'/>
     </svg>`
  )}`;

/* إنشاء بيانات افتراضية للصفوف */
function makeDefaultData(){
  const data={};
  CLASSES.forEach(cls=>{
    data[cls]=Array.from({length:40},(_,i)=>({
      id:`${cls}-${i+1}`,
      name:`طالب ${i+1}`,
      points:0,
      medals:0,
      image:DEFAULT_AVATAR
    }));
  });
  return data;
}

function normalizeData(db){
  Object.values(db).forEach(list=>{
    list.forEach(s=>{
      if(typeof s.medals!=='number') s.medals=0;
      if(!s.image) s.image=DEFAULT_AVATAR;
    });
  });
  return db;
}

/* ----- التحميل ----- */
function loadData(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){ return normalizeData(JSON.parse(raw)); }
  }catch(e){}
  return makeDefaultData();
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));

  if (typeof cloudSaveData === "function") {
    try { cloudSaveData(DB); } catch(e){}
  }
}

/* ========== تحميل البيانات عند فتح الصفحة ========== */

let DB = loadData();
let currentClass = CLASSES[0];

/* 👈 إصلاح: تعريف tabs قبل أي استدعاء */
const tabs = document.getElementById('tabs');

/* عرض مبدئي كامل */
renderTabs();
renderList();

/* محاولة جلب نسخة السحابة مرة واحدة */
async function syncFromCloudOnce(){
  if (typeof cloudLoadData !== "function") return;

  try {
    const serverData = await cloudLoadData();
    if (serverData) {
      DB = normalizeData(serverData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
      renderAll();
    } else {
      cloudSaveData(DB);
    }
  } catch (e) {
    console.warn("Cloud sync failed:", e);
  }
}

syncFromCloudOnce();

/* ========= تبويبات الفصول ========= */
function renderTabs(){
  tabs.innerHTML='';
  CLASSES.forEach(cls=>{
    const b=document.createElement('button');
    b.className='tab'+(cls===currentClass?' active':'');
    b.textContent=cls;
    b.onclick=()=>{ currentClass=cls; renderAll(); };
    tabs.appendChild(b);
  });
}

/* ========= مساعدة ========= */
function sortedByPoints(arr){
  return [...arr].sort((a,b)=> b.points - a.points || a.name.localeCompare(b.name,'ar'));
}
function medalsToStars(n){ return n>0 ? ' ' + '⭐'.repeat(Math.min(n,20)) : ''; }

/* ========= عرض التوب 3 ========= */
function renderTop3(list){
  const top3=document.getElementById('top3'); top3.innerHTML='';
  const ranks=[
    {cls:'gold',label:'المركز الأول',icon:'<span class="trophy-icon" style="color:var(--gold)">🏆</span>'},
    {cls:'silver',label:'المركز الثاني',icon:'<span class="trophy-icon" style="color:var(--silver)">🥈</span>'},
    {cls:'bronze',label:'المركز الثالث',icon:'<span class="trophy-icon" style="color:var(--bronze)">🥉</span>'}
  ];
  const top=list.slice(0,3);
  ranks.forEach((r,idx)=>{
    const s=top[idx]||{name:'—',points:0,image:DEFAULT_AVATAR,id:null,medals:0};
    const card=document.createElement('div');
    card.className=`podium ${r.cls}`;
    card.innerHTML=
      `<div class="avatar"><img src="${s.image}"></div>
       <div class="info">
         <div class="rank-label" style="color:var(--${r.cls})">${r.label}</div>
         <div>${r.icon} ${s.name} <span class="medals">${medalsToStars(s.medals)}</span></div>
         <div>${s.points} نقطة</div>
       </div>`;
    top3.appendChild(card);
  });
}

/* ========= قائمة الطلاب ========= */
function changePoints(studentId,delta){
  const arr=DB[currentClass];
  const idx=arr.findIndex(s=>s.id===studentId);
  if(idx>-1){
    arr[idx].points=Math.max(0,(arr[idx].points||0)+delta);
    saveData();
    renderAll();
  }
}

function renderList(){
  const rows=document.getElementById('rows'); rows.innerHTML='';
  const sorted=sortedByPoints(DB[currentClass]);
  renderTop3(sorted);

  const originalOrder=DB[currentClass];
  originalOrder.forEach(s=>{
    const r=document.createElement('div');
    r.className='row';
    r.innerHTML=
      `<div class="avatar"><img src="${s.image}"></div>
       <div class="name-with-medals"><span>${s.name}</span><span class="medals">${medalsToStars(s.medals)}</span></div>
       <div>${s.points}</div>
       <div>
         <button class="mini add" data-id="${s.id}" data-delta="1">+1</button>
         <button class="mini add" data-id="${s.id}" data-delta="5">+5</button>
         <button class="mini sub" data-id="${s.id}" data-delta="-1">-1</button>
       </div>`;
    rows.appendChild(r);
  });

  rows.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const id=e.currentTarget.getAttribute('data-id');
      const d=parseInt(e.currentTarget.getAttribute('data-delta'));
      changePoints(id,d);
    });
  });
}

function renderAll(){ renderTabs(); renderList(); }

/* ========= استيراد الإكسل ========= */
const excelInput=document.getElementById('excelInput');
excelInput.addEventListener('change',handleExcel);

function handleExcel(evt){
  const file=evt.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const data=new Uint8Array(e.target.result);
    const wb=XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    const fresh=makeDefaultData();
    rows.forEach(row=>{
      const cls=String(row.Class||'').trim();
      const name=String(row.Name||'').trim();
      const pts=Number(row.Points||0);
      const img=String(row.ImageURL||'').trim();
      if(CLASSES.includes(cls) && name){
        const list=fresh[cls];
        const emptyIndex=list.findIndex(s=>s.name.startsWith('طالب '));
        const idx=emptyIndex>=0?emptyIndex:list.length;
        const id=`${cls}-${idx+1}`;
        const item={id,name,points:isFinite(pts)?pts:0,image:img||DEFAULT_AVATAR,medals:0};
        if(emptyIndex>=0){ list[emptyIndex]=item; } else { list.push(item); }
      }
    });
    DB=fresh; 
    saveData(); 
    renderAll();
    alert('✅ تم استيراد البيانات بنجاح');
  };
  reader.readAsArrayBuffer(file);
}

document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('هل تريد إعادة ضبط النقاط؟')){
    const data=loadData(); 
    Object.keys(data).forEach(cls=>data[cls].forEach(s=>s.points=0));
    DB=data; 
    saveData(); 
    renderAll();
  }
});
