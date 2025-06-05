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
    const settings = { ...defaultOptions, ...options }; // Merge options

    this.cards = [];
    this.suits = ['♠', '♥', '♦', '♣'];
    // Ranks from 3 (smallest in Doudizhu) up to 2, then A
    // Doudizhu values: 3=3, 4=4, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15, Small Joker=16, Big Joker=17
    // Other games (War/Blackjack): A=1, J=11, Q=12, K=13, 2=2 (or Blackjack specific)
    this.ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    for (let i = 0; i < settings.numDecks; i++) {
      this.suits.forEach(suit => {
        this.ranks.forEach(rank => {
          let value;
          if (settings.gameType === 'doudizhu') {
            switch (rank) {
              case 'J': value = 11; break;
              case 'Q': value = 12; break;
              case 'K': value = 13; break;
              case 'A': value = 14; break;
              case '2': value = 15; break;
              default: value = parseInt(rank);
            }
          } else if (settings.gameType === 'blackjack') {
            switch (rank) {
              case 'A': value = 11; break; // Ace can be 1 or 11
              case 'J': case 'Q': case 'K': value = 10; break;
              default: value = parseInt(rank);
            }
          } else { // 'war' or 'viewer'
            switch (rank) {
              case 'A': value = 14; break; // Ace high in War
              case 'K': value = 13; break;
              case 'Q': value = 12; break;
              case 'J': value = 11; break;
              default: value = parseInt(rank);
            }
          }
          this.cards.push(new Card(suit, rank, value));
        });
      });

      if (settings.includeJokers || settings.gameType === 'doudizhu') {
        this.cards.push(new Card(null, 'JOKER', 16, 'black')); // Small Joker
        this.cards.push(new Card(null, 'JOKER', 17, 'red'));   // Big Joker
      }
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(numCards) {
    return this.cards.splice(0, numCards);
  }
}

// --- Global Game State Variables ---
let currentDeck;
let playerHand = [];
let enemyHand = [];
let gameMode = ''; // 'war', 'blackjack', 'deckViewer', 'doudizhu', 'multiplayerLobby', 'multiplayerDoudizhu'

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const doudizhuGameScreen = document.getElementById('doudizhu-game-screen');
const multiplayerLobbyScreen = document.getElementById('multiplayer-lobby-screen');

const gameTitle = document.getElementById('game-title');
const enemyCardCount = document.getElementById('enemy-card-count');
const playerCardCount = document.getElementById('player-card-count');
const enemyHandDiv = document.getElementById('enemy-hand');
const playerHandDiv = document.getElementById('player-hand');
const playTurnButton = document.getElementById('play-turn');
const resultDiv = document.getElementById('result');
const backButton = document.getElementById('back-button');

// Doudizhu specific DOM elements
const doudizhuPlayerHandDiv = document.getElementById('doudizhu-player-hand');
const doudizhuOpponent1HandDiv = document.getElementById('doudizhu-opponent1-hand');
const doudizhuOpponent2HandDiv = document.getElementById('doudizhu-opponent2-hand');
const doudizhuPlayedCardsDiv = document.getElementById('doudizhu-played-cards');
const doudizhuPlayButton = document.getElementById('doudizhu-play-button');
const doudizhuPassButton = document.getElementById('doudizhu-pass-button');
const doudizhuBiddingButtons = document.getElementById('doudizhu-bidding-buttons');
const doudizhuCallLandlordButton = document.getElementById('doudizhu-call-landlord-button');
const doudizhuDontCallButton = document.getElementById('doudizhu-dont-call-button');
const doudizhuResultDiv = document.getElementById('doudizhu-result');
const doudizhuCurrentPatternDiv = document.getElementById('doudizhu-current-pattern');
const doudizhuPatternTextSpan = document.getElementById('doudizhu-pattern-text');


// Doudizhu Game State (can be used for both single and multiplayer via server)
let doudizhuHands = [[], [], []]; // Player, Opponent1, Opponent2
let doudizhuLandlord = -1; // 0 for player, 1 for opponent1, 2 for opponent2
let doudizhuCurrentTurn = -1; // 0 for player, 1 for opponent1, 2 for opponent2
let doudizhuLastPlayedPattern = null; // Stores { type: 'single', value: 10, cards: [...] }
let doudizhuLastPlayedCards = []; // Actual Card objects of the last played pattern
let doudizhuSelectedCards = [];
let doudizhuBiddingState = {
  playerBid: false,
  opponent1Bid: false,
  opponent2Bid: false,
  bidsCount: 0
};
let doudizhuPasses = 0; // Track consecutive passes to clear played cards

// Multiplayer Doudizhu specific state for client-side
let currentLobby = null; // { code: 'ABCDEF', players: [{ id: 'uuid', name: 'Player1', isHost: true, handSize: 17 }], hostId: 'uuid', gameStarted: false, gameState: null }
let myPlayerId = null; // Unique ID for this player in the current session
let myPlayerName = ''; // Store the name entered by the user
let myPlayerIndex = -1; // Index in the doudizhuHands array (0, 1, or 2) for this player

// DOM elements for Multiplayer Lobby
const playerNameInput = document.getElementById('player-name-input');
const lobbyCodeDisplay = document.getElementById('lobby-code-display');
const joinCodeInput = document.getElementById('join-code-input');
const joinPlayerNameInput = document.getElementById('join-player-name-input');
const lobbyRoomArea = document.getElementById('lobby-room-area');
const currentLobbyCodeSpan = document.getElementById('current-lobby-code');
const playersList = document.getElementById('players-list');
const startMultiplayerDoudizhuButton = document.getElementById('start-multiplayer-doudizhu-button');
const multiplayerLobbyResultDiv = document.getElementById('multiplayer-lobby-result');

// WebSocket connection
const WEBSOCKET_SERVER_URL = 'ws://localhost:8080'; // YOU MUST CHANGE THIS TO YOUR SERVER URL
let websocket;

