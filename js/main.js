/* ========= بيانات أساسية + تخزين ========= */
const CLASSES = ["التاسع/1","التاسع/2","التاسع/3","التاسع/4","التاسع/5"];

const STORAGE_KEY = 'leaderboardData_full_final_wheel_timer';

/* ========= أنواع الأوسمة ========= */
const BADGE_TYPES = {
  challenge:    { icon:'⭐', label:'وسام التحدي' },
  genius:       { icon:'🧠', label:'وسام العبقري' },
  perseverance: { icon:'🔥', label:'وسام المثابرة' },
  accuracy:     { icon:'🎯', label:'وسام الدقة' },
  cooperation:  { icon:'🤝', label:'وسام التعاون' },
  excellence:   { icon:'🏆', label:'وسام التميز' }
};

function makeEmptyBadges(){
  return Object.fromEntries(
    Object.keys(BADGE_TYPES).map(key=>[key,0])
  );
}

const DEFAULT_AVATAR =
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
       <rect width='100%' height='100%' rx='28' fill='#1e3a8a'/>
       <circle cx='128' cy='108' r='44' fill='#f2f6ff' fill-opacity='0.9'/>
       <rect x='56' y='156' width='144' height='60' rx='22' fill='#f2f6ff' fill-opacity='0.9'/>
     </svg>`
  )}`;


/* ========= إنشاء البيانات الافتراضية ========= */

function makeDefaultData(){

  const data={};

  CLASSES.forEach(cls=>{

    data[cls]=Array.from({length:40},(_,i)=>({

      id:`${cls}-${i+1}`,
      name:`طالب ${i+1}`,
      points:0,
      medals:0, // حقل قديم للتوافق مع البيانات السابقة
      badges:makeEmptyBadges(),
      image:DEFAULT_AVATAR

    }));

  });

  return data;

}


/* ========= تصحيح البيانات القديمة ========= */

function normalizeData(db){

  CLASSES.forEach(cls=>{

    if(!Array.isArray(db[cls])){
      db[cls]=[];
    }

    db[cls].forEach((s,i)=>{

      if(!s.id){
        s.id=`${cls}-${i+1}`;
      }

      if(typeof s.name!=="string"){
        s.name=`طالب ${i+1}`;
      }

      if(typeof s.points!=="number"){
        s.points=0;
      }

      if(typeof s.medals!=="number"){
        s.medals=0;
      }

      /* ترحيل تلقائي: النجوم القديمة تصبح أوسمة تحدي */
      const legacyChallenge = Math.max(0, Number(s.medals)||0);
      const incomingBadges = (s.badges && typeof s.badges==='object') ? s.badges : {};
      s.badges = makeEmptyBadges();
      Object.keys(BADGE_TYPES).forEach(type=>{
        const value = Number(incomingBadges[type]);
        s.badges[type] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      });
      if(!('challenge' in incomingBadges) && legacyChallenge>0){
        s.badges.challenge = legacyChallenge;
      }

      if(!s.image){
        s.image=DEFAULT_AVATAR;
      }

    });

  });

  return db;

}


/* ========= تحميل البيانات ========= */

function loadData(){

  try{

    const raw=localStorage.getItem(STORAGE_KEY);

    if(raw){

      return normalizeData(
        JSON.parse(raw)
      );

    }

  }catch(e){

    console.warn(
      "Local data load failed:",
      e
    );

  }

  return makeDefaultData();

}


/* ========= حفظ البيانات ========= */

function saveData(){

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(DB)
  );

  if(typeof cloudSaveData==="function"){

    try{

      cloudSaveData(DB);

    }catch(e){

      console.warn(
        "Cloud save failed:",
        e
      );

    }

  }

}


/* ========= البيانات الحالية ========= */

let DB=loadData();

let currentClass=CLASSES[0];

const tabs=
  document.getElementById("tabs");


/* ========= العرض الأولي ========= */

renderTabs();

renderList();


/* ========= المزامنة مع Firebase ========= */

async function syncFromCloudOnce(){

  if(typeof cloudLoadData!=="function"){
    return;
  }

  try{

    const serverData=
      await cloudLoadData();

    if(serverData){

      DB=
        normalizeData(serverData);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DB)
      );

      renderAll();

    }else{

      cloudSaveData(DB);

    }

  }catch(e){

    console.warn(
      "Cloud sync failed:",
      e
    );

  }

}

syncFromCloudOnce();


/* ========= تبويبات الشعب ========= */

