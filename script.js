// --- Firebase Initialization (Global) ---
// These variables will now be initialized from the global scope,
// which are set by the script block in index.html.
let app;
let db;
let auth;
let currentUserId = null;
let currentUserName = "Player"; // Default name, could be randomized or user-input later
let currentGameId = null; // Stores the ID of the current game room

// Get Firebase config and app ID from the global scope (set in index.html)
// These variables (firebaseConfig and myAppId) are now directly accessible.
// No more checking for '__firebase_config' or '__app_id'.
const firebaseConfig = typeof firebaseConfig !== 'undefined' ? firebaseConfig : {}; // Use the global firebaseConfig
const appId = typeof myAppId !== 'undefined' ? myAppId : 'default-app-id'; // Use the global myAppId

console.log("Firebase Config (on script load):", firebaseConfig); // DEBUG: Check if config is loaded
console.log("App ID (on script load):", appId); // DEBUG: Check if app ID is loaded

// Function to handle Firebase sign-in
async function firebaseSignIn() {
    try {
        // For GitHub Pages, we typically sign in anonymously or use a simple auth method.
        // The __initial_auth_token is specific to the Canvas environment.
        await auth.signInAnonymously();
        console.log("Firebase: Signed in anonymously.");
    } catch (error) {
        console.error("Firebase Auth Error during sign-in:", error);
        // Retry after a delay if sign-in fails
        setTimeout(() => {
            console.log("Firebase: Retrying anonymous sign-in...");
            firebaseSignIn();
        }, 3000); // Retry after 3 seconds
        // Using alert for user feedback, as per instructions.
        alert("Failed to sign in to Firebase. Some features may not work. Retrying...");
    }
}

// Initialize Firebase only once if config is available
// Now, this checks the global 'firebaseConfig' object directly.
if (Object.keys(firebaseConfig).length > 0) {
    // Initialize the Firebase app using the global 'firebase' object (Namespaced API)
    app = firebase.initializeApp(firebaseConfig);
    // Get Firestore and Auth instances from the initialized app
    db = firebase.firestore(app);
    auth = firebase.auth(app); // Use firebase.auth(app) for the namespaced API

    console.log("Firebase initialized:", !!app, !!db, !!auth); // DEBUG: Confirm Firebase objects are valid

    // Listen for authentication state changes
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Firebase: Signed in as", currentUserId);
            // Update UI with user ID if lobby screen is active
            const userIdSpan = document.getElementById('current-user-id');
            if (userIdSpan) {
                userIdSpan.innerText = currentUserId;
            }
        } else {
            console.log("Firebase: No user signed in. Initiating sign-in...");
            firebaseSignIn(); // Call the sign-in function
        }
    });
} else {
    // Fallback for environments where Firebase config is still not provided (shouldn't happen on GitHub Pages now)
    console.warn("Firebase config not found. Running in standalone mode (Multiplayer Doudizhu will not work).");
    currentUserId = 'local-user-' + Math.random().toString(36).substring(2, 9); // Generate a dummy user ID
    const userIdSpan = document.getElementById('current-user-id');
    if (userIdSpan) {
        userIdSpan.innerText = currentUserId;
    }
}


// Card class now supports jokers with color property
class Card {
  constructor(suit, rank, value, color = null) {
    this.suit = suit;     // '♠', '♥', '♦', '♣' or null for joker
    this.rank = rank;     // '2'–'10', 'J', 'Q', 'K', 'A', or 'JOKER'
    this.value = value;   // numeric value for game logic
    this.color = color;   // 'red' or 'black' for joker, null otherwise
  }

  toString() {
    if (this.rank === 'JOKER') {
      return `${this.color.charAt(0).toUpperCase() + this.color.slice(1)} Joker`;
    }
    return `${this.rank} of ${this.suitName()}`;
  }

  // Helper to convert suit symbol to full name
  suitName() {
    const suitMap = {
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds',
      '♣': 'clubs'
    };
    return suitMap[this.suit] || '';
  }

  // Convert Card object to a plain object for Firestore
  toFirestore() {
    return {
      suit: this.suit,
      rank: this.rank,
      value: this.value,
      color: this.color
    };
  }

  // Create Card object from Firestore data
  static fromFirestore(data) {
    return new Card(data.suit, data.rank, data.value, data.color);
  }
}

class Deck {
  constructor(options = {}) {
    const defaultOptions = {
      numDecks: 1,          // For Blackjack: how many standard decks
      includeJokers: false, // For Deck Viewer: whether to include jokers
      gameType: 'war'       // 'war', 'blackjack', 'viewer', 'doudizhu' - influences card values
    };
    const settings = { ...defaultOptions, ...options }; // Merge defaults with provided options

    this.cards = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    let values;
    if (settings.gameType === 'blackjack') {
      // Blackjack specific values: J,Q,K are 10; Ace is 11 (to be adjusted later if hand > 21)
      values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
    } else if (settings.gameType === 'doudizhu') {
        // Doudizhu values: 3 smallest, 2 largest, then A, K, Q, J, 10...4. Jokers are highest.
        // Here, we assign values for basic sorting: 3=3, 4=4, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15
        values = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // 3 to A, then 2
    }
    else { // 'war' or 'viewer' - standard card values for comparison, Ace can be 1
      values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1]; // Ace as 1 for sorting/comparison in War/Viewer
    }

    // Create standard cards based on numDecks
    for (let i = 0; i < settings.numDecks; i++) {
      for (let suit of suits) {
        for (let j = 0; j < ranks.length; j++) {
          this.cards.push(new Card(suit, ranks[j], values[j]));
        }
      }
    }

