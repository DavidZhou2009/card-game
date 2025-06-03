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

// New variables for Doudizhu turn management
let doudizhuConsecutivePasses = 0; // Counts passes since last valid play
let doudizhuPlayerWhoLastPlayed = null; // Stores index of player who last played (0: player, 1: opp1, 2: opp2)


const doudizhuGameScreen = document.getElementById('doudizhu-game-screen');
const doudizhuGameTitle = document.getElementById('doudizhu-game-title');
const doudizhuPlayerHandDiv = document.getElementById('doudizhu-player-hand');
const doudizhuOpponent1HandDiv = document.getElementById('doudizhu-opponent1-hand');
const doudizhuOpponent2HandDiv = document.getElementById('doudizhu-opponent2-hand');
const doudizhuPlayedCardsDiv = document.getElementById('doudizhu-played-cards');
// These were missing their `onclick` assignments
let doudizhuPlayButton; // Changed to `let` for assignment in startDoudizhu
let doudizhuPassButton; // Changed to `let` for assignment in startDoudizhu
const doudizhuResultDiv = document.getElementById('doudizhu-result');
const doudizhuBackButton = document.getElementById('doudizhu-back-button');
const doudizhuCenterLabel = document.getElementById('doudizhu-center-label');
const doudizhuCurrentPatternDiv = document.getElementById('doudizhu-current-pattern');
const doudizhuPatternTextSpan = document.getElementById('doudizhu-pattern-text');

// Doudizhu Bidding Buttons
let doudizhuBiddingButtonsDiv;
let doudizhuCallLandlordButton;
let doudizhuDontCallButton;


// --- Helper Functions (general purpose) ---

// Helper function to update the back button's text and action
function updateBackButton(text, handler) {
  // This function now specifically targets the back button on the *currently active* game screen.
  // We need to ensure the correct back button is updated based on the active screen.
  // For now, we'll assume only one main back button is visible at a time.
  // The HTML has two back buttons: one for game-screen, one for doudizhu-game-screen.
  // We'll update the one that's currently visible.
  if (gameScreen.style.display === 'block' && backButton) {
    backButton.innerText = text;
    backButton.onclick = handler;
  } else if (doudizhuGameScreen.style.display === 'block' && doudizhuBackButton) {
    doudizhuBackButton.innerText = text;
    doudizhuBackButton.onclick = handler;
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

  // Reset game state for a clean return to menu for all games
  playerDeck = [];
  enemyDeck = [];
  currentDeck = null;
  focusedCardIndex = -1;
  playTurnButton.disabled = false;
  playTurnButton.style.display = 'none';

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
}

// Centralized function to show a specific game screen
function showScreen(screenId, title) {
  // Hide all main game screens first
  document.getElementById('menu-screen').style.display = 'none';
  gameScreen.style.display = 'none'; // Generic game screen for War/Blackjack/Deck Viewer
  doudizhuGameScreen.style.display = 'none'; // New Doudizhu screen

  // Show the requested screen
  document.getElementById(screenId).style.display = 'block';

  // Set game title based on the screen ID
  if (screenId === 'game-screen') {
    gameTitle.innerText = title;
  } else if (screenId === 'doudizhu-game-screen') {
    doudizhuGameTitle.innerText = title;
  }

  // Reset common game controls (for War/Blackjack)
  playTurnButton.disabled = false;
  playTurnButton.style.display = 'none'; // Hide by default

  // Hide specific Blackjack buttons
  if (hitButton) hitButton.style.display = 'none';
  if (standButton) standButton.style.display = 'none';

  // Hide player info divs (used by War/Blackjack)
  togglePlayerInfo(false);

  // Reset justify-content for hands (used by War/Blackjack/Deck Viewer)
  playerHandDiv.style.justifyContent = 'flex-start';
  enemyHandDiv.style.justifyContent = 'flex-start';

  // Clear result text for generic screen
  resultDiv.innerText = '';

  // Default back button behavior
  updateBackButton('Back to Menu', returnToMenu);
}

// --- Doudizhu specific functions (ISOLATED) ---

// Renders a Doudizhu hand
function renderDoudizhuHand(containerId, cards, clickable = false, showFaceUp = true) {
  const container = document.getElementById(containerId);
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
    doudizhuCenterLabel.innerText = 'Landlord Cards';
    renderDoudizhuHand('doudizhu-played-cards', doudizhuLandlordPile, false, true); // Landlord cards are face up
    doudizhuCurrentPatternDiv.style.display = 'none'; // Hide current pattern during bidding
    doudizhuPlayButton.style.display = 'none';
    doudizhuPassButton.style.display = 'none';
    doudizhuBiddingButtonsDiv.style.display = 'flex'; // Show bidding buttons (flex for row layout)
    doudizhuResultDiv.innerText = `Player ${doudizhuCurrentBidderIndex === 0 ? 'You' : doudizhuCurrentBidderIndex === 1 ? 'Opponent 1' : 'Opponent 2'} to bid.`;
  } else if (doudizhuGameState === 'playing') {
    doudizhuCenterLabel.innerText = 'Last Played Cards';
    renderDoudizhuHand('doudizhu-played-cards', doudizhuLastPlayedCards, false, true); // Last played cards are face up
    doudizhuCurrentPatternDiv.style.display = 'block'; // Show current pattern
    doudizhuPatternTextSpan.innerText = doudizhuLastPlayedPattern ? doudizhuLastPlayedPattern.type + (doudizhuLastPlayedPattern.value ? ` (${doudizhuLastPlayedPattern.value})` : '') : 'None';
    doudizhuPlayButton.style.display = 'inline-block';
    doudizhuPassButton.style.display = 'inline-block';
    doudizhuBiddingButtonsDiv.style.display = 'none'; // Hide bidding buttons
    doudizhuResultDiv.innerText = `Landlord: ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'}. Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn!`;
  }
}

