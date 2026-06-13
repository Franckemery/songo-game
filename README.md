# 🌍 SONGO

> Jeu de plateau traditionnel africain — Implémentation Web

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)

---

## 📖 Présentation

Le **Songo** est un jeu de plateau traditionnel originaire d'Afrique centrale, appartenant à la famille des jeux de **mancala**. Il se joue sur un plateau de **14 cases** (2 rangées de 7), chacune contenant initialement **5 graines**, pour un total de 70 graines.

Ce projet propose deux versions jouables :

| Version | Description |
|---|---|
| 🖥️ **Locale** | 2 joueurs sur la même machine, tour par tour |
| 🌐 **En ligne** | 2 joueurs à distance via un serveur PHP/MySQL |

---

## 🎮 Règles du jeu

- **Objectif** : capturer **40 graines ou plus** avant l'adversaire
- **Distribution** : les graines d'une case sont redistribuées une à une dans le sens circulaire
  ```
  S1 → S2 → S3 → S4 → S5 → S6 → S7 → N7 → N6 → N5 → N4 → N3 → N2 → N1 → S1...
  ```
- **Capture** : si la dernière graine tombe dans une case **adverse** contenant **2, 3 ou 4** graines → capture !
- **Capture en chaîne** : les cases précédentes dans le camp adverse remplissant la même condition sont aussi capturées
- **Anti-affamage** : une capture est annulée si elle viderait totalement le camp adverse
- **Fin de partie** :
  - Un joueur atteint 40 graines → victoire immédiate
  - Moins de 10 graines sur le plateau → fin, le plus de graines gagne
  - Impossible de nourrir l'adversaire → fin de partie

---

## 📁 Structure du projet

```
songo/
├── songo-local/           # Version locale (2 joueurs, même machine)
│   ├── index.html         # Structure de la page
│   ├── style.css          # Mise en page et animations
│   └── script.js          # Logique complète du jeu
│
└── songo-online/          # Version réseau (2 joueurs à distance)
    ├── index.html         # Interface + lobby
    ├── style.css          # Styles
    ├── script.js          # Logique client + synchronisation
    └── api/
        ├── createGame.php # Création d'une partie
        ├── joinGame.php   # Rejoindre une partie
        ├── playMove.php   # Jouer un coup
        ├── getGame.php    # Récupérer l'état de la partie
        └── database.sql   # Script de création de la base de données
```

---

## 🚀 Installation et lancement

### Version Locale
Aucune installation requise. Il suffit d'ouvrir le fichier :
```
songo-local/index.html
```
dans n'importe quel navigateur moderne.

### Version En ligne

#### Prérequis
- Serveur PHP (Apache/Nginx)
- Base de données MySQL

#### Étapes
1. Importer la base de données :
```sql
mysql -u root -p < songo-online/api/database.sql
```

2. Configurer la connexion dans les fichiers PHP :
```php
$host = 'localhost';
$db   = 'songo';
$user = 'root';
$pass = 'ton_mot_de_passe';
```

3. Déposer les fichiers sur ton serveur et accéder à `index.html`

---

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : PHP 8+
- **Base de données** : MySQL
- **Synchronisation** : Polling HTTP toutes les 2 secondes

---

## ✨ Fonctionnalités

- ✅ Règles officielles du Songo complètes
- ✅ Animation de distribution graine par graine
- ✅ Prévisualisation des captures au survol
- ✅ Captures en chaîne
- ✅ Règle anti-affamage
- ✅ Historique des coups
- ✅ Barres de progression vers 40 graines
- ✅ Mode multijoueur en ligne avec code de partie
- ✅ Synchronisation en temps réel

---

## 👨‍💻 Auteur

**Franck Emery**  
Projet réalisé dans le cadre du cours de Programmation Web — 2025/2026

---

## 📄 Licence

Ce projet est réalisé à des fins académiques.
