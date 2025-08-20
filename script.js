// -------------------------------
// Load dictionary
// -------------------------------
let DICT = {};
(async () => {
  try {
    const r = await fetch('dictionary.json', { cache: 'no-store' });
    DICT = await r.json();
    console.log('Dictionary loaded:', Object.keys(DICT).length, 'entries');
  } catch (e) {
    console.warn('dictionary.json not found / invalid.', e);
  }
})();

// -------------------------------
// DOM shortcuts
// -------------------------------
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
let mode = 'roman';

// ===============================================
// NEW: HIGH-ACCURACY TRANSLITERATION CORE
// ===============================================

const VIRAMA = '𑁆';
const ANUSVARA = '𑀁';
const VISARGA = '𑀂';
const IV = {'a':'𑀅','ā':'𑀆','i':'𑀇','ī':'𑀈','u':'𑀉','ū':'𑀊','ṛ':'𑀋','ṝ':'𑀌','ḷ':'𑀍','e':'𑀏','ai':'𑀐','o':'𑀑','au':'𑀒'};
const MV = {'a':'','ā':'𑀸','i':'𑀺','ī':'𑀻','u':'𑀼','ū':'𑀽','ṛ':'𑀾','ṝ':'𑀿','ḷ':'𑁀','e':'𑁁','ai':'𑁂','o':'𑁃','au':'𑁄'};
const C = {'k':'𑀓','kh':'𑀔','g':'𑀕','gh':'𑀖','ṅ':'𑀗','c':'𑀘','ch':'𑀙','j':'𑀚','jh':'𑀛','ñ':'𑀜','ṭ':'𑀝','ṭh':'𑀞','ḍ':'𑀟','ḍh':'𑀠','ṇ':'𑀡','t':'𑀢','th':'𑀣','d':'𑀤','dh':'𑀥','n':'𑀦','p':'𑀧','ph':'𑀨','b':'𑀩','bh':'𑀪','m':'𑀫','y':'𑀬','r':'𑀭','l':'𑀮','v':'𑀯','ś':'𑀰','ṣ':'𑀱','s':'𑀲','h':'𑀳','ḷ':'𑀷'};
const DEV2BR = {'अ':'𑀅','आ':'𑀆','इ':'𑀇','ई':'𑀈','उ':'𑀉','ऊ':'𑀊','ऋ':'𑀋','ॠ':'𑀌','ऌ':'𑀍','ए':'𑀏','ऐ':'𑀐','ओ':'𑀑','औ':'𑀒','ा':'𑀸','ि':'𑀺','ी':'𑀻','ु':'𑀼','ू':'𑀽','ृ':'𑀾','ॄ':'𑀿','ॢ':'𑁀','े':'𑁁','ै':'𑁂','ो':'𑁃','ौ':'𑁄','क':'𑀓','ख':'𑀔','ग':'𑀕','घ':'𑀖','ङ':'𑀗','च':'𑀘','छ':'𑀙','ज':'𑀚','झ':'𑀛','ञ':'𑀜','ट':'𑀝','ठ':'𑀞','ड':'𑀟','ढ':'𑀠','ण':'𑀡','त':'𑀢','थ':'𑀣','द':'𑀤','ध':'𑀥','न':'𑀦','प':'𑀧','फ':'𑀨','ब':'𑀩','भ':'𑀪','म':'𑀫','य':'𑀬','р':'𑀭','л':'𑀮','в':'𑀯','ш':'𑀰','ष':'𑀱','स':'𑀲','ह':'𑀳','ं':ANUSVARA,'ः':VISARGA,'्':VIRAMA};

// --- Rule 1: Advanced Conjunct Handling ---
// We create sorted lists of vowels and consonants, from longest to shortest.
// This ensures we match "kṣ" before we match "k", preventing errors.
const ALL_VOWELS = Object.keys(IV).sort((a, b) => b.length - a.length);
const ALL_CONSONANTS = Object.keys(C).sort((a, b) => b.length - a.length);

function romanToBrahmiWord(word) {
    if (!word) return "";

    // --- Rule 2: Schwa Deletion Logic ---
    // If a word ends in 'a' and is longer than two characters, and the second to last
    // character is a consonant, we assume the final 'a' is silent (schwa deletion).
    if (word.length > 2 && word.endsWith('a') && C[word[word.length - 2]]) {
        word = word.slice(0, -1); // Remove the final 'a'
    }

    let result = '';
    let i = 0;
    while (i < word.length) {
        let consumed = false;

        // Step 1: Check for a standalone vowel at the beginning of a word/syllable.
        const vowelMatch = ALL_VOWELS.find(v => word.startsWith(v, i));
        if (vowelMatch) {
            result += IV[vowelMatch];
            i += vowelMatch.length;
            consumed = true;
        } else {
            // Step 2: If not a vowel, it must be a consonant cluster.
            const consonantMatch = ALL_CONSONANTS.find(c => word.startsWith(c, i));
            if (consonantMatch) {
                result += C[consonantMatch];
                i += consonantMatch.length;

                // Step 3: After the consonant, look for a vowel matra.
                const matraMatch = ALL_VOWELS.find(v => word.startsWith(v, i));
                if (matraMatch) {
                    result += MV[matraMatch];
                    i += matraMatch.length;
                } else {
                    // If no vowel follows, add a virama (consonant joining mark).
                    result += VIRAMA;
                }
                consumed = true;
            }
        }

        // Failsafe: if no rule matches, just advance one character.
        if (!consumed) {
            result += word[i];
            i++;
        }
    }

    // Clean up any trailing virama at the end of the word.
    if (result.endsWith(VIRAMA)) {
        result = result.slice(0, -1);
    }
    
    return result;
}