function connectWebSocket() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected.');
    return;
  }

  websocket = new WebSocket(WEBSOCKET_SERVER_URL);

  websocket.onopen = () => {
    console.log('WebSocket connected.');
    multiplayerLobbyResultDiv.innerText = 'Connected to game server.';
    // If we have a stored player ID, send it to the server to re-identify
    if (myPlayerId) {
      websocket.send(JSON.stringify({ type: 'reconnect', playerId: myPlayerId }));
    }
  };

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    switch (message.type) {
      case 'lobbyCreated':
        currentLobby = message.lobby;
        myPlayerId = message.myPlayerId;
        multiplayerLobbyResultDiv.innerText = `Lobby created! Share code: ${message.lobby.code}`;
        updateLobbyUI();
        break;
      case 'lobbyUpdate':
        currentLobby = message.lobby;
        updateLobbyUI();
        multiplayerLobbyResultDiv.innerText = `Lobby ${currentLobby.code} updated.`;
        break;
      case 'gameStarted':
        // The server provides the initial game state, including player hands.
        currentLobby.gameStarted = true;
        // Map server's player IDs to client's 0, 1, 2 indices for doudizhuHands
        const playerOrder = message.playerOrder; // Array of { id, name } from server
        myPlayerIndex = playerOrder.findIndex(p => p.id === myPlayerId);

        doudizhuHands[0] = message.initialHands[myPlayerIndex].map(cardData => new Card(cardData.suit, cardData.rank, cardData.value, cardData.color));
        doudizhuHands[0].sort((a, b) => a.value - b.value); // Sort player's hand locally
        // Opponent hands will be represented by their count from the server's message
        // For simplicity, we'll assume opponent 1 is the next player in order, and opponent 2 is the one after that.
        doudizhuHands[1] = Array(message.initialHands[(myPlayerIndex + 1) % 3].length).fill({}); // Dummy cards for opponent 1
        doudizhuHands[2] = Array(message.initialHands[(myPlayerIndex + 2) % 3].length).fill({}); // Dummy cards for opponent 2

        doudizhuLandlord = message.landlord;
        doudizhuCurrentTurn = message.currentTurn;
        doudizhuLastPlayedPattern = message.lastPlayedPattern;
        doudizhuLastPlayedCards = message.lastPlayedCards ? message.lastPlayedCards.map(cardData => new Card(cardData.suit, cardData.rank, cardData.value, cardData.color)) : [];

        // Set bidding buttons based on whose turn it is
        if (doudizhuCurrentTurn === myPlayerIndex) {
            doudizhuBiddingButtons.style.display = 'flex';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
            doudizhuResultDiv.innerText = `It's your turn to bid! Landlord's cards: ${message.landlordCards.map(c => c.rank).join(', ')}.`;
        } else {
            doudizhuBiddingButtons.style.display = 'none';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
            doudizhuResultDiv.innerText = `Waiting for Player ${doudizhuCurrentTurn + 1} to bid. Landlord's cards: ${message.landlordCards.map(c => c.rank).join(', ')}.`;
        }

        showScreen('doudizhu-game-screen');
        updateDoudizhuUI(); // Initial UI update after game starts
        break;
      case 'gameStateUpdate':
        // Update game state from server
        // This will be more complex to map hands to correct opponents based on myPlayerIndex
        // For simplicity, we'll assume the server sends enough info.
        const serverHands = message.gameState.hands; // Array of hands, index corresponds to playerOrder
        const playerOrderInGame = message.gameState.playerOrder; // Array mapping index to actual player IDs

        // Find my index in the server's player order
        const myActualIndexInServerOrder = playerOrderInGame.findIndex(pId => pId === myPlayerId);

        // Update my hand
        doudizhuHands[0] = serverHands[myActualIndexInServerOrder].map(cardData => new Card(cardData.suit, cardData.rank, cardData.value, cardData.color));
        doudizhuHands[0].sort((a, b) => a.value - b.value);

        // Update opponent hands based on their *relative* position to me
        // Opponent 1: (myActualIndexInServerOrder + 1) % 3
        // Opponent 2: (myActualIndexInServerOrder + 2) % 3
        doudizhuHands[1] = Array(serverHands[(myActualIndexInServerOrder + 1) % 3].length).fill({});
        doudizhuHands[2] = Array(serverHands[(myActualIndexInServerOrder + 2) % 3].length).fill({});

        doudizhuLandlord = message.gameState.landlord;
        doudizhuCurrentTurn = message.gameState.currentTurn; // This will be the index from 0-2 (server's perspective)
        doudizhuLastPlayedPattern = message.gameState.lastPlayedPattern;
        doudizhuLastPlayedCards = message.gameState.lastPlayedCards ? message.gameState.lastPlayedCards.map(cardData => new Card(cardData.suit, cardData.rank, cardData.value, cardData.color)) : [];
        doudizhuPasses = message.gameState.passes;

        // Determine who's turn it is relative to 'me' for UI
        if (doudizhuCurrentTurn === myActualIndexInServerOrder) {
            doudizhuResultDiv.innerText = 'It\'s your turn!';
            doudizhuPlayButton.style.display = 'inline-block';
            doudizhuPassButton.style.display = 'inline-block';
        } else {
            const currentTurnPlayer = currentLobby.players.find(p => p.id === playerOrderInGame[doudizhuCurrentTurn]);
            doudizhuResultDiv.innerText = `Waiting for ${currentTurnPlayer ? currentTurnPlayer.name : 'Opponent'}'s turn.`;
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
        }
        doudizhuBiddingButtons.style.display = 'none'; // Ensure bidding buttons are hidden during play
        updateDoudizhuUI();
        break;
      case 'biddingUpdate':
        // Update bidding state based on server
        doudizhuCurrentTurn = message.currentTurn; // Server tells whose turn it is for bidding
        doudizhuLandlord = message.landlord; // -1 if not decided yet
        multiplayerLobbyResultDiv.innerText = message.message; // Display bidding message
        doudizhuResultDiv.innerText = message.message;

        if (doudizhuLandlord !== -1) { // Bidding has ended
            // If I am the landlord, server will send a separate gameStarted message later with the final hand
            // For now, just show the landlord decision.
            doudizhuBiddingButtons.style.display = 'none';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
            // The game will start fully when the server sends the 'gameStarted' message.
        } else if (doudizhuCurrentTurn === myPlayerIndex) {
            doudizhuBiddingButtons.style.display = 'flex';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
        } else {
            doudizhuBiddingButtons.style.display = 'none';
            doudizhuPlayButton.style.display = 'none';
            doudizhuPassButton.style.display = 'none';
        }
        updateDoudizhuUI(); // Reflect bidding state in UI
        break;
      case 'gameEnded':
        endDoudizhuGame(message.winnerIndex); // Server tells who won
        break;
      case 'error':
        multiplayerLobbyResultDiv.innerText = `Error: ${message.message}`;
        doudizhuResultDiv.innerText = `Error: ${message.message}`;
        break;
    }
  };

  websocket.onclose = () => {
    console.log('WebSocket disconnected.');
    multiplayerLobbyResultDiv.innerText = 'Disconnected from game server. Please reconnect.';
    // Clear current lobby state on disconnect, as it's no longer valid.
    currentLobby = null;
    updateLobbyUI();
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    multiplayerLobbyResultDiv.innerText = 'WebSocket error. Check server status.';
  };
}

// Function to send messages via WebSocket
function sendWebSocketMessage(type, payload) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type, playerId: myPlayerId, ...payload }));
  } else {
    console.error('WebSocket not connected. Cannot send message:', type, payload);
    multiplayerLobbyResultDiv.innerText = 'Not connected to server. Please try again.';
  }
}

// --- Utility Functions ---

// Function to create a card element for display
function createCardElement(card) {
  const cardDiv = document.createElement('div');
  cardDiv.classList.add('card');
  if (card.suit === '♥' || card.suit === '♦' || card.color === 'red') {
    cardDiv.classList.add('red');
  } else {
    cardDiv.classList.add('black');
  }

  const rankTop = document.createElement('div');
  rankTop.classList.add('card-rank', 'top');
  rankTop.innerText = card.rank;

  const suitCenter = document.createElement('div');
  suitCenter.classList.add('card-suit', 'center');
  suitCenter.innerHTML = card.suit || ''; // Jokers don't have a suit symbol

  const rankBottom = document.createElement('div');
  rankBottom.classList.add('card-rank', 'bottom');
  rankBottom.innerText = card.rank;

  // Add suit icon for jokers
  if (card.rank === 'JOKER') {
    suitCenter.innerHTML = card.color === 'red' ? '🃏' : '🤹'; // Red/Black Joker icons
  }

  cardDiv.appendChild(rankTop);
  cardDiv.appendChild(suitCenter);
  cardDiv.appendChild(rankBottom);

  return cardDiv;
}

// Function to render hands
function renderHand(hand, handElement) {
  handElement.innerHTML = ''; // Clear existing cards
  hand.forEach(card => {
    handElement.appendChild(createCardElement(card));
  });
}

// Function to display appropriate game screen
function showScreen(screenId) {
  menuScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  doudizhuGameScreen.style.display = 'none';
  multiplayerLobbyScreen.style.display = 'none';

  document.getElementById(screenId).style.display = 'flex';
}

// --- Game Logic Functions ---

// --- WAR Game ---
function startWar() {
  gameMode = 'war';
  showScreen('game-screen');
  gameTitle.innerText = 'War';
  playTurnButton.style.display = 'block';
  resultDiv.innerText = '';

  currentDeck = new Deck({ gameType: 'war' });
  playerHand = currentDeck.deal(26);
  enemyHand = currentDeck.deal(26);

  updateWarUI();
}

