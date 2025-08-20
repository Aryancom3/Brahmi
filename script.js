// -------------------------------
// Load dictionary + model (accuracy)
// -------------------------------
let DICT = {};
let MODEL = {}; // This is not used in the provided code but kept for consistency
(async () => {
  try {
    const r = await fetch('dictionary.json', { cache: 'no-store' });
    DICT = await r.json();
    console.log('Dictionary loaded:', Object.keys(DICT).length, 'entries');
  } catch (e) {
    console.warn('dictionary.json not found / invalid.', e);
  }
  // The model.json fetch is removed as it was not being used.
})();

// -------------------------------
// DOM shortcuts (Updated for new HTML structure)
// -------------------------------
const $ = (q) => document.querySelector(q);

// Main I/O elements
const inputText = $('#input-textarea');
const outDiv = $('#output-brahmi');

// Info panel elements
const ipaDiv = $('#ipa-helper');
const meaningDiv = $('#meaning-output');
const detectedDiv = $('#detected-language');
const statsDiv = $('#char-stats');

// The suggestions container is not in the HTML. 
// This script will work without it, but suggestions will not appear.
// See notes at the bottom on how to enable this feature.
const suggestionsDiv = $('#suggestions-container'); 

// Footer element
const accuracyBar = $('#accuracyBar');

// Mode tabs
const devanagariTab = $('#tab-devanagari');
const romanTab = $('#tab-roman');
let mode = 'roman'; // Default mode

devanagariTab.addEventListener('click', () => switchMode('devanagari'));
romanTab.addEventListener('click', () => switchMode('roman'));

function switchMode(m) {
  mode = m;
  [devanagariTab, romanTab].forEach(tab => tab.classList.remove('active'));
  if (m === 'devanagari') {
    devanagariTab.classList.add('active');
    inputText.placeholder = "देवनागरी में टाइप करें (जैसे, धर्म, क्षेत्र) ...";
  } else {
    romanTab.classList.add('active');
    inputText.placeholder = "Type Roman (e.g., dharma, kṣetra)...";
  }
  update();
}

// Action buttons in the header
$('#copy-output').addEventListener('click', async () => {
  if (!outDiv.textContent) return;
  // Using a temporary textarea for robust copying
  const textarea = document.createElement('textarea');
  textarea.value = outDiv.textContent;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  toast('Brahmi output copied');
});

