import './style.css';
import { db } from './db';
import { calibrationSummary, createId, GRADE_SCORES, scoreRecall, suggestedInterval } from './logic';
import type { AppData, Card, Grade, Review } from './types';

type Route = 'home' | 'review' | 'cards' | 'insights' | 'settings' | 'privacy' | 'terms';
type ReviewStage = 'recall' | 'grade' | 'result';

const app = document.querySelector<HTMLDivElement>('#app')!;
let cards: Card[] = [];
let reviews: Review[] = [];
let route: Route = pathToRoute(location.pathname);
let sessionCards: Card[] = [];
let sessionIndex = 0;
let reviewStage: ReviewStage = 'recall';
let typedRecall = '';
let lastReview: Review | null = null;
let online = navigator.onLine;

function pathToRoute(path: string): Route {
  const candidate = path.replace(/^\//, '').split('/')[0] as Route;
  return ['review', 'cards', 'insights', 'settings', 'privacy', 'terms'].includes(candidate) ? candidate : 'home';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function shell(content: string): string {
  const nav = (name: Route, label: string) => `<a href="/${name === 'home' ? '' : name}" data-link ${route === name ? 'aria-current="page"' : ''}>${label}</a>`;
  return `
    <header class="site-header">
      <a class="brand" href="/" data-link aria-label="Recall Calibrator home">
        <img src="/icons/mark.svg" width="40" height="40" alt="" />
        <span>Recall<br><b>Calibrator</b></span>
      </a>
      <nav aria-label="Main navigation">
        ${nav('review', 'Review')}${nav('cards', 'Cards')}${nav('insights', 'Insights')}${nav('settings', 'Data')}
      </nav>
      <span class="network ${online ? '' : 'is-offline'}" role="status">${online ? 'Local-first' : 'Offline · changes safe'}</span>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer>
      <p>Your answers stay on this device. <a href="/privacy" data-link>Privacy</a> · <a href="/terms" data-link>Terms</a></p>
      <p>Original AI-generated collage · v1.0</p>
    </footer>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>`;
}

function homeView(): string {
  const summary = calibrationSummary(reviews);
  const primary = cards.length ? '<a class="button primary" href="/review" data-link>Start a sample <span aria-hidden="true">→</span></a>' : '<a class="button primary" href="/cards" data-link>Add your first card <span aria-hidden="true">→</span></a>';
  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A second opinion for your SRS signal</p>
        <h1>Did you recall it—or just feel familiar?</h1>
        <p class="lede">Type what you remember before revealing the answer. Then compare that evidence with the grade you would send to your scheduler.</p>
        <div class="actions">${primary}<a class="button quiet" href="/insights" data-link>See how it works</a></div>
        <p class="privacy-note"><span aria-hidden="true">◎</span> No account. No cloud. Deterministic matching you can inspect.</p>
      </div>
      <figure class="hero-art">
        <picture><source media="(max-width: 640px)" srcset="/assets/memory-press-720.webp"><img src="/assets/memory-press.webp" width="1200" height="800" alt="Two offset risograph flashcards, one with a check and one with a question mark, aligned against registration marks" fetchpriority="high" decoding="async"></picture>
        <figcaption>Two impressions. One honest signal.</figcaption>
      </figure>
    </section>
    <section class="workbench" aria-labelledby="workbench-title">
      <div><p class="eyebrow">Today at the press</p><h2 id="workbench-title">Your calibration workbench</h2></div>
      <div class="metric-strip">
        <div><strong>${cards.length}</strong><span>cards ready</span></div>
        <div><strong>${reviews.length}</strong><span>samples made</span></div>
        <div><strong>${reviews.length ? `${summary.score}%` : '—'}</strong><span>signal alignment</span></div>
      </div>
      ${cards.length ? `<p class="next-note">${reviews.length < 8 ? `${8 - reviews.length} more sample${8 - reviews.length === 1 ? '' : 's'} until your first trend.` : summary.improvement !== null ? `${Math.abs(summary.improvement).toFixed(0)}% ${summary.improvement >= 0 ? 'less' : 'more'} grade gap in your recent half.` : ''}</p>` : `<div class="empty-inline"><p>Your workbench is empty. Add cards manually or load three safe example cards to try the full loop.</p><button class="text-button" id="load-samples">Load example cards</button></div>`}
    </section>
    <section class="three-pass" aria-labelledby="method-title">
      <p class="eyebrow">The three-pass check</p><h2 id="method-title">Measure the grade, not your worth.</h2>
      <ol><li><b>01 · Impression</b><span>Type exact words or configured keywords from memory.</span></li><li><b>02 · Reveal</b><span>Inspect the answer, then choose Again, Hard, Good, or Easy.</span></li><li><b>03 · Registration</b><span>See whether the two signals align and export the interval.</span></li></ol>
      <p class="disclaimer">This is a recall proxy, not a learning diagnosis. It cannot judge nuance, reasoning quality, or long-form answers.</p>
    </section>`;
}

function currentCard(): Card | undefined { return sessionCards[sessionIndex]; }

function reviewView(): string {
  if (!cards.length) return `
    <section class="page-head"><p class="eyebrow">Review press</p><h1>No cards are set yet.</h1><p class="lede">Add one prompt and its accepted answer before making a recall sample.</p><a class="button primary" href="/cards" data-link>Add a card</a></section>`;
  if (!sessionCards.length) return `
    <section class="page-head review-intro"><p class="eyebrow">Review press · ${cards.length} card${cards.length === 1 ? '' : 's'} ready</p><h1>Make an honest impression.</h1><p class="lede">You’ll type first, see the answer second, and grade last. Matching ignores case, accents, and punctuation.</p>
    <div class="paper-panel"><label for="sample-count">Cards in this sample</label><select id="sample-count">${[5,10,20].map((n) => `<option value="${Math.min(n, cards.length)}">${Math.min(n, cards.length)}</option>`).filter((v,i,a)=>a.indexOf(v)===i).join('')}</select><button class="button primary" id="begin-review">Start review</button></div></section>`;
  const card = currentCard();
  if (!card) return `
    <section class="page-head"><p class="eyebrow">Sample complete</p><h1>The ink has settled.</h1><p class="lede">You recorded ${sessionCards.length} new calibration sample${sessionCards.length === 1 ? '' : 's'}.</p><div class="actions"><a class="button primary" href="/insights" data-link>Read your signal</a><button class="button quiet" id="restart-review">Start another sample</button></div></section>`;
  const progress = Math.round(((sessionIndex + (reviewStage === 'result' ? 1 : 0)) / sessionCards.length) * 100);
  const score = scoreRecall(card, typedRecall);
  return `
    <section class="review-shell">
      <div class="review-top"><div><p class="eyebrow">Card ${sessionIndex + 1} of ${sessionCards.length}</p><h1>${reviewStage === 'recall' ? 'Make your impression.' : reviewStage === 'grade' ? 'Grade your own recall.' : 'Check the registration.'}</h1></div><div class="progress" aria-label="${progress}% of sample complete"><span style="width:${progress}%"></span></div></div>
      <article class="prompt-sheet">
        <p class="sheet-label">Prompt</p><h2>${escapeHtml(card.prompt)}</h2>
        ${reviewStage === 'recall' ? recallForm(card) : reviewStage === 'grade' ? gradeForm(card, score) : resultView(card)}
      </article>
      <p class="keyboard-note">Keyboard: <kbd>Tab</kbd> moves · <kbd>Enter</kbd> confirms</p>
    </section>`;
}

function recallForm(card: Card): string {
  return `<form id="recall-form" class="recall-form"><label for="typed-recall">What can you retrieve?</label><textarea id="typed-recall" name="recall" rows="4" required autocomplete="off" spellcheck="false" aria-describedby="matching-note">${escapeHtml(typedRecall)}</textarea><p id="matching-note" class="field-note">${card.matchMode === 'exact' ? `Exact mode · ${card.answers.length} accepted answer${card.answers.length === 1 ? '' : 's'}` : `Keyword mode · all ${card.keywords.length} keywords make a match`}</p><button class="button primary" type="submit">Reveal answer</button></form>`;
}

function gradeForm(card: Card, score: ReturnType<typeof scoreRecall>): string {
  return `<div class="reveal-block"><p class="sheet-label">Accepted answer</p><p class="answer">${escapeHtml(card.answers[0])}</p>${card.answers.length > 1 ? `<p class="field-note">Also accepted: ${card.answers.slice(1).map(escapeHtml).join(' · ')}</p>` : ''}</div>
    <div class="typed-block"><p class="sheet-label">Your typed recall · proxy sealed</p><p>${escapeHtml(typedRecall)}</p><span class="sealed" aria-label="Recall proxy recorded">Recorded</span></div>
    <fieldset class="grade-field"><legend>Without changing your answer, what would you press in your SRS?</legend><div class="grade-grid">${(['again','hard','good','easy'] as Grade[]).map((grade, index) => `<button type="button" class="grade ${grade}" data-grade="${grade}"><span>${index + 1}</span><b>${grade[0].toUpperCase() + grade.slice(1)}</b><small>${grade === 'again' ? 'No retrieval' : grade === 'hard' ? 'Strained' : grade === 'good' ? 'Solid' : 'Immediate'}</small></button>`).join('')}</div></fieldset>
    <p class="sr-only">Typed-recall proxy is ${score.label}; it stays hidden until you grade.</p>`;
}

function resultView(card: Card): string {
  if (!lastReview) return '';
  const proxyNames = { match: 'Match', partial: 'Partial', miss: 'Miss' };
  const aligned = lastReview.gap <= 0.25;
  const direction = lastReview.gradeScore > lastReview.proxyScore ? 'Your grade was more generous than the typed evidence.' : lastReview.gradeScore < lastReview.proxyScore ? 'Your grade was harsher than the typed evidence.' : 'Your grade and typed evidence agree.';
  return `<div class="registration ${aligned ? 'aligned' : 'offset'}">
      <div class="stamp"><span>Typed proxy</span><strong>${proxyNames[lastReview.proxyLabel]}</strong><small>${Math.round(lastReview.proxyScore * 100)} / 100</small></div>
      <div class="stamp self"><span>Your grade</span><strong>${lastReview.grade[0].toUpperCase() + lastReview.grade.slice(1)}</strong><small>${Math.round(lastReview.gradeScore * 100)} / 100</small></div>
    </div>
    <div class="result-note"><p class="eyebrow">${aligned ? 'Registered' : 'Offset detected'}</p><h2>${aligned ? 'Your signals aligned.' : direction}</h2><p>${direction} This measures this one response, not your ability.</p></div>
    <div class="interval"><div><span>Proxy-led next interval</span><strong>${lastReview.suggestedIntervalDays} day${lastReview.suggestedIntervalDays === 1 ? '' : 's'}</strong></div><p>Transparent rule: ${lastReview.proxyScore === 0 ? 'a miss resets to 1 day' : lastReview.proxyScore === 0.5 ? 'partial recall multiplies the current interval by 1.2' : 'a match multiplies the current interval by 2.5'}.</p></div>
    <button class="button primary" id="next-card">${sessionIndex + 1 === sessionCards.length ? 'Finish sample' : 'Next card'} <span aria-hidden="true">→</span></button>`;
}

function cardsView(): string {
  return `
    <section class="page-head split-head"><div><p class="eyebrow">Card bench</p><h1>Set the answer plate.</h1><p class="lede">Define what counts before you test yourself. Exact mode accepts a complete phrase; keyword mode requires each configured keyword.</p></div><button class="button quiet" id="load-samples" ${cards.length ? '' : ''}>Load examples</button></section>
    <section class="card-layout">
      <form id="card-form" class="paper-panel card-form">
        <h2>Add a card</h2>
        <div class="field"><label for="prompt">Prompt</label><textarea id="prompt" name="prompt" rows="3" required></textarea></div>
        <div class="field"><label for="answers">Accepted answer${'<span>One per line</span>'}</label><textarea id="answers" name="answers" rows="4" required aria-describedby="answer-help"></textarea><p id="answer-help" class="field-note">The first line is shown as the canonical answer.</p></div>
        <fieldset><legend>Matching rule</legend><div class="radio-row"><label><input type="radio" name="matchMode" value="exact" checked> Exact answer</label><label><input type="radio" name="matchMode" value="keywords"> Required keywords</label></div></fieldset>
        <div class="field" id="keyword-field" hidden><label for="keywords">Required keywords <span>Comma-separated</span></label><input id="keywords" name="keywords" type="text"><p class="field-note">Every keyword must appear as a complete word. Partial matches are reported separately.</p></div>
        <div class="field compact"><label for="interval">Current interval <span>days</span></label><input id="interval" name="interval" type="number" min="1" max="36500" value="1" required></div>
        <p id="card-error" class="form-error" role="alert"></p><button class="button primary" type="submit">Add card</button>
      </form>
      <div class="card-list-wrap"><div class="section-line"><h2>Your cards</h2><span>${cards.length} total</span></div>
        ${cards.length ? `<ul class="card-list">${cards.map((card) => `<li><div><p>${escapeHtml(card.prompt)}</p><span>${card.matchMode === 'exact' ? `${card.answers.length} accepted answer${card.answers.length === 1 ? '' : 's'}` : `${card.keywords.length} required keyword${card.keywords.length === 1 ? '' : 's'}`} · ${card.intervalDays}d interval</span></div><button class="icon-button delete-card" data-card-id="${card.id}" aria-label="Delete card: ${escapeHtml(card.prompt)}">×</button></li>`).join('')}</ul>` : `<div class="empty-paper"><span aria-hidden="true">＋</span><p>No cards yet. Add one here, or load the examples to feel the review loop.</p></div>`}
      </div>
    </section>`;
}

function insightsView(): string {
  const summary = calibrationSummary(reviews);
  const generous = reviews.filter((r) => r.gradeScore - r.proxyScore > 0.25).length;
  const harsh = reviews.filter((r) => r.proxyScore - r.gradeScore > 0.25).length;
  const aligned = reviews.length - generous - harsh;
  return `
    <section class="page-head"><p class="eyebrow">Registration report</p><h1>${reviews.length ? 'Read your review signal.' : 'Your signal needs impressions.'}</h1><p class="lede">Calibration is the gap between what you typed and the grade you chose. Smaller gaps mean your scheduler receives a more consistent signal.</p></section>
    ${reviews.length ? `<section class="insight-grid" aria-label="Calibration summary"><div class="score-sheet"><span>Signal alignment</span><strong>${summary.score}<small>/100</small></strong><p>${summary.score >= 80 ? 'Closely registered' : summary.score >= 60 ? 'Some offset remains' : 'Wide offset—keep sampling'}</p></div><div class="bias-sheet"><h2>Your tendency</h2><strong>${Math.abs(summary.bias * 100).toFixed(0)} points ${summary.bias > 0.04 ? 'generous' : summary.bias < -0.04 ? 'harsh' : 'balanced'}</strong><p>${summary.bias > 0.04 ? 'You tend to grade above your typed recall.' : summary.bias < -0.04 ? 'You tend to grade below your typed recall.' : 'Your average grade and recall proxy are close.'}</p></div></section>
      <section class="report-section"><div class="section-line"><div><p class="eyebrow">All impressions</p><h2>Where your grades land</h2></div><span>${reviews.length} samples</span></div><div class="bar-report" role="img" aria-label="${aligned} aligned, ${generous} generous, and ${harsh} harsh grades"><div><span>Aligned</span><i style="width:${(aligned/reviews.length)*100}%"></i><b>${aligned}</b></div><div><span>Generous</span><i class="red" style="width:${(generous/reviews.length)*100}%"></i><b>${generous}</b></div><div><span>Harsh</span><i class="ochre" style="width:${(harsh/reviews.length)*100}%"></i><b>${harsh}</b></div></div></section>
      <section class="report-section"><div class="section-line"><div><p class="eyebrow">Recent record</p><h2>Review history</h2></div>${summary.improvement === null ? `<span>${Math.max(0, 8-reviews.length)} to first trend</span>` : `<span>${summary.improvement >= 0 ? '↓' : '↑'} ${Math.abs(summary.improvement).toFixed(0)}% recent gap</span>`}</div><div class="table-scroll"><table><thead><tr><th>Date</th><th>Prompt</th><th>Typed</th><th>Grade</th><th>Gap</th><th>Interval</th></tr></thead><tbody>${[...reviews].reverse().slice(0,20).map((r) => `<tr><td>${formatDate(r.reviewedAt)}</td><td>${escapeHtml(r.prompt)}</td><td><span class="status ${r.proxyLabel}">${r.proxyLabel}</span></td><td>${r.grade}</td><td>${Math.round(r.gap*100)} pts</td><td>${r.suggestedIntervalDays}d</td></tr>`).join('')}</tbody></table></div></section>` : `<section class="empty-report"><div class="registration-mark" aria-hidden="true">＋</div><h2>No comparisons yet</h2><p>Complete one typed review and self-grade to print your first result here.</p><a class="button primary" href="/review" data-link>${cards.length ? 'Start reviewing' : 'Set up a card'}</a></section>`}
    <p class="disclaimer report-disclaimer">Recall Calibrator reports deterministic response patterns. It does not diagnose memory, mastery, or a learning condition.</p>`;
}

function settingsView(): string {
  return `
    <section class="page-head"><p class="eyebrow">Data drawer</p><h1>You own every impression.</h1><p class="lede">Everything lives in this browser’s IndexedDB. Export before clearing site data or changing devices.</p></section>
    <section class="settings-grid">
      <div class="paper-panel"><h2>Take a copy</h2><p>JSON restores the full app. CSV opens review history and proxy-led intervals in a spreadsheet.</p><div class="stack-actions"><button class="button primary" id="export-json">Export JSON</button><button class="button quiet" id="export-csv" ${reviews.length ? '' : 'disabled'}>Export review CSV</button></div></div>
      <div class="paper-panel"><h2>Bring data back</h2><p>Importing a v1 JSON export replaces the data currently on this device.</p><label class="file-button">Choose JSON export<input type="file" id="import-json" accept="application/json,.json"></label><p id="import-status" class="field-note" role="status"></p></div>
      <div class="paper-panel danger-panel"><h2>Clear the press</h2><p>Delete ${cards.length} cards and ${reviews.length} review samples from this browser. Export first if you need a copy.</p><button class="button danger" id="clear-data">Delete local data</button></div>
    </section>`;
}

function legalView(kind: 'privacy' | 'terms'): string {
  return kind === 'privacy' ? `<article class="legal"><p class="eyebrow">Plain-language policy · 28 August 2026</p><h1>Privacy</h1><p class="lede">Your card content and review history remain in your browser. Recall Calibrator has no account system, analytics, ad trackers, or remote data store.</p><h2>What is stored</h2><p>Cards, accepted answers, required keywords, typed recall, self-grades, suggested intervals, and settings are stored in IndexedDB on this device. The service worker caches application files for offline use.</p><h2>What leaves your device</h2><p>Nothing in the app sends your learning data to us or a third party. Your browser or hosting provider may process ordinary technical request logs when downloading the app shell; those logs do not include your locally stored cards or answers.</p><h2>Your control</h2><p>Use the Data page to export JSON or CSV and to delete local data. Clearing browser site data also removes it. Uninstalling the PWA may not clear browser storage automatically.</p><h2>Contact</h2><p>For privacy questions, contact the site operator through <a href="https://sociobot.in">sociobot.in</a>.</p></article>` : `<article class="legal"><p class="eyebrow">Plain-language terms · 28 August 2026</p><h1>Terms</h1><p class="lede">Recall Calibrator is a free, local utility for comparing typed recall with your own review grade.</p><h2>Not a diagnosis</h2><p>Results are deterministic recall proxies, not measures of intelligence, mastery, health, or a learning condition. They may not capture synonyms, nuance, reasoning, or valid long-form answers.</p><h2>Your responsibility</h2><p>You choose accepted answers and matching rules. Check exported intervals before importing them into another tool. Keep your own export if the data matters to you.</p><h2>Availability</h2><p>The software is provided “as is,” without warranties. Features may change, and local browser data can be lost through device failure or site-data clearing.</p><h2>License</h2><p>The application source is available under the MIT License. Generated illustration assets were created for this product.</p></article>`;
}

function render(focusMain = false) {
  const views: Record<Route, () => string> = { home: homeView, review: reviewView, cards: cardsView, insights: insightsView, settings: settingsView, privacy: () => legalView('privacy'), terms: () => legalView('terms') };
  app.innerHTML = shell(views[route]());
  bindEvents();
  if (focusMain) document.querySelector<HTMLElement>('#main')?.focus();
  if (route === 'review' && reviewStage === 'recall' && sessionCards.length) document.querySelector<HTMLTextAreaElement>('#typed-recall')?.focus();
}

function navigate(path: string) {
  history.pushState({}, '', path);
  route = pathToRoute(path);
  if (route !== 'review') resetSession();
  render(true);
}

function resetSession() { sessionCards = []; sessionIndex = 0; reviewStage = 'recall'; typedRecall = ''; lastReview = null; }

function toast(message: string, action?: { label: string; callback: () => void }) {
  const region = document.querySelector<HTMLDivElement>('#toast-region');
  if (!region) return;
  region.innerHTML = `<div class="toast"><span>${escapeHtml(message)}</span>${action ? `<button id="toast-action">${escapeHtml(action.label)}</button>` : ''}</div>`;
  if (action) region.querySelector('button')?.addEventListener('click', action.callback);
  else setTimeout(() => { if (region.isConnected) region.innerHTML = ''; }, 4000);
}

async function loadSamples() {
  const now = new Date().toISOString();
  const samples: Omit<Card, 'id'>[] = [
    { prompt: 'What is the capital of Japan?', answers: ['Tokyo'], keywords: [], matchMode: 'exact', intervalDays: 3, createdAt: now, updatedAt: now },
    { prompt: 'Name the two inputs of photosynthesis.', answers: ['Carbon dioxide and water'], keywords: ['carbon dioxide', 'water'], matchMode: 'keywords', intervalDays: 5, createdAt: now, updatedAt: now },
    { prompt: 'What does HTTP stand for?', answers: ['Hypertext Transfer Protocol', 'Hyper Text Transfer Protocol'], keywords: [], matchMode: 'exact', intervalDays: 7, createdAt: now, updatedAt: now },
  ];
  for (const sample of samples) {
    if (!cards.some((card) => card.prompt === sample.prompt)) await db.putCard({ ...sample, id: createId('card') });
  }
  await refreshData(); render(); toast('Example cards added.');
}

async function deleteCard(id: string) {
  const card = cards.find((item) => item.id === id);
  if (!card || !confirm(`Delete “${card.prompt}”? Existing review history will be kept.`)) return;
  await db.deleteCard(id); await refreshData(); render(); toast('Card deleted; review history kept.');
}

async function saveGrade(grade: Grade) {
  const card = currentCard(); if (!card) return;
  const proxy = scoreRecall(card, typedRecall);
  const gradeScore = GRADE_SCORES[grade];
  const interval = suggestedInterval(card.intervalDays, proxy.score);
  lastReview = { id: createId('review'), cardId: card.id, prompt: card.prompt, typedRecall, proxyScore: proxy.score, proxyLabel: proxy.label, matchedKeywords: proxy.matchedKeywords, grade, gradeScore, gap: Math.abs(gradeScore - proxy.score), suggestedIntervalDays: interval, reviewedAt: new Date().toISOString() };
  await db.putReview(lastReview);
  await db.putCard({ ...card, intervalDays: interval, updatedAt: new Date().toISOString() });
  reviews.push(lastReview); cards = cards.map((item) => item.id === card.id ? { ...item, intervalDays: interval } : item);
  reviewStage = 'result'; render();
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function csvCell(value: unknown) { return `"${String(value).replaceAll('"', '""')}"`; }

function bindEvents() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => link.addEventListener('click', (event) => { if (!event.metaKey && !event.ctrlKey && link.origin === location.origin) { event.preventDefault(); navigate(link.pathname); } }));
  document.querySelectorAll<HTMLButtonElement>('#load-samples').forEach((button) => button.addEventListener('click', () => void loadSamples()));
  document.querySelector('#begin-review')?.addEventListener('click', () => {
    const count = Number((document.querySelector('#sample-count') as HTMLSelectElement).value);
    const counts = new Map(cards.map((card) => [card.id, reviews.filter((review) => review.cardId === card.id).length]));
    sessionCards = [...cards].sort((a,b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.updatedAt.localeCompare(b.updatedAt)).slice(0, count);
    sessionIndex = 0; reviewStage = 'recall'; typedRecall = ''; render();
  });
  document.querySelector('#restart-review')?.addEventListener('click', () => { resetSession(); render(); });
  document.querySelector<HTMLFormElement>('#recall-form')?.addEventListener('submit', (event) => {
    event.preventDefault(); typedRecall = (new FormData(event.currentTarget).get('recall') as string).trim();
    if (!typedRecall) return; reviewStage = 'grade'; render(); document.querySelector<HTMLButtonElement>('[data-grade]')?.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach((button) => button.addEventListener('click', () => void saveGrade(button.dataset.grade as Grade)));
  document.querySelector('#next-card')?.addEventListener('click', () => { sessionIndex += 1; reviewStage = 'recall'; typedRecall = ''; lastReview = null; render(); });
  document.querySelectorAll<HTMLButtonElement>('.delete-card').forEach((button) => button.addEventListener('click', () => void deleteCard(button.dataset.cardId!)));
  document.querySelectorAll<HTMLInputElement>('input[name="matchMode"]').forEach((input) => input.addEventListener('change', () => { const field = document.querySelector<HTMLElement>('#keyword-field')!; field.hidden = input.value !== 'keywords' || !input.checked; }));
  document.querySelector<HTMLFormElement>('#card-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const now = new Date().toISOString();
    const prompt = String(data.get('prompt')).trim(); const answers = String(data.get('answers')).split('\n').map((v) => v.trim()).filter(Boolean); const mode = String(data.get('matchMode')) as Card['matchMode']; const keywords = String(data.get('keywords')).split(',').map((v) => v.trim()).filter(Boolean);
    const error = document.querySelector('#card-error')!;
    if (!prompt || !answers.length) { error.textContent = 'Add both a prompt and at least one accepted answer.'; return; }
    if (mode === 'keywords' && !keywords.length) { error.textContent = 'Add at least one required keyword, or choose exact answer.'; return; }
    await db.putCard({ id: createId('card'), prompt, answers, keywords, matchMode: mode, intervalDays: Number(data.get('interval')) || 1, createdAt: now, updatedAt: now });
    await refreshData(); render(); toast('Card added to the press.');
  });
  document.querySelector('#export-json')?.addEventListener('click', async () => download(`recall-calibrator-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(await db.exportData(), null, 2), 'application/json'));
  document.querySelector('#export-csv')?.addEventListener('click', () => {
    const heads = ['reviewed_at','prompt','typed_recall','proxy_result','proxy_score','self_grade','grade_score','gap','suggested_interval_days'];
    const rows = reviews.map((r) => [r.reviewedAt,r.prompt,r.typedRecall,r.proxyLabel,r.proxyScore,r.grade,r.gradeScore,r.gap,r.suggestedIntervalDays]);
    download(`recall-intervals-${new Date().toISOString().slice(0,10)}.csv`, [heads,...rows].map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv');
  });
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', async (event) => {
    const status = document.querySelector('#import-status')!; const file = event.currentTarget.files?.[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()) as AppData; if (!confirm(`Replace local data with ${data.cards?.length ?? 0} cards and ${data.reviews?.length ?? 0} reviews?`)) return; await db.importData(data); await refreshData(); render(); toast('Import complete.'); } catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not read this file.'; }
  });
  document.querySelector('#clear-data')?.addEventListener('click', async () => { if (!confirm(`Delete ${cards.length} cards and ${reviews.length} review samples from this device? This cannot be undone.`)) return; await db.clearAll(); await refreshData(); render(); toast('Local data deleted.'); });
}

async function refreshData() {
  [cards, reviews] = await Promise.all([db.allCards(), db.allReviews()]);
  reviews.sort((a,b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/service-worker.js').then((registration) => {
    if (registration.waiting) toast('A fresh edition is ready.', { label: 'Update', callback: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }) });
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting && navigator.serviceWorker.controller) toast('A fresh edition is ready.', { label: 'Update', callback: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }) }); }));
  }).catch(() => toast('Offline installation is unavailable in this browser.'));
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wasControlled && !refreshing) { refreshing = true; location.reload(); } });
}

window.addEventListener('popstate', () => { route = pathToRoute(location.pathname); resetSession(); render(true); });
window.addEventListener('online', () => { online = true; render(); toast('Back online. Local work is unchanged.'); });
window.addEventListener('offline', () => { online = false; render(); toast('You are offline. Reviews still work.'); });

try { await refreshData(); render(); registerServiceWorker(); }
catch { app.innerHTML = shell('<section class="page-head"><p class="eyebrow">Storage error</p><h1>The local drawer would not open.</h1><p class="lede">Your browser may block IndexedDB in this mode. Allow site storage, then reload.</p><button class="button primary" onclick="location.reload()">Try again</button></section>'); }