function updateWarUI() {
  enemyCardCount.innerText = enemyHand.length;
  playerCardCount.innerText = playerHand.length;

  // Clear visual hands in War as cards are played from top of deck
  enemyHandDiv.innerHTML = '';
  playerHandDiv.innerHTML = '';

  // Show a "deck" placeholder if cards remain
  if (enemyHand.length > 0) {
    const backCard = document.createElement('div');
    backCard.classList.add('card', 'back');
    backCard.style.backgroundColor = '#666'; // Card back color
    backCard.style.color = 'white';
    backCard.innerText = '?';
    enemyHandDiv.appendChild(backCard);
  }
  if (playerHand.length > 0) {
    const backCard = document.createElement('div');
    backCard.classList.add('card', 'back');
    backCard.style.backgroundColor = '#666';
    backCard.style.color = 'white';
    backCard.innerText = '?';
    playerHandDiv.appendChild(backCard);
  }

  if (playerHand.length === 0 || enemyHand.length === 0) {
    endWarGame();
  }
}

function playWarTurn() {
  if (playerHand.length === 0 || enemyHand.length === 0) {
    endWarGame();
    return;
  }

  const playerCard = playerHand.shift();
  const enemyCard = enemyHand.shift();

  // Display the played cards
  playerHandDiv.innerHTML = '';
  enemyHandDiv.innerHTML = '';
  playerHandDiv.appendChild(createCardElement(playerCard));
  enemyHandDiv.appendChild(createCardElement(enemyCard));

  resultDiv.innerText = `You played ${playerCard.toString()}. Opponent played ${enemyCard.toString()}.`;

  if (playerCard.value > enemyCard.value) {
    resultDiv.innerText += ' You win the round!';
    playerHand.push(playerCard, enemyCard);
  } else if (enemyCard.value > playerCard.value) {
    resultDiv.innerText += ' Opponent wins the round!';
    enemyHand.push(playerCard, enemyCard);
  } else {
    resultDiv.innerText += ' It\'s a War!';
    // War logic: Each player places 3 cards face down, then 1 face up.
    // Simplified: Just put 3 cards from deck + played cards for the winner.
    let warPile = [playerCard, enemyCard];
    for (let i = 0; i < 3; i++) {
      if (playerHand.length > 0) warPile.push(playerHand.shift());
      if (enemyHand.length > 0) warPile.push(enemyHand.shift());
    }
    // Recursively play another turn for the war winner
    // This is a simplified approach, a real war would involve a "burn" pile
    // and then a new comparison. For this simple game, we'll just determine winner now
    // and add all cards to their pile.
    const newPlayerCard = playerHand.shift();
    const newEnemyCard = enemyHand.shift();

    if (newPlayerCard && newEnemyCard) {
      playerHandDiv.appendChild(createCardElement(newPlayerCard));
      enemyHandDiv.appendChild(createCardElement(newEnemyCard));
      warPile.push(newPlayerCard, newEnemyCard);

      if (newPlayerCard.value >= newEnemyCard.value) { // Player wins or another war
        resultDiv.innerText += ' You won the War!';
        playerHand.push(...warPile);
      } else {
        resultDiv.innerText += ' Opponent won the War!';
        enemyHand.push(...warPile);
      }
    } else {
      // Not enough cards for a full war, distribute remaining
      if (playerHand.length === 0) {
        resultDiv.innerText += ' Opponent wins due to insufficient cards for War!';
        enemyHand.push(...warPile, ...playerHand); // Give player's remaining cards to opponent
      } else {
        resultDiv.innerText += ' You win due to insufficient cards for War!';
        playerHand.push(...warPile, ...enemyHand); // Give opponent's remaining cards to player
      }
    }
  }

  updateWarUI();
}

function endWarGame() {
  playTurnButton.style.display = 'none';
  if (playerHand.length > enemyHand.length) {
    resultDiv.innerText = `Game Over! You Win with ${playerHand.length} cards!`;
  } else if (enemyHand.length > playerHand.length) {
    resultDiv.innerText = `Game Over! Opponent Wins with ${enemyHand.length} cards!`;
  } else {
    resultDiv.innerText = `Game Over! It's a Tie!`;
  }
}

// Add event listener for War game play button
playTurnButton.addEventListener('click', playWarTurn);


// --- BLACKJACK Game ---
let blackjackPlayerScore = 0;
let blackjackDealerScore = 0;
let blackjackPlayerCards = [];
let blackjackDealerCards = [];
const blackjackHitButton = document.createElement('button');
blackjackHitButton.innerText = 'Hit';
blackjackHitButton.style.display = 'none'; // Hidden by default
const blackjackStandButton = document.createElement('button');
blackjackStandButton.innerText = 'Stand';
blackjackStandButton.style.display = 'none'; // Hidden by default

function startBlackjack() {
  gameMode = 'blackjack';
  showScreen('game-screen');
  gameTitle.innerText = 'Blackjack';
  resultDiv.innerText = '';

  // Append buttons to game area
  const gameArea = document.getElementById('game-area');
  gameArea.appendChild(blackjackHitButton);
  gameArea.appendChild(blackjackStandButton);

  blackjackHitButton.style.display = 'inline-block';
  blackjackStandButton.style.display = 'inline-block';
  playTurnButton.style.display = 'none'; // Hide War button

  currentDeck = new Deck({ numDecks: 4, gameType: 'blackjack' }); // Use 4 decks for Blackjack
  blackjackPlayerCards = [];
  blackjackDealerCards = [];
  blackjackPlayerScore = 0;
  blackjackDealerScore = 0;

  // Initial deal
  blackjackPlayerCards.push(currentDeck.deal(1)[0]);
  blackjackDealerCards.push(currentDeck.deal(1)[0]);
  blackjackPlayerCards.push(currentDeck.deal(1)[0]);
  blackjackDealerCards.push(currentDeck.deal(1)[0]); // Dealer's second card is face down

  updateBlackjackUI();
  checkBlackjackInitialDeal();
}

function calculateScore(hand) {
  let score = 0;
  let numAces = 0;
  hand.forEach(card => {
    score += card.value;
    if (card.rank === 'A') {
      numAces++;
    }
  });

  // Adjust for Aces
  while (score > 21 && numAces > 0) {
    score -= 10;
    numAces--;
  }
  return score;
}

function updateBlackjackUI(revealDealer = false) {
  // Player's Hand
  playerHandDiv.innerHTML = '';
  blackjackPlayerCards.forEach(card => playerHandDiv.appendChild(createCardElement(card)));
  blackjackPlayerScore = calculateScore(blackjackPlayerCards);
  playerCardCount.innerText = blackjackPlayerScore;

  // Dealer's Hand
  enemyHandDiv.innerHTML = '';
  if (!revealDealer) {
    // Show only the first card for the dealer, second is face down
    enemyHandDiv.appendChild(createCardElement(blackjackDealerCards[0]));
    const backCard = document.createElement('div');
    backCard.classList.add('card', 'back');
    backCard.style.backgroundColor = '#666';
    backCard.style.color = 'white';
    backCard.innerText = '?';
    enemyHandDiv.appendChild(backCard);
    enemyCardCount.innerText = blackjackDealerCards[0].value; // Only show first card's value
  } else {
    blackjackDealerCards.forEach(card => enemyHandDiv.appendChild(createCardElement(card)));
    blackjackDealerScore = calculateScore(blackjackDealerCards);
    enemyCardCount.innerText = blackjackDealerScore;
  }

  resultDiv.innerText = ''; // Clear previous results
}

function checkBlackjackInitialDeal() {
  if (blackjackPlayerScore === 21 && blackjackDealerScore === 21) {
    resultDiv.innerText = 'Both have Blackjack! It\'s a Push!';
    endBlackjackGame();
  } else if (blackjackPlayerScore === 21) {
    resultDiv.innerText = 'Blackjack! You Win!';
    endBlackjackGame();
  } else if (blackjackDealerScore === 21) {
    resultDiv.innerText = 'Dealer has Blackjack! You Lose!';
    endBlackjackGame();
  }
}

function playerHit() {
  blackjackPlayerCards.push(currentDeck.deal(1)[0]);
  updateBlackjackUI();

  if (blackjackPlayerScore > 21) {
    resultDiv.innerText = 'Bust! You Lose!';
    endBlackjackGame();
  }
}

