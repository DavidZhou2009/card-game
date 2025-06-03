const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const DOUDIZHU_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace', '2', 'black_joker', 'red_joker'];

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  toString() {
    if (this.rank === 'black_joker' || this.rank === 'red_joker') {
      return this.rank;
    }
    return `${this.rank}_of_${this.suit}`;
  }

  getValue(gameType) {
    if (gameType === 'doudizhu') {
      return DOUDIZHU_RANKS.indexOf(this.rank);
    }
    if (this.rank === 'ace') return 14;
    if (this.rank === 'king') return 13;
    if (this.rank === 'queen') return 12;
    if (this.rank === 'jack') return 11;
    return parseInt(this.rank) || 0;
  }
}

class Deck {
  constructor(includeJokers = false) {
    this.cards = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
    if (includeJokers) {
      this.cards.push(new Card(null, 'black_joker'));
      this.cards.push(new Card(null, 'red_joker'));
    }
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

  dealToPlayers(numPlayers, cardsPerPlayer) {
    const hands = Array.from({ length: numPlayers }, () => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let j = 0; j < numPlayers; j++) {
        if (this.cards.length > 0) {
          hands[j].push(this.cards.shift());
        }
      }
    }
    return hands;
  }
}

function getCardFileName(card) {
  return `assets/cards/${card.toString()}.svg`;
}

function renderHand(hand, container, faceUp = true, gameType = null) {
  container.innerHTML = '';
  hand.forEach((card, index) => {
    const img = document.createElement('img');
    img.src = faceUp ? getCardFileName(card) : 'assets/cards/card_back.svg';
    img.alt = faceUp ? card.toString() : 'Card Back';
    img.classList.add(gameType === 'doudizhu' ? 'doudizhu-card' : 'card');
    if (gameType === 'doudizhu') {
      img.style.zIndex = index;
      img.onclick = () => toggleCardSelection(img, card);
    }
    container.appendChild(img);
  });
}

function renderDoudizhuHand(hand, container, selectedCards, clickable = true) {
  container.innerHTML = '';
  hand.forEach((card, index) => {
    const img = document.createElement('img');
    img.src = getCardFileName(card);
    img.alt = card.toString();
    img.classList.add('doudizhu-card');
    img.style.zIndex = index;
    const isSelected = selectedCards.some(c => c.toString() === card.toString());
    if (isSelected) {
      img.classList.add('selected');
    }
    if (clickable) {
      img.onclick = () => toggleCardSelection(img, card);
    }
    container.appendChild(img);
  });
}

function toggleCardSelection(img, card) {
  const index = selectedDoudizhuCards.findIndex(c => c.toString() === card.toString());
  if (index === -1) {
    selectedDoudizhuCards.push(card);
    img.classList.add('selected');
  } else {
    selectedDoudizhuCards.splice(index, 1);
    img.classList.remove('selected');
  }
}

function showScreen(screenId, title = '') {
  document.querySelectorAll('#menu-screen, #game-screen, #doudizhu-lobby-screen, #doudizhu-game-screen').forEach(screen => {
    screen.style.display = 'none';
  });
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.style.display = 'block';
  }
  if (title && screenId === 'game-screen') {
    document.getElementById('game-title').innerText = title;
  }
}

function playWar() {
  const deck = new Deck();
  deck.shuffle();
  const [playerHand, enemyHand] = deck.dealToPlayers(2, 26);
  showScreen('game-screen', 'War');
  updateWarUI(playerHand, enemyHand);
  const playTurnButton = document.getElementById('play-turn');
  playTurnButton.innerText = 'Play Card';
  playTurnButton.onclick = () => playWarTurn(playerHand, enemyHand);
}

function updateWarUI(playerHand, enemyHand) {
  document.getElementById('player-card-count').innerText = playerHand.length;
  document.getElementById('enemy-card-count').innerText = enemyHand.length;
  const playerHandDiv = document.getElementById('player-hand');
  const enemyHandDiv = document.getElementById('enemy-hand');
  renderHand(playerHand.slice(0, 1), playerHandDiv, false);
  renderHand(enemyHand.slice(0, 1), enemyHandDiv, false);
  document.getElementById('result').innerText = '';
}

