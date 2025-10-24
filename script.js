// script.js
// Browser-side SHA-256 demo using Web Crypto API

const inputText = document.getElementById('inputText');
const hashBtn = document.getElementById('hashBtn');
const clearBtn = document.getElementById('clearBtn');
const hexOut = document.getElementById('hexOut');
const b64Out = document.getElementById('b64Out');
const copyBtns = document.querySelectorAll('.copyBtn');
const compareInput = document.getElementById('compareInput');
const compareBtn = document.getElementById('compareBtn');
const compareResult = document.getElementById('compareResult');
const fileInput = document.getElementById('fileInput');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const showInput = document.getElementById('showInput');

const HISTORY_KEY = 'sha256_demo_history_v1';

function bytesToHex(bytes){
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function bytesToBase64(bytes){
  // bytes is ArrayBuffer
  const u8 = new Uint8Array(bytes);
  let binary = '';
  for (let i=0;i<u8.length;i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

async function sha256OfString(str){
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return hashBuf;
}

async function sha256OfArrayBuffer(buf){
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return hashBuf;
}

async function doHash() {
  const text = inputText.value;
  if (!text) {
    hexOut.textContent = '—';
    b64Out.textContent = '—';
    return;
  }
  hashBtn.disabled = true;
  hashBtn.textContent = 'Calculating...';
  try {
    const hashBuf = await sha256OfString(text);
    const hex = bytesToHex(hashBuf);
    const b64 = bytesToBase64(hashBuf);
    hexOut.textContent = hex;
    b64Out.textContent = b64;
    pushHistory({type:'text', input: text.slice(0,120), hex, b64, ts: Date.now()});
  } catch (e){
    console.error(e);
    hexOut.textContent = 'Error';
    b64Out.textContent = 'Error';
  } finally {
    hashBtn.disabled = false;
    hashBtn.textContent = 'Hash (SHA-256)';
  }
}

function pushHistory(item){
  const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  hist.unshift(item);
  if (hist.length > 20) hist.length = 20;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  renderHistory();
}

function renderHistory(){
  const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  historyList.innerHTML = '';
  hist.forEach(h => {
    const li = document.createElement('li');
    const date = new Date(h.ts).toLocaleString();
    li.textContent = `${date} — ${h.type} — ${h.hex.slice(0,16)}...`;
    li.title = `Hex: ${h.hex}\nBase64: ${h.b64}\nInput: ${h.input || ''}`;
    historyList.appendChild(li);
  });
}

function copyToClipboard(id){
  const text = document.getElementById(id).textContent;
  if (!text || text.trim() === '—') return;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard');
  }).catch(() => {
    alert('Copy failed — maybe insecure context?');
  });
}

async function handleFile(ev){
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const ab = e.target.result;
    const hashBuf = await sha256OfArrayBuffer(ab);
    const hex = bytesToHex(hashBuf);
    const b64 = bytesToBase64(hashBuf);
    hexOut.textContent = hex;
    b64Out.textContent = b64;
    pushHistory({type:'file', input: file.name, hex, b64, ts: Date.now()});
  };
  reader.readAsArrayBuffer(file);
}

function normalizeDigestInput(s){
  // remove whitespace and detect hex vs base64
  if (!s) return null;
  const cleaned = s.trim();
  // simple hex test (only 0-9a-fA-F)
  const isHex = /^[0-9a-fA-F]{64}$/.test(cleaned);
  if (isHex) return {type:'hex', value:cleaned.toLowerCase()};
  // base64 length for 32 bytes -> 44 chars with padding; but allow variants
  const isB64 = /^[A-Za-z0-9+/=]{43,88}$/.test(cleaned); // loose
  if (isB64) return {type:'base64', value:cleaned};
  return null;
}

compareBtn.addEventListener('click', () => {
  const candidate = compareInput.value;
  if (!candidate) {
    compareResult.textContent = 'Paste a digest to compare.';
    return;
  }
  const norm = normalizeDigestInput(candidate);
  if (!norm) {
    compareResult.textContent = 'Unrecognized digest format. Paste exact hex (64 hex chars) or base64.';
    return;
  }
  const currentHex = hexOut.textContent.trim();
  const currentB64 = b64Out.textContent.trim();
  let ok = false;
  if (norm.type === 'hex') ok = (norm.value === currentHex);
  else ok = (norm.value === currentB64);
  compareResult.textContent = ok ? 'Match ✅' : 'No match ❌';
});

hashBtn.addEventListener('click', doHash);
clearBtn.addEventListener('click', () => {
  inputText.value = '';
  hexOut.textContent = '—';
  b64Out.textContent = '—';
});
fileInput.addEventListener('change', handleFile);
copyBtns.forEach(b => {
  b.addEventListener('click', (e) => {
    const tgt = e.currentTarget.dataset.target;
    copyToClipboard(tgt);
  });
});
clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});
showInput.addEventListener('change', (e) => {
  inputText.style.display = e.target.checked ? 'block' : 'none';
});

// init
renderHistory();
