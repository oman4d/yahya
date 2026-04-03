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

    let wheelNames = []; let angle = 0; let spinning = false; let angularVelocity = 0; let friction = 0;
    function getCurrentNames(){ return DB[currentClass].map(s=>({id:s.id,name:s.name})); }

    function openWheel(){
      wheelNames=getCurrentNames();
      winnerEl.textContent=''; winnerEl.style.animation='none'; winnerEl.style.opacity=0;
      plus1.disabled=plus5.disabled=minus1.disabled=true;
      overlay.classList.add('open');
      angle=0; drawWheel();
    }
    function closeWheel(){
      overlay.classList.remove('open');
      stopSpinNoise();
    }
    openWheelBtn.addEventListener('click', openWheel);
    closeWheelBtn.addEventListener('click', closeWheel);

    function drawWheel(){
      const {width,height}=wheelCanvas;
      const cx=width/2, cy=height/2;
      const r=Math.min(cx,cy)-10;
      ctx.clearRect(0,0,width,height);
      const n=wheelNames.length||1;
      const arc=2*Math.PI/n;

      for(let i=0;i<n;i++){
        const start=angle+i*arc, end=start+arc;
        const grd=ctx.createLinearGradient(cx, cy-r, cx, cy+r);
        const t=i/n;
        const dark=`hsl(218,60%,${20+t*10}%)`;
        const light=`hsl(218,70%,${38+t*12}%)`;
        grd.addColorStop(0,dark); grd.addColorStop(1,light);
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
        ctx.fillStyle=grd; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=2; ctx.stroke();

        ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+arc/2);
        ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font='bold 18px Tajawal';
        ctx.fillText(wheelNames[i].name, r-14, 6);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI);
      ctx.lineWidth=6; ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.stroke();
    }

    function animate(){
      if(!spinning) return;
      angle += angularVelocity;
      angularVelocity *= (1 - friction);
      drawWheel();
      if(angularVelocity < 0.002){
        spinning=false; angularVelocity=0; drawWheel();
        selectWinner(); stopSpinNoise(); playDing(); return;
      }
      requestAnimationFrame(animate);
    }

    function selectWinner(){
      const n=wheelNames.length; if(n===0) return;
      const arc=2*Math.PI/n;
      let a=(-angle)%(2*Math.PI); if(a<0) a+=2*Math.PI;
      const index=Math.floor((a + arc/2) / arc) % n;
      const chosen=wheelNames[index];
      winnerEl.textContent=`🎯 ${chosen.name}`;
      winnerEl.style.animation='fadeBlink 1s ease';
      winnerEl.style.opacity=.85;

      plus1.disabled=plus5.disabled=minus1.disabled=false;
      plus1.onclick=()=> changePoints(chosen.id,1);
      plus5.onclick=()=> changePoints(chosen.id,5);
      minus1.onclick=()=> changePoints(chosen.id,-1);
    }

    // صوت العجلة
    let audioCtx=null, spinNoiseSrc=null, spinGain=null;
    function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
    function createNoiseBuffer(){
      const length=2*44100; const buffer=audioCtx.createBuffer(1,length,44100);
      const data=buffer.getChannelData(0);
      for(let i=0;i<length;i++){ data[i]=(Math.random()*2-1)*0.4; }
      return buffer;
    }
    function playSpinNoise(){
      ensureAudio(); stopSpinNoise();
      const buf=createNoiseBuffer();
      spinNoiseSrc=audioCtx.createBufferSource(); spinNoiseSrc.buffer=buf; spinNoiseSrc.loop=true;
      const biquad=audioCtx.createBiquadFilter(); biquad.type='lowpass'; biquad.frequency.value=1800;
      spinGain=audioCtx.createGain(); spinGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      spinGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.2);
      spinNoiseSrc.connect(biquad).connect(spinGain).connect(audioCtx.destination);
      spinNoiseSrc.start();
    }
    function stopSpinNoise(){
      if(spinGain){ try{ spinGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.15);}catch(e){} }
      if(spinNoiseSrc){
        setTimeout(()=>{ try{spinNoiseSrc.stop();}catch(e){} try{spinNoiseSrc.disconnect();}catch(e){} spinNoiseSrc=null; },180);
      }
    }
    function playDing(){
      ensureAudio();
      const o1=audioCtx.createOscillator(), g1=audioCtx.createGain();
      o1.type='sine'; o1.frequency.setValueAtTime(880, audioCtx.currentTime);
      g1.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime+0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.25);
      o1.connect(g1).connect(audioCtx.destination); o1.start(); o1.stop(audioCtx.currentTime+0.3);

      const o2=audioCtx.createOscillator(), g2=audioCtx.createGain();
      o2.type='triangle'; o2.frequency.setValueAtTime(1320, audioCtx.currentTime+0.02);
      g2.gain.setValueAtTime(0.0001, audioCtx.currentTime+0.02);
      g2.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime+0.05);
      g2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.25);
      o2.connect(g2).connect(audioCtx.destination); o2.start(audioCtx.currentTime+0.02); o2.stop(audioCtx.currentTime+0.3);
    }

    spinBtn.addEventListener('click', ()=>{
      if(spinning) return;
      angularVelocity = 0.45 + Math.random()*0.15;
      friction       = 0.015 + Math.random()*0.005;
      spinning=true;
      winnerEl.textContent=''; winnerEl.style.animation='none'; winnerEl.style.opacity=0;
      plus1.disabled=plus5.disabled=minus1.disabled=true;
      playSpinNoise();
      requestAnimationFrame(animate);
    });