function playWarTurn(playerHand, enemyHand) {
  if (playerHand.length === 0 || enemyHand.length === 0) {
    const result = playerHand.length > 0 ? 'You win!' : 'Opponent wins!';
    document.getElementById('result').innerText = result;
    return;
  }
  const playerCard = playerHand.shift();
  const enemyCard = enemyHand.shift();
  renderHand([playerCard], document.getElementById('player-hand'), true);
  renderHand([enemyCard], document.getElementById('enemy-hand'), true);
  const playerValue = playerCard.getValue();
  const enemyValue = enemyCard.getValue();
  let result = '';
  if (playerValue > enemyValue) {
    playerHand.push(playerCard, enemyCard);
    result = 'You win this round!';
  } else if (enemyValue > playerValue) {
    enemyHand.push(enemyCard, playerCard);
    result = 'Opponent wins this round!';
  } else {
    const warCards = [playerCard, enemyCard];
    result = handleWar(playerHand, enemyHand, warCards);
  }
  document.getElementById('result').innerText = result;
  updateWarUI(playerHand, enemyHand);
}

function handleWar(playerHand, enemyHand, warCards) {
  if (playerHand.length < 3 || enemyHand.length < 3) {
    return playerHand.length > enemyHand.length ? 'You win the war!' : 'Opponent wins the war!';
  }
  const playerWarCards = playerHand.splice(0, 3);
  const enemyWarCards = enemyHand.splice(0, 3);
  warCards.push(...playerWarCards, ...enemyWarCards);
  const playerFinalCard = playerHand.shift();
  const enemyFinalCard = enemyHand.shift();
  warCards.push(playerFinalCard, enemyFinalCard);
  renderHand([playerFinalCard], document.getElementById('player-hand'), true);
  renderHand([enemyFinalCard], document.getElementById('enemy-hand'), true);
  const playerValue = playerFinalCard.getValue();
  const enemyValue = enemyFinalCard.getValue();
  if (playerValue > enemyValue) {
    playerHand.push(...warCards);
    return 'You win the war!';
  } else if (enemyValue > playerValue) {
    enemyHand.push(...warCards);
    return 'Opponent wins the war!';
  } else {
    return handleWar(playerHand, enemyHand, warCards);
  }
}

function playBlackjack() {
  const deck = new Deck();
  deck.shuffle();
  const playerHand = deck.deal(2);
  const dealerHand = deck.deal(2);
  showScreen('game-screen', 'Blackjack');
  updateBlackjackUI(playerHand, dealerHand);
  let hitButton = document.getElementById('hit-button');
  let standButton = document.getElementById('stand-button');
  if (!hitButton) {
    hitButton = document.createElement('button');
    hitButton.id = 'hit-button';
    hitButton.innerText = 'Hit';
    hitButton.classList.add('game-action-button');
    document.getElementById('game-area').appendChild(hitButton);
  }
  if (!standButton) {
    standButton = document.createElement('button');
    standButton.id = 'stand-button';
    standButton.innerText = 'Stand';
    standButton.classList.add('game-action-button');
    document.getElementById('game-area').appendChild(standButton);
  }
  hitButton.onclick = () => hit(deck, playerHand, dealerHand);
  standButton.onclick = () => stand(deck, playerHand, dealerHand);
  document.getElementById('play-turn').style.display = 'none';
}

function getBlackjackValue(hand) {
  let value = 0;
  let aces = 0;
  for (let card of hand) {
    if (card.rank === 'ace') {
      aces++;
    } else if (['king', 'queen', 'jack'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank) || 0;
    }
  }
  for (let i = 0; i < aces; i++) {
    if (value + 11 <= 21) {
      value += 11;
    } else {
      value += 1;
    }
  }
  return value;
}

