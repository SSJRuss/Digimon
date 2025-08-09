// DigiFarm Prototype
const GRID_W = 12, GRID_H = 10;
const PLACE_COST = 10;
const FEED_COST = 2;
const HARVEST_REWARD = 15;

let state = {
  day: 1,
  bits: 30,
  grid: [], // {id:null|digimonId, stage:0..3, name:'Agumon'}
  selected: null, // digimon object from catalog
};

// Load catalog (placeholder small set; you can swap in a full dataset later)
let CATALOG = [];

async function loadCatalog(){
  const res = await fetch('data/digimon.json');
  CATALOG = await res.json();
  renderCatalog();
}

function initGrid(){
  state.grid = Array(GRID_W*GRID_H).fill(null);
}

function save(){
  localStorage.setItem('digifarm_state', JSON.stringify(state));
  toast('Saved!');
}
function load(){
  const raw = localStorage.getItem('digifarm_state');
  if(raw){
    try{ state = JSON.parse(raw);}catch{}
  } else {
    initGrid();
  }
}

function el(id){ return document.getElementById(id); }
function toast(msg){
  const t = el('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display = 'none', 1400);
}

function spriteFor(name){
  // simple procedurally generated pixel-ish emoji blocks as placeholder
  const emotes = ['🔥','⭐','🟧','🟦','🟪','🟩','🟨','🟫','🟥','🟦','🐲','🦖','🐾','⚡','💥'];
  const code = Math.abs(hashCode(name));
  return emotes[code % emotes.length];
}
function hashCode(str){
  let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return h;
}

function renderFarm(){
  const farm = el('farm');
  farm.innerHTML='';
  // set dynamic grid sizing for mobile widths
  farm.style.gridTemplateColumns = `repeat(${GRID_W}, 1fr)`;
  state.grid.forEach((cell, idx)=>{
    const d = document.createElement('div');
    d.className='cell';
    d.addEventListener('click', ()=> onCellTap(idx));
    const spr = document.createElement('div');
    spr.className='spr';
    if(cell && cell.id){
      spr.innerHTML = `<div>${spriteFor(cell.name)}</div><div style="font-size:.6rem">${cell.name}</div><div class="muted" style="font-size:.6rem">Lv ${cell.stage+1}</div>`;
    }else{
      spr.innerHTML = `<div class="muted">+</div>`;
    }
    d.appendChild(spr);
    farm.appendChild(d);
  });
  el('bits').textContent = `Bits: ${state.bits}`;
  el('dayCounter').textContent = `Day ${state.day}`;
}

function renderCatalog(){
  const cat = el('catalog');
  cat.innerHTML='';
  CATALOG.forEach(d=>{
    const c = document.createElement('div');
    c.className='card';
    c.addEventListener('click', ()=>{
      state.selected = d;
      toast(`Selected ${d.name}. Tap a tile to place.`);
    });
    c.innerHTML = `
      <div class="spr">${spriteFor(d.name)}</div>
      <div class="row"><strong>${d.name}</strong><span class="muted">${d.stage || 'Rookie'}</span></div>
      <div class="muted">${d.type || ''}</div>
    `;
    cat.appendChild(c);
  });
}

function onCellTap(idx){
  const cell = state.grid[idx];
  if(cell && cell.id){
    // interact menu: feed or harvest if mature
    const d = state.grid[idx];
    if(d.stage < 3){
      // feed to speed growth (pay bits)
      if(state.bits >= FEED_COST){
        state.bits -= FEED_COST;
        d.stage++;
        toast(`Fed ${d.name}. Stage -> ${d.stage+1}`);
      } else {
        toast('Not enough Bits to feed.');
      }
    } else {
      // harvest gives Bits and resets tile
      state.bits += HARVEST_REWARD;
      state.grid[idx] = null;
      toast(`Harvested ${d.name}! +${HARVEST_REWARD} Bits`);
    }
  } else {
    // place if selected
    if(!state.selected){ toast('Select a Digimon first.'); return; }
    if(state.bits < PLACE_COST){ toast('Not enough Bits to place.'); return; }
    state.bits -= PLACE_COST;
    state.grid[idx] = { id: state.selected.id, name: state.selected.name, stage:0 };
    toast(`Placed ${state.selected.name}.`);
  }
  renderFarm();
}

function advanceDay(){
  state.day += 1;
  // natural growth
  state.grid = state.grid.map(cell=>{
    if(!cell) return cell;
    return { ...cell, stage: Math.min(3, cell.stage+1) };
  });
  renderFarm();
  toast('A new day dawns...');
}

function reset(){
  if(confirm('Reset farm?')){
    state = { day: 1, bits: 30, grid: Array(GRID_W*GRID_H).fill(null), selected: null };
    renderFarm();
    toast('Reset complete.');
  }
}

function wireUI(){
  el('advanceDay').addEventListener('click', advanceDay);
  el('saveBtn').addEventListener('click', save);
  el('resetBtn').addEventListener('click', reset);
}

// PWA install prompt
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.classList.remove('hidden');
  btn.onclick = async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if(outcome==='accepted') toast('Installing...');
    deferredPrompt = null;
    btn.classList.add('hidden');
  };
});

// Register service worker
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js');
  });
}

function start(){
  load();
  if(!state.grid || !state.grid.length) initGrid();
  wireUI();
  renderFarm();
  loadCatalog();
}

start();