async function playerStand() {
  blackjackHitButton.style.display = 'none';
  blackjackStandButton.style.display = 'none';

  updateBlackjackUI(true); // Reveal dealer's hand

  while (blackjackDealerScore < 17) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate dealer thinking
    blackjackDealerCards.push(currentDeck.deal(1)[0]);
    updateBlackjackUI(true);
    blackjackDealerScore = calculateScore(blackjackDealerCards);
  }

  determineBlackjackWinner();
}

function determineBlackjackWinner() {
  if (blackjackDealerScore > 21) {
    resultDiv.innerText = 'Dealer Busts! You Win!';
  } else if (blackjackPlayerScore > blackjackDealerScore) {
    resultDiv.innerText = 'You Win!';
  } else if (blackjackDealerScore > blackjackPlayerScore) {
    resultDiv.innerText = 'You Lose!';
  } else {
    resultDiv.innerText = 'It\'s a Push!';
  }
  endBlackjackGame();
}

function endBlackjackGame() {
  blackjackHitButton.style.display = 'none';
  blackjackStandButton.style.display = 'none';
  // Allow returning to menu
}

// Add event listeners for Blackjack buttons
blackjackHitButton.addEventListener('click', playerHit);
blackjackStandButton.addEventListener('click', playerStand);


// --- DECK VIEWER ---
function showDeckViewer() {
  gameMode = 'deckViewer';
  showScreen('game-screen');
  gameTitle.innerText = 'Deck Viewer';
  playTurnButton.style.display = 'none';
  blackjackHitButton.style.display = 'none';
  blackjackStandButton.style.display = 'none';
  resultDiv.innerText = ''; // Clear results

  // Create a new div specifically for the deck viewer to display all cards
  let deckViewerDiv = document.getElementById('deck-viewer');
  if (!deckViewerDiv) {
    deckViewerDiv = document.createElement('div');
    deckViewerDiv.id = 'deck-viewer';
    document.getElementById('game-area').appendChild(deckViewerDiv);
  } else {
    deckViewerDiv.innerHTML = ''; // Clear previous cards
  }

  currentDeck = new Deck({ includeJokers: true, gameType: 'viewer' }); // Include jokers for viewing
  currentDeck.cards.sort((a, b) => {
    // Sort by suit then by value for a nice display
    if (a.suit === b.suit) {
      return a.value - b.value;
    }
    const suitOrder = ['♣', '♦', '♥', '♠', null]; // Order for suits, null for jokers
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });

  currentDeck.cards.forEach(card => {
    deckViewerDiv.appendChild(createCardElement(card));
  });

  // Hide enemy and player hand display elements
  enemyHandDiv.style.display = 'none';
  playerHandDiv.style.display = 'none';
  document.getElementById('enemy-player-info').style.display = 'none';
  document.getElementById('player-player-info').style.display = 'none';
}

// --- Doudizhu Game (Landlord Game) - Single Player ---

function startDoudizhu() {
  gameMode = 'doudizhu';
  showScreen('doudizhu-game-screen');
  doudizhuResultDiv.innerText = 'Dealing cards...';

  // Hide general game screen elements
  gameScreen.style.display = 'none';
  blackjackHitButton.style.display = 'none';
  blackjackStandButton.style.display = 'none';
  playTurnButton.style.display = 'none';

  // Initialize game state for single player
  currentDeck = new Deck({ includeJokers: true, gameType: 'doudizhu' });
  doudizhuHands = [[], [], []]; // Player, Opponent1, Opponent2
  doudizhuLandlord = -1;
  doudizhuCurrentTurn = -1;
  doudizhuLastPlayedPattern = null;
  doudizhuLastPlayedCards = [];
  doudizhuSelectedCards = [];
  doudizhuBiddingState = {
    playerBid: false,
    opponent1Bid: false,
    opponent2Bid: false,
    bidsCount: 0
  };
  doudizhuPasses = 0;

  // Deal 17 cards to each player
  for (let i = 0; i < 17; i++) {
    doudizhuHands[0].push(currentDeck.deal(1)[0]);
    doudizhuHands[1].push(currentDeck.deal(1)[0]);
    doudizhuHands[2].push(currentDeck.deal(1)[0]);
  }

  // Sort player's hand by value for easier viewing
  doudizhuHands[0].sort((a, b) => a.value - b.value);

  // The last 3 cards are "landlord's cards"
  const landlordCards = currentDeck.deal(3);
  doudizhuResultDiv.innerText += ` Landlord's cards: ${landlordCards.map(c => c.toString()).join(', ')}.`;

  // Start bidding
  doudizhuBiddingButtons.style.display = 'flex';
  doudizhuPlayButton.style.display = 'none';
  doudizhuPassButton.style.display = 'none';
  doudizhuResultDiv.innerText = 'Who wants to be the Landlord?';

  // Randomly select who starts bidding (simplified to player for now)
  doudizhuCurrentTurn = 0; // Player starts bidding
  updateDoudizhuUI();

  // Attach event listeners for Doudizhu buttons
  doudizhuPlayButton.onclick = playDoudizhuCards;
  doudizhuPassButton.onclick = passDoudizhuTurn;
  doudizhuCallLandlordButton.onclick = () => handleBidding(true);
  doudizhuDontCallButton.onclick = () => handleBidding(false);
}

function updateDoudizhuUI() {
  // Render player's hand (myPlayerIndex determines which hand is 'mine' in multiplayer)
  doudizhuPlayerHandDiv.innerHTML = '';
  doudizhuHands[0].forEach(card => { // doudizhuHands[0] always represents 'my' hand for UI
    const cardElement = createCardElement(card);
    cardElement.classList.add('doudizhu-card');
    // Ensure data attributes are strings
    cardElement.dataset.cardSuit = card.suit === null ? 'null' : card.suit;
    cardElement.dataset.cardRank = card.rank;
    cardElement.dataset.cardValue = card.value.toString(); // Store as string
    cardElement.addEventListener('click', toggleCardSelection);
    doudizhuPlayerHandDiv.appendChild(cardElement);
  });

  // Render opponent hands (just card backs or sizes if from multiplayer update)
  // For single player, these are AI. For multiplayer, these are other players.
  // doudizhuHands[1] and doudizhuHands[2] are now just arrays of empty objects with length for opponent card count
  doudizhuOpponent1HandDiv.innerHTML = '';
  for (let i = 0; i < doudizhuHands[1].length; i++) {
    const backCard = document.createElement('div');
    backCard.classList.add('card', 'back', 'doudizhu-card');
    backCard.style.backgroundColor = '#666';
    backCard.style.color = 'white';
    backCard.innerText = '?';
    doudizhuOpponent1HandDiv.appendChild(backCard);
  }

  doudizhuOpponent2HandDiv.innerHTML = '';
  for (let i = 0; i < doudizhuHands[2].length; i++) {
    const backCard = document.createElement('div');
    backCard.classList.add('card', 'back', 'doudizhu-card');
    backCard.style.backgroundColor = '#666';
    backCard.style.color = 'white';
    backCard.innerText = '?';
    doudizhuOpponent2HandDiv.appendChild(backCard);
  }

  // Render played cards
  doudizhuPlayedCardsDiv.innerHTML = '';
  if (doudizhuLastPlayedCards.length > 0) {
    doudizhuLastPlayedCards.forEach(card => {
      const cardElement = createCardElement(card);
      cardElement.classList.add('doudizhu-card');
      doudizhuPlayedCardsDiv.appendChild(cardElement);
    });
    doudizhuCurrentPatternDiv.style.display = 'block';
    doudizhuPatternTextSpan.innerText = doudizhuLastPlayedPattern ? doudizhuLastPlayedPattern.type : 'None';
  } else {
    doudizhuCurrentPatternDiv.style.display = 'none';
    doudizhuPatternTextSpan.innerText = 'None';
  }

  // Update button visibility based on turn and game state (simplified for single player/initial state)
  // In multiplayer, this is largely driven by server messages.
  if (gameMode === 'doudizhu') { // Single player mode
      if (doudizhuCurrentTurn === 0) { // Player's turn to play or bid
        if (doudizhuLandlord !== -1) { // Bidding is over, playing phase
          doudizhuBiddingButtons.style.display = 'none';
          doudizhuPlayButton.style.display = 'inline-block';
          doudizhuPassButton.style.display = 'inline-block';
        }
      } else { // Opponent's turn
        doudizhuPlayButton.style.display = 'none';
        doudizhuPassButton.style.display = 'none';
      }
  }
  // For multiplayer, button visibility is managed in onmessage handlers for 'gameStateUpdate' and 'biddingUpdate'
}