    // Optionally include two jokers if specified (primarily for Deck Viewer and Doudizhu)
    if (settings.includeJokers) {
      // For Doudizhu, jokers have distinct high values
      if (settings.gameType === 'doudizhu') {
          this.cards.push(new Card(null, 'JOKER', 16, 'black')); // Black Joker (Small Joker)
          this.cards.push(new Card(null, 'JOKER', 17, 'red'));   // Red Joker (Big Joker)
      } else {
          this.cards.push(new Card(null, 'JOKER', null, 'black'));
          this.cards.push(new Card(null, 'JOKER', null, 'red'));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal() {
    // Deal one card from the top of the deck
    if (this.cards.length === 0) {
      console.warn("Deck is empty!");
      return null;
    }
    return this.cards.shift();
  }

  dealHalf() {
    // Ensure the deck has an odd number of cards for a fair deal
    if (this.cards.length % 2 !== 0) {
      console.warn("Deck has an odd number of cards. Dealing might be uneven.");
    }
    const half = Math.ceil(this.cards.length / 2);
    // Use splice to modify the original array and return the first half
    const playerCards = this.cards.splice(0, half);
    const enemyCards = this.cards; // The rest goes to the enemy
    this.cards = []; // The deck is now empty after dealing out all cards
    return [playerCards, enemyCards];
  }

  sort() {
    this.cards.sort((a, b) => {
      // Place jokers at the end, Black Joker before Red Joker if both present
      if (a.rank === 'JOKER' && b.rank !== 'JOKER') return 1;
      if (b.rank === 'JOKER' && a.rank !== 'JOKER') return -1;
      if (a.rank === 'JOKER' && b.rank === 'JOKER') {
        // Specific sorting for Doudizhu jokers (Black Joker < Red Joker)
        if (this.gameType === 'doudizhu') {
            return a.value - b.value; // Use assigned joker values (16, 17)
        }
        if (a.color === 'black' && b.color === 'red') return -1;
        if (a.color === 'red' && b.color === 'black') return 1;
        return 0; // Same type of joker
      }

      const suitOrder = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
      // Ensure suits are valid before comparing
      if (a.suit && b.suit && a.suit !== b.suit) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      return a.value - b.value;
    });
  }
}

// Map suit symbols to name for filename construction
const suitMap = {
  '♠': 'spades',
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs'
};

// Generate filename for each card, using the required format
function getCardFileName(card) {
  if (!card) return 'card_back.svg'; // Default to card back if no card is provided
  if (card.rank === 'JOKER') {
    return `${card.color.toLowerCase()}_joker.svg`;
  } else {
    const rankPart = card.rank;
    const suitPart = suitMap[card.suit];
    return `${rankPart}_of_${suitPart}.svg`;
  }
}

// --- Global Variables (for all games) ---
let playerDeck = []; // Used for War
let enemyDeck = [];  // Used for War
let currentDeck = null; // Used by Deck Viewer
let focusedCardIndex = -1; // Used by Deck Viewer

// --- Blackjack specific variables ---
let blackjackDeck = null;
let playerHand = [];
let dealerHand = [];
let gameStatus = 'playing'; // 'playing', 'player_blackjack', 'dealer_blackjack', 'player_bust', 'dealer_bust', 'push', 'player_win', 'dealer_win', 'player_5_card_charlie', 'dealer_blackjack_beats_charlie'

// NEW GLOBAL VARIABLES FOR WIN COUNTERS
let playerWins = 0;
let dealerWins = 0;

// --- Get references to DOM elements once (re-using for all games where applicable) ---
// Elements for War/Blackjack/Deck Viewer
const gameScreen = document.getElementById('game-screen');
const gameTitle = document.getElementById('game-title');
const backButton = document.getElementById('back-button');
const playerHandDiv = document.getElementById('player-hand');
const enemyHandDiv = document.getElementById('enemy-hand'); // Re-used for dealer hand
const playerCardCountSpan = document.getElementById('player-card-count'); // Re-used for War, adapted for Blackjack scores
const enemyCardCountSpan = document.getElementById('enemy-card-count');   // Re-used for War, adapted for Blackjack scores
const playerInfoDiv = document.getElementById('player-player-info');     // Re-used for War, adapted for Blackjack scores
const enemyInfoDiv = document.getElementById('enemy-player-info');       // Re-used for War, adapted for Blackjack scores
const resultDiv = document.getElementById('result');
const playTurnButton = document.getElementById('play-turn'); // Re-purposed for "Play Again" in Blackjack

// Blackjack specific buttons (declared globally to be accessible)
let hitButton;
let standButton;

// --- Doudizhu specific variables and DOM references (ISOLATED) ---
// Multiplayer Doudizhu game state object (synced with Firestore)
let doudizhuGameState = {
    players: {}, // Stores player data: { userId: { name, hand, isLandlord, isReady, playerIndex } }
    landlordPile: [],
    lastPlayedPattern: null,
    lastPlayedCards: [],
    currentTurnUserId: null, // Stores the userId of the current player
    gameState: 'lobby', // 'lobby', 'bidding', 'playing', 'game_over'
    bids: {}, // Stores bids: { userId: true/false }
    landlordUserId: null, // Stores the userId of the landlord
    gameStarted: false,
    gameRound: 0, // To track rounds for passing logic
    playerOrder: [], // Array of userIds in play order
    passesInRound: 0 // Track consecutive passes
};

let doudizhuGameUnsubscribe = null; // To unsubscribe from Firestore listener

const doudizhuGameScreen = document.getElementById('doudizhu-game-screen');
const doudizhuGameTitle = document.getElementById('doudizhu-game-title');
const doudizhuPlayerHandDiv = document.getElementById('doudizhu-player-hand');
const doudizhuOpponent1HandDiv = document.getElementById('doudizhu-opponent1-hand');
const doudizhuOpponent2HandDiv = document.getElementById('doudizhu-opponent2-hand');
const doudizhuPlayedCardsDiv = document.getElementById('doudizhu-played-cards');
let doudizhuPlayButton;
let doudizhuPassButton;
const doudizhuResultDiv = document.getElementById('doudizhu-result');
const doudizhuGameBackButton = document.getElementById('doudizhu-game-back-button'); // Renamed for clarity
const doudizhuCenterLabel = document.getElementById('doudizhu-center-label');
const doudizhuCurrentPatternDiv = document.getElementById('doudizhu-current-pattern');
const doudizhuPatternTextSpan = document.getElementById('doudizhu-pattern-text');

// Doudizhu Bidding Buttons
let doudizhuBiddingButtonsDiv;
let doudizhuCallLandlordButton;
let doudizhuDontCallButton;

// Doudizhu Lobby DOM elements
const doudizhuLobbyScreen = document.getElementById('doudizhu-lobby-screen');
const currentUserIdSpan = document.getElementById('current-user-id');
const gameCodeInput = document.getElementById('game-code-input');
const joinGameButton = document.getElementById('join-game-button');
const createGameButton = document.getElementById('create-game-button');
const lobbyMessage = document.getElementById('lobby-message');
const currentGameCodeSpan = document.getElementById('current-game-code');
const displayGameCodeSpan = document.getElementById('display-game-code');
const lobbyPlayerList = document.getElementById('lobby-player-list');
const lobbyBackButton = document.getElementById('lobby-back-button');

const opponent1Label = document.getElementById('opponent1-label');
const opponent2Label = document.getElementById('opponent2-label');


// --- Helper Functions (general purpose) ---

// Helper function to update the back button's text and action
function updateBackButton(text, handler) {
  // This function now specifically targets the back button on the *currently active* game screen.
  // We need to ensure the correct back button is updated based on the active screen.
  // The HTML has multiple back buttons.
  if (gameScreen.style.display === 'block' && backButton) {
    backButton.innerText = text;
    backButton.onclick = handler;
  } else if (doudizhuGameScreen.style.display === 'block' && doudizhuGameBackButton) {
    doudizhuGameBackButton.innerText = text;
    doudizhuGameBackButton.onclick = handler;
  } else if (doudizhuLobbyScreen.style.display === 'block' && lobbyBackButton) {
    lobbyBackButton.innerText = text;
    lobbyBackButton.onclick = handler;
  }
}

// Helper to update card counts on screen (primarily for War)
function updateCardCounts() {
    if (playerCardCountSpan) playerCardCountSpan.innerText = playerDeck.length;
    if (enemyCardCountSpan) enemyCardCountSpan.innerText = enemyDeck.length;
}

// Helper to toggle visibility of player info divs (primarily for War/Blackjack)
function togglePlayerInfo(show) {
    if (playerInfoDiv) playerInfoDiv.style.display = show ? 'flex' : 'none';
    if (enemyInfoDiv) enemyInfoDiv.style.display = show ? 'flex' : 'none';
}


// Renders a hand of cards by creating <img> elements for each card
// Added a `hideHoleCard` parameter for Blackjack dealer's first turn
function renderHand(containerId, cards, clickable = true, hideHoleCard = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!cards || cards.length === 0) return;

  cards.forEach((card, index) => {
    const img = document.createElement('img');
    img.className = 'card';
    img.style.zIndex = index; // For overlapping effect

    // If it's the dealer's hand and hideHoleCard is true and it's the second card
    if (containerId === 'enemy-hand' && hideHoleCard && index === 1) {
        img.src = `assets/cards/card_back.svg`; // Show card back
        img.alt = `Card Back`;
    } else {
        img.src = `assets/cards/${getCardFileName(card)}`;
        img.alt = card.toString();
    }

    if (clickable) {
      img.addEventListener('click', () => {
        focusCard(card, index);
      });
    }

    container.appendChild(img);
  });
}

// Renders a single, magnified card for the Deck Viewer's focus mode
function renderFocusedCard(card) {
  // This function is specifically for the Deck Viewer, which uses playerHandDiv
  playerHandDiv.innerHTML = ''; // Clear existing hand

  const focusedCardDisplay = document.createElement('div');
  focusedCardDisplay.className = 'focused-card-display'; // Apply specific styling

  const img = document.createElement('img');
  img.className = 'card focused'; // Add 'focused' class for CSS styling
  img.src = `assets/cards/${getCardFileName(card)}`;
  img.alt = card.toString();
  // Clicking focused card now returns to the *current* full deck view
  img.addEventListener('click', returnToFullDeckView);

  focusedCardDisplay.appendChild(img);
  playerHandDiv.appendChild(focusedCardDisplay);

  // Update result div with focused card info
  resultDiv.innerText = `Focused: ${card.toString()}`;
}


// --- Blackjack specific functions ---

// Calculates the value of a Blackjack hand
function calculateHandValue(hand) {
    let value = 0;
    let numAces = 0;

    for (let card of hand) {
        value += card.value;
        if (card.rank === 'A') {
            numAces++;
        }
    }

    // Adjust for Aces if hand is over 21
    while (value > 21 && numAces > 0) {
        value -= 10; // Change Ace value from 11 to 1
        numAces--;
    }
    return value;
}

// Updates the display of hand values and game status, including win counters
function updateBlackjackUI() {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand); // Dealer's actual value, even with hole card

    renderHand('player-hand', playerHand, false); // Player's cards are always visible
    // For dealer, only show hole card if game is 'playing' (player's turn)
    renderHand('enemy-hand', dealerHand, false, gameStatus === 'playing');

    // Update player info divs to show current scores AND win counts
    if (playerInfoDiv) {
        playerInfoDiv.innerHTML = `
            <span class="player-label">Your Hand:</span> <span class="card-count">${playerValue}</span><br>
            <span class="wins-label">Wins:</span> <span class="wins-count">${playerWins}</span>
        `;
    }
    if (enemyInfoDiv) {
        enemyInfoDiv.innerHTML = `
            <span class="player-label">Dealer's Hand:</span> <span class="card-count">${gameStatus === 'playing' ? '?' : dealerValue}</span><br>
            <span class="wins-label">Wins:</span> <span class="wins-count">${dealerWins}</span>
        `;
    }

    // Update resultDiv with current scores during the playing state
    if (gameStatus === 'playing') {
        resultDiv.innerText = `Player: ${playerValue} | Dealer: ? (Hit or Stand?)`;
    }
    // Other game status messages (win/loss/bust) are handled by endBlackjackGame, dealerPlays, etc.


    // Show/hide specific buttons
    if (gameStatus === 'playing') {
        if (hitButton) hitButton.style.display = 'inline-block';
        if (standButton) standButton.style.display = 'inline-block';
        playTurnButton.style.display = 'none'; // Hide War's Play Turn button
    } else {
        if (hitButton) hitButton.style.display = 'none';
        if (standButton) standButton.style.display = 'none';
        // The playTurnButton will be set to "Play Again" in endBlackjackGame
    }
}

// Player chooses to hit
function hit() {
    playerHand.push(blackjackDeck.deal());
    const playerValue = calculateHandValue(playerHand);
    updateBlackjackUI(); // This call now updates the resultDiv as well

    if (playerValue > 21) {
        gameStatus = 'player_bust';
        endBlackjackGame();
    }
    // Check for 5 Card Charlie immediately after a hit, if not busted
    else if (playerHand.length === 5) {
        // Automatically stand if 5 cards are drawn and not busted
        // resultDiv.innerText will be updated by endBlackjackGame
        stand();
    }
}

// Player chooses to stand
function stand() {
    gameStatus = 'dealer_turn';
    // Hide Hit/Stand buttons immediately
    if (hitButton) hitButton.style.display = 'none';
    if (standButton) standButton.style.display = 'none';
    dealerPlays();
}

// Dealer's turn logic
function dealerPlays() {
    // Reveal hole card
    renderHand('enemy-hand', dealerHand, false, false); // Show both dealer cards
    resultDiv.innerText = `Dealer's Turn... Dealer reveals hole card.`; // This specific message replaces the score display temporarily

    let dealerValue = calculateHandValue(dealerHand);

    // Dealer hits on 16 or less, stands on 17 or more
    const dealerPlayInterval = setInterval(() => {
        if (dealerValue < 17) {
            dealerHand.push(blackjackDeck.deal());
            dealerValue = calculateHandValue(dealerHand);
            renderHand('enemy-hand', dealerHand, false, false); // Update dealer hand
            resultDiv.innerText = `Dealer hits: ${dealerValue}`; // Update message during dealer hits
            if (dealerValue > 21) {
                gameStatus = 'dealer_bust';
                clearInterval(dealerPlayInterval);
                endBlackjackGame();
                return;
            }
        } else {
            clearInterval(dealerPlayInterval);
            endBlackjackGame(); // Determine winner
        }
    }, 1000); // Wait 1 second between dealer hits for visual effect
}

