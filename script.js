// script.js

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
}

class Deck {
  constructor(options = {}) {
    const defaultOptions = {
      numDecks: 1,          // For Blackjack: how many standard decks
      includeJokers: false, // For Deck Viewer: whether to include jokers
      gameType: 'war'       // 'war', 'blackjack', 'viewer', 'doudizhu' - influences card values
    };
    // Merge defaults with provided options and store as a property for access in methods
    this.settings = { ...defaultOptions, ...options };
    this.gameType = this.settings.gameType; // Store gameType directly for easier access in sort()

    this.cards = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    let values;
    if (this.gameType === 'blackjack') {
      // Blackjack specific values: J,Q,K are 10; Ace is 11 (to be adjusted later if hand > 21)
      values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
    } else if (this.gameType === 'doudizhu') {
      // Doudizhu values: 3 smallest, 2 largest, then A, K, Q, J, 10...4. Jokers are highest.
      // Here, we assign values for basic sorting: 3=3, 4=4, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15
      values = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // 3 to A, then 2
    } else { // 'war' or 'viewer' - standard card values for comparison, Ace can be 1
      values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1]; // Ace as 1 for sorting/comparison in War/Viewer
    }

    // Create standard cards based on numDecks
    for (let i = 0; i < this.settings.numDecks; i++) {
      for (let suit of suits) {
        for (let j = 0; j < ranks.length; j++) {
          this.cards.push(new Card(suit, ranks[j], values[j]));
        }
      }
    }

