const app = document.querySelector('#app');
const LETTERS = ['A', 'B', 'C', 'D'];
let seriesData = [];
let state = { screen: 'home', seriesIndex: null, questionIndex: 0, answers: [], filter: 'all' };

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentSeries = () => seriesData[state.seriesIndex];
const correctCount = () => state.answers.reduce((count, answer, i) => count + (answer === currentSeries().questions[i].answer ? 1 : 0), 0);

async function init() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error('questions.json unavailable');
    seriesData = await response.json();
    renderHome();
  } catch (error) {
    app.innerHTML = '<div class="hero"><p class="eyebrow">Oups</p><h1>Les séries ne se chargent pas.</h1><p class="hero-copy">Rechargez la page dans quelques instants.</p></div>';
  }
}

document.querySelector('#brand-home').addEventListener('click', event => {
  event.preventDefault();
  renderHome();
});

function renderHome() {
  state = { screen: 'home', seriesIndex: null, questionIndex: 0, answers: [], filter: 'all' };
  document.title = 'Cap Civique — Réviser le test civique';
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Le test civique, à votre rythme</p>
      <h1>Des repères clairs.<br><em>Une série à la fois.</em></h1>
      <p class="hero-copy">Choisissez la série annoncée par votre animateur, répondez aux 40 questions, puis consultez votre score et la correction complète.</p>
    </section>
    <div class="section-head"><h2>Choisir une série</h2><span>10 séries · 40 questions chacune</span></div>
    <section class="series-grid" aria-label="Séries disponibles">
      ${seriesData.map((series, i) => `
        <button class="series-card" data-series="${i}">
          <span class="card-left"><span class="card-num">${String(i + 1).padStart(2, '0')}</span><span><span class="card-title">${escapeHtml(series.title.replace(/^Série \d+\s*[—-]\s*/, ''))}</span><span class="card-meta">40 questions · QCM</span></span></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>`).join('')}
    </section>`;
  app.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => startSeries(Number(button.dataset.series))));
}

function startSeries(index) {
  state = { screen: 'quiz', seriesIndex: index, questionIndex: 0, answers: Array(40).fill(null), filter: 'all' };
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderQuestion() {
  const series = currentSeries();
  const q = series.questions[state.questionIndex];
  const n = state.questionIndex;
  const percent = Math.round((n / series.questions.length) * 100);
  app.innerHTML = `
    <section class="quiz-wrap">
      <div class="quiz-top"><button class="back" id="back-home">← Toutes les séries</button><span class="quiz-label">${escapeHtml(series.title)}</span></div>
      <div class="progress-track" role="progressbar" aria-valuenow="${n + 1}" aria-valuemin="1" aria-valuemax="40" aria-label="Progression"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="progress-row"><span>Question ${String(n + 1).padStart(2, '0')} / 40</span><span>${40 - n} restante${n === 39 ? '' : 's'}</span></div>
      <div class="question-kicker">Question ${n + 1}</div>
      <h1 class="question-title">${escapeHtml(q.question)}</h1>
      <div class="choices" role="group" aria-label="Choisissez une réponse">
        ${q.options.map((option, i) => `<button class="choice ${state.answers[n] === LETTERS[i] ? 'selected' : ''}" data-answer="${LETTERS[i]}" aria-pressed="${state.answers[n] === LETTERS[i]}"><span class="letter">${LETTERS[i]}</span><span>${escapeHtml(option)}</span></button>`).join('')}
      </div>
      <div class="quiz-actions">
        <button class="btn btn-quiet" id="previous" ${n === 0 ? 'disabled' : ''}>← Précédente</button>
        <button class="btn btn-primary" id="next" ${state.answers[n] === null ? 'disabled' : ''}>${n === 39 ? 'Voir mon résultat' : 'Question suivante →'}</button>
      </div>
    </section>`;
  app.querySelector('#back-home').addEventListener('click', renderHome);
  app.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    state.answers[n] = button.dataset.answer;
    renderQuestion();
  }));
  app.querySelector('#previous').addEventListener('click', () => { state.questionIndex--; renderQuestion(); });
  app.querySelector('#next').addEventListener('click', () => {
    if (state.answers[n] === null) return;
    if (n === 39) renderResults();
    else { state.questionIndex++; renderQuestion(); }
  });
}

function renderResults() {
  state.screen = 'results';
  state.filter = 'all';
  document.title = `Résultat — ${currentSeries().title} | Cap Civique`;
  const score = correctCount();
  const message = score >= 32 ? 'Très bon travail, continuez comme ça.' : score >= 20 ? 'Bonne base. La correction vous aidera à progresser.' : 'Chaque série est une occasion de progresser.';
  app.innerHTML = `
    <section class="result-wrap">
      <div class="result-head">
        <div><p class="eyebrow">Série terminée</p><h1 class="result-title">Votre résultat</h1><p class="result-sub">${escapeHtml(currentSeries().title)} · ${message}</p></div>
        <div class="score-badge" aria-label="${score} bonnes réponses sur 40"><span class="score-number">${score}<small style="font-size:15px;color:#6b8574">/40</small></span><span class="score-caption">bonnes réponses</span></div>
      </div>
      <div class="result-actions"><button class="btn btn-primary" id="retry">Refaire cette série</button><button class="btn btn-quiet" id="series-home">Choisir une autre série</button></div>
      <div class="correction-head"><h2>Correction</h2><span class="filter-label">40 réponses · affichage complet</span></div>
      <div class="review-list" id="review-list"></div>
    </section>`;
  app.querySelector('#retry').addEventListener('click', () => startSeries(state.seriesIndex));
  app.querySelector('#series-home').addEventListener('click', renderHome);
  renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderReview() {
  const list = app.querySelector('#review-list');
  const questions = currentSeries().questions;
  list.innerHTML = questions.map((q, i) => {
    const picked = state.answers[i];
    const correct = picked === q.answer;
    const expected = q.options[LETTERS.indexOf(q.answer)];
    const chosen = picked ? q.options[LETTERS.indexOf(picked)] : null;
    return `<article class="review">
      <div class="review-top"><span class="status ${correct ? 'good' : 'bad'}" aria-label="${correct ? 'Correct' : 'Incorrect'}">${correct ? '✓' : '×'}</span><h3 class="review-q">${i + 1}. ${escapeHtml(q.question)}</h3></div>
      <p class="review-answer">Votre réponse : ${chosen ? `<span class="${correct ? '' : 'wrong'}">${picked} — ${escapeHtml(chosen)}</span>` : '<span class="wrong">Aucune réponse</span>'}<br><strong>Réponse attendue : ${q.answer} — ${escapeHtml(expected)}</strong></p>
    </article>`;
  }).join('');
}

init();
