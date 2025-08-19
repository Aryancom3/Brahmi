// -------------------------------
// Load dictionary + model (accuracy)
// -------------------------------
let DICT = {};
let MODEL = {};
(async () => {
  try {
    const r = await fetch('dictionary.json', { cache: 'no-store' });
    DICT = await r.json();
    console.log('Dictionary loaded:', Object.keys(DICT).length, 'entries');
  } catch (e) {
    console.warn('dictionary.json not found / invalid.', e);
  }
  try {
    const r = await fetch('model.json', { cache: 'no-store' });
    MODEL = await r.json();
    console.log('Model loaded:', Object.keys(MODEL).length, 'params');
  } catch (e) {
    console.warn('model.json not found / invalid.', e);
  }
})();

// -------------------------------
// DOM shortcuts
// -------------------------------
const $ = (q) => document.querySelector(q);
const inputText = $('#inputText');
const outDiv = $('#out');
const ipaDiv = $('#ipa');
const meaningDiv = $('#meaning');
const suggestionsDiv = $('#suggestions');
const detectedDiv = $('#detected');
const statsDiv = $('#stats');
const accuracyBar = $('#accuracyBar');

// Mode tabs
const sanskritTab = $('#tab-sanskrit');
const romanTab = $('#tab-roman');
let mode = 'sanskrit'; // default

sanskritTab.addEventListener('click', () => switchMode('sanskrit'));
romanTab.addEventListener('click', () => switchMode('roman'));

function switchMode(m) {
  mode = m;
  [sanskritTab, romanTab].forEach(tab => tab.classList.remove('active'));
  if (m === 'sanskrit') sanskritTab.classList.add('active');
  else romanTab.classList.add('active');
  update();
}