function renderTabs(){

  if(!tabs){
    return;
  }

  tabs.innerHTML="";

  CLASSES.forEach(cls=>{

    const button=
      document.createElement("button");

    button.className=
      "tab"+
      (
        cls===currentClass
        ?" active"
        :""
      );

    button.textContent=cls;

    button.onclick=()=>{

      currentClass=cls;

      renderAll();

    };

    tabs.appendChild(button);

  });

}


/* ========= ترتيب حسب النقاط ========= */

function sortedByPoints(arr){

  return [...arr].sort(
    (a,b)=>
      b.points-a.points ||
      a.name.localeCompare(
        b.name,
        "ar"
      )
  );

}


/* ========= عرض الأوسمة باختصار ========= */
function badgesToHTML(badges){
  if(!badges) return '';
  return Object.entries(BADGE_TYPES)
    .filter(([type])=>(badges[type]||0)>0)
    .map(([type,meta])=>
      `<span class="badge-chip" title="${meta.label}">${meta.icon}<b>${badges[type]}</b></span>`
    )
    .join('');
}

function totalBadges(student){
  return Object.keys(BADGE_TYPES).reduce(
    (sum,type)=>sum+(student.badges?.[type]||0),0
  );
}


/* ========= الثلاثة الأوائل ========= */

function renderTop3(list){

  const top3=
    document.getElementById("top3");

  if(!top3){
    return;
  }

  top3.innerHTML="";

  const ranks=[

    {
      cls:"gold",
      label:"المركز الأول",
      icon:
        '<span class="trophy-icon" style="color:var(--gold)">🏆</span>'
    },

    {
      cls:"silver",
      label:"المركز الثاني",
      icon:
        '<span class="trophy-icon" style="color:var(--silver)">🥈</span>'
    },

    {
      cls:"bronze",
      label:"المركز الثالث",
      icon:
        '<span class="trophy-icon" style="color:var(--bronze)">🥉</span>'
    }

  ];

  const top=
    list.slice(0,3);

  ranks.forEach((r,idx)=>{

    const s=
      top[idx]||
      {
        name:"—",
        points:0,
        image:DEFAULT_AVATAR,
        id:null,
        badges:makeEmptyBadges()
      };

    const card=
      document.createElement("div");

    card.className=
      `podium ${r.cls}`;

    card.innerHTML=

      `<div class="avatar">
         <img src="${s.image}">
       </div>

       <div class="info">

         <div
           class="rank-label"
           style="color:var(--${r.cls})"
         >
           ${r.label}
         </div>

         <div>
           ${r.icon}
           ${s.name}
         </div>

         <div class="badge-summary podium-badges">
           ${badgesToHTML(s.badges)}
         </div>

         <div>
           ${s.points} نقطة
         </div>

       </div>`;

    top3.appendChild(card);

  });

}


/* ========= تغيير نقاط الطالب ========= */

function changePoints(studentId,delta){

  const arr=
    DB[currentClass];

  const idx=
    arr.findIndex(
      s=>s.id===studentId
    );

  if(idx>-1){

    arr[idx].points=
      Math.max(
        0,
        (arr[idx].points||0)+delta
      );

    saveData();

    renderAll();

  }

}


/* ========= عرض الطلاب ========= */

function renderList(){

  const rows=
    document.getElementById("rows");

  if(!rows){
    return;
  }

  rows.innerHTML="";

  if(!Array.isArray(DB[currentClass])){

    DB[currentClass]=[];

  }

  const sorted=
    sortedByPoints(
      DB[currentClass]
    );

  renderTop3(sorted);

  const originalOrder=
    DB[currentClass];

  originalOrder.forEach(s=>{

    const r=
      document.createElement("div");

    r.className="row";

    r.innerHTML=

      `<div class="avatar">
         <img src="${s.image}">
       </div>

       <div class="student-name-block">
         <span class="student-name">${s.name}</span>
         <div class="badge-summary">${badgesToHTML(s.badges)}</div>
       </div>

       <div>
         ${s.points}
       </div>

       <div class="student-actions">

         <button class="mini add" data-id="${s.id}" data-delta="1">+1</button>
         <button class="mini add" data-id="${s.id}" data-delta="5">+5</button>
         <button class="mini sub" data-id="${s.id}" data-delta="-1">-1</button>
         <button class="mini badge-manage" data-badge-student="${s.id}">🏅 الأوسمة</button>

       </div>`;

    rows.appendChild(r);

  });

  rows
    .querySelectorAll("button[data-delta]")
    .forEach(btn=>{
      btn.addEventListener("click",e=>{
        const id=e.currentTarget.getAttribute("data-id");
        const delta=parseInt(e.currentTarget.getAttribute("data-delta"));
        changePoints(id,delta);
      });
    });

  rows
    .querySelectorAll("button[data-badge-student]")
    .forEach(btn=>{
      btn.addEventListener("click",e=>{
        openStudentBadges(e.currentTarget.getAttribute("data-badge-student"));
      });
    });

}