function updateBlackjackUI(playerHand, dealerHand, revealDealer = false) {
  document.getElementById('player-card-count').innerText = `Value: ${getBlackjackValue(playerHand)}`;
  document.getElementById('enemy-card-count').innerText = revealDealer ? `Dealer Value: ${getBlackjackValue(dealerHand)}` : 'Dealer: ?';
  renderHand(playerHand, document.getElementById('player-hand'), true);
  renderHand(dealerHand, document.getElementById('enemy-hand'), revealDealer);
}

function hit(deck, playerHand, dealerHand) {
  playerHand.push(...deck.deal(1));
  const playerValue = getBlackjackValue(playerHand);
  updateBlackjackUI(playerHand, dealerHand);
  if (playerValue > 21) {
    document.getElementById('result').innerText = 'Bust! Dealer wins!';
    document.getElementById('hit-button').style.display = 'none';
    document.getElementById('stand-button').style.display = 'none';
  }
}

function stand(deck, playerHand, dealerHand) {
  let dealerValue = getBlackjackValue(dealerHand);
  while (dealerValue < 17) {
    dealerHand.push(...deck.deal(1));
    dealerValue = getBlackjackValue(dealerHand);
  }
  updateBlackjackUI(playerHand, dealerHand, true);
  const playerValue = getBlackjackValue(playerHand);
  let result = '';
  if (dealerValue > 21 || playerValue > dealerValue) {
    result = 'You win!';
  } else if (playerValue < dealerValue) {
    result = 'Dealer wins!';
  } else {
    result = 'Push!';
  }
  document.getElementById('result').innerText = result;
  document.getElementById('hit-button').style.display = 'none';
  document.getElementById('stand-button').style.display = 'none';
}

function viewDeck() {
  const deck = new Deck(true);
  showScreen('game-screen', 'Deck Viewer');
  renderHand(deck.cards, document.getElementById('player-hand'), true);
  document.getElementById('player-card-count').innerText = deck.cards.length;
  document.getElementById('enemy-hand').innerHTML = '';
  document.getElementById('enemy-card-count').innerText = '';
  document.getElementById('result').innerText = '';
  document.getElementById('play-turn').style.display = 'none';
}

let app, db, auth, currentUserId;
let doudizhuGameState = { gameState: 'lobby', gameId: null };
let selectedDoudizhuCards = [];

function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Multiplayer Doudizhu will not work.");
    alert("Firebase SDK not loaded. Multiplayer features are disabled.");
    currentUserId = 'local-user-' + Math.random().toString(36).substring(2, 9);
    const userIdSpan = document.getElementById('current-user-id');
    if (userIdSpan) {
      userIdSpan.innerText = currentUserId;
    }
    return false;
  }
  if (!window.firebaseConfig || !Object.keys(window.firebaseConfig).length || !window.firebaseConfig.apiKey || !window.firebaseConfig.projectId || !window.firebaseConfig.appId) {
    console.warn("Invalid or missing Firebase config. Running in standalone mode.");
    currentUserId = 'local-user-' + Math.random().toString(36).substring(2, 9);
    const userIdSpan = document.getElementById('current-user-id');
    if (userIdSpan) {
      userIdSpan.innerText = currentUserId;
    }
    return false;
  }
  try {
    app = firebase.initializeApp(window.firebaseConfig);
    db = firebase.firestore(app);
    auth = firebase.auth(app);
    console.log("Firebase initialized successfully.");
    return true;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return false;
  }
}

function playDoudizhu() {
  if (initializeFirebase()) {
    auth.signInAnonymously().then(userCredential => {
      currentUserId = userCredential.user.uid;
      document.getElementById('current-user-id').innerText = currentUserId;
      showScreen('doudizhu-lobby-screen');
      updateDoudizhuLobbyAndGameUI();
    }).catch(error => {
      console.error("Anonymous sign-in failed:", error);
      alert("Failed to sign in. Multiplayer features disabled.");
      currentUserId = 'local-user-' + Math.random().toString(36).substring(2, 9);
      document.getElementById('current-user-id').innerText = currentUserId;
      showScreen('doudizhu-lobby-screen');
    });
  } else {
    showScreen('doudizhu-lobby-screen');
  }
}

