// ============================================
// SONGO — Version Réseau — script.js
// Gère : lobby, création/jonction de partie,
//        affichage du jeu, synchronisation Ajax
// ============================================

// --- CONFIGURATION ---
// En local XAMPP  : '/songo-online/api/'
// En production   : '/api/'  (adapter selon hébergeur)
const API_URL = '/songo-online/api/';

// --- ÉTAT GLOBAL ---
let gameCode     = null;   // Code hexadécimal à 5 caractères de la partie
let myPlayer     = null;   // 'sud' ou 'nord'
let gameState    = null;   // Dernier état reçu du serveur
let pollInterval = null;   // Référence au setInterval de synchro
let animating    = false;  // Empêche les clics pendant les animations

// Graines : couleurs et tailles naturelles
const SEED_COLORS = [
  '#7B3F1E','#8B4A22','#6B3318','#955A2A','#5C2E14',
  '#A06030','#704020','#603818','#8A5028','#4E2810'
];
const SEED_SIZES = [8,9,8,9,8,9,8,9,8,9];

// ============================================
// NAVIGATION ENTRE ÉCRANS
// ============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToLobby() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  gameCode = null; myPlayer = null; gameState = null; animating = false;
  document.getElementById('lobby-error').textContent = '';
  document.getElementById('join-code').value = '';
  showScreen('screen-lobby');
}

// ============================================
// CRÉER UNE PARTIE
// ============================================
async function createGame() {
  setLobbyError('');
  try {
    const res  = await fetch(API_URL + 'createGame.php', { method: 'POST' });
    const data = await res.json();

    if (!data.success) { setLobbyError(data.error || 'Erreur serveur'); return; }

    gameCode = data.gameCode;
    myPlayer = 'sud';

    // Afficher le code sur l'écran d'attente
    document.getElementById('display-code').textContent = gameCode;
    showScreen('screen-waiting');

    // Commencer à interroger le serveur pour détecter quand le J2 rejoint
    pollInterval = setInterval(pollForOpponent, 2000);

  } catch (e) {
    setLobbyError('Impossible de contacter le serveur. XAMPP est-il démarré ?');
  }
}

// Vérifie si le 2e joueur a rejoint
async function pollForOpponent() {
  try {
    const res  = await fetch(API_URL + 'getGame.php?gameCode=' + gameCode);
    const data = await res.json();
    if (data.success && data.status === 'playing') {
      clearInterval(pollInterval);
      pollInterval = null;
      gameState = data;
      startGame();
    }
  } catch (e) { /* silence réseau */ }
}

// ============================================
// REJOINDRE UNE PARTIE
// ============================================
async function joinGame() {
  setLobbyError('');
  const code = document.getElementById('join-code').value.trim().toUpperCase();

  if (code.length !== 5) {
    setLobbyError('Le code doit faire exactement 5 caractères.');
    return;
  }

  try {
    const res  = await fetch(API_URL + 'joinGame.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ gameCode: code })
    });
    const data = await res.json();

    if (!data.success) { setLobbyError(data.error || 'Erreur serveur'); return; }

    gameCode = code;
    myPlayer = 'nord';
    gameState = data;
    startGame();

  } catch (e) {
    setLobbyError('Impossible de contacter le serveur. Vérifie le code et réessaie.');
  }
}

// ============================================
// DÉMARRAGE DU JEU (après que les 2 joueurs sont là)
// ============================================
function startGame() {
  // Mettre à jour les infos en haut de l'écran de jeu
  document.getElementById('game-code-display').textContent = gameCode;
  document.getElementById('my-role-display').textContent   =
    myPlayer === 'sud' ? 'Joueur 1 · Sud ⬇️' : 'Joueur 2 · Nord ⬆️';

  document.getElementById('winner-banner').style.display = 'none';
  showScreen('screen-game');

  renderBoard();
  updateUI();

  // Lancer la synchronisation automatique (polling toutes les 2s)
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(syncGame, 2000);
}

// ============================================
// SYNCHRONISATION (polling)
// ============================================
async function syncGame() {
  if (animating) return; // Ne pas synchroniser pendant une animation locale
  try {
    const res  = await fetch(API_URL + 'getGame.php?gameCode=' + gameCode);
    const data = await res.json();
    if (!data.success) return;

    // Mettre à jour uniquement si c'est maintenant le tour de l'adversaire
    // (évite d'écraser notre propre animation)
    const wasMyTurn   = gameState && gameState.currentPlayer === myPlayer;
    const isNowMyTurn = data.currentPlayer === myPlayer;

    gameState = data;

    // Toujours mettre à jour le plateau et les scores
    renderBoard();
    updateUI();

    if (data.status === 'finished') {
      clearInterval(pollInterval);
      pollInterval = null;
      showWinner();
    }
  } catch (e) { /* silence */ }
}

