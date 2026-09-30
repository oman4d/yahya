/* ========= العجلة السحرية ========= */

const overlay = document.getElementById('wheelOverlay');
const openWheelBtn = document.getElementById('openWheel');
const closeWheelBtn = document.getElementById('closeWheel');
const spinBtn = document.getElementById('spinBtn');
const plus1 = document.getElementById('plus1');
const plus5 = document.getElementById('plus5');
const minus1 = document.getElementById('minus1');

const wheelCanvas = document.getElementById('wheel');
const ctx = wheelCanvas.getContext('2d');
const winnerEl = document.getElementById('winner');

let wheelNames = [];
let angle = 0;
let spinning = false;
let angularVelocity = 0;
let friction = 0;


/* ========= جلب أسماء الشعبة الحالية مع خلطها للعجلة فقط ========= */

function getCurrentNames(){

  // نأخذ نسخة مستقلة من الطلاب
  const names = DB[currentClass].map(s => ({
    id: s.id,
    name: s.name
  }));

  // خلط عشوائي للأسماء بطريقة Fisher-Yates
  // التغيير هنا للعجلة فقط ولا يؤثر على DB أو ترتيب القائمة الرئيسية
  for(let i = names.length - 1; i > 0; i--){

    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [names[i], names[j]] =
      [names[j], names[i]];

  }

  return names;
}


/* ========= فتح العجلة ========= */

function openWheel(){

  // في كل مرة تفتح العجلة يتم خلط الأسماء من جديد
  wheelNames = getCurrentNames();

  winnerEl.textContent = '';
  winnerEl.style.animation = 'none';
  winnerEl.style.opacity = 0;

  plus1.disabled = true;
  plus5.disabled = true;
  minus1.disabled = true;

  overlay.classList.add('open');

  angle = 0;

  drawWheel();

}


/* ========= إغلاق العجلة ========= */

function closeWheel(){

  overlay.classList.remove('open');

  stopSpinNoise();

}


/* ========= أحداث الفتح والإغلاق ========= */

openWheelBtn.addEventListener(
  'click',
  openWheel
);

closeWheelBtn.addEventListener(
  'click',
  closeWheel
);


/* ========= رسم العجلة ========= */

function drawWheel(){

  const {
    width,
    height
  } = wheelCanvas;

  const cx = width / 2;
  const cy = height / 2;

  const r =
    Math.min(cx, cy) - 10;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  const n =
    wheelNames.length || 1;

  const arc =
    2 * Math.PI / n;


  for(let i = 0; i < n; i++){

    const start =
      angle + i * arc;

    const end =
      start + arc;


    /* لون الجزء */

    const grd =
      ctx.createLinearGradient(
        cx,
        cy - r,
        cx,
        cy + r
      );

    const t = i / n;

    const dark =
      `hsl(218,60%,${20 + t * 10}%)`;

    const light =
      `hsl(218,70%,${38 + t * 12}%)`;

    grd.addColorStop(
      0,
      dark
    );

    grd.addColorStop(
      1,
      light
    );


    /* رسم القطاع */

    ctx.beginPath();

    ctx.moveTo(
      cx,
      cy
    );

    ctx.arc(
      cx,
      cy,
      r,
      start,
      end
    );

    ctx.closePath();

    ctx.fillStyle =
      grd;

    ctx.fill();

    ctx.strokeStyle =
      'rgba(255,255,255,0.08)';

    ctx.lineWidth =
      2;

    ctx.stroke();


    /* كتابة الاسم */

    ctx.save();

    ctx.translate(
      cx,
      cy
    );

    ctx.rotate(
      start + arc / 2
    );

    ctx.textAlign =
      'right';

    ctx.fillStyle =
      '#fff';

    ctx.font =
      'bold 18px Tajawal';

    ctx.fillText(
      wheelNames[i].name,
      r - 14,
      6
    );

    ctx.restore();

  }


  /* الإطار الخارجي */

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    r,
    0,
    2 * Math.PI
  );

  ctx.lineWidth =
    6;

  ctx.strokeStyle =
    'rgba(255,255,255,0.15)';

  ctx.stroke();

}


/* ========= حركة العجلة ========= */

function animate(){

  if(!spinning){
    return;
  }

  angle +=
    angularVelocity;

  angularVelocity *=
    (1 - friction);

  drawWheel();


  if(
    angularVelocity < 0.002
  ){

    spinning = false;

    angularVelocity = 0;

    drawWheel();

    selectWinner();

    stopSpinNoise();

    playDing();

    return;

  }

  requestAnimationFrame(
    animate
  );

}


/* ========= تحديد الفائز ========= */