function updateDoudizhuLobbyAndGameUI() {
  if (doudizhuGameState.gameState === 'lobby') {
    showScreen('doudizhu-lobby-screen');
    document.getElementById('lobby-message').innerText = '';
    document.getElementById('current-game-code').style.display = doudizhuGameState.gameId ? 'block' : 'none';
    if (doudizhuGameState.gameId) {
      document.getElementById('display-game-code').innerText = doudizhuGameState.gameId;
    }
    const playerList = document.getElementById('lobby-player-list');
    playerList.innerHTML = '';
    if (db && doudizhuGameState.gameId) {
      db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).get().then(doc => {
        if (doc.exists) {
          const players = doc.data().players || [];
          players.forEach(player => {
            const li = document.createElement('li');
            li.innerText = player.id === currentUserId ? `${player.id} (You)` : player.id;
            playerList.appendChild(li);
          });
        }
      });
    }
  } else {
    showScreen('doudizhu-game-screen', 'Doudizhu');
    let doudizhuPlayButton = document.getElementById('doudizhu-play-button');
    let doudizhuPassButton = document.getElementById('doudizhu-pass-button');
    let doudizhuCallLandlordButton = document.getElementById('doudizhu-call-landlord-button');
    let doudizhuDontCallButton = document.getElementById('doudizhu-dont-call-button');
    if (!doudizhuPlayButton?.onclick) {
      doudizhuPlayButton = document.getElementById('doudizhu-play-button');
      if (doudizhuPlayButton) {
        doudizhuPlayButton.onclick = playDoudizhuCards;
        doudizhuPlayButton.classList.add('doudizhu-action-button');
      }
    }
    if (!doudizhuPassButton?.onclick) {
      doudizhuPassButton = document.getElementById('doudizhu-pass-button');
      if (doudizhuPassButton) {
        doudizhuPassButton.onclick = passDoudizhuTurn;
        doudizhuPassButton.classList.add('doudizhu-action-button');
      }
    }
    if (!doudizhuCallLandlordButton?.onclick) {
      doudizhuCallLandlordButton = document.getElementById('doudizhu-call-landlord-button');
      if (doudizhuCallLandlordButton) {
        doudizhuCallLandlordButton.onclick = () => handleBid(true);
      }
    }
    if (!doudizhuDontCallButton?.onclick) {
      doudizhuDontCallButton = document.getElementById('doudizhu-dont-call-button');
      if (doudizhuDontCallButton) {
        doudizhuDontCallButton.onclick = () => handleBid(false);
      }
    }
    if (db && doudizhuGameState.gameId) {
      db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          doudizhuGameState = { ...doudizhuGameState, ...data };
          renderDoudizhuGameUI();
        }
      });
    }
  }
}

function createGame() {
  if (!db) {
    alert("Multiplayer not available in standalone mode.");
    return;
  }
  const gameId = Math.random().toString(36).substring(2, 8);
  const gameData = {
    gameState: 'lobby',
    players: [{ id: currentUserId }],
    hands: {},
    currentPlayerIndex: 0,
    landlord: null,
    bottomCards: [],
    playedCards: [],
    currentPattern: null,
    passes: 0,
    lastPlayedBy: null
  };
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(gameId).set(gameData).then(() => {
    doudizhuGameState.gameId = gameId;
    updateDoudizhuLobbyAndGameUI();
  }).catch(error => {
    console.error("Error creating game:", error);
    document.getElementById('lobby-message').innerText = 'Failed to create game.';
  });
}

