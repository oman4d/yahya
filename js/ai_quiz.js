// ========= بشير AI - اختبار الذكاء الاصطناعي (كيمياء الصف التاسع) - Cloudflare Worker + Gemini =========

const openAIQuizBtn = document.getElementById('openAIQuiz');
const aiQuizOverlay = document.getElementById('aiQuizOverlay');
const closeAIQuizBtn = document.getElementById('closeAIQuiz');
const generateAIQuestionBtn = document.getElementById('generateAIQuestion');
const aiQuestionText = document.getElementById('aiQuestionText');
const aiOptions = document.getElementById('aiOptions');
const quizArea = document.getElementById('quizArea');
const lessonSelect = document.getElementById('lessonSelect');
const aiStudentSelect = document.getElementById('aiStudentSelect');

// رابط الـ Worker
const WORKER_URL = "https://bashir-ai-quiz.oman4d.workers.dev/";

function populateAIStudentSelect() {
  if (!aiStudentSelect) return;
  const list = DB[currentClass] || [];
  aiStudentSelect.innerHTML = '';

  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    aiStudentSelect.appendChild(opt);
  });
}

if (openAIQuizBtn) {
  openAIQuizBtn.addEventListener('click', () => {
    populateAIStudentSelect();
    aiQuestionText.textContent = '';
    aiOptions.innerHTML = '';
    quizArea.style.display = 'none';
    aiQuizOverlay.classList.add('open');
  });
}

if (closeAIQuizBtn) {
  closeAIQuizBtn.addEventListener('click', () => {
    aiQuizOverlay.classList.remove('open');
  });
}

// صوت التصفيق + الوميض الذهبي حول مربع السؤال
function playBASuccess() {
  try {
    const applause = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_5c50c48c07.mp3?filename=small-crowd-applause-6713.mp3');
    applause.volume = 0.7;
    applause.play().catch(e => console.warn('Sound error:', e));
  } catch (e) {
    console.warn('Audio create error:', e);
  }

  if (quizArea) {
    quizArea.classList.remove('ai-glow');
    void quizArea.offsetWidth;
    quizArea.classList.add('ai-glow');
  }
}

// صوت بسيط عند الخطأ
function playAIFail() {
  if (typeof ensureAudio !== 'function') {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=');
      audio.play();
    } catch (e) {}
    return;
  }

  ensureAudio();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(220, now + 0.25);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  osc.connect(g).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

if (generateAIQuestionBtn) {
  generateAIQuestionBtn.addEventListener('click', async () => {
    const lesson = lessonSelect.value;
    const studentId = aiStudentSelect.value;

    if (!studentId) {
      alert('يرجى اختيار الطالب أولاً.');
      return;
    }

    aiQuestionText.textContent = '🔄 جاري توليد سؤال من بشير AI...';
    aiOptions.innerHTML = '';
    quizArea.style.display = 'block';

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lesson })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.error('Worker Error:', data);
        aiQuestionText.textContent = '❌ خطأ: ' + (data.error || 'غير معروف');
        aiOptions.innerHTML = '';
        return;
      }

      const question = data.question || 'سؤال غير متوفر';
      const options = Array.isArray(data.options) ? data.options : [];
      const answerIndex = typeof data.answer_index === 'number' ? data.answer_index : 0;

      if (options.length < 2) {
        throw new Error('عدد الخيارات غير كافٍ.');
      }

      aiQuestionText.textContent = question;
      aiOptions.innerHTML = '';

      let answered = false;

      options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.textContent = optText;
        btn.className = 'wheelbtn';
        btn.style.margin = '0 auto';

        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;

          aiOptions.querySelectorAll('button').forEach(b => {
            b.disabled = true;
          });

          if (idx === answerIndex) {
            playBASuccess();
            alert('🎉 إجابة صحيحة! حصل الطالب على نقطة.');
            changePoints(studentId, 1);
          } else {
            playAIFail();
            alert('❌ إجابة غير صحيحة، جرّب سؤالاً آخر.');
          }
        });

        aiOptions.appendChild(btn);
      });

    } catch (err) {
      console.error(err);
      aiQuestionText.textContent = '❌ حدث خطأ أثناء توليد السؤال من بشير AI.';
      aiOptions.innerHTML = '';
    }
  });
}
