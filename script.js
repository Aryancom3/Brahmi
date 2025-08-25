// ===============================================
// PHASE 1.2: INITIALIZATION & SETUP
// ===============================================
let DICT = {};
let EXCEPTIONS = {};
let HISTORY = [];

// DOM Element Selectors
const $ = (q) => document.querySelector(q);
const inputText = $('#input-textarea');
const outDiv = $('#output-brahmi');
const ipaDiv = $('#ipa-helper');
const meaningDiv = $('#meaning-output');
const detectedDiv = $('#detected-language');
const statsDiv = $('#char-stats');
const suggestionsDiv = $('#suggestions-container');
const accuracyBar = $('#accuracyBar');
const devanagariTab = $('#tab-devanagari');
const romanTab = $('#tab-roman');
const themeToggleBtn = $('#theme-toggle');
const pdfExportBtn = $('#export-pdf');
const pngExportBtn = $('#export-png');
const historyModal = $('#history-modal'); // Changed from sidebar
const historyOpenBtn = $('#history-open-btn');
const historyCloseBtn = $('#history-close-btn');
const historyList = $('#history-list');
const historyClearBtn = $('#history-clear-btn');

let mode = 'roman';

// Initial Load Function
document.addEventListener('DOMContentLoaded', async () => {
    // Load data files
    try {
        const r = await fetch('dictionary.json', { cache: 'no-store' });
        DICT = await r.json();
        console.log('Dictionary loaded:', Object.keys(DICT).length, 'entries');
    } catch (e) { console.warn('dictionary.json not found.', e); }
    try {
        const r = await fetch('exceptions.json', { cache: 'no-store' });
        EXCEPTIONS = await r.json();
        console.log('Exceptions loaded:', Object.keys(EXCEPTIONS).length, 'entries');
    } catch (e) { console.info('exceptions.json not found (optional).'); }

    // Initialize features
    initTheme();
    initHistory();
    initEventListeners();
    
    // *** NEW: Render all Lucide icons on the page ***
    lucide.createIcons();
    
    // Initial transliteration
    update();
});

// ===============================================
// FEATURE: THEME TOGGLE (DARK/LIGHT MODE)
// ===============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
}

// ===============================================
// FEATURE: INPUT HISTORY (NOW AS A MODAL)
// ===============================================
function initHistory() {
    const savedHistory = localStorage.getItem('brahmiHistory');
    HISTORY = savedHistory ? JSON.parse(savedHistory) : [];
    renderHistory();
}

function addToHistory(text) {
    if (!text || HISTORY.includes(text)) return;
    HISTORY.unshift(text);
    if (HISTORY.length > 20) HISTORY.pop();
    localStorage.setItem('brahmiHistory', JSON.stringify(HISTORY));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (HISTORY.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No history yet.</p>';
        return;
    }
    HISTORY.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.textContent = item;
        div.onclick = () => {
            inputText.value = item;
            update();
            closeHistoryModal();
        };
        historyList.appendChild(div);
    });
}

function clearHistory() {
    HISTORY = [];
    localStorage.removeItem('brahmiHistory');
    renderHistory();
}

function openHistoryModal() {
    historyModal.classList.add('open');
}

function closeHistoryModal() {
    historyModal.classList.remove('open');
}

// ===============================================
// FEATURE: HIGH-QUALITY EXPORTS (PDF & PNG)
// ===============================================
async function exportAsPNG() {
    if (!outDiv.textContent) { toast('Nothing to export.'); return; }
    try {
        toast('Generating PNG...');
        const canvas = await html2canvas(outDiv, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--input-bg-color'),
            scale: 2
        });
        const link = document.createElement('a');
        link.download = 'brahmi-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error('PNG export failed:', e);
        toast('Error exporting PNG.');
    }
}

async function exportAsPDF() {
    if (!outDiv.textContent) { toast('Nothing to export.'); return; }
    if (typeof window.jspdf === 'undefined') { toast('PDF library not found.'); return; }
    
    toast('Generating PDF...');
    try {
        const canvas = await html2canvas(outDiv, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--input-bg-color'),
            scale: 3
        });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('brahmi-export.pdf');
    } catch (e) {
        console.error('PDF export failed:', e);
        toast('Error exporting PDF.');
    }
}


// ===============================================
// EVENT LISTENERS
// ===============================================
function initEventListeners() {
    inputText.addEventListener('input', update);
    themeToggleBtn.addEventListener('click', toggleTheme);
    pdfExportBtn.addEventListener('click', exportAsPDF);
    pngExportBtn.addEventListener('click', exportAsPNG);
    historyOpenBtn.addEventListener('click', openHistoryModal);
    historyCloseBtn.addEventListener('click', closeHistoryModal);
    historyClearBtn.addEventListener('click', clearHistory);
    devanagariTab.addEventListener('click', () => switchMode('devanagari'));
    romanTab.addEventListener('click', () => switchMode('roman'));
    $('#copy-output').addEventListener('click', copyOutput);
}

// ===============================================
// CORE LOGIC (Transliteration, Update Loop, etc.)
// ===============================================
const VIRAMA = '𑁆'; const ANUSVARA = '𑀁'; const VISARGA = '𑀂'; const IV = {'a':'𑀅','ā':'𑀆','i':'𑀇','ī':'𑀈','u':'𑀉','ū':'𑀊','ṛ':'𑀋','ṝ':'𑀌','ḷ':'𑀍','e':'𑀏','ai':'𑀐','o':'𑀑','au':'𑀒'}; const MV = {'a':'','ā':'𑀸','i':'𑀺','ī':'𑀻','u':'𑀼','ū':'𑀽','ṛ':'𑀾','ṝ':'𑀿','ḷ':'𑁀','e':'𑁁','ai':'𑁂','o':'𑁃','au':'𑁄'}; const C = {'k':'𑀓','kh':'𑀔','g':'𑀕','gh':'𑀖','ṅ':'𑀗','c':'𑀘','ch':'𑀙','j':'𑀚','jh':'𑀛','ñ':'𑀜','ṭ':'𑀝','ṭh':'𑀞','ḍ':'𑀟','ḍh':'𑀠','ṇ':'𑀡','t':'𑀢','th':'𑀣','d':'𑀤','dh':'𑀥','n':'𑀦','p':'𑀧','ph':'𑀨','b':'𑀩','bh':'𑀪','m':'𑀫','y':'𑀬','r':'𑀭','l':'𑀮','v':'𑀯','ś':'𑀰','ṣ':'𑀱','s':'𑀲','h':'𑀳','ḷ':'𑀷'}; const DEV2BR = {'अ':'𑀅','आ':'𑀆','इ':'𑀇','ई':'𑀈','उ':'𑀉','ऊ':'𑀊','ऋ':'𑀋','ॠ':'𑀌','ऌ':'𑀍','ए':'𑀏','ऐ':'𑀐','ओ':'𑀑','औ':'𑀒','ा':'𑀸','ि':'𑀺','ी':'𑀻','ु':'𑀼','ू':'𑀽','ृ':'𑀾','ॄ':'𑀿','ॢ':'𑁀','े':'𑁁','ै':'𑁂','ो':'𑁃','ौ':'𑁄','क':'𑀓','ख':'𑀔','ग':'𑀕','घ':'𑀖','ङ':'𑀗','च':'𑀘','छ':'𑀙','ज':'𑀚','झ':'𑀛','ञ':'𑀜','ट':'𑀝','ठ':'𑀞','ड':'𑀟','ढ':'𑀠','ण':'𑀡','त':'𑀢','थ':'𑀣','द':'𑀤','ध':'𑀥','न':'𑀦','प':'𑀧','फ':'𑀨','ब':'𑀩','भ':'𑀪','म':'𑀫','य':'𑀬','र':'𑀭','ल':'𑀮','व':'𑀯','श':'𑀰','ष':'𑀱','स':'𑀲','ह':'𑀳','ं':ANUSVARA,'ः':VISARGA,'्':VIRAMA};
const ALL_VOWELS = Object.keys(IV).sort((a, b) => b.length - a.length); const ALL_CONSONANTS = Object.keys(C).sort((a, b) => b.length - a.length);
function romanToBrahmiWord(word) { if (!word) return ""; const lowerWord = word.toLowerCase(); if (EXCEPTIONS[lowerWord]) { return EXCEPTIONS[lowerWord]; } if (lowerWord.endsWith('m')) { return romanToBrahmi(word.slice(0, -1)) + ANUSVARA; } let processedWord = lowerWord; if (processedWord.length > 2 && processedWord.endsWith('a') && C[processedWord[processedWord.length - 2]]) { processedWord = processedWord.slice(0, -1); } let result = ''; let i = 0; while (i < processedWord.length) { let consumed = false; const vowelMatch = ALL_VOWELS.find(v => processedWord.startsWith(v, i)); if (vowelMatch) { result += IV[vowelMatch]; i += vowelMatch.length; consumed = true; } else { const consonantMatch = ALL_CONSONANTS.find(c => processedWord.startsWith(c, i)); if (consonantMatch) { result += C[consonantMatch]; i += consonantMatch.length; const matraMatch = ALL_VOWELS.find(v => processedWord.startsWith(v, i)); if (matraMatch) { result += MV[matraMatch]; i += matraMatch.length; } else { result += VIRAMA; } consumed = true; } } if (!consumed) { result += processedWord[i]; i++; } } if (result.endsWith(VIRAMA)) { result = result.slice(0, -1); } return result; }
const isWord = (s) => /^[\p{L}\p{M}]+$/u.test(s); function splitTokens(text){ return text.match(/\p{L}[\p{L}\p{M}\.]*|\d+|[^\s\p{L}\p{N}]+|\s+/gu) || []; }
function romanToBrahmi(text) { text = text.replace(/ṃ/g, 'ṁ').replace(/ḥ/g, ':'); return splitTokens(text.normalize('NFC')).map(token => { if (token === 'ṁ') return ANUSVARA; if (token === ':') return VISARGA; return isWord(token) ? romanToBrahmiWord(token) : token; }).join(''); }
function devaToBrahmi(text){ let out=''; for(const ch of text.normalize('NFC')) out+=(DEV2BR[ch]??ch); return out; } const isDeva = (s) => /[\u0900-\u097F]/.test(s);

function update() { const src = inputText.value; const dev = isDeva(src); detectedDiv.textContent = dev ? 'Devanagari' : 'Roman'; const bra = dev ? devaToBrahmi(src) : romanToBrahmi(src); outDiv.textContent = bra; statsDiv.textContent = `${bra.length} chars`; const tokens = splitTokens(src.trim()); const last = (tokens.length ? tokens[tokens.length - 1] : '').replace(/[^\p{L}\p{M}]/gu, ''); if (last) { const direct = DICT[last] ?? DICT[last.toLowerCase()]; meaningDiv.textContent = direct ? direct : '—'; updateSuggestions(last); } else { meaningDiv.textContent = '—'; if (suggestionsDiv) suggestionsDiv.innerHTML = ''; } ipaDiv.textContent = dev ? '—' : (src || '—'); renderAccuracy(computeAccuracy(src)); }
function switchMode(m) { mode = m; [devanagariTab, romanTab].forEach(tab => tab.classList.remove('active')); if (m === 'devanagari') { devanagariTab.classList.add('active'); inputText.placeholder = "देवनागरी में टाइप करें..."; } else { romanTab.classList.add('active'); inputText.placeholder = "Type Roman (e.g., dharma)..."; } update(); }
function copyOutput() { if (!outDiv.textContent) return; const textarea = document.createElement('textarea'); textarea.value = outDiv.textContent; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); toast('Brahmi output copied'); }
function toast(msg) { const t = document.createElement('div'); t.textContent = msg; t.style.cssText = `position: fixed; left: 50%; bottom: 2rem; transform: translateX(-50%); background-color: var(--input-bg-color); color: var(--text-primary); padding: 0.75rem 1.25rem; border-radius: 8px; border: 1px solid var(--panel-border-color); font-weight: 500; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); z-index: 1000; opacity: 0; transition: all 0.3s ease;`; document.body.appendChild(t); setTimeout(() => { t.style.opacity = 1; t.style.bottom = '2.5rem'; }, 30); setTimeout(() => { t.style.opacity = 0; t.style.bottom = '2rem'; setTimeout(() => t.remove(), 300); }, 2000); }
function updateSuggestions(lastWord) { if (!suggestionsDiv) return; suggestionsDiv.innerHTML = ''; if (!lastWord) return; const low = lastWord.toLowerCase(); let count = 0; for (const k of Object.keys(DICT)) { if (k.toLowerCase().startsWith(low)) { const chip = document.createElement('span'); chip.className = 'suggestion-chip'; chip.textContent = k; chip.onclick = () => { inputText.value = inputText.value.replace(/(\p{L}[\p{L}\p{M}\.]*$)/u, k + ' '); inputText.focus(); update(); }; suggestionsDiv.appendChild(chip); if (++count >= 15) break; } } }
function computeAccuracy(src) { if (!src) return 0; const tokens = splitTokens(src).filter(isWord); if (tokens.length === 0) return 0; let hits = 0; for (const t of tokens) { if (DICT[t.toLowerCase()]) hits++; } return Math.min(100, Math.round((hits / tokens.length) * 90 + 10)); }
function renderAccuracy(val) { if (!accuracyBar) return; accuracyBar.textContent = `Roman/Devanagari → Brahmi • High Accuracy Engine`; }

let timeout;
inputText.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        update();
    }, 150);
});

inputText.addEventListener('blur', () => {
    update();
    addToHistory(inputText.value.trim());
});
