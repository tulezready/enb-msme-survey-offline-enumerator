/* =========================================================================
   ENB Commerce & Industry — Economic & MSME Survey (Offline)
   All data lives in localStorage on this device. No network calls, ever.
   ========================================================================= */

const STORAGE_KEY = 'enb_msme_draft_cache_v1'; // local draft-only cache now, not the source of truth
const DRAFT_KEY = 'enb_msme_draft_v1';
const APP_ROLE = (document.body && document.body.dataset.role) || 'hq'; // 'hq' | 'enumerator'
const DISTRICTS = ['Gazelle', 'Kokopo', 'Pomio', 'Rabaul'];
const LLG_BY_DISTRICT = {
  'Gazelle': ['Central Gazelle Rural', 'Inland Baining Rural', 'Lassul Baining Rural', 'Open Bay Rural', 'Livuan Rural', 'Reimber Rural', 'Toma Rural', 'Vunadidir Rural'],
  'Kokopo': ['Bitapaka Rural', 'Duke of York Rural', 'Kokopo-Vunamami Urban', 'Raluana Rural'],
  'Pomio': ['Central Pomio Rural', 'Inland Pomio Rural', 'East Pomio Rural', 'Melkoi Rural', 'Sinivit Rural', 'West Pomio Rural', 'Mamusi Rural'],
  'Rabaul': ['Balanataman Rural', 'Kombiu Rural', 'Rabaul Urban', 'Watom Island Rural']
};
function llgOptionsHTML(district, currentLlg) {
  const list = LLG_BY_DISTRICT[district] || [];
  let opts = `<option value="">${district ? 'Select LLG…' : 'Select district first'}</option>`;
  opts += list.map(llg => `<option value="${esc(llg)}" ${llg === currentLlg ? 'selected' : ''}>${esc(llg)}</option>`).join('');
  // Preserve an existing value that doesn't match the list (older records, imports) rather than silently wiping it
  if (currentLlg && !list.includes(currentLlg)) {
    opts += `<option value="${esc(currentLlg)}" selected>${esc(currentLlg)} (existing entry)</option>`;
  }
  return opts;
}