// Determines the winner of the Blackjack game
function endBlackjackGame() {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    // Final reveal of dealer's hand
    renderHand('enemy-hand', dealerHand, false, false);
    // Update final scores in player info divs
    if (playerInfoDiv) playerInfoDiv.innerHTML = `<span class="player-label">Your Hand:</span> <span class="card-count">${playerValue}</span><br><span class="wins-label">Wins:</span> <span class="wins-count">${playerWins}</span>`;
    if (enemyInfoDiv) enemyInfoDiv.innerHTML = `<span class="player-label">Dealer's Hand:</span> <span class="card-count">${dealerValue}</span><br><span class="wins-label">Wins:</span> <span class="wins-count">${dealerWins}</span>`;


    // --- Determine Winner with 5 Card Charlie Rule ---
    if (gameStatus === 'player_bust') {
        resultDiv.innerText = `You BUST with ${playerValue}! Dealer wins.`;
        dealerWins++; // Increment dealer wins
    } else if (gameStatus === 'dealer_bust') {
        resultDiv.innerText = `Dealer BUSTS with ${dealerValue}! You win!`;
        playerWins++; // Increment player wins
    }
    // Check for 5 Card Charlie: Player has 5 cards and is not busted
    else if (playerHand.length === 5 && playerValue <= 21) {
        // If player has 5-Card Charlie, they win UNLESS dealer has a natural Blackjack (2 cards, 21)
        if (dealerValue === 21 && dealerHand.length === 2) {
            gameStatus = 'dealer_blackjack_beats_charlie'; // Specific status for clarity
            resultDiv.innerText = `Dealer has BLACKJACK! Dealer wins, even against your 5 Card Charlie!`;
            dealerWins++; // Increment dealer wins
        } else {
            gameStatus = 'player_5_card_charlie';
            resultDiv.innerText = `5 CARD CHARLIE! You win with ${playerValue} and 5 cards!`;
            playerWins++; // Increment player wins
        }
    }
    // Check for natural Blackjacks (2-card 21s)
    else if (playerValue === 21 && playerHand.length === 2) {
        if (dealerValue === 21 && dealerHand.length === 2) {
            gameStatus = 'push';
            resultDiv.innerText = `It's a PUSH (Tie) with two Blackjacks!`;
            // No win increment for push
        } else {
            gameStatus = 'player_blackjack';
            resultDiv.innerText = 'BLACKJACK! You win!';
            playerWins++; // Increment player wins
        }
    } else if (dealerValue === 21 && dealerHand.length === 2) {
        gameStatus = 'dealer_blackjack';
        resultDiv.innerText = 'Dealer has BLACKJACK! Dealer wins.';
        dealerWins++; // Increment dealer wins
    }
    // Standard score comparisons (if no busts, no charlie, no natural blackjacks)
    else if (playerValue > dealerValue) {
        gameStatus = 'player_win';
        resultDiv.innerText = `You win with ${playerValue} vs Dealer's ${dealerValue}!`;
        playerWins++; // Increment player wins
    } else if (dealerValue > playerValue) {
        gameStatus = 'dealer_win';
        resultDiv.innerText = `Dealer wins with ${dealerValue} vs Your ${playerValue}.`;
        dealerWins++; // Increment dealer wins
    } else { // playerValue === dealerValue
        gameStatus = 'push';
        resultDiv.innerText = `It's a PUSH (Tie) with ${playerValue}!`;
        // No win increment for push
    }

    // --- End Game UI Updates ---
    playTurnButton.innerText = "Play Again";
    playTurnButton.onclick = startBlackjack; // Clicking it will start a new game
    playTurnButton.style.display = 'inline-block';
    console.log("endBlackjackGame: playTurnButton.onclick set to startBlackjack."); // DEBUG

    // Hide Hit/Stand buttons definitively
    if (hitButton) hitButton.style.display = 'none';
    if (standButton) standButton.style.display = 'none';
}


// --- Game Initialization Functions ---

function startBlackjack() {
  showScreen('game-screen', 'Blackjack'); // Use the generic game screen
  resultDiv.innerText = 'Dealing...';

  // Reset game state for a new hand, but keep win counters
  playerHand = [];
  dealerHand = [];
  gameStatus = 'playing';
  // Create a new Deck for Blackjack with 2 decks and specific values
  blackjackDeck = new Deck({ numDecks: 2, gameType: 'blackjack' });
  blackjackDeck.shuffle();

  // Clear hands display
  playerHandDiv.innerHTML = '';
  enemyHandDiv.innerHTML = '';

  // Deal initial cards
  playerHand.push(blackjackDeck.deal());
  dealerHand.push(blackjackDeck.deal()); // Dealer's face-up card
  playerHand.push(blackjackDeck.deal());
  dealerHand.push(blackjackDeck.deal()); // Dealer's face-down (hole) card

  // Show player info divs (now for scores)
  togglePlayerInfo(true);

  // Set justify-content for Blackjack hands to center
  playerHandDiv.style.justifyContent = 'center';
  enemyHandDiv.style.justifyContent = 'center';

  // Create Hit/Stand buttons (if they don't exist)
  // Ensure they are appended to 'game-area' or a suitable container
  if (!document.getElementById('hit-button')) {
      hitButton = document.createElement('button');
      hitButton.id = 'hit-button';
      hitButton.innerText = 'Hit';
      hitButton.onclick = hit;
      hitButton.classList.add('game-action-button'); // Apply general button styling
      document.getElementById('game-area').appendChild(hitButton);

      standButton = document.createElement('button');
      standButton.id = 'stand-button';
      standButton.innerText = 'Stand';
      standButton.onclick = stand;
      standButton.classList.add('game-action-button'); // Apply general button styling
      document.getElementById('game-area').appendChild(standButton);
  }

  // Ensure "Play Again" button is hidden at the start of a new round
  playTurnButton.style.display = 'none';
  console.log("startBlackjack: playTurnButton.style.display set to 'none'."); // DEBUG

  // Update initial UI
  updateBlackjackUI(); // This will now set the initial score in resultDiv

  // Check for immediate Blackjacks (before player takes action)
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand); // Actual value for internal check

  if (playerValue === 21 && playerHand.length === 2) {
      resultDiv.innerText = 'BLACKJACK! You win!';
      endBlackjackGame(); // Ends the game immediately
  } else if (dealerValue === 21 && dealerHand.length === 2) {
      resultDiv.innerText = 'Dealer has BLACKJACK! Dealer wins.';
      endBlackjackGame(); // Ends the game immediately
  } else {
      // If no immediate Blackjack, resultDiv is already updated by updateBlackjackUI()
      // No explicit prompt needed here, as updateBlackjackUI handles it.
  }
}


function startWar() {
  showScreen('game-screen', 'War'); // Use the generic game screen
  const deck = new Deck({ gameType: 'war' }); // Use new Deck constructor
  deck.shuffle();
  [playerDeck, enemyDeck] = deck.dealHalf();

  playTurnButton.style.display = 'inline-block';
  playTurnButton.innerText = 'Play Turn';
  playTurnButton.onclick = playWarTurn; // THIS IS THE CRUCIAL LINE FOR WAR
  console.log("startWar: playTurnButton.onclick set to playWarTurn."); // DEBUG: Check this line
  resultDiv.innerText = 'Ready to play War!';

  renderHand('player-hand', []); // Start with empty hands shown
  renderHand('enemy-hand', []);

  // Hide Blackjack specific buttons (already handled by showScreen, but good to be explicit)
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Center the single cards in War
  playerHandDiv.style.justifyContent = 'center';
  enemyHandDiv.style.justifyContent = 'center';

  // Show player info divs
  togglePlayerInfo(true);
  updateCardCounts(); // Initial card count
}

function playWarTurn() {
    console.log("playWarTurn function executed."); // DEBUG
    if (playerDeck.length === 0 || enemyDeck.length === 0) {
        resultDiv.innerText = "Game over! " + (playerDeck.length === 0 ? "Enemy wins!" : "Player wins!");
        playTurnButton.disabled = true;
        return;
    }

    const playerCard = playerDeck.shift();
    const enemyCard = enemyDeck.shift();

    renderHand('player-hand', [playerCard], false);
    renderHand('enemy-hand', [enemyCard], false);

    let message;
    if (playerCard.value > enemyCard.value) {
        message = "Player wins the round!";
        playerDeck.push(playerCard, enemyCard);
    } else if (enemyCard.value > playerCard.value) {
        message = "Enemy wins the round!";
        enemyDeck.push(enemyCard, playerCard);
    } else {
        message = "It's a tie! Going to War!";
        // Implement War logic: 3 face down cards, then 1 face up
        const warCards = [];
        let playerWarCards = [];
        let enemyWarCards = [];

        // Check if enough cards for war
        if (playerDeck.length < 4 || enemyDeck.length < 4) {
            message += " Not enough cards for a full war! Game ends prematurely.";
            playTurnButton.disabled = true; // No more turns if not enough cards
        } else {
            // Player lays 3 cards face down, 1 face up
            for (let i = 0; i < 3; i++) playerWarCards.push(playerDeck.shift());
            playerWarCards.push(playerDeck.shift()); // The face up card
            
            // Enemy lays 3 cards face down, 1 face up
            for (let i = 0; i < 3; i++) enemyWarCards.push(enemyDeck.shift());
            enemyWarCards.push(enemyDeck.shift()); // The face up card

            // Render face-down cards and the last face-up card for war
            renderHand('player-hand', [
                new Card(null, null, null, null), new Card(null, null, null, null), new Card(null, null, null, null),
                playerWarCards[3] // The face-up card
            ], false);
            renderHand('enemy-hand', [
                new Card(null, null, null, null), new Card(null, null, null, null), new Card(null, null, null, null),
                enemyWarCards[3] // The face-up card
            ], false);


            // Compare the face-up cards (last card in war array)
            const playerWarCard = playerWarCards[3];
            const enemyWarCard = enemyWarCards[3];

            if (playerWarCard.value > enemyWarCard.value) {
                message += " Player wins the War!";
                playerDeck.push(playerCard, enemyCard, ...playerWarCards, ...enemyWarCards);
            } else if (enemyWarCard.value > playerWarCard.value) {
                message += " Enemy wins the War!";
                enemyDeck.push(playerCard, enemyCard, ...playerWarCards, ...enemyWarCards);
            } else {
                message += " Another tie in War! Cards are lost!";
                // In a tie during war, the cards are often discarded or split, for simplicity, we discard them.
                // Or you could go to another war, but that can lead to infinite loops.
            }
        }
    }

    resultDiv.innerText = message;
    updateCardCounts();

    if (playerDeck.length === 0 || enemyDeck.length === 0) {
        resultDiv.innerText += "\nGame over! " + (playerDeck.length === 0 ? "Enemy wins!" : "Player wins!");
        playTurnButton.disabled = true;
    }
}