function joinGame() {
  if (!db) {
    alert("Multiplayer not available in standalone mode.");
    return;
  }
  const gameId = document.getElementById('game-code-input').value.trim();
  if (!gameId) {
    document.getElementById('lobby-message').innerText = 'Please enter a game code.';
    return;
  }
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(gameId).get().then(doc => {
    if (doc.exists) {
      const gameData = doc.data();
      if (gameData.players.length >= 3) {
        document.getElementById('lobby-message').innerText = 'Game is full.';
        return;
      }
      if (gameData.players.some(p => p.id === currentUserId)) {
        doudizhuGameState.gameId = gameId;
        updateDoudizhuLobbyAndGameUI();
        return;
      }
      gameData.players.push({ id: currentUserId });
      db.collection(`artifacts/${window.myAppId}/public/games`).doc(gameId).update({ players: gameData.players }).then(() => {
        doudizhuGameState.gameId = gameId;
        updateDoudizhuLobbyAndGameUI();
      });
    } else {
      document.getElementById('lobby-message').innerText = 'Invalid game code.';
    }
  }).catch(error => {
    console.error("Error joining game:", error);
    document.getElementById('lobby-message').innerText = 'Failed to join game.';
  });
}

function startDoudizhuGame() {
  if (!db || !doudizhuGameState.gameId) return;
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).get().then(doc => {
    if (doc.exists && doc.data().players.length === 3) {
      const deck = new Deck(true);
      deck.shuffle();
      const hands = deck.dealToPlayers(3, 17);
      const bottomCards = deck.deal(3);
      const gameData = {
        gameState: 'bidding',
        hands: {
          [doc.data().players[0].id]: hands[0].map(c => c.toString()),
          [doc.data().players[1].id]: hands[1].map(c => c.toString()),
          [doc.data().players[2].id]: hands[2].map(c => c.toString())
        },
        bottomCards: bottomCards.map(c => c.toString()),
        currentPlayerIndex: 0,
        landlord: null,
        playedCards: [],
        currentPattern: null,
        passes: 0,
        lastPlayedBy: null
      };
      db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).update(gameData).then(() => {
        updateDoudizhuLobbyAndGameUI();
      });
    }
  });
}

function handleBid(callLandlord) {
  if (!db || !doudizhuGameState.gameId) return;
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      if (data.gameState !== 'bidding' || data.players[data.currentPlayerIndex].id !== currentUserId) return;
      let nextIndex = (data.currentPlayerIndex + 1) % 3;
      let gameData = { currentPlayerIndex: nextIndex };
      if (callLandlord) {
        gameData = {
          gameState: 'playing',
          landlord: currentUserId,
          hands: {
            ...data.hands,
            [currentUserId]: [...data.hands[currentUserId], ...data.bottomCards]
          },
          bottomCards: [],
          currentPlayerIndex: data.players.findIndex(p => p.id === currentUserId)
        };
      } else if (data.currentPlayerIndex === 2 && !data.landlord) {
        startDoudizhuGame();
        return;
      }
      db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).update(gameData);
    }
  });
}

