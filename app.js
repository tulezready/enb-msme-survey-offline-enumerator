/* =========================================================================
   ENB Commerce & Industry — Economic & MSME Survey (Offline)
   All data lives in localStorage on this device. No network calls, ever.
   ========================================================================= */

const STORAGE_KEY = 'enb_msme_records_v1';
const DRAFT_KEY = 'enb_msme_draft_v1';
const APP_ROLE = (document.body && document.body.dataset.role) || 'hq'; // 'hq' | 'enumerator'
const DISTRICTS = ['Gazelle', 'Kokopo', 'Pomio', 'Rabaul'];

const BUSINESS_ACTIVITIES = {
  general: { label: 'Commerce & Services', items: ['Trade store','Wholesale','Fast food outlet','Second hand clothing shop','Liquor / Bottle shop','Bakery','Service station','PMV / Transport / Taxi services','Pest Control','Professional services (accountancy/consultancy)','Tailoring','Coffin Making','Mechanical Workshop','Contracting services','Communication Towers'] },
  dpi: { label: 'DPI — Agriculture & Livestock', items: ['Cocoa Buying / Cocoa dealer','Livestock / Poultry / Cattle','Fresh produce','Cocoa/coconut nursery'] },
  tourism: { label: 'Tourism', items: ['Arts and craft','Guest house / hospitality','Restaurant','Tour operators','Tourism product owners','Sport tourism','Hiking','Bird watching','Homestay'] },
  nrmd: { label: 'Natural Resources (NRMD)', items: ['Nursery','Sawmilling','Mini down streaming (e.g. eaglewood)','Furniture (log to desk/tables)','Logging'] },
  fisheries: { label: 'Fisheries', items: ['Coastal fishing','Sea cucumber dealer','Inland fish farming'] }
};
const REG_FORM_TYPES = ['Company','Business Name','Business Group','Association','Co-operative','Other'];
const LICENSE_TYPES = ['Trading License','Liquor','Cocoa Dealers License','Frozen Goods License','Second hand License','Inflammable Liquids','Dangerous Goods License','Paddlers license','Others'];
const TRAINING_HISTORY_TYPES = ['Start Your Business (SYB)','Improve Your Business (IYB)','Business Awareness','Financial Literacy Training'];
const TRAINING_REQUIRED_TYPES = ['SIYB','Bookkeeping','Cost/Pricing & Financial Planning','Cash flows/Budgeting','Financial Literacy Training'];
const ASSISTANCE_TYPES = ['General Business Advice','Bookkeeping & Business Records','Costing/Pricing & Financial Planning','Cash flows','IPA Registration/Statutory Returns','IRC Statutory Returns','Financial Statement','Business Plan/Loan Proposals'];
const FIXED_CROPS = ['Cocoa','Coconut','Balsa','Coffee','Vanilla'];
const TURNOVER_BRACKETS = [['a','Less than K60,000'],['b','K60,001 – K250,000'],['c','K250,000 – K5,000,000'],['d','Over K5,000,000']];
const EXPENSE_BRACKETS = [['1','Less than K5,000'],['2','K5,001 – K250,000'],['3','K250,001 – K500,000'],['4','Over K500,001']];

const STEP_DEFS = {
  A: { letter: 'A', title: 'Location' },
  B: { letter: 'B', title: 'Employment & Business' },
  C: { letter: 'C', title: 'Business Background' },
  D: { letter: 'D', title: 'Development Assistance' },
  E: { letter: 'E', title: 'Economic Output' },
  F: { letter: 'F', title: 'Cash Crops' },
  G8: { letter: 'C8', title: 'Business Loan' },
  G: { letter: 'G', title: 'Informal Sector' },
  REVIEW: { letter: '✓', title: 'Review & Save' }
};

function stepsForStatus(status) {
  if (status === 'formal') return ['A', 'B', 'C', 'D', 'E', 'REVIEW'];
  if (status === 'informal') return ['A', 'B', 'G8', 'G', 'REVIEW'];
  return ['A', 'B', 'F', 'REVIEW'];
}

/* ---------------------------- storage layer ---------------------------- */
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { return null; }
}
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

function uid() {
  return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function newRecord() {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: { district: '', llg: '', village: '', ward: '', householdNo: '', dateCollected: todayStr(), contactPerson: '', mobile: '', postalAddress: '' },
    employment: { numFormallyEmployed: '', employedMembers: [], unemployedMembers: [], comments: '' },
    businessStatus: '', // 'formal' | 'informal' | 'none'
    business: {
      activities: { general: [], dpi: [], tourism: [], nrmd: [], fisheries: [], commTowerOwner: '', othersSpecify: '' },
      name: '', dateCommenced: '', owner: '', otherLocation: '',
      ipaRegistered: '', regForms: [], licenses: [], comment: '',
      loanAccess: '', loans: [], loanReasons: ''
    },
    development: {
      trainingAttended: '', trainingHistory: {}, specificTrainingRequired: '',
      trainingTypesRequired: [], assistanceRequired: [], assistanceOtherSpecify: '', comment: ''
    },
    economic: {
      casualsCount: '', casualsYears: '', permanentCount: '', permanentYears: '',
      casualWageK: '', permanentWageK: '',
      turnoverBracket: '', turnoverAmount: '', expensesBracket: '', expensesAmount: '',
      initialCapital: '', assetsValue: '', otherInvestments: '', otherInvestmentsSpecify: ''
    },
    cashCrops: { fixed: {}, others: [], comments: '' },
    informal: { entries: [], comments: '' }
  };
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ------------------------------- app state ------------------------------ */
let draft = null;
let editingExisting = false;
let stepIndex = 0;
let currentView = 'dashboard';
let recordsCache = loadRecords();

/* -------------------------------- utils --------------------------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function esc(s) { return (s === undefined || s === null) ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove('show'), 2200);
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------ navigation ------------------------------- */
function switchView(view) {
  currentView = view;
  ['dashboard', 'records', 'wizard', 'detail', 'transfer'].forEach(v => {
    $('#view-' + v).hidden = (v !== view);
  });
  $all('.bottomnav button').forEach(b => b.classList.remove('active'));
  const map = { dashboard: 'dashboard', records: 'records', wizard: 'wizard-new', detail: 'records', transfer: 'transfer' };
  const navBtn = $all('.bottomnav button').find(b => b.dataset.view === map[view]);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
  if (view === 'dashboard') renderDashboard();
  if (view === 'records') renderRecordsList();
  if (view === 'transfer') renderTransfer();
}

$all('.bottomnav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.view;
    if (v === 'wizard-new') { startNewSurvey(); return; }
    switchView(v);
  });
});
$('#btn-new-survey').addEventListener('click', startNewSurvey);

function startNewSurvey() {
  const existingDraft = loadDraft();
  if (existingDraft && !editingExisting) {
    if (confirm('You have an unfinished survey saved on this device. Continue it? (Cancel starts a new blank survey)')) {
      draft = existingDraft;
      editingExisting = false;
      stepIndex = 0;
      switchView('wizard');
      renderWizard();
      return;
    } else {
      clearDraft();
    }
  }
  draft = newRecord();
  editingExisting = false;
  stepIndex = 0;
  switchView('wizard');
  renderWizard();
}

function editRecord(id) {
  const rec = recordsCache.find(r => r.id === id);
  if (!rec) return;
  draft = JSON.parse(JSON.stringify(rec));
  editingExisting = true;
  stepIndex = 0;
  switchView('wizard');
  renderWizard();
}