function showDeckViewer() {
  showScreen('game-screen', 'Deck Viewer'); // Use the generic game screen
  const deck = new Deck({ includeJokers: true, gameType: 'viewer' }); // Use new Deck constructor
  deck.shuffle();
  deck.sort();
  currentDeck = deck.cards; // Store this specific deck instance
  focusedCardIndex = -1; // Reset focused index

  // Render the full sorted deck
  renderHand('player-hand', currentDeck, true); // Cards are clickable in Deck Viewer
  enemyHandDiv.innerHTML = ''; // Hide enemy hand
  playTurnButton.style.display = 'none'; // Hide play turn button
  console.log("showDeckViewer: playTurnButton.style.display set to 'none'."); // DEBUG

  // Hide Blackjack specific buttons (already handled by showScreen)
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  resultDiv.innerText = 'Click a card to focus, use arrow keys to navigate.';

  // Reset justify-content for Deck Viewer
  playerHandDiv.style.justifyContent = 'flex-start';
  enemyHandDiv.style.justifyContent = 'flex-start';

  // Hide player info divs (already handled by showScreen)
  togglePlayerInfo(false);

  // When entering the Deck Viewer, set the back button to "Back to Menu"
  updateBackButton('Back to Menu', returnToMenu);
}

// Manages focusing a card in the Deck Viewer
function focusCard(card, index = -1) {
  focusedCardIndex = index;
  currentDeck = currentDeck || []; // Ensure currentDeck is initialized

  renderFocusedCard(card);

  // Hide enemy hand and play turn button when viewing a focused card (already handled by showScreen for initial view)
  enemyHandDiv.innerHTML = '';
  playTurnButton.style.display = 'none';
  console.log("focusCard: playTurnButton.style.display set to 'none'."); // DEBUG

  // Hide specific Blackjack buttons if they exist (already handled by showScreen for initial view)
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Hide player info divs (already handled by showScreen for initial view)
  togglePlayerInfo(false);

  // When a card is focused, change the back button to "Return to Deck"
  updateBackButton('Return to Deck', returnToFullDeckView);
}

// Returns to the full deck view within the Deck Viewer
function returnToFullDeckView() {
  if (currentDeck) {
    // Render the existing deck state without creating a new deck
    renderHand('player-hand', currentDeck, true);
    enemyHandDiv.innerHTML = ''; // Clear enemy hand area
    playTurnButton.style.display = 'none'; // Hide play turn button
    console.log("returnToFullDeckView: playTurnButton.style.display set to 'none'."); // DEBUG

    // Hide specific Blackjack buttons (already handled by showScreen)
    if (hitButton) hitButton.style.display = 'none';
    if (standButton) standButton.style.display = 'none';

    resultDiv.innerText = 'Click a card to focus, use arrow keys to navigate.';
    focusedCardIndex = -1; // Reset focused index

    // Reset justify-content for Deck Viewer
    playerHandDiv.style.justifyContent = 'flex-start';
    enemyHandDiv.style.justifyContent = 'flex-start';

    // Hide player info divs (already handled by showScreen)
    togglePlayerInfo(false);

    // When returning to full deck view, change the back button back to "Back to Menu"
    updateBackButton('Back to Menu', returnToMenu);
  } else {
    // Fallback: If currentDeck is somehow not set (e.g., direct deep link), re-initialize the viewer
    showDeckViewer();
  }
}

// Add arrow key navigation for focused card in Deck Viewer
document.addEventListener('keydown', (event) => {
  // Only respond to keydown if the Deck Viewer screen is active
  if (gameScreen.style.display === 'block' && gameTitle.innerText === 'Deck Viewer') {
    if (focusedCardIndex !== -1 && currentDeck && currentDeck.length > 0) {
      if (event.key === 'ArrowLeft' && focusedCardIndex > 0) {
        focusedCardIndex--;
        renderFocusedCard(currentDeck[focusedCardIndex]);
      } else if (event.key === 'ArrowRight' && focusedCardIndex < currentDeck.length - 1) {
        focusedCardIndex++;
        renderFocusedCard(currentDeck[focusedCardIndex]);
      }
    }
  }
});

function returnToMenu() {
  document.getElementById('menu-screen').style.display = 'block';
  gameScreen.style.display = 'none'; // Hide generic game screen
  doudizhuGameScreen.style.display = 'none'; // Hide Doudizhu game screen
  doudizhuLobbyScreen.style.display = 'none'; // Hide Doudizhu lobby screen

  // If there's an active game listener, unsubscribe
  if (doudizhuGameUnsubscribe) {
      doudizhuGameUnsubscribe();
      doudizhuGameUnsubscribe = null;
      console.log("Firestore game listener unsubscribed.");
  }
  currentGameId = null; // Clear current game ID

  // Reset game state for a clean return to menu for all games
  playerDeck = [];
  enemyDeck = [];
  currentDeck = null;
  focusedCardIndex = -1;
  playTurnButton.disabled = false;
  playTurnButton.style.display = 'none';
  playTurnButton.onclick = null; // Explicitly clear handler
  console.log("returnToMenu: playTurnButton.style.display set to 'none', onclick cleared."); // DEBUG

  // Hide specific Blackjack buttons
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Reset Blackjack specific variables (but keep win counters)
  blackjackDeck = null;
  playerHand = [];
  dealerHand = [];
  gameStatus = 'playing';

  // Reset Doudizhu specific variables
  doudizhuGameState = {
    players: {},
    landlordPile: [],
    lastPlayedPattern: null,
    lastPlayedCards: [],
    currentTurnUserId: null,
    gameState: 'lobby',
    bids: {},
    landlordUserId: null,
    gameStarted: false,
    gameRound: 0,
    playerOrder: [],
    passesInRound: 0
  };

  // Hide player info divs (used by War/Blackjack)
  togglePlayerInfo(false);

  // Clear hands display for all games
  playerHandDiv.innerHTML = '';
  enemyHandDiv.innerHTML = '';
  doudizhuPlayerHandDiv.innerHTML = '';
  doudizhuOpponent1HandDiv.innerHTML = '';
  doudizhuOpponent2HandDiv.innerHTML = '';
  doudizhuPlayedCardsDiv.innerHTML = '';


  // Reset justify-content for hands (used by War/Blackjack/Deck Viewer)
  playerHandDiv.style.justifyContent = 'flex-start';
  enemyHandDiv.style.justifyContent = 'flex-start';

  resultDiv.innerText = ''; // Clear result text for generic screen
  doudizhuResultDiv.innerText = ''; // Clear result text for Doudizhu screen

  // Hide Doudizhu specific buttons and labels
  if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'none';
  if (doudizhuPassButton) doudizhuPassButton.style.display = 'none';
  if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none';
  if (doudizhuCurrentPatternDiv) doudizhuCurrentPatternDiv.style.display = 'none';

  // Clear lobby specific UI
  lobbyMessage.innerText = '';
  currentGameCodeSpan.style.display = 'none';
  displayGameCodeSpan.innerText = '';
  gameCodeInput.value = '';
  lobbyPlayerList.innerHTML = '';
}

// Centralized function to show a specific screen
function showScreen(screenId, title = '') {
  // Hide all main screens
  document.getElementById('menu-screen').style.display = 'none';
  gameScreen.style.display = 'none';
  doudizhuGameScreen.style.display = 'none';
  doudizhuLobbyScreen.style.display = 'none';

  // Show the requested screen
  document.getElementById(screenId).style.display = 'block';

  // Set titles if applicable
  if (screenId === 'game-screen') {
    gameTitle.innerText = title;
  } else if (screenId === 'doudizhu-game-screen') {
    doudizhuGameTitle.innerText = title;
  }

  // Reset common game controls (for War/Blackjack)
  playTurnButton.disabled = false;
  playTurnButton.style.display = 'none';
  playTurnButton.onclick = null; // Explicitly clear handler
  console.log(`showScreen(${screenId}): playTurnButton.style.display set to 'none', onclick cleared.`); // DEBUG

  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  togglePlayerInfo(false);

  playerHandDiv.style.justifyContent = 'flex-start';
  enemyHandDiv.style.justifyContent = 'flex-start';

  resultDiv.innerText = '';
  doudizhuResultDiv.innerText = '';

  // Default back button behavior
  updateBackButton('Back to Menu', returnToMenu);
}

// --- Doudizhu Lobby Functions ---

function showDoudizhuLobby() {
    showScreen('doudizhu-lobby-screen');
    lobbyMessage.innerText = 'Waiting for players...';
    currentUserIdSpan.innerText = currentUserId || 'Loading...';

    // Set up event listeners for lobby buttons
    joinGameButton.onclick = joinGame;
    createGameButton.onclick = createGame;

    // Clear any previous game code display
    currentGameCodeSpan.style.display = 'none';
    displayGameCodeSpan.innerText = '';
    lobbyPlayerList.innerHTML = '';
}