function renderDoudizhuGameUI() {
  if (!doudizhuGameState.hands) return;
  const playerHand = (doudizhuGameState.hands[currentUserId] || []).map(c => {
    const [rank, , suit] = c.split('_');
    return new Card(suit || null, rank);
  });
  const isCurrentPlayer = doudizhuGameState.players && doudizhuGameState.players[doudizhuGameState.currentPlayerIndex]?.id === currentUserId;
  renderDoudizhuHand(playerHand, document.getElementById('doudizhu-player-hand'), selectedDoudizhuCards, isCurrentPlayer);
  const opponent1Id = doudizhuGameState.players?.[1]?.id;
  const opponent2Id = doudizhuGameState.players?.[2]?.id;
  document.getElementById('opponent1-label').innerText = opponent1Id ? (opponent1Id === doudizhuGameState.landlord ? 'Landlord' : 'Opponent 1') : 'Waiting...';
  document.getElementById('opponent2-label').innerText = opponent2Id ? (opponent2Id === doudizhuGameState.landlord ? 'Landlord' : 'Opponent 2') : 'Waiting...';
  const opponent1Hand = (doudizhuGameState.hands[opponent1Id] || []).map(c => new Card(null, 'back'));
  const opponent2Hand = (doudizhuGameState.hands[opponent2Id] || []).map(c => new Card(null, 'back'));
  renderHand(opponent1Hand, document.getElementById('doudizhu-opponent1-hand'), false, 'doudizhu');
  renderHand(opponent2Hand, document.getElementById('doudizhu-opponent2-hand'), false, 'doudizhu');
  const playedCards = (doudizhuGameState.playedCards || []).map(c => {
    const [rank, , suit] = c.split('_');
    return new Card(suit || null, rank);
  });
  renderHand(playedCards, document.getElementById('doudizhu-played-cards'), true, 'doudizhu');
  document.getElementById('doudizhu-pattern-text').innerText = doudizhuGameState.currentPattern?.type || 'None';
  document.getElementById('doudizhu-action-buttons').style.display = isCurrentPlayer && doudizhuGameState.gameState === 'playing' ? 'block' : 'none';
  document.getElementById('doudizhu-bidding-buttons').style.display = isCurrentPlayer && doudizhuGameState.gameState === 'bidding' ? 'block' : 'none';
  if (doudizhuGameState.gameState === 'ended') {
    const isLandlord = doudizhuGameState.landlord === currentUserId;
    const landlordWon = doudizhuGameState.hands[doudizhuGameState.landlord]?.length === 0;
    const result = isLandlord === landlordWon ? 'You win!' : 'You lose!';
    document.getElementById('doudizhu-result').innerText = result;
  } else {
    document.getElementById('doudizhu-result').innerText = '';
  }
}

function playDoudizhuCards() {
  if (!db || !doudizhuGameState.gameId || !doudizhuGameState.players) return;
  if (doudizhuGameState.players[doudizhuGameState.currentPlayerIndex].id !== currentUserId) return;
  if (selectedDoudizhuCards.length === 0) {
    alert('Please select cards to play.');
    return;
  }
  const pattern = getPattern(selectedDoudizhuCards);
  if (!pattern) {
    alert('Invalid card combination.');
    return;
  }
  if (!canPlay(pattern, doudizhuGameState.currentPattern)) {
    alert('This combination cannot beat the current play.');
    return;
  }
  const playerHand = doudizhuGameState.hands[currentUserId].map(c => {
    const [rank, , suit] = c.split('_');
    return new Card(suit || null, rank);
  });
  selectedDoudizhuCards.forEach(card => {
    const index = playerHand.findIndex(c => c.toString() === card.toString());
    if (index !== -1) {
      playerHand.splice(index, 1);
    }
  });
  const gameData = {
    hands: {
      ...doudizhuGameState.hands,
      [currentUserId]: playerHand.map(c => c.toString())
    },
    playedCards: selectedDoudizhuCards.map(c => c.toString()),
    currentPattern: pattern,
    currentPlayerIndex: (doudizhuGameState.currentPlayerIndex + 1) % 3,
    passes: 0,
    lastPlayedBy: currentUserId
  };
  if (playerHand.length === 0) {
    gameData.gameState = 'ended';
  }
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).update(gameData).then(() => {
    selectedDoudizhuCards = [];
  }).catch(error => {
    console.error("Error playing cards:", error);
    alert('Failed to play cards.');
  });
}

function passDoudizhuTurn() {
  if (!db || !doudizhuGameState.gameId || !doudizhuGameState.players) return;
  if (doudizhuGameState.players[doudizhuGameState.currentPlayerIndex].id !== currentUserId) return;
  const passes = doudizhuGameState.passes + 1;
  let gameData = {
    currentPlayerIndex: (doudizhuGameState.currentPlayerIndex + 1) % 3,
    passes
  };
  if (passes >= 2) {
    gameData.playedCards = [];
    gameData.currentPattern = null;
    gameData.passes = 0;
    gameData.lastPlayedBy = null;
  }
  db.collection(`artifacts/${window.myAppId}/public/games`).doc(doudizhuGameState.gameId).update(gameData).catch(error => {
    console.error("Error passing turn:", error);
    alert('Failed to pass turn.');
  });
}