    // Optionally include two jokers if specified (primarily for Deck Viewer and Doudizhu)
    if (this.settings.includeJokers) {
      // For Doudizhu, jokers have distinct high values
      if (this.gameType === 'doudizhu') {
        this.cards.push(new Card(null, 'JOKER', 16, 'black')); // Black Joker (Small Joker)
        this.cards.push(new Card(null, 'JOKER', 17, 'red'));   // Red Joker (Big Joker)
      } else {
        // For viewer, jokers have null value for general display
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
      // Specific sorting for Doudizhu: 3 smallest, 2 largest, then A, K, Q, J, 10...4. Jokers are highest.
      // Values are already assigned in constructor (3-15 for 3-2, 16 for Black Joker, 17 for Red Joker)
      if (this.gameType === 'doudizhu') {
        // Sort by value first
        if (a.value !== b.value) {
          return a.value - b.value;
        }
        // Then by suit (standard Doudizhu suit order: clubs < diamonds < hearts < spades)
        const suitOrder = { '♣': 0, '♦': 1, '♥': 2, '♠': 3 };
        return suitOrder[a.suit] - suitOrder[b.suit];
      }

      // Default sorting for other games (War, Viewer)
      // Place jokers at the end, Black Joker before Red Joker if both present
      if (a.rank === 'JOKER' && b.rank !== 'JOKER') return 1;
      if (b.rank === 'JOKER' && a.rank !== 'JOKER') return -1;
      if (a.rank === 'JOKER' && b.rank === 'JOKER') {
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
let gameStatus = 'playing'; // 'playing', 'player_blackjack', 'dealer_blackjack', 'player_bust', 'dealer_bust', 'push', 'player_win', 'dealer_5_card_charlie', 'dealer_blackjack_beats_charlie'

// NEW GLOBAL VARIABLES FOR WIN COUNTERS
let playerWins = 0;
let dealerWins = 0;

// --- Get references to DOM elements once (re-using for all games where applicable) ---
// Elements for War/Blackjack/Deck Viewer
const gameScreen = document.getElementById('game-screen');
const gameTitle = document.getElementById('game-title');
const backButton = document.getElementById('back-button'); // This is the back button on game-screen
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
let doudizhuDeck = null;
let doudizhuPlayerHand = [];
let doudizhuOpponent1Hand = [];
let doudizhuOpponent2Hand = [];
let doudizhuLandlordPile = []; // Stores the 3 landlord cards
let doudizhuPlayedCards = [];
let doudizhuGameState = 'bidding'; // 'bidding', 'playing', 'game_over'
let doudizhuLandlord = null; // Stores the index of the landlord (0: player, 1: opp1, 2: opp2)
let doudizhuBids = []; // Array to store bids during bidding phase
let doudizhuCurrentBidderIndex = 0; // Index of the player currently bidding
let doudizhuLastPlayedPattern = null; // Stores the last played pattern (e.g., {type: 'Pair', value: 10, length: 1})
let doudizhuLastPlayedCards = []; // Stores the actual cards of the last played pattern
let doudizhuCurrentTurn = 0; // 0: player, 1: opp1, 2: opp2

// Variables for Doudizhu turn management
let doudizhuConsecutivePasses = 0; // Counts passes since last valid play
let doudizhuPlayerWhoLastPlayed = null; // Stores index of player who last played (0: player, 1: opp1, 2: opp2)


const doudizhuGameScreen = document.getElementById('doudizhu-game-screen');
const doudizhuGameTitle = document.getElementById('doudizhu-game-title');
const doudizhuPlayerHandDiv = document.getElementById('doudizhu-player-hand');
const doudizhuOpponent1HandDiv = document.getElementById('doudizhu-opponent1-hand');
const doudizhuOpponent2HandDiv = document.getElementById('doudizhu-opponent2-hand');
const doudizhuPlayedCardsDiv = document.getElementById('doudizhu-played-cards');
let doudizhuPlayButton;
let doudizhuPassButton;
const doudizhuResultDiv = document.getElementById('doudizhu-result');
const doudizhuBackButton = document.getElementById('doudizhu-back-button'); // This is the back button on doudizhu-game-screen
const doudizhuCenterLabel = document.getElementById('doudizhu-center-label');
const doudizhuCurrentPatternDiv = document.getElementById('doudizhu-current-pattern');
const doudizhuPatternTextSpan = document.getElementById('doudizhu-pattern-text');

// Doudizhu Bidding Buttons
let doudizhuBiddingButtonsDiv;
let doudizhuCallLandlordButton;
let doudizhuDontCallButton;

// Doudizhu Play Again Button (new)
let doudizhuPlayAgainButton;

// --- Doudizhu Multiplayer specific variables and DOM references (ISOLATED) ---
const doudizhuMultiplayerScreen = document.getElementById('doudizhu-multiplayer-screen');
let createLobbyButton;
let joinLobbyButton;
let lobbyCodeInput;
let lobbyPlayerList;
let startGameButton;
let lobbyStatusMessage;
let currentLobbyCode = null; // The code for the lobby this client is in
let myPlayerId = 'Player-' + Math.random().toString(36).substring(2, 8); // Unique ID for this browser instance
let currentLobbyPlayers = []; // Array of {id: '...', role: '...', isHost: bool}

// BroadcastChannel for inter-tab communication (pseudo-multiplayer)
const lobbyChannel = new BroadcastChannel('doudizhu-lobby');

// --- Helper Functions (general purpose) ---

// Helper function to update the back button's text and action
function updateBackButton(text, handler) {
  // This function now specifically targets the back button on the *currently active* game screen.
  // We need to ensure the correct back button is updated based on the active screen.
  // The HTML has two back buttons: one for game-screen, one for doudizhu-game-screen, one for multiplayer
  // We'll update the one that's currently visible.
  if (gameScreen && gameScreen.style.display === 'block' && backButton) {
    backButton.innerText = text;
    backButton.onclick = handler;
  } else if (doudizhuGameScreen && doudizhuGameScreen.style.display === 'block' && doudizhuBackButton) {
    doudizhuBackButton.innerText = text;
    doudizhuBackButton.onclick = handler;
  } else if (doudizhuMultiplayerScreen && doudizhuMultiplayerScreen.style.display === 'block' && document.getElementById('multiplayer-back-button')) {
    document.getElementById('multiplayer-back-button').innerText = text;
    document.getElementById('multiplayer-back-button').onclick = handler;
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
  playTurnButton.onclick = playWarTurn;
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
  // Check if either player is out of cards
  if (playerDeck.length === 0 || enemyDeck.length === 0) {
    let finalMessage = '';
    if (playerDeck.length > enemyDeck.length) {
      finalMessage = 'Game Over: You win the war!';
    } else if (enemyDeck.length > playerDeck.length) {
      finalMessage = 'Game Over: You lose the war!';
    } else {
      finalMessage = 'Game Over: It\'s a tie!';
    }
    resultDiv.innerText = finalMessage;
    playTurnButton.disabled = true; // Disable button after game ends
    togglePlayerInfo(false); // Hide info on game over
    return;
  }

  const playerCard = playerDeck.shift();
  const enemyCard = enemyDeck.shift();

  // Cards are not clickable during War
  renderHand('player-hand', [playerCard], false);
  renderHand('enemy-hand', [enemyCard], false);

  if (playerCard.value > enemyCard.value) {
    resultDiv.innerText = 'You win this round!';
    playerDeck.push(playerCard, enemyCard); // Player takes both cards
  } else if (enemyCard.value > playerCard.value) {
    resultDiv.innerText = 'You lose this round!';
    enemyDeck.push(enemyCard, playerCard); // Enemy takes both cards
  } else {
    resultDiv.innerText = 'It\'s a tie! Cards returned.';
    playerDeck.push(playerCard); // Cards returned to original owners
    enemyDeck.push(enemyCard);
  }
  updateCardCounts(); // Update counts after each round
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
  if (gameScreen && gameScreen.style.display === 'block' && gameTitle.innerText === 'Deck Viewer') {
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
  if (gameScreen) gameScreen.style.display = 'none'; // Hide generic game screen
  if (doudizhuGameScreen) doudizhuGameScreen.style.display = 'none'; // Hide Doudizhu game screen
  if (doudizhuMultiplayerScreen) doudizhuMultiplayerScreen.style.display = 'none'; // Hide Multiplayer screen

  // Reset game state for a clean return to menu for all games
  playerDeck = [];
  enemyDeck = [];
  currentDeck = null;
  focusedCardIndex = -1;
  if (playTurnButton) playTurnButton.disabled = false;
  if (playTurnButton) playTurnButton.style.display = 'none';

  // Hide specific Blackjack buttons
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Reset Blackjack specific variables (but keep win counters)
  blackjackDeck = null;
  playerHand = [];
  dealerHand = [];
  gameStatus = 'playing';

  // Reset Doudizhu specific variables
  doudizhuDeck = null;
  doudizhuPlayerHand = [];
  doudizhuOpponent1Hand = [];
  doudizhuOpponent2Hand = [];
  doudizhuLandlordPile = []; // Clear landlord pile
  doudizhuPlayedCards = [];
  doudizhuGameState = 'bidding';
  doudizhuLandlord = null;
  doudizhuBids = [];
  doudizhuCurrentBidderIndex = 0;
  doudizhuLastPlayedPattern = null;
  doudizhuLastPlayedCards = [];
  doudizhuCurrentTurn = 0;
  doudizhuConsecutivePasses = 0; // Reset Doudizhu pass counter
  doudizhuPlayerWhoLastPlayed = null; // Reset Doudizhu last player

  // Hide player info divs (used by War/Blackjack)
  togglePlayerInfo(false);

  // Clear hands display for all games
  if (playerHandDiv) playerHandDiv.innerHTML = '';
  if (enemyHandDiv) enemyHandDiv.innerHTML = '';
  if (doudizhuPlayerHandDiv) doudizhuPlayerHandDiv.innerHTML = '';
  if (doudizhuOpponent1HandDiv) doudizhuOpponent1HandDiv.innerHTML = '';
  if (doudizhuOpponent2HandDiv) doudizhuOpponent2HandDiv.innerHTML = '';
  if (doudizhuPlayedCardsDiv) doudizhuPlayedCardsDiv.innerHTML = '';


  // Reset justify-content for hands (used by War/Blackjack/Deck Viewer)
  if (playerHandDiv) playerHandDiv.style.justifyContent = 'flex-start';
  if (enemyHandDiv) enemyHandDiv.style.justifyContent = 'flex-start';

  if (resultDiv) resultDiv.innerText = ''; // Clear result text for generic screen
  if (doudizhuResultDiv) doudizhuResultDiv.innerText = ''; // Clear result text for Doudizhu screen

  // Hide Doudizhu specific buttons and labels
  if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'none';
  if (doudizhuPassButton) doudizhuPassButton.style.display = 'none';
  if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none';
  if (doudizhuCurrentPatternDiv) doudizhuCurrentPatternDiv.style.display = 'none';
  if (doudizhuPlayAgainButton) doudizhuPlayAgainButton.style.display = 'none'; // Hide play again button

  // Ensure Doudizhu play/pass buttons are enabled for next game start
  if (doudizhuPlayButton) doudizhuPlayButton.disabled = false;
  if (doudizhuPassButton) doudizhuPassButton.disabled = false;

  // Reset Multiplayer variables
  currentLobbyCode = null;
  currentLobbyPlayers = [];
  if (lobbyStatusMessage) lobbyStatusMessage.innerText = '';
  if (lobbyPlayerList) lobbyPlayerList.innerHTML = '';
  if (startGameButton) startGameButton.style.display = 'none'; // Hide start game button
}

// Centralized function to show a specific game screen
function showScreen(screenId, title) {
  // Hide all main game screens first
  document.getElementById('menu-screen').style.display = 'none';
  if (gameScreen) gameScreen.style.display = 'none'; // Generic game screen for War/Blackjack/Deck Viewer
  if (doudizhuGameScreen) doudizhuGameScreen.style.display = 'none'; // New Doudizhu screen
  if (doudizhuMultiplayerScreen) doudizhuMultiplayerScreen.style.display = 'none'; // Multiplayer screen


  // Show the requested screen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.style.display = 'block';
  }


  // Set game title based on the screen ID
  if (screenId === 'game-screen' && gameTitle) {
    gameTitle.innerText = title;
  } else if (screenId === 'doudizhu-game-screen' && doudizhuGameTitle) {
    doudizhuGameTitle.innerText = title;
  } else if (screenId === 'doudizhu-multiplayer-screen' && document.getElementById('multiplayer-game-title')) {
    document.getElementById('multiplayer-game-title').innerText = title;
  }

  // Reset common game controls (for War/Blackjack)
  if (playTurnButton) playTurnButton.disabled = false;
  if (playTurnButton) playTurnButton.style.display = 'none'; // Hide by default

  // Hide specific Blackjack buttons
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Hide player info divs (used by War/Blackjack)
  togglePlayerInfo(false);

  // Reset justify-content for hands (used by War/Blackjack/Deck Viewer)
  if (playerHandDiv) playerHandDiv.style.justifyContent = 'flex-start';
  if (enemyHandDiv) enemyHandDiv.style.justifyContent = 'flex-start';

  if (resultDiv) resultDiv.innerText = ''; // Clear result text for generic screen

  // Default back button behavior - will show the appropriate back button
  updateBackButton('Back to Menu', returnToMenu);
}

// --- Doudizhu specific functions (ISOLATED) ---

// Renders a Doudizhu hand
function renderDoudizhuHand(containerId, cards, clickable = false, showFaceUp = true) {
  const container = document.getElementById(containerId);
  if (!container) return; // Add null check for container
  container.innerHTML = '';
  if (!cards || cards.length === 0) return;

  // Sort cards for display in Doudizhu (e.g., by value, then suit)
  // This is a simplified sort; actual Doudizhu sorting is more complex (e.g., by rank, then suit, then specific groups)
  cards.sort((a, b) => {
    // Sort by value (3 smallest, Red Joker largest)
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    // Then by suit (optional, but good for consistency)
    const suitOrder = { '♣': 0, '♦': 1, '♥': 2, '♠': 3 }; // Standard Doudizhu suit order
    return suitOrder[a.suit] - suitOrder[b.suit];
  });


  cards.forEach((card, index) => {
    const img = document.createElement('img');
    img.className = 'card doudizhu-card'; // Add specific class for Doudizhu styling
    img.style.zIndex = index; // For overlapping effect
    img.cardObject = card; // Store the card object on the DOM element for easy retrieval

    if (!showFaceUp) {
      img.src = `assets/cards/card_back.svg`; // Show card back
      img.alt = `Card Back`;
    } else {
      img.src = `assets/cards/${getCardFileName(card)}`;
      img.alt = card.toString();
    }


    if (clickable) {
      img.addEventListener('click', (event) => {
        // Toggle selection for playing cards
        event.target.classList.toggle('selected');
      });
    }
    container.appendChild(img);
  });
}

// Updates the Doudizhu UI (hands, played cards, status)
function updateDoudizhuUI() {
  renderDoudizhuHand('doudizhu-player-hand', doudizhuPlayerHand, true, true); // Player's hand is clickable and face up
  renderDoudizhuHand('doudizhu-opponent1-hand', doudizhuOpponent1Hand, false, false); // Opponents' hands are not clickable and face down
  renderDoudizhuHand('doudizhu-opponent2-hand', doudizhuOpponent2Hand, false, false);

  if (doudizhuGameState === 'bidding') {
    if (doudizhuCenterLabel) doudizhuCenterLabel.innerText = 'Landlord Cards';
    renderDoudizhuHand('doudizhu-played-cards', doudizhuLandlordPile, false, true); // Landlord cards are face up
    if (doudizhuCurrentPatternDiv) doudizhuCurrentPatternDiv.style.display = 'none'; // Hide current pattern during bidding
    if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'none';
    if (doudizhuPassButton) doudizhuPassButton.style.display = 'none';
    if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'flex'; // Show bidding buttons (flex for row layout)
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Player ${doudizhuCurrentBidderIndex === 0 ? 'You' : doudizhuCurrentBidderIndex === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn to bid.`;
  } else if (doudizhuGameState === 'playing') {
    if (doudizhuCenterLabel) doudizhuCenterLabel.innerText = 'Last Played Cards';
    renderDoudizhuHand('doudizhu-played-cards', doudizhuLastPlayedCards, false, true); // Last played cards are face up
    if (doudizhuCurrentPatternDiv) doudizhuCurrentPatternDiv.style.display = 'block'; // Show current pattern
    if (doudizhuPatternTextSpan) doudizhuPatternTextSpan.innerText = doudizhuLastPlayedPattern ? doudizhuLastPlayedPattern.type + (doudizhuLastPlayedPattern.value ? ` (${doudizhuLastPlayedPattern.value})` : '') : 'None';
    
    // Control player action buttons based on current turn
    if (doudizhuCurrentTurn === 0) { // It's the player's turn
      if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'inline-block';
      if (doudizhuPassButton) doudizhuPassButton.style.display = 'inline-block';
      if (doudizhuPlayButton) doudizhuPlayButton.disabled = false; // Ensure enabled
      if (doudizhuPassButton) doudizhuPassButton.disabled = false; // Ensure enabled
    } else { // It's an AI's turn
      if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'none';
      if (doudizhuPassButton) doudizhuPassButton.style.display = 'none';
      if (doudizhuPlayButton) doudizhuPlayButton.disabled = true; // Ensure disabled
      if (doudizhuPassButton) doudizhuPassButton.disabled = true; // Ensure disabled
    }
    if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none'; // Hide bidding buttons
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Landlord: ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'}. Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn!`;
  }
}

function startDoudizhu() {
  showScreen('doudizhu-game-screen', 'Doudizhu'); // Use the new Doudizhu specific screen
  if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Dealing cards and starting bidding...';

  // Initialize Doudizhu specific game state
  doudizhuDeck = new Deck({ numDecks: 1, includeJokers: true, gameType: 'doudizhu' });
  doudizhuDeck.shuffle();

  // Deal 17 cards to each player, 3 to the landlord's pile
  const totalCards = doudizhuDeck.cards.length; // 54 cards
  const numCardsPerPlayer = 17;
  // Ensure the deck has enough cards for this deal
  if (totalCards < (numCardsPerPlayer * 3)) {
    console.error("Not enough cards in deck for Doudizhu deal!");
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = "Error: Not enough cards to start Doudizhu.";
    return;
  }

  doudizhuPlayerHand = [];
  doudizhuOpponent1Hand = [];
  doudizhuOpponent2Hand = [];
  doudizhuLandlordPile = []; // Initialize landlord pile

  for (let i = 0; i < numCardsPerPlayer; i++) {
    doudizhuPlayerHand.push(doudizhuDeck.deal());
    doudizhuOpponent1Hand.push(doudizhuDeck.deal());
    doudizhuOpponent2Hand.push(doudizhuDeck.deal());
  }

  // The remaining cards are the landlord's pile (should be 3)
  while (doudizhuDeck.cards.length > 0) {
    doudizhuLandlordPile.push(doudizhuDeck.deal());
  }

  // Sort player's hand for display
  doudizhuPlayerHand.sort((a, b) => a.value - b.value);

  // Set initial game state
  doudizhuGameState = 'bidding'; // Start with bidding phase
  doudizhuBids = [null, null, null]; // Player, Opponent 1, Opponent 2
  doudizhuCurrentBidderIndex = 0; // Player starts bidding

  // Reset turn tracking variables for a new game
  doudizhuConsecutivePasses = 0;
  doudizhuPlayerWhoLastPlayed = null;
  doudizhuLastPlayedPattern = null;
  doudizhuLastPlayedCards = [];


  // Get references to bidding buttons and set up event listeners
  doudizhuBiddingButtonsDiv = document.getElementById('doudizhu-bidding-buttons');
  doudizhuCallLandlordButton = document.getElementById('doudizhu-call-landlord-button');
  doudizhuDontCallButton = document.getElementById('doudizhu-dont-call-button');

  if (doudizhuCallLandlordButton) {
    doudizhuCallLandlordButton.onclick = () => handleBid(doudizhuCurrentBidderIndex, true);
  }
  if (doudizhuDontCallButton) {
    doudizhuDontCallButton.onclick = () => handleBid(doudizhuCurrentBidderIndex, false);
  }

  // Initialize and set up event listeners for Play and Pass buttons
  doudizhuPlayButton = document.getElementById('doudizhu-play-button');
  if (doudizhuPlayButton) { // Check if the element exists
    doudizhuPlayButton.onclick = playDoudizhuCards;
    doudizhuPlayButton.classList.add('doudizhu-action-button'); // Add styling class
  }

  doudizhuPassButton = document.getElementById('doudizhu-pass-button');
  if (doudizhuPassButton) { // Check if the element exists
    doudizhuPassButton.onclick = passDoudizhuTurn;
    doudizhuPassButton.classList.add('doudizhu-action-button'); // Add styling class
  }

  // Create Doudizhu Play Again button if it doesn't exist
  if (!document.getElementById('doudizhu-play-again-button')) {
    doudizhuPlayAgainButton = document.createElement('button');
    doudizhuPlayAgainButton.id = 'doudizhu-play-again-button';
    doudizhuPlayAgainButton.innerText = 'Play Again';
    doudizhuPlayAgainButton.onclick = startDoudizhu;
    doudizhuPlayAgainButton.classList.add('doudizhu-action-button');
    // Ensure the button is appended to an existing element, e.g., doudizhu-game-area
    const doudizhuGameArea = document.getElementById('doudizhu-game-area');
    if (doudizhuGameArea) {
      doudizhuGameArea.appendChild(doudizhuPlayAgainButton);
    }
  }
  if (doudizhuPlayAgainButton) doudizhuPlayAgainButton.style.display = 'none'; // Hide initially

  // Ensure player's play/pass buttons are disabled at the start of bidding
  if (doudizhuPlayButton) doudizhuPlayButton.disabled = true;
  if (doudizhuPassButton) doudizhuPassButton.disabled = true;

  // Initial UI update
  updateDoudizhuUI();

  // If the first bidder is an AI, trigger their bid
  if (doudizhuCurrentBidderIndex !== 0) {
    setTimeout(() => {
      let aiHand;
      if (doudizhuCurrentBidderIndex === 1) aiHand = doudizhuOpponent1Hand;
      else if (doudizhuCurrentBidderIndex === 2) aiHand = doudizhuOpponent2Hand;
      const aiBidDecision = aiMakeBid(doudizhuCurrentBidderIndex, aiHand);
      handleBid(doudizhuCurrentBidderIndex, aiBidDecision);
    }, 1000); // Small delay for AI bid
  }
}

// Function for AI to make a bid (call landlord or not)
function aiMakeBid(playerIndex, hand) {
  // Simple AI bidding strategy:
  // Call landlord if hand is strong (e.g., has a Bomb, a Rocket, or many high cards/2s)
  // Count 2s and Jokers
  let numTwos = hand.filter(card => card.value === 15).length;
  let numJokers = hand.filter(card => card.rank === 'JOKER').length;

  // Check for bombs
  const counts = getCardValueCounts(hand);
  let hasBomb = false;
  for (const count of counts.values()) {
    if (count === 4) {
      hasBomb = true;
      break;
    }
  }

  // Check for Rocket
  let hasRocket = (numJokers === 2);

  // Bidding threshold
  const strongHandThreshold = 2; // e.g., 2 or more 2s/Jokers, or a Bomb/Rocket

  if (hasRocket || hasBomb || (numTwos + numJokers >= strongHandThreshold)) {
    // AI decides to call landlord
    return true;
  } else {
    // AI decides not to call landlord
    return false;
  }
}

// Handles a bid from a player (true for call, false for don't call)
function handleBid(playerIndex, bid) {
  doudizhuBids[playerIndex] = bid;
  if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Player ${playerIndex === 0 ? 'You' : playerIndex === 1 ? 'Opponent 1' : 'Opponent 2'} ${bid ? 'called' : 'didn\'t call'} landlord.`;

  // Move to next bidder
  doudizhuCurrentBidderIndex = (doudizhuCurrentBidderIndex + 1) % 3;

  let calledLandlordPlayers = doudizhuBids.map((b, i) => b ? i : -1).filter(i => i !== -1);
  let allBidsReceived = doudizhuBids.every(b => b !== null);
  let atLeastOneCalled = calledLandlordPlayers.length > 0;

  if (allBidsReceived || atLeastOneCalled) {
    if (calledLandlordPlayers.length === 0) {
      if (doudizhuResultDiv) doudizhuResultDiv.innerText = "No one called landlord. Restarting game...";
      setTimeout(startDoudizhu, 2000);
    } else if (calledLandlordPlayers.length === 1) {
      doudizhuLandlord = calledLandlordPlayers[0];
      assignLandlordCardsAndStartGame();
    } else {
      // Multiple players called, randomly pick one
      doudizhuLandlord = calledLandlordPlayers[Math.floor(Math.random() * calledLandlordPlayers.length)];
      assignLandlordCardsAndStartGame();
    }
  } else {
    updateDoudizhuUI(); // Update to show next bidder's turn
    // If the next bidder is an AI, trigger their bid
    if (doudizhuCurrentBidderIndex !== 0) { // If not the player
      setTimeout(() => {
        let aiHand;
        if (doudizhuCurrentBidderIndex === 1) aiHand = doudizhuOpponent1Hand;
        else if (doudizhuCurrentBidderIndex === 2) aiHand = doudizhuOpponent2Hand;
        const aiBidDecision = aiMakeBid(doudizhuCurrentBidderIndex, aiHand);
        handleBid(doudizhuCurrentBidderIndex, aiBidDecision);
      }, 1000); // Small delay for AI bid
    }
  }
}

// Assigns landlord cards and transitions to playing phase
function assignLandlordCardsAndStartGame() {
  // Add landlord pile to the chosen landlord's hand
  if (doudizhuLandlord === 0) {
    doudizhuPlayerHand.push(...doudizhuLandlordPile);
    doudizhuPlayerHand.sort((a, b) => a.value - b.value); // Re-sort player's hand
  } else if (doudizhuLandlord === 1) {
    doudizhuOpponent1Hand.push(...doudizhuLandlordPile);
    // Opponent hands are not sorted as they are hidden, but for AI logic, sorting is good practice
    doudizhuOpponent1Hand.sort((a, b) => a.value - b.value);
  } else if (doudizhuLandlord === 2) {
    doudizhuOpponent2Hand.push(...doudizhuLandlordPile);
    // Opponent hands are not sorted as they are hidden, but for AI logic, sorting is good practice
    doudizhuOpponent2Hand.sort((a, b) => a.value - b.value);
  }
  doudizhuLandlordPile = []; // Clear the landlord pile after assignment

  doudizhuGameState = 'playing';
  if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Player ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'} is the Landlord!`;

  // Set initial turn to the landlord
  doudizhuCurrentTurn = doudizhuLandlord;

  // Hide bidding buttons
  if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none';
  // Show play/pass buttons
  if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'inline-block';
  if (doudizhuPassButton) doudizhuPassButton.style.display = 'inline-block';

  updateDoudizhuUI(); // Update UI for playing phase

  // Explicitly enable/disable player buttons based on whose turn it is
  if (doudizhuCurrentTurn === 0) { // Player is landlord
    if (doudizhuPlayButton) doudizhuPlayButton.disabled = false;
    if (doudizhuPassButton) doudizhuPassButton.disabled = false;
    // No need to call nextDoudizhuTurn here, player takes their turn
  } else { // AI is landlord
    if (doudizhuPlayButton) doudizhuPlayButton.disabled = true;
    if (doudizhuPassButton) doudizhuPassButton.disabled = true;
    // Trigger the first AI turn via nextDoudizhuTurn's internal setTimeout
    nextDoudizhuTurn();
  }
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
  const wingCards = []; // Store values of cards that are not part of triplets

  for (const [value, count] of counts.entries()) {
    if (count === 3) {
      tripletValues.push(value);
    } else if (count === 1 || count === 2) {
      // Collect potential wing cards
      for (let i = 0; i < count; i++) {
        wingCards.push(value);
      }
    } else {
      return null; // Invalid count for an airplane (e.g., four-of-a-kind not part of a bomb)
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
    // Check if wing cards are all singles (each value appears once)
    const wingCounts = getCardValueCounts(wingCards);
    for (const count of wingCounts.values()) {
      if (count > 1) return null; // Wings must be singles
    }
    return { type: 'Airplane + Singles', value: tripletValues[0], length: cards.length, wings: 'Singles' };
  } else if (cards.length === expectedLengthWithPairWings && wingCards.length === numTriplets * 2) {
    // Check if wing cards are all pairs (each value appears twice)
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
  let tempPattern = isSingle(cards);
  if (tempPattern) {
    console.log("Pattern identified: Single", tempPattern);
    return tempPattern;
  }

  tempPattern = isPair(cards);
  if (tempPattern) {
    console.log("Pattern identified: Pair", tempPattern);
    return tempPattern;
  }

  tempPattern = isTriplet(cards);
  if (tempPattern) {
    console.log("Pattern identified: Triplet", tempPattern);
    return tempPattern;
  }

  tempPattern = isTripletWithSingle(cards);
  if (tempPattern) {
    console.log("Pattern identified: Triplet + Single", tempPattern);
    return tempPattern;
  }

  tempPattern = isTripletWithPair(cards);
  if (tempPattern) {
    console.log("Pattern identified: Triplet + Pair", tempPattern);
    return tempPattern;
  }

  // 3. Check for variable-size sequence patterns
  tempPattern = isStraight(cards);
  if (tempPattern) {
    console.log("Pattern identified: Straight", tempPattern);
    return tempPattern;
  }

  tempPattern = isPairSequence(cards);
  if (tempPattern) {
    console.log("Pattern identified: Pair Sequence", tempPattern);
    return tempPattern;
  }

  tempPattern = isAirplane(cards); // This handles Airplane with/without wings
  if (tempPattern) {
    console.log("Pattern identified: Airplane", tempPattern);
    return tempPattern;
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
    if (lastPattern.type === 'Rocket') return false; // Rocket beats Bomb
    if (lastPattern.type === 'Bomb') {
      return newPattern.value > lastPattern.value; // Higher Bomb beats lower Bomb
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

// Function to check if any player has won
function checkDoudizhuWinCondition() {
  if (doudizhuPlayerHand.length === 0) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'You played all your cards! You win!';
    doudizhuGameState = 'game_over';
    return true;
  }
  if (doudizhuOpponent1Hand.length === 0) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Opponent 1 played all their cards! Opponent 1 wins!';
    doudizhuGameState = 'game_over';
    return true;
  }
  if (doudizhuOpponent2Hand.length === 0) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Opponent 2 played all their cards! Opponent 2 wins!';
    doudizhuGameState = 'game_over';
    return true;
  }
  return false;
}

// Ends the Doudizhu game and shows relevant buttons
function endDoudizhuGame() {
  doudizhuGameState = 'game_over';
  if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'none';
  if (doudizhuPassButton) doudizhuPassButton.style.display = 'none';
  if (doudizhuPlayAgainButton) doudizhuPlayAgainButton.style.display = 'inline-block'; // Show play again
  updateBackButton('Back to Menu', returnToMenu); // Ensure back button is correct
}


// Placeholder for Doudizhu game logic functions
function playDoudizhuCards() {
  console.log("PlayDoudizhuCards function called."); // Added debug log

  // Get selected cards from the player's hand DOM elements
  const selectedElements = doudizhuPlayerHandDiv.querySelectorAll('.card.selected');
  const selectedCards = Array.from(selectedElements).map(el => el.cardObject);

  console.log("Selected cards (from DOM):", selectedCards.map(c => c.toString()));

  if (selectedCards.length === 0) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Please select cards to play.';
    console.log("No cards selected.");
    return;
  }

  const newPattern = getPattern(selectedCards);

  if (!newPattern) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Invalid card pattern selected!';
    console.log("Invalid pattern detected for selected cards.");
    return;
  }

  // Determine if the play is valid given the last played pattern
  // If it's the first play of a round (lastPlayedCards is empty), any valid pattern is allowed.
  const isFirstPlayInRound = (doudizhuLastPlayedCards.length === 0 || doudizhuLastPlayedPattern === null);
  console.log("Is first play in round:", isFirstPlayInRound);

  // CRITICAL: Ensure Bomb/Rocket can always be played, regardless of pattern type or length match
  let canBeat = false;
  if (newPattern.type === 'Rocket' || newPattern.type === 'Bomb') {
    // Rocket/Bomb can always be played over non-Bomb/non-Rocket patterns
    // Or over a smaller Bomb
    if (!doudizhuLastPlayedPattern || canPlay(newPattern, doudizhuLastPlayedPattern)) {
      canBeat = true;
    }
  } else {
    // For other patterns, normal canPlay rules apply
    if (isFirstPlayInRound || canPlay(newPattern, doudizhuLastPlayedPattern)) {
      canBeat = true;
    }
  }


  if (canBeat) { // Use the canBeat flag here
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `You played: ${newPattern.type}`;
    if (newPattern.type !== 'Rocket' && newPattern.type !== 'Bomb') {
      if (doudizhuResultDiv) doudizhuResultDiv.innerText += ` (Value: ${newPattern.value}).`;
    } else {
      if (doudizhuResultDiv) doudizhuResultDiv.innerText += `.`;
    }
    console.log("Play is valid. Removing cards from hand.");

    // Remove played cards from player's hand
    doudizhuPlayerHand = doudizhuPlayerHand.filter(card => !selectedCards.includes(card));

    // Update last played cards and pattern
    doudizhuLastPlayedCards = selectedCards;
    doudizhuLastPlayedPattern = newPattern;
    doudizhuConsecutivePasses = 0; // Reset consecutive passes after a successful play
    doudizhuPlayerWhoLastPlayed = 0; // Player (index 0) played these cards

    // Deselect cards in UI
    selectedElements.forEach(el => el.classList.remove('selected'));

    // Immediately disable player buttons after a successful play
    if (doudizhuPlayButton) doudizhuPlayButton.disabled = true;
    if (doudizhuPassButton) doudizhuPassButton.disabled = true;

    // Check for win condition (player has no cards left)
    if (checkDoudizhuWinCondition()) {
      endDoudizhuGame();
    } else {
      // Move to next player's turn
      nextDoudizhuTurn();
    }
  } else {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Cannot play that! ${newPattern.type} cannot beat ${doudizhuLastPlayedPattern ? doudizhuLastPlayedPattern.type : 'nothing'}.`;
    console.log("Play is invalid. New pattern:", newPattern, "Last pattern:", doudizhuLastPlayedPattern);
    // Deselect cards if play is invalid
    selectedElements.forEach(el => el.classList.remove('selected'));
  }

  updateDoudizhuUI();
}

function passDoudizhuTurn() {
  console.log("PassDoudizhuTurn function called."); // Added debug log
  if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'You passed your turn.';
  console.log("Player passed turn.");
  // Clear selected cards if any
  const selectedElements = doudizhuPlayerHandDiv.querySelectorAll('.card.selected');
  selectedElements.forEach(el => el.classList.remove('selected'));

  doudizhuConsecutivePasses++; // Increment pass counter

  // Immediately disable player buttons after passing
  if (doudizhuPlayButton) doudizhuPlayButton.disabled = true;
  if (doudizhuPassButton) doudizhuPassButton.disabled = true;

  nextDoudizhuTurn();
  updateDoudizhuUI();
}

/**
 * Advances the turn to the next player.
 * Handles clearing the board if a new round starts (two consecutive passes or turn returns to last player).
 */
function nextDoudizhuTurn() {
  // Determine the next player's index
  doudizhuCurrentTurn = (doudizhuCurrentTurn + 1) % 3;

  console.log(`Current consecutive passes: ${doudizhuConsecutivePasses}`);
  console.log(`Player who last played: ${doudizhuPlayerWhoLastPlayed}`);
  console.log(`Next turn is for player index: ${doudizhuCurrentTurn}`);

  // Check for round end condition:
  // A round ends if two players have passed consecutively, or if the turn cycles back to the player who last played.
  // The condition `doudizhuPlayerWhoLastPlayed !== null && doudizhuCurrentTurn === doudizhuPlayerWhoLastPlayed`
  // means the turn has come back to the player who made the last successful play,
  // implying everyone else has passed.
  if (doudizhuConsecutivePasses >= 2 || (doudizhuPlayerWhoLastPlayed !== null && doudizhuCurrentTurn === doudizhuPlayerWhoLastPlayed)) {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `New round can begin! Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn to start.`;
    doudizhuLastPlayedPattern = null; // Clear the pattern to start a new round
    doudizhuLastPlayedCards = [];
    doudizhuConsecutivePasses = 0; // Reset pass counter
    doudizhuPlayerWhoLastPlayed = null; // Reset
    console.log("Round cleared. New round starting.");
  } else {
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Landlord: ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'}. Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn!`;
  }

  updateDoudizhuUI();

  // If it's an AI opponent's turn, trigger their move
  if (doudizhuGameState === 'playing' && doudizhuCurrentTurn !== 0) { // 0 is player
    // Use a nested setTimeout to ensure AI action and then turn progression
    setTimeout(() => {
      doudizhuOpponentTurn(); // AI takes its action
      // After AI's action, and a short visual delay, then move to the next turn.
      // This ensures the AI's move message is visible before the turn changes.
      if (doudizhuGameState === 'playing') { // Only proceed if game is not over
        setTimeout(nextDoudizhuTurn, 1000); // Delay before next player's turn
      }
    }, 1500); // Initial delay before AI starts thinking/acting
  }
}

// --- Doudizhu Opponent AI Logic ---
function doudizhuOpponentTurn() {
  console.log(`Opponent ${doudizhuCurrentTurn} turn.`);

  // Immediately hide and disable player buttons when AI's turn starts
  if (doudizhuPlayButton) {
    doudizhuPlayButton.style.display = 'none';
    doudizhuPlayButton.disabled = true;
  }
  if (doudizhuPassButton) {
    doudizhuPassButton.style.display = 'none';
    doudizhuPassButton.disabled = true;
  }

  let opponentHand;
  if (doudizhuCurrentTurn === 1) {
    opponentHand = doudizhuOpponent1Hand;
  } else if (doudizhuCurrentTurn === 2) {
    opponentHand = doudizhuOpponent2Hand;
  }

  // Sort opponent's hand for AI logic (even if not rendered face up)
  opponentHand.sort((a, b) => a.value - b.value);

  const possiblePlays = findPossiblePlays(opponentHand, doudizhuLastPlayedPattern);

  if (possiblePlays.length > 0) {
    // For a basic AI, play the first valid pattern found (which will be the "smallest" due to sorting in findPossiblePlays)
    const play = possiblePlays[0];
    console.log(`Opponent ${doudizhuCurrentTurn} plays:`, play.cards.map(c => c.toString()));

    // Remove played cards from opponent's hand
    if (doudizhuCurrentTurn === 1) {
      doudizhuOpponent1Hand = doudizhuOpponent1Hand.filter(card => !play.cards.includes(card));
    } else if (doudizhuCurrentTurn === 2) {
      doudizhuOpponent2Hand = doudizhuOpponent2Hand.filter(card => !play.cards.includes(card));
    }

    doudizhuLastPlayedCards = play.cards;
    doudizhuLastPlayedPattern = play.pattern;
    doudizhuConsecutivePasses = 0;
    doudizhuPlayerWhoLastPlayed = doudizhuCurrentTurn;

    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 1 ? '1' : '2'} played: ${play.pattern.type}`;
    if (play.pattern.type !== 'Rocket' && play.pattern.type !== 'Bomb') {
      if (doudizhuResultDiv) doudizhuResultDiv.innerText += ` (Value: ${play.pattern.value}).`;
    } else {
      if (doudizhuResultDiv) doudizhuResultDiv.innerText += `.`;
    }


    // Check for opponent win
    if (checkDoudizhuWinCondition()) {
      endDoudizhuGame();
    }

  } else {
    console.log(`Opponent ${doudizhuCurrentTurn} passes.`);
    if (doudizhuResultDiv) doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 1 ? '1' : '2'} passed.`;
    doudizhuConsecutivePasses++;
  }

  updateDoudizhuUI();

  // IMPORTANT: Removed the direct call to nextDoudizhuTurn() from here.
  // The turn advancement is now solely managed by the nextDoudizhuTurn function itself,
  // via the nested setTimeout.
}

/**
 * Helper function to get all combinations of a given size from an array.
 * Used for finding wings for airplanes.
 * @param {Array<any>} arr - The array to get combinations from.
 * @param {number} size - The size of combinations.
 * @returns {Array<Array<any>>} An array of combinations.
 */
function getSubsets(arr, size) {
    const result = [];
    function backtrack(current, start) {
        if (current.length === size) {
            result.push(current);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            backtrack(current.concat(arr[i]), i + 1);
        }
    }
    backtrack([], 0);
    return result;
}

/**
 * Finds all valid Doudizhu patterns that can be played from a given hand,
 * optionally beating a last played pattern.
 * The AI will then pick the "best" one (e.g., smallest valid play, or a bomb if it has one).
 * @param {Array<Card>} hand - The hand to find plays from.
 * @param {object|null} lastPattern - The pattern that needs to be beaten.
 * @returns {Array<{pattern: object, cards: Array<Card>}>} An array of possible plays.
 */
function findPossiblePlays(hand, lastPattern) {
  const plays = [];
  hand.sort((a, b) => a.value - b.value);
  const counts = getCardValueCounts(hand);
  const uniqueValues = getUniqueSortedValues(hand); // Values like 3, 4, ..., A, 2, Black Joker, Red Joker

  // 1. Always check for Rocket and Bombs first, as they can beat anything (or higher bombs)
  // Rocket
  const blackJoker = hand.find(c => c.rank === 'JOKER' && c.color === 'black');
  const redJoker = hand.find(c => c.rank === 'JOKER' && c.color === 'red');
  if (blackJoker && redJoker) {
    const rocketCards = [blackJoker, redJoker];
    const pattern = isRocket(rocketCards);
    if (pattern && canPlay(pattern, lastPattern)) {
      plays.push({ pattern: pattern, cards: rocketCards });
    }
  }

  // Bombs
  const bombValues = [];
  for (const [value, count] of counts.entries()) {
    if (count === 4) {
      bombValues.push(value);
    }
  }
  bombValues.sort((a, b) => a - b); // Sort bombs by value

  for (const value of bombValues) {
    const bombCards = hand.filter(card => card.value === value);
    const pattern = isBomb(bombCards);
    if (pattern && canPlay(pattern, lastPattern)) {
      plays.push({ pattern: pattern, cards: bombCards });
    }
  }

  // If a Rocket or Bomb can be played, return it immediately for basic AI priority
  if (plays.some(p => p.pattern.type === 'Rocket')) {
    return plays.filter(p => p.pattern.type === 'Rocket'); // Return only Rocket
  }
  const bombsOnly = plays.filter(p => p.pattern.type === 'Bomb');
  if (bombsOnly.length > 0 && (lastPattern === null || lastPattern.type !== 'Rocket')) {
    // If there are bombs and the last pattern wasn't a rocket, prioritize playing the smallest valid bomb.
    const smallestBeatingBomb = bombsOnly.sort((a, b) => a.pattern.value - b.pattern.value)
      .find(bomb => canPlay(bomb.pattern, lastPattern));
    if (smallestBeatingBomb) {
      return [smallestBeatingBomb];
    }
  }

  // If lastPattern is a Rocket or Bomb, and we haven't found a stronger Rocket/Bomb, we can't play anything else.
  if (lastPattern && (lastPattern.type === 'Rocket' || lastPattern.type === 'Bomb')) {
    return []; // Cannot play anything else
  }

  // 2. Generate other patterns (Singles, Pairs, Triplets, etc.)
  // Iterate through unique values for singles, pairs, triplets, etc.
  for (const val of uniqueValues) {
    const cardsOfValue = hand.filter(card => card.value === val);
    const count = cardsOfValue.length;

    // Single
    if (count >= 1) {
      const pattern = isSingle([cardsOfValue[0]]);
      if (pattern && canPlay(pattern, lastPattern)) {
        plays.push({ pattern: pattern, cards: [cardsOfValue[0]] });
      }
    }
    // Pair
    if (count >= 2) {
      const pattern = isPair(cardsOfValue.slice(0, 2));
      if (pattern && canPlay(pattern, lastPattern)) {
        plays.push({ pattern: pattern, cards: cardsOfValue.slice(0, 2) });
      }
    }
    // Triplet
    if (count >= 3) {
      const pattern = isTriplet(cardsOfValue.slice(0, 3));
      if (pattern && canPlay(pattern, lastPattern)) {
        plays.push({ pattern: pattern, cards: cardsOfValue.slice(0, 3) });
      }
    }
  }

  // Triplet + Single / Triplet + Pair (more complex, requires finding a triplet and then suitable wing)
  const tripletValuesInHand = uniqueValues.filter(val => counts.get(val) >= 3);
  for (const tripletVal of tripletValuesInHand) {
    const tripletCards = hand.filter(c => c.value === tripletVal);
    const remainingCards = hand.filter(c => c.value !== tripletVal); // Cards not part of this triplet

    // Triplet + Single
    if (remainingCards.length >= 1) {
      // Find all possible single wings
      const potentialSingleWings = remainingCards.filter(c => counts.get(c.value) >= 1); // Any card can be a single wing
      for (const singleCard of potentialSingleWings) {
        const combinedCards = tripletCards.concat(singleCard);
        const pattern = isTripletWithSingle(combinedCards);
        if (pattern && canPlay(pattern, lastPattern)) {
          plays.push({ pattern: pattern, cards: combinedCards });
        }
      }
    }

    // Triplet + Pair
    const remainingCounts = getCardValueCounts(remainingCards);
    const pairValuesInRemaining = Array.from(remainingCounts.keys()).filter(val => remainingCounts.get(val) >= 2);
    if (pairValuesInRemaining.length >= 1) {
      for (const pairVal of pairValuesInRemaining) {
        const pairCards = remainingCards.filter(c => c.value === pairVal).slice(0, 2);
        const combinedCards = tripletCards.concat(pairCards);
        const pattern = isTripletWithPair(combinedCards);
        if (pattern && canPlay(pattern, lastPattern)) {
          plays.push({ pattern: pattern, cards: combinedCards });
        }
      }
    }
  }


  // Straights
  // Iterate through possible starting values for straights (3 to A, excluding 2s and Jokers)
  for (let startVal = 3; startVal <= 14; startVal++) { // 3 to Ace (value 14)
    for (let length = 5; length <= 12; length++) { // Straight length 5 to 12
      const potentialStraightCards = [];
      let hasAllCards = true;
      for (let i = 0; i < length; i++) {
        const currentVal = startVal + i;
        // Check if value is within bounds (3-Ace) and if we have at least one card of that value
        if (currentVal > 14 || counts.get(currentVal) === undefined || counts.get(currentVal) === 0) {
          hasAllCards = false;
          break;
        }
        // Take one card of the current value
        potentialStraightCards.push(hand.find(c => c.value === currentVal));
      }
      if (hasAllCards && potentialStraightCards.length === length) { // Ensure correct length
        const pattern = isStraight(potentialStraightCards);
        if (pattern && canPlay(pattern, lastPattern)) {
          plays.push({ pattern: pattern, cards: potentialStraightCards });
        }
      }
    }
  }

  // Pair Sequences
  for (let startVal = 3; startVal <= 14; startVal++) { // 3 to Ace
    for (let length = 3; length <= 10; length++) { // 3 pairs (6 cards) to 10 pairs (20 cards)
      const potentialPairSequenceCards = [];
      let hasAllPairs = true;
      for (let i = 0; i < length; i++) {
        const currentVal = startVal + i;
        // Check if value is within bounds (3-Ace) and if we have at least two cards of that value
        if (currentVal > 14 || counts.get(currentVal) === undefined || counts.get(currentVal) < 2) {
          hasAllPairs = false;
          break;
        }
        // Take two cards of the current value
        potentialPairSequenceCards.push(...hand.filter(c => c.value === currentVal).slice(0, 2));
      }
      if (hasAllPairs && potentialPairSequenceCards.length === length * 2) { // Ensure correct length
        const pattern = isPairSequence(potentialPairSequenceCards);
        if (pattern && canPlay(pattern, lastPattern)) {
          plays.push({ pattern: pattern, cards: potentialPairSequenceCards });
        }
      }
    }
  }

  // Airplanes (consecutive triplets)
  // Find all triplets in hand first
  const allTripletsInHand = [];
  for (const val of uniqueValues) {
    if (counts.get(val) >= 3 && val <= 14) { // Exclude 2s and Jokers for main triplets
      allTripletsInHand.push(hand.filter(c => c.value === val).slice(0, 3));
    }
  }

  if (allTripletsInHand.length >= 2) {
    allTripletsInHand.sort((a, b) => a[0].value - b[0].value); // Sort by value of the triplet

    // Iterate to find consecutive triplets for the airplane body
    for (let i = 0; i < allTripletsInHand.length - 1; i++) {
      const firstTriplet = allTripletsInHand[i];
      const secondTriplet = allTripletsInHand[i + 1];

      if (firstTriplet[0].value + 1 === secondTriplet[0].value) {
        // Found a consecutive pair of triplets (base for 2-triplet airplane)
        const baseAirplaneCards = firstTriplet.concat(secondTriplet);

        // Try without wings (e.g., 6 cards for 2 triplets)
        let pattern = isAirplane(baseAirplaneCards);
        if (pattern && canPlay(pattern, lastPattern)) {
          plays.push({ pattern: pattern, cards: baseAirplaneCards });
        }

        // Collect remaining cards for potential wings
        const remainingCardsForWings = hand.filter(c => !baseAirplaneCards.includes(c));

        // Try with singles as wings (need 2 singles for 2 triplets)
        if (remainingCardsForWings.length >= 2) {
          const singleCardsForWings = remainingCardsForWings.filter(c => counts.get(c.value) >= 1); // Any card can be a single wing
          const singleCombinations = getSubsets(singleCardsForWings, 2); // Get all combinations of 2 singles
          for (const singles of singleCombinations) {
            const combinedCards = baseAirplaneCards.concat(singles);
            pattern = isAirplane(combinedCards);
            if (pattern && canPlay(pattern, lastPattern)) {
              plays.push({ pattern: pattern, cards: combinedCards });
            }
          }
        }

        // Try with pairs as wings (need 2 pairs for 2 triplets)
        const pairCardsForWings = [];
        const tempCountsForWings = getCardValueCounts(remainingCardsForWings);
        for (const val of Array.from(tempCountsForWings.keys())) {
          if (tempCountsForWings.get(val) >= 2) {
            pairCardsForWings.push(remainingCardsForWings.filter(c => c.value === val).slice(0, 2));
          }
        }
        if (pairCardsForWings.length >= 2) {
          const pairCombinations = getSubsets(pairCardsForWings, 2); // Get all combinations of 2 pairs
          for (const pairs of pairCombinations) {
            const combinedCards = baseAirplaneCards.concat(...pairs); // Flatten pairs array
            pattern = isAirplane(combinedCards);
            if (pattern && canPlay(pattern, lastPattern)) {
              plays.push({ pattern: pattern, cards: combinedCards });
            }
          }
        }
      }
    }
    // TODO: Extend for airplanes with more than 2 consecutive triplets (e.g., 3-triplet airplane)
    // This would require more complex iteration over allTripletsInHand to find longer sequences.
  }


  // Sort all found valid plays for AI decision making:
  // Prioritize by pattern type (Rocket > Bomb > Airplane > Pair Sequence > Straight > Triplet+Pair > Triplet+Single > Triplet > Pair > Single)
  // Then by length (shorter first for sequences if types are same)
  // Then by value (lowest value first)
  plays.sort((a, b) => {
    const typeOrder = {
      'Rocket': 10,
      'Bomb': 9,
      'Airplane': 8,
      'Airplane + Singles': 7,
      'Airplane + Pairs': 6,
      'Pair Sequence': 5,
      'Straight': 4,
      'Triplet + Pair': 3,
      'Triplet + Single': 2,
      'Triplet': 1,
      'Pair': 0.5, // Slightly lower than triplet
      'Single': 0
    };

    // Primary sort: by pattern type (highest priority first)
    if (typeOrder[a.pattern.type] !== typeOrder[b.pattern.type]) {
      return typeOrder[b.pattern.type] - typeOrder[a.pattern.type]; // Descending order for type priority
    }

    // Secondary sort: by length (ascending for same type)
    if (a.pattern.length !== b.pattern.length) {
      return a.pattern.length - b.pattern.length;
    }

    // Tertiary sort: by value (ascending for same type and length)
    return a.pattern.value - b.pattern.value;
  });

  return plays;
}

// --- Doudizhu Multiplayer Functions ---

function showDoudizhuMultiplayer() {
  showScreen('doudizhu-multiplayer-screen', 'Doudizhu Multiplayer');
  updateBackButton('Back to Menu', returnToMenu);

  // Get references to multiplayer buttons
  createLobbyButton = document.getElementById('create-lobby-button');
  joinLobbyButton = document.getElementById('join-lobby-button');
  lobbyCodeInput = document.getElementById('lobby-code-input');
  lobbyPlayerList = document.getElementById('lobby-player-list');
  startGameButton = document.getElementById('start-game-button');
  lobbyStatusMessage = document.getElementById('lobby-status-message');
  const lobbyControls = document.getElementById('lobby-controls');
  const lobbyView = document.getElementById('lobby-view');

  // Set up event listeners for multiplayer buttons
  if (createLobbyButton) createLobbyButton.onclick = createLobby;
  if (joinLobbyButton) joinLobbyButton.onclick = joinLobby;
  if (startGameButton) startGameButton.onclick = startMultiplayerDoudizhu;


  // Initial state for multiplayer screen
  if (lobbyControls) lobbyControls.style.display = 'flex';
  if (lobbyView) lobbyView.style.display = 'none';
  if (startGameButton) startGameButton.style.display = 'none';
  if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Create or Join a Lobby';
  if (lobbyCodeInput) lobbyCodeInput.value = '';
  if (lobbyPlayerList) lobbyPlayerList.innerHTML = '';

  // Listen for messages from other tabs/windows
  lobbyChannel.onmessage = handleLobbyMessage;

  // Attempt to re-join a lobby if one was active in localStorage
  const storedLobby = localStorage.getItem('doudizhuLobby');
  if (storedLobby) {
      const lobby = JSON.parse(storedLobby);
      if (lobby.code && lobby.players && lobby.players.some(p => p.id === myPlayerId)) {
          // If this player is part of a stored lobby, rejoin it
          currentLobbyCode = lobby.code;
          currentLobbyPlayers = lobby.players;
          updateLobbyUI();
          if (lobbyControls) lobbyControls.style.display = 'none';
          if (lobbyView) lobbyView.style.display = 'block';
          if (lobbyStatusMessage) lobbyStatusMessage.innerText = `Joined Lobby: ${currentLobbyCode}`;
      }
  }
}

function generateLobbyCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 character code
}

function createLobby() {
  currentLobbyCode = generateLobbyCode();
  currentLobbyPlayers = [{ id: myPlayerId, name: 'Player 1 (Host)', isHost: true }];
  updateLobbyLocalStorage();
  lobbyChannel.postMessage({ type: 'lobbyCreated', code: currentLobbyCode, players: currentLobbyPlayers });
  updateLobbyUI();
  if (document.getElementById('lobby-controls')) document.getElementById('lobby-controls').style.display = 'none';
  if (document.getElementById('lobby-view')) document.getElementById('lobby-view').style.display = 'block';
  if (lobbyStatusMessage) lobbyStatusMessage.innerText = `Lobby created! Code: ${currentLobbyCode}. Share this with other players (open new tabs).`;
  console.log(`Lobby created: ${currentLobbyCode}`);
}

function joinLobby() {
  const code = lobbyCodeInput.value.trim().toUpperCase();
  if (!code) {
    if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Please enter a lobby code.';
    return;
  }

  const storedLobby = localStorage.getItem('doudizhuLobby');
  if (storedLobby) {
    const lobby = JSON.parse(storedLobby);
    if (lobby.code === code) {
        if (lobby.players.length >= 3) {
            if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Lobby is full!';
            return;
        }
        if (lobby.players.some(p => p.id === myPlayerId)) {
            if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'You are already in this lobby.';
            currentLobbyCode = code;
            currentLobbyPlayers = lobby.players;
            updateLobbyUI();
            if (document.getElementById('lobby-controls')) document.getElementById('lobby-controls').style.display = 'none';
            if (document.getElementById('lobby-view')) document.getElementById('lobby-view').style.display = 'block';
            return;
        }

        currentLobbyCode = code;
        currentLobbyPlayers = lobby.players;
        currentLobbyPlayers.push({ id: myPlayerId, name: `Player ${currentLobbyPlayers.length + 1}`, isHost: false });
        updateLobbyLocalStorage();
        lobbyChannel.postMessage({ type: 'playerJoined', code: currentLobbyCode, players: currentLobbyPlayers });
        updateLobbyUI();
        if (document.getElementById('lobby-controls')) document.getElementById('lobby-controls').style.display = 'none';
        if (document.getElementById('lobby-view')) document.getElementById('lobby-view').style.display = 'block';
        if (lobbyStatusMessage) lobbyStatusMessage.innerText = `Joined Lobby: ${currentLobbyCode}`;
        console.log(`Joined lobby: ${currentLobbyCode}`);
    } else {
      if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Invalid lobby code or lobby does not exist.';
      console.log('Invalid lobby code.');
    }
  } else {
    if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'No lobby found with that code.';
    console.log('No lobby found.');
  }
}

function updateLobbyUI() {
  if (lobbyPlayerList) {
    lobbyPlayerList.innerHTML = '';
    currentLobbyPlayers.forEach(player => {
      const li = document.createElement('li');
      li.innerText = `${player.name} (${player.id.substring(0,6)}) ${player.isHost ? '(Host)' : ''}`;
      lobbyPlayerList.appendChild(li);
    });
  }

  // Enable Start Game button only if 3 players are in the lobby and this client is the host
  const isHost = currentLobbyPlayers.find(p => p.id === myPlayerId && p.isHost);
  if (startGameButton) {
    if (isHost && currentLobbyPlayers.length === 3) {
      startGameButton.style.display = 'inline-block';
      startGameButton.disabled = false;
      if (lobbyStatusMessage) lobbyStatusMessage.innerText = `Lobby ${currentLobbyCode}: ${currentLobbyPlayers.length}/3 players. Ready to start!`;
    } else {
      startGameButton.style.display = 'none';
      startGameButton.disabled = true;
      if (currentLobbyCode) {
         if (lobbyStatusMessage) lobbyStatusMessage.innerText = `Lobby ${currentLobbyCode}: ${currentLobbyPlayers.length}/3 players. Waiting for players...`;
      }
    }
  }
}

function updateLobbyLocalStorage() {
  localStorage.setItem('doudizhuLobby', JSON.stringify({ code: currentLobbyCode, players: currentLobbyPlayers }));
}

function handleLobbyMessage(event) {
    const data = event.data;
    if (data.type === 'lobbyCreated' || data.type === 'playerJoined' || data.type === 'playerLeft') {
        // Only update if the message is for the lobby we are currently in or trying to join
        if (currentLobbyCode === data.code || (!currentLobbyCode && data.type === 'lobbyCreated')) {
            currentLobbyCode = data.code;
            currentLobbyPlayers = data.players;
            updateLobbyUI();

            // If a game starts, transition all tabs
            if (data.type === 'gameStarted') {
                startDoudizhuMultiplayerGame(data.playerOrder, data.landlordIndex);
            }
        }
    } else if (data.type === 'gameStarted' && currentLobbyCode === data.code) {
        startDoudizhuMultiplayerGame(data.playerOrder, data.landlordIndex);
    } else if (data.type === 'lobbyCleared') {
        // If the host leaves or game ends, clear lobby data
        if (currentLobbyCode === data.code) {
            currentLobbyCode = null;
            currentLobbyPlayers = [];
            localStorage.removeItem('doudizhuLobby');
            if (document.getElementById('lobby-controls')) document.getElementById('lobby-controls').style.display = 'flex';
            if (document.getElementById('lobby-view')) document.getElementById('lobby-view').style.display = 'none';
            if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Lobby closed or game ended. Create or Join a Lobby.';
        }
    }
}

// Ensure that when a tab closes, it tries to remove itself from the lobby
window.addEventListener('beforeunload', () => {
    if (currentLobbyCode && myPlayerId) {
        const storedLobby = localStorage.getItem('doudizhuLobby');
        if (storedLobby) {
            let lobby = JSON.parse(storedLobby);
            lobby.players = lobby.players.filter(p => p.id !== myPlayerId);
            if (lobby.players.length === 0) {
                localStorage.removeItem('doudizhuLobby');
                lobbyChannel.postMessage({ type: 'lobbyCleared', code: lobby.code });
            } else {
                localStorage.setItem('doudizhuLobby', JSON.stringify(lobby));
                lobbyChannel.postMessage({ type: 'playerLeft', code: lobby.code, players: lobby.players });
            }
        }
    }
});

function startMultiplayerDoudizhu() {
    if (currentLobbyPlayers.length !== 3) {
        if (lobbyStatusMessage) lobbyStatusMessage.innerText = 'Need 3 players to start the game!';
        return;
    }

    // Determine random player order
    const playerOrder = shuffleArray([...currentLobbyPlayers.map(p => p.id)]);
    const landlordIndex = Math.floor(Math.random() * 3); // Randomly choose initial landlord

    // Broadcast that the game has started
    lobbyChannel.postMessage({
        type: 'gameStarted',
        code: currentLobbyCode,
        playerOrder: playerOrder,
        landlordIndex: landlordIndex
    });

    // Start the game in this tab
    startDoudizhuGameInstance(playerOrder, landlordIndex);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


// This function is called by all clients in the lobby when game starts
function startDoudizhuGameInstance(playerOrder, initialLandlordIndex) {
    showScreen('doudizhu-game-screen', 'Doudizhu Online');

    // Assign player roles and IDs for the game instance
    let myPlayerIndex = playerOrder.indexOf(myPlayerId);
    if (myPlayerIndex === -1) {
        console.error("My player ID not found in the game order. This should not happen.");
        // Fallback to single player if something went wrong
        startDoudizhu();
        return;
    }

    // For Doudizhu, there are 3 players. We'll map them based on playerOrder
    // Player 0: This client (myPlayerId)
    // Player 1: The next player in the order
    // Player 2: The player after that
    // This simplifies the Doudizhu game logic, even though it's still local simulation.
    // In a real multiplayer game, this would be handled by the server.

    // Reset single player Doudizhu specific variables (important to ensure clean slate)
    doudizhuDeck = null;
    doudizhuPlayerHand = [];
    doudizhuOpponent1Hand = [];
    doudizhuOpponent2Hand = [];
    doudizhuLandlordPile = [];
    doudizhuPlayedCards = [];
    doudizhuGameState = 'playing'; // Starts directly in playing state
    doudizhuLandlord = initialLandlordIndex; // Set landlord based on broadcasted info
    doudizhuBids = [];
    doudizhuCurrentBidderIndex = 0; // Not used in playing phase, handled by doudizhuCurrentTurn
    doudizhuLastPlayedPattern = null;
    doudizhuLastPlayedCards = [];
    doudizhuCurrentTurn = 0; // The first player in playerOrder starts
    doudizhuConsecutivePasses = 0;
    doudizhuPlayerWhoLastPlayed = null;

    if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'Dealing cards...';

    // Initialize Doudizhu specific game state for multiplayer
    const deck = new Deck({ numDecks: 1, includeJokers: true, gameType: 'doudizhu' });
    deck.shuffle();

    const allCards = [...deck.cards]; // Get all cards from the deck
    const numCardsPerPlayer = 17;

    // Distribute cards for 3 players
    const hands = [[], [], []]; // Player 0, Player 1, Player 2
    for (let i = 0; i < numCardsPerPlayer; i++) {
        hands[0].push(allCards.shift());
        hands[1].push(allCards.shift());
        hands[2].push(allCards.shift());
    }
    doudizhuLandlordPile = allCards; // Remaining 3 cards are landlord pile

    // Assign hands based on player order (myPlayerId will be playerHand)
    doudizhuPlayerHand = hands[playerOrder.indexOf(myPlayerId)];
    doudizhuOpponent1Hand = hands[playerOrder.filter(id => id !== myPlayerId)[0]];
    doudizhuOpponent2Hand = hands[playerOrder.filter(id => id !== myPlayerId)[1]];

    // Sort player's hand for display
    doudizhuPlayerHand.sort((a, b) => a.value - b.value);
    doudizhuOpponent1Hand.sort((a, b) => a.value - b.value); // Sort for AI logic
    doudizhuOpponent2Hand.sort((a, b) => a.value - b.value); // Sort for AI logic


    // Add landlord pile to the chosen landlord's hand
    const landlordId = playerOrder[doudizhuLandlord];
    if (landlordId === myPlayerId) {
        doudizhuPlayerHand.push(...doudizhuLandlordPile);
        doudizhuPlayerHand.sort((a, b) => a.value - b.value);
    } else if (landlordId === playerOrder.filter(id => id !== myPlayerId)[0]) {
        doudizhuOpponent1Hand.push(...doudizhuLandlordPile);
        doudizhuOpponent1Hand.sort((a, b) => a.value - b.value);
    } else { // landlordId === playerOrder.filter(id => id !== myPlayerId)[1]
        doudizhuOpponent2Hand.push(...doudizhuLandlordPile);
        doudizhuOpponent2Hand.sort((a, b) => a.value - b.value);
    }
    doudizhuLandlordPile = []; // Clear the landlord pile

    // Map the global doudizhuCurrentTurn (0, 1, 2) to the actual player IDs
    // and back again for decision making.
    // For now, we assume doudizhuCurrentTurn (0,1,2) maps to Player (0), Opponent1 (1), Opponent2 (2)
    // based on their position in the shuffled `playerOrder`.

    // Set initial turn to the actual landlord's index in the `playerOrder` array
    doudizhuCurrentTurn = doudizhuLandlord;


    // Hide bidding buttons (already hidden by showScreen for a playing state)
    if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none';
    // Show play/pass buttons (will be hidden by updateDoudizhuUI for AI turns)
    if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'inline-block';
    if (doudizhuPassButton) doudizhuPassButton.style.display = 'inline-block';

    updateDoudizhuUI(); // Initial UI update for playing phase

    // Check whose turn it is globally and initiate the play
    if (playerOrder[doudizhuCurrentTurn] === myPlayerId) {
        // It's this client's turn (player 0)
        if (doudizhuPlayButton) doudizhuPlayButton.disabled = false;
        if (doudizhuPassButton) doudizhuPassButton.disabled = false;
        if (doudizhuResultDiv) doudizhuResultDiv.innerText = 'It\'s your turn to play!';
    } else {
        // It's an AI opponent's turn (simulate for other tabs)
        if (doudizhuPlayButton) doudizhuPlayButton.disabled = true;
        if (doudizhuPassButton) doudizhuPassButton.disabled = true;
        nextDoudizhuTurn(); // This will trigger AI logic with delays
    }
}


// Initial setup on page load (ensures menu is shown)
document.addEventListener('DOMContentLoaded', () => {
  returnToMenu(); // Ensure menu screen is visible initially
});