async function createGame() {
    console.log("createGame called. Current User ID:", currentUserId); // DEBUG: Check userId before check
    console.log("Firebase DB object:", db); // DEBUG: Check db object

    if (!db || !currentUserId) {
        lobbyMessage.innerText = "Firebase not initialized or user not signed in. Please wait or check console for errors.";
        console.error("Attempted to create game: Firebase DB not ready or currentUserId not set.", { dbInitialized: !!db, currentUserId: currentUserId }); // More detailed error
        return;
    }

    lobbyMessage.innerText = "Creating game...";
    try {
        // Correct way to get a new document reference in Firestore (Namespaced API)
        const newGameRef = db.collection(`artifacts/${appId}/public/games`).doc();
        const newGameId = newGameRef.id;

        const initialGameState = {
            players: {
                [currentUserId]: {
                    userId: currentUserId,
                    name: currentUserName,
                    hand: [],
                    isLandlord: false,
                    isReady: false,
                    playerIndex: 0 // Creator is always player 0 initially
                }
            },
            landlordPile: [],
            lastPlayedPattern: null,
            lastPlayedCards: [],
            currentTurnUserId: null,
            gameState: 'lobby',
            bids: {},
            landlordUserId: null,
            gameStarted: false,
            gameRound: 0,
            playerOrder: [currentUserId], // Only creator initially
            passesInRound: 0
        };

        await newGameRef.set(initialGameState); // Use .set() on the document reference
        currentGameId = newGameId;
        lobbyMessage.innerText = `Game created! Share code: ${newGameId}`;
        displayGameCodeSpan.innerText = newGameId;
        currentGameCodeSpan.style.display = 'block';
        console.log("Game created with ID:", newGameId);

        // Start listening for game state changes
        listenToGame(newGameId);

    } catch (e) {
        console.error("Error creating game:", e);
        lobbyMessage.innerText = "Error creating game. Please try again.";
    }
}

async function joinGame() {
    console.log("joinGame called. Current User ID:", currentUserId); // DEBUG
    console.log("Firebase DB object:", db); // DEBUG

    if (!db || !currentUserId) {
        lobbyMessage.innerText = "Firebase not initialized or user not signed in. Please wait or check console for errors.";
        console.error("Attempted to join game: Firebase DB not ready or currentUserId not set.", { dbInitialized: !!db, currentUserId: currentUserId }); // More detailed error
        return;
    }

    const gameCode = gameCodeInput.value.trim();
    if (!gameCode) {
        lobbyMessage.innerText = "Please enter a game code.";
        return;
    }

    lobbyMessage.innerText = `Joining game ${gameCode}...`;
    try {
        // Correct way to get a document reference in Firestore (Namespaced API)
        const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(gameCode);
        const gameSnap = await gameRef.get();

        if (!gameSnap.exists) { // Use .exists property for namespaced API
            lobbyMessage.innerText = "Game not found.";
            return;
        }

        const gameData = gameSnap.data();
        const players = gameData.players || {};
        const playerIds = Object.keys(players);

        if (playerIds.length >= 3) {
            lobbyMessage.innerText = "Game is full or already started.";
            return;
        }
        if (players[currentUserId]) {
            lobbyMessage.innerText = "You are already in this game.";
            currentGameId = gameCode;
            listenToGame(gameCode);
            return;
        }

        // Assign player index (0, 1, or 2)
        let newPlayerIndex = 0;
        // Find the next available index
        const existingIndices = Object.values(players).map(p => p.playerIndex);
        for (let i = 0; i < 3; i++) {
            if (!existingIndices.includes(i)) {
                newPlayerIndex = i;
                break;
            }
        }


        const newPlayers = {
            ...players,
            [currentUserId]: {
                userId: currentUserId,
                name: currentUserName,
                hand: [],
                isLandlord: false,
                isReady: false,
                playerIndex: newPlayerIndex
            }
        };

        const newPlayerOrder = [...gameData.playerOrder, currentUserId];

        await gameRef.update({ // Use .update() on the document reference
            players: newPlayers,
            playerOrder: newPlayerOrder
        });

        currentGameId = gameCode;
        lobbyMessage.innerText = `Joined game ${gameCode}!`;
        displayGameCodeSpan.innerText = gameCode;
        currentGameCodeSpan.style.display = 'block';
        console.log("Joined game:", gameCode);

        listenToGame(gameCode);

    } catch (e) {
        console.error("Error joining game:", e);
        lobbyMessage.innerText = "Error joining game. Please check the code and try again.";
    }
}

// Listen to real-time updates for the current game
function listenToGame(gameId) {
    if (doudizhuGameUnsubscribe) {
        doudizhuGameUnsubscribe(); // Unsubscribe from previous game if any
    }

    // Correct way to get a document reference and listen for snapshots (Namespaced API)
    const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(gameId);
    doudizhuGameUnsubscribe = gameRef.onSnapshot((docSnap) => {
        if (docSnap.exists) { // Use .exists property for namespaced API
            const data = docSnap.data();
            // Convert card data back to Card objects
            const deserializedData = {
                ...data,
                landlordPile: data.landlordPile ? data.landlordPile.map(c => Card.fromFirestore(c)) : [],
                lastPlayedCards: data.lastPlayedCards ? data.lastPlayedCards.map(c => Card.fromFirestore(c)) : [],
                players: Object.fromEntries(
                    Object.entries(data.players || {}).map(([userId, playerData]) => [
                        userId,
                        {
                            ...playerData,
                            hand: playerData.hand ? playerData.hand.map(c => Card.fromFirestore(c)) : []
                        }
                    ])
                )
            };
            doudizhuGameState = deserializedData;
            console.log("Game state updated:", doudizhuGameState);
            updateDoudizhuLobbyAndGameUI(); // Update UI based on new state
            processBids(); // Call processBids when game state updates to check for landlord
        } else {
            console.log("Game document no longer exists.");
            alert("The game has ended or was deleted.");
            returnToMenu();
        }
    }, (error) => {
        console.error("Error listening to game:", error);
        alert("Error syncing game state. Returning to menu.");
        returnToMenu();
    });
}

// Updates UI based on the current doudizhuGameState
function updateDoudizhuLobbyAndGameUI() {
    // Update lobby screen
    if (doudizhuGameState.gameState === 'lobby') {
        showScreen('doudizhu-lobby-screen');
        displayGameCodeSpan.innerText = currentGameId;
        currentGameCodeSpan.style.display = 'block';
        lobbyMessage.innerText = `Game Code: ${currentGameId}. Waiting for 3 players...`;

        lobbyPlayerList.innerHTML = '';
        const playersArray = Object.values(doudizhuGameState.players);
        playersArray.sort((a,b) => a.playerIndex - b.playerIndex); // Sort by assigned index

        playersArray.forEach(player => {
            const li = document.createElement('li');
            li.innerText = `${player.name} (ID: ${player.userId}) ${player.userId === currentUserId ? '(You)' : ''}`;
            lobbyPlayerList.appendChild(li);
        });

        if (playersArray.length === 3 && !doudizhuGameState.gameStarted) {
            lobbyMessage.innerText = "All players joined! Starting game...";
            // Only the game creator (first player) should initiate the start
            const creatorId = doudizhuGameState.playerOrder[0];
            if (currentUserId === creatorId) {
                setTimeout(dealCardsAndStartBidding, 2000); // Small delay before starting
            }
        }
    }
    // Update game screen
    else if (doudizhuGameState.gameState === 'bidding' || doudizhuGameState.gameState === 'playing' || doudizhuGameState.gameState === 'game_over') {
        showScreen('doudizhu-game-screen', 'Doudizhu');

        // Update player hands based on currentUserId
        const currentPlayerHand = doudizhuGameState.players[currentUserId]?.hand || [];
        renderDoudizhuHand('doudizhu-player-hand', currentPlayerHand, true, true);

        // Determine opponent hands and labels
        const playerOrder = doudizhuGameState.playerOrder;
        const myIndex = playerOrder.indexOf(currentUserId);

        const opp1UserId = playerOrder[(myIndex + 1) % 3];
        const opp2UserId = playerOrder[(myIndex + 2) % 3];

        opponent1Label.innerText = doudizhuGameState.players[opp1UserId]?.name || 'Opponent 1';
        opponent2Label.innerText = doudizhuGameState.players[opp2UserId]?.name || 'Opponent 2';

        renderDoudizhuHand('doudizhu-opponent1-hand', doudizhuGameState.players[opp1UserId]?.hand || [], false, false);
        renderDoudizhuHand('doudizhu-opponent2-hand', doudizhuGameState.players[opp2UserId]?.hand || [], false, false);

        // Update center area (landlord cards or last played cards)
        if (doudizhuGameState.gameState === 'bidding') {
            doudizhuCenterLabel.innerText = 'Landlord Cards';
            renderDoudizhuHand('doudizhu-played-cards', doudizhuGameState.landlordPile, false, true);
            doudizhuCurrentPatternDiv.style.display = 'none';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
            doudizhuBiddingButtonsDiv.style.display = (doudizhuGameState.currentTurnUserId === currentUserId) ? 'flex' : 'none';
            doudizhuResultDiv.innerText = `Player ${doudizhuGameState.players[doudizhuGameState.currentTurnUserId]?.name}'s turn to bid.`;
        } else if (doudizhuGameState.gameState === 'playing') {
            doudizhuCenterLabel.innerText = 'Last Played Cards';
            renderDoudizhuHand('doudizhu-played-cards', doudizhuGameState.lastPlayedCards, false, true);
            doudizhuCurrentPatternDiv.style.display = 'block';
            doudizhuPatternTextSpan.innerText = doudizhuGameState.lastPlayedPattern ? doudizhuGameState.lastPlayedPattern.type + (doudizhuGameState.lastPlayedPattern.value ? ` (${doudizhuGameState.lastPlayedPattern.value})` : '') : 'None';
            doudizhuBiddingButtonsDiv.style.display = 'none';
            doudizhuPlayButton.style.display = (doudizhuGameState.currentTurnUserId === currentUserId) ? 'inline-block' : 'none';
            doudizhuPassButton.style.display = (doudizhuGameState.currentTurnUserId === currentUserId) ? 'inline-block' : 'none';

            let landlordName = doudizhuGameState.players[doudizhuGameState.landlordUserId]?.name || 'Unknown';
            let currentTurnName = doudizhuGameState.players[doudizhuGameState.currentTurnUserId]?.name || 'Unknown';
            doudizhuResultDiv.innerText = `Landlord: ${landlordName}. ${currentTurnName}'s turn!`;

            if (doudizhuGameState.passesInRound >= 2 && doudizhuGameState.lastPlayedPattern !== null) {
                // If two players have passed, the next player (whoever's turn it is) can start a new round.
                // This will be handled by the logic in playDoudizhuCards/passDoudizhuTurn
                doudizhuResultDiv.innerText += " (New round can begin!)";
            }
        } else if (doudizhuGameState.gameState === 'game_over') {
            doudizhuResultDiv.innerText = `Game Over! ${doudizhuGameState.landlordUserId === currentUserId ? 'You' : doudizhuGameState.players[doudizhuGameState.landlordUserId]?.name} won!`;
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
            doudizhuBiddingButtonsDiv.style.display = 'none';
            // Potentially show a "Play Again" button or return to menu
        }
    }
}