function getPattern(cards) {
  if (cards.length === 0) return null;
  const sortedCards = [...cards].sort((a, b) => a.getValue('doudizhu') - b.getValue('doudizhu'));
  const counts = new Map();
  sortedCards.forEach(card => {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  });
  const rankValues = [...new Set(sortedCards.map(c => c.getValue('doudizhu')))].sort((a, b) => a - b);
  if (cards.length === 1) {
    return { type: 'single', value: sortedCards[0].getValue('doudizhu'), cards };
  }
  if (cards.length === 2 && counts.size === 1) {
    return { type: 'pair', value: sortedCards[0].getValue('doudizhu'), cards };
  }
  if (cards.length === 2 && sortedCards[0].rank === 'black_joker' && sortedCards[1].rank === 'red_joker') {
    return { type: 'rocket', value: Infinity, cards };
  }
  if (cards.length >= 4 && counts.size === 1) {
    return { type: 'bomb', value: sortedCards[0].getValue('doudizhu'), cards };
  }
  if (cards.length === 3 && counts.size === 1) {
    return { type: 'trio', value: sortedCards[0].getValue('doudizhu'), cards };
  }
  if (cards.length === 4 && [...counts.values()].includes(3)) {
    const mainValue = [...counts.entries()].find(([_, count]) => count === 3)[0];
    return { type: 'trio_with_single', value: DOUDIZHU_RANKS.indexOf(mainValue), cards };
  }
  if (cards.length === 5 && [...counts.values()].includes(3) && [...counts.values()].includes(2)) {
    const mainValue = [...counts.entries()].find(([_, count]) => count === 3)[0];
    return { type: 'trio_with_pair', value: DOUDIZHU_RANKS.indexOf(mainValue), cards };
  }
  if (cards.length >= 5 && rankValues.every((v, i) => i === 0 || v === rankValues[i - 1] + 1) && counts.size === cards.length) {
    return { type: 'straight', value: rankValues[rankValues.length - 1], cards, length: cards.length };
  }
  if (cards.length >= 6 && cards.length % 2 === 0 && rankValues.every((v, i) => i === 0 || v === rankValues[i - 1] + 1) && [...counts.values()].every(c => c === 2)) {
    return { type: 'consecutive_pairs', value: rankValues[rankValues.length - 1], cards, length: cards.length / 2 };
  }
  return null;
}

function canPlay(newPattern, currentPattern) {
  if (!newPattern) return false;
  if (!currentPattern || currentPattern.type === 'none' || newPattern.type === 'rocket') return true;
  if (newPattern.type === 'bomb' && currentPattern.type !== 'bomb') return true;
  if (newPattern.type === 'bomb' && currentPattern.type === 'bomb') {
    return newPattern.value > currentPattern.value;
  }
  if (newPattern.type !== currentPattern.type) return false;
  if (['straight', 'consecutive_pairs'].includes(newPattern.type) && newPattern.length !== currentPattern.length) {
    return false;
  }
  return newPattern.value > currentPattern.value;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('play-war-button').onclick = playWar;
  document.getElementById('play-blackjack-button').onclick = playBlackjack;
  document.getElementById('view-deck-button').onclick = viewDeck;
  document.getElementById('play-doudizhu-button').onclick = playDoudizhu;
  document.getElementById('back-button').onclick = () => showScreen('menu-screen');
  document.getElementById('lobby-back-button').onclick = () => showScreen('menu-screen');
  document.getElementById('doudizhu-game-back-button').onclick = () => showScreen('menu-screen');
  document.getElementById('create-game-button').onclick = createGame;
  document.getElementById('join-game-button').onclick = joinGame;
});