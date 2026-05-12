const bgVideo = document.getElementById('bgVideo');
const hint = document.getElementById('hint');

bgVideo.src = 'vids/video2.mp4';
bgVideo.muted = true;
bgVideo.loop = true;
bgVideo.playsInline = true;
bgVideo.play().catch(() => {});

const ambient = new Audio('sounds/sound1.mp3');
ambient.loop = true;
ambient.volume = 0.6;

let soundStarted = false;
function startSound() {
  if (soundStarted) return;
  soundStarted = true;
  // Force reload the audio src to reset state after page refresh
  ambient.load();
  ambient.play().catch(e => console.log('Audio error:', e));
}

const TOTAL = 32;
const SPAWN_DIST = 60;
const FADE_AFTER = 6000;
const REMOVE_AFTER = 10000;

let lastX = null, lastY = null;
let flowerIndex = 0;
let trailFlowers = [];
let moved = false;

// Currently active global effect — null means no effect
let activeEffect = null;

const order = Array.from({ length: TOTAL }, (_, i) => i + 1);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}

// All available effects
const effects = [
  'fx-invert',
  'fx-grayscale',
  'fx-blur',
  'fx-wiggle',
  'fx-spin',
  'fx-fadescale',
  'fx-opacitycolor',
  'fx-disperse',
  'fx-ghost',
  'fx-burn',
];

// Pick a random effect different from the current one
function pickNewEffect() {
  const others = effects.filter(e => e !== activeEffect);
  return others[Math.floor(Math.random() * others.length)];
}

// Apply or remove effect on a single flower element
function applyEffect(el, fx) {
  effects.forEach(e => el.classList.remove(e));
  if (fx) el.classList.add(fx);
}

// Update all existing trail flowers to the new effect
function updateAllTrailFlowers(fx) {
  trailFlowers.forEach(el => applyEffect(el, fx));
}

// JS overlay — spawns another flower on top
function doOverlay(el) {
  const overlayNum = Math.ceil(Math.random() * TOTAL);
  const rect = el.getBoundingClientRect();
  const copy = document.createElement('div');
  copy.style.cssText = `position:fixed;left:${rect.left+rect.width/2}px;top:${rect.top+rect.height/2}px;transform:translate(-50%,-50%) scale(0.5);z-index:30;pointer-events:none;transition:transform 0.5s ease,opacity 0.5s ease;opacity:0;`;
  const img = document.createElement('img');
  img.src = `flowers/f${overlayNum}.png`;
  img.style.cssText = 'width:220px;height:220px;object-fit:contain;mix-blend-mode:screen;';
  copy.appendChild(img);
  document.body.appendChild(copy);
  setTimeout(() => { copy.style.transform='translate(-50%,-50%) scale(1.1)'; copy.style.opacity='1'; }, 50);
  setTimeout(() => { copy.style.opacity='0'; copy.style.transform='translate(-50%,-50%) scale(0.3)'; }, 1200);
  setTimeout(() => copy.remove(), 1800);
}