function toggleCardSelection(event) {
  const cardElement = event.currentTarget;
  const cardSuit = cardElement.dataset.cardSuit === 'null' ? null : cardElement.dataset.cardSuit;
  const cardRank = cardElement.dataset.cardRank;
  const cardValue = parseInt(cardElement.dataset.cardValue);

  const card = new Card(cardSuit, cardRank, cardValue, cardRank === 'JOKER' ? (cardValue === 17 ? 'red' : 'black') : null);

  const index = doudizhuSelectedCards.findIndex(
    c => c.suit === card.suit && c.rank === card.rank && c.value === card.value
  );

  if (index > -1) {
    doudizhuSelectedCards.splice(index, 1);
    cardElement.classList.remove('selected');
  } else {
    doudizhuSelectedCards.push(card);
    cardElement.classList.add('selected');
  }
  // Sort selected cards to maintain order
  doudizhuSelectedCards.sort((a, b) => a.value - b.value);
  console.log("Selected Cards:", doudizhuSelectedCards.map(c => c.toString()));
}

// Simplified bidding logic (for single-player mode)
function handleBidding(playerCallsLandlord) {
    if (gameMode === 'multiplayerDoudizhu') {
        // Send bidding action to server
        sendWebSocketMessage('biddingAction', { action: playerCallsLandlord ? 'call' : 'pass', playerId: myPlayerId });
        doudizhuBiddingButtons.style.display = 'none'; // Hide buttons until server responds
        doudizhuResultDiv.innerText = `You ${playerCallsLandlord ? 'called' : 'passed'}. Waiting for others...`;
        return;
    }

  doudizhuBiddingState.bidsCount++;

  if (playerCallsLandlord) {
    doudizhuLandlord = 0; // Player becomes landlord
    doudizhuResultDiv.innerText = 'You called Landlord!';
    endBiddingPhase();
  } else {
    doudizhuResultDiv.innerText = 'You passed.';
    // Simplified: If player passes, opponent 1 gets a chance (very basic logic)
    if (doudizhuBiddingState.bidsCount >= 3) { // All players had a chance, no one called
      doudizhuResultDiv.innerText = 'No one called landlord. Game restarts or ends (simplified).';
      // For simplicity, let's just make player the landlord if no one else calls after 3 bids.
      // A proper game would involve more complex bidding rounds or re-dealing.
      doudizhuLandlord = 0;
      endBiddingPhase();
    } else {
      // Simulate opponent bidding (randomly)
      setTimeout(() => {
        const opponentCalled = Math.random() < 0.5; // 50% chance to call
        if (opponentCalled) {
          doudizhuLandlord = doudizhuCurrentTurn === 0 ? 1 : 2; // Next opponent becomes landlord
          doudizhuResultDiv.innerText = `Opponent ${doudizhuLandlord} called Landlord!`;
          endBiddingPhase();
        } else {
          doudizhuResultDiv.innerText = `Opponent ${doudizhuCurrentTurn === 0 ? 1 : 2} passed.`;
          doudizhuCurrentTurn = (doudizhuCurrentTurn + 1) % 3; // Move to next player
          updateDoudizhuUI(); // Update UI after opponent's "turn"
          if (doudizhuCurrentTurn !== 0) { // If it's still AI turn, simulate another bid
            // For now, let's keep it simple: if player passes and AI passes, player becomes landlord.
            // This is a gross simplification for demonstration.
            if (doudizhuBiddingState.bidsCount >= 2 && doudizhuLandlord === -1) { // If player and one AI passed
                doudizhuLandlord = 0; // Player becomes landlord
                doudizhuResultDiv.innerText = 'All opponents passed. You are the Landlord by default!';
                endBiddingPhase();
            } else if (doudizhuCurrentTurn === 1) { // Opponent 1's turn
                handleOpponentBidding(1);
            } else if (doudizhuCurrentTurn === 2) { // Opponent 2's turn
                handleOpponentBidding(2);
            }
          }
        }
      }, 1000); // Simulate delay
    }
  }
}

function handleOpponentBidding(opponentIndex) {
    setTimeout(() => {
        const opponentCalled = Math.random() < 0.7; // Higher chance for AI to call
        if (opponentCalled) {
            doudizhuLandlord = opponentIndex;
            doudizhuResultDiv.innerText = `Opponent ${opponentIndex} called Landlord!`;
            endBiddingPhase();
        } else {
            doudizhuResultDiv.innerText = `Opponent ${opponentIndex} passed.`;
            doudizhuCurrentTurn = (doudizhuCurrentTurn + 1) % 3; // Move to next player
            if (doudizhuCurrentTurn === 0) { // Back to player
                // If everyone passed, player gets landlord by default (simplified)
                if (doudizhuLandlord === -1 && doudizhuBiddingState.bidsCount >= 2) {
                    doudizhuLandlord = 0;
                    doudizhuResultDiv.innerText = 'No one called Landlord. You are the Landlord by default!';
                }
                endBiddingPhase();
            } else { // Continue AI bidding
                handleOpponentBidding(doudizhuCurrentTurn);
            }
            updateDoudizhuUI();
        }
    }, 1000);
}


function endBiddingPhase() {
  doudizhuBiddingButtons.style.display = 'none';
  doudizhuPlayButton.style.display = 'inline-block';
  doudizhuPassButton.style.display = 'inline-block';

  // Distribute the 3 landlord cards
  const landlordCards = currentDeck.deal(3); // These were the initial 3 remaining cards
  doudizhuHands[doudizhuLandlord].push(...landlordCards);
  doudizhuHands[doudizhuLandlord].sort((a, b) => a.value - b.value);

  doudizhuResultDiv.innerText += ` Landlord cards added to ${doudizhuLandlord === 0 ? 'Your' : `Opponent ${doudizhuLandlord}'s`} hand.`;
  doudizhuCurrentTurn = doudizhuLandlord; // Landlord starts the first round
  doudizhuLastPlayedPattern = null; // Clear any pre-game pattern
  doudizhuLastPlayedCards = [];
  updateDoudizhuUI();
}