// Helper function to split text into words and non-words (punctuation, spaces)
const isWord = (s) => /^[\p{L}\p{M}]+$/u.test(s);
function splitTokens(text){ return text.match(/\p{L}[\p{L}\p{M}\.]*|\d+|[^\s\p{L}\p{N}]+|\s+/gu) || []; }

// Main transliteration functions that process the whole text
function romanToBrahmi(text) {
    // Handle special cases like anusvara and visarga first
    text = text.replace(/ṃ/g, 'ṁ').replace(/ḥ/g, ':'); 
    return splitTokens(text.normalize('NFC'))
        .map(token => {
            if (token === 'ṁ') return ANUSVARA;
            if (token === ':') return VISARGA;
            return isWord(token) ? romanToBrahmiWord(token) : token;
        })
        .join('');
}
function devaToBrahmi(text){ let out=''; for(const ch of text.normalize('NFC')) out+=(DEV2BR[ch]??ch); return out; }
const isDeva = (s) => /[\u0900-\u097F]/.test(s);


// -------------------------------
// Main update loop
// -------------------------------
function update() {
  const src = inputText.value;
  const dev = isDeva(src);
  detectedDiv.textContent = dev ? 'Devanagari' : 'Roman';
  const bra = dev ? devaToBrahmi(src) : romanToBrahmi(src);
  outDiv.textContent = bra;
  statsDiv.textContent = `${bra.length} chars`;
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
  ipaDiv.textContent = dev ? '—' : (src || '—');
  renderAccuracy(computeAccuracy(src));
}

// Attach the event listener
if (inputText) {
  inputText.addEventListener('input', update);
} else {
  console.error("❌ CRITICAL ERROR: Could not find the input textarea with ID #input-textarea.");
}


// ===============================================
// ALL OTHER FUNCTIONS (UNCHANGED)
// ===============================================

function switchMode(m) {
  mode = m;
  [devanagariTab, romanTab].forEach(tab => tab.classList.remove('active'));
  if (m === 'devanagari') {
    devanagariTab.classList.add('active');
    inputText.placeholder = "देवनागरीमध्ये टाइप करा (उदा, धर्म, प्रदेश)...";
  } else {
    romanTab.classList.add('active');
    inputText.placeholder = "Type Roman (e.g., dharma, kṣetra)...";
  }
  update();
}
devanagariTab.addEventListener('click', () => switchMode('devanagari'));
romanTab.addEventListener('click', () => switchMode('roman'));
$('#copy-output').addEventListener('click', async () => { if (!outDiv.textContent) return; const textarea = document.createElement('textarea'); textarea.value = outDiv.textContent; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); toast('Brahmi output copied'); });
$('#download-txt').addEventListener('click', () => { if (!outDiv.textContent) return; const blob = new Blob([outDiv.textContent], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'brahmi.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); });
$('#export-pdf').addEventListener('click', () => { if (!outDiv.textContent) return; if (typeof window.jspdf === 'undefined') { toast('PDF library not found.'); console.error("jsPDF is not loaded."); return; } const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'pt', format: 'a4' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(14); const margin = 48; const maxWidth = 595 - margin * 2; const lines = doc.splitTextToSize(outDiv.textContent || '', maxWidth); doc.text(lines, margin, margin); doc.save('brahmi.pdf'); });
$('#theme-toggle').addEventListener('click', () => { document.body.classList.toggle('light-theme'); toast('Theme toggled'); });
function toast(msg) { const t = document.createElement('div'); t.textContent = msg; t.style.cssText = `position: fixed; left: 50%; bottom: 2rem; transform: translateX(-50%); background-color: #21262d; color: #c9d1d9; padding: 0.75rem 1.25rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); font-weight: 500; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); z-index: 100; opacity: 0; transition: opacity 0.3s ease, bottom 0.3s ease;`; document.body.appendChild(t); setTimeout(() => { t.style.opacity = 1; t.style.bottom = '2.5rem'; }, 30); setTimeout(() => { t.style.opacity = 0; t.style.bottom = '2rem'; setTimeout(() => t.remove(), 300); }, 2000); }
function updateSuggestions(lastWord) { if (!suggestionsDiv) return; suggestionsDiv.innerHTML = ''; if (!lastWord) return; const low = lastWord.toLowerCase(); let count = 0; for (const k of Object.keys(DICT)) { if (k.toLowerCase().startsWith(low)) { const chip = document.createElement('span'); chip.className = 'suggestion-chip'; chip.textContent = k; chip.onclick = () => { inputText.value = inputText.value.replace(/(\p{L}[\p{L}\p{M}\.]*$)/u, k + ' '); inputText.focus(); update(); }; suggestionsDiv.appendChild(chip); if (++count >= 15) break; } } }
function computeAccuracy(src) { if (!src) return 0; const tokens = splitTokens(src).filter(isWord); if (tokens.length === 0) return 0; let hits = 0; for (const t of tokens) { if (DICT[t.toLowerCase()]) hits++; } return Math.min(100, Math.round((hits / tokens.length) * 90 + 10)); }
function renderAccuracy(val) { if (!accuracyBar) return; const staticText = "Roman/Devanagari → Brahmi •"; const endText = "target with nulls + dictionary. No fonts required (pure Unicode)."; accuracyBar.textContent = `${staticText} ${val}% ${endText}`; }
switchMode(mode);
update();
