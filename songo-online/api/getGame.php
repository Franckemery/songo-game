<?php
// ============================================
// getGame.php — Récupérer l'état d'une partie
// Méthode : GET
// Param   : ?gameCode=C23AF
// Retourne: état complet de la partie
// Utilisé pour le polling de synchronisation
// ============================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host='sql101.infinityfree.com'; $dbname='if0_42159935_songo'; $user='if0_42159935'; $pass='2006franck';

$gameCode = isset($_GET['gameCode']) ? strtoupper(trim($_GET['gameCode'])) : '';

if (!preg_match('/^[0-9A-F]{5}$/', $gameCode)) {
    echo json_encode(['success'=>false,'error'=>'Code invalide']); exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare('SELECT * FROM games WHERE game_code = :code');
    $stmt->execute([':code' => $gameCode]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        echo json_encode(['success'=>false,'error'=>'Partie introuvable']); exit;
    }

    $board = array_map('intval', explode(',', $game['board']));
    echo json_encode([
        'success'       => true,
        'board'         => $board,
        'scoreSud'      => (int)$game['score_sud'],
        'scoreNord'     => (int)$game['score_nord'],
        'currentPlayer' => $game['current_player'],
        'status'        => $game['status'],
        'winner'        => $game['winner']
    ]);

} catch (PDOException $e) {
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
?>