// JS multiply — 4 copies burst outward
function doMultiply(el, num) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy], i) => {
    setTimeout(() => {
      const copy = document.createElement('div');
      copy.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%) scale(0.3);z-index:25;pointer-events:none;opacity:0;transition:transform 0.6s ease,opacity 0.6s ease,left 0.6s ease,top 0.6s ease;`;
      const img = document.createElement('img');
      img.src = `flowers/f${num}.png`;
      img.style.cssText = 'width:160px;height:160px;object-fit:contain;mix-blend-mode:screen;';
      copy.appendChild(img);
      document.body.appendChild(copy);
      setTimeout(() => { copy.style.left=`${cx+dx*130}px`; copy.style.top=`${cy+dy*130}px`; copy.style.transform='translate(-50%,-50%) scale(1)'; copy.style.opacity='0.8'; }, 50);
      setTimeout(() => { copy.style.opacity='0'; copy.style.transform='translate(-50%,-50%) scale(0.2)'; }, 1500);
      setTimeout(() => copy.remove(), 2100);
    }, i * 80);
  });
}

// ── Spawn flower ───────────────────────────────────────────────
function spawnFlower(x, y) {
  const num = order[flowerIndex % order.length];
  flowerIndex++;

  const el = document.createElement('button');
  el.className = 'flower-trail';
  el.style.left = x + 'px';
  el.style.top = y + 'px';

  const rot = (Math.random() - 0.5) * 25;
  const scale = 0.8 + Math.random() * 0.4;
  el.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

  const img = document.createElement('img');
  img.src = `flowers/f${num}.png`;
  img.alt = `Flower ${num}`;
  el.appendChild(img);

  // Apply current global effect immediately on spawn
  if (activeEffect) applyEffect(el, activeEffect);

  let fadeTimer = null, removeTimer = null;

  function scheduleFade() {
    fadeTimer = setTimeout(() => {
      if (!el.matches(':hover')) el.classList.add('fading');
    }, FADE_AFTER);
    removeTimer = setTimeout(() => {
      if (!el.matches(':hover')) {
        el.remove();
        trailFlowers = trailFlowers.filter(f => f !== el);
      }
    }, REMOVE_AFTER);
  }

  // Each flower has a pre-assigned preview effect
  const previewEffect = pickNewEffect();

  // Hover — preview the effect on just this flower
  el.addEventListener('mouseenter', () => {
    clearTimeout(fadeTimer);
    clearTimeout(removeTimer);
    el.classList.remove('fading');
    // Show preview effect on just this flower
    effects.forEach(e => el.classList.remove(e));
    if (previewEffect) el.classList.add(previewEffect);
  });

  // Mouse leave — remove preview, restore active effect
  el.addEventListener('mouseleave', () => {
    clearTimeout(fadeTimer);
    clearTimeout(removeTimer);
    scheduleFade();
    // Restore current global effect
    effects.forEach(e => el.classList.remove(e));
    if (activeEffect) el.classList.add(activeEffect);
  });

  // Click — confirm: apply previewed effect to entire trail
  el.addEventListener('click', () => {
    startSound();
    activeEffect = previewEffect;
    updateAllTrailFlowers(activeEffect);
  });

  document.body.appendChild(el);
  trailFlowers.push(el);
  scheduleFade();

  if (trailFlowers.length > 20) {
    const oldest = trailFlowers.shift();
    if (oldest && !oldest.matches(':hover')) {
      oldest.classList.add('fading');
      setTimeout(() => oldest.remove(), 1500);
    }
  }
}

// ── Cursor tracking ────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
  startSound();
  const x = e.clientX, y = e.clientY;
  if (!moved) {
    moved = true;
    spawnFlower(x, y);
    lastX = x; lastY = y;
    return;
  }
  const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
  if (dist > SPAWN_DIST) {
    spawnFlower(x, y);
    lastX = x; lastY = y;
  }
});

document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  startSound();
  const x = touch.clientX, y = touch.clientY;
  if (!moved) { moved = true; }
  if (lastX === null || Math.sqrt((x-lastX)**2+(y-lastY)**2) > SPAWN_DIST) {
    spawnFlower(x, y);
    lastX = x; lastY = y;
  }
});

// ── Info button ────────────────────────────────────────────────
const infoBtn = document.getElementById('infoBtn');
const infoPanel = document.getElementById('infoPanel');

infoBtn.addEventListener('click', () => {
  infoPanel.classList.toggle('visible');
});

// Close panel if clicking elsewhere
document.addEventListener('click', (e) => {
  if (e.target !== infoBtn && !infoPanel.contains(e.target)) {
    infoPanel.classList.remove('visible');
  }
});

// ── Sound toggle ───────────────────────────────────────────────
const soundBtn = document.getElementById('soundBtn');
const iconOn = document.getElementById('iconOn');
const iconOff = document.getElementById('iconOff');
let soundOn = true;

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  soundOn = !soundOn;
  if (soundOn) {
    ambient.volume = 0.6;
    ambient.play().catch(err => console.log('Play error:', err));
    soundStarted = true;
    iconOn.style.display = 'block';
    iconOff.style.display = 'none';
    soundBtn.classList.remove('muted');
  } else {
    ambient.pause();
    ambient.volume = 0.6; // keep volume ready for next play
    iconOn.style.display = 'none';
    iconOff.style.display = 'block';
    soundBtn.classList.add('muted');
  }
});