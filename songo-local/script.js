// ============================================
// SONGO — Version Locale — script.js v2
// Règles officielles complètes
// ============================================

// === ÉTAT DU JEU ===
let board         = [];
let scoreSud      = 0;
let scoreNord     = 0;
let currentPlayer = 'sud';
let gameOver      = false;
let animating     = false;
let turnNumber    = 0;

// Sens de distribution officiel (circuit circulaire)
// S1=0, S2=1, S3=2, S4=3, S5=4, S6=5, S7=6
// N7=7, N6=8, N5=9, N4=10, N3=11, N2=12, N1=13
// Le circuit : 0→1→2→3→4→5→6→7→8→9→10→11→12→13→0
// Identifiants lisibles par les joueurs
const CELL_NAMES = ['S1','S2','S3','S4','S5','S6','S7','N7','N6','N5','N4','N3','N2','N1'];

// Graines : couleurs et tailles naturelles
const SEED_COLORS = ['#7B3F1E','#8B4A22','#6B3318','#955A2A','#5C2E14','#A06030','#704020','#603818','#8A5028','#4E2810'];
const SEED_SIZES  = [8,9,8,9,8,9,8,9,8,9];

// ============================================
// INITIALISATION
// ============================================
function initGame() {
  board         = new Array(14).fill(5);
  scoreSud      = 0;
  scoreNord     = 0;
  currentPlayer = 'sud';
  gameOver      = false;
  animating     = false;
  turnNumber    = 0;

  document.getElementById('winner-banner').style.display = 'none';
  document.getElementById('last-move-content').innerHTML = '—';
  document.getElementById('history-list').innerHTML = '';
  showMsg('');
  addHistory('event', 'Nouvelle partie démarrée');
  renderBoard();
  updateUI();
}

// ============================================
// RENDU DU PLATEAU
// ============================================
function renderBoard() {
  const rN = document.getElementById('row-nord');
  const rS = document.getElementById('row-sud');
  rN.innerHTML = '';
  rS.innerHTML = '';
  // Nord : index 13(N1) → 7(N7) affiché de gauche à droite visuellement
  for (let i = 13; i >= 7; i--) rN.appendChild(makeCell(i, 'nord'));
  // Sud : index 0(S1) → 6(S7)
  for (let i = 0; i <= 6; i++) rS.appendChild(makeCell(i, 'sud'));
}

function makeCell(idx, owner) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.id = 'cell-' + idx;

  // Identifiant lisible (S1-S7, N1-N7)
  const idLabel = document.createElement('div');
  idLabel.className = 'cell-id';
  idLabel.textContent = CELL_NAMES[idx];
  cell.appendChild(idLabel);

  // Graines visuelles
  const sc = document.createElement('div');
  sc.className = 'seeds-container';
  sc.id = 'seeds-' + idx;
  placeSeedsInContainer(sc, board[idx]);
  cell.appendChild(sc);

  // Compteur numérique
  const badge = document.createElement('div');
  badge.className = 'cell-count-badge';
  badge.id = 'badge-' + idx;
  badge.textContent = board[idx];
  cell.appendChild(badge);

  const count    = board[idx];
  const isMyCell = (owner === currentPlayer);

  if (count === 0) {
    cell.classList.add('empty');
    // Clic sur case vide : message d'erreur
    if (isMyCell) {
      cell.addEventListener('click', () => showForbidden(idx, 'Cette case est vide, choisis une autre.'));
    }
  } else if (!isMyCell) {
    cell.classList.add('disabled');
  } else {
    // Vérifier si ce coup est jouable (obligation de nourrir)
    if (isForcedFeed() && !doesFeed(idx)) {
      cell.classList.add('disabled');
      cell.addEventListener('click', () => showForbidden(idx, 'Tu dois nourrir l\'adversaire ! Choisis un coup qui lui envoie des graines.'));
    } else {
      cell.classList.add('playable');
      cell.addEventListener('mouseenter', () => showPreview(idx));
      cell.addEventListener('mouseleave', () => clearPreview());
      cell.addEventListener('click', () => handleClick(idx));
    }
  }
  return cell;
}

// ============================================
// RÈGLE : OBLIGATION DE NOURRIR
// Si l'adversaire n'a plus de graines, on doit
// jouer un coup qui lui en envoie au moins une
// ============================================
function isForcedFeed() {
  if (currentPlayer === 'sud') {
    const nordSeeds = board.slice(7, 14).reduce((a, b) => a + b, 0);
    return nordSeeds === 0;
  } else {
    const sudSeeds = board.slice(0, 7).reduce((a, b) => a + b, 0);
    return sudSeeds === 0;
  }
}

// Est-ce que jouer cette case envoie des graines dans le camp adverse ?
function doesFeed(idx) {
  const seeds = board[idx];
  let pos = idx;
  for (let i = 0; i < seeds; i++) {
    pos = nextCell(pos, idx);
    if (currentPlayer === 'sud' && pos >= 7) return true;
    if (currentPlayer === 'nord' && pos <= 6) return true;
  }
  return false;
}

// ============================================
// SENS DE DISTRIBUTION OFFICIEL
// Circuit : 0→1→2→3→4→5→6→7→8→9→10→11→12→13→0
// La case de départ (startIdx) est ignorée
// si on repasse dessus
// ============================================
function nextCell(current, startIdx) {
  let next = (current + 1) % 14;
  // Ignorer la case de départ si on repasse dessus
  if (next === startIdx) next = (next + 1) % 14;
  return next;
}

// ============================================
// PRÉVISUALISATION AU SURVOL
// Bleu = dernière case, Orange = captures potentielles
// ============================================
function showPreview(idx) {
  clearPreview();
  const seeds = board[idx];
  let pos = idx;
  for (let i = 0; i < seeds; i++) pos = nextCell(pos, idx);

  // Dernière case en bleu
  const lastCell = document.getElementById('cell-' + pos);
  if (lastCell) lastCell.classList.add('preview-last');

  // Vérifier captures potentielles (sans vider le camp)
  const simBoard = [...board];
  simBoard[idx] = 0;
  let p = idx;
  for (let i = 0; i < seeds; i++) {
    p = nextCell(p, idx);
    simBoard[p]++;
  }
  // Capture principale
  const isAdverse = (currentPlayer === 'sud') ? (p >= 7) : (p <= 6);
  if (isAdverse && (simBoard[p] === 2 || simBoard[p] === 3 || simBoard[p] === 4)) {
    if (!wouldStarve(simBoard, p)) {
      const c = document.getElementById('cell-' + p);
      if (c) { c.classList.remove('preview-last'); c.classList.add('preview-capture'); }
      // Captures en chaîne potentielles
      let prev = (p - 1 + 14) % 14;
      while (true) {
        const isPrevAdverse = (currentPlayer === 'sud') ? (prev >= 7) : (prev <= 6);
        if (isPrevAdverse && (simBoard[prev] === 2 || simBoard[prev] === 3 || simBoard[prev] === 4)) {
          const pc = document.getElementById('cell-' + prev);
          if (pc) pc.classList.add('preview-capture');
          prev = (prev - 1 + 14) % 14;
        } else break;
      }
    }
  }
}

function clearPreview() {
  document.querySelectorAll('.preview-last, .preview-capture').forEach(c => {
    c.classList.remove('preview-last', 'preview-capture');
  });
}

// ============================================
// COUP INTERDIT : flash rouge + message
// ============================================
function showForbidden(idx, msg) {
  if (animating) return;
  const c = document.getElementById('cell-' + idx);
  if (c) {
    c.classList.add('forbidden');
    setTimeout(() => c && c.classList.remove('forbidden'), 500);
  }
  showMsg('⛔ ' + msg);
  setTimeout(() => showMsg(''), 3000);
}

// ============================================
// GESTION D'UN COUP
// ============================================
function handleClick(idx) {
  if (gameOver || animating) return;
  clearPreview();
  animating = true;
  turnNumber++;
  animateMove(idx);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function animateMove(idx) {
  const playerName  = currentPlayer === 'sud' ? 'Joueur 1 (Sud)' : 'Joueur 2 (Nord)';
  const cellName    = CELL_NAMES[idx];
  const seeds       = board[idx];

  showMsg(`Distribution de ${seeds} graine${seeds > 1 ? 's' : ''} depuis ${cellName}...`);

  // 1. Vider la case de départ
  board[idx] = 0;
  refreshCell(idx);

  // 2. Distribuer une à une
  let pos = idx;
  for (let i = 0; i < seeds; i++) {
    pos = nextCell(pos, idx);
    await delay(190);
    board[pos]++;
    refreshCell(pos);
    highlightCell(pos);
  }

  const lastCellName = CELL_NAMES[pos];
  await delay(250);

  // 3. Captures
  const captureResult = await doCaptures(pos);

  // 4. Construire le résumé du dernier coup
  buildLastMove(playerName, cellName, seeds, lastCellName, captureResult);

  // 5. Ajouter à l'historique
  addHistory(currentPlayer, `Tour ${turnNumber} · ${playerName} joue ${cellName} (${seeds} graines)${captureResult.total > 0 ? ` · Capture : +${captureResult.total}` : ''}`);

  // 6. Changer de joueur
  currentPlayer = (currentPlayer === 'sud') ? 'nord' : 'sud';

  // 7. Vérifier fin de partie
  checkGameOver();

  // 8. Mettre à jour l'affichage
  showMsg('');
  renderBoard();
  updateUI();
  animating = false;
}

// ============================================
// CAPTURES OFFICIELLES
// Valide si case adverse contient 2, 3 ou 4 après dépôt
// Interdite si elle vide tout le camp adverse
// ============================================
async function doCaptures(lastPos) {
  const result = { cells: [], chainCells: [], total: 0, cancelled: false };

  const isAdverse = (currentPlayer === 'sud') ? (lastPos >= 7) : (lastPos <= 6);
  const count     = board[lastPos];

  if (!isAdverse || count < 2 || count > 4) return result;

  // Vérifier interdiction d'affamer
  if (wouldStarve(board, lastPos)) {
    result.cancelled = true;
    showMsg('⚠️ Capture annulée — tu ne peux pas vider tout le camp adverse.');
    addHistory('event', `Tour ${turnNumber} · Capture annulée (interdiction d'affamer)`);
    await delay(1200);
    return result;
  }

  // Capturer
  result.cells.push({ name: CELL_NAMES[lastPos], count });
  if (currentPlayer === 'sud') scoreSud  += count;
  else                          scoreNord += count;
  board[lastPos] = 0;
  result.total += count;
  await flashCapture(lastPos);
  refreshCell(lastPos);

  // Captures en chaîne (cases précédentes dans le camp adverse)
  let prev = (lastPos - 1 + 14) % 14;
  while (true) {
    const isPrevAdverse = (currentPlayer === 'sud') ? (prev >= 7) : (prev <= 6);
    const pc = board[prev];
    if (!isPrevAdverse || pc < 2 || pc > 4) break;

    // Vérifier interdiction d'affamer pour la chaîne aussi
    if (wouldStarve(board, prev)) break;

    result.chainCells.push({ name: CELL_NAMES[prev], count: pc });
    if (currentPlayer === 'sud') scoreSud  += pc;
    else                          scoreNord += pc;
    board[prev] = 0;
    result.total += pc;
    await flashCapture(prev);
    refreshCell(prev);
    prev = (prev - 1 + 14) % 14;
  }

  if (result.total > 0) showMsg(`⚡ Capture ! +${result.total} graines`);
  return result;
}

// Simule si capturer cette case viderait tout le camp adverse
function wouldStarve(boardState, capturePos) {
  const simBoard = [...boardState];
  simBoard[capturePos] = 0;
  if (currentPlayer === 'sud') {
    return simBoard.slice(7, 14).reduce((a, b) => a + b, 0) === 0;
  } else {
    return simBoard.slice(0, 7).reduce((a, b) => a + b, 0) === 0;
  }
}

// ============================================
// FIN DE PARTIE (règles officielles)
// Cas 1 : un joueur atteint 40 graines
// Cas 2 : moins de 10 graines sur le plateau
// Cas 3 : impossible de nourrir l'adversaire
// ============================================
function checkGameOver() {
  // Cas 1 : victoire directe à 40
  if (scoreSud >= 40) { endGame('Joueur 1 (Sud) remporte la partie avec ' + scoreSud + ' graines !'); return; }
  if (scoreNord >= 40){ endGame('Joueur 2 (Nord) remporte la partie avec ' + scoreNord + ' graines !'); return; }

  // Cas 2 : moins de 10 graines sur le plateau
  const total = board.reduce((a, b) => a + b, 0);
  if (total < 10) { endGame(null); return; }

  // Cas 3 : adversaire sans graines et impossible de nourrir
  if (isForcedFeed()) {
    const myCells = (currentPlayer === 'sud') ? board.slice(0, 7) : board.slice(7, 14);
    const canFeed = myCells.some((_, i) => {
      const realIdx = currentPlayer === 'sud' ? i : i + 7;
      return board[realIdx] > 0 && doesFeedFrom(realIdx);
    });
    if (!canFeed) { endGame(null); return; }
  }
}

function doesFeedFrom(idx) {
  const seeds = board[idx];
  let pos = idx;
  for (let i = 0; i < seeds; i++) {
    pos = nextCell(pos, idx);
    if (currentPlayer === 'sud' && pos >= 7) return true;
    if (currentPlayer === 'nord' && pos <= 6) return true;
  }
  return false;
}

function endGame(directMsg) {
  gameOver = true;
  const banner = document.getElementById('winner-banner');
  banner.style.display = 'block';

  let msg;
  if (directMsg) {
    msg = directMsg;
  } else {
    if      (scoreSud  > scoreNord) msg = 'Joueur 1 (Sud) remporte la partie !';
    else if (scoreNord > scoreSud)  msg = 'Joueur 2 (Nord) remporte la partie !';
    else                             msg = 'Égalité parfaite !';
  }
  document.getElementById('winner-text').textContent   = msg;
  document.getElementById('winner-scores').textContent =
    `Sud : ${scoreSud} graines  —  Nord : ${scoreNord} graines`;
  addHistory('event', '🏁 Fin de partie · ' + msg);
}

// ============================================
// SECTION "DERNIER COUP JOUÉ"
// ============================================
function buildLastMove(player, cell, seeds, lastCell, capture) {
  let html = `<span class="lm-player">${player}</span> joue <strong>${cell}</strong><br>`;
  html += `${seeds} graine${seeds > 1 ? 's' : ''} distribuée${seeds > 1 ? 's' : ''}.<br>`;
  html += `Dernière graine déposée en <strong>${lastCell}</strong>.<br>`;

  if (capture.cancelled) {
    html += `<span class="lm-cancel">Capture annulée — interdiction d'affamer.</span>`;
  } else if (capture.total > 0) {
    html += `<span class="lm-capture">Capture : ${capture.cells.map(c => `${c.name} (${c.count})`).join(', ')}</span><br>`;
    if (capture.chainCells.length > 0) {
      html += `<span class="lm-chain">Chaîne : ${capture.chainCells.map(c => `${c.name} (${c.count})`).join(', ')}</span><br>`;
    }
    html += `<strong>Total capturé : +${capture.total} graines</strong>`;
  } else {
    html += `Aucune capture.`;
  }

  document.getElementById('last-move-content').innerHTML = html;
}

// ============================================
// HISTORIQUE
// ============================================
function addHistory(type, text) {
  const list = document.getElementById('history-list');
  const item = document.createElement('div');
  item.className = 'history-item h-' + type;

  const lines = text.split(' · ');
  if (lines.length > 1) {
    item.innerHTML = `<span class="h-turn">${lines[0]}</span><br>${lines.slice(1).join('<br>')}`;
  } else {
    item.textContent = text;
  }

  list.appendChild(item);
  // Auto-scroll vers le bas
  list.scrollTop = list.scrollHeight;
}

// ============================================
// AFFICHAGE DES GRAINES
// ============================================
function placeSeedsInContainer(container, count) {
  container.innerHTML = '';
  if (count === 0) return;
  const positions = getSeedPositions(count);
  const maxToShow = Math.min(count, positions.length);
  for (let i = 0; i < maxToShow; i++) {
    const s   = document.createElement('div');
    s.className = 'seed';
    const sz  = SEED_SIZES[i % SEED_SIZES.length];
    const pos = positions[i];
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${pos.x}px;top:${pos.y}px;background:${SEED_COLORS[i % SEED_COLORS.length]};`;
    container.appendChild(s);
  }
}

function getSeedPositions(n) {
  const cx = 30, cy = 30;
  if (n === 1) return [{x:cx-4,y:cy-4}];
  if (n === 2) return [{x:cx-11,y:cy-4},{x:cx+3,y:cy-4}];
  if (n === 3) return [{x:cx-4,y:cy-11},{x:cx-11,y:cy+3},{x:cx+3,y:cy+3}];
  if (n <= 6) return Array.from({length:n},(_,i)=>{
    const a=(i/n)*Math.PI*2-Math.PI/2;
    return {x:cx+Math.cos(a)*12-4,y:cy+Math.sin(a)*12-4};
  });
  if (n <= 13) {
    const inner=Math.ceil(n/3),outer=n-inner,res=[];
    for(let i=0;i<inner;i++){const a=(i/inner)*Math.PI*2-Math.PI/2;res.push({x:cx+Math.cos(a)*8-4,y:cy+Math.sin(a)*8-4});}
    for(let i=0;i<outer;i++){const a=(i/outer)*Math.PI*2-Math.PI/2;res.push({x:cx+Math.cos(a)*19-4,y:cy+Math.sin(a)*19-4});}
    return res;
  }
  const r1=6,r2=15,r3=24,n1=3,n2=6,n3=Math.min(n-9,12),res=[];
  for(let i=0;i<n1;i++){const a=(i/n1)*Math.PI*2;res.push({x:cx+Math.cos(a)*r1-4,y:cy+Math.sin(a)*r1-4});}
  for(let i=0;i<n2;i++){const a=(i/n2)*Math.PI*2;res.push({x:cx+Math.cos(a)*r2-4,y:cy+Math.sin(a)*r2-4});}
  for(let i=0;i<n3;i++){const a=(i/n3)*Math.PI*2;res.push({x:cx+Math.cos(a)*r3-4,y:cy+Math.sin(a)*r3-4});}
  return res;
}

// ============================================
// HELPERS VISUELS
// ============================================
function refreshCell(idx) {
  const sc    = document.getElementById('seeds-' + idx);
  const badge = document.getElementById('badge-' + idx);
  if (sc)    placeSeedsInContainer(sc, board[idx]);
  if (badge) badge.textContent = board[idx];
}

function highlightCell(idx) {
  const c = document.getElementById('cell-' + idx);
  if (!c) return;
  c.classList.add('highlight');
  setTimeout(() => c && c.classList.remove('highlight'), 340);
}

function flashCapture(idx) {
  return new Promise(resolve => {
    const c = document.getElementById('cell-' + idx);
    if (c) {
      c.classList.add('capture-flash');
      setTimeout(() => { c && c.classList.remove('capture-flash'); resolve(); }, 500);
    } else resolve();
  });
}

// ============================================
// UI
// ============================================
function updateUI() {
  document.getElementById('val-sud').textContent  = scoreSud;
  document.getElementById('val-nord').textContent = scoreNord;

  // Barres de progression vers 40
  ['sud','nord'].forEach(p => {
    const score = p === 'sud' ? scoreSud : scoreNord;
    let bar = document.getElementById('bar-' + p);
    if (!bar) {
      const wrap = document.createElement('div');
      wrap.className = 'score-bar-wrap';
      bar = document.createElement('div');
      bar.className = 'score-bar';
      bar.id = 'bar-' + p;
      wrap.appendChild(bar);
      document.getElementById('score-' + p).appendChild(wrap);
    }
    bar.style.width = Math.min((score / 40) * 100, 100) + '%';
  });

  const txt = currentPlayer === 'sud'
    ? 'Tour du Joueur 1 (Sud) ⬇️'
    : 'Tour du Joueur 2 (Nord) ⬆️';
  if (!gameOver) document.getElementById('current-player').textContent = txt;

  document.getElementById('score-sud').classList.toggle('active', currentPlayer === 'sud');
  document.getElementById('score-nord').classList.toggle('active', currentPlayer === 'nord');
}

function showMsg(text) {
  const el = document.getElementById('message');
  if (el) el.textContent = text;
}

// ============================================
// MODAL RÈGLES
// ============================================
function openRules()  { document.getElementById('modal-rules').classList.add('open'); }
function closeRulesBtn() { document.getElementById('modal-rules').classList.remove('open'); }
function closeRules(e) { if (e.target === document.getElementById('modal-rules')) closeRulesBtn(); }

// Lancement
initGame();