function playDoudizhuCards() {
  if (doudizhuSelectedCards.length === 0) {
    doudizhuResultDiv.innerText = 'Please select cards to play.';
    return;
  }

  const playedPattern = analyzeDoudizhuPattern(doudizhuSelectedCards);

  if (!playedPattern.isValid) {
    doudizhuResultDiv.innerText = 'Invalid card combination. Try again.';
    doudizhuSelectedCards.forEach(card => {
      const cardElement = doudizhuPlayerHandDiv.querySelector(`[data-card-suit="${card.suit === null ? 'null' : card.suit}"][data-card-rank="${card.rank}"][data-card-value="${card.value}"]`);
      if (cardElement) {
        cardElement.classList.remove('selected');
      }
    });
    doudizhuSelectedCards = [];
    return;
  }

  // In multiplayer, send this to the server for validation
  if (gameMode === 'multiplayerDoudizhu') {
      sendWebSocketMessage('playCards', {
          cards: doudizhuSelectedCards.map(card => ({ suit: card.suit, rank: card.rank, value: card.value, color: card.color })),
          pattern: playedPattern.type,
          value: playedPattern.value,
          length: playedPattern.length
      });
      doudizhuSelectedCards = []; // Clear selection locally, server will confirm success or error
      doudizhuPlayButton.style.display = 'none'; // Hide buttons until server responds
      doudizhuPassButton.style.display = 'none';
      doudizhuResultDiv.innerText = 'Playing cards... waiting for server.';
      return;
  }

  // Single player logic continues below
  // Check if the played pattern beats the last played pattern
  if (doudizhuLastPlayedPattern && !beatsDoudizhuPattern(playedPattern, doudizhuLastPlayedPattern)) {
    doudizhuResultDiv.innerText = `This ${playedPattern.type} does not beat the last played ${doudizhuLastPlayedPattern.type}.`;
    doudizhuSelectedCards.forEach(card => {
      const cardElement = doudizhuPlayerHandDiv.querySelector(`[data-card-suit="${card.suit === null ? 'null' : card.suit}"][data-card-rank="${card.rank}"][data-card-value="${card.value}"]`);
      if (cardElement) {
        cardElement.classList.remove('selected');
      }
    });
    doudizhuSelectedCards = [];
    return;
  }

  // If valid and beats or is the first play of a new round
  doudizhuLastPlayedPattern = playedPattern;
  doudizhuLastPlayedCards = [...doudizhuSelectedCards]; // Store a copy
  doudizhuPasses = 0; // Reset passes after a successful play

  // Remove played cards from player's hand
  doudizhuHands[0] = doudizhuHands[0].filter(playerCard =>
    !doudizhuSelectedCards.some(selectedCard =>
      selectedCard.suit === playerCard.suit && selectedCard.rank === playerCard.rank && selectedCard.value === playerCard.value
    )
  );
  doudizhuSelectedCards = []; // Clear selected cards

  doudizhuResultDiv.innerText = `You played a ${playedPattern.type}! Remaining cards: ${doudizhuHands[0].length}`;

  if (doudizhuHands[0].length === 0) {
    endDoudizhuGame(0); // Player wins
    return;
  }

  moveToNextDoudizhuTurn();
}

function passDoudizhuTurn() {
    if (gameMode === 'multiplayerDoudizhu') {
        sendWebSocketMessage('passTurn', { playerId: myPlayerId });
        doudizhuSelectedCards = []; // Clear selection locally
        doudizhuPlayButton.style.display = 'none'; // Hide buttons until server responds
        doudizhuPassButton.style.display = 'none';
        doudizhuResultDiv.innerText = 'Passing turn... waiting for server.';
        return;
    }

  doudizhuPasses++;
  doudizhuResultDiv.innerText = 'You passed.';
  doudizhuSelectedCards = []; // Clear selected cards if any

  // If two players pass, the last played pattern is cleared, and the next player (who didn't pass) starts a new round.
  // For 3 players, if player A plays, then B passes, then C passes, it's A's turn again, and the table is cleared.
  if (doudizhuPasses >= 2) { // Assuming 3 players total, 2 consecutive passes mean table cleared
    doudizhuLastPlayedPattern = null;
    doudizhuLastPlayedCards = [];
    doudizhuResultDiv.innerText += " Table cleared! New round can begin.";
  }

  moveToNextDoudizhuTurn();
}

// This function is primarily for single-player AI or will be driven by server in multiplayer
function moveToNextDoudizhuTurn() {
    if (gameMode === 'multiplayerDoudizhu') {
        // In multiplayer, the server dictates the turn. This client function is bypassed.
        return;
    }

  doudizhuCurrentTurn = (doudizhuCurrentTurn + 1) % 3;

  // If the current turn is the landlord, and the previous two players passed,
  // then the last played pattern should be cleared.
  // This is a simplified placeholder.
  // A proper implementation would track consecutive passes.
  // For now, if landlord's turn comes back, we assume a new round can start.
  // This needs to be tied into the actual game flow.

  // Simplified: If the next player is the landlord, and they are starting a new round, clear the pattern
  // This is a very rough approximation.
  if (doudizhuCurrentTurn === doudizhuLandlord && doudizhuLastPlayedPattern !== null) {
      // This is a placeholder for checking if the round has completed.
      // A real game would track passes from all players.
      // For now, if landlord's turn comes back, we assume a new round can start.
      doudizhuLastPlayedPattern = null;
      doudizhuLastPlayedCards = [];
      doudizhuResultDiv.innerText += " New round can begin!";
      console.log("Landlord's turn, clearing last played pattern for new round.");
  }

  doudizhuResultDiv.innerText = `Landlord: ${doudizhuLandlord === 0 ? 'You' : doudizhuLandlord === 1 ? 'Opponent 1' : 'Opponent 2'}. Player ${doudizhuCurrentTurn === 0 ? 'You' : doudizhuCurrentTurn === 1 ? 'Opponent 1' : 'Opponent 2'}'s turn!`;
  updateDoudizhuUI();

  // If it's an opponent's turn, simulate their play
  if (doudizhuCurrentTurn !== 0) {
    setTimeout(simulateOpponentDoudizhuPlay, 1500); // Simulate a delay for AI
  }
}

// This function is for single-player AI only. In multiplayer, the server handles opponent turns.
function simulateOpponentDoudizhuPlay() {
  const opponentIndex = doudizhuCurrentTurn;
  const opponentHand = doudizhuHands[opponentIndex];
  let playedCards = [];
  let playedPattern = null;

  // Simple AI: Try to play the smallest valid single card if possible, or pass
  // This is a highly simplified AI. A real Doudizhu AI is complex.

  // Try to play a single card
  if (doudizhuLastPlayedPattern === null || doudizhuLastPlayedPattern.type === 'single') {
    for (let i = 0; i < opponentHand.length; i++) {
      const cardToPlay = opponentHand[i];
      const potentialPattern = analyzeDoudizhuPattern([cardToPlay]);
      if (potentialPattern.isValid && (!doudizhuLastPlayedPattern || beatsDoudizhuPattern(potentialPattern, doudizhuLastPlayedPattern))) {
        playedCards = [cardToPlay];
        playedPattern = potentialPattern;
        break;
      }
    }
  }

  // If no single card beats, try other patterns (very basic, can be expanded)
  if (!playedPattern && (doudizhuLastPlayedPattern === null || doudizhuLastPlayedPattern.type === 'pair')) {
    // Try to play a pair
    const cardCounts = {};
    opponentHand.forEach(card => {
      cardCounts[card.rank] = (cardCounts[card.rank] || 0) + 1;
    });

    for (const rank in cardCounts) {
      if (cardCounts[rank] >= 2) {
        const pairCards = opponentHand.filter(card => card.rank === rank).slice(0, 2);
        const potentialPattern = analyzeDoudizhuPattern(pairCards);
        if (potentialPattern.isValid && (!doudizhuLastPlayedPattern || beatsDoudizhuPattern(potentialPattern, doudizhuLastPlayedPattern))) {
          playedCards = pairCards;
          playedPattern = potentialPattern;
          break;
        }
      }
    }
  }
  // Add more AI logic for other patterns (triples, straights, bombs, etc.)

  if (playedPattern && playedCards.length > 0) {
    // Play cards
    doudizhuLastPlayedPattern = playedPattern;
    doudizhuLastPlayedCards = [...playedCards];
    doudizhuPasses = 0;

    // Remove played cards from opponent's hand
    doudizhuHands[opponentIndex] = doudizhuHands[opponentIndex].filter(opponentCard =>
      !playedCards.some(played =>
        played.suit === opponentCard.suit && played.rank === opponentCard.rank && played.value === opponentCard.value
      )
    );

    doudizhuResultDiv.innerText = `Opponent ${opponentIndex} played a ${playedPattern.type}! Remaining cards: ${doudizhuHands[opponentIndex].length}`;

    if (doudizhuHands[opponentIndex].length === 0) {
      endDoudizhuGame(opponentIndex); // Opponent wins
      return;
    }
  } else {
    // Opponent passes
    doudizhuPasses++;
    doudizhuResultDiv.innerText = `Opponent ${opponentIndex} passed.`;
    if (doudizhuPasses >= 2) { // If two players pass, the table is cleared
      doudizhuLastPlayedPattern = null;
      doudizhuLastPlayedCards = [];
      doudizhuResultDiv.innerText += " Table cleared! New round can begin.";
    }
  }
  moveToNextDoudizhuTurn();
}

function analyzeDoudizhuPattern(cards) {
  // Sort cards by value
  cards.sort((a, b) => a.value - b.value);

  const numCards = cards.length;
  const values = cards.map(c => c.value);
  const ranks = cards.map(c => c.rank);

  // Helper to count occurrences of each value
  const valueCounts = {};
  values.forEach(v => { valueCounts[v] = (valueCounts[v] || 0) + 1; });

  const distinctValues = Object.keys(valueCounts).map(Number);
  const distinctRanks = Object.keys(valueCounts); // Use ranks for sequence checking without Jokers
  distinctRanks.sort((a, b) => {
    // Custom sort for ranks to handle 2 and Jokers correctly in sequences
    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'JOKER'];
    return rankOrder.indexOf(a) - rankOrder.indexOf(b);
  });


  // Single
  if (numCards === 1) {
    return { isValid: true, type: 'single', value: values[0], length: 1, cards: cards };
  }

  // Pair
  if (numCards === 2 && values[0] === values[1]) {
    return { isValid: true, type: 'pair', value: values[0], length: 1, cards: cards };
  }

  // Triple (with or without single/pair)
  if (numCards >= 3) {
    // Check for a triple base
    for (let i = 0; i < distinctValues.length; i++) {
      const val = distinctValues[i];
      if (valueCounts[val] === 3) {
        if (numCards === 3) { // Triple
          return { isValid: true, type: 'triple', value: val, length: 1, cards: cards };
        } else if (numCards === 4) { // Triple with single (e.g., 555-8)
          // Ensure remaining card is a single
          const remainingCards = cards.filter(c => c.value !== val);
          if (remainingCards.length === 1 && valueCounts[remainingCards[0].value] === 1) {
            return { isValid: true, type: 'triple-single', value: val, length: 1, cards: cards };
          }
        } else if (numCards === 5) { // Triple with pair (e.g., 555-88)
          // Ensure remaining cards form a pair
          const remainingCards = cards.filter(c => c.value !== val);
          if (remainingCards.length === 2 && remainingCards[0].value === remainingCards[1].value) {
            return { isValid: true, type: 'triple-pair', value: val, length: 1, cards: cards };
          }
        }
      }
    }
  }

  // Straight (Shunzi): 5 or more consecutive cards, no pairs/triples/jokers
  if (numCards >= 5 && numCards <= 12 && distinctValues.length === numCards) {
    let isStraight = true;
    for (let i = 0; i < distinctValues.length - 1; i++) {
      // Doudizhu straight cannot contain 2 or Jokers
      if (distinctValues[i] === 15 || distinctValues[i] === 16 || distinctValues[i] === 17) {
        isStraight = false;
        break;
      }
      if (distinctValues[i + 1] !== distinctValues[i] + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      return { isValid: true, type: 'straight', value: values[0], length: numCards, cards: cards };
    }
  }

  // Pair Straight (Lian Dui): 3 or more consecutive pairs, no 2s or Jokers
  if (numCards >= 6 && numCards % 2 === 0 && distinctValues.length === numCards / 2) {
    let isPairStraight = true;
    for (const val of distinctValues) {
      if (valueCounts[val] !== 2) {
        isPairStraight = false;
        break;
      }
      // Doudizhu pair straight cannot contain 2 or Jokers
      if (val === 15 || val === 16 || val === 17) {
        isPairStraight = false;
        break;
      }
    }
    if (isPairStraight) {
      for (let i = 0; i < distinctValues.length - 1; i++) {
        if (distinctValues[i + 1] !== distinctValues[i] + 1) {
          isPairStraight = false;
          break;
        }
      }
    }
    if (isPairStraight) {
      return { isValid: true, type: 'pair-straight', value: values[0], length: numCards / 2, cards: cards };
    }
  }

  // Triple Straight (Fei Ji/Airplane): 2 or more consecutive triples
  // With or without attached singles/pairs
  // Example: 333444, 333444-5-6, 333444-55-66
  if (numCards >= 6 && numCards % 3 === 0) { // Basic triple straight (no wings)
    let isTripleStraight = true;
    const tripleBases = [];
    for (const val of distinctValues) {
      if (valueCounts[val] !== 3) {
        isTripleStraight = false;
        break;
      }
      if (val === 15 || val === 16 || val === 17) { // Cannot contain 2 or Jokers
        isTripleStraight = false;
        break;
      }
      tripleBases.push(val);
    }
    if (isTripleStraight) {
      for (let i = 0; i < tripleBases.length - 1; i++) {
        if (tripleBases[i + 1] !== tripleBases[i] + 1) {
          isTripleStraight = false;
          break;
        }
      }
    }
    if (isTripleStraight) {
      return { isValid: true, type: 'triple-straight', value: tripleBases[0], length: tripleBases.length, cards: cards };
    }
  }

  // Bomb: Four of a kind
  if (numCards === 4 && distinctValues.length === 1 && valueCounts[values[0]] === 4) {
    return { isValid: true, type: 'bomb', value: values[0], length: 1, cards: cards };
  }

  // Rocket: Two Jokers (Big and Small)
  if (numCards === 2 &&
      cards.some(c => c.rank === 'JOKER' && c.color === 'black') &&
      cards.some(c => c.rank === 'JOKER' && c.color === 'red')) {
    return { isValid: true, type: 'rocket', value: 100, length: 1, cards: cards }; // Assign a very high value
  }

  // Four with two singles (e.g., 7777-3-5)
  if (numCards === 6) {
      const fourOfAKindValue = distinctValues.find(v => valueCounts[v] === 4);
      if (fourOfAKindValue) {
          const remainingCards = cards.filter(card => card.value !== fourOfAKindValue);
          if (remainingCards.length === 2 && remainingCards[0].value !== remainingCards[1].value) {
              return { isValid: true, type: 'four-two-singles', value: fourOfAKindValue, length: 1, cards: cards };
          }
      }
  }

  // Four with two pairs (e.g., 7777-33-55)
  if (numCards === 8) {
      const fourOfAKindValue = distinctValues.find(v => valueCounts[v] === 4);
      if (fourOfAKindValue) {
          const remainingCards = cards.filter(card => card.value !== fourOfAKindValue);
          const remainingCounts = {};
          remainingCards.forEach(c => { remainingCounts[c.value] = (remainingCounts[c.value] || 0) + 1; });
          const remainingDistinctValues = Object.keys(remainingCounts).map(Number);

          if (remainingCards.length === 4 && remainingDistinctValues.length === 2 &&
              remainingCounts[remainingDistinctValues[0]] === 2 && remainingCounts[remainingDistinctValues[1]] === 2) {
              return { isValid: true, type: 'four-two-pairs', value: fourOfAKindValue, length: 1, cards: cards };
          }
      }
  }


  // If no pattern matches
  return { isValid: false, type: 'unknown', cards: cards };
}

function beatsDoudizhuPattern(newPattern, lastPattern) {
  // Rocket beats everything (except another rocket, which is a tie - not handled by this game's rules)
  if (newPattern.type === 'rocket') return true;
  // Bombs beat everything except rockets and stronger bombs
  if (newPattern.type === 'bomb' && lastPattern.type !== 'rocket') {
    if (lastPattern.type === 'bomb') {
      return newPattern.value > lastPattern.value;
    }
    return true; // Bomb beats any non-bomb, non-rocket pattern
  }

  // If the types don't match, and it's not a bomb or rocket, it's an invalid play
  if (newPattern.type !== lastPattern.type) {
    return false;
  }

  // Compare patterns of the same type
  switch (newPattern.type) {
    case 'single':
    case 'pair':
    case 'triple':
    case 'triple-single':
    case 'triple-pair':
    case 'four-two-singles':
    case 'four-two-pairs':
      return newPattern.value > lastPattern.value; // Higher value wins
    case 'straight':
    case 'pair-straight':
    case 'triple-straight':
      // Must be same length and higher starting value
      return newPattern.length === lastPattern.length && newPattern.value > lastPattern.value;
    default:
      return false; // Should not happen if patterns are correctly identified
  }
}


function endDoudizhuGame(winnerIndex) {
  doudizhuPlayButton.style.display = 'none';
  doudizhuPassButton.style.display = 'none';
  doudizhuBiddingButtons.style.display = 'none'; // Ensure bidding buttons are hidden

  let winnerText = '';
  // In multiplayer, winnerIndex is the server's player index. We need to map it to player names.
  if (gameMode === 'multiplayerDoudizhu' && currentLobby && currentLobby.players) {
      const winnerPlayer = currentLobby.players[winnerIndex];
      winnerText = `${winnerPlayer.name} ${winnerIndex === doudizhuLandlord ? '(Landlord)' : '(Farmer)'} Wins!`;
  } else { // Single player logic
      if (winnerIndex === 0) {
        winnerText = doudizhuLandlord === 0 ? 'You (Landlord) Win!' : 'You (Farmer) Win!';
      } else if (winnerIndex === doudizhuLandlord) {
        winnerText = `Opponent ${winnerIndex} (Landlord) Wins!`;
      } else {
        winnerText = `Opponent ${winnerIndex} (Farmer) Wins!`;
      }
  }
  doudizhuResultDiv.innerText = `Game Over! ${winnerText}`;
}


// --- Multiplayer Lobby & Game Logic (WebSocket based) ---

// Displays the multiplayer lobby screen
function showMultiplayerLobby() {
  gameMode = 'multiplayerLobby';
  showScreen('multiplayer-lobby-screen');
  multiplayerLobbyResultDiv.innerText = '';
  lobbyCodeDisplay.innerText = '';
  lobbyRoomArea.style.display = 'none';
  connectWebSocket(); // Establish WebSocket connection
}

// Creates a new game lobby
function createLobby() {
  myPlayerName = playerNameInput.value.trim();
  if (!myPlayerName) {
    multiplayerLobbyResultDiv.innerText = 'Please enter your name to create a lobby.';
    return;
  }
  // Ensure we have a player ID
  if (!myPlayerId) {
    myPlayerId = crypto.randomUUID();
    localStorage.setItem('doudizhuMyPlayerId', myPlayerId);
  }
  sendWebSocketMessage('createLobby', { playerName: myPlayerName });
  multiplayerLobbyResultDiv.innerText = 'Creating lobby...';
}

// Joins an existing game lobby
function joinLobby() {
  const code = joinCodeInput.value.trim().toUpperCase();
  myPlayerName = joinPlayerNameInput.value.trim();

  if (!code || !myPlayerName) {
    multiplayerLobbyResultDiv.innerText = 'Please enter lobby code and your name.';
    return;
  }
  // Ensure we have a player ID
  if (!myPlayerId) {
    myPlayerId = crypto.randomUUID();
    localStorage.setItem('doudizhuMyPlayerId', myPlayerId);
  }
  sendWebSocketMessage('joinLobby', { lobbyCode: code, playerName: myPlayerName });
  multiplayerLobbyResultDiv.innerText = `Joining lobby ${code}...`;
}

// Updates the lobby UI (player list, start button visibility)
function updateLobbyUI() {
  if (currentLobby) {
    currentLobbyCodeSpan.innerText = currentLobby.code;
    playersList.innerHTML = '';
    currentLobby.players.forEach(player => {
      const listItem = document.createElement('li');
      listItem.innerText = `${player.name} ${player.isHost ? '(Host)' : ''} ${player.id === myPlayerId ? '(You)' : ''}`;
      playersList.appendChild(listItem);
    });

    // Only host can start game, and only if 3 players are in lobby
    if (currentLobby.players.length === 3 && currentLobby.hostId === myPlayerId && !currentLobby.gameStarted) {
      startMultiplayerDoudizhuButton.style.display = 'inline-block';
    } else {
      startMultiplayerDoudizhuButton.style.display = 'none';
    }
    lobbyRoomArea.style.display = 'block'; // Ensure room is visible
    lobbyCodeDisplay.innerText = `Lobby Code: ${currentLobby.code}`;
  } else {
    currentLobbyCodeSpan.innerText = 'N/A';
    playersList.innerHTML = '';
    startMultiplayerDoudizhuButton.style.display = 'none';
    lobbyRoomArea.style.display = 'none'; // Hide room if no lobby
    lobbyCodeDisplay.innerText = '';
  }
  // Clear inputs after action
  // playerNameInput.value = ''; // Keep for convenience if user wants to rejoin
  // joinCodeInput.value = '';
  // joinPlayerNameInput.value = '';
}

// Leaves the current lobby
function leaveLobby() {
  if (currentLobby) {
    sendWebSocketMessage('leaveLobby', { lobbyCode: currentLobby.code });
    currentLobby = null; // Clear local lobby state immediately
    // myPlayerId = null; // Keep player ID for potential reconnection in future
    multiplayerLobbyResultDiv.innerText = 'You left the lobby.';
    updateLobbyUI(); // Update UI to reflect leaving
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close(); // Close connection after leaving lobby
    }
  }
}

// Host starts the Doudizhu game for multiplayer
function startMultiplayerDoudizhu() {
  if (!currentLobby || currentLobby.players.length !== 3 || currentLobby.hostId !== myPlayerId) {
    multiplayerLobbyResultDiv.innerText = 'You must be the host with 3 players to start the game.';
    return;
  }
  sendWebSocketMessage('startGame', { lobbyCode: currentLobby.code });
  multiplayerLobbyResultDiv.innerText = 'Sending start game request...';
}


// --- General UI Functions ---

function returnToMenu() {
  showScreen('menu-screen');
  // Clean up game-specific UI elements
  playTurnButton.style.display = 'none';
  blackjackHitButton.style.display = 'none';
  blackjackStandButton.style.display = 'none';
  doudizhuPlayButton.style.display = 'none';
  doudizhuPassButton.style.display = 'none';
  doudizhuBiddingButtons.style.display = 'none';

  // For Deck Viewer, hide the specific viewer div
  const deckViewerDiv = document.getElementById('deck-viewer');
  if (deckViewerDiv) {
    deckViewerDiv.style.display = 'none';
    deckViewerDiv.innerHTML = ''; // Clear cards
  }

  // Restore general hand display elements if they were hidden
  enemyHandDiv.style.display = 'flex';
  playerHandDiv.style.display = 'flex';
  document.getElementById('enemy-player-info').style.display = 'block';
  document.getElementById('player-player-info').style.display = 'block';

  // Clear multiplayer lobby state and UI related to game modes
  currentLobby = null; // Clear local lobby reference
  myPlayerIndex = -1; // Reset player index
  // myPlayerId is persistent
  // myPlayerName is persistent

  updateLobbyUI(); // Reset lobby UI elements
  multiplayerLobbyResultDiv.innerText = ''; // Clear lobby messages
  // Keep input fields for convenience
  // playerNameInput.value = '';
  // joinCodeInput.value = '';
  // joinPlayerNameInput.value = '';

  // Close WebSocket connection if it's open and not already closed by leaving lobby
  if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.close();
  }
}

// Initial setup on page load (optional, but ensures menu is shown)
document.addEventListener('DOMContentLoaded', () => {
  // Generate a persistent player ID for this browser, if not already present
  // This allows the "same player" to rejoin a lobby in the same browser session.
  myPlayerId = localStorage.getItem('doudizhuMyPlayerId') || crypto.randomUUID();
  localStorage.setItem('doudizhuMyPlayerId', myPlayerId);

  // Set default player name if previously entered
  const storedPlayerName = localStorage.getItem('doudizhuMyPlayerName');
  if (storedPlayerName) {
      playerNameInput.value = storedPlayerName;
      joinPlayerNameInput.value = storedPlayerName;
      myPlayerName = storedPlayerName;
  }

  // Add event listeners for Doudizhu buttons (single-player mode uses these directly)
  doudizhuPlayButton.onclick = playDoudizhuCards;
  doudizhuPassButton.onclick = passDoudizhuTurn;
  doudizhuCallLandlordButton.onclick = () => handleBidding(true);
  doudizhuDontCallButton.onclick = () => handleBidding(false);

  showScreen('menu-screen');
});