/* ========= تحديث الصفحة ========= */

function renderAll(){

  renderTabs();

  renderList();

}

/* =================================================
   نظام الأوسمة
   ================================================= */

const manageBadgesBtn = document.getElementById('manageBadgesBtn');
const badgeEditorOverlay = document.getElementById('badgeEditorOverlay');
const badgeEditorTitle = document.getElementById('badgeEditorTitle');
const badgeRows = document.getElementById('badgeRows');
const closeBadgeEditor = document.getElementById('closeBadgeEditor');
const resetStudentBadgesBtn = document.getElementById('resetStudentBadgesBtn');

const classBadgesOverlay = document.getElementById('classBadgesOverlay');
const classBadgesTitle = document.getElementById('classBadgesTitle');
const classBadgeType = document.getElementById('classBadgeType');
const resetSelectedBadgeBtn = document.getElementById('resetSelectedBadgeBtn');
const resetClassBadgesBtn = document.getElementById('resetClassBadgesBtn');
const closeClassBadges = document.getElementById('closeClassBadges');

let editingBadgeStudentId = null;

function ensureStudentBadges(student){
  if(!student.badges || typeof student.badges!=='object'){
    student.badges=makeEmptyBadges();
  }
  Object.keys(BADGE_TYPES).forEach(type=>{
    const value=Number(student.badges[type]);
    student.badges[type]=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  });
  return student.badges;
}

function changeBadge(studentId,type,delta){
  if(!BADGE_TYPES[type]) return;
  const student=(DB[currentClass]||[]).find(s=>s.id===studentId);
  if(!student) return;
  ensureStudentBadges(student);
  student.badges[type]=Math.max(0,(student.badges[type]||0)+delta);
  saveData();
  renderAll();
  if(editingBadgeStudentId===studentId && badgeEditorOverlay?.classList.contains('open')){
    renderBadgeEditor();
  }
}

function renderBadgeEditor(){
  const student=(DB[currentClass]||[]).find(s=>s.id===editingBadgeStudentId);
  if(!student || !badgeRows) return;
  ensureStudentBadges(student);
  badgeEditorTitle.textContent=`🏅 أوسمة ${student.name}`;
  badgeRows.innerHTML=Object.entries(BADGE_TYPES).map(([type,meta])=>`
    <div class="badge-row">
      <div class="badge-row-label"><span class="badge-big-icon">${meta.icon}</span><span>${meta.label}</span></div>
      <div class="badge-counter">
        <button class="badge-step minus" data-badge-type="${type}" data-badge-delta="-1">−</button>
        <strong>${student.badges[type]||0}</strong>
        <button class="badge-step plus" data-badge-type="${type}" data-badge-delta="1">+</button>
      </div>
    </div>
  `).join('');

  badgeRows.querySelectorAll('[data-badge-type]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      changeBadge(editingBadgeStudentId,btn.dataset.badgeType,Number(btn.dataset.badgeDelta));
    });
  });
}

function openStudentBadges(studentId){
  editingBadgeStudentId=studentId;
  renderBadgeEditor();
  badgeEditorOverlay?.classList.add('open');
}

function closeStudentBadges(){
  badgeEditorOverlay?.classList.remove('open');
  editingBadgeStudentId=null;
}

function resetStudentBadges(){
  const student=(DB[currentClass]||[]).find(s=>s.id===editingBadgeStudentId);
  if(!student) return;
  if(!confirm(`هل تريد تصفير جميع أوسمة ${student.name}؟`)) return;
  student.badges=makeEmptyBadges();
  saveData();
  renderAll();
  renderBadgeEditor();
}

function populateClassBadgeTypes(){
  if(!classBadgeType) return;
  classBadgeType.innerHTML=Object.entries(BADGE_TYPES)
    .map(([type,meta])=>`<option value="${type}">${meta.icon} ${meta.label}</option>`)
    .join('');
}

