/* =========================================================================
   ENB Commerce & Industry — Economic & MSME Survey (Offline)
   All data lives in localStorage on this device. No network calls, ever.
   ========================================================================= */

const STORAGE_KEY = 'enb_msme_records_v1';
const DRAFT_KEY = 'enb_msme_draft_v1';
const VAULT_META_KEY = 'enb_msme_vault_meta_v1';
const PBKDF2_ITERATIONS = 150000;
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

/* ---------------------------- device LLG assignment ----------------------------
   Each device is locked to one LLG at setup — District/LLG are then fixed on
   every new survey, only Ward stays free per household. This removes an
   entire class of mistake (picking the wrong district/LLG) rather than
   relying on care, and makes this device's own Summary meaningfully scoped
   to just the LLG it's actually responsible for. */
const ASSIGNED_LLG_KEY = 'enb_msme_assigned_llg_v1';
function getAssignedLLG() {
  try { return JSON.parse(localStorage.getItem(ASSIGNED_LLG_KEY)); } catch (e) { return null; }
}
function setAssignedLLG(district, llg) {
  localStorage.setItem(ASSIGNED_LLG_KEY, JSON.stringify({ district, llg }));
}
// Used only for the one-time migration prompt on devices that already had
// data before this feature existed — suggests (never assumes) an LLG based
// on whatever's already been collected, so it's a confirm-tap, not blind entry.
function inferLLGFromRecords(records) {
  const tally = {};
  (records || []).forEach(r => {
    if (r.location && r.location.district && r.location.llg) {
      const key = r.location.district + '|||' + r.location.llg;
      tally[key] = (tally[key] || 0) + 1;
    }
  });
  let best = null, bestCount = 0;
  Object.entries(tally).forEach(([key, count]) => { if (count > bestCount) { bestCount = count; best = key; } });
  if (!best) return null;
  const [district, llg] = best.split('|||');
  return { district, llg };
}

// Supabase project — used ONLY for the one-way "Upload to HQ" feature below.
// This device has no login; the anon key here can only INSERT new records
// (enforced by an insert-only RLS policy), never read, edit, or delete
// anything already in the shared database.
const SUPABASE_URL = 'https://lgfdzxcawggxrqvsgzpz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cX_rXW51KpL-k9arZupk9w_6MS9Jlo_';
// If the CDN library hasn't loaded yet (e.g. fresh install with no signal),
// sb stays null — the whole app (survey wizard, dashboard, everything)
// must keep working regardless. Only uploadToHQ() needs sb, and it checks.
const sb = (typeof window.supabase !== 'undefined')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

/* ---------------------------- crypto layer ----------------------------
   Records are encrypted at rest with AES-256-GCM. The key is derived from
   the device PIN via PBKDF2 and only ever kept in memory (cryptoKey) —
   it is never written to storage. This device still does everything
   fully offline; the only network call anywhere in this app is the
   optional "Upload to HQ" button below, and only when you tap it. */
let cryptoKey = null; // CryptoKey, set only after a correct PIN is entered this session

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function deriveKey(pin, saltB64, iterations) {
  const enc = new TextEncoder();
  const salt = base64ToBytes(saltB64);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ctBuf)) };
}
async function decryptJSON(key, envelope) {
  const iv = base64ToBytes(envelope.iv);
  const ctBytes = base64ToBytes(envelope.ct);
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBytes);
  return JSON.parse(new TextDecoder().decode(ptBuf));
}

/* ---------------------------- IndexedDB layer ----------------------------
   Records live in IndexedDB now, not localStorage — one entry per record,
   not one giant blob. IndexedDB's quota is in the hundreds of MB to low GB
   (tied to device disk space), versus localStorage's fixed ~5-10MB per
   origin. Storing per-record also means saving one household only ever
   encrypts and writes that one record, not the entire dataset — so save
   time stays roughly constant instead of growing as the device fills up. */