// Action buttons
$('#copyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(outDiv.textContent);
  toast('Brahmi output copied');
});
$('#downloadBtn').addEventListener('click', () => {
  const blob = new Blob([outDiv.textContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'brahmi.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#pdfBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  const margin = 48;
  const maxWidth = 595 - margin * 2;
  const lines = doc.splitTextToSize(outDiv.textContent || '', maxWidth);
  doc.text(lines, margin, margin);
  doc.save('brahmi.pdf');
});
$('#themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
});

// -------------------------------
// Toast helper
// -------------------------------
function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:26px;transform:translateX(-50%);
  background:linear-gradient(135deg,#7c8cf6,#70e6b6);color:#0e0f14;padding:10px 14px;border-radius:12px;
  font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:50;opacity:0;transition:opacity .3s;`;
  document.body.appendChild(t);
  setTimeout(()=>t.style.opacity=1,30);
  setTimeout(()=>{t.style.opacity=0;setTimeout(()=>t.remove(),300);},1600);
}

// -------------------------------
// Core mappings (Brahmi block)
// -------------------------------
const VIRAMA = '𑁆';
const ANUSVARA = '𑀁';
const VISARGA = '𑀂';

// Independent vowels
const IV = {
  'a':'𑀅','ā':'𑀆','i':'𑀇','ī':'𑀈','u':'𑀉','ū':'𑀊','ṛ':'𑀋','ṝ':'𑀌','ḷ':'𑀍',
  'e':'𑀏','ai':'𑀐','o':'𑀑','au':'𑀒'
};
// Dependent vowels (matras)
const MV = {
  'a':'', 'ā':'𑀸','i':'𑀺','ī':'𑀻','u':'𑀼','ū':'𑀽','ṛ':'𑀾','ṝ':'𑀿','ḷ':'𑁀',
  'e':'𑁁','ai':'𑁂','o':'𑁃','au':'𑁄'
};
// Consonants
const C = {
  'k':'𑀓','kh':'𑀔','g':'𑀕','gh':'𑀖','ṅ':'𑀗',
  'c':'𑀘','ch':'𑀙','j':'𑀚','jh':'𑀛','ñ':'𑀜',
  'ṭ':'𑀝','ṭh':'𑀞','ḍ':'𑀟','ḍh':'𑀠','ṇ':'𑀡',
  't':'𑀢','th':'𑀣','d':'𑀤','dh':'𑀥','n':'𑀦',
  'p':'𑀧','ph':'𑀨','b':'𑀩','bh':'𑀪','m':'𑀫',
  'y':'𑀬','r':'𑀭','l':'𑀮','v':'𑀯',
  'ś':'𑀰','ṣ':'𑀱','s':'𑀲','h':'𑀳',
  'ḷ':'𑀷'
};

// Devanagari → Brahmi
const DEV2BR = {
  'अ':'𑀅','आ':'𑀆','इ':'𑀇','ई':'𑀈','उ':'𑀉','ऊ':'𑀊','ऋ':'𑀋','ॠ':'𑀌','ऌ':'𑀍',
  'ए':'𑀏','ऐ':'𑀐','ओ':'𑀑','औ':'𑀒',
  'ा':'𑀸','ि':'𑀺','ी':'𑀻','ु':'𑀼','ू':'𑀽','ृ':'𑀾','ॄ':'𑀿','ॢ':'𑁀',
  'े':'𑁁','ै':'𑁂','ो':'𑁃','ौ':'𑁄',
  'क':'𑀓','ख':'𑀔','ग':'𑀕','घ':'𑀖','ङ':'𑀗',
  'च':'𑀘','छ':'𑀙','ज':'𑀚','झ':'𑀛','ञ':'𑀜',
  'ट':'𑀝','ठ':'𑀞','ड':'𑀟','ढ':'𑀠','ण':'𑀡',
  'त':'𑀢','थ':'𑀣','द':'𑀤','ध':'𑀥','न':'𑀦',
  'प':'𑀧','फ':'𑀨','ब':'𑀩','भ':'𑀪','म':'𑀫',
  'य':'𑀬','र':'𑀭','ल':'𑀮','व':'𑀯',
  'श':'𑀰','ष':'𑀱','स':'𑀲','ह':'𑀳',
  'ं': ANUSVARA, 'ः': VISARGA, '्': VIRAMA
};

// -------------------------------
// Tokenization helpers
// -------------------------------
const isDeva = (s) => /[\u0900-\u097F]/.test(s);
const isWord = (s) => /^[\p{L}\p{M}]+$/u.test(s);
function splitTokens(text){
  return text.match(/\p{L}[\p{L}\p{M}\.]*|\d+|[^\s\p{L}\p{N}]+|\s+/gu) || [];
}

// -------------------------------
// Roman → Brahmi converter
// -------------------------------
const VOWELS = ['ai','au','ā','ī','ū','ṝ','ḷ','a','i','u','ṛ','e','o'];
const CONS_KEYS = Object.keys(C).sort((a,b)=>b.length-a.length);
const VOWEL_KEYS = [...VOWELS].sort((a,b)=>b.length-a.length);

function romanToBrahmiWord(w){
  if(!w) return w;
  let i=0, out='';
  while(i<w.length){
    if(w[i]==='ṃ' || w[i]==='ṁ'){ out+=ANUSVARA; i++; continue; }
    if(w[i]==='ḥ'){ out+=VISARGA; i++; continue; }
    let matched='';
    for(const v of VOWEL_KEYS){ if(w.slice(i).startsWith(v)){ matched=v; break; } }
    if(matched){ out+=IV[matched]??matched; i+=matched.length; continue; }
    let ck='';
    for(const k of CONS_KEYS){ if(w.slice(i).startsWith(k)){ ck=k; break; } }
    if(ck){
      i+=ck.length;
      let vmatch='';
      for(const v of VOWEL_KEYS){ if(w.slice(i).startsWith(v)){ vmatch=v; break; } }
      if(vmatch){ out+=(C[ck]??ck)+(MV[vmatch]??''); i+=vmatch.length; }
      else { out+=(C[ck]??ck)+VIRAMA; }
      continue;
    }
    out+=w[i]; i++;
  }
  if(out.endsWith(VIRAMA)) out=out.slice(0,-1);
  return out;
}
function romanToBrahmi(text){
  return splitTokens(text.normalize('NFC')).map(t=>isWord(t)?romanToBrahmiWord(t):t).join('');
}

// -------------------------------
// Devanagari → Brahmi converter
// -------------------------------
function devaToBrahmi(text){
  let out='';
  for(const ch of text.normalize('NFC')) out+=(DEV2BR[ch]??ch);
  return out;
}

// -------------------------------
// Suggestions + meaning lookup
// -------------------------------
function updateSuggestions(lastWord){
  suggestionsDiv.innerHTML='';
  if(!lastWord) return;
  const low=lastWord.toLowerCase();
  let count=0;
  for(const k of Object.keys(DICT)){
    if(k.toLowerCase().startsWith(low)){
      const chip=document.createElement('span');
      chip.className='sugg';
      chip.textContent=k;
      chip.onclick=()=>{
        inputText.value=inputText.value.replace(/(\p{L}[\p{L}\p{M}\.]*$)/u,k);
        update();
      };
      suggestionsDiv.appendChild(chip);
      if(++count>=15) break;
    }
  }
}

// -------------------------------
// Accuracy (model-based dummy)
// -------------------------------
function computeAccuracy(src){
  if(!src) return 0;
  // Fake confidence: length vs dictionary coverage
  const tokens=splitTokens(src).filter(isWord);
  let hits=0;
  for(const t of tokens){ if(DICT[t.toLowerCase()]) hits++; }
  return Math.min(100, Math.round((hits/tokens.length||0)*90+10));
}
function renderAccuracy(val){
  accuracyBar.style.width=val+'%';
  accuracyBar.textContent=val+'%';
}

// -------------------------------
// Main update loop
// -------------------------------
function update(){
  const src=inputText.value;
  const dev=isDeva(src);
  detectedDiv.textContent=dev?'Devanagari':'Roman';
  let bra= dev? devaToBrahmi(src) : romanToBrahmi(src);
  if(mode==='sanskrit' && dev) bra=devaToBrahmi(src);
  if(mode==='roman' && !dev) bra=romanToBrahmi(src);
  outDiv.textContent=bra;
  statsDiv.textContent=`${bra.length} chars`;

  const tokens=splitTokens(src.trim());
  const last=(tokens.length?tokens[tokens.length-1]:'').replace(/[^\p{L}\p{M}]/gu,'');
  if(last){
    const direct=DICT[last]??DICT[last.toLowerCase()];
    meaningDiv.textContent=direct?direct:'—';
    updateSuggestions(last);
  }else{
    meaningDiv.textContent='—';
    suggestionsDiv.innerHTML='';
  }
  ipaDiv.textContent=dev?'—':(src||'—');
  renderAccuracy(computeAccuracy(src));
}

// -------------------------------
// Events
// -------------------------------
inputText.addEventListener('input', update);
update();
