<?php
// ============================================
// createGame.php — Créer une nouvelle partie
// Méthode : POST
// Retourne : { success, gameCode }
// ============================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// --- Connexion BDD (adapter selon hébergeur) ---
$host   = 'sql101.infinityfree.com';
$dbname = 'if0_42159935_songo';
$user   = 'if0_42159935';
$pass   = '2006franck';

// ============================================
// GÉNÉRATION DU CODE HEX 5 CARACTÈRES
// Exemple : C23AF, 9B4E1, A0F3D
// 16^5 = 1 048 576 combinaisons possibles
// ============================================
function generateGameCode($pdo) {
    $chars = '0123456789ABCDEF';
    $maxTries = 20; // Éviter une boucle infinie

    for ($try = 0; $try < $maxTries; $try++) {
        // Générer un code de 5 caractères hexadécimaux aléatoires
        $code = '';
        for ($i = 0; $i < 5; $i++) {
            $code .= $chars[random_int(0, 15)];
        }

        // Vérifier que ce code n'existe pas déjà en BDD
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM games WHERE game_code = :code');
        $stmt->execute([':code' => $code]);
        if ((int)$stmt->fetchColumn() === 0) {
            return $code; // Code unique trouvé
        }
    }

    // Très improbable d'arriver ici avec 1M de combinaisons
    throw new Exception('Impossible de générer un code unique');
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Plateau initial : 14 cases × 5 graines
    $initialBoard = implode(',', array_fill(0, 14, 5));

    // Générer un code unique
    $gameCode = generateGameCode($pdo);

    // Insérer la partie
    $stmt = $pdo->prepare(
        'INSERT INTO games (game_code, board, score_sud, score_nord, current_player, status)
         VALUES (:code, :board, 0, 0, :player, :status)'
    );
    $stmt->execute([
        ':code'   => $gameCode,
        ':board'  => $initialBoard,
        ':player' => 'sud',
        ':status' => 'waiting'
    ]);

    echo json_encode([
        'success'  => true,
        'gameCode' => $gameCode
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
