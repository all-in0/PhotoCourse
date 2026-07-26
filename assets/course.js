/* ---------------------------------------------------------------
   Фотокурс — прогрес і логіка
   Дані зберігаються локально в браузері (localStorage).
   Є експорт/імпорт у JSON — щоб перенести прогрес між пристроями.
   --------------------------------------------------------------- */

const Course = (() => {
  const KEY = 'photocourse.v1';

  const MODULES = [
    { id: '01', file: '01-start.html',      title: 'Старт',        sub: 'Як тримати телефон і бачити кадр', ready: true },
    { id: '02', file: '02-exposure.html',   title: 'Експозиція',   sub: 'Витримка, діафрагма, ISO — на пальцях', ready: true },
    { id: '03', file: '03-composition.html',title: 'Композиція',   sub: 'Куди поставити героя і що прибрати' },
    { id: '04', file: '04-light.html',      title: 'Світло',       sub: 'Жорстке, м’яке, напрямок, час доби' },
    { id: '05', file: '05-focus.html',      title: 'Фокус',        sub: 'Різкість і глибина різкості' },
    { id: '06', file: '06-phone.html',      title: 'Телефон',      sub: 'HDR, RAW, зум, нічний режим' },
    { id: '07', file: '07-portrait.html',   title: 'Портрет',      sub: 'Люди перед камерою' },
    { id: '08', file: '08-genres.html',     title: 'Вулиця',       sub: 'Вулиця, пейзаж, предметка' },
    { id: '09', file: '09-editing.html',    title: 'Обробка',      sub: 'Lightroom Mobile і Snapseed' },
    { id: '10', file: '10-camera.html',     title: 'Камера',       sub: 'Як вибрати першу й перенести навички' },
    { id: '11', file: '11-project.html',    title: 'Проєкт',       sub: 'Серія з 10 кадрів і самооцінка' }
  ];

  let state = read();

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { modules: {} };
    } catch (e) {
      return { modules: {} };
    }
  }

  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function mod(id) {
    if (!state.modules[id]) state.modules[id] = { tasks: {}, quiz: {}, notes: '', done: false };
    return state.modules[id];
  }

  function touched(id) {
    const m = state.modules[id];
    if (!m) return false;
    return m.done || m.notes || Object.keys(m.tasks).length || Object.keys(m.quiz).length;
  }

  function percent() {
    const done = MODULES.filter(m => state.modules[m.id] && state.modules[m.id].done).length;
    return { done, total: MODULES.length, pct: Math.round((done / MODULES.length) * 100) };
  }

  return {
    MODULES,
    state: () => state,
    mod,
    touched,
    percent,
    save: write,
    resetModule(id) { delete state.modules[id]; write(); },
    resetAll() { state = { modules: {} }; write(); },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.modules) throw new Error('Не той формат');
      state = parsed;
      write();
    }
  };
})();

/* --- Сторінка-хаб ---------------------------------------------- */

function renderSheet(el) {
  const perStrip = 3;
  let html = '';
  for (let i = 0; i < Course.MODULES.length; i += perStrip) {
    html += '<div class="strip">';
    Course.MODULES.slice(i, i + perStrip).forEach(m => {
      const st = Course.state().modules[m.id];
      const cls = (st && st.done ? ' is-done' : (Course.touched(m.id) ? ' is-started' : ''))
                + (m.ready ? '' : ' is-locked');
      const tag = m.ready ? 'a' : 'div';
      const href = m.ready ? ` href="${m.file}"` : '';
      html += `
        <${tag} class="frame${cls}"${href}>
          <span class="frame-no">кадр ${m.id}</span>
          <h2 class="frame-title">${m.title}</h2>
          <p class="frame-sub">${m.sub}</p>
          <svg class="frame-mark" viewBox="0 0 120 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 18,44 C 12,18 44,7 66,9 C 94,11 110,26 107,45 C 104,66 76,75 54,73 C 30,71 16,60 18,43 C 19,33 27,25 40,19"/>
          </svg>
        </${tag}>`;
    });
    html += '</div>';
  }
  el.innerHTML = html;
}

function renderMeter() {
  const p = Course.percent();
  const fill = document.querySelector('.meter-fill');
  const num = document.querySelector('[data-meter-count]');
  if (fill) fill.style.width = p.pct + '%';
  if (num) num.textContent = `${p.done} / ${p.total}`;
}

/* --- Сторінка модуля ------------------------------------------- */

function flashSaved() {
  const el = document.querySelector('.saved');
  if (!el) return;
  el.classList.add('show');
  clearTimeout(flashSaved.t);
  flashSaved.t = setTimeout(() => el.classList.remove('show'), 1200);
}

function initModule() {
  const id = document.body.dataset.module;
  if (!id) return;
  const m = Course.mod(id);

  document.querySelectorAll('[data-task]').forEach(box => {
    box.checked = !!m.tasks[box.dataset.task];
    box.addEventListener('change', () => {
      if (box.checked) m.tasks[box.dataset.task] = true;
      else delete m.tasks[box.dataset.task];
      Course.save();
      flashSaved();
    });
  });

  document.querySelectorAll('.quiz-q').forEach(q => {
    const key = q.dataset.q;
    const verdict = q.querySelector('.verdict');
    const show = val => {
      const opt = q.querySelector(`input[value="${val}"]`);
      if (!opt) return;
      opt.checked = true;
      const ok = opt.dataset.correct === '1';
      verdict.textContent = ok ? '✓ Правильно. ' + (verdict.dataset.ok || '') : '✕ Не те. ' + (verdict.dataset.no || '');
      verdict.className = 'verdict show ' + (ok ? 'ok' : 'no');
    };
    if (m.quiz[key] !== undefined) show(m.quiz[key]);
    q.querySelectorAll('input[type=radio]').forEach(r => {
      r.addEventListener('change', () => {
        m.quiz[key] = r.value;
        Course.save();
        show(r.value);
        flashSaved();
      });
    });
  });

  const notes = document.querySelector('textarea.notes');
  if (notes) {
    notes.value = m.notes || '';
    let t;
    notes.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { m.notes = notes.value; Course.save(); flashSaved(); }, 500);
    });
  }

  const btn = document.querySelector('[data-done]');
  if (btn) {
    const paint = () => {
      btn.classList.toggle('is-done', m.done);
      btn.textContent = m.done ? 'Модуль пройдено ✓' : 'Позначити модуль пройденим';
    };
    paint();
    btn.addEventListener('click', () => { m.done = !m.done; Course.save(); paint(); flashSaved(); });
  }

  const reset = document.querySelector('[data-reset-module]');
  if (reset) {
    reset.addEventListener('click', () => {
      if (!confirm('Скинути прогрес цього модуля?')) return;
      Course.resetModule(id);
      location.reload();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('sheet');
  if (sheet) { renderSheet(sheet); renderMeter(); }
  initModule();
});