const IDB_NAME = 'enb_msme_db_v1';
const IDB_STORE = 'records';
let idbPromise = null;
function openIDB() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}
function idbPut(entry) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}
function idbDelete(id) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}
function idbGetAll() {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}
function idbClear() {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

/* ---------------------------- storage layer ----------------------------
   recordsCache is the live, decrypted, in-memory source of truth for
   everything the UI renders — kept in sync on every write, so all
   existing synchronous reads throughout the app keep working unchanged.
   Only the persistence side changed: upsert/delete touch one IndexedDB
   entry, not the whole dataset. */
function loadRecords() { return recordsCache; }

// Save/update ONE record — the normal path for every survey saved in the field.
function upsertRecordLocal(record) {
  const idx = recordsCache.findIndex(r => r.id === record.id);
  if (idx >= 0) recordsCache[idx] = record; else recordsCache.push(record);
  encryptJSON(cryptoKey, record)
    .then(envelope => idbPut({ id: record.id, envelope }))
    .catch(err => { console.error('Save failed:', err); toast('Could not save — try again'); });
}
// Remove ONE record locally (does not touch the shared database).
function deleteRecordLocal(id) {
  recordsCache = recordsCache.filter(r => r.id !== id);
  idbDelete(id).catch(err => console.error('Local delete failed:', err));
}
// Bulk-replace everything — only used for PIN setup/migration and PIN change,
// where every record genuinely does need re-encrypting under a new key.
async function persistAllRecordsBulk(records) {
  await idbClear();
  await Promise.all(records.map(r => encryptJSON(cryptoKey, r).then(envelope => idbPut({ id: r.id, envelope }))));
}
async function loadAllRecordsFromIDB() {
  const entries = await idbGetAll();
  if (entries.length === 0) return [];
  // No per-entry catch here on purpose: if the PIN is wrong, every decrypt
  // fails and this must reject the whole unlock attempt, not silently
  // return an empty list that looks like "no records yet".
  return Promise.all(entries.map(e => decryptJSON(cryptoKey, e.envelope)));
}
async function clearAllRecordsLocal() {
  await idbClear();
  recordsCache = [];
}

function saveDraft(d) {
  persistDraft(d).catch(err => console.error('Draft save failed:', err));
}
async function persistDraft(d) {
  if (!cryptoKey) return;
  if (d == null) { localStorage.removeItem(DRAFT_KEY); return; }
  const envelope = await encryptJSON(cryptoKey, d);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
}
async function readDraft() {
  if (!cryptoKey) return null;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try { return await decryptJSON(cryptoKey, JSON.parse(raw)); }
  catch (e) { return null; }
}
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

/* ---------------------------- upload to HQ ----------------------------
   One-way, insert-only push to the shared database. No login needed —
   the database policy only allows adding new rows, never reading, editing,
   or deleting. Only records not yet uploaded (no syncedAt) are sent, and
   only the ones that actually succeed get marked synced, so a dropped
   connection midway just leaves the rest queued for next time. */
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
async function runUpload(records, label) {
  if (!sb) { toast('Upload needs a connection at least once to set up — try again when online'); return; }
  if (records.length === 0) { toast('Nothing to upload'); return; }
  const btn = $('#btn-upload-hq');
  const resyncBtn = $('#btn-resync-hq');
  if (btn) btn.disabled = true;
  if (resyncBtn) resyncBtn.disabled = true;
  if (btn) btn.textContent = label;
  let sentCount = 0, alreadyCount = 0, failCount = 0;
  const now = new Date().toISOString();
  const touched = [];
  // Duplicate-ID conflict = HQ still has it (harmless no-op). No conflict =
  // either genuinely new, or HQ deleted it and it just went back in — either
  // way that's a legitimate "sent". This device can only ever add rows,
  // never read, edit, or delete anything already in the shared database.
  for (const r of records) {
    try {
      const { error } = await sb.from('msme_records').insert(recordToRow(r));
      if (error) {
        const isDuplicate = error.code === '23505' || /duplicate key/i.test(error.message || '');
        if (isDuplicate) {
          alreadyCount++;
          if (!r.syncedAt) { r.syncedAt = now; touched.push(r); }
        } else {
          throw error;
        }
      } else {
        r.syncedAt = now;
        touched.push(r);
        sentCount++;
      }
    } catch (err) {
      console.error('Upload failed for', r.id, err);
      failCount++;
    }
  }
  // Only the records that actually changed get re-encrypted and rewritten —
  // not the whole local dataset, however large it's grown.
  await Promise.all(touched.map(r => upsertRecordLocal(r)));
  renderTransfer();
  if (btn) { btn.disabled = false; btn.textContent = 'Upload to HQ'; }
  if (resyncBtn) { resyncBtn.disabled = false; resyncBtn.textContent = 'Resync all with HQ'; }
  const parts = [];
  if (sentCount) parts.push(`${sentCount} sent`);
  if (alreadyCount) parts.push(`${alreadyCount} already at HQ`);
  if (failCount) parts.push(`${failCount} failed`);
  toast(parts.length ? parts.join(' · ') : 'Nothing to upload');
}

// Default, fast path — only records never confirmed sent. This is what keeps
// "Upload to HQ" quick even once a device has hundreds of synced records
// behind it, rather than re-attempting every single one on every tap.
function uploadToHQ() {
  const pending = loadRecords().filter(r => !r.syncedAt);
  runUpload(pending, 'Uploading…');
}

// Deliberate, occasional action — re-attempts every local record, including
// already-synced ones, so a record HQ deleted can come back. Slower on a
// device with a lot of history, which is exactly why it isn't the default.
function resyncAllWithHQ() {
  runUpload(loadRecords(), 'Resyncing…');
}

function uid() {
  return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function newRecord() {
  const assigned = getAssignedLLG();
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncedAt: null, // set once this record has been uploaded to HQ
    location: { district: (assigned && assigned.district) || '', llg: (assigned && assigned.llg) || '', village: '', ward: '', householdNo: '', dateCollected: todayStr(), contactPerson: '', mobile: '', postalAddress: '' },
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
let autosaveInterval = null;
function startAutosaveInterval() {
  stopAutosaveInterval();
  autosaveInterval = setInterval(() => { if (draft) saveDraft(draft); }, 4000);
}
function stopAutosaveInterval() {
  if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
}

function switchView(view) {
  currentView = view;
  if (view !== 'wizard') stopAutosaveInterval();
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
    if (currentView === 'wizard' && v !== 'wizard-new') {
      if (!confirm('Leave this survey? Your progress is autosaved — you can continue it later from "New survey."')) return;
    }
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
      startAutosaveInterval();
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
  startAutosaveInterval();
}

function editRecord(id) {
  const rec = recordsCache.find(r => r.id === id);
  if (!rec) return;
  draft = JSON.parse(JSON.stringify(rec));
  editingExisting = true;
  stepIndex = 0;
  switchView('wizard');
  renderWizard();
  startAutosaveInterval();
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
  const syncNote = r.syncedAt ? '✓ Uploaded' : 'Not uploaded yet';
  return `<div class="record-item" data-id="${r.id}">
    <div class="badge ${status}">${esc(initials)}</div>
    <div class="info"><strong>${esc(title)}</strong><span>${esc(sub)} · ${fmtDate(r.location.dateCollected)} · ${syncNote}</span></div>
    <div class="status-tag ${status}">${statusLabel}</div>
  </div>`;
}

/* ------------------------------- records list ------------------------------ */
const RECORDS_PAGE_SIZE = 50;
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

  if (renderRecordsList._resetPage !== false) renderRecordsList._page = 1;
  renderRecordsList._resetPage = true;
  const page = renderRecordsList._page || 1;
  const visibleCount = Math.min(list.length, page * RECORDS_PAGE_SIZE);
  const visible = list.slice(0, visibleCount);

  const container = $('#records-list-container');
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No matching records.</p></div>`;
  } else {
    let html = visible.map(recordItemHTML).join('');
    if (visibleCount < list.length) {
      html += `<button class="btn btn-outline btn-full" id="btn-load-more-records">Load more (${list.length - visibleCount} remaining)</button>`;
    }
    container.innerHTML = html;
    $all('.record-item', container).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
    const loadMoreBtn = $('#btn-load-more-records');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => {
      renderRecordsList._page = page + 1;
      renderRecordsList._resetPage = false;
      renderRecordsList();
    });
  }
}
let searchDebounceTimer = null;
$('#search-input').addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(renderRecordsList, 200);
});

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

function donutChartHTML(title, segments) {
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0) || 1;
  let cursor = 0;
  const stops = segments.map(seg => {
    const pct = (Number(seg.value) || 0) / total * 100;
    const start = cursor;
    cursor += pct;
    return `${seg.color} ${start}% ${cursor}%`;
  }).join(', ');
  const legend = segments.map(seg => {
    const pct = Math.round((Number(seg.value) || 0) / total * 100);
    return `<div class="donut-legend-row"><span class="donut-swatch" style="background:${seg.color}"></span>${esc(seg.label)} — ${seg.value} (${pct}%)</div>`;
  }).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})"><div class="donut-hole"><div class="donut-total">${total}</div><div class="donut-total-label">Total</div></div></div>
      <div class="donut-legend">${legend}</div>
    </div>
  </div>`;
}

function stackedBarBlockHTML(title, rowsData) {
  const rows = rowsData.map(d => {
    const total = d.formal + d.informal + d.none;
    const fPct = total ? Math.round(d.formal / total * 100) : 0;
    const iPct = total ? Math.round(d.informal / total * 100) : 0;
    const nPct = total ? Math.max(0, 100 - fPct - iPct) : 0;
    return `<div class="chart-row">
      <div class="chart-label">${esc(d.label)}</div>
      <div class="chart-track stacked-track">
        <div class="stacked-seg formal" style="width:${fPct}%"></div>
        <div class="stacked-seg informal" style="width:${iPct}%"></div>
        <div class="stacked-seg none" style="width:${nPct}%"></div>
      </div>
      <div class="chart-value">${total}</div>
    </div>`;
  }).join('');
  const legend = `<div class="stacked-legend">
    <span><i class="dot formal"></i>Formal</span>
    <span><i class="dot informal"></i>Informal</span>
    <span><i class="dot none"></i>No business</span>
  </div>`;
  return `<div class="review-block card"><h4>${esc(title)}</h4>${rows}${legend}</div>`;
}

function computeWeeklyTrend(records, weeksBack = 8) {
  const now = new Date();
  const todayDow = now.getDay();
  const buckets = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - todayDow - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    buckets.push({ start: weekStart, end: weekEnd, count: 0, label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}` });
  }
  records.forEach(r => {
    const raw = r.location && r.location.dateCollected;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    const bucket = buckets.find(b => d >= b.start && d < b.end);
    if (bucket) bucket.count++;
  });
  return buckets;
}

function trendChartHTML(title, buckets) {
  const max = Math.max(1, ...buckets.map(b => b.count));
  const w = 600, h = 150, pad = 26;
  const stepX = buckets.length > 1 ? (w - pad * 2) / (buckets.length - 1) : 0;
  const coords = buckets.map((b, i) => ({
    x: pad + i * stepX,
    y: h - pad - ((b.count / max) * (h - pad * 2)),
  }));
  const points = coords.map(c => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
  const dots = coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#153F38"></circle>`).join('');
  const labels = buckets.map((b, i) => `<text x="${coords[i].x}" y="${h - 6}" font-size="10" fill="#6B6259" text-anchor="middle">${esc(b.label)}</text>`).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>
    <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; display:block;">
      <polygon points="${areaPoints}" fill="#15423820"></polygon>
      <polyline points="${points}" fill="none" stroke="#153F38" stroke-width="2.5"></polyline>
      ${dots}
      ${labels}
    </svg>
  </div>`;
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
  const byDistrictStatus = {}; DISTRICTS.forEach(d => byDistrictStatus[d] = { formal: 0, informal: 0, none: 0 });
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
    if (r.location.district && byDistrictStatus[r.location.district] && ['formal', 'informal', 'none'].includes(r.businessStatus)) {
      byDistrictStatus[r.location.district][r.businessStatus]++;
    }

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

  const assigned = getAssignedLLG();
  let html = printHeader + `<div class="warn-box">Summary of all ${total} record(s) collected${assigned ? ` for <strong>${esc(assigned.llg)}</strong>` : ' on this device'} — updates automatically as more surveys are collected.</div>`;

  html += `<div class="stat-grid">
    <div class="stat-card"><div class="num">${total}</div><div class="lbl">Total surveyed</div></div>
    <div class="stat-card accent"><div class="num">${byStatus.formal}</div><div class="lbl">Formal business</div></div>
    <div class="stat-card"><div class="num">${byStatus.informal}</div><div class="lbl">Informal sector</div></div>
    <div class="stat-card"><div class="num">${byStatus.none}</div><div class="lbl">No business</div></div>
  </div>`;
  html += donutChartHTML('Business Status Split', [
    { label: 'Formal', value: byStatus.formal, color: '#153F38' },
    { label: 'Informal', value: byStatus.informal, color: '#D97706' },
    { label: 'No business', value: byStatus.none, color: '#B9B2A6' }
  ]);
  html += trendChartHTML('Surveys Collected — Last 8 Weeks', computeWeeklyTrend(all, 8));
  // A device locked to one LLG will only ever have one populated district —
  // the 4-district breakdown just isn't relevant here, so it's dropped.
  // Kept as a fallback only for the unlikely case of an unassigned device.
  if (!assigned) {
    html += stackedBarBlockHTML('By District (composition)', DISTRICTS.map(d => ({ label: d, ...byDistrictStatus[d] })));
  }
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
    if (confirm('Delete this record from this device? This cannot be undone.')) {
      deleteRecordLocal(r.id);
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
  const locked = !!getAssignedLLG();
  const locationHTML = locked ? `
    <div class="field">
      <label>District <span class="opt">(locked to this device)</span></label>
      <input type="text" value="${esc(draft.location.district)}" disabled style="background:var(--surface-2); color:var(--text-muted);">
    </div>
    <div class="field">
      <label>LLG <span class="opt">(locked to this device)</span></label>
      <input type="text" value="${esc(draft.location.llg)}" disabled style="background:var(--surface-2); color:var(--text-muted);">
    </div>
  ` : `
    <div class="field">
      <label>District</label>
      <select data-bind="location.district" id="loc-district-select">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>LLG</label>
      <select data-bind="location.llg" id="loc-llg-select">
        ${llgOptionsHTML(draft.location.district, draft.location.llg)}
      </select>
    </div>
  `;

  el.innerHTML = `
    ${locationHTML}
    <div class="field"><label>Ward</label>
      <select data-bind="location.ward" id="loc-ward-select">
        ${wardOptionsHTML(draft.location.llg, draft.location.ward)}
      </select>
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
  if (!locked) {
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
  const dup = findDuplicateRecord(draft);
  if (dup) {
    const proceed = confirm(`A record for Household No. ${draft.location.householdNo} in ${draft.location.llg} (Ward ${draft.location.ward || '—'}) already exists — collected ${fmtDate(dup.location.dateCollected)}. Save this as a separate entry anyway?`);
    if (!proceed) return;
  }
  draft.updatedAt = new Date().toISOString();
  upsertRecordLocal(draft);
  clearDraft();
  stopAutosaveInterval();
  toast(editingExisting ? 'Record updated' : 'Record saved to this device');
  switchView('dashboard');
}

function findDuplicateRecord(rec) {
  return recordsCache.find(r => r.id !== rec.id &&
    r.location.district === rec.location.district &&
    r.location.llg === rec.location.llg &&
    r.location.ward === rec.location.ward &&
    r.location.householdNo === rec.location.householdNo &&
    r.location.householdNo);
}

/* -------------------------------- transfer -------------------------------- */
function renderTransfer() {
  recordsCache = loadRecords();
  $('#transfer-record-count').textContent = recordsCache.length;
  const bytes = new Blob([JSON.stringify(recordsCache)]).size;
  $('#transfer-storage-size').textContent = bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
  const pendingCount = recordsCache.filter(r => !r.syncedAt).length;
  const syncEl = $('#upload-status');
  if (syncEl) {
    syncEl.textContent = pendingCount === 0
      ? (recordsCache.length === 0 ? 'No records yet' : 'All records uploaded to HQ')
      : `${pendingCount} of ${recordsCache.length} record(s) not yet uploaded`;
  }
  const assigned = getAssignedLLG();
  const assignedEl = $('#assigned-llg-display');
  if (assignedEl) assignedEl.textContent = assigned ? `${assigned.llg} (${assigned.district})` : 'Not set';
}
$('#btn-upload-hq').addEventListener('click', uploadToHQ);
$('#btn-resync-hq').addEventListener('click', resyncAllWithHQ);
$('#btn-lock-device').addEventListener('click', lockDevice);
$('#btn-change-pin').addEventListener('click', changePin);
$('#btn-change-llg').addEventListener('click', changeLLGAssignment);
$('#btn-clear-all').addEventListener('click', () => {
  if (confirm('This will permanently erase ALL survey records on this device. Make sure you have exported and sent them to HQ first. Continue?')) {
    if (confirm('Are you absolutely sure? This cannot be undone.')) {
      clearAllRecordsLocal().then(() => {
        clearDraft();
        toast('All records erased');
        renderTransfer();
      }).catch(err => { console.error('Erase failed:', err); toast('Could not erase — try again'); });
    }
  }
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

$('#import-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
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

      let added = 0, updated = 0;
      incoming.forEach(rec => {
        if (!rec.id) return;
        const exists = recordsCache.some(r => r.id === rec.id);
        upsertRecordLocal(rec);
        if (exists) updated++; else added++;
      });

      log.hidden = false;
      log.textContent = `Import complete.\n${added} new record(s) added.\n${updated} existing record(s) updated.\nTotal on device: ${recordsCache.length}`;
      renderTransfer();
      toast('Import complete');
    } catch (err) {
      log.hidden = false;
      log.textContent = 'Import failed: ' + err.message + '\nMake sure this is a JSON file exported from this app.';
    }
    e.target.value = '';
  };
  reader.readAsText(file);
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

/* ------------------------------- PIN lock screen ------------------------------- */
function showLockError(msg) {
  const el = $('#lock-error');
  if (el) el.textContent = msg || '';
}

function renderSetupForm(existingCount, legacyRecords) {
  const inferred = legacyRecords && legacyRecords.length ? inferLLGFromRecords(legacyRecords) : null;
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>Set up this device</h3>
    <p class="lock-desc">Each device is assigned to one LLG, so every survey it collects is automatically attributed correctly — no picking the wrong LLG by mistake.</p>
    <div class="field" style="text-align:left; margin-bottom:10px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">District</label>
      <select id="setup-district-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${inferred && inferred.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="field" style="text-align:left; margin-bottom:14px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">LLG</label>
      <select id="setup-llg-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        ${llgOptionsHTML(inferred ? inferred.district : '', inferred ? inferred.llg : '')}
      </select>
    </div>
    ${existingCount > 0 ? `<div class="lock-warn">This device already has ${existingCount} record(s) saved. They'll be encrypted with the PIN you set now.</div>` : ''}
    <div class="lock-warn">If you forget this PIN, the data on this device cannot be recovered — there is no reset. Write it down somewhere safe.</div>
    <input type="password" inputmode="numeric" pattern="[0-9]*" id="pin-setup-1" placeholder="Choose a PIN (4–8 digits)" maxlength="8">
    <input type="password" inputmode="numeric" pattern="[0-9]*" id="pin-setup-2" placeholder="Confirm PIN" maxlength="8">
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-pin-setup">Secure this device</button>
  `;
  $('#setup-district-select').addEventListener('change', () => {
    $('#setup-llg-select').innerHTML = llgOptionsHTML($('#setup-district-select').value, '');
  });
  const submit = () => {
    const district = $('#setup-district-select').value;
    const llg = $('#setup-llg-select').value;
    if (!district || !llg) { showLockError("Select this device's District and LLG."); return; }
    handleSetup($('#pin-setup-1').value, $('#pin-setup-2').value, legacyRecords, district, llg);
  };
  $('#btn-pin-setup').addEventListener('click', submit);
  $('#pin-setup-2').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function renderUnlockForm() {
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>Enter PIN</h3>
    <p class="lock-desc">This device's survey data is encrypted.</p>
    <input type="password" inputmode="numeric" pattern="[0-9]*" id="pin-unlock" placeholder="PIN" maxlength="8">
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-pin-unlock">Unlock</button>
    <button type="button" class="lock-forgot" id="btn-forgot-pin">Forgot PIN? Erase this device's data</button>
  `;
  const submit = () => handleUnlock($('#pin-unlock').value);
  $('#btn-pin-unlock').addEventListener('click', submit);
  $('#pin-unlock').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  $('#btn-forgot-pin').addEventListener('click', handleForgotPin);
  setTimeout(() => { const el = $('#pin-unlock'); if (el) el.focus(); }, 50);
  const state = getPinFailState();
  const remaining = state.lockUntil - Date.now();
  if (remaining > 0) showLockError(`Too many incorrect attempts. Try again in ${Math.ceil(remaining / 1000)}s.`);
}

async function handleSetup(pin, confirmPin, legacyRecords, district, llg) {
  if (!/^\d{4,8}$/.test(pin)) { showLockError('PIN must be 4–8 digits.'); return; }
  if (pin !== confirmPin) { showLockError('PINs do not match.'); return; }
  showLockError('');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = bytesToBase64(salt);
  localStorage.setItem(VAULT_META_KEY, JSON.stringify({ salt: saltB64, iterations: PBKDF2_ITERATIONS, createdAt: new Date().toISOString() }));
  cryptoKey = await deriveKey(pin, saltB64, PBKDF2_ITERATIONS);
  recordsCache = legacyRecords || [];
  await persistAllRecordsBulk(recordsCache);
  if (legacyRecords && legacyRecords.length) localStorage.removeItem(STORAGE_KEY); // old single-blob storage no longer used
  setAssignedLLG(district, llg);
  finishUnlock();
}

const PIN_FAIL_KEY = 'enb_msme_pin_fails_v1';
const PIN_FAIL_THRESHOLD = 5;
const PIN_LOCKOUT_MS = 30000;
function getPinFailState() {
  try { return JSON.parse(localStorage.getItem(PIN_FAIL_KEY)) || { count: 0, lockUntil: 0 }; }
  catch (e) { return { count: 0, lockUntil: 0 }; }
}
function setPinFailState(state) { localStorage.setItem(PIN_FAIL_KEY, JSON.stringify(state)); }
function clearPinFailState() { localStorage.removeItem(PIN_FAIL_KEY); }

async function handleUnlock(pin) {
  const state = getPinFailState();
  const now = Date.now();
  if (state.lockUntil > now) {
    showLockError(`Too many incorrect attempts. Try again in ${Math.ceil((state.lockUntil - now) / 1000)}s.`);
    return;
  }
  if (!pin) { showLockError('Enter your PIN.'); return; }
  let meta;
  try { meta = JSON.parse(localStorage.getItem(VAULT_META_KEY)); } catch (e) { meta = null; }
  if (!meta) { showLockError('Vault info missing on this device.'); return; }
  showLockError('');
  cryptoKey = await deriveKey(pin, meta.salt, meta.iterations);
  const ok = await attemptUnlockWithKey();
  if (ok) {
    clearPinFailState();
  } else {
    const newCount = (state.count || 0) + 1;
    if (newCount >= PIN_FAIL_THRESHOLD) {
      setPinFailState({ count: 0, lockUntil: Date.now() + PIN_LOCKOUT_MS });
      showLockError(`Too many incorrect attempts. Try again in ${Math.ceil(PIN_LOCKOUT_MS / 1000)}s.`);
    } else {
      setPinFailState({ count: newCount, lockUntil: 0 });
      showLockError(`Incorrect PIN. ${PIN_FAIL_THRESHOLD - newCount} attempt(s) left before a short lockout.`);
    }
  }
}

async function attemptUnlockWithKey() {
  try {
    const idbRecords = await loadAllRecordsFromIDB();
    if (idbRecords.length > 0) {
      recordsCache = idbRecords;
    } else {
      // No IndexedDB data yet — check for the old single-blob localStorage
      // scheme from a previous version of this app, and migrate it in once.
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const legacy = await decryptJSON(cryptoKey, JSON.parse(raw));
        recordsCache = Array.isArray(legacy) ? legacy : [];
        if (recordsCache.length) {
          await persistAllRecordsBulk(recordsCache);
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        recordsCache = [];
      }
    }
  } catch (e) {
    cryptoKey = null;
    return false;
  }
  if (!getAssignedLLG()) {
    renderConfirmLLGScreen(); // existing device, upgrading — one-time prompt before reaching the dashboard
  } else {
    finishUnlock();
  }
  return true;
}

// One-time migration screen for devices that already had a PIN (and possibly
// data) before device-level LLG locking existed. Suggests an LLG based on
// this device's own existing records where possible, but always requires
// an explicit confirm tap — never silently assumes.
function renderConfirmLLGScreen() {
  const inferred = inferLLGFromRecords(recordsCache);
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>Confirm this device's LLG</h3>
    <p class="lock-desc">One-time step. From now on, every new survey on this device automatically uses this LLG — no more picking it per survey.</p>
    ${inferred ? `<div class="lock-warn">Based on this device's existing records, this looks like <strong>${esc(inferred.llg)}</strong> — confirm or change it below.</div>` : ''}
    <div class="field" style="text-align:left; margin-bottom:10px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">District</label>
      <select id="confirm-district-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${inferred && inferred.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="field" style="text-align:left; margin-bottom:14px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">LLG</label>
      <select id="confirm-llg-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        ${llgOptionsHTML(inferred ? inferred.district : '', inferred ? inferred.llg : '')}
      </select>
    </div>
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-confirm-llg">Confirm &amp; Continue</button>
  `;
  $('#confirm-district-select').addEventListener('change', () => {
    $('#confirm-llg-select').innerHTML = llgOptionsHTML($('#confirm-district-select').value, '');
  });
  $('#btn-confirm-llg').addEventListener('click', () => {
    const district = $('#confirm-district-select').value;
    const llg = $('#confirm-llg-select').value;
    if (!district || !llg) { showLockError("Select this device's District and LLG."); return; }
    setAssignedLLG(district, llg);
    finishUnlock();
  });
}

function finishUnlock() {
  $('#lock-screen').hidden = true;
  document.body.classList.remove('locked');
  const assigned = getAssignedLLG();
  const llgLabel = $('#brand-llg-label');
  if (llgLabel) llgLabel.textContent = assigned ? assigned.llg : 'Commerce & Industry';
  renderDashboard();
}

function handleForgotPin() {
  if (!confirm("This erases this device's PIN and ALL survey data stored on it — it can't be decrypted without the PIN anyway. This cannot be undone. Continue?")) return;
  if (!confirm('Are you absolutely sure? All local records on this device will be permanently lost.')) return;
  localStorage.removeItem(VAULT_META_KEY);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_KEY);
  clearPinFailState();
  cryptoKey = null;
  recordsCache = [];
  idbClear().catch(() => {}).finally(() => initLockScreen());
}

function lockDevice() {
  cryptoKey = null;
  recordsCache = [];
  draft = null;
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  renderUnlockForm();
}

async function changePin() {
  let meta;
  try { meta = JSON.parse(localStorage.getItem(VAULT_META_KEY)); } catch (e) { meta = null; }
  if (!meta) { toast('No PIN set on this device yet'); return; }
  const currentPin = prompt('Enter your current PIN:');
  if (currentPin == null) return;
  try {
    const testKey = await deriveKey(currentPin, meta.salt, meta.iterations);
    const entries = await idbGetAll();
    if (entries.length > 0) await decryptJSON(testKey, entries[0].envelope); // verify against one real entry, if any exist
  } catch (e) { toast('Current PIN is incorrect'); return; }
  const newPin = prompt('Enter a new PIN (4–8 digits):');
  if (newPin == null) return;
  if (!/^\d{4,8}$/.test(newPin)) { toast('PIN must be 4–8 digits'); return; }
  const confirmNew = prompt('Confirm new PIN:');
  if (confirmNew !== newPin) { toast('PINs did not match — PIN not changed'); return; }
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newSaltB64 = bytesToBase64(newSalt);
  cryptoKey = await deriveKey(newPin, newSaltB64, PBKDF2_ITERATIONS);
  localStorage.setItem(VAULT_META_KEY, JSON.stringify({ salt: newSaltB64, iterations: PBKDF2_ITERATIONS, createdAt: meta.createdAt, changedAt: new Date().toISOString() }));
  await persistAllRecordsBulk(recordsCache);
  toast('PIN changed');
}

async function changeLLGAssignment() {
  let meta;
  try { meta = JSON.parse(localStorage.getItem(VAULT_META_KEY)); } catch (e) { meta = null; }
  if (!meta) { toast('No PIN set on this device yet'); return; }
  const currentPin = prompt("Enter your PIN to change this device's LLG assignment:");
  if (currentPin == null) return;
  try {
    const testKey = await deriveKey(currentPin, meta.salt, meta.iterations);
    const entries = await idbGetAll();
    if (entries.length > 0) await decryptJSON(testKey, entries[0].envelope);
  } catch (e) { toast('PIN is incorrect'); return; }

  const current = getAssignedLLG();
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>Change LLG Assignment</h3>
    <p class="lock-desc">This only affects NEW surveys from now on — existing records keep their original LLG.</p>
    <div class="field" style="text-align:left; margin-bottom:10px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">District</label>
      <select id="change-district-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        <option value="">Select district…</option>
        ${DISTRICTS.map(d => `<option value="${d}" ${current && current.district === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="field" style="text-align:left; margin-bottom:14px;">
      <label style="display:block; font-size:12.5px; font-weight:600; margin-bottom:5px;">LLG</label>
      <select id="change-llg-select" style="width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        ${llgOptionsHTML(current ? current.district : '', current ? current.llg : '')}
      </select>
    </div>
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-save-llg-change">Save</button>
    <button type="button" class="lock-forgot" id="btn-cancel-llg-change">Cancel</button>
  `;
  $('#change-district-select').addEventListener('change', () => {
    $('#change-llg-select').innerHTML = llgOptionsHTML($('#change-district-select').value, '');
  });
  $('#btn-save-llg-change').addEventListener('click', () => {
    const district = $('#change-district-select').value;
    const llg = $('#change-llg-select').value;
    if (!district || !llg) { showLockError('Select a District and LLG.'); return; }
    setAssignedLLG(district, llg);
    $('#lock-screen').hidden = true;
    document.body.classList.remove('locked');
    const llgLabel = $('#brand-llg-label');
    if (llgLabel) llgLabel.textContent = llg;
    toast('LLG assignment updated');
    renderTransfer();
  });
  $('#btn-cancel-llg-change').addEventListener('click', () => {
    $('#lock-screen').hidden = true;
    document.body.classList.remove('locked');
  });
}

function initLockScreen() {
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  const vaultMetaRaw = localStorage.getItem(VAULT_META_KEY);
  let legacyRecords = null;
  if (!vaultMetaRaw) {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(parsed)) legacyRecords = parsed;
    } catch (e) {}
  }
  if (vaultMetaRaw) renderUnlockForm();
  else renderSetupForm(legacyRecords ? legacyRecords.length : 0, legacyRecords);
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
initLockScreen();