$('#download-txt').addEventListener('click', () => {
  if (!outDiv.textContent) return;
  const blob = new Blob([outDiv.textContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'brahmi.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
});

// PDF Export requires the jsPDF library to be loaded in index.html
// Example: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
$('#export-pdf').addEventListener('click', () => {
  if (!outDiv.textContent) return;
  if (typeof window.jspdf === 'undefined') {
    toast('PDF library not found.');
    console.error("jsPDF is not loaded. Please include the library in your HTML.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'normal'); // Note: jsPDF has limited Unicode support. Non-latin characters may not render.
  doc.setFontSize(14);
  const margin = 48;
  const maxWidth = 595 - margin * 2;
  const lines = doc.splitTextToSize(outDiv.textContent || '', maxWidth);
  doc.text(lines, margin, margin);
  doc.save('brahmi.pdf');
});

$('#theme-toggle').addEventListener('click', () => {
  // A simple theme toggle can be done by adding a class to the body
  document.body.classList.toggle('light-theme');
  toast('Theme toggled');
});

// -------------------------------
// Toast helper (Styled to match new UI)
// -------------------------------
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 2rem;
    transform: translateX(-50%);
    background-color: #21262d;
    color: #c9d1d9;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 500;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    z-index: 100;
    opacity: 0;
    transition: opacity 0.3s ease, bottom 0.3s ease;
  `;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = 1;
    t.style.bottom = '2.5rem';
  }, 30);
  setTimeout(() => {
    t.style.opacity = 0;
    t.style.bottom = '2rem';
    setTimeout(() => t.remove(), 300);
  }, 2000);
}

// ===============================================
// CORE TRANSLITERATION LOGIC (UNCHANGED)
// ===============================================
const VIRAMA = '𑁆';
const ANUSVARA = '𑀁';
const VISARGA = '𑀂';
const IV = {'a':'𑀅','ā':'𑀆','i':'𑀇','ī':'𑀈','u':'𑀉','ū':'𑀊','ṛ':'𑀋','ṝ':'𑀌','ḷ':'𑀍','e':'𑀏','ai':'𑀐','o':'𑀑','au':'𑀒'};
const MV = {'a':'','ā':'𑀸','i':'𑀺','ī':'𑀻','u':'𑀼','ū':'𑀽','ṛ':'𑀾','ṝ':'𑀿','ḷ':'𑁀','e':'𑁁','ai':'𑁂','o':'𑁃','au':'𑁄'};
const C = {'k':'𑀓','kh':'𑀔','g':'𑀕','gh':'𑀖','ṅ':'𑀗','c':'𑀘','ch':'𑀙','j':'𑀚','jh':'𑀛','ñ':'𑀜','ṭ':'𑀝','ṭh':'𑀞','ḍ':'𑀟','ḍh':'𑀠','ṇ':'𑀡','t':'𑀢','th':'𑀣','d':'𑀤','dh':'𑀥','n':'𑀦','p':'𑀧','ph':'𑀨','b':'𑀩','bh':'𑀪','m':'𑀫','y':'𑀬','r':'𑀭','l':'𑀮','v':'𑀯','ś':'𑀰','ṣ':'𑀱','s':'𑀲','h':'𑀳','ḷ':'𑀷'};
const DEV2BR = {'अ':'𑀅','आ':'𑀆','इ':'𑀇','ई':'𑀈','उ':'𑀉','ऊ':'𑀊','ऋ':'𑀋','ॠ':'𑀌','ऌ':'𑀍','ए':'𑀏','ऐ':'𑀐','ओ':'𑀑','औ':'𑀒','ा':'𑀸','ि':'𑀺','ी':'𑀻','ु':'𑀼','ू':'𑀽','ृ':'𑀾','ॄ':'𑀿','ॢ':'𑁀','े':'𑁁','ै':'𑁂','ो':'𑁃','ौ':'𑁄','क':'𑀓','ख':'𑀔','ग':'𑀕','घ':'𑀖','ङ':'𑀗','च':'𑀘','छ':'𑀙','ज':'𑀚','झ':'𑀛','ञ':'𑀜','ट':'𑀝','ठ':'𑀞','ड':'𑀟','ढ':'𑀠','ण':'𑀡','त':'𑀢','थ':'𑀣','द':'𑀤','ध':'𑀥','न':'𑀦','प':'𑀧','फ':'𑀨','ब':'𑀩','भ':'𑀪','म':'𑀫','य':'𑀬','र':'𑀭','ल':'𑀮','व':'𑀯','श':'𑀰','ष':'𑀱','स':'𑀲','ह':'𑀳','ं':ANUSVARA,'ः':VISARGA,'्':VIRAMA};
const isDeva = (s) => /[\u0900-\u097F]/.test(s);
const isWord = (s) => /^[\p{L}\p{M}]+$/u.test(s);
function splitTokens(text){ return text.match(/\p{L}[\p{L}\p{M}\.]*|\d+|[^\s\p{L}\p{N}]+|\s+/gu) || []; }
const VOWELS = ['ai','au','ā','ī','ū','ṝ','ḷ','a','i','u','ṛ','e','o'];
const CONS_KEYS = Object.keys(C).sort((a,b)=>b.length-a.length);
const VOWEL_KEYS = [...VOWELS].sort((a,b)=>b.length-a.length);
function romanToBrahmiWord(w){if(!w)return w;let i=0,out='';while(i<w.length){if(w[i]==='ṃ'||w[i]==='ṁ'){out+=ANUSVARA;i++;continue;}if(w[i]==='ḥ'){out+=VISARGA;i++;continue;}let matched='';for(const v of VOWEL_KEYS){if(w.slice(i).startsWith(v)){matched=v;break;}}if(matched){out+=IV[matched]??matched;i+=matched.length;continue;}let ck='';for(const k of CONS_KEYS){if(w.slice(i).startsWith(k)){ck=k;break;}}if(ck){i+=ck.length;let vmatch='';for(const v of VOWEL_KEYS){if(w.slice(i).startsWith(v)){vmatch=v;break;}}if(vmatch){out+=(C[ck]??ck)+(MV[vmatch]??'');i+=vmatch.length;}else{out+=(C[ck]??ck)+VIRAMA;}continue;}out+=w[i];i++;}if(out.endsWith(VIRAMA))out=out.slice(0,-1);return out;}
function romanToBrahmi(text){ return splitTokens(text.normalize('NFC')).map(t=>isWord(t)?romanToBrahmiWord(t):t).join(''); }
function devaToBrahmi(text){ let out=''; for(const ch of text.normalize('NFC')) out+=(DEV2BR[ch]??ch); return out; }
// ===============================================

// -------------------------------
// Suggestions + meaning lookup
// -------------------------------
function updateSuggestions(lastWord) {
  // Gracefully exit if the suggestions container doesn't exist in the HTML
  if (!suggestionsDiv) return;

  suggestionsDiv.innerHTML = '';
  if (!lastWord) return;
  const low = lastWord.toLowerCase();
  let count = 0;
  for (const k of Object.keys(DICT)) {
    if (k.toLowerCase().startsWith(low)) {
      const chip = document.createElement('span');
      chip.className = 'suggestion-chip'; // Use a class for styling
      chip.textContent = k;
      chip.onclick = () => {
        inputText.value = inputText.value.replace(/(\p{L}[\p{L}\p{M}\.]*$)/u, k + ' ');
        inputText.focus();
        update();
      };
      suggestionsDiv.appendChild(chip);
      if (++count >= 15) break;
    }
  }
}

// -------------------------------
// Accuracy (Updated logic)
// -------------------------------
function computeAccuracy(src) {
  if (!src) return 0;
  const tokens = splitTokens(src).filter(isWord);
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (DICT[t.toLowerCase()]) hits++;
  }
  return Math.min(100, Math.round((hits / tokens.length) * 90 + 10));
}

function renderAccuracy(val) {
  // This function now updates the text in the footer instead of a visual bar
  if (!accuracyBar) return;
  const staticText = "Roman/Devanagari → Brahmi •";
  const endText = "target with nulls + dictionary. No fonts required (pure Unicode).";
  accuracyBar.textContent = `${staticText} ${val}% ${endText}`;
}

// -------------------------------
// Main update loop
// -------------------------------
function update() {
  const src = inputText.value;
  const dev = isDeva(src);
  
  // Update detected language text
  detectedDiv.textContent = dev ? 'Devanagari' : 'Roman';

  // Transliterate based on detected script
  const bra = dev ? devaToBrahmi(src) : romanToBrahmi(src);
  outDiv.textContent = bra;
  statsDiv.textContent = `${bra.length} chars`;

  // Handle dictionary meaning and suggestions
  const tokens = splitTokens(src.trim());
  const last = (tokens.length ? tokens[tokens.length - 1] : '').replace(/[^\p{L}\p{M}]/gu, '');
  
  if (last) {
    const direct = DICT[last] ?? DICT[last.toLowerCase()];
    meaningDiv.textContent = direct ? direct : '—';
    updateSuggestions(last);
  } else {
    meaningDiv.textContent = '—';
    if (suggestionsDiv) suggestionsDiv.innerHTML = '';
  }

  // Update IPA helper (shows Roman text, or nothing if input is Devanagari)
  ipaDiv.textContent = dev ? '—' : (src || '—');
  
  // Update accuracy text
  renderAccuracy(computeAccuracy(src));
}

// -------------------------------
// Initial setup and events
// -------------------------------
inputText.addEventListener('input', update);
// Run on page load
switchMode(mode); // Initialize with the default mode
update();