async function dealCardsAndStartBidding() {
    if (!db || !currentGameId) return;

    // Prevent multiple calls
    if (doudizhuGameState.gameStarted) return;

    console.log("Dealing cards and starting bidding...");
    // Correct way to get a document reference (Namespaced API)
    const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(currentGameId);

    const deck = new Deck({ numDecks: 1, includeJokers: true, gameType: 'doudizhu' });
    deck.shuffle();

    const numCardsPerPlayer = 17;
    let tempHands = {
        [doudizhuGameState.playerOrder[0]]: [],
        [doudizhuGameState.playerOrder[1]]: [],
        [doudizhuGameState.playerOrder[2]]: []
    };
    let tempLandlordPile = [];

    for (let i = 0; i < numCardsPerPlayer; i++) {
        tempHands[doudizhuGameState.playerOrder[0]].push(deck.deal().toFirestore());
        tempHands[doudizhuGameState.playerOrder[1]].push(deck.deal().toFirestore());
        tempHands[doudizhuGameState.playerOrder[2]].push(deck.deal().toFirestore());
    }

    while (deck.cards.length > 0) {
        tempLandlordPile.push(deck.deal().toFirestore());
    }

    // Update hands in doudizhuGameState.players
    const updatedPlayers = {};
    for (const userId of doudizhuGameState.playerOrder) {
        updatedPlayers[userId] = {
            ...doudizhuGameState.players[userId],
            hand: tempHands[userId],
            isLandlord: false // Reset landlord status
        };
    }

    // Randomly select first bidder (0, 1, or 2 based on playerOrder index)
    const firstBidderIndex = Math.floor(Math.random() * 3);
    const firstBidderUserId = doudizhuGameState.playerOrder[firstBidderIndex];

    try {
        await gameRef.update({ // Use .update() on the document reference
            gameStarted: true,
            gameState: 'bidding',
            landlordPile: tempLandlordPile,
            players: updatedPlayers,
            bids: {
                [doudizhuGameState.playerOrder[0]]: null,
                [doudizhuGameState.playerOrder[1]]: null,
                [doudizhuGameState.playerOrder[2]]: null
            },
            currentTurnUserId: firstBidderUserId,
            landlordUserId: null, // Reset landlord
            lastPlayedPattern: null,
            lastPlayedCards: [],
            passesInRound: 0
        });
        console.log("Cards dealt and bidding initiated in Firestore.");
    } catch (error) {
        console.error("Error dealing cards and starting bidding:", error);
        lobbyMessage.innerText = "Error starting game. Please try again.";
    }
}

// Handles a bid from a player (true for call, false for don't call)
async function handleBid(bid) {
    if (!db || !currentGameId || doudizhuGameState.currentTurnUserId !== currentUserId) {
        doudizhuResultDiv.innerText = "It's not your turn to bid or game not ready.";
        return;
    }

    // Correct way to get a document reference (Namespaced API)
    const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(currentGameId);
    const updatedBids = { ...doudizhuGameState.bids, [currentUserId]: bid };

    let nextBidderIndex = (doudizhuGameState.playerOrder.indexOf(currentUserId) + 1) % 3;
    let nextBidderUserId = doudizhuGameState.playerOrder[nextBidderIndex];

    try {
        await gameRef.update({ // Use .update() on the document reference
            bids: updatedBids,
            currentTurnUserId: nextBidderUserId // Pass turn immediately
        });
        console.log(`${currentUserName} ${bid ? 'called' : 'didn\'t call'} landlord.`);
    } catch (error) {
        console.error("Error handling bid:", error);
        doudizhuResultDiv.innerText = "Error submitting bid.";
    }
}

// This function will be called by the onSnapshot listener when bids change
async function processBids() {
    if (!db || !currentGameId || doudizhuGameState.gameState !== 'bidding') return;

    // Correct way to get a document reference (Namespaced API)
    const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(currentGameId);
    const bidsReceived = Object.values(doudizhuGameState.bids).filter(b => b !== null).length;
    const calledLandlordPlayers = doudizhuGameState.playerOrder.filter(userId => doudizhuGameState.bids[userId] === true);

    if (bidsReceived === 3 || calledLandlordPlayers.length > 0) {
        // All players have bid or at least one has called
        let finalLandlordUserId = null;

        if (calledLandlordPlayers.length === 0) {
            // Everyone passed, restart game or handle no landlord scenario
            doudizhuResultDiv.innerText = "No one called landlord. Restarting game...";
            console.log("Everyone passed, restarting game.");
            // Reset game state and deal again (only creator should do this to avoid race conditions)
            if (currentUserId === doudizhuGameState.playerOrder[0]) {
                setTimeout(async () => {
                    await gameRef.update({ gameStarted: false, gameState: 'lobby', players: {} }); // Reset to lobby
                    // The onSnapshot will then trigger a new deal
                }, 2000);
            }
            return;
        } else if (calledLandlordPlayers.length === 1) {
            finalLandlordUserId = calledLandlordPlayers[0];
        } else {
            // Multiple players called, randomly pick one
            finalLandlordUserId = calledLandlordPlayers[Math.floor(Math.random() * calledLandlordPlayers.length)];
        }

        // Assign landlord cards and update Firestore
        if (currentUserId === doudizhuGameState.playerOrder[0]) { // Only creator updates to avoid race conditions
            const updatedPlayers = { ...doudizhuGameState.players };
            const landlordPlayer = updatedPlayers[finalLandlordUserId];
            const landlordCards = [...landlordPlayer.hand, ...doudizhuGameState.landlordPile];
            landlordCards.sort((a, b) => a.value - b.value); // Sort landlord's final hand

            updatedPlayers[finalLandlordUserId] = {
                ...landlordPlayer,
                hand: landlordCards.map(c => c.toFirestore()), // Convert back to plain objects
                isLandlord: true
            };

            try {
                await gameRef.update({ // Use .update() on the document reference
                    gameState: 'playing',
                    landlordUserId: finalLandlordUserId,
                    players: updatedPlayers,
                    landlordPile: [], // Clear landlord pile
                    currentTurnUserId: finalLandlordUserId, // Landlord starts the game
                    lastPlayedPattern: null,
                    lastPlayedCards: [],
                    passesInRound: 0
                });
                console.log(`Landlord assigned: ${finalLandlordUserId}. Game starting.`);
            } catch (error) {
                console.error("Error assigning landlord and starting game:", error);
            }
        }
    }
}


// Renders a Doudizhu hand
function renderDoudizhuHand(containerId, cards, clickable = false, showFaceUp = true) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!cards || cards.length === 0) return;

    // Sort cards for display in Doudizhu (e.g., by value, then suit)
    cards.sort((a, b) => {
        if (a.value !== b.value) {
            return a.value - b.value;
        }
        const suitOrder = { '♣': 0, '♦': 1, '♥': 2, '♠': 3 };
        return suitOrder[a.suit] - suitOrder[b.suit];
    });

    cards.forEach((card, index) => {
        const img = document.createElement('img');
        img.className = 'card doudizhu-card';
        img.style.zIndex = index;
        img.cardObject = card; // Store the card object on the DOM element for easy retrieval

        if (!showFaceUp) {
            img.src = `assets/cards/card_back.svg`;
            img.alt = `Card Back`;
        } else {
            img.src = `assets/cards/${getCardFileName(card)}`;
            img.alt = card.toString();
        }

        if (clickable) {
            img.addEventListener('click', (event) => {
                event.target.classList.toggle('selected');
            });
        }
        container.appendChild(img);
    });
}

