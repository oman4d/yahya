/* ========= دائرة التحدي ========= */
    const openChallengeBtn = document.getElementById('openChallenge');
    const challengeOverlay = document.getElementById('challengeOverlay');
    const closeChallengeBtn = document.getElementById('closeChallenge');
    const startChallengeBtn = document.getElementById('startChallenge');
    const modeSelect = document.getElementById('modeSelect');
    const timeSelect = document.getElementById('timeSelect');
    const questionSelect = document.getElementById('questionSelect');
    const p1Select = document.getElementById('p1Select');
    const p2Select = document.getElementById('p2Select');
    const p2Wrap  = document.getElementById('p2Wrap');

    const runner1 = document.getElementById('runner1');
    const runner2 = document.getElementById('runner2');
    const runner1Img = document.getElementById('runner1Img');
    const runner2Img = document.getElementById('runner2Img');
    const name1El = document.getElementById('name1');
    const name2El = document.getElementById('name2');

    const p1Plus = document.getElementById('p1Plus');
    const p2Plus = document.getElementById('p2Plus');
    const timerLbl = document.getElementById('challengeTimer');
    const winPopup = document.getElementById('winPopup');
    const winnerNameEl = document.getElementById('winnerName');
    const endChallengeBtn = document.getElementById('endChallenge');
    const newChallengeBtn = document.getElementById('newChallenge');

    let p1Score=0, p2Score=0, need=5, tLeft=0, tInt=null, running=false;
    let p1Id=null, p2Id=null;

    function populateChallengeSelects(){
      // يعرض أسماء الصف الحالي فقط
      const list=DB[currentClass];
      p1Select.innerHTML=''; p2Select.innerHTML='';
      list.forEach(s=>{
        const opt1=document.createElement('option');
        opt1.value=s.id; opt1.textContent=s.name;
        p1Select.appendChild(opt1);
        const opt2=opt1.cloneNode(true);
        p2Select.appendChild(opt2);
      });
    }

    openChallengeBtn.addEventListener('click', ()=>{
      populateChallengeSelects();
      challengeOverlay.classList.add('open');
      toggleModeUI();
      resetChallengeUI();
    });
    closeChallengeBtn.addEventListener('click', ()=>{
      stopChallenge();
      challengeOverlay.classList.remove('open');
    });

    modeSelect.addEventListener('change', toggleModeUI);
    function toggleModeUI(){
      const isSingle = modeSelect.value==='single';
      p2Wrap.classList.toggle('hide', isSingle);
      p2Plus.classList.toggle('hide', isSingle);
    }

    function resetChallengeUI(){
      p1Score=0; p2Score=0;
      need=parseInt(questionSelect.value,10) || 5;
      runner1.style.display='none';
      runner2.style.display='none';
      name1El.textContent=''; name2El.textContent='';
      winPopup.classList.remove('open');
      timerLbl.textContent='00:00';
      moveRunner(runner1, 0); moveRunner(runner2, 0);
    }

    startChallengeBtn.addEventListener('click', ()=>{
      need=parseInt(questionSelect.value,10) || 5;
      tLeft=parseInt(timeSelect.value,10) || 120;
      p1Id=p1Select.value;
      p2Id=p2Select.value;

      if(!p1Id){ alert('اختر المتسابق 1'); return; }
      if(modeSelect.value==='dual' && (!p2Id || p2Id===p1Id)){ alert('اختر متسابق 2 مختلف'); return; }

      const student1 = DB[currentClass].find(s=>s.id===p1Id);
      const student2 = DB[currentClass].find(s=>s.id===p2Id);

      runner1Img.src = (student1 && student1.image) || DEFAULT_AVATAR;
      name1El.textContent = (student1 && student1.name) || '';
      runner1.style.display='block';

      if(modeSelect.value==='dual'){
        runner2Img.src = (student2 && student2.image) || DEFAULT_AVATAR;
        name2El.textContent = (student2 && student2.name) || '';
        runner2.style.display='block';
      }else{
        runner2.style.display='none'; name2El.textContent='';
      }

      p1Score=0; p2Score=0;
      moveRunner(runner1,0); moveRunner(runner2,0);
      running=true;
      updateChallengeTimer();
      clearInterval(tInt);
      tInt=setInterval(()=>{
        tLeft--; updateChallengeTimer();
        if(tLeft<=0){ finishChallenge(null, true); }
      },1000);
    });

    p1Plus.addEventListener('click', ()=>addPoint(1));
    p2Plus.addEventListener('click', ()=>addPoint(2));

    function updateChallengeTimer(){
      const m = String(Math.floor(tLeft/60)).padStart(2,'0');
      const s = String(tLeft%60).padStart(2,'0');
      timerLbl.textContent=`${m}:${s}`;
    }

    function moveRunner(node, step){
      // خط من 6% إلى 90% => خمس خطوات (0..5)
      const start=6, end=90;
      const pos = start + (end-start) * (step/5);
      node.style.left = pos+'%';
    }

    function addPoint(player){
      if(!running) return;
      if(player===1){
        p1Score=Math.min(need, p1Score+1);
        moveRunner(runner1, Math.min(5,p1Score));
        if(p1Score>=need){ finishChallenge(p1Id,false); }
      }else{
        if(modeSelect.value==='single') return;
        p2Score=Math.min(need, p2Score+1);
        moveRunner(runner2, Math.min(5,p2Score));
        if(p2Score>=need){ finishChallenge(p2Id,false); }
      }
    }

    function playWinSound(){
      ensureAudio();
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type='triangle';
      const now=audioCtx.currentTime;
      o.frequency.setValueAtTime(660, now);
      o.frequency.linearRampToValueAtTime(990, now+0.25);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now+0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(now); o.stop(now+0.55);
    }

    function finishChallenge(winnerId, timeUp){
      if(!running) return;
      running=false;
      clearInterval(tInt);

      let winnerName='';
      if(!timeUp && winnerId){
        // أضف ⭐ وسام التحدي تلقائيًا للفائز
        const list=DB[currentClass];
        const idx=list.findIndex(s=>s.id===winnerId);
        if(idx>-1){
          winnerName = list[idx].name;
          changeBadge(winnerId,'challenge',1);
          playWinSound();
        }
      }else{
        winnerName = 'لا أحد (انتهى الوقت ⏰)';
      }

      if(winnerName){
        winnerNameEl.textContent = winnerName;
      }else{
        winnerNameEl.textContent = timeUp ? 'لا أحد' : 'الفائز';
      }
      winPopup.classList.add('open');
    }

    endChallengeBtn.addEventListener('click', ()=>{
      winPopup.classList.remove('open');
      challengeOverlay.classList.remove('open');
      stopChallenge();
    });
    newChallengeBtn.addEventListener('click', ()=>{
      winPopup.classList.remove('open');
      resetChallengeUI();
    });

    function stopChallenge(){
      running=false; clearInterval(tInt);
      resetChallengeUI();
    }