const WARDS_BY_LLG = {
  'Central Gazelle Rural': ['Napapar 1','Napapar 2','Napapar 3','Napapar 4','Napapar 5','Vunagogo','Takekel','Kadakada','Rakunai','Latlat','Navunaram','Tavui-liu','Malmaluan','Karavia no.1','Karavia no.2','Tavilo Settlement','Talakua','Kerevat Township','Tinganagalip'],
  'Inland Baining Rural': ['Alakasam','Lamarain','Raunsepna','Yayam','Malasaet','Burit','Nanapki','Liaga','Kereba','Vudal','Vunapalading #1','Vunapalading #2','Rangulit','Lamarainam','Mandres','Kulit','Radingi','Kamanakam','Ragaga','Rhungagi','Kadulaung settlement #1','Kadulaung settlement #2','Vungi','Gaulim','Kainagunan','Ivere','Malabonga'],
  'Lassul Baining Rural': ['Takia','Nangasn','Traiwara','Lassul','Puktas','Karo','Panarupkap','Laan','Yalom','Komgi','Naviu/Mamapit','Walmetki','Kolopom Settlement','Warakindam','Morokindam','Mobisberg Plantation'],
  'Open Bay Rural': ['Poniar/Kanako','Mobilum','Matanakunai','Mandrabit','Wilambemki/Poiniara','Open Bay Timbers'],
  'Livuan Rural': ['Rababat','Vunairoto','Kabakada','Nabata/Rakumkubur','Toboina','Raluana #3','Putanagororoi','Vunalir','Ratongor','Vunadavai','Lungalunga','Mei-Livuan','Volavolo/Rasimen'],
  'Reimber Rural': ['Vunalaka','Kuraip','Vunakalkalulu','Raburbur','Taranga','Rakotop','Kikitabu','Vunaulaiting','Totovel','Vunapaka','Rakada','Vunaiting','Ramalmal','Towaleka','Vunakainalama','Ramale'],
  'Vunadidir Rural': ['Gunanur','Rabagi no. 1','Rabagi no. 2','Raim','Rapitok no. 1','Rapitok no.2','Rapitok no.3','Rapitok no.4','Ratavul #1','Vunakabi','Tanaka','Taulil no.1','Taulil no.2','Vunadidir','Ratavul no. 2'],
  'Toma Rural': ['Bitakapuk no.1','Bitakapuk no. 2','Tagitagi no. 1','Tagitagi no. 2','Wairiki no. 1','Wairiki no. 2','Wairiki no. 3','Wairiki no. 4','Viviran no. 1','Viviran no. 2','Vunakaur','Baie','Papalaba','Vunararere','Tamanairik no. 1','Tamanairik no. 2','Rabata','Baitakapuk no. 3'],

  'Balanataman Rural': ['Ratung','Pilapila','Karavia','Ratavul','Volavolo','Nonga','Tavui no.1','Tavui no.2','Tavui no.3','Malaguna no.1','Malaguna no.2','Malaguna no.3','Iawakaka','Rapolo','Raluan no.1','Raluan no.2','Tavana','Valaur','Nonga Base Hospital'],
  'Kombiu Rural': ['Baai','Nodup','Matalau','Rakunat','Rabuana','Korere 1','Korere 2','Talvat','Matupit no. 1','Matupit no. 2','Matupit no. 3','Matupit no. 4','Matupit no. 5'],
  'Rabaul Urban': ['Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10','Ward 11','Ward 12','Ward 13','Ward 15'],
  'Watom Island Rural': ['Rakival','Taranata','Valaur','Vunabuk','Vunakabai','Vunaulaiar'],

  'Bitapaka Rural': ['Tavui no.1','Tavui no.2','Ratavul','Balada','Ralubang','Vunabaur','Watwat','Ganai','Marmar','Menebunbun','Bilur','Korai','Kamakamar','Birar','Makurapau','Rainau','Malakuna','Togoro','Tabuna','Katakatai','Londip','Ulaveo'],
  'Duke of York Rural': ['Makada/Nagaila','Molot','Maren','Butlivuan','Waira','Nabual','Inolo Kabatirai','Kumaina','Kabilomo','Urakukur','Kababiai','Mualim','Urian','Palipal','Utuan','Karawara','Urukuk','Pirtop','Nakukur no.1 & 2','Rakanda','Palpal'],
  'Kokopo-Vunamami Urban': ['Karavia','Vunamami','Bitarebarebe','Vunabalbal','Gunanba','Tinganavudu','Malakuna','Ulagunan','Livuan','Ramale','Bitagalip','Kabakaul','Takubar','Palnakuar','Ulaulatava','Vunapope','Ngunguna','Gunanur','Palavirua','Vunamai no.2'],
  'Raluana Rural': ['Raburua','Bitatita','Nugvalian','Barovon','Raluana','Ialakua','Vunatagia','Ranguna','Bitabaur','Vunamurmur','Livuan','Vunaulul','Ralalar','Turagunan','Kunakunai','Ngatur','Tinganalom','Nanuk','Balanataman','Ravat','Talakua'],

  'Melkoi Rural': ['Makmak','Lopun','Simi','Tavolo','Meletong','Uvol','Einahelei','Ruachana','Mininga','Maso','Esletenae','Mainge','Atu','Haumakia','Poio','Pilematana','Lausus','Kenmininga','Warale'],
  'Sinivit Rural': ['Rieit','Arabam','Maranagi','Lemengi','Sanbum','Marambu','Lat','Gar','Marai','Ili','Karong','Sunam','Marunga','Kavudemki','Tol','Sikut','Laup','Ivon/Gore'],
  'West Pomio Rural': ['Gugulena','Malmal','Maginuna','Totongpal','Kaiton','Puapal','Rowan/Malo','Pomai/Mu','Poro/Salel','Irena','Mauna','Lau','Bairaman','Tolel','Palmalmal'],
  'Mamusi Rural': ['Maitao','Serenguna','Paliavulu','Viosopuna','Pokapuna','Bili','Pakia','Okempuna','Kaitoto','Mapuna','Peling','Aona','Yauyau','Kaitou','Kinsena','Ulutu','Kerongkorona','Sivaona','Pepeng','Kangelona'],
  'Central Pomio Rural': ['Parole','Malakur','Kerkernena','Baien (West)','Galue','Marmar','Pomio','Olaipun','Sali','Bovalpun','Kalakuru','Kawa/Pora','Tokai','Matong','Buka','Pulpul','Kavale'],
  'Inland Pomio Rural': ['Pakia','Mile','Mukulu','Malvoni','Muele','Bago','Pakaraman','Birigi','Bagitave','Kapkena','Tuki','Lakiri','Marmu','Masuari','Manigugule','Gelioi','Ngavale'],
  'East Pomio Rural': ['Lamarain','Long','Hoya','Kaukum','Milim','Guma','Klampun','Sampun','Wawas','Bain','Raolman','Ivai','Setwei']
};

