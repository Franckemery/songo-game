<?php
// ============================================
// joinGame.php — Rejoindre une partie existante
// Méthode : POST
// Body    : { gameCode: "C23AF" }
// Retourne: état complet de la partie
// ============================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$host='sql101.infinityfree.com'; $dbname='if0_42159935_songo'; $user='if0_42159935'; $pass='2006franck';

$data     = json_decode(file_get_contents('php://input'), true);
$gameCode = isset($data['gameCode']) ? strtoupper(trim($data['gameCode'])) : '';

// Validation du format (exactement 5 caractères hexadécimaux)
if (!preg_match('/^[0-9A-F]{5}$/', $gameCode)) {
    echo json_encode(['success' => false, 'error' => 'Code invalide (5 caractères hex attendus)']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Récupérer la partie
    $stmt = $pdo->prepare('SELECT * FROM games WHERE game_code = :code');
    $stmt->execute([':code' => $gameCode]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        echo json_encode(['success' => false, 'error' => 'Aucune partie trouvée avec ce code']);
        exit;
    }
    if ($game['status'] !== 'waiting') {
        echo json_encode(['success' => false, 'error' => 'Cette partie est déjà en cours ou terminée']);
        exit;
    }

    // Passer la partie en statut 'playing'
    $stmt = $pdo->prepare('UPDATE games SET status = :s WHERE game_code = :code');
    $stmt->execute([':s' => 'playing', ':code' => $gameCode]);

    // Retourner l'état complet pour que le J2 puisse afficher le plateau
    $board = array_map('intval', explode(',', $game['board']));
    echo json_encode([
        'success'       => true,
        'gameCode'      => $gameCode,
        'board'         => $board,
        'scoreSud'      => (int)$game['score_sud'],
        'scoreNord'     => (int)$game['score_nord'],
        'currentPlayer' => $game['current_player'],
        'status'        => 'playing',
        'winner'        => null
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
