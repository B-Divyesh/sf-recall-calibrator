import './style.css';
import { createDatabase, db, validateImportData } from './db';
import { calibrationSummary, createId, GRADE_SCORES, scoreRecall, suggestedInterval } from './logic';
import type { AppData, Card, Grade, Review } from './types';

type Route = 'home' | 'review' | 'cards' | 'insights' | 'settings' | 'privacy' | 'terms' | 'demo' | 'notFound';
type ReviewStage = 'recall' | 'grade' | 'result';

const app = document.querySelector<HTMLDivElement>('#app')!;
const demoDb = createDatabase('demo:recall-calibrator');
let demoMode = isDemoLocation(location.pathname, location.search);
let store = demoMode ? demoDb : db;
let cards: Card[] = [];
let reviews: Review[] = [];
let route: Route = pathToRoute(location.pathname);
let sessionCards: Card[] = [];
let sessionIndex = 0;
let reviewStage: ReviewStage = 'recall';
let typedRecall = '';
let lastReview: Review | null = null;
let online = navigator.onLine;

function isDemoLocation(path: string, search: string) {
  return path === '/demo' || new URLSearchParams(search).get('demo') === '1';
}

function pathToRoute(path: string): Route {
  if (path === '/' || path === '') return 'home';
  const candidate = path.replace(/^\//, '').split('/')[0];
  const known = ['review', 'cards', 'insights', 'settings', 'privacy', 'terms', 'demo'] as const;
  return known.includes(candidate as typeof known[number]) ? candidate as Route : 'notFound';
}

function routePath(name: Exclude<Route, 'notFound'>) {
  const path = name === 'home' ? '/' : `/${name}`;
  return demoMode && name !== 'demo' ? `${path}?demo=1` : path;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function pageInfo(current: Route) {
  const details: Record<Route, { title: string; description: string; label: string }> = {
    home: { title: 'Recall Calibrator — compare recall and grades', description: 'Compare typed recall with self-grades before using a spaced-repetition scheduler.', label: 'Home' },
    review: { title: 'Review recall — Recall Calibrator', description: 'Type recall, choose a self-grade, and compare the two signals locally.', label: 'Review' },
    cards: { title: 'Cards — Recall Calibrator', description: 'Create exact or keyword recall cards for local calibration reviews.', label: 'Cards' },
    insights: { title: 'Insights — Recall Calibrator', description: 'See local calibration, grade tendency, review history, and suggested intervals.', label: 'Insights' },
    settings: { title: 'Data — Recall Calibrator', description: 'Export, restore, or delete local Recall Calibrator data.', label: 'Data' },
    privacy: { title: 'Privacy — Recall Calibrator', description: 'Learn how Recall Calibrator keeps card and review data in your browser.', label: 'Privacy' },
    terms: { title: 'Terms — Recall Calibrator', description: 'Read the plain-language terms for Recall Calibrator.', label: 'Terms' },
    demo: { title: 'Demo — Recall Calibrator', description: 'Try Recall Calibrator with isolated sample cards and review results.', label: 'Demo' },
    notFound: { title: 'Page not found — Recall Calibrator', description: 'Return to Recall Calibrator from this missing page.', label: 'Page not found' },
  };
  return details[current];
}

function setPageMetadata() {
  const info = pageInfo(route);
  document.title = info.title;
  const canonicalPath = route === 'notFound' ? location.pathname : route === 'home' ? '/' : `/${route}`;
  const canonical = new URL(canonicalPath, location.origin).toString();
  document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = info.description;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = canonical;
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!.content = info.title;
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')!.content = info.description;
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content = canonical;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')!.content = info.title;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')!.content = info.description;
}

function shell(content: string): string {
  const nav = (name: 'demo' | 'review' | 'cards' | 'insights', label: string) => `<a href="${routePath(name)}" data-link ${route === name ? 'aria-current="page"' : ''}>${label}</a>`;
  return `
    <header class="site-header">
      <a class="brand" href="${routePath('home')}" data-link aria-label="Recall Calibrator home">
        <img src="/icons/mark.svg" width="40" height="40" alt="" />
        <span>Recall<br><b>Calibrator</b></span>
      </a>
      <nav aria-label="Main navigation">
        ${nav('demo', 'Demo')}${nav('review', 'Review')}${nav('cards', 'Cards')}${nav('insights', 'Insights')}
      </nav>
      <span class="network ${online ? '' : 'is-offline'}" role="status">${online ? 'Stored locally' : 'Offline · changes safe'}</span>
    </header>
    ${demoMode ? `<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><span>Sample cards and reviews use separate local storage.</span><div><button class="text-button" id="reset-demo">Reset demo</button><button class="button quiet" id="start-real">Start for real</button></div></aside>` : ''}
    <main id="main" tabindex="-1">${content}</main>
    <footer>
      <p>Local recall calibration for spaced-repetition reviews. <a href="${routePath('settings')}" data-link>Data</a> · <a href="${routePath('privacy')}" data-link>Privacy</a> · <a href="${routePath('terms')}" data-link>Terms</a></p>
      <p>Built by Param Factory · v1.1</p>
    </footer>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>`;
}

function homeView(): string {
  const summary = calibrationSummary(reviews);
  const nextAction = cards.length
    ? `<a class="button quiet" href="${routePath('review')}" data-link>Review my cards</a>`
    : `<a class="button quiet" href="${routePath('cards')}" data-link>Create my first card</a>`;
  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Recall Calibrator</p>
        <h1>Compare typed recall with your grade.</h1>
        <p class="lede">For spaced-repetition users who want evidence before choosing Again, Hard, Good, or Easy.</p>
        <div class="actions"><a class="button primary" href="/demo" data-link>Try it with sample data</a>${nextAction}</div>
        <p class="action-note">See three cards and eight completed reviews right away.</p>
        <ul class="plain-facts" aria-label="Product facts"><li>Private: cards stay in this browser.</li><li>Offline: works after the first visit.</li><li>Price: free.</li></ul>
      </div>
      <figure class="hero-art">
        <picture><source type="image/webp" srcset="/assets/memory-press-720.webp 720w, /assets/memory-press.webp 1200w" sizes="(max-width: 800px) 92vw, 50vw"><img src="/assets/memory-press.jpg" width="1200" height="800" alt="Two offset flashcards that show a mismatch between recall and a self-grade" fetchpriority="high" decoding="async"></picture>
        <figcaption>Offset cards show why typed recall and a self-grade can differ.</figcaption>
      </figure>
    </section>
    <section class="workbench" aria-labelledby="summary-title">
      <div><p class="eyebrow">Your local summary</p><h2 id="summary-title">Review data on this device</h2></div>
      <div class="metric-strip"><div><strong>${cards.length}</strong><span>cards</span></div><div><strong>${reviews.length}</strong><span>reviews</span></div><div><strong>${reviews.length ? `${summary.score}%` : '—'}</strong><span>alignment</span></div></div>
      <p class="next-note">${cards.length ? reviews.length < 8 ? `${8 - reviews.length} more review${8 - reviews.length === 1 ? '' : 's'} until the first trend.` : 'Open Insights to check recent grade patterns.' : 'Create a card, or use the sample data to see a finished report.'}</p>
    </section>
    <section class="three-pass" aria-labelledby="method-title">
      <p class="eyebrow">How it works</p><h2 id="method-title">Check one recall decision in three steps.</h2>
      <ol><li><b>1. Type recall</b><span>Write the exact answer or required keywords from memory.</span></li><li><b>2. Choose a grade</b><span>Reveal the answer, then choose Again, Hard, Good, or Easy.</span></li><li><b>3. Compare results</b><span>See the match result, grade gap, and suggested interval.</span></li></ol>
    </section>
    <section class="limits" aria-labelledby="limits-title"><h2 id="limits-title">What this does and does not measure</h2><p>It compares a typed answer with your self-grade. It is a recall proxy, not a learning diagnosis. It does not replace your scheduler or grade essays.</p><p>Cards, answers, and reviews stay on this device. You can export or delete them from Data.</p></section>`;
}

function demoView(): string {
  return `
    <section class="page-head demo-head"><p class="eyebrow">Sample data</p><h1>Review sample recall and grades.</h1><p class="lede">Three sample cards and eight completed reviews show the calibration report before you add anything.</p><div class="actions"><a class="button primary" href="${routePath('review')}" data-link>Review a sample card</a><a class="button quiet" href="${routePath('cards')}" data-link>Inspect sample cards</a></div></section>
    ${insightReport()}`;
}

function currentCard(): Card | undefined { return sessionCards[sessionIndex]; }

function reviewView(): string {
  if (!cards.length) return `<section class="page-head"><p class="eyebrow">Review</p><h1>Add a card before reviewing.</h1><p class="lede">Create a prompt and accepted answer, then type recall before choosing your grade.</p><a class="button primary" href="${routePath('cards')}" data-link>Create a card</a></section>`;
  if (!sessionCards.length) return `<section class="page-head review-intro"><p class="eyebrow">Review · ${cards.length} card${cards.length === 1 ? '' : 's'} ready</p><h1>Start a typed recall sample.</h1><p class="lede">Type first. Reveal the answer. Then choose the grade you would send to your scheduler.</p><div class="paper-panel"><label for="sample-count">Cards in this sample</label><select id="sample-count">${[5, 10, 20].map((count) => `<option value="${Math.min(count, cards.length)}">${Math.min(count, cards.length)}</option>`).filter((value, index, values) => values.indexOf(value) === index).join('')}</select><button class="button primary" id="begin-review">Start review</button></div></section>`;
  const card = currentCard();
  if (!card) return `<section class="page-head"><p class="eyebrow">Sample complete</p><h1>Review results are ready.</h1><p class="lede">You recorded ${sessionCards.length} new review${sessionCards.length === 1 ? '' : 's'}.</p><div class="actions"><a class="button primary" href="${routePath('insights')}" data-link>View calibration</a><button class="button quiet" id="restart-review">Start another sample</button></div></section>`;
  const progress = Math.round(((sessionIndex + (reviewStage === 'result' ? 1 : 0)) / sessionCards.length) * 100);
  const heading = reviewStage === 'recall' ? 'Type your recall.' : reviewStage === 'grade' ? 'Choose your SRS grade.' : 'Compare the two signals.';
  return `<section class="review-shell"><div class="review-top"><div><p class="eyebrow">Card ${sessionIndex + 1} of ${sessionCards.length}</p><h1>${heading}</h1></div><progress class="progress" value="${progress}" max="100" aria-label="${progress}% of sample complete">${progress}%</progress></div><article class="prompt-sheet"><p class="sheet-label">Question</p><h2>${escapeHtml(card.prompt)}</h2>${reviewStage === 'recall' ? recallForm(card) : reviewStage === 'grade' ? gradeForm(card) : resultView()}</article><p class="keyboard-note">Keyboard: <kbd>Tab</kbd> moves · <kbd>Enter</kbd> confirms</p></section>`;
}

function recallForm(card: Card): string {
  return `<form id="recall-form" class="recall-form"><label for="typed-recall">What can you retrieve?</label><textarea id="typed-recall" name="recall" rows="4" required autocomplete="off" spellcheck="false" aria-describedby="matching-note">${escapeHtml(typedRecall)}</textarea><p id="matching-note" class="field-note">${card.matchMode === 'exact' ? `Exact mode · ${card.answers.length} accepted answer${card.answers.length === 1 ? '' : 's'}` : `Keyword mode · all ${card.keywords.length} keywords make a match`}</p><button class="button primary" type="submit">Reveal answer</button></form>`;
}

function gradeForm(card: Card): string {
  return `<div class="reveal-block"><p class="sheet-label">Accepted answer</p><p class="answer">${escapeHtml(card.answers[0])}</p>${card.answers.length > 1 ? `<p class="field-note">Also accepted: ${card.answers.slice(1).map(escapeHtml).join(' · ')}</p>` : ''}</div><div class="typed-block"><p class="sheet-label">Your typed recall · result sealed</p><p>${escapeHtml(typedRecall)}</p><span class="sealed" aria-label="Typed recall recorded">Recorded</span></div><fieldset class="grade-field"><legend>Without changing your answer, what would you press in your SRS?</legend><div class="grade-grid">${(['again', 'hard', 'good', 'easy'] as Grade[]).map((grade, index) => `<button type="button" class="grade ${grade}" data-grade="${grade}"><span>${index + 1}</span><b>${grade[0].toUpperCase() + grade.slice(1)}</b><small>${grade === 'again' ? 'No retrieval' : grade === 'hard' ? 'Strained' : grade === 'good' ? 'Solid' : 'Immediate'}</small></button>`).join('')}</div></fieldset>`;
}

function resultView(): string {
  if (!lastReview) return '';
  const proxyNames = { match: 'Match', partial: 'Partial', miss: 'Miss' };
  const aligned = lastReview.gap <= 0.25;
  const direction = lastReview.gradeScore > lastReview.proxyScore ? 'Your grade was more generous than the typed result.' : lastReview.gradeScore < lastReview.proxyScore ? 'Your grade was harsher than the typed result.' : 'Your grade and typed result agree.';
  return `<div class="registration ${aligned ? 'aligned' : 'offset'}"><div class="stamp"><span>Typed result</span><strong>${proxyNames[lastReview.proxyLabel]}</strong><small>${Math.round(lastReview.proxyScore * 100)} / 100</small></div><div class="stamp self"><span>Your grade</span><strong>${lastReview.grade[0].toUpperCase() + lastReview.grade.slice(1)}</strong><small>${Math.round(lastReview.gradeScore * 100)} / 100</small></div></div><div class="result-note"><p class="eyebrow">${aligned ? 'Aligned' : 'Grade gap found'}</p><h2>${aligned ? 'Your grade matched the typed result.' : direction}</h2><p>${direction} This is one recall response, not a measure of ability.</p></div><div class="interval"><div><span>Suggested next interval</span><strong>${lastReview.suggestedIntervalDays} day${lastReview.suggestedIntervalDays === 1 ? '' : 's'}</strong></div><p>Rule used: ${lastReview.proxyScore === 0 ? 'a miss resets to 1 day' : lastReview.proxyScore === 0.5 ? 'partial recall multiplies the current interval by 1.2' : 'a match multiplies the current interval by 2.5'}.</p></div><button class="button primary" id="next-card">${sessionIndex + 1 === sessionCards.length ? 'Finish sample' : 'Next card'} <span aria-hidden="true">→</span></button>`;
}

function cardsView(): string {
  return `<section class="page-head"><p class="eyebrow">Cards</p><h1>Create a card and matching rule.</h1><p class="lede">Use exact answers or required keywords. The rule is visible before every review.</p></section><section class="card-layout"><form id="card-form" class="paper-panel card-form"><h2>Add a card</h2><div class="field"><label for="prompt">Question</label><textarea id="prompt" name="prompt" rows="3" required></textarea></div><div class="field"><label for="answers">Accepted answer <span>One per line</span></label><textarea id="answers" name="answers" rows="4" required aria-describedby="answer-help"></textarea><p id="answer-help" class="field-note">The first line is shown as the accepted answer.</p></div><fieldset><legend>Matching rule</legend><div class="radio-row"><label><input type="radio" name="matchMode" value="exact" checked> Exact answer</label><label><input type="radio" name="matchMode" value="keywords"> Required keywords</label></div></fieldset><div class="field" id="keyword-field" hidden><label for="keywords">Required keywords <span>Comma-separated</span></label><input id="keywords" name="keywords" type="text"><p class="field-note">Every keyword must appear as a complete word. Partial recall is reported separately.</p></div><div class="field compact"><label for="interval">Current interval <span>days</span></label><input id="interval" name="interval" type="number" min="1" max="36500" value="1" required></div><p id="card-error" class="form-error" role="alert"></p><button class="button primary" type="submit">Add card</button></form><div class="card-list-wrap"><div class="section-line"><h2>Your cards</h2><span>${cards.length} total</span></div>${cards.length ? `<ul class="card-list">${cards.map((card) => `<li><div><p>${escapeHtml(card.prompt)}</p><span>${card.matchMode === 'exact' ? `${card.answers.length} accepted answer${card.answers.length === 1 ? '' : 's'}` : `${card.keywords.length} required keyword${card.keywords.length === 1 ? '' : 's'}`} · ${card.intervalDays} day interval</span></div><button class="icon-button delete-card" data-card-id="${card.id}" aria-label="Delete card: ${escapeHtml(card.prompt)}">×</button></li>`).join('')}</ul>` : `<div class="empty-paper"><span aria-hidden="true">＋</span><p>No cards yet. Add one to start a local review.</p></div>`}</div></section>`;
}

function insightReport(): string {
  const summary = calibrationSummary(reviews);
  const generous = reviews.filter((review) => review.gradeScore - review.proxyScore > 0.25).length;
  const harsh = reviews.filter((review) => review.proxyScore - review.gradeScore > 0.25).length;
  const aligned = reviews.length - generous - harsh;
  if (!reviews.length) return `<section class="empty-report"><div class="registration-mark" aria-hidden="true">＋</div><h2>No comparisons yet</h2><p>Complete one typed review and choose a grade to see the first result here.</p><a class="button primary" href="${routePath(cards.length ? 'review' : 'cards')}" data-link>${cards.length ? 'Start reviewing' : 'Create a card'}</a></section>`;
  const tendency = summary.bias > 0.04 ? 'generous' : summary.bias < -0.04 ? 'harsh' : 'balanced';
  return `<section class="insight-grid" aria-label="Calibration summary"><div class="score-sheet"><span>Grade alignment</span><strong>${summary.score}<small>/100</small></strong><p>${summary.score >= 80 ? 'Most grades match the typed result' : summary.score >= 60 ? 'Some grade gaps remain' : 'Large grade gaps remain'}</p></div><div class="bias-sheet"><h2>Your grade tendency</h2><strong>${Math.abs(summary.bias * 100).toFixed(0)} points ${tendency}</strong><p>${tendency === 'generous' ? 'Your grades tend to sit above typed recall.' : tendency === 'harsh' ? 'Your grades tend to sit below typed recall.' : 'Your average grade and typed recall are close.'}</p></div></section><section class="report-section"><div class="section-line"><div><p class="eyebrow">Review results</p><h2>Where grades differ</h2></div><span>${reviews.length} reviews</span></div><div class="bar-report" role="img" aria-label="${aligned} aligned, ${generous} generous, and ${harsh} harsh grades"><div><span>Aligned</span><progress value="${aligned}" max="${reviews.length}" aria-hidden="true"></progress><b>${aligned}</b></div><div><span>Generous</span><progress class="red" value="${generous}" max="${reviews.length}" aria-hidden="true"></progress><b>${generous}</b></div><div><span>Harsh</span><progress class="ochre" value="${harsh}" max="${reviews.length}" aria-hidden="true"></progress><b>${harsh}</b></div></div></section><section class="report-section"><div class="section-line"><div><p class="eyebrow">Recent reviews</p><h2>Review history</h2></div>${summary.improvement === null ? `<span>${Math.max(0, 8 - reviews.length)} to first trend</span>` : `<span>${summary.improvement >= 0 ? '↓' : '↑'} ${Math.abs(summary.improvement).toFixed(0)}% recent grade gap</span>`}</div><div class="table-scroll"><table><thead><tr><th>Date</th><th>Question</th><th>Typed result</th><th>Grade</th><th>Gap</th><th>Interval</th></tr></thead><tbody>${[...reviews].reverse().slice(0, 20).map((review) => `<tr><td>${formatDate(review.reviewedAt)}</td><td>${escapeHtml(review.prompt)}</td><td><span class="status ${review.proxyLabel}">${review.proxyLabel}</span></td><td>${review.grade}</td><td>${Math.round(review.gap * 100)} pts</td><td>${review.suggestedIntervalDays}d</td></tr>`).join('')}</tbody></table></div></section>`;
}

function insightsView(): string {
  return `<section class="page-head"><p class="eyebrow">Insights</p><h1>${reviews.length ? 'View your grade calibration.' : 'Complete a review to see calibration.'}</h1><p class="lede">Calibration is the gap between typed recall and the grade you choose. Smaller gaps give your scheduler a more consistent signal.</p></section>${insightReport()}<p class="disclaimer report-disclaimer">This is a recall proxy. It does not diagnose memory, mastery, or a learning condition.</p>`;
}

function settingsView(): string {
  return `<section class="page-head"><p class="eyebrow">Data</p><h1>Export or delete your local data.</h1><p class="lede">Cards and reviews are stored in this browser. Export before clearing site data or changing devices.</p></section><section class="settings-grid"><div class="paper-panel"><h2>Export a copy</h2><p>JSON restores the full app. CSV opens review history and suggested intervals in a spreadsheet.</p><div class="stack-actions"><button class="button primary" id="export-json">Export JSON</button><button class="button quiet" id="export-csv" ${reviews.length ? '' : 'disabled'}>Export review CSV</button></div></div><div class="paper-panel"><h2>Restore data</h2><p>Importing a v1 JSON export replaces the data currently in this browser.</p><label class="file-button">Choose JSON export<input type="file" id="import-json" accept="application/json,.json"></label><p id="import-status" class="field-note" role="status"></p></div><div class="paper-panel danger-panel"><h2>Delete local data</h2><p>Delete ${cards.length} cards and ${reviews.length} reviews from this browser. Export first if you need a copy.</p><button class="button danger" id="clear-data">Delete local data</button></div></section>`;
}

function legalView(kind: 'privacy' | 'terms'): string {
  return kind === 'privacy'
    ? `<article class="legal"><p class="eyebrow">Privacy policy · 6 September 2026</p><h1>Privacy</h1><p class="lede">Your cards and review history stay in your browser. Recall Calibrator has no account, analytics, ad trackers, or remote data store.</p><h2>What is stored</h2><p>Cards, accepted answers, required keywords, typed recall, grades, intervals, and settings are stored in IndexedDB on this device. The service worker caches app files for offline use.</p><h2>What leaves your device</h2><p>The app does not send learning data to us or another service. Your browser may make ordinary requests to download the app files. Those requests do not include locally stored cards or answers.</p><h2>Your control</h2><p>Use Data to export JSON or CSV and delete local data. Clearing browser site data also removes it. Uninstalling a PWA may not clear browser storage.</p><h2>Demo data</h2><p>Sample data uses a separate local database. Reset demo and Start for real never change ordinary local cards or reviews.</p></article>`
    : `<article class="legal"><p class="eyebrow">Terms · 6 September 2026</p><h1>Terms</h1><p class="lede">Recall Calibrator is a free, local utility for comparing typed recall with your review grade.</p><h2>Not a diagnosis</h2><p>Results are deterministic recall proxies. They do not measure intelligence, mastery, health, or a learning condition. They may miss synonyms, nuance, reasoning, or valid long-form answers.</p><h2>Your responsibility</h2><p>You choose accepted answers and matching rules. Check suggested intervals before using them in another tool. Keep an export if your data matters to you.</p><h2>Availability</h2><p>The software is provided as is, without warranties. Local browser data can be lost through device failure or site-data clearing.</p><h2>License</h2><p>The application source is available under the MIT License. The illustration was created for this product.</p></article>`;
}

function notFoundView(): string {
  return `<section class="page-head not-found"><p class="eyebrow">404</p><h1>That page was not found.</h1><p class="lede">The address does not match a Recall Calibrator page. Your local cards and reviews are unchanged.</p><a class="button primary" href="${routePath('home')}" data-link>Go to Recall Calibrator</a></section>`;
}

function render(focusHeading = false) {
  const views: Record<Route, () => string> = { home: homeView, review: reviewView, cards: cardsView, insights: insightsView, settings: settingsView, privacy: () => legalView('privacy'), terms: () => legalView('terms'), demo: demoView, notFound: notFoundView };
  app.innerHTML = shell(views[route]());
  setPageMetadata();
  bindEvents();
  if (focusHeading) {
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
    requestAnimationFrame(() => {
      const announcer = document.querySelector<HTMLElement>('#route-announcer');
      if (announcer) announcer.textContent = pageInfo(route).label;
    });
  }
  if (route === 'review' && reviewStage === 'recall' && sessionCards.length) document.querySelector<HTMLTextAreaElement>('#typed-recall')?.focus();
}

async function syncLocation(path: string, search: string, addHistory = false) {
  const nextDemo = isDemoLocation(path, search);
  if (addHistory) history.pushState({}, '', `${path}${search}`);
  if (nextDemo !== demoMode) {
    demoMode = nextDemo;
    store = demoMode ? demoDb : db;
    if (demoMode) await seedDemoData();
    await refreshData();
  }
  route = pathToRoute(path);
  if (!demoMode && route === 'demo') route = 'home';
  resetSession();
  render(true);
}

function navigate(destination: string) {
  const next = new URL(destination, location.origin);
  return syncLocation(next.pathname, next.search, true);
}

function resetSession() {
  sessionCards = [];
  sessionIndex = 0;
  reviewStage = 'recall';
  typedRecall = '';
  lastReview = null;
}

function toast(message: string, action?: { label: string; callback: () => void }) {
  const region = document.querySelector<HTMLDivElement>('#toast-region');
  if (!region) return;
  region.innerHTML = `<div class="toast"><span>${escapeHtml(message)}</span>${action ? `<button id="toast-action">${escapeHtml(action.label)}</button>` : ''}</div>`;
  if (action) region.querySelector('button')?.addEventListener('click', action.callback);
  else setTimeout(() => { if (region.isConnected) region.innerHTML = ''; }, 4000);
}

function demoExport(): AppData {
  const now = Date.now();
  const date = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const tokyo: Card = { id: 'demo-card-tokyo', prompt: 'What is the capital of Japan?', answers: ['Tokyo'], keywords: [], matchMode: 'exact', intervalDays: 8, createdAt: date(14), updatedAt: date(2) };
  const photosynthesis: Card = { id: 'demo-card-photosynthesis', prompt: 'Name the two inputs of photosynthesis.', answers: ['Carbon dioxide and water'], keywords: ['carbon dioxide', 'water'], matchMode: 'keywords', intervalDays: 6, createdAt: date(14), updatedAt: date(3) };
  const http: Card = { id: 'demo-card-http', prompt: 'What does HTTP stand for?', answers: ['Hypertext Transfer Protocol', 'Hyper Text Transfer Protocol'], keywords: [], matchMode: 'exact', intervalDays: 18, createdAt: date(14), updatedAt: date(1) };
  const review = (id: string, card: Card, typedRecall: string, proxyScore: 0 | 0.5 | 1, grade: Grade, suggestedIntervalDays: number, daysAgo: number): Review => ({ id, cardId: card.id, prompt: card.prompt, typedRecall, proxyScore, proxyLabel: proxyScore === 1 ? 'match' : proxyScore === 0.5 ? 'partial' : 'miss', matchedKeywords: proxyScore === 0.5 ? ['water'] : proxyScore === 1 && card.matchMode === 'keywords' ? card.keywords : [], grade, gradeScore: GRADE_SCORES[grade], gap: Math.abs(GRADE_SCORES[grade] - proxyScore), suggestedIntervalDays, reviewedAt: date(daysAgo) });
  return { schemaVersion: 1, exportedAt: new Date(now).toISOString(), cards: [tokyo, photosynthesis, http], reviews: [review('demo-review-1', tokyo, 'Tokyo', 1, 'good', 8, 13), review('demo-review-2', tokyo, 'Kyoto', 0, 'easy', 1, 12), review('demo-review-3', tokyo, 'Tokyo', 1, 'good', 3, 10), review('demo-review-4', photosynthesis, 'carbon dioxide and water', 1, 'good', 13, 8), review('demo-review-5', photosynthesis, 'water', 0.5, 'hard', 6, 7), review('demo-review-6', photosynthesis, 'sunlight', 0, 'good', 1, 5), review('demo-review-7', http, 'Hyper Text Transfer Protocol', 1, 'easy', 18, 3), review('demo-review-8', http, 'HTTP', 0, 'good', 1, 1)], settings: { sampleSize: 20, normalizedPunctuation: true } };
}

async function seedDemoData() {
  if ((await demoDb.allCards()).length === 0 && (await demoDb.allReviews()).length === 0) await demoDb.importData(demoExport());
}

async function resetDemo() {
  await demoDb.clearAll();
  await demoDb.importData(demoExport());
  await refreshData();
  resetSession();
  render();
  toast('Sample data reset.');
}

async function startForReal() {
  await demoDb.clearAll();
  demoMode = false;
  store = db;
  await refreshData();
  route = 'cards';
  history.pushState({}, '', '/cards');
  resetSession();
  render(true);
  toast('Demo data discarded. Your local data is unchanged.');
}

async function deleteCard(id: string) {
  const card = cards.find((item) => item.id === id);
  if (!card || !confirm(`Delete “${card.prompt}”? Existing review history will be kept.`)) return;
  await store.deleteCard(id);
  await refreshData();
  render();
  toast('Card deleted; review history kept.');
}

async function saveGrade(grade: Grade) {
  const card = currentCard();
  if (!card) return;
  const proxy = scoreRecall(card, typedRecall);
  const gradeScore = GRADE_SCORES[grade];
  const interval = suggestedInterval(card.intervalDays, proxy.score);
  lastReview = { id: createId('review'), cardId: card.id, prompt: card.prompt, typedRecall, proxyScore: proxy.score, proxyLabel: proxy.label, matchedKeywords: proxy.matchedKeywords, grade, gradeScore, gap: Math.abs(gradeScore - proxy.score), suggestedIntervalDays: interval, reviewedAt: new Date().toISOString() };
  await store.putReview(lastReview);
  await store.putCard({ ...card, intervalDays: interval, updatedAt: new Date().toISOString() });
  reviews.push(lastReview);
  cards = cards.map((item) => item.id === card.id ? { ...item, intervalDays: interval } : item);
  reviewStage = 'result';
  render();
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function showNetworkState(isOnline: boolean) {
  online = isOnline;
  const indicator = document.querySelector<HTMLElement>('.network');
  if (indicator) {
    indicator.classList.toggle('is-offline', !online);
    indicator.textContent = online ? 'Stored locally' : 'Offline · changes safe';
  }
  toast(online ? 'Back online. Local work is unchanged.' : 'You are offline. Reviews still work.');
}

function bindEvents() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => link.addEventListener('click', (event) => {
    if (!event.metaKey && !event.ctrlKey && link.origin === location.origin) {
      event.preventDefault();
      void navigate(`${link.pathname}${link.search}`);
    }
  }));
  document.querySelector('#reset-demo')?.addEventListener('click', () => void resetDemo());
  document.querySelector('#start-real')?.addEventListener('click', () => void startForReal());
  document.querySelector('#begin-review')?.addEventListener('click', () => {
    const count = Number((document.querySelector('#sample-count') as HTMLSelectElement).value);
    const counts = new Map(cards.map((card) => [card.id, reviews.filter((review) => review.cardId === card.id).length]));
    sessionCards = [...cards].sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.updatedAt.localeCompare(b.updatedAt)).slice(0, count);
    sessionIndex = 0;
    reviewStage = 'recall';
    typedRecall = '';
    render();
  });
  document.querySelector('#restart-review')?.addEventListener('click', () => { resetSession(); render(); });
  document.querySelector<HTMLFormElement>('#recall-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    typedRecall = (new FormData(event.currentTarget as HTMLFormElement).get('recall') as string).trim();
    if (!typedRecall) return;
    reviewStage = 'grade';
    render();
    document.querySelector<HTMLButtonElement>('[data-grade]')?.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach((button) => button.addEventListener('click', () => void saveGrade(button.dataset.grade as Grade)));
  document.querySelector('#next-card')?.addEventListener('click', () => { sessionIndex += 1; reviewStage = 'recall'; typedRecall = ''; lastReview = null; render(); });
  document.querySelectorAll<HTMLButtonElement>('.delete-card').forEach((button) => button.addEventListener('click', () => void deleteCard(button.dataset.cardId!)));
  document.querySelectorAll<HTMLInputElement>('input[name="matchMode"]').forEach((input) => input.addEventListener('change', () => { const field = document.querySelector<HTMLElement>('#keyword-field')!; field.hidden = input.value !== 'keywords' || !input.checked; }));
  document.querySelector<HTMLFormElement>('#card-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const now = new Date().toISOString();
    const prompt = String(data.get('prompt')).trim();
    const answers = String(data.get('answers')).split('\n').map((value) => value.trim()).filter(Boolean);
    const mode = String(data.get('matchMode')) as Card['matchMode'];
    const keywords = String(data.get('keywords')).split(',').map((value) => value.trim()).filter(Boolean);
    const error = document.querySelector('#card-error')!;
    if (!prompt || !answers.length) { error.textContent = 'Add both a question and at least one accepted answer.'; return; }
    if (mode === 'keywords' && !keywords.length) { error.textContent = 'Add at least one required keyword, or choose exact answer.'; return; }
    await store.putCard({ id: createId('card'), prompt, answers, keywords, matchMode: mode, intervalDays: Number(data.get('interval')) || 1, createdAt: now, updatedAt: now });
    await refreshData();
    render();
    toast('Card added.');
  });
  document.querySelector('#export-json')?.addEventListener('click', async () => download(`recall-calibrator-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await store.exportData(), null, 2), 'application/json'));
  document.querySelector('#export-csv')?.addEventListener('click', () => {
    const headings = ['reviewed_at', 'prompt', 'typed_recall', 'proxy_result', 'proxy_score', 'self_grade', 'grade_score', 'gap', 'suggested_interval_days'];
    const rows = reviews.map((review) => [review.reviewedAt, review.prompt, review.typedRecall, review.proxyLabel, review.proxyScore, review.grade, review.gradeScore, review.gap, review.suggestedIntervalDays]);
    download(`recall-intervals-${new Date().toISOString().slice(0, 10)}.csv`, [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv');
  });
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', async (event) => {
    const status = document.querySelector('#import-status')!;
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = validateImportData(JSON.parse(await file.text()));
      if (!confirm(`Replace local data with ${data.cards.length} cards and ${data.reviews.length} reviews?`)) return;
      await store.importData(data);
      await refreshData();
      render();
      toast('Import complete.');
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Could not read this file. Your current data was not changed.';
    }
  });
  document.querySelector('#clear-data')?.addEventListener('click', async () => {
    if (!confirm(`Delete ${cards.length} cards and ${reviews.length} reviews from this device? This cannot be undone.`)) return;
    await store.clearAll();
    await refreshData();
    render();
    toast('Local data deleted.');
  });
}

async function refreshData() {
  [cards, reviews] = await Promise.all([store.allCards(), store.allReviews()]);
  reviews.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/service-worker.js').then((registration) => {
    if (registration.waiting) toast('An update is ready.', { label: 'Update', callback: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }) });
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
      if (registration.waiting && navigator.serviceWorker.controller) toast('An update is ready.', { label: 'Update', callback: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }) });
    }));
  }).catch(() => toast('Offline installation is unavailable in this browser.'));
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wasControlled && !refreshing) { refreshing = true; location.reload(); } });
}

window.addEventListener('popstate', () => { void syncLocation(location.pathname, location.search); });
window.addEventListener('online', () => showNetworkState(true));
window.addEventListener('offline', () => showNetworkState(false));

try {
  if (demoMode) await seedDemoData();
  await refreshData();
  render();
  registerServiceWorker();
} catch {
  app.innerHTML = shell('<section class="page-head"><p class="eyebrow">Storage error</p><h1>Local storage could not open.</h1><p class="lede">Your browser may block IndexedDB in this mode. Allow site storage, then reload.</p><button class="button primary" id="storage-retry">Try again</button></section>');
  document.querySelector('#storage-retry')?.addEventListener('click', () => location.reload());
}