function startDoudizhu() {
  showScreen('doudizhu-game-screen', 'Doudizhu'); // Use the new Doudizhu specific screen
  doudizhuResultDiv.innerText = 'Doudizhu game logic is not yet implemented. Dealing cards...';

  // Initialize Doudizhu specific game state
  doudizhuDeck = new Deck({ numDecks: 1, includeJokers: true, gameType: 'doudizhu' });
  doudizhuDeck.shuffle();

  // Deal 17 cards to each player, 3 to the landlord's pile
  const totalCards = doudizhuDeck.cards.length; // 54 cards
  const numCardsPerPlayer = 17;
  // Ensure the deck has enough cards for this deal
  if (totalCards < (numCardsPerPlayer * 3)) {
    console.error("Not enough cards in deck for Doudizhu deal!");
    doudizhuResultDiv.innerText = "Error: Not enough cards to start Doudizhu.";
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


  // Initial UI update
  updateDoudizhuUI();

  // The back button for Doudizhu is already handled by showScreen and returnToMenu
  doudizhuBackButton.onclick = returnToMenu;
}

// Handles a bid from a player (true for call, false for don't call)
function handleBid(playerIndex, bid) {
  doudizhuBids[playerIndex] = bid;
  doudizhuResultDiv.innerText = `Player ${playerIndex === 0 ? 'You' : playerIndex === 1 ? 'Opponent 1' : 'Opponent 2'} ${bid ? 'called' : 'didn\'t call'} landlord.`;

  // Move to next bidder
  doudizhuCurrentBidderIndex = (doudizhuCurrentBidderIndex + 1) % 3;

  // Simple bidding logic: first one to call landlord wins, or random if all call
  let calledLandlordPlayers = doudizhuBids.map((b, i) => b ? i : -1).filter(i => i !== -1);

  // Check if bidding is complete (all players have bid, or someone has called and others passed)
  // This simplified logic assumes a single round of bidding.
  // A more complex system would allow higher bids, etc.
  let allBidsReceived = doudizhuBids.every(b => b !== null);
  let atLeastOneCalled = calledLandlordPlayers.length > 0;

  if (allBidsReceived || atLeastOneCalled) { // If all have bid, or someone has called
    if (calledLandlordPlayers.length === 0) {
      // Everyone passed, restart game or handle no landlord scenario
      doudizhuResultDiv.innerText = "No one called landlord. Restarting game...";
      setTimeout(startDoudizhu, 2000); // Restart after a short delay
    } else if (calledLandlordPlayers.length === 1) {
      doudizhuLandlord = calledLandlordPlayers[0];
      assignLandlordCardsAndStartGame();
    } else {
      // Multiple players called, randomly pick one
      doudizhuLandlord = calledLandlordPlayers[Math.floor(Math.random() * calledLandlordPlayers.length)];
      assignLandlordCardsAndStartGame();
    }
  } else {
    // Continue bidding
    updateDoudizhuUI(); // Update to show next bidder's turn
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
  doudizhuResultDiv.innerText = `Player ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'} is the Landlord!`;

  // Set initial turn to the landlord
  doudizhuCurrentTurn = doudizhuLandlord;

  // Hide bidding buttons
  if (doudizhuBiddingButtonsDiv) doudizhuBiddingButtonsDiv.style.display = 'none';
  // Show play/pass buttons
  if (doudizhuPlayButton) doudizhuPlayButton.style.display = 'inline-block';
  if (doudizhuPassButton) doudizhuPassButton.style.display = 'inline-block';

  updateDoudizhuUI(); // Update UI for playing phase

  // If landlord is an AI, trigger their first turn
  if (doudizhuLandlord !== 0) {
    setTimeout(doudizhuOpponentTurn, 1500);
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


// Placeholder for Doudizhu game logic functions
function playDoudizhuCards() {
  console.log("PlayDoudizhuCards function called."); // Added debug log

  // Get selected cards from the player's hand DOM elements
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
    doudizhuResultDiv.innerText = `Playing: ${newPattern.type}`;
    if (newPattern.type !== 'Rocket' && newPattern.type !== 'Bomb') {
      doudizhuResultDiv.innerText += ` (Value: ${newPattern.value})`;
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

    // Check for win condition (player has no cards left)
    if (doudizhuPlayerHand.length === 0) {
      doudizhuResultDiv.innerText = 'You played all your cards! You win!';
      doudizhuGameState = 'game_over'; // Set game state to end game
      // Hide play/pass buttons
      doudizhuPlayButton.style.display = 'none';
      doudizhuPassButton.style.display = 'none';
      // Potentially show a "Play Again" button or return to menu
    } else {
      // Move to next player's turn
      nextDoudizhuTurn();
    }
  } else {
    doudizhuResultDiv.innerText = `Cannot play that! ${newPattern.type} cannot beat ${doudizhuLastPlayedPattern ? doudizhuLastPlayedPattern.type : 'nothing'}.`;
    console.log("Play is invalid. New pattern:", newPattern, "Last pattern:", doudizhuLastPlayedPattern);
    // Deselect cards if play is invalid
    selectedElements.forEach(el => el.classList.remove('selected'));
  }

  updateDoudizhuUI();
}

function passDoudizhuTurn() {
  console.log("PassDoudizhuTurn function called."); // Added debug log
  doudizhuResultDiv.innerText = 'You passed your turn.';
  console.log("Player passed turn.");
  // Clear selected cards if any
  const selectedElements = doudizhuPlayerHandDiv.querySelectorAll('.card.selected');
  selectedElements.forEach(el => el.classList.remove('selected'));

  doudizhuConsecutivePasses++; // Increment pass counter

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
  // 1. If two players have passed consecutively (meaning the turn has cycled back to the player who last played, or the next player after them if they were the last player).
  // 2. Or, if the turn comes back to the player who made the last successful play.
  if (doudizhuConsecutivePasses >= 2 || (doudizhuPlayerWhoLastPlayed !== null && doudizhuCurrentTurn === doudizhuPlayerWhoLastPlayed)) {
    // If the current player is the one who played last, and others have passed, it's their turn to start a new round.
    if (doudizhuPlayerWhoLastPlayed === doudizhuCurrentTurn) {
      doudizhuResultDiv.innerText += " New round can begin!";
    } else {
      // This case handles when the second opponent passes and the turn moves to the player who played.
      // Or if three players passed (which shouldn't happen with consecutivePasses == 2 check)
      doudizhuResultDiv.innerText += " New round can begin!";
    }

    doudizhuLastPlayedPattern = null; // Clear the pattern to start a new round
    doudizhuLastPlayedCards = [];
    doudizhuConsecutivePasses = 0; // Reset pass counter
    doudizhuPlayerWhoLastPlayed = null; // Reset
    console.log("Round cleared. New round starting.");
  }


  doudizhuResultDiv.innerText = `Landlord: ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'}. Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn!`;
  updateDoudizhuUI();

  // If it's an AI opponent's turn, trigger their move
  if (doudizhuGameState === 'playing' && doudizhuCurrentTurn !== 0) { // 0 is player
    // Short delay to make AI moves noticeable
    setTimeout(doudizhuOpponentTurn, 1500); // Call AI logic after a delay
  }
}

// --- Doudizhu Opponent AI Placeholder (Needs actual implementation) ---
function doudizhuOpponentTurn() {
  console.log(`Opponent ${doudizhuCurrentTurn} turn.`);
  let opponentHand;
  if (doudizhuCurrentTurn === 1) {
    opponentHand = doudizhuOpponent1Hand;
  } else if (doudizhuCurrentTurn === 2) {
    opponentHand = doudizhuOpponent2Hand;
  }

  // Sort opponent's hand for AI logic (even if not rendered face up)
  opponentHand.sort((a, b) => a.value - b.value);

  // For now, a very basic AI: if it can play a single, it will. Otherwise, it passes.
  const possiblePlays = findPossiblePlays(opponentHand, doudizhuLastPlayedPattern);

  if (possiblePlays.length > 0) {
    // For simplicity, just play the first valid pattern found
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

    doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 1 ? '1' : '2'} played: ${play.pattern.type}`;
    if (play.pattern.type !== 'Rocket' && play.pattern.type !== 'Bomb') {
      doudizhuResultDiv.innerText += ` (Value: ${play.pattern.value})`;
    }


    // Check for opponent win
    if (opponentHand.length === 0) {
      doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 1 ? '1' : '2'} played all their cards! They win!`;
      doudizhuGameState = 'game_over';
      doudizhuPlayButton.style.display = 'none';
      doudizhuPassButton.style.display = 'none';
    }

  } else {
    console.log(`Opponent ${doudizhuCurrentTurn} passes.`);
    doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 1 ? '1' : '2'} passed.`;
    doudizhuConsecutivePasses++;
  }

  updateDoudizhuUI();

  // If game not over, and it's still an AI turn (e.g., if AI played and next turn is also AI)
  // Or if AI passed and the next turn is also AI, and the round hasn't cleared yet.
  if (doudizhuGameState === 'playing' && doudizhuCurrentTurn !== 0) {
    // Check if the current turn is still an AI and the round hasn't ended by clearing
    if (doudizhuPlayerWhoLastPlayed !== doudizhuCurrentTurn || doudizhuConsecutivePasses < 2) {
      setTimeout(doudizhuOpponentTurn, 1500);
    }
  } else if (doudizhuGameState === 'playing' && doudizhuCurrentTurn === 0) {
    // If it's now the player's turn, ensure buttons are visible.
    doudizhuPlayButton.style.display = 'inline-block';
    doudizhuPassButton.style.display = 'inline-block';
  }
}

/**
 * Finds all valid Doudizhu patterns that can be played from a given hand,
 * optionally beating a last played pattern.
 * This is a highly complex function in a real Doudizhu AI.
 * For now, it's a very basic placeholder.
 * @param {Array<Card>} hand - The hand to find plays from.
 * @param {object|null} lastPattern - The pattern that needs to be beaten.
 * @returns {Array<{pattern: object, cards: Array<Card>}>} An array of possible plays.
 */
function findPossiblePlays(hand, lastPattern) {
  const plays = [];
  // Sort hand to help with pattern detection, even for AI
  hand.sort((a, b) => a.value - b.b);

  // AI Logic (very basic for now):

  // 1. Check for Rocket if possible
  // Ensure both jokers are present in hand
  const blackJoker = hand.find(c => c.rank === 'JOKER' && c.color === 'black');
  const redJoker = hand.find(c => c.rank === 'JOKER' && c.color === 'red');

  if (blackJoker && redJoker) {
    const rocketCards = [blackJoker, redJoker];
    const rocketPattern = isRocket(rocketCards);
    if (rocketPattern && canPlay(rocketPattern, lastPattern)) {
      plays.push({ pattern: rocketPattern, cards: rocketCards });
      // If Rocket can be played, it's usually the best, so we might stop here for basic AI
      return plays; // Return immediately to play Rocket
    }
  }


  // 2. Check for Bombs
  const counts = getCardValueCounts(hand);
  const bombValues = [];
  for (const [value, count] of counts.entries()) {
    if (count === 4) {
      bombValues.push(value);
    }
  }
  bombValues.sort((a, b) => a - b); // Sort bombs by value

  for (const value of bombValues) {
    const bombCards = hand.filter(card => card.value === value);
    const bombPattern = isBomb(bombCards);
    if (bombPattern && canPlay(bombPattern, lastPattern)) {
      plays.push({ pattern: bombPattern, cards: bombCards });
    }
  }
  // If we found a bomb and it's the only option, or best option, return it for now.
  // This part of AI needs to be smarter. For now, if there's a Bomb, prioritize it if it beats the last pattern.
  // If a Rocket was found, it would have already been returned.
  if (plays.length > 0 && lastPattern && lastPattern.type !== 'Rocket' && lastPattern.type !== 'Bomb') {
    // If there are bombs and the last pattern wasn't a bomb/rocket, play the lowest bomb.
    return [plays[0]]; // Return only the first (lowest value) bomb for now
  } else if (plays.length > 0 && lastPattern && lastPattern.type === 'Bomb') {
    // If last pattern was a bomb, find the smallest bomb that beats it
    const beatingBombs = plays.filter(play => play.pattern.value > lastPattern.value);
    if (beatingBombs.length > 0) {
      return [beatingBombs[0]]; // Play the smallest beating bomb
    }
  }


  // 3. Simple play: Find a single card that can beat the last single.
  // Or, if starting a new round, play the lowest single.
  if (!lastPattern || (lastPattern.type === 'Single')) {
    for (const card of hand) {
      const singlePattern = isSingle([card]);
      if (singlePattern && canPlay(singlePattern, lastPattern)) {
        plays.push({ pattern: singlePattern, cards: [card] });
        // For basic AI, just take the first single that works
        return plays;
      }
    }
  }

  // You would add more complex logic here for other patterns (Pairs, Triplets, Straights etc.)
  // For now, this very basic AI will only try to play a single, bomb, or rocket.
  // If it cannot play a single, it will pass (handled in doudizhuOpponentTurn).

  return plays; // Return all possible plays found (even if empty)
}


// Initial setup on page load (optional, but ensures menu is shown)
document.addEventListener('DOMContentLoaded', () => {
  returnToMenu(); // Ensure menu screen is visible initially
});