// ============================================
// JOUER UN COUP
// ============================================
async function playMove(cellIndex) {
  if (!gameState)                              return;
  if (gameState.currentPlayer !== myPlayer)   return;
  if (animating)                               return;
  if (gameState.board[cellIndex] === 0)        return;

  // Vérifier que la case appartient bien au joueur
  const isMyCell = (myPlayer === 'sud')
    ? (cellIndex >= 0 && cellIndex <= 6)
    : (cellIndex >= 7 && cellIndex <= 13);
  if (!isMyCell) return;

  animating = true;

  // Animation locale immédiate (meilleure UX)
  await animateDistribution(cellIndex);

  // Envoyer le coup au serveur
  try {
    const res  = await fetch(API_URL + 'playMove.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ gameCode, cellIndex, player: myPlayer })
    });
    const data = await res.json();

    if (data.success) {
      gameState = data;
      renderBoard();
      updateUI();
      if (data.status === 'finished') {
        clearInterval(pollInterval);
        pollInterval = null;
        showWinner();
      }
    } else {
      showMsg('Coup refusé par le serveur : ' + (data.error || ''));
    }
  } catch (e) {
    showMsg('Erreur réseau. Réessaie.');
  }

  animating = false;
}

// ============================================
// RENDU DU PLATEAU
// ============================================
function renderBoard() {
  if (!gameState) return;

  const board = gameState.board;
  const rN = document.getElementById('row-nord');
  const rS = document.getElementById('row-sud');
  rN.innerHTML = '';
  rS.innerHTML = '';

  for (let i = 13; i >= 7; i--) rN.appendChild(makeCell(i, 'nord', board));
  for (let i = 0;  i <= 6; i++) rS.appendChild(makeCell(i, 'sud',  board));
}

function makeCell(idx, owner, board) {
  const cell  = document.createElement('div');
  cell.className = 'cell';
  cell.id = 'cell-' + idx;

  const sc = document.createElement('div');
  sc.className = 'seeds-container';
  sc.id = 'seeds-' + idx;
  placeSeedsInContainer(sc, board[idx]);
  cell.appendChild(sc);

  const lbl = document.createElement('div');
  lbl.className = 'cell-label';
  lbl.textContent = idx;
  cell.appendChild(lbl);

  const count     = board[idx];
  const isMyTurn  = gameState && gameState.currentPlayer === myPlayer;
  const isMyCell  = (myPlayer === 'sud') ? (idx >= 0 && idx <= 6) : (idx >= 7 && idx <= 13);

  if (count === 0) {
    cell.classList.add('empty');
  } else if (!isMyTurn || !isMyCell) {
    cell.classList.add('disabled');
  } else {
    cell.classList.add('playable');
    cell.addEventListener('click', () => playMove(idx));
  }

  return cell;
}

// ============================================
// GRAINES — MÊMES FONCTIONS QUE VERSION LOCALE
// ============================================
function placeSeedsInContainer(container, count) {
  container.innerHTML = '';
  if (count === 0) return;
  const positions  = getSeedPositions(count);
  const maxToShow  = Math.min(count, positions.length);
  for (let i = 0; i < maxToShow; i++) {
    const s   = document.createElement('div');
    s.className = 'seed';
    const sz  = SEED_SIZES[i % SEED_SIZES.length];
    const pos = positions[i];
    const col = SEED_COLORS[i % SEED_COLORS.length];
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${pos.x}px;top:${pos.y}px;background:${col};`;
    container.appendChild(s);
  }
  if (count > positions.length) {
    const extra = document.createElement('div');
    extra.style.cssText = `position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:9px;color:rgba(255,255,255,.7);font-weight:700;background:rgba(0,0,0,.35);padding:1px 4px;border-radius:6px;`;
    extra.textContent = count;
    container.appendChild(extra);
  }
}

function getSeedPositions(n) {
  const cx = 32, cy = 32;
  if (n === 1) return [{x:cx-4,y:cy-4}];
  if (n === 2) return [{x:cx-11,y:cy-4},{x:cx+3,y:cy-4}];
  if (n === 3) return [{x:cx-4,y:cy-11},{x:cx-11,y:cy+3},{x:cx+3,y:cy+3}];
  if (n <= 6) {
    return Array.from({length:n},(_,i)=>{
      const a=(i/n)*Math.PI*2-Math.PI/2;
      return {x:cx+Math.cos(a)*13-4,y:cy+Math.sin(a)*13-4};
    });
  }
  if (n <= 13) {
    const inner=Math.ceil(n/3),outer=n-inner,res=[];
    for(let i=0;i<inner;i++){const a=(i/inner)*Math.PI*2-Math.PI/2;res.push({x:cx+Math.cos(a)*9-4,y:cy+Math.sin(a)*9-4});}
    for(let i=0;i<outer;i++){const a=(i/outer)*Math.PI*2-Math.PI/2;res.push({x:cx+Math.cos(a)*20-4,y:cy+Math.sin(a)*20-4});}
    return res;
  }
  const r1=7,r2=16,r3=26,n1=3,n2=6,n3=Math.min(n-9,12),res=[];
  for(let i=0;i<n1;i++){const a=(i/n1)*Math.PI*2;res.push({x:cx+Math.cos(a)*r1-4,y:cy+Math.sin(a)*r1-4});}
  for(let i=0;i<n2;i++){const a=(i/n2)*Math.PI*2;res.push({x:cx+Math.cos(a)*r2-4,y:cy+Math.sin(a)*r2-4});}
  for(let i=0;i<n3;i++){const a=(i/n3)*Math.PI*2;res.push({x:cx+Math.cos(a)*r3-4,y:cy+Math.sin(a)*r3-4});}
  return res;
}

// ============================================
// ANIMATION DE DISTRIBUTION (locale, pour la fluidité)
// ============================================
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function animateDistribution(idx) {
  const localBoard = [...gameState.board];
  const seeds = localBoard[idx];
  localBoard[idx] = 0;
  refreshCellLocal(idx, localBoard);
  showMsg(`Distribution de ${seeds} graine${seeds > 1 ? 's' : ''}...`);

  let pos = idx;
  for (let i = 0; i < seeds; i++) {
    pos = (pos + 1) % 14;
    await delay(200);
    localBoard[pos]++;
    refreshCellLocal(pos, localBoard);
    highlightCell(pos);
  }
  await delay(250);
  showMsg('');
}

function refreshCellLocal(idx, localBoard) {
  const sc = document.getElementById('seeds-' + idx);
  if (sc) placeSeedsInContainer(sc, localBoard[idx]);
}

function highlightCell(idx) {
  const c = document.getElementById('cell-' + idx);
  if (!c) return;
  c.classList.add('highlight');
  setTimeout(() => c && c.classList.remove('highlight'), 350);
}

// ============================================
// MISE À JOUR DE L'INTERFACE
// ============================================
function updateUI() {
  if (!gameState) return;

  document.getElementById('val-sud').textContent  = gameState.scoreSud;
  document.getElementById('val-nord').textContent = gameState.scoreNord;

  const cp = gameState.currentPlayer;

  let txt;
  if (gameState.status === 'waiting') {
    txt = 'En attente de l\'adversaire...';
  } else if (cp === myPlayer) {
    txt = myPlayer === 'sud' ? 'Ton tour ! (Sud ⬇️)' : 'Ton tour ! (Nord ⬆️)';
  } else {
    txt = cp === 'sud' ? 'Tour de Joueur 1 (Sud) ⬇️' : 'Tour de Joueur 2 (Nord) ⬆️';
  }
  document.getElementById('current-player').textContent = txt;

  document.getElementById('score-sud').classList.toggle('active', cp === 'sud');
  document.getElementById('score-nord').classList.toggle('active', cp === 'nord');
}

function showWinner() {
  const banner = document.getElementById('winner-banner');
  banner.style.display = 'block';

  const ss = gameState.scoreSud, ns = gameState.scoreNord;
  let msg;
  if      (ss > ns) msg = 'Joueur 1 (Sud) remporte la partie !';
  else if (ns > ss) msg = 'Joueur 2 (Nord) remporte la partie !';
  else              msg = 'Égalité parfaite !';

  document.getElementById('winner-text').textContent   = msg;
  document.getElementById('winner-scores').textContent =
    `Sud : ${ss} graines  —  Nord : ${ns} graines`;
}

function showMsg(text) {
  const el = document.getElementById('message');
  if (el) el.textContent = text;
}

function setLobbyError(text) {
  document.getElementById('lobby-error').textContent = text;
}

function copyCode() {
  navigator.clipboard.writeText(gameCode).then(() => {
    const btn = document.querySelector('.btn-copy');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 1500);
  });
}