/* ------------------------------- dashboard -------------------------------- */
function renderDashboard() {
  recordsCache = loadRecords();
  $('#record-count-pill').textContent = recordsCache.length;
  $('#stat-total').textContent = recordsCache.length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  $('#stat-week').textContent = recordsCache.filter(r => new Date(r.createdAt).getTime() >= weekAgo).length;
  $('#stat-formal').textContent = recordsCache.filter(r => r.businessStatus === 'formal').length;
  $('#stat-informal').textContent = recordsCache.filter(r => r.businessStatus === 'informal').length;

  const byDistrict = {};
  DISTRICTS.forEach(d => byDistrict[d] = 0);
  recordsCache.forEach(r => { const d = r.location.district; if (d) byDistrict[d] = (byDistrict[d] || 0) + 1; });
  const dEl = $('#district-breakdown');
  dEl.innerHTML = DISTRICTS.map(d => `
    <div class="review-line"><span class="k">${esc(d)}</span><span class="v">${byDistrict[d] || 0}</span></div>
  `).join('');

  const recent = [...recordsCache].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
  const rEl = $('#recent-list');
  if (recent.length === 0) {
    rEl.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>No surveys recorded yet.<br>Tap "Start new survey" to begin.</p></div>`;
  } else {
    rEl.innerHTML = recent.map(recordItemHTML).join('');
    $all('#recent-list .record-item').forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
  }
}

function recordItemHTML(r) {
  const status = r.businessStatus || 'none';
  const initials = (r.location.village || r.location.district || '?').slice(0, 2).toUpperCase();
  const title = r.business.name || r.location.village || 'Household ' + (r.location.householdNo || '');
  const sub = [r.location.district, r.location.village].filter(Boolean).join(' · ') || 'No location set';
  const statusLabel = status === 'formal' ? 'Formal' : status === 'informal' ? 'Informal' : 'No business';
  return `<div class="record-item" data-id="${r.id}">
    <div class="badge ${status}">${esc(initials)}</div>
    <div class="info"><strong>${esc(title)}</strong><span>${esc(sub)} · ${fmtDate(r.location.dateCollected)}</span></div>
    <div class="status-tag ${status}">${statusLabel}</div>
  </div>`;
}

/* ------------------------------- records list ------------------------------ */
function renderRecordsList() {
  recordsCache = loadRecords();
  const chipsEl = $('#district-chips');
  const activeChip = renderRecordsList._chip || 'All';
  chipsEl.innerHTML = ['All', ...DISTRICTS].map(d =>
    `<button class="chip ${d === activeChip ? 'active' : ''}" data-d="${esc(d)}">${esc(d)}</button>`
  ).join('');
  $all('.chip', chipsEl).forEach(c => c.addEventListener('click', () => {
    renderRecordsList._chip = c.dataset.d;
    renderRecordsList();
  }));

  const q = ($('#search-input').value || '').toLowerCase();
  let list = recordsCache;
  if (activeChip !== 'All') list = list.filter(r => r.location.district === activeChip);
  if (q) {
    list = list.filter(r => {
      const hay = [r.location.village, r.location.householdNo, r.location.contactPerson, r.business.name, r.location.ward, r.location.llg].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const container = $('#records-list-container');
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No matching records.</p></div>`;
  } else {
    container.innerHTML = list.map(recordItemHTML).join('');
    $all('.record-item', container).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
  }
}
$('#search-input').addEventListener('input', renderRecordsList);

/* ------------------------------ records summary (HQ only) ------------------------------ */
if (APP_ROLE === 'hq') {
  $('#records-mode-toggle').style.display = 'flex';
  $all('#records-mode-toggle .chip').forEach(btn => btn.addEventListener('click', () => {
    $all('#records-mode-toggle .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    $('#records-list-mode').hidden = (mode !== 'list');
    $('#records-summary-mode').hidden = (mode !== 'summary');
    if (mode === 'summary') renderRecordsSummary();
  }));
}

function tallyEntries(tallyObj) {
  return Object.entries(tallyObj).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
}

function renderRecordsSummary() {
  const all = loadRecords();
  const total = all.length;
  const container = $('#records-summary-mode');
  if (total === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>No records on this device yet.<br>The summary fills in once records are collected or imported.</p></div>`;
    return;
  }

  const byDistrict = {}; DISTRICTS.forEach(d => byDistrict[d] = 0);
  const byStatus = { formal: 0, informal: 0, none: 0 };
  let totalFormallyEmployed = 0, totalEmployedListed = 0, totalUnemployedListed = 0;
  const activityTally = {};
  let ipaYes = 0, ipaNo = 0, loanYes = 0, loanNo = 0, trainingYes = 0, trainingNo = 0;
  const trainingReqTally = {}, assistanceTally = {};
  const turnoverTally = {}; TURNOVER_BRACKETS.forEach(([c]) => turnoverTally[c] = 0);
  const expensesTally = {}; EXPENSE_BRACKETS.forEach(([c]) => expensesTally[c] = 0);
  const cropTotals = {}; FIXED_CROPS.forEach(c => cropTotals[c] = { blocks: 0, trees: 0 });
  let informalEntryCount = 0;

  all.forEach(r => {
    if (r.location.district) byDistrict[r.location.district] = (byDistrict[r.location.district] || 0) + 1;
    if (r.businessStatus === 'formal') byStatus.formal++;
    else if (r.businessStatus === 'informal') byStatus.informal++;
    else if (r.businessStatus === 'none') byStatus.none++;

    totalFormallyEmployed += Number(r.employment.numFormallyEmployed) || 0;
    totalEmployedListed += r.employment.employedMembers.length;
    totalUnemployedListed += r.employment.unemployedMembers.length;

    Object.values(r.business.activities).forEach(v => { if (Array.isArray(v)) v.forEach(item => { activityTally[item] = (activityTally[item] || 0) + 1; }); });
    if (r.business.ipaRegistered === 'Yes') ipaYes++; else if (r.business.ipaRegistered === 'No') ipaNo++;
    if (r.business.loanAccess === 'Yes') loanYes++; else if (r.business.loanAccess === 'No') loanNo++;
    if (r.development.trainingAttended === 'Yes') trainingYes++; else if (r.development.trainingAttended === 'No') trainingNo++;
    (r.development.trainingTypesRequired || []).forEach(t => { trainingReqTally[t] = (trainingReqTally[t] || 0) + 1; });
    (r.development.assistanceRequired || []).forEach(t => { assistanceTally[t] = (assistanceTally[t] || 0) + 1; });
    if (r.economic.turnoverBracket) turnoverTally[r.economic.turnoverBracket] = (turnoverTally[r.economic.turnoverBracket] || 0) + 1;
    if (r.economic.expensesBracket) expensesTally[r.economic.expensesBracket] = (expensesTally[r.economic.expensesBracket] || 0) + 1;
    FIXED_CROPS.forEach(c => { const d = r.cashCrops.fixed[c]; if (d) { cropTotals[c].blocks += Number(d.blocks) || 0; cropTotals[c].trees += Number(d.trees) || 0; } });
    informalEntryCount += (r.informal.entries || []).length;
  });

  let html = `<div class="warn-box">Summary of all ${total} record(s) currently stored on this device — updates automatically as more surveys are collected or imported.</div>`;

  html += reviewBlockHTML('Overview', [
    ['Total households surveyed', total],
    ['Formal business', byStatus.formal], ['Informal sector', byStatus.informal], ['No business', byStatus.none]
  ]);
  html += reviewBlockHTML('By District', DISTRICTS.map(d => [d, byDistrict[d]]));
  html += reviewBlockHTML('B. Employment', [
    ['Total formally employed (reported)', totalFormallyEmployed],
    ['Employed members listed (Table 1)', totalEmployedListed],
    ['Unemployed qualified members listed (Table 2)', totalUnemployedListed]
  ]);
  const topActivities = tallyEntries(activityTally).slice(0, 10);
  if (topActivities.length) html += reviewBlockHTML('C. Top Business Activities', topActivities);
  html += reviewBlockHTML('C. IPA Registration & Loans', [
    ['IPA registered — Yes', ipaYes], ['IPA registered — No', ipaNo],
    ['Loan access — Yes', loanYes], ['Loan access — No', loanNo]
  ]);
  html += reviewBlockHTML('D. Training & Development', [
    ['Training attended — Yes', trainingYes], ['Training attended — No', trainingNo]
  ]);
  const trainingReqList = tallyEntries(trainingReqTally);
  if (trainingReqList.length) html += reviewBlockHTML('Training Required (demand)', trainingReqList);
  const assistanceList = tallyEntries(assistanceTally);
  if (assistanceList.length) html += reviewBlockHTML('Assistance Required (demand)', assistanceList);
  html += reviewBlockHTML('E. Monthly Turnover Bracket', TURNOVER_BRACKETS.map(([c, label]) => [label, turnoverTally[c] || 0]));
  html += reviewBlockHTML('E. Monthly Expenses Bracket', EXPENSE_BRACKETS.map(([c, label]) => [label, expensesTally[c] || 0]));
  html += reviewBlockHTML('F. Cash Crop Totals', FIXED_CROPS.map(c => [c, `${cropTotals[c].blocks} blocks / ${cropTotals[c].trees} trees`]));
  html += reviewBlockHTML('G. Informal Sector', [['Total informal activities recorded', informalEntryCount]]);
  html += `<button class="btn btn-outline btn-full" id="btn-print-summary">Print / Save as PDF</button>`;

  container.innerHTML = html;
  const printBtn = $('#btn-print-summary');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

/* -------------------------------- detail view ------------------------------- */
function openDetail(id) {
  const r = recordsCache.find(x => x.id === id) || loadRecords().find(x => x.id === id);
  if (!r) return;
  switchView('detail');
  const status = r.businessStatus || 'none';
  const statusLabel = status === 'formal' ? 'Formal business' : status === 'informal' ? 'Informal sector' : 'No business';

  let sections = '';
  sections += reviewBlockHTML('A. Location', [
    ['District', r.location.district], ['LLG', r.location.llg], ['Village', r.location.village], ['Ward', r.location.ward],
    ['Household No.', r.location.householdNo], ['Date collected', fmtDate(r.location.dateCollected)],
    ['Contact person', r.location.contactPerson], ['Mobile', r.location.mobile], ['Postal address', r.location.postalAddress]
  ]);
  sections += reviewBlockHTML('B. Employment', [
    ['Formally employed members', r.employment.numFormallyEmployed],
    ['Business status', statusLabel]
  ], reviewSubList('Employed members', r.employment.employedMembers, fmtEmployed) + reviewSubList('Unemployed (qualified) members', r.employment.unemployedMembers, fmtUnemployed));
  if (status === 'formal') {
    sections += reviewBlockHTML('C. Business Background', [
      ['Business name', r.business.name], ['Date commenced', fmtDate(r.business.dateCommenced)],
      ['Owner', r.business.owner], ['IPA registered', r.business.ipaRegistered], ['Loan access', r.business.loanAccess]
    ], reviewSubList('Registration forms', r.business.regForms, fmtRegForm) + reviewSubList('Licenses', r.business.licenses, fmtLicense) + reviewSubList('Loans', r.business.loans, fmtLoan));
    sections += reviewBlockHTML('D. Development Assistance', [
      ['Training attended', r.development.trainingAttended],
      ['Assistance required', (r.development.assistanceRequired || []).join(', ') || '—']
    ], reviewSubList('Training history', Object.entries(r.development.trainingHistory || {}), ([t, f]) => `${t}${f ? ' — Facilitator: ' + f : ''}`));
    sections += reviewBlockHTML('E. Economic Output', [
      ['Casuals', r.economic.casualsCount], ['Permanent', r.economic.permanentCount],
      ['Turnover bracket', r.economic.turnoverBracket], ['Initial capital (K)', r.economic.initialCapital]
    ]);
  } else if (status === 'informal') {
    sections += reviewBlockHTML('C.8 Loan', [['Loan access', r.business.loanAccess]], reviewSubList('Loans', r.business.loans, fmtLoan));
    sections += reviewBlockHTML('G. Informal Sector', [], reviewSubList('Entries', r.informal.entries, fmtInformal));
  } else {
    const cropSummary = FIXED_CROPS.filter(c => r.cashCrops.fixed[c] && (r.cashCrops.fixed[c].blocks || r.cashCrops.fixed[c].trees))
      .map(c => `${c}: ${r.cashCrops.fixed[c].blocks || 0} blocks / ${r.cashCrops.fixed[c].trees || 0} trees`);
    sections += reviewBlockHTML('F. Cash Crops', [['Comments', r.cashCrops.comments || '—']],
      reviewSubList('Fixed crops recorded', cropSummary, x => x) + reviewSubList('Other crops', r.cashCrops.others, fmtOtherCrop));
  }

  $('#detail-body').innerHTML = `
    <div class="card" style="display:flex; align-items:center; gap:12px;">
      <div class="badge ${status}" style="width:46px;height:46px;font-size:16px;">${esc((r.location.village || 'HH').slice(0,2).toUpperCase())}</div>
      <div style="flex:1;">
        <h3 style="margin-bottom:2px;">${esc(r.business.name || r.location.village || 'Household ' + (r.location.householdNo||''))}</h3>
        <span style="font-size:12.5px; color:var(--text-muted);">${esc(r.location.district || '')} · Collected ${fmtDate(r.location.dateCollected)}</span>
      </div>
    </div>
    <div class="card">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-detail-edit" style="flex:1;">Edit</button>
        <button class="btn btn-outline" id="btn-detail-print">Print</button>
        <button class="btn btn-outline" id="btn-detail-export">Export</button>
        <button class="btn btn-danger" id="btn-detail-delete">Delete</button>
      </div>
    </div>
    ${sections}
    <button class="btn btn-outline btn-full" id="btn-detail-back">← Back to records</button>
  `;
  $('#btn-detail-edit').onclick = () => editRecord(r.id);
  $('#btn-detail-back').onclick = () => switchView('records');
  $('#btn-detail-delete').onclick = () => {
    if (confirm('Delete this record from this device? This cannot be undone.')) {
      recordsCache = loadRecords().filter(x => x.id !== r.id);
      saveRecords(recordsCache);
      toast('Record deleted');
      switchView('records');
    }
  };
  $('#btn-detail-export').onclick = () => downloadFile(`msme-${(r.location.village||r.id).replace(/\s+/g,'-')}.json`, JSON.stringify(r, null, 2), 'application/json');
  $('#btn-detail-print').onclick = () => { window.print(); };
}
function reviewBlockHTML(title, pairs, extraHtml) {
  return `<div class="review-block card"><h4>${esc(title)}</h4>${
    pairs.map(([k, v]) => `<div class="review-line"><span class="k">${esc(k)}</span><span class="v">${esc(v === '' || v == null ? '—' : v)}</span></div>`).join('')
  }${extraHtml || ''}</div>`;
}
// Renders a labeled list of full entries (names + detail) under a review block —
// used so the on-screen views show the same real detail as the CSV/JSON export.
function reviewSubList(label, arr, fmt) {
  if (!arr || arr.length === 0) return '';
  return `<div style="margin-top:10px;">
    <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px;">${esc(label)}</div>
    ${arr.map(item => `<div style="font-size:13px; padding:6px 0; border-bottom:1px dashed var(--border);">${esc(fmt(item))}</div>`).join('')}
  </div>`;
}
const fmtEmployed = m => `${m.name || 'Unnamed'} — ${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.employer, m.grossPay && 'K' + m.grossPay + '/mo'].filter(Boolean).join(', ') || 'no further detail'}`;
const fmtUnemployed = m => `${m.name || 'Unnamed'} — ${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.comments].filter(Boolean).join(', ') || 'no further detail'}`;
const fmtRegForm = f => `${f.form || 'Form'} — Reg#: ${f.regNo || '—'}, Date: ${f.dateReg || '—'}, Expiry: ${f.expiry || '—'}`;
const fmtLicense = l => `${l.type || 'License'} — Receipt: ${l.receiptNo || '—'}, Expiry: ${l.expiry || '—'}`;
const fmtLoan = l => `${l.institution || 'Lender'} — K${l.amount || '—'}, Date: ${l.date || '—'}, On schedule: ${l.onSchedule || '—'}`;
const fmtOtherCrop = c => `${c.name || 'Crop'} — ${c.blocks || 0} blocks, ${c.trees || 0} trees`;
const fmtInformal = e => `${e.ownerName || 'Owner'} — ${e.activityType || 'activity'} (Est. ${e.yearEstablished || '—'}, K${e.monthlyTurnover || '—'}/mo)`;

/* --------------------------------- wizard ---------------------------------- */
function renderWizard() {
  const steps = stepsForStatus(draft.businessStatus);
  if (stepIndex >= steps.length) stepIndex = steps.length - 1;
  const stepId = steps[stepIndex];

  $('#stepper').innerHTML = steps.map((id, i) => {
    const cls = i === stepIndex ? 'active' : (i < stepIndex ? 'done' : '');
    return `<div class="step-badge ${cls}" data-i="${i}">${STEP_DEFS[id].letter}</div>`;
  }).join('');
  $all('.step-badge', $('#stepper')).forEach(b => b.addEventListener('click', () => {
    stepIndex = parseInt(b.dataset.i, 10);
    renderWizard();
  }));

  const body = $('#wizard-body');
  body.innerHTML = `<div class="card"><h3>${STEP_DEFS[stepId].letter}. ${STEP_DEFS[stepId].title}</h3><div id="step-content" style="margin-top:12px;"></div>
    <div class="wizard-nav">
      ${stepIndex > 0 ? '<button class="btn btn-outline" id="btn-wiz-back">Back</button>' : '<button class="btn btn-outline" id="btn-wiz-cancel">Cancel</button>'}
      <button class="btn btn-primary" id="btn-wiz-next">${stepId === 'REVIEW' ? 'Save record' : 'Continue'}</button>
    </div>
  </div>`;

  const content = $('#step-content');
  const renderers = { A: renderStepA, B: renderStepB, C: renderStepC, D: renderStepD, E: renderStepE, F: renderStepF, G8: renderStepG8, G: renderStepG, REVIEW: renderStepReview };
  renderers[stepId](content);

  const backBtn = $('#btn-wiz-back');
  if (backBtn) backBtn.addEventListener('click', () => { stepIndex--; renderWizard(); });
  const cancelBtn = $('#btn-wiz-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    if (confirm('Discard this survey draft?')) { clearDraft(); switchView('dashboard'); }
    else switchView('dashboard');
  });
  $('#btn-wiz-next').addEventListener('click', () => {
    if (stepId === 'REVIEW') { saveDraftRecord(); return; }
    saveDraft(draft);
    const newSteps = stepsForStatus(draft.businessStatus);
    if (stepIndex < newSteps.length - 1) stepIndex++;
    renderWizard();
  });
}

function bindInputs(root) {
  $all('[data-bind]', root).forEach(el => {
    const path = el.dataset.bind;
    const val = getPath(draft, path);
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val == null ? '' : val;
    const evt = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
    el.addEventListener(evt, () => {
      setPath(draft, path, el.type === 'checkbox' ? el.checked : el.value);
    });
  });
}

function ynToggle(path, label, hint) {
  const val = getPath(draft, path);
  return `<div class="field">
    <label>${esc(label)}</label>
    <div class="yn-toggle" data-yn="${path}">
      <button type="button" class="sel-yes ${val === 'Yes' ? 'on' : ''}" data-v="Yes">Yes</button>
      <button type="button" class="sel-no ${val === 'No' ? 'on' : ''}" data-v="No">No</button>
    </div>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
  </div>`;
}
function bindYN(root) {
  $all('[data-yn]', root).forEach(group => {
    const path = group.dataset.yn;
    $all('button', group).forEach(btn => btn.addEventListener('click', () => {
      setPath(draft, path, btn.dataset.v);
      $all('button', group).forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      if (group.dataset.rerender) renderWizard();
    }));
  });
}

/* ---- Step A: Location ---- */
function renderStepA(el) {
  el.innerHTML = `
    <div class="field">
      <label>District</label>
      <select data-bind="location.district">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>LLG</label><input type="text" data-bind="location.llg"></div>
      <div class="field"><label>Ward</label><input type="text" data-bind="location.ward"></div>
    </div>
    <div class="field"><label>Village</label><input type="text" data-bind="location.village"></div>
    <div class="field-row">
      <div class="field"><label>Household No.</label><input type="text" data-bind="location.householdNo"></div>
      <div class="field"><label>Date data collected</label><input type="date" data-bind="location.dateCollected"></div>
    </div>
    <div class="field"><label>Contact person & mobile number</label>
      <div class="field-row">
        <input type="text" placeholder="Name" data-bind="location.contactPerson">
        <input type="tel" placeholder="Mobile number" data-bind="location.mobile">
      </div>
    </div>
    <div class="field"><label>Postal address</label><textarea data-bind="location.postalAddress"></textarea></div>
  `;
  bindInputs(el);
}

/* ---- Step B: Employment & Education + business status ---- */
function renderStepB(el) {
  el.innerHTML = `
    <div class="field"><label>i. How many family members are formally employed currently?</label>
      <input type="number" min="0" data-bind="employment.numFormallyEmployed"></div>

    <div class="field"><label>ii. Employed family members <span class="opt">(Table 1)</span></label></div>
    <div id="employed-table"></div>

    <div class="field"><label>iii. Unemployed family members (18+, holding trade/tertiary qualification, not students) <span class="opt">(Table 2)</span></label></div>
    <div id="unemployed-table"></div>

    <div class="field"><label>Comments</label><textarea data-bind="employment.comments"></textarea></div>

    <div class="field">
      <label>iv. Does the household or family own or run a formal business?</label>
      <div class="status-choice">
        <button type="button" class="status-opt ${draft.businessStatus === 'formal' ? 'on' : ''}" data-status="formal">
          <div class="radio"></div><div><strong>Yes — formal business</strong><span>Continue to Sections C, D & E</span></div>
        </button>
        <button type="button" class="status-opt ${draft.businessStatus === 'informal' ? 'on' : ''}" data-status="informal">
          <div class="radio"></div><div><strong>Informal sector</strong><span>Continue to business loan question & Section G</span></div>
        </button>
        <button type="button" class="status-opt ${draft.businessStatus === 'none' ? 'on' : ''}" data-status="none">
          <div class="radio"></div><div><strong>No business</strong><span>Continue to Section F (Cash crops)</span></div>
        </button>
      </div>
    </div>
  `;
  bindInputs(el);
  renderRepeatTable($('#employed-table'), draft.employment.employedMembers,
    ['name', 'qualification', 'institution', 'yearGraduated', 'employer', 'grossPay'],
    ['Name', 'Highest qualification', 'Institution', 'Year graduated', 'Employer & location', 'Gross monthly pay (K)'],
    () => renderStepB(el));
  renderRepeatTable($('#unemployed-table'), draft.employment.unemployedMembers,
    ['name', 'qualification', 'institution', 'yearGraduated', 'comments'],
    ['Name', 'Highest qualification', 'Institution', 'Year graduated', 'Comments'],
    () => renderStepB(el));

  $all('.status-opt', el).forEach(btn => btn.addEventListener('click', () => {
    draft.businessStatus = btn.dataset.status;
    renderStepB(el);
  }));
}

/* generic repeatable-row table builder */
function renderRepeatTable(container, arr, fields, labels, onChange) {
  container.innerHTML = arr.map((row, idx) => `
    <div class="repeat-row" data-idx="${idx}">
      <button type="button" class="rm-row" data-rm="${idx}">✕</button>
      <div class="field-row">
        ${fields.map((f, i) => `<div class="field" style="margin-bottom:8px;"><label>${esc(labels[i])}</label><input type="text" data-f="${f}" value="${esc(row[f] || '')}"></div>`).join('')}
      </div>
    </div>
  `).join('') + `<button type="button" class="add-row-btn">+ Add entry</button>`;

  $all('.repeat-row', container).forEach(rowEl => {
    const idx = parseInt(rowEl.dataset.idx, 10);
    $all('input', rowEl).forEach(inp => inp.addEventListener('input', () => { arr[idx][inp.dataset.f] = inp.value; }));
  });
  $all('.rm-row', container).forEach(btn => btn.addEventListener('click', () => {
    arr.splice(parseInt(btn.dataset.rm, 10), 1);
    onChange();
  }));
  $('.add-row-btn', container).addEventListener('click', () => {
    const blank = {}; fields.forEach(f => blank[f] = '');
    arr.push(blank);
    onChange();
  });
}

/* ---- Step C: Business Background ---- */
function renderStepC(el) {
  el.innerHTML = `
    <div class="field"><label>1. Business activities undertaken</label></div>
    ${Object.entries(BUSINESS_ACTIVITIES).map(([key, group]) => `
      <div class="subgroup">
        <div class="sg-title">${esc(group.label)}</div>
        <div class="check-list">
          ${group.items.map(item => `
            <div class="check-item">
              <input type="checkbox" id="act-${key}-${item.replace(/\W+/g,'')}" data-act="${key}" data-item="${esc(item)}" ${draft.business.activities[key].includes(item) ? 'checked' : ''}>
              <label for="act-${key}-${item.replace(/\W+/g,'')}">${esc(item)}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div class="field"><label>Communication Towers — specify owner <span class="opt">(if applicable)</span></label>
      <input type="text" data-bind="business.activities.commTowerOwner"></div>
    <div class="field"><label>Other activities — specify</label>
      <input type="text" data-bind="business.activities.othersSpecify"></div>

    <div class="field"><label>2. Name of business</label><input type="text" data-bind="business.name"></div>
    <div class="field-row">
      <div class="field"><label>3. Date business commenced</label><input type="date" data-bind="business.dateCommenced"></div>
      <div class="field"><label>4. Business owner</label>
        <select data-bind="business.owner"><option value="">Select…</option><option value="Citizen">Citizen</option><option value="Foreign">Foreign (refer IPA form)</option><option value="Joint venture">Joint venture</option></select>
      </div>
    </div>
    <div class="field"><label>5. Any other business location? If yes, where?</label><input type="text" data-bind="business.otherLocation"></div>

    ${ynToggle('business.ipaRegistered', '6. IPA Registration?', 'If yes, complete the registration table below')}
    <div id="regforms-table"></div>

    <div class="field"><label>7. Types of licenses held</label></div>
    <div id="licenses-table"></div>
    <div class="field"><label>Comment</label><textarea data-bind="business.comment"></textarea></div>

    ${ynToggle('business.loanAccess', '8. Are you able to access a business loan?')}
    <div id="loans-table"></div>
    <div class="field" id="loan-reasons-field" style="display:${draft.business.loanAccess === 'No' ? 'block' : 'none'}">
      <label>If no, state reasons why you are not able to access business loans</label>
      <textarea data-bind="business.loanReasons"></textarea>
    </div>
  `;
  bindInputs(el);
  bindYN(el);

  $all('[data-act]', el).forEach(cb => cb.addEventListener('change', () => {
    const key = cb.dataset.act, item = cb.dataset.item;
    const arr = draft.business.activities[key];
    const i = arr.indexOf(item);
    if (cb.checked && i === -1) arr.push(item);
    if (!cb.checked && i !== -1) arr.splice(i, 1);
  }));

  renderRepeatTable($('#regforms-table'), draft.business.regForms,
    ['form', 'dateReg', 'regNo', 'expiry'], ['Form (Company/Business Name/etc.)', 'Date registered', 'Registration No.', 'Expiry date'],
    () => renderStepC(el));
  renderRepeatTable($('#licenses-table'), draft.business.licenses,
    ['type', 'receiptNo', 'expiry'], ['License type', 'Receipt No.', 'Expiry date'],
    () => renderStepC(el));
  renderRepeatTable($('#loans-table'), draft.business.loans,
    ['institution', 'amount', 'date', 'onSchedule'], ['Bank / financial institution', 'Loan amount (K)', 'Date of loan', 'Repayment on schedule? (Yes/No)'],
    () => renderStepC(el));

  $all('[data-yn="business.loanAccess"] button', el).forEach(b => b.addEventListener('click', () => {
    $('#loan-reasons-field').style.display = draft.business.loanAccess === 'No' ? 'block' : 'none';
  }));
}

/* ---- Step D: Development Assistance ---- */
function renderStepD(el) {
  el.innerHTML = `
    ${ynToggle('development.trainingAttended', '1. Business training workshop attended?')}
    <div class="field"><label>Type of training attended (tick where appropriate, add facilitator)</label></div>
    <div class="check-list">
      ${TRAINING_HISTORY_TYPES.map(t => `
        <div class="check-item">
          <input type="checkbox" data-th="${esc(t)}" ${draft.development.trainingHistory[t] !== undefined ? 'checked' : ''}>
          <label>${esc(t)}</label>
          <input type="text" style="width:38%; padding:6px 8px; border:1px solid var(--border); border-radius:6px;" placeholder="Facilitator"
            value="${esc(draft.development.trainingHistory[t] || '')}" data-thf="${esc(t)}" ${draft.development.trainingHistory[t] === undefined ? 'disabled' : ''}>
        </div>
      `).join('')}
    </div>

    <div class="field"><label>2. Specify other specific trainings required</label><textarea data-bind="development.specificTrainingRequired"></textarea></div>
    <div class="field"><label>Type of training required (tick where appropriate)</label></div>
    <div class="check-list">
      ${TRAINING_REQUIRED_TYPES.map(t => `
        <div class="check-item"><input type="checkbox" data-tr="${esc(t)}" ${draft.development.trainingTypesRequired.includes(t) ? 'checked' : ''}><label>${esc(t)}</label></div>
      `).join('')}
    </div>

    <div class="field"><label>Type of assistance required (tick where appropriate)</label></div>
    <div class="check-list">
      ${ASSISTANCE_TYPES.map(t => `
        <div class="check-item"><input type="checkbox" data-as="${esc(t)}" ${draft.development.assistanceRequired.includes(t) ? 'checked' : ''}><label>${esc(t)}</label></div>
      `).join('')}
    </div>
    <div class="field"><label>Other assistance — specify</label><input type="text" data-bind="development.assistanceOtherSpecify"></div>
    <div class="field"><label>Comment</label><textarea data-bind="development.comment"></textarea></div>
  `;
  bindInputs(el);
  bindYN(el);
  $all('[data-th]', el).forEach(cb => cb.addEventListener('change', () => {
    const t = cb.dataset.th;
    const fInput = $(`[data-thf="${CSS.escape(t)}"]`, el);
    if (cb.checked) { draft.development.trainingHistory[t] = fInput.value || ''; fInput.disabled = false; }
    else { delete draft.development.trainingHistory[t]; fInput.disabled = true; }
  }));
  $all('[data-thf]', el).forEach(inp => inp.addEventListener('input', () => {
    draft.development.trainingHistory[inp.dataset.thf] = inp.value;
  }));
  $all('[data-tr]', el).forEach(cb => cb.addEventListener('change', () => toggleArrItem(draft.development.trainingTypesRequired, cb.dataset.tr, cb.checked)));
  $all('[data-as]', el).forEach(cb => cb.addEventListener('change', () => toggleArrItem(draft.development.assistanceRequired, cb.dataset.as, cb.checked)));
}
function toggleArrItem(arr, item, on) {
  const i = arr.indexOf(item);
  if (on && i === -1) arr.push(item);
  if (!on && i !== -1) arr.splice(i, 1);
}

/* ---- Step E: Economic Output ---- */
function renderStepE(el) {
  el.innerHTML = `
    <div class="field"><label>1(a). No. of casuals / years employed</label>
      <div class="field-row"><input type="number" placeholder="No. of casuals" data-bind="economic.casualsCount"><input type="text" placeholder="Years employed" data-bind="economic.casualsYears"></div>
    </div>
    <div class="field"><label>1(b). No. of permanent / years employed</label>
      <div class="field-row"><input type="number" placeholder="No. of permanent" data-bind="economic.permanentCount"><input type="text" placeholder="Years employed" data-bind="economic.permanentYears"></div>
    </div>
    <div class="field"><label>1(c). Employees' fortnightly wages (Kina)</label>
      <div class="field-row"><input type="number" placeholder="Casual K" data-bind="economic.casualWageK"><input type="number" placeholder="Permanent K" data-bind="economic.permanentWageK"></div>
    </div>

    <div class="field"><label>2.1 Monthly turnover</label>
      <div class="turnover-grid">
        ${TURNOVER_BRACKETS.map(([code, label]) => `
          <div class="turnover-opt ${draft.economic.turnoverBracket === code ? 'on' : ''}">
            <input type="radio" name="turnover" value="${code}" ${draft.economic.turnoverBracket === code ? 'checked' : ''} data-turnover-radio>
            <div class="to-label">${esc(label)}</div>
            <input type="number" placeholder="Amount K" data-bind="economic.turnoverAmount" ${draft.economic.turnoverBracket === code ? '' : 'style="visibility:hidden"'}>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="field"><label>2.2 Estimated monthly expenses</label>
      <div class="turnover-grid">
        ${EXPENSE_BRACKETS.map(([code, label]) => `
          <div class="turnover-opt ${draft.economic.expensesBracket === code ? 'on' : ''}">
            <input type="radio" name="expenses" value="${code}" ${draft.economic.expensesBracket === code ? 'checked' : ''} data-expenses-radio>
            <div class="to-label">${esc(label)}</div>
            <input type="number" placeholder="Amount K" data-bind="economic.expensesAmount" ${draft.economic.expensesBracket === code ? '' : 'style="visibility:hidden"'}>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="field-row">
      <div class="field"><label>2.3 Initial capital (K)</label><input type="number" data-bind="economic.initialCapital"></div>
      <div class="field"><label>2.4 Value of assets to date (K)</label><input type="number" data-bind="economic.assetsValue"></div>
    </div>
    <div class="field"><label>2.5 Other investments (K)</label><input type="number" data-bind="economic.otherInvestments"></div>
    <div class="field"><label>Specify</label><input type="text" data-bind="economic.otherInvestmentsSpecify"></div>
  `;
  bindInputs(el);
  $all('[data-turnover-radio]', el).forEach(r => r.addEventListener('change', () => { draft.economic.turnoverBracket = r.value; renderStepE(el); }));
  $all('[data-expenses-radio]', el).forEach(r => r.addEventListener('change', () => { draft.economic.expensesBracket = r.value; renderStepE(el); }));
}

/* ---- Step F: Cash Crops ---- */
function renderStepF(el) {
  el.innerHTML = `
    <div class="field"><label>Indicate cash crops held by the household</label></div>
    <div class="card" style="background:var(--surface-2); border:1px solid var(--border);">
      <div class="crop-row" style="font-weight:700; font-size:12px; color:var(--text-muted); text-transform:uppercase;">
        <div>Crop</div><div>No. of blocks</div><div>No. of trees</div>
      </div>
      ${FIXED_CROPS.map(c => `
        <div class="crop-row">
          <div class="crop-name">${esc(c)}</div>
          <input type="number" min="0" data-crop="${esc(c)}" data-f="blocks" value="${esc((draft.cashCrops.fixed[c]||{}).blocks || '')}">
          <input type="number" min="0" data-crop="${esc(c)}" data-f="trees" value="${esc((draft.cashCrops.fixed[c]||{}).trees || '')}">
        </div>
      `).join('')}
    </div>
    <div class="field" style="margin-top:12px;"><label>Other crops</label></div>
    <div id="other-crops-table"></div>
    <div class="field"><label>Comments</label><textarea data-bind="cashCrops.comments"></textarea></div>
  `;
  bindInputs(el);
  $all('[data-crop]', el).forEach(inp => inp.addEventListener('input', () => {
    const c = inp.dataset.crop, f = inp.dataset.f;
    if (!draft.cashCrops.fixed[c]) draft.cashCrops.fixed[c] = {};
    draft.cashCrops.fixed[c][f] = inp.value;
  }));
  renderRepeatTable($('#other-crops-table'), draft.cashCrops.others, ['name', 'blocks', 'trees'], ['Crop name', 'No. of blocks', 'No. of trees'], () => renderStepF(el));
}

/* ---- Step G8: business loan for informal ---- */
function renderStepG8(el) {
  el.innerHTML = `
    ${ynToggle('business.loanAccess', '8. Are you able to access a business loan?')}
    <div id="loans-table-g8"></div>
    <div class="field" id="loan-reasons-field-g8" style="display:${draft.business.loanAccess === 'No' ? 'block' : 'none'}">
      <label>If no, state reasons why</label>
      <textarea data-bind="business.loanReasons"></textarea>
    </div>
  `;
  bindInputs(el);
  bindYN(el);
  renderRepeatTable($('#loans-table-g8'), draft.business.loans, ['institution', 'amount', 'date', 'onSchedule'],
    ['Bank / financial institution', 'Loan amount (K)', 'Date of loan', 'Repayment on schedule? (Yes/No)'], () => renderStepG8(el));
  $all('[data-yn="business.loanAccess"] button', el).forEach(b => b.addEventListener('click', () => {
    $('#loan-reasons-field-g8').style.display = draft.business.loanAccess === 'No' ? 'block' : 'none';
  }));
}

/* ---- Step G: Informal sector ---- */
function renderStepG(el) {
  el.innerHTML = `
    <div class="field"><label>Informal business activity(ies) — Table 11</label></div>
    <div id="informal-table"></div>
    <div class="field"><label>Comments</label><textarea data-bind="informal.comments"></textarea></div>
  `;
  bindInputs(el);
  renderRepeatTable($('#informal-table'), draft.informal.entries, ['ownerName', 'activityType', 'yearEstablished', 'monthlyTurnover'],
    ['Name of owner', 'Type of business activity', 'Year established', 'Monthly turnover (K)'], () => renderStepG(el));
}

/* ---- Review ---- */
function renderStepReview(el) {
  const status = draft.businessStatus;
  let html = `<div class="warn-box">Review the details below, then tap <strong>Save record</strong>. It will be stored on this device and can be exported later from the Transfer tab.</div>`;
  html += reviewBlockHTML('A. Location', [
    ['District', draft.location.district], ['Village', draft.location.village], ['Ward', draft.location.ward],
    ['Household No.', draft.location.householdNo], ['Date collected', fmtDate(draft.location.dateCollected)],
    ['Contact', draft.location.contactPerson + (draft.location.mobile ? ' · ' + draft.location.mobile : '')]
  ]);
  html += reviewBlockHTML('B. Employment', [
    ['Formally employed', draft.employment.numFormallyEmployed],
    ['Business status', status === 'formal' ? 'Formal business' : status === 'informal' ? 'Informal sector' : 'No business']
  ], reviewSubList('Employed members', draft.employment.employedMembers, fmtEmployed) + reviewSubList('Unemployed (qualified) members', draft.employment.unemployedMembers, fmtUnemployed));
  if (status === 'formal') {
    html += reviewBlockHTML('C. Business Background', [
      ['Business name', draft.business.name], ['Owner', draft.business.owner],
      ['IPA registered', draft.business.ipaRegistered],
      ['Loan access', draft.business.loanAccess]
    ], reviewSubList('Registration forms', draft.business.regForms, fmtRegForm) + reviewSubList('Licenses', draft.business.licenses, fmtLicense) + reviewSubList('Loans', draft.business.loans, fmtLoan));
    html += reviewBlockHTML('D. Development', [
      ['Training attended', draft.development.trainingAttended],
      ['Assistance required', draft.development.assistanceRequired.join(', ') || '—']
    ], reviewSubList('Training history', Object.entries(draft.development.trainingHistory || {}), ([t, f]) => `${t}${f ? ' — Facilitator: ' + f : ''}`));
    html += reviewBlockHTML('E. Economic Output', [
      ['Turnover bracket', draft.economic.turnoverBracket || '—'], ['Expenses bracket', draft.economic.expensesBracket || '—'],
      ['Initial capital (K)', draft.economic.initialCapital || '—']
    ]);
  } else if (status === 'informal') {
    html += reviewBlockHTML('C.8 Loan', [['Loan access', draft.business.loanAccess || '—']], reviewSubList('Loans', draft.business.loans, fmtLoan));
    html += reviewBlockHTML('G. Informal Sector', [], reviewSubList('Entries', draft.informal.entries, fmtInformal));
  } else {
    const cropSummary = FIXED_CROPS.filter(c => draft.cashCrops.fixed[c] && (draft.cashCrops.fixed[c].blocks || draft.cashCrops.fixed[c].trees))
      .map(c => `${c}: ${draft.cashCrops.fixed[c].blocks || 0} blocks / ${draft.cashCrops.fixed[c].trees || 0} trees`);
    html += reviewBlockHTML('F. Cash Crops', [['Comments', draft.cashCrops.comments || '—']],
      reviewSubList('Fixed crops recorded', cropSummary, x => x) + reviewSubList('Other crops', draft.cashCrops.others, fmtOtherCrop));
  }
  el.innerHTML = html;
}

function saveDraftRecord() {
  if (!draft.location.district || !draft.location.village) {
    if (!confirm('District and Village are not filled in. Save anyway?')) return;
  }
  draft.updatedAt = new Date().toISOString();
  let all = loadRecords();
  const idx = all.findIndex(r => r.id === draft.id);
  if (idx >= 0) all[idx] = draft; else all.push(draft);
  saveRecords(all);
  recordsCache = all;
  clearDraft();
  toast(editingExisting ? 'Record updated' : 'Record saved to this device');
  switchView('dashboard');
}

/* -------------------------------- transfer -------------------------------- */
function renderTransfer() {
  recordsCache = loadRecords();
  $('#transfer-record-count').textContent = recordsCache.length;
  const bytes = new Blob([JSON.stringify(recordsCache)]).size;
  $('#transfer-storage-size').textContent = bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
}
$('#btn-export-json').addEventListener('click', () => {
  const all = loadRecords();
  if (all.length === 0) { toast('No records to export yet'); return; }
  const payload = { exportedAt: new Date().toISOString(), source: 'ENB MSME Survey (offline)', recordCount: all.length, records: all };
  downloadFile(`enb-msme-export-${todayStr()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  toast('JSON exported — share this file with HQ');
});
$('#btn-export-csv').addEventListener('click', () => {
  const all = loadRecords();
  if (all.length === 0) { toast('No records to export yet'); return; }
  downloadFile(`enb-msme-export-${todayStr()}.csv`, recordsToCSV(all), 'text/csv');
  toast('CSV exported');
});

// Turns an array of row-objects into one readable cell: "entry 1 | entry 2 | ..."
function joinRows(arr, fmt) {
  if (!arr || arr.length === 0) return '';
  return arr.map(fmt).join(' | ');
}

function recordsToCSV(records) {
  const cols = [
    'id','createdAt','updatedAt','district','llg','village','ward','householdNo','dateCollected','contactPerson','mobile','postalAddress',
    'numFormallyEmployed','employedMembersDetail','unemployedMembersDetail','businessStatus',
    'businessActivities','businessName','dateCommenced','businessOwner','ipaRegistered',
    'regFormsDetail','licensesDetail','loanAccess','loansDetail','loanReasons',
    'trainingAttended','trainingHistoryDetail','trainingRequired','assistanceRequired','assistanceOtherSpecify',
    'casualsCount','casualsYears','permanentCount','permanentYears','casualWageK','permanentWageK',
    'turnoverBracket','turnoverAmount','expensesBracket','expensesAmount','initialCapital','assetsValue','otherInvestments','otherInvestmentsSpecify',
    'cashCropsSummary','cashCropsOthersDetail','cashCropsComments','informalEntriesDetail','informalComments'
  ];
  const rows = records.map(r => {
    const allActivities = Object.values(r.business.activities).filter(v => Array.isArray(v)).flat();
    const cropSummary = FIXED_CROPS.filter(c => r.cashCrops.fixed[c] && (r.cashCrops.fixed[c].blocks || r.cashCrops.fixed[c].trees))
      .map(c => `${c}:${r.cashCrops.fixed[c].blocks||0}blk/${r.cashCrops.fixed[c].trees||0}tr`).join('; ');

    const employedDetail = joinRows(r.employment.employedMembers, m =>
      `${m.name || 'Unnamed'} (${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.employer, m.grossPay && 'K' + m.grossPay + '/mo'].filter(Boolean).join(', ')})`);
    const unemployedDetail = joinRows(r.employment.unemployedMembers, m =>
      `${m.name || 'Unnamed'} (${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.comments].filter(Boolean).join(', ')})`);
    const regFormsDetail = joinRows(r.business.regForms, f =>
      `${f.form || 'Form'} (Reg#: ${f.regNo || '—'}, Date: ${f.dateReg || '—'}, Expiry: ${f.expiry || '—'})`);
    const licensesDetail = joinRows(r.business.licenses, l =>
      `${l.type || 'License'} (Receipt: ${l.receiptNo || '—'}, Expiry: ${l.expiry || '—'})`);
    const loansDetail = joinRows(r.business.loans, l =>
      `${l.institution || 'Lender'} (K${l.amount || '—'}, Date: ${l.date || '—'}, On schedule: ${l.onSchedule || '—'})`);
    const trainingHistoryDetail = joinRows(Object.entries(r.development.trainingHistory || {}), ([type, facilitator]) =>
      `${type}${facilitator ? ' (Facilitator: ' + facilitator + ')' : ''}`);
    const cashCropsOthersDetail = joinRows(r.cashCrops.others, c =>
      `${c.name || 'Crop'} (${c.blocks || 0} blocks, ${c.trees || 0} trees)`);
    const informalDetail = joinRows(r.informal.entries, e =>
      `${e.ownerName || 'Owner'} — ${e.activityType || 'activity'} (Est. ${e.yearEstablished || '—'}, K${e.monthlyTurnover || '—'}/mo)`);

    return [
      r.id, r.createdAt, r.updatedAt, r.location.district, r.location.llg, r.location.village, r.location.ward, r.location.householdNo,
      r.location.dateCollected, r.location.contactPerson, r.location.mobile, r.location.postalAddress,
      r.employment.numFormallyEmployed, employedDetail, unemployedDetail, r.businessStatus,
      allActivities.join('; '), r.business.name, r.business.dateCommenced, r.business.owner, r.business.ipaRegistered,
      regFormsDetail, licensesDetail, r.business.loanAccess, loansDetail, r.business.loanReasons,
      r.development.trainingAttended, trainingHistoryDetail, r.development.trainingTypesRequired.join('; '), r.development.assistanceRequired.join('; '), r.development.assistanceOtherSpecify,
      r.economic.casualsCount, r.economic.casualsYears, r.economic.permanentCount, r.economic.permanentYears, r.economic.casualWageK, r.economic.permanentWageK,
      r.economic.turnoverBracket, r.economic.turnoverAmount, r.economic.expensesBracket, r.economic.expensesAmount,
      r.economic.initialCapital, r.economic.assetsValue, r.economic.otherInvestments, r.economic.otherInvestmentsSpecify,
      cropSummary, cashCropsOthersDetail, r.cashCrops.comments, informalDetail, r.informal.comments
    ];
  });
  const escCsv = v => {
    const s = (v === undefined || v === null) ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map(row => row.map(escCsv).join(','))].join('\n');
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

$('#import-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let incoming;
      if (Array.isArray(data)) {
        incoming = data; // raw array of records
      } else if (Array.isArray(data.records)) {
        incoming = data.records; // bulk "Export all as JSON" shape: { records: [...] }
      } else if (data && data.id && data.location) {
        incoming = [data]; // a single record's own "Export" file (detail view)
      } else {
        incoming = [];
      }
      if (!Array.isArray(incoming) || incoming.length === 0) throw new Error('No records found in file');
      let existing = loadRecords();
      const existingIds = new Set(existing.map(r => r.id));
      let added = 0, updated = 0;
      incoming.forEach(rec => {
        if (!rec.id) return;
        const idx = existing.findIndex(r => r.id === rec.id);
        if (idx >= 0) { existing[idx] = rec; updated++; }
        else { existing.push(rec); added++; }
      });
      saveRecords(existing);
      recordsCache = existing;
      const log = $('#import-log');
      log.hidden = false;
      log.textContent = `Import complete.\n${added} new record(s) added.\n${updated} existing record(s) updated.\nTotal on device: ${existing.length}`;
      renderTransfer();
      toast('Import complete');
    } catch (err) {
      const log = $('#import-log');
      log.hidden = false;
      log.textContent = 'Import failed: ' + err.message + '\nMake sure this is a JSON file exported from this app.';
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

$('#btn-clear-all').addEventListener('click', () => {
  if (confirm('This will permanently erase ALL survey records on this device. Make sure you have exported and sent them to HQ first. Continue?')) {
    if (confirm('Are you absolutely sure? This cannot be undone.')) {
      saveRecords([]);
      clearDraft();
      recordsCache = [];
      toast('All records erased');
      renderTransfer();
    }
  }
});

/* ---------------------------- offline readiness --------------------------- */
let offlineReady = false;
function setOfflineStatus(ready, note) {
  offlineReady = ready;
  const dot = $('#offline-dot');
  const text = $('#offline-status-text');
  if (dot) dot.style.background = ready ? '#8FD9A8' : '#F2C879';
  if (text) text.textContent = ready ? 'Ready offline' : 'Preparing…';

  const icon = $('#offline-readiness-icon');
  const title = $('#offline-readiness-title');
  const desc = $('#offline-readiness-desc');
  const card = $('#offline-readiness-card');
  if (!icon) return;
  if (ready) {
    icon.textContent = '✅';
    title.textContent = 'Ready to work offline';
    desc.textContent = 'The app is fully cached on this device. Safe to switch off data now.';
    card.style.borderColor = 'var(--success)';
  } else {
    icon.textContent = '⏳';
    title.textContent = 'Not fully cached yet';
    desc.textContent = note || 'Stay connected for a moment while the app finishes storing itself on this device.';
    card.style.borderColor = 'var(--accent)';
  }
}

/* -------------------------------- boot -------------------------------- */
if (APP_ROLE === 'enumerator') {
  const importSection = document.getElementById('import-section');
  if (importSection) importSection.remove();
}
if ('serviceWorker' in navigator) {
  setOfflineStatus(false);
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    setOfflineStatus(false, 'This page was opened directly from a file, not from the website — offline mode only works when loaded from the live HTTPS site at least once.');
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        if (navigator.serviceWorker.controller) setOfflineStatus(true);
        const track = (worker) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') setOfflineStatus(true);
          });
        };
        track(reg.installing || reg.waiting);
        reg.addEventListener('updatefound', () => track(reg.installing));
      }).catch((err) => {
        console.error('Service worker registration failed:', err);
        setOfflineStatus(false, 'Could not set up offline mode on this browser. Try reloading once while connected.');
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => setOfflineStatus(true));
    });
  }
} else {
  setOfflineStatus(false, 'This browser does not support offline mode. Try Chrome or the built-in browser on your phone.');
}
renderDashboard();