// Placeholder for Doudizhu game logic functions
async function playDoudizhuCards() {
    console.log("PlayDoudizhuCards function called.");

    if (!db || !currentGameId || doudizhuGameState.currentTurnUserId !== currentUserId) {
        doudizhuResultDiv.innerText = "It's not your turn!";
        console.log("Not current user's turn to play.");
        return;
    }

    const selectedElements = doudizhuPlayerHandDiv.querySelectorAll('.card.selected');
    const selectedCards = Array.from(selectedElements).map(el => el.cardObject);

    console.log("Selected cards (from DOM):", selectedCards.map(c => c.toString()));

    if (selectedCards.length === 0) {
        doudizhuResultDiv.innerText = 'Please select cards to play.';
        console.log("No cards selected.");
        return;
    }

    const newPattern = getPattern(selectedCards);

    if (!newPattern) {
        doudizhuResultDiv.innerText = 'Invalid card pattern selected!';
        console.log("Invalid pattern detected for selected cards.");
        // Deselect cards if play is invalid
        selectedElements.forEach(el => el.classList.remove('selected'));
        return;
    }

    // Determine if the play is valid given the last played pattern
    const isFirstPlayInRound = (doudizhuGameState.lastPlayedCards.length === 0 || doudizhuGameState.lastPlayedPattern === null || doudizhuGameState.passesInRound === 2);
    console.log("Is first play in round (or after 2 passes):", isFirstPlayInRound);

    if (isFirstPlayInRound || canPlay(newPattern, doudizhuGameState.lastPlayedPattern)) {
        doudizhuResultDiv.innerText = `Playing: ${newPattern.type} (Value: ${newPattern.value})`;
        console.log("Play is valid. Updating Firestore.");

        // Remove played cards from player's hand (local copy for update)
        let updatedPlayerHand = doudizhuGameState.players[currentUserId].hand.filter(card => !selectedCards.some(sCard => sCard.suit === card.suit && sCard.rank === card.rank));

        // Correct way to get a document reference (Namespaced API)
        const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(currentGameId);
        const updatedPlayers = {
            ...doudizhuGameState.players,
            [currentUserId]: {
                ...doudizhuGameState.players[currentUserId],
                hand: updatedPlayerHand.map(c => c.toFirestore()) // Convert back to plain objects
            }
        };

        let nextTurnUserId = getNextPlayerUserId();
        let newPassesInRound = 0; // Reset passes if a valid play is made

        try {
            await gameRef.update({ // Use .update() on the document reference
                players: updatedPlayers,
                lastPlayedCards: selectedCards.map(c => c.toFirestore()), // Convert to plain objects
                lastPlayedPattern: newPattern,
                currentTurnUserId: nextTurnUserId,
                passesInRound: newPassesInRound
            });
            console.log("Firestore updated with played cards.");

            // Check for win condition (player has no cards left)
            if (updatedPlayerHand.length === 0) {
                console.log("Player won!");
                await gameRef.update({ // Use .update() on the document reference
                    gameState: 'game_over',
                    currentTurnUserId: null // No more turns
                });
            }

        } catch (error) {
            console.error("Error playing cards:", error);
            doudizhuResultDiv.innerText = "Error playing cards. Please try again.";
        }
    } else {
        doudizhuResultDiv.innerText = `Cannot play that! ${newPattern.type} cannot beat ${doudizhuGameState.lastPlayedPattern ? doudizhuGameState.lastPlayedPattern.type : 'None'}.`;
        console.log("Play is invalid. New pattern:", newPattern, "Last pattern:", doudizhuGameState.lastPlayedPattern);
        // Deselect cards if play is invalid
        selectedElements.forEach(el => el.classList.remove('selected'));
    }
}

async function passDoudizhuTurn() {
    console.log("PassDoudizhuTurn function called.");

    if (!db || !currentGameId || doudizhuGameState.currentTurnUserId !== currentUserId) {
        doudizhuResultDiv.innerText = "It's not your turn to pass or game not ready.";
        console.log("Not current user's turn to pass.");
        return;
    }

    // Clear selected cards if any
    const selectedElements = doudizhuPlayerHandDiv.querySelectorAll('.card.selected');
    selectedElements.forEach(el => el.classList.remove('selected'));

    // Correct way to get a document reference (Namespaced API)
    const gameRef = db.collection(`artifacts/${appId}/public/games`).doc(currentGameId);
    let nextTurnUserId = getNextPlayerUserId();
    let newPassesInRound = doudizhuGameState.passesInRound + 1;

    // Logic for clearing the board after two passes (or if it's the landlord's turn and they are the only one who didn't pass)
    let updatedLastPlayedPattern = doudizhuGameState.lastPlayedPattern;
    let updatedLastPlayedCards = doudizhuGameState.lastPlayedCards;

    // If two players have passed, and it's the third player's turn, clear the board.
    // Or if the current player is the landlord, and the two farmers have passed, clear the board.
    // This simplified logic assumes that if passesInRound reaches 2, the next player can start fresh.
    if (newPassesInRound >= 2) {
        console.log("Two consecutive passes detected. Clearing board for next player.");
        updatedLastPlayedPattern = null;
        updatedLastPlayedCards = [];
        newPassesInRound = 0; // Reset passes for the new round
        doudizhuResultDiv.innerText = "Board cleared. You can start a new sequence!";
    }


    try {
        await gameRef.update({ // Use .update() on the document reference
            currentTurnUserId: nextTurnUserId,
            passesInRound: newPassesInRound,
            lastPlayedPattern: updatedLastPlayedPattern, // Update if board was cleared
            lastPlayedCards: updatedLastPlayedCards // Update if board was cleared
        });
        console.log("Firestore updated with pass.");
    } catch (error) {
        console.error("Error passing turn:", error);
        doudizhuResultDiv.innerText = "Error passing turn. Please try again.";
    }
}

/**
 * Helper to get the userId of the next player in the turn order.
 */