function wardOptionsHTML(llg, currentWard) {
  const list = WARDS_BY_LLG[llg] || [];
  let opts = `<option value="">${llg ? 'Select ward…' : 'Select LLG first'}</option>`;
  opts += list.map(w => `<option value="${esc(w)}" ${w === currentWard ? 'selected' : ''}>${esc(w)}</option>`).join('');
  if (currentWard && !list.includes(currentWard)) {
    opts += `<option value="${esc(currentWard)}" selected>${esc(currentWard)} (existing entry)</option>`;
  }
  return opts;
}

// Supabase project: tulezready's enb-msme-survey
const SUPABASE_URL = 'https://lgfdzxcawggxrqvsgzpz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cX_rXW51KpL-k9arZupk9w_6MS9Jlo_';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/* ---------------------------- storage layer ----------------------------
   recordsCache is the live, in-memory source of truth for everything the
   UI renders — kept in sync on every write so existing synchronous reads
   throughout the app keep working unchanged. saveRecords() pushes the
   whole current array to Supabase (upsert by id) — fine at this scale.
   Deletions go through deleteRecordRemote() explicitly, since upsert alone
   can't remove rows. Drafts stay local-only (plain, unsynced) — they're
   just in-progress wizard state, not part of the shared dataset. */
function loadRecords() { return recordsCache; }

function saveRecords(records) {
  recordsCache = records;
  persistRecords(records).catch(err => { console.error('Save failed:', err); toast('Could not save to the database — check your connection'); });
}
async function persistRecords(records) {
  if (records.length === 0) return;
  const rows = records.map(recordToRow);
  const { error } = await sb.from('msme_records').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
function recordToRow(r) {
  return {
    id: r.id,
    district: r.location.district || null,
    llg: r.location.llg || null,
    village: r.location.village || null,
    ward: r.location.ward || null,
    household_no: r.location.householdNo || null,
    business_status: r.businessStatus || null,
    date_collected: r.location.dateCollected || null,
    data: r
  };
}
async function deleteRecordRemote(id) {
  const { error } = await sb.from('msme_records').delete().eq('id', id);
  if (error) throw error;
}
async function fetchAllRecords() {
  const { data, error } = await sb.from('msme_records').select('data').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => row.data);
}

function saveDraft(d) {
  try { d == null ? localStorage.removeItem(DRAFT_KEY) : localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
  catch (e) { console.error('Draft save failed:', e); }
}
async function readDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
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
let recordsCache = [];

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

async function startNewSurvey() {
  const existingDraft = await readDraft();
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

// Records are always named District, LLG, Ward, Household — in that order —
// so they're easy to scan and locate regardless of business name (which may
// not exist for informal/no-business households).
function recordDisplayName(r) {
  const parts = [];
  if (r.location.district) parts.push(r.location.district);
  if (r.location.llg) parts.push(r.location.llg);
  if (r.location.ward) parts.push('Ward ' + r.location.ward);
  if (r.location.householdNo) parts.push('HH ' + r.location.householdNo);
  return parts.length ? parts.join(', ') : (r.business.name || 'Unnamed record');
}

function recordItemHTML(r) {
  const status = r.businessStatus || 'none';
  const initials = (r.location.village || r.location.district || '?').slice(0, 2).toUpperCase();
  const title = recordDisplayName(r);
  const sub = [r.location.village, r.business.name].filter(Boolean).join(' · ') || 'No further detail';
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

/* ------------------------------ records summary (all roles) ------------------------------ */
$('#records-mode-toggle').style.display = 'flex';
$all('#records-mode-toggle .chip').forEach(btn => btn.addEventListener('click', () => {
  $all('#records-mode-toggle .chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const mode = btn.dataset.mode;
  $('#records-list-mode').hidden = (mode !== 'list');
  $('#records-summary-mode').hidden = (mode !== 'summary');
  if (mode === 'summary') renderRecordsSummary();
}));

function tallyEntries(tallyObj) {
  return Object.entries(tallyObj).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
}

function barBlockHTML(title, pairs, opts = {}) {
  const max = Math.max(1, ...pairs.map(([, v]) => Number(v) || 0));
  const rows = pairs.map(([label, value]) => {
    const pct = Math.round(((Number(value) || 0) / max) * 100);
    return `<div class="chart-row">
      <div class="chart-label">${esc(label)}</div>
      <div class="chart-track"><div class="chart-fill${opts.accent ? ' accent' : ''}" style="width:${pct}%"></div></div>
      <div class="chart-value">${esc(value)}</div>
    </div>`;
  }).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>${rows}</div>`;
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

  const printHeader = `<div class="print-header"><div class="ph-row">
    <div class="ph-seal"><img src="logo.svg" alt="ENB logo"></div>
    <div>
      <div class="ph-title">ENB Commerce &amp; Industry — MSME Survey Report</div>
      <div class="ph-sub">Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · ${total} record(s)</div>
    </div>
  </div></div>`;

  let html = printHeader + `<div class="warn-box">Summary of all ${total} record(s) currently stored on this device — updates automatically as more surveys are collected or imported.</div>`;

  html += `<div class="stat-grid">
    <div class="stat-card"><div class="num">${total}</div><div class="lbl">Total surveyed</div></div>
    <div class="stat-card accent"><div class="num">${byStatus.formal}</div><div class="lbl">Formal business</div></div>
    <div class="stat-card"><div class="num">${byStatus.informal}</div><div class="lbl">Informal sector</div></div>
    <div class="stat-card"><div class="num">${byStatus.none}</div><div class="lbl">No business</div></div>
  </div>`;
  html += barBlockHTML('By District', DISTRICTS.map(d => [d, byDistrict[d]]));
  html += barBlockHTML('B. Employment', [
    ['Total formally employed (reported)', totalFormallyEmployed],
    ['Employed members listed (Table 1)', totalEmployedListed],
    ['Unemployed qualified members listed (Table 2)', totalUnemployedListed]
  ]);
  const topActivities = tallyEntries(activityTally).slice(0, 10);
  if (topActivities.length) html += barBlockHTML('C. Top Business Activities', topActivities);
  html += barBlockHTML('C. IPA Registration & Loans', [
    ['IPA registered — Yes', ipaYes], ['IPA registered — No', ipaNo],
    ['Loan access — Yes', loanYes], ['Loan access — No', loanNo]
  ]);
  html += barBlockHTML('D. Training & Development', [
    ['Training attended — Yes', trainingYes], ['Training attended — No', trainingNo]
  ]);
  const trainingReqList = tallyEntries(trainingReqTally);
  if (trainingReqList.length) html += barBlockHTML('Training Required (demand)', trainingReqList, { accent: true });
  const assistanceList = tallyEntries(assistanceTally);
  if (assistanceList.length) html += barBlockHTML('Assistance Required (demand)', assistanceList, { accent: true });
  html += barBlockHTML('E. Monthly Turnover Bracket', TURNOVER_BRACKETS.map(([c, label]) => [label, turnoverTally[c] || 0]));
  html += barBlockHTML('E. Monthly Expenses Bracket', EXPENSE_BRACKETS.map(([c, label]) => [label, expensesTally[c] || 0]));
  html += barBlockHTML('F. Cash Crop Totals (blocks)', FIXED_CROPS.map(c => [`${c} (${cropTotals[c].trees} trees)`, cropTotals[c].blocks]));
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
        <h3 style="margin-bottom:2px;">${esc(recordDisplayName(r))}</h3>
        <span style="font-size:12.5px; color:var(--text-muted);">${esc([r.location.village, r.business.name].filter(Boolean).join(' · '))} · Collected ${fmtDate(r.location.dateCollected)}</span>
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
    if (confirm('Delete this record from the database? This cannot be undone and affects everyone using HQ.')) {
      recordsCache = recordsCache.filter(x => x.id !== r.id);
      deleteRecordRemote(r.id).catch(err => { console.error(err); toast('Could not delete — check your connection'); });
      toast('Record deleted');
      switchView('records');
    }
  };
  $('#btn-detail-export').onclick = () => downloadFile(`msme-${recordDisplayName(r).replace(/[,\s]+/g,'-')}.json`, JSON.stringify(r, null, 2), 'application/json');
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
      <select data-bind="location.district" id="loc-district-select">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>LLG</label>
        <select data-bind="location.llg" id="loc-llg-select">
          ${llgOptionsHTML(draft.location.district, draft.location.llg)}
        </select>
      </div>
      <div class="field"><label>Ward</label>
        <select data-bind="location.ward" id="loc-ward-select">
          ${wardOptionsHTML(draft.location.llg, draft.location.ward)}
        </select>
      </div>
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
  $('#loc-district-select').addEventListener('change', () => {
    draft.location.llg = ''; // old LLG almost certainly doesn't belong to the newly picked district
    draft.location.ward = '';
    $('#loc-llg-select').innerHTML = llgOptionsHTML(draft.location.district, draft.location.llg);
    $('#loc-ward-select').innerHTML = wardOptionsHTML(draft.location.llg, draft.location.ward);
  });
  $('#loc-llg-select').addEventListener('change', () => {
    draft.location.ward = ''; // old ward almost certainly doesn't belong to the newly picked LLG
    $('#loc-ward-select').innerHTML = wardOptionsHTML(draft.location.llg, draft.location.ward);
  });
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
  const missing = [];
  if (!draft.location.district) missing.push('District');
  if (!draft.location.llg) missing.push('LLG');
  if (!draft.location.village) missing.push('Village');
  if (!draft.location.householdNo) missing.push('Household No.');
  if (missing.length) {
    toast(`Missing required field(s) in Section A: ${missing.join(', ')}`);
    stepIndex = 0;
    renderWizard();
    return;
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
async function renderTransfer() {
  recordsCache = loadRecords();
  $('#transfer-record-count').textContent = recordsCache.length;
  const bytes = new Blob([JSON.stringify(recordsCache)]).size;
  $('#transfer-storage-size').textContent = bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
  const { data: { user } } = await sb.auth.getUser();
  const emailEl = $('#account-email');
  if (emailEl) emailEl.textContent = user ? user.email : '—';
}
$('#btn-sign-out').addEventListener('click', async () => {
  await sb.auth.signOut();
  recordsCache = [];
  draft = null;
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  renderLoginForm();
});
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

$('#import-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const log = $('#import-log');
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

      let existing = loadRecords().slice();
      let added = 0, updated = 0;
      incoming.forEach(rec => {
        if (!rec.id) return;
        const idx = existing.findIndex(r => r.id === rec.id);
        if (idx >= 0) { existing[idx] = rec; updated++; }
        else { existing.push(rec); added++; }
      });

      await persistRecords(incoming); // push just the new/changed rows to Supabase
      recordsCache = existing;

      log.hidden = false;
      log.textContent = `Import complete.\n${added} new record(s) added.\n${updated} existing record(s) updated.\nTotal in database: ${existing.length}`;
      renderTransfer();
      toast('Import complete');
    } catch (err) {
      log.hidden = false;
      log.textContent = 'Import failed: ' + err.message + '\nMake sure this is a JSON file exported from the offline app, and that you have a connection.';
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});


/* ---------------------------- connection status --------------------------- */
function setConnectionStatus(online) {
  const dot = $('#offline-dot');
  const text = $('#offline-status-text');
  if (dot) dot.style.background = online ? '#8FD9A8' : '#E06B5C';
  if (text) text.textContent = online ? 'Online' : 'Offline';

  const icon = $('#offline-readiness-icon');
  const title = $('#offline-readiness-title');
  const desc = $('#offline-readiness-desc');
  const card = $('#offline-readiness-card');
  if (!icon) return;
  if (online) {
    icon.textContent = '✅';
    title.textContent = 'Connected';
    desc.textContent = 'Signed-in access to the shared database is working normally.';
    card.style.borderColor = 'var(--success)';
  } else {
    icon.textContent = '⚠️';
    title.textContent = 'No connection';
    desc.textContent = "This app needs internet to sign in and to load or save records — reconnect and try again.";
    card.style.borderColor = 'var(--danger)';
  }
}

/* ------------------------------- login screen ------------------------------- */
function showLoginError(msg) {
  const el = $('#lock-error');
  if (el) el.textContent = msg || '';
}

function renderLoginForm() {
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>HQ Sign In</h3>
    <p class="lock-desc">Sign in with your ENB Commerce &amp; Industry account.</p>
    <input type="email" id="login-email" placeholder="Email" autocomplete="username" style="width:100%; text-align:center; font-size:16px; letter-spacing:normal; padding:12px; border:1.5px solid var(--border); border-radius:10px; margin-bottom:10px;">
    <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" style="width:100%; text-align:center; font-size:16px; letter-spacing:normal; padding:12px; border:1.5px solid var(--border); border-radius:10px; margin-bottom:10px;">
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-login">Sign in</button>
  `;
  const submit = () => handleLogin($('#login-email').value.trim(), $('#login-password').value);
  $('#btn-login').addEventListener('click', submit);
  $('#login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  setTimeout(() => { const el = $('#login-email'); if (el) el.focus(); }, 50);
}

async function handleLogin(email, password) {
  if (!email || !password) { showLoginError('Enter your email and password.'); return; }
  showLoginError('');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showLoginError(error.message || 'Sign in failed.'); return; }
  await finishLogin();
}

async function finishLogin() {
  try {
    recordsCache = await fetchAllRecords();
  } catch (e) {
    console.error('Failed to load records:', e);
    showLoginError('Signed in, but could not load records — check your connection and try again.');
    return;
  }
  $('#lock-screen').hidden = true;
  document.body.classList.remove('locked');
  renderDashboard();
}

async function initLockScreen() {
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await finishLogin();
  } else {
    renderLoginForm();
  }
}

/* -------------------------------- boot -------------------------------- */
if (APP_ROLE === 'enumerator') {
  const importSection = document.getElementById('import-section');
  if (importSection) importSection.remove();
}

// Service worker still caches the static shell for fast loading and PWA
// install — it just no longer implies the app works without a connection.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('Service worker registration failed:', err));
  });
}

setConnectionStatus(navigator.onLine);
window.addEventListener('online', () => setConnectionStatus(true));
window.addEventListener('offline', () => setConnectionStatus(false));

initLockScreen();
