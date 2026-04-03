/* ========= المؤقت السحري (كما هو) ========= */
    const timerOverlay = document.getElementById('timerOverlay');
    const openTimerBtn = document.getElementById('openTimer');
    const timerStartBtn = document.getElementById('timerStart');
    const timerStopBtn  = document.getElementById('timerStop');
    const timerCloseBtn = document.getElementById('timerClose');
    const timerText = document.getElementById('timerText');
    const timerDone = document.getElementById('timerDone');
    const timerProgress = document.getElementById('timerProgress');

    const R = 150; const C = 2 * Math.PI * R;
    timerProgress.setAttribute('stroke-dasharray', C);
    timerProgress.setAttribute('stroke-dashoffset', 0);

    let timerDurationMs = 30000;
    let startTime = null;
    let remainingMs = timerDurationMs;
    let timerRAF = null;
    let timerRunning = false;

    function formatMMSS(ms){
      const total = Math.max(0, Math.ceil(ms/1000));
      const m = Math.floor(total/60);
      const s = total % 60;
      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    function openTimer(){ timerOverlay.classList.add('open'); resetTimer(timerDurationMs); }
    function closeTimer(){ timerOverlay.classList.remove('open'); stopTimer(true); }
    openTimerBtn.addEventListener('click', openTimer);
    timerCloseBtn.addEventListener('click', closeTimer);

    function resetTimer(ms){
      remainingMs = ms; startTime = null; timerRunning = false;
      cancelAnimationFrame(timerRAF);
      timerText.textContent = formatMMSS(remainingMs);
      timerDone.textContent = '';
      timerProgress.setAttribute('stroke-dashoffset', 0);
    }

    function startTimer(){
      if(timerRunning) return;
      timerRunning = true;
      timerDone.textContent = '';
      startTime = performance.now();
      const initialRemaining = remainingMs;

      function tick(now){
        const elapsed = now - startTime;
        remainingMs = Math.max(0, initialRemaining - elapsed);
        timerText.textContent = formatMMSS(remainingMs);

        const ratio = remainingMs / timerDurationMs;
        const offset = C * (1 - ratio);
        timerProgress.setAttribute('stroke-dashoffset', offset);

        if(remainingMs <= 0){
          timerRunning = false;
          timerDone.textContent = '⏰ انتهى الوقت!';
          playTimerBeep();
          return;
        }
        timerRAF = requestAnimationFrame(tick);
      }
      timerRAF = requestAnimationFrame(tick);
    }
    function stopTimer(reset=false){
      timerRunning = false;
      cancelAnimationFrame(timerRAF);
      if(reset){ resetTimer(timerDurationMs); }
    }
    timerStartBtn.addEventListener('click', startTimer);
    timerStopBtn.addEventListener('click', ()=> stopTimer(true));
    document.querySelectorAll('.preset').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const sec = parseInt(btn.getAttribute('data-sec'),10);
        timerDurationMs = sec * 1000;
        resetTimer(timerDurationMs);
      });
    });

    function playTimerBeep(){
      ensureAudio();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, audioCtx.currentTime);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(g).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.38);
    }