function openClassBadgesManager(){
  populateClassBadgeTypes();
  if(classBadgesTitle) classBadgesTitle.textContent=`🏅 إدارة أوسمة ${currentClass}`;
  classBadgesOverlay?.classList.add('open');
}

function closeClassBadgesManager(){
  classBadgesOverlay?.classList.remove('open');
}

function resetSelectedBadgeForClass(){
  const type=classBadgeType?.value;
  if(!BADGE_TYPES[type]) return;
  const meta=BADGE_TYPES[type];
  if(!confirm(`هل تريد تصفير ${meta.icon} ${meta.label} لجميع طلاب ${currentClass}؟`)) return;
  (DB[currentClass]||[]).forEach(student=>{
    ensureStudentBadges(student);
    student.badges[type]=0;
  });
  saveData();
  renderAll();
  alert(`✅ تم تصفير ${meta.label} في ${currentClass}.`);
}

function resetAllBadgesForClass(){
  if(!confirm(`هل تريد تصفير جميع الأوسمة لجميع طلاب ${currentClass}؟`)) return;
  (DB[currentClass]||[]).forEach(student=>student.badges=makeEmptyBadges());
  saveData();
  renderAll();
  alert(`✅ تم تصفير جميع أوسمة ${currentClass}.`);
}

manageBadgesBtn?.addEventListener('click',openClassBadgesManager);
closeBadgeEditor?.addEventListener('click',closeStudentBadges);
resetStudentBadgesBtn?.addEventListener('click',resetStudentBadges);
closeClassBadges?.addEventListener('click',closeClassBadgesManager);
resetSelectedBadgeBtn?.addEventListener('click',resetSelectedBadgeForClass);
resetClassBadgesBtn?.addEventListener('click',resetAllBadgesForClass);

badgeEditorOverlay?.addEventListener('click',e=>{ if(e.target===badgeEditorOverlay) closeStudentBadges(); });
classBadgesOverlay?.addEventListener('click',e=>{ if(e.target===classBadgesOverlay) closeClassBadgesManager(); });


/* =================================================
   إدارة أسماء الطلاب
   ================================================= */

const editNamesBtn=
  document.getElementById(
    "editNamesBtn"
  );

const namesEditorOverlay=
  document.getElementById(
    "namesEditorOverlay"
  );

const namesEditorTitle=
  document.getElementById(
    "namesEditorTitle"
  );

const namesEditorText=
  document.getElementById(
    "namesEditorText"
  );

const namesCount=
  document.getElementById(
    "namesCount"
  );

const saveNamesBtn=
  document.getElementById(
    "saveNamesBtn"
  );

const closeNamesEditor=
  document.getElementById(
    "closeNamesEditor"
  );


/* ========= قراءة الأسماء ========= */

function getNamesFromEditor(){

  if(!namesEditorText){
    return [];
  }

  return namesEditorText
    .value
    .split(/\r?\n/)
    .map(
      name=>name.trim()
    )
    .filter(Boolean);

}


/* ========= عداد الطلاب ========= */

function updateNamesCount(){

  if(!namesCount){
    return;
  }

  const count=
    getNamesFromEditor()
      .length;

  namesCount.textContent=
    `عدد الطلاب: ${count}`;

}


/* ========= فتح محرر الأسماء ========= */

function openNamesEditor(){

  if(
    !namesEditorOverlay ||
    !namesEditorText
  ){
    return;
  }

  const list=
    DB[currentClass]||[];

  if(namesEditorTitle){

    namesEditorTitle.textContent=
      `👥 تعديل أسماء ${currentClass}`;

  }

  namesEditorText.value=
    list
      .map(
        s=>s.name
      )
      .join("\n");

  updateNamesCount();

  namesEditorOverlay.style.display=
    "flex";

  setTimeout(
    ()=>{
      namesEditorText.focus();
    },
    50
  );

}


/* ========= إغلاق محرر الأسماء ========= */

function hideNamesEditor(){

  if(namesEditorOverlay){

    namesEditorOverlay.style.display=
      "none";

  }

}


/* ========= حفظ الأسماء ========= */

function saveEditedNames(){

  const names=
    getNamesFromEditor();

  if(names.length===0){

    alert(
      "⚠️ اكتب اسم طالب واحد على الأقل."
    );

    return;

  }

  const oldList=
    Array.isArray(
      DB[currentClass]
    )
    ?DB[currentClass]
    :[];


  /*
    نحافظ على:
    النقاط
    الصور
    الأوسمة

    حسب ترتيب الطالب
  */

  DB[currentClass]=
    names.map(
      (name,index)=>{

        const oldStudent=
          oldList[index];

        if(oldStudent){

          return {

            ...oldStudent,

            id:
              oldStudent.id ||
              `${currentClass}-${index+1}`,

            name:name

          };

        }

        return {

          id:
            `${currentClass}-${index+1}`,

          name:name,

          points:0,

          medals:0,
          badges:makeEmptyBadges(),

          image:
            DEFAULT_AVATAR

        };

      }
    );


  /* حفظ محلي + Firebase */

  saveData();


  /* تحديث الشاشة */

  renderAll();


  /* إغلاق النافذة */

  hideNamesEditor();


  alert(
    `✅ تم حفظ ${names.length} طالبًا في ${currentClass} ومزامنة البيانات.`
  );

}


/* ========= أحداث محرر الأسماء ========= */

if(editNamesBtn){

  editNamesBtn.addEventListener(
    "click",
    openNamesEditor
  );

}


if(namesEditorText){

  namesEditorText.addEventListener(
    "input",
    updateNamesCount
  );

}


if(saveNamesBtn){

  saveNamesBtn.addEventListener(
    "click",
    saveEditedNames
  );

}


if(closeNamesEditor){

  closeNamesEditor.addEventListener(
    "click",
    hideNamesEditor
  );

}


if(namesEditorOverlay){

  namesEditorOverlay.addEventListener(
    "click",
    e=>{

      if(
        e.target===
        namesEditorOverlay
      ){

        hideNamesEditor();

      }

    }
  );

}


/* زر Esc يغلق النافذة */

document.addEventListener(
  "keydown",
  e=>{

    if(
      e.key==="Escape" &&
      namesEditorOverlay &&
      namesEditorOverlay.style.display==="flex"
    ){

      hideNamesEditor();

    }

  }
);


/* =================================================
   استيراد Excel
   ================================================= */

const excelInput=
  document.getElementById(
    "excelInput"
  );

if(excelInput){

  excelInput.addEventListener(
    "change",
    handleExcel
  );

}


function handleExcel(evt){

  const file=
    evt.target.files[0];

  if(!file){
    return;
  }

  const reader=
    new FileReader();

  reader.onload=e=>{

    const data=
      new Uint8Array(
        e.target.result
      );

    const wb=
      XLSX.read(
        data,
        {
          type:"array"
        }
      );

    const ws=
      wb.Sheets[
        wb.SheetNames[0]
      ];

    const rows=
      XLSX.utils
        .sheet_to_json(
          ws,
          {
            defval:""
          }
        );

    const fresh=
      makeDefaultData();

    rows.forEach(row=>{

      const cls=
        String(
          row.Class||""
        ).trim();

      const name=
        String(
          row.Name||""
        ).trim();

      const pts=
        Number(
          row.Points||0
        );

      const img=
        String(
          row.ImageURL||""
        ).trim();

      if(
        CLASSES.includes(cls) &&
        name
      ){

        const list=
          fresh[cls];

        const emptyIndex=
          list.findIndex(
            s=>
              s.name
                .startsWith(
                  "طالب "
                )
          );

        const idx=
          emptyIndex>=0
          ?emptyIndex
          :list.length;

        const id=
          `${cls}-${idx+1}`;

        const item={

          id:id,

          name:name,

          points:
            isFinite(pts)
            ?pts
            :0,

          image:
            img||
            DEFAULT_AVATAR,

          medals:0,
          badges:makeEmptyBadges()

        };

        if(emptyIndex>=0){

          list[emptyIndex]=
            item;

        }else{

          list.push(item);

        }

      }

    });


    DB=fresh;

    saveData();

    renderAll();

    alert(
      "✅ تم استيراد البيانات بنجاح"
    );

  };

  reader.readAsArrayBuffer(
    file
  );

}


/* =================================================
   إعادة ضبط النقاط
   ================================================= */

const resetBtn=
  document.getElementById(
    "resetBtn"
  );

if(resetBtn){

  resetBtn.addEventListener(
    "click",
    ()=>{

      if(
        confirm(
          "هل تريد إعادة ضبط النقاط؟"
        )
      ){

        Object.keys(DB)
          .forEach(
            cls=>{

              DB[cls]
                .forEach(
                  s=>{
                    s.points=0;
                  }
                );

            }
          );

        saveData();

        renderAll();

      }

    }
  );

}
