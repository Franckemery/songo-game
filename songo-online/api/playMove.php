<?php
// ============================================
// playMove.php — Jouer un coup
// Méthode : POST
// Body    : { gameCode, cellIndex, player }
// Retourne: nouvel état complet de la partie
// ============================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$host='sql101.infinityfree.com'; $dbname='if0_42159935_songo'; $user='if0_42159935'; $pass='2006franck';

$data      = json_decode(file_get_contents('php://input'), true);
$gameCode  = isset($data['gameCode'])  ? strtoupper(trim($data['gameCode']))  : '';
$cellIndex = isset($data['cellIndex']) ? (int)$data['cellIndex']              : -1;
$player    = isset($data['player'])    ? $data['player']                      : '';

// Validations de base
if (!preg_match('/^[0-9A-F]{5}$/', $gameCode)) {
    echo json_encode(['success'=>false,'error'=>'Code partie invalide']); exit;
}
if ($cellIndex < 0 || $cellIndex > 13) {
    echo json_encode(['success'=>false,'error'=>'Index de case invalide']); exit;
}
if ($player !== 'sud' && $player !== 'nord') {
    echo json_encode(['success'=>false,'error'=>'Joueur invalide']); exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Récupérer la partie (avec verrouillage pour éviter les conflits)
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT * FROM games WHERE game_code = :code FOR UPDATE');
    $stmt->execute([':code' => $gameCode]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        $pdo->rollBack();
        echo json_encode(['success'=>false,'error'=>'Partie introuvable']); exit;
    }
    if ($game['status'] !== 'playing') {
        $pdo->rollBack();
        echo json_encode(['success'=>false,'error'=>'La partie n\'est pas en cours']); exit;
    }
    if ($game['current_player'] !== $player) {
        $pdo->rollBack();
        echo json_encode(['success'=>false,'error'=>'Ce n\'est pas ton tour']); exit;
    }

    // Vérifier que la case appartient au bon joueur
    $isValidCell = ($player === 'sud')
        ? ($cellIndex >= 0 && $cellIndex <= 6)
        : ($cellIndex >= 7 && $cellIndex <= 13);
    if (!$isValidCell) {
        $pdo->rollBack();
        echo json_encode(['success'=>false,'error'=>'Cette case ne t\'appartient pas']); exit;
    }

    // Reconstituer le plateau
    $board     = array_map('intval', explode(',', $game['board']));
    $scoreSud  = (int)$game['score_sud'];
    $scoreNord = (int)$game['score_nord'];

    if ($board[$cellIndex] === 0) {
        $pdo->rollBack();
        echo json_encode(['success'=>false,'error'=>'Case vide, coup invalide']); exit;
    }

    // ==========================================
    // LOGIQUE DU JEU
    // ==========================================

    // 1. Ramasser les graines
    $seeds = $board[$cellIndex];
    $board[$cellIndex] = 0;

    // 2. Distribuer une à une
    $pos = $cellIndex;
    for ($i = 0; $i < $seeds; $i++) {
        $pos = ($pos + 1) % 14;
        $board[$pos]++;
    }

    // 3. Captures
    $isAdverse = ($player === 'sud') ? ($pos >= 7) : ($pos <= 6);
    if ($isAdverse && ($board[$pos] === 2 || $board[$pos] === 3)) {
        if ($player === 'sud') $scoreSud  += $board[$pos];
        else                   $scoreNord += $board[$pos];
        $board[$pos] = 0;

        // Captures en chaîne
        $prev = ($pos - 1 + 14) % 14;
        while (true) {
            $isPrevAdverse = ($player === 'sud') ? ($prev >= 7) : ($prev <= 6);
            if ($isPrevAdverse && ($board[$prev] === 2 || $board[$prev] === 3)) {
                if ($player === 'sud') $scoreSud  += $board[$prev];
                else                   $scoreNord += $board[$prev];
                $board[$prev] = 0;
                $prev = ($prev - 1 + 14) % 14;
            } else {
                break;
            }
        }
    }

    // 4. Changer de joueur
    $nextPlayer = ($player === 'sud') ? 'nord' : 'sud';

    // 5. Vérifier fin de partie
    $sudSeeds  = array_sum(array_slice($board, 0, 7));
    $nordSeeds = array_sum(array_slice($board, 7, 7));
    $status    = 'playing';
    $winner    = null;

    if ($sudSeeds === 0 || $nordSeeds === 0) {
        $scoreSud  += $sudSeeds;
        $scoreNord += $nordSeeds;
        $status = 'finished';
        if      ($scoreSud  > $scoreNord) $winner = 'sud';
        else if ($scoreNord > $scoreSud)  $winner = 'nord';
        else                               $winner = 'draw';
    }

    // 6. Sauvegarder
    $boardStr = implode(',', $board);
    $stmt = $pdo->prepare(
        'UPDATE games
         SET board=:b, score_sud=:ss, score_nord=:sn,
             current_player=:cp, status=:st, winner=:w
         WHERE game_code=:code'
    );
    $stmt->execute([
        ':b'    => $boardStr,
        ':ss'   => $scoreSud,
        ':sn'   => $scoreNord,
        ':cp'   => $nextPlayer,
        ':st'   => $status,
        ':w'    => $winner,
        ':code' => $gameCode
    ]);

    $pdo->commit();

    // 7. Retourner le nouvel état
    echo json_encode([
        'success'       => true,
        'board'         => $board,
        'scoreSud'      => $scoreSud,
        'scoreNord'     => $scoreNord,
        'currentPlayer' => $nextPlayer,
        'status'        => $status,
        'winner'        => $winner
    ]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