function selectWinner(){

  const n =
    wheelNames.length;

  if(n === 0){
    return;
  }

  const arc =
    2 * Math.PI / n;

  let a =
    (-angle) %
    (2 * Math.PI);

  if(a < 0){

    a +=
      2 * Math.PI;

  }


  const index =
    Math.floor(
      (a + arc / 2) /
      arc
    ) % n;


  const chosen =
    wheelNames[index];


  winnerEl.textContent =
    `🎯 ${chosen.name}`;

  winnerEl.style.animation =
    'fadeBlink 1s ease';

  winnerEl.style.opacity =
    .85;


  /* تفعيل أزرار النقاط */

  plus1.disabled =
    false;

  plus5.disabled =
    false;

  minus1.disabled =
    false;


  /*
    النقاط تذهب للطالب الصحيح
    لأن كل اسم يحتفظ بالـ id الخاص به
  */

  plus1.onclick = () =>
    changePoints(
      chosen.id,
      1
    );

  plus5.onclick = () =>
    changePoints(
      chosen.id,
      5
    );

  minus1.onclick = () =>
    changePoints(
      chosen.id,
      -1
    );

}


/* =================================================
   صوت العجلة
   ================================================= */

let audioCtx = null;

let spinNoiseSrc = null;

let spinGain = null;


/* ========= تجهيز الصوت ========= */

function ensureAudio(){

  if(!audioCtx){

    audioCtx =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

  }

}


/* ========= إنشاء صوت دوران ========= */

function createNoiseBuffer(){

  const length =
    2 * 44100;

  const buffer =
    audioCtx.createBuffer(
      1,
      length,
      44100
    );

  const data =
    buffer.getChannelData(0);


  for(
    let i = 0;
    i < length;
    i++
  ){

    data[i] =
      (
        Math.random() * 2 - 1
      ) * 0.4;

  }

  return buffer;

}


/* ========= تشغيل صوت الدوران ========= */

function playSpinNoise(){

  ensureAudio();

  stopSpinNoise();


  const buf =
    createNoiseBuffer();


  spinNoiseSrc =
    audioCtx.createBufferSource();

  spinNoiseSrc.buffer =
    buf;

  spinNoiseSrc.loop =
    true;


  const biquad =
    audioCtx.createBiquadFilter();

  biquad.type =
    'lowpass';

  biquad.frequency.value =
    1800;


  spinGain =
    audioCtx.createGain();

  spinGain.gain.setValueAtTime(
    0.0001,
    audioCtx.currentTime
  );

  spinGain.gain.exponentialRampToValueAtTime(
    0.06,
    audioCtx.currentTime + 0.2
  );


  spinNoiseSrc
    .connect(biquad)
    .connect(spinGain)
    .connect(audioCtx.destination);


  spinNoiseSrc.start();

}


/* ========= إيقاف صوت الدوران ========= */

function stopSpinNoise(){

  if(spinGain){

    try{

      spinGain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.15
      );

    }catch(e){}

  }


  if(spinNoiseSrc){

    setTimeout(
      ()=>{

        try{

          spinNoiseSrc.stop();

        }catch(e){}


        try{

          spinNoiseSrc.disconnect();

        }catch(e){}


        spinNoiseSrc =
          null;

      },
      180
    );

  }

}


/* ========= صوت الفوز ========= */

function playDing(){

  ensureAudio();


  /* النغمة الأولى */

  const o1 =
    audioCtx.createOscillator();

  const g1 =
    audioCtx.createGain();


  o1.type =
    'sine';

  o1.frequency.setValueAtTime(
    880,
    audioCtx.currentTime
  );


  g1.gain.setValueAtTime(
    0.0001,
    audioCtx.currentTime
  );

  g1.gain.exponentialRampToValueAtTime(
    0.06,
    audioCtx.currentTime + 0.01
  );

  g1.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + 0.25
  );


  o1
    .connect(g1)
    .connect(audioCtx.destination);


  o1.start();

  o1.stop(
    audioCtx.currentTime + 0.3
  );


  /* النغمة الثانية */

  const o2 =
    audioCtx.createOscillator();

  const g2 =
    audioCtx.createGain();


  o2.type =
    'triangle';

  o2.frequency.setValueAtTime(
    1320,
    audioCtx.currentTime + 0.02
  );


  g2.gain.setValueAtTime(
    0.0001,
    audioCtx.currentTime + 0.02
  );

  g2.gain.exponentialRampToValueAtTime(
    0.05,
    audioCtx.currentTime + 0.05
  );

  g2.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + 0.25
  );


  o2
    .connect(g2)
    .connect(audioCtx.destination);


  o2.start(
    audioCtx.currentTime + 0.02
  );

  o2.stop(
    audioCtx.currentTime + 0.3
  );

}


/* =================================================
   زر بدء دوران العجلة
   ================================================= */

spinBtn.addEventListener(
  'click',
  ()=>{

    if(spinning){
      return;
    }


    /* سرعة عشوائية */

    angularVelocity =
      0.45 +
      Math.random() * 0.15;


    /* احتكاك عشوائي بسيط */

    friction =
      0.015 +
      Math.random() * 0.005;


    spinning =
      true;


    /* إخفاء الفائز السابق */

    winnerEl.textContent =
      '';

    winnerEl.style.animation =
      'none';

    winnerEl.style.opacity =
      0;


    /* تعطيل أزرار النقاط أثناء الدوران */

    plus1.disabled =
      true;

    plus5.disabled =
      true;

    minus1.disabled =
      true;


    /* تشغيل الصوت */

    playSpinNoise();


    /* بدء الدوران */

    requestAnimationFrame(
      animate
    );

  }
);