function getNextPlayerUserId() {
    const currentPlayerIndex = doudizhuGameState.playerOrder.indexOf(doudizhuGameState.currentTurnUserId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % 3;
    return doudizhuGameState.playerOrder[nextPlayerIndex];
}


// --- Doudizhu Pattern Recognition and Comparison Functions ---

/**
 * Helper to count occurrences of each card value (rank) in a hand.
 * @param {Array<Card>} cards - An array of Card objects.
 * @returns {Map<number, number>} A map where key is card value and value is count.
 */
function getCardValueCounts(cards) {
    const counts = new Map();
    for (const card of cards) {
        counts.set(card.value, (counts.get(card.value) || 0) + 1);
    }
    return counts;
}

/**
 * Helper to get unique sorted values from a hand.
 * @param {Array<Card>} cards - An array of Card objects.
 * @returns {Array<number>} Sorted array of unique card values.
 */
function getUniqueSortedValues(cards) {
    return Array.from(new Set(cards.map(card => card.value))).sort((a, b) => a - b);
}

/**
 * Checks if cards form a Rocket (Joker + Joker).
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isRocket(cards) {
    if (cards.length === 2 && cards.every(c => c.rank === 'JOKER')) {
        // Ensure one black and one red joker
        if (cards[0].color !== cards[1].color) {
            return { type: 'Rocket', value: 100, length: 2 }; // Highest value
        }
    }
    return null;
}

/**
 * Checks if cards form a Bomb (four-of-a-kind).
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isBomb(cards) {
    if (cards.length === 4) {
        const counts = getCardValueCounts(cards);
        if (counts.size === 1 && counts.values().next().value === 4) {
            return { type: 'Bomb', value: cards[0].value, length: 4 };
        }
    }
    return null;
}

/**
 * Checks if cards form a Single.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isSingle(cards) {
    if (cards.length === 1) {
        return { type: 'Single', value: cards[0].value, length: 1 };
    }
    return null;
}

/**
 * Checks if cards form a Pair.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isPair(cards) {
    if (cards.length === 2) {
        if (cards[0].value === cards[1].value) {
            return { type: 'Pair', value: cards[0].value, length: 2 };
        }
    }
    return null;
}

/**
 * Checks if cards form a Triplet.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isTriplet(cards) {
    if (cards.length === 3) {
        if (cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
            return { type: 'Triplet', value: cards[0].value, length: 3 };
        }
    }
    return null;
}

/**
 * Checks if cards form a Triplet + Single.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isTripletWithSingle(cards) {
    if (cards.length === 4) {
        const counts = getCardValueCounts(cards);
        if (counts.size === 2) {
            let tripletValue = -1;
            let singleValue = -1;
            for (const [value, count] of counts.entries()) {
                if (count === 3) tripletValue = value;
                else if (count === 1) singleValue = value;
            }
            if (tripletValue !== -1 && singleValue !== -1) {
                return { type: 'Triplet + Single', value: tripletValue, length: 4 };
            }
        }
    }
    return null;
}

/**
 * Checks if cards form a Triplet + Pair.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isTripletWithPair(cards) {
    if (cards.length === 5) {
        const counts = getCardValueCounts(cards);
        if (counts.size === 2) {
            let tripletValue = -1;
            let pairValue = -1;
            for (const [value, count] of counts.entries()) {
                if (count === 3) tripletValue = value;
                else if (count === 2) pairValue = value;
            }
            if (tripletValue !== -1 && pairValue !== -1) {
                return { type: 'Triplet + Pair', value: tripletValue, length: 5 };
            }
        }
    }
    return null;
}

/**
 * Checks if cards form a Straight.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isStraight(cards) {
    if (cards.length < 5 || cards.length > 12) return null; // Straight must be 5 to 12 cards
    const uniqueValues = getUniqueSortedValues(cards);

    if (uniqueValues.length !== cards.length) return null; // No duplicate ranks
    if (uniqueValues.includes(15) || uniqueValues.includes(16) || uniqueValues.includes(17)) return null; // No 2s or Jokers in straight

    for (let i = 0; i < uniqueValues.length - 1; i++) {
        if (uniqueValues[i] + 1 !== uniqueValues[i + 1]) {
            return null; // Not consecutive
        }
    }
    return { type: 'Straight', value: uniqueValues[0], length: cards.length };
}

/**
 * Checks if cards form a Pair Sequence.
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isPairSequence(cards) {
    if (cards.length < 6 || cards.length % 2 !== 0) return null; // Must be at least 3 pairs (6 cards)
    const counts = getCardValueCounts(cards);
    const uniqueValues = getUniqueSortedValues(cards);

    if (uniqueValues.includes(15) || uniqueValues.includes(16) || uniqueValues.includes(17)) return null; // No 2s or Jokers

    if (uniqueValues.length * 2 !== cards.length) return null; // Ensure all are pairs
    for (const count of counts.values()) {
        if (count !== 2) return null; // Each unique value must appear exactly twice
    }

    for (let i = 0; i < uniqueValues.length - 1; i++) {
        if (uniqueValues[i] + 1 !== uniqueValues[i + 1]) {
            return null; // Not consecutive pairs
        }
    }
    return { type: 'Pair Sequence', value: uniqueValues[0], length: cards.length };
}

/**
 * Checks if cards form an Airplane (consecutive triplets).
 * Can be with or without wings (single or pair).
 * @param {Array<Card>} cards - Selected cards.
 * @returns {object|null} Pattern object or null.
 */
function isAirplane(cards) {
    const counts = getCardValueCounts(cards);
    const uniqueValues = getUniqueSortedValues(cards);

    if (uniqueValues.includes(15) || uniqueValues.includes(16) || uniqueValues.includes(17)) return null; // No 2s or Jokers in the main triplets

    const tripletValues = [];
    const wingCards = [];

    for (const [value, count] of counts.entries()) {
        if (count === 3) {
            tripletValues.push(value);
        } else if (count === 1 || count === 2) {
            // Collect potential wing cards
            for (let i = 0; i < count; i++) {
                wingCards.push(value);
            }
        } else {
            return null; // Invalid count for an airplane
        }
    }

    tripletValues.sort((a, b) => a - b);

    // Check for consecutive triplets
    if (tripletValues.length < 2) return null; // At least two triplets for an airplane
    for (let i = 0; i < tripletValues.length - 1; i++) {
        if (tripletValues[i] + 1 !== tripletValues[i + 1]) {
            return null; // Triplets are not consecutive
        }
    }

    const numTriplets = tripletValues.length;
    const expectedLengthWithoutWings = numTriplets * 3;
    const expectedLengthWithSingleWings = numTriplets * 4;
    const expectedLengthWithPairWings = numTriplets * 5;

    if (cards.length === expectedLengthWithoutWings && wingCards.length === 0) {
        return { type: 'Airplane', value: tripletValues[0], length: cards.length, wings: 'None' };
    } else if (cards.length === expectedLengthWithSingleWings && wingCards.length === numTriplets) {
        // Check if wing cards are all singles
        const wingCounts = getCardValueCounts(wingCards);
        for (const count of wingCounts.values()) {
            if (count > 1) return null; // Wings must be singles
        }
        return { type: 'Airplane + Singles', value: tripletValues[0], length: cards.length, wings: 'Singles' };
    } else if (cards.length === expectedLengthWithPairWings && wingCards.length === numTriplets * 2) {
        // Check if wing cards are all pairs
        const wingCounts = getCardValueCounts(wingCards);
        for (const count of wingCounts.values()) {
            if (count !== 2) return null; // Wings must be pairs
        }
        return { type: 'Airplane + Pairs', value: tripletValues[0], length: cards.length, wings: 'Pairs' };
    }

    return null;
}


/**
 * Attempts to identify the Doudizhu pattern of a given set of cards.
 * @param {Array<Card>} cards - The array of Card objects to analyze.
 * @returns {object|null} An object describing the pattern (type, value, length) or null if no valid pattern.
 */
function getPattern(cards) {
    if (!cards || cards.length === 0) return null;

    // Sort cards by value for easier pattern detection
    cards.sort((a, b) => a.value - b.value);

    console.log("Attempting to get pattern for cards:", cards.map(c => c.toString()));

    // 1. Check for special patterns (Rocket, Bomb) first
    let pattern = isRocket(cards);
    if (pattern) {
        console.log("Pattern identified: Rocket", pattern);
        return pattern;
    }

    pattern = isBomb(cards);
    if (pattern) {
        console.log("Pattern identified: Bomb", pattern);
        return pattern;
    }

    // 2. Check for fixed-size patterns
    pattern = isSingle(cards);
    if (pattern) {
        console.log("Pattern identified: Single", pattern);
        return pattern;
    }

    pattern = isPair(cards);
    if (pattern) {
        console.log("Pattern identified: Pair", pattern);
        return pattern;
    }

    pattern = isTriplet(cards);
    if (pattern) {
        console.log("Pattern identified: Triplet", pattern);
        return pattern;
    }

    pattern = isTripletWithSingle(cards);
    if (pattern) {
        console.log("Pattern identified: Triplet + Single", pattern);
        return pattern;
    }

    pattern = isTripletWithPair(cards);
    if (pattern) {
        console.log("Pattern identified: Triplet + Pair", pattern);
        return pattern;
    }

    // 3. Check for variable-size sequence patterns
    pattern = isStraight(cards);
    if (pattern) {
        console.log("Pattern identified: Straight", pattern);
        return pattern;
    }

    pattern = isPairSequence(cards);
    if (pattern) {
        console.log("Pattern identified: Pair Sequence", pattern);
        return pattern;
    }

    pattern = isAirplane(cards); // This handles Airplane with/without wings
    if (pattern) {
        console.log("Pattern identified: Airplane", pattern);
        return pattern;
    }

    console.log("No valid Doudizhu pattern found for selected cards.");
    return null; // No valid Doudizhu pattern found
}

/**
 * Compares a new pattern against the last played pattern to determine if it's a valid move.
 * @param {object|null} newPattern - The pattern object of the cards being played.
 * @param {object|null} lastPattern - The pattern object of the last played cards.
 * @returns {boolean} True if the new pattern can beat the last pattern or is a valid first play, false otherwise.
 */
function canPlay(newPattern, lastPattern) {
    console.log("Comparing new pattern:", newPattern, "against last pattern:", lastPattern);

    // If no last pattern, any valid new pattern can be played (first play of a round)
    if (!lastPattern) {
        return newPattern !== null;
    }

    // Rocket beats everything (except another Rocket, but there's only one)
    if (newPattern.type === 'Rocket') return true;

    // Bomb beats anything except a Rocket or a bigger Bomb
    if (newPattern.type === 'Bomb') {
        if (lastPattern.type === 'Rocket') return false;
        if (lastPattern.type === 'Bomb') {
            return newPattern.value > lastPattern.value;
        }
        return true; // Bomb beats any non-Bomb/non-Rocket pattern
    }

    // If last pattern was a Rocket or Bomb, and new pattern is not a Rocket/Bomb, new pattern cannot beat it
    if (lastPattern.type === 'Rocket' || lastPattern.type === 'Bomb') {
        return false;
    }

    // For all other patterns, type and length must match, and value must be higher
    if (newPattern.type === lastPattern.type && newPattern.length === lastPattern.length) {
        return newPattern.value > lastPattern.value;
    }

    return false; // Cannot play
}

// Initial setup on page load (optional, but ensures menu is shown)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Attaching event listeners...");

    // Get references to all menu buttons by their new IDs
    const playWarButton = document.getElementById('play-war-button');
    const playBlackjackButton = document.getElementById('play-blackjack-button');
    const viewDeckButton = document.getElementById('view-deck-button');
    const playDoudizhuButton = document.getElementById('play-doudizhu-button');
    const backToMenuButton = document.getElementById('back-button'); // Generic back button

    // Assign event listeners
    if (playWarButton) {
        playWarButton.onclick = startWar;
        console.log("DOMContentLoaded: Attached startWar to play-war-button.");
    } else {
        console.warn("DOMContentLoaded: play-war-button not found.");
    }
    if (playBlackjackButton) {
        playBlackjackButton.onclick = startBlackjack;
        console.log("DOMContentLoaded: Attached startBlackjack to play-blackjack-button.");
    } else {
        console.warn("DOMContentLoaded: play-blackjack-button not found.");
    }
    if (viewDeckButton) {
        viewDeckButton.onclick = showDeckViewer;
        console.log("DOMContentLoaded: Attached showDeckViewer to view-deck-button.");
    } else {
        console.warn("DOMContentLoaded: view-deck-button not found.");
    }
    if (playDoudizhuButton) {
        playDoudizhuButton.onclick = showDoudizhuLobby;
        console.log("DOMContentLoaded: Attached showDoudizhuLobby to play-doudizhu-button.");
    } else {
        console.warn("DOMContentLoaded: play-doudizhu-button not found.");
    }
    // Also ensure the generic back button is set up
    if (backToMenuButton) {
        backToMenuButton.onclick = returnToMenu;
        console.log("DOMContentLoaded: Attached returnToMenu to back-button.");
    } else {
        console.warn("DOMContentLoaded: back-button not found.");
    }

    // Initialize Doudizhu specific buttons (these are within the game screen, not menu)
    // Ensure these are retrieved every time, as they might not be in the DOM initially depending on screen display
    doudizhuPlayButton = document.getElementById('doudizhu-play-button');
    if (doudizhuPlayButton) {
        doudizhuPlayButton.onclick = playDoudizhuCards;
        doudizhuPlayButton.classList.add('doudizhu-action-button');
        console.log("DOMContentLoaded: Attached playDoudizhuCards to doudizhu-play-button.");
    } else {
        console.warn("DOMContentLoaded: doudizhu-play-button not found.");
    }

    doudizhuPassButton = document.getElementById('doudizhu-pass-button');
    if (doudizhuPassButton) {
        doudizhuPassButton.onclick = passDoudizhuTurn;
        doudizhuPassButton.classList.add('doudizhu-action-button');
        console.log("DOMContentLoaded: Attached passDoudizhuTurn to doudizhu-pass-button.");
    } else {
        console.warn("DOMContentLoaded: doudizhu-pass-button not found.");
    }

    doudizhuBiddingButtonsDiv = document.getElementById('doudizhu-bidding-buttons');
    doudizhuCallLandlordButton = document.getElementById('doudizhu-call-landlord-button');
    doudizhuDontCallButton = document.getElementById('doudizhu-dont-call-button');

    if (doudizhuCallLandlordButton) {
        doudizhuCallLandlordButton.onclick = () => handleBid(true);
        console.log("DOMContentLoaded: Attached handleBid(true) to doudizhu-call-landlord-button.");
    } else {
        console.warn("DOMContentLoaded: doudizhu-call-landlord-button not found.");
    }
    if (doudizhuDontCallButton) {
        doudizhuDontCallButton.onclick = () => handleBid(false);
        console.log("DOMContentLoaded: Attached handleBid(false) to doudizhu-dont-call-button.");
    } else {
        console.warn("DOMContentLoaded: doudizhu-dont-call-button not found.");
    }

    // Also ensure the Doudizhu game back button is set up
    const doudizhuGameBackButtonRef = document.getElementById('doudizhu-game-back-button');
    if (doudizhuGameBackButtonRef) {
        doudizhuGameBackButtonRef.onclick = returnToMenu;
        console.log("DOMContentLoaded: Attached returnToMenu to doudizhu-game-back-button.");
    } else {
        console.warn("DOMContentLoaded: doudizhu-game-back-button not found.");
    }
    // And the lobby back button
    const lobbyBackButtonRef = document.getElementById('lobby-back-button');
    if (lobbyBackButtonRef) {
        lobbyBackButtonRef.onclick = returnToMenu;
        console.log("DOMContentLoaded: Attached returnToMenu to lobby-back-button.");
    } else {
        console.warn("DOMContentLoaded: lobby-back-button not found.");
    }

    returnToMenu(); // Ensure menu screen is visible initially
});
