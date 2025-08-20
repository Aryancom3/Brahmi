/* ============================================= */
/* 1. DOM ELEMENT SELECTION                      */
/* ============================================= */

// Select all the interactive elements from the HTML file
const inputTextArea = document.getElementById('input-textarea');
const brahmiOutput = document.getElementById('output-brahmi');

// Header Buttons
const themeToggleButton = document.getElementById('theme-toggle');
const exportPdfButton = document.getElementById('export-pdf');
const downloadTxtButton = document.getElementById('download-txt');
const copyOutputButton = document.getElementById('copy-output');

// Tabs
const romanTab = document.getElementById('tab-roman');
const devanagariTab = document.getElementById('tab-devanagari');

// Info Boxes
const detectedLanguageP = document.getElementById('detected-language');
const meaningOutputP = document.getElementById('meaning-output');
const ipaHelperP = document.getElementById('ipa-helper');
const charStatsP = document.getElementById('char-stats');

// Footer
const accuracyBar = document.getElementById('accuracyBar');

// Global state variable
let currentInputMode = 'roman'; // 'roman' or 'devanagari'
let dictionary = {};

/* ============================================= */
/* 2. INITIALIZATION & DATA FETCHING             */
/* ============================================= */

// Fetch the dictionary data when the page loads
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        dictionary = await response.json();
        console.log("Dictionary loaded successfully.");
    } catch (error) {
        console.error("Could not load the dictionary:", error);
        accuracyBar.textContent = "Error: Could not load dictionary.json.";
    }
}

// Run functions when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadDictionary();
});


/* ============================================= */
/* 3. CORE TRANSLITERATION LOGIC                 */
/* ============================================= */

// Main function to handle input and trigger transliteration
function handleInput() {
    const inputText = inputTextArea.value;

    // --- YOUR CORE LOGIC GOES HERE ---
    // This is a placeholder. Replace `transliterateText` with your actual function.
    const transliteratedText = transliterateText(inputText, currentInputMode);
    
    // Update the UI with the results
    brahmiOutput.textContent = transliteratedText;

    // Update stats and other info
    updateStats(transliteratedText);
    updateMeaning(inputText);
    detectInputLanguage(inputText);
}

/**
 * PLACEHOLDER for your main transliteration function.
 * @param {string} text - The text to be converted.
 * @param {string} mode - The current input mode ('roman' or 'devanagari').
 * @returns {string} The converted Brahmi text.
 */
function transliterateText(text, mode) {
    // ========================================================================
    // == PASTE YOUR EXISTING TRANSLITERATION ALGORITHM HERE.
    // == This example just reverses the text to show it's working.
    // ========================================================================
    if (!text) return "";
    console.log(`Transliterating in ${mode} mode...`);
    // Example: return text.split('').reverse().join(''); 
    return "𑀩𑁆𑀭𑀸𑀳𑁆𑀫𑀻"; // Placeholder output
}


/* ============================================= */
/* 4. UI UPDATE FUNCTIONS                        */
/* ============================================= */

function updateStats(text) {
    const charCount = text.length;
    charStatsP.textContent = `${charCount} chars`;
}

function updateMeaning(text) {
    // Simple dictionary lookup. You might want a more advanced word tokenizer.
    const lowerCaseText = text.trim().toLowerCase();
    if (dictionary[lowerCaseText]) {
        meaningOutputP.textContent = dictionary[lowerCaseText];
    } else {
        meaningOutputP.textContent = '—';
    }
}

function detectInputLanguage(text) {
    // This is a very basic detection. You can implement a more robust one.
    // Devanagari characters are in the Unicode range U+0900 to U+097F
    const devanagariRegex = /[\u0900-\u097F]/;
    if (devanagariRegex.test(text)) {
        detectedLanguageP.textContent = 'Devanagari';
    } else {
        detectedLanguageP.textContent = 'Roman';
    }
}


/* ============================================= */
/* 5. EVENT LISTENERS                            */
/* ============================================= */

// Listen for every key press in the textarea
inputTextArea.addEventListener('input', handleInput);

// --- Tab Switching Logic ---
romanTab.addEventListener('click', () => {
    currentInputMode = 'roman';
    romanTab.classList.add('active');
    devanagariTab.classList.remove('active');
    inputTextArea.placeholder = "Type Roman (e.g., dharma, kṣetra)...";
    handleInput(); // Re-run transliteration with the new mode
});

devanagariTab.addEventListener('click', () => {
    currentInputMode = 'devanagari';
    devanagariTab.classList.add('active');
    romanTab.classList.remove('active');
    inputTextArea.placeholder = "Type Devanagari (e.g., धर्म, क्षेत्र)...";
    handleInput(); // Re-run transliteration with the new mode
});

// --- Header Button Logic ---

// Copy to Clipboard
copyOutputButton.addEventListener('click', () => {
    const textToCopy = brahmiOutput.textContent;
    if (navigator.clipboard && textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Visual feedback
            copyOutputButton.textContent = 'Copied!';
            setTimeout(() => {
                copyOutputButton.textContent = 'Copy Output';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
});

// Download as .txt file
downloadTxtButton.addEventListener('click', () => {
    const textToSave = brahmiOutput.textContent;
    if (textToSave) {
        const blob = new Blob([textToSave], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'brahmi_output.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

// Placeholder for PDF export
exportPdfButton.addEventListener('click', () => {
    alert('PDF export functionality is not yet implemented.');
    // You would typically use a library like jsPDF or html2pdf.js here.
});

// Placeholder for Theme toggle
themeToggleButton.addEventListener('click', () => {
    alert('Theme toggling is not yet implemented.');
    // This would typically toggle a 'light-mode' class on the <body>
    // and you would define light theme variables in your CSS.
});
