import { GameEngine } from './src/GameEngine.js';
import { NetworkManager } from './src/NetworkManager.js';

class MultiplayerApp {
  constructor() {
    this.gameEngine = null;
    this.networkManager = null;
    this.isGameStarted = false;

    // UI elements
    this.loadingDiv = document.getElementById('loading');
    this.lobbyDiv = document.getElementById('multiplayer-lobby');
    this.lobbyMenu = document.getElementById('lobby-menu');
    this.waitingRoom = document.getElementById('waiting-room');
    this.gameUI = document.getElementById('game-ui');
    this.statusMessage = document.getElementById('status-message');

    // Buttons
    this.createRoomBtn = document.getElementById('create-room-btn');
    this.joinRoomBtn = document.getElementById('join-room-btn');
    this.leaveGameBtn = document.getElementById('leave-game-btn');
    this.endTurnBtn = document.getElementById('end-turn-btn');

    // Modal
    this.leaveConfirmModal = document.getElementById('leave-confirm-modal');
    this.confirmLeaveBtn = document.getElementById('confirm-leave-btn');
    this.cancelLeaveBtn = document.getElementById('cancel-leave-btn');

    // Inputs
    this.createNicknameInput = document.getElementById('create-nickname');
    this.joinNicknameInput = document.getElementById('join-nickname');
    this.roomCodeInput = document.getElementById('room-code');

    // Player data
    this.players = [];
  }

  async init() {
    try {
      console.log('MultiplayerApp: Starting initialization...');

      // Initialize NetworkManager
      this.networkManager = new NetworkManager();
      console.log('MultiplayerApp: NetworkManager created');

      // Connect to server
      // In production, use the same origin (Railway serves both frontend and backend)
      // In development, connect to separate backend server
      const serverUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin; // Production: same domain

      console.log('MultiplayerApp: Connecting to server:', serverUrl);
      this.loadingDiv.textContent = `Connecting to ${serverUrl}...`;

      await this.networkManager.connect(serverUrl);

      console.log('MultiplayerApp: Connected successfully!');
      this.setupEventListeners();
      this.setupNetworkCallbacks();

      // Check for existing session and attempt reconnection
      if (this.networkManager.hasSession()) {
        console.log('MultiplayerApp: Found existing session, attempting reconnection...');
        this.loadingDiv.textContent = 'Reconnecting to your game...';

        const reconnected = this.networkManager.reconnectToRoom();
        if (!reconnected) {
          // No valid session, show lobby
          this.loadingDiv.style.display = 'none';
          this.lobbyDiv.classList.remove('hidden');
        }
        // Otherwise wait for 'reconnected' event
      } else {
        // Show lobby
        this.loadingDiv.style.display = 'none';
        this.lobbyDiv.classList.remove('hidden');
      }

      console.log('MultiplayerApp initialized successfully');
    } catch (error) {
      console.error('Failed to initialize multiplayer:', error);
      this.loadingDiv.style.display = 'none';
      this.lobbyDiv.classList.remove('hidden');
      this.showStatus(`Failed to connect to server: ${error.message}. Please check the console.`, 'error');
    }
  }

  setupEventListeners() {
    this.createRoomBtn.addEventListener('click', () => {
      const nickname = this.createNicknameInput.value.trim() || 'Player 1';
      this.networkManager.createRoom(nickname);
      this.createRoomBtn.disabled = true;
      this.showStatus('Creating room...', 'info');
    });

    this.joinRoomBtn.addEventListener('click', () => {
      const nickname = this.joinNicknameInput.value.trim() || 'Player 2';
      const roomCode = this.roomCodeInput.value.trim().toUpperCase();

      if (!roomCode) {
        this.showStatus('Please enter a room code', 'error');
        return;
      }

      this.networkManager.joinRoom(roomCode, nickname);
      this.joinRoomBtn.disabled = true;
      this.showStatus('Joining room...', 'info');
    });

    this.leaveGameBtn.addEventListener('click', () => {
      this.showLeaveConfirmation();
    });

    this.confirmLeaveBtn.addEventListener('click', () => {
      this.hideLeaveConfirmation();
      this.leaveGame();
    });

    this.cancelLeaveBtn.addEventListener('click', () => {
      this.hideLeaveConfirmation();
    });

    // Close modal when clicking outside
    this.leaveConfirmModal.addEventListener('click', (e) => {
      if (e.target === this.leaveConfirmModal) {
        this.hideLeaveConfirmation();
      }
    });

    // Room code input formatting
    this.roomCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    // End Turn button
    if (this.endTurnBtn) {
      this.endTurnBtn.addEventListener('click', () => {
        this.endTurn();
      });
    }
  }

  setupNetworkCallbacks() {
    // Room created
    this.networkManager.onRoomCreated((data) => {
      console.log('Room created:', data);
      this.players = [{
        nickname: data.nickname,
        ship: data.playerShip
      }];

      this.showWaitingRoom(data.roomId);
      this.showStatus('Room created! Waiting for opponent...', 'success');
    });

    // Room joined
    this.networkManager.onRoomJoined((data) => {
      console.log('Room joined:', data);

      // Set players array from server data
      if (data.players) {
        this.players = data.players.map(p => ({
          nickname: p.nickname,
          ship: p.ship
        }));
      }

      this.showStatus('Joined room! Starting game...', 'success');

      // Start the game
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });

    // Another player joined
    this.networkManager.onPlayerJoined((data) => {
      console.log('Player joined:', data);
      this.players.push({
        nickname: data.nickname,
        ship: data.playerShip
      });

      this.updatePlayerList();
      this.showStatus('Opponent joined! Starting game...', 'success');

      // Update turn UI if game already started
      if (this.isGameStarted) {
        this.updateEndTurnButton();
        const currentTurn = this.networkManager.getCurrentTurn();
        const turnNumber = this.networkManager.getTurnNumber();
        this.updateTurnUI({ currentTurn, turnNumber }, false); // Don't show notification when player joins
      }

      // Start the game
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });

    // Player disconnected temporarily
    this.networkManager.onPlayerDisconnected((data) => {
      console.log('Player disconnected:', data);
      this.showConnectionStatus(`⚠️ ${data.nickname} disconnected. Waiting...`, 'warning');
    });

    // Player reconnected
    this.networkManager.onPlayerReconnected((data) => {
      console.log('Player reconnected:', data);
      this.showConnectionStatus(`✅ ${data.nickname} reconnected!`, 'success');
      setTimeout(() => this.hideConnectionStatus(), 3000);
    });

    // Successfully reconnected to room
    this.networkManager.onReconnected((data) => {
      console.log('Reconnected to room:', data);

      // Hide loading screen
      this.loadingDiv.style.display = 'none';

      // Set players array from server data
      if (data.players) {
        this.players = data.players.map(p => ({
          nickname: p.nickname,
          ship: p.ship
        }));
      }

      // Show lobby temporarily with success message
      this.lobbyDiv.classList.remove('hidden');
      this.showStatus('Reconnected successfully! Rejoining game...', 'success');

      // Start the game
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });

    // Player left permanently
    this.networkManager.onPlayerLeft((data) => {
      console.log('Player left permanently:', data);
      this.showStatus('Opponent left the game', 'error');

      // Return to lobby
      setTimeout(() => {
        this.networkManager.clearSession();
        this.returnToLobby();
      }, 2000);
    });

    // Error
    this.networkManager.onError((data) => {
      console.error('Network error:', data);

      // Hide loading if it's showing
      this.loadingDiv.style.display = 'none';

      // Show lobby if hidden
      this.lobbyDiv.classList.remove('hidden');

      // If reconnection failed, clear session
      if (data.message && (data.message.includes('Room not found') || data.message.includes('expired'))) {
        this.networkManager.clearSession();
        this.showStatus('Could not reconnect: ' + data.message, 'error');
      } else {
        this.showStatus(data.message || 'An error occurred', 'error');
      }

      this.createRoomBtn.disabled = false;
      this.joinRoomBtn.disabled = false;
    });

    // Disconnected
    this.networkManager.onDisconnected(() => {
      console.log('Disconnected from server');
      this.showStatus('Disconnected from server', 'error');

      // Return to loading screen
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });

    // Turn changed - NOTE: This must be set up AFTER GameEngine.enableMultiplayer()
    // to avoid being overwritten, OR we handle both UI and GameEngine updates here
    this.networkManager.onTurnChanged((data) => {
      console.log('MultiplayerApp: Turn changed event received:', data);
      this.updateTurnUI(data, true); // Show notification on turn change

      // Also update GameEngine controls if game is running
      if (this.gameEngine && this.gameEngine.isMultiplayer) {
        console.log('MultiplayerApp: Updating GameEngine for turn change');
        this.gameEngine.handleTurnChanged(data);
      }
    });
  }

  showWaitingRoom(roomCode) {
    this.lobbyMenu.style.display = 'none';
    this.waitingRoom.classList.add('active');
    document.getElementById('display-room-code').textContent = roomCode;
    this.updatePlayerList();
  }

  updatePlayerList() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    this.players.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = `player-item ${player.ship}`;
      playerDiv.innerHTML = `
        <span>${player.nickname}</span>
        <span class="ship-badge ${player.ship}">${player.ship.toUpperCase()}</span>
      `;
      container.appendChild(playerDiv);
    });
  }

  async startGame() {
    if (this.isGameStarted) return;

    this.isGameStarted = true;

    console.log('Starting game...');

    // Hide lobby, show game UI
    this.lobbyDiv.classList.add('hidden');
    this.gameUI.classList.add('active');

    // Initialize GameEngine
    this.gameEngine = new GameEngine();
    await this.gameEngine.init();

    // Enable multiplayer mode
    const playerShip = this.networkManager.getPlayerShip();
    this.gameEngine.enableMultiplayer(this.networkManager, playerShip);

    // Update UI with player info
    document.getElementById('info-room-code').textContent = this.networkManager.getRoomId();
    document.getElementById('info-your-ship').textContent = playerShip.toUpperCase();
    document.getElementById('your-ship-color').textContent = `${playerShip} ship`;
    document.getElementById('your-ship-color').style.color = playerShip === 'red' ? '#ef4444' : '#3b82f6';

    // Get opponent info
    const opponent = this.players.find(p => p.ship !== playerShip);
    if (opponent) {
      document.getElementById('info-opponent').textContent = opponent.nickname;
    }

    // Make GameEngine globally accessible for debugging
    window.gameEngine = this.gameEngine;

    // Setup event listeners
    this.setupGameEventListeners();

    // Initialize turn UI
    this.initializeTurnUI();

    // Start the game
    this.gameEngine.start();

    console.log('Game started successfully');
  }

  setupGameEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.gameEngine) {
        this.gameEngine.handleResize();
      }
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (this.gameEngine) {
        if (document.hidden) {
          this.gameEngine.stop();
        } else {
          this.gameEngine.start();
        }
      }
    });

    // Setup dice rolling
    this.setupDiceRolling();
  }

  setupDiceRolling() {
    const rollButton = document.getElementById('roll-dice-btn');
    const die1Element = document.getElementById('die1');
    const die2Element = document.getElementById('die2');
    const totalElement = document.getElementById('dice-total');

    if (rollButton && this.gameEngine) {
      rollButton.addEventListener('click', () => {
        // Add rolling animation
        die1Element.classList.add('rolling');
        die2Element.classList.add('rolling');

        // Roll the dice after a short delay for animation
        setTimeout(() => {
          const result = this.gameEngine.rollDice();

          // Update UI
          die1Element.textContent = result.dice1;
          die2Element.textContent = result.dice2;
          totalElement.textContent = result.total;

          // Remove rolling animation
          die1Element.classList.remove('rolling');
          die2Element.classList.remove('rolling');
        }, 500);
      });

      // Setup callback for dice roll events
      this.gameEngine.onDiceRoll((dice1, dice2, total) => {
        console.log(`Dice roll event: ${dice1} + ${dice2} = ${total}`);
      });
    }
  }

  showLeaveConfirmation() {
    this.leaveConfirmModal.classList.add('active');
  }

  hideLeaveConfirmation() {
    this.leaveConfirmModal.classList.remove('active');
  }

  leaveGame() {
    // Clear localStorage
    localStorage.removeItem('space_scrap_session');
    console.log('MultiplayerApp: Cleared localStorage session');

    if (this.gameEngine) {
      this.gameEngine.dispose();
      this.gameEngine = null;
    }

    if (this.networkManager) {
      this.networkManager.disconnect();
    }

    // Return to home
    window.location.href = 'index.html';
  }

  returnToLobby() {
    if (this.gameEngine) {
      this.gameEngine.dispose();
      this.gameEngine = null;
    }

    this.isGameStarted = false;
    this.players = [];

    this.gameUI.classList.remove('active');
    this.waitingRoom.classList.remove('active');
    this.lobbyMenu.style.display = 'block';
    this.lobbyDiv.classList.remove('hidden');

    this.createRoomBtn.disabled = false;
    this.joinRoomBtn.disabled = false;

    // Clear inputs
    this.roomCodeInput.value = '';
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = type;
  }

  showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connection-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';

      // Set colors based on type
      if (type === 'warning') {
        statusDiv.style.backgroundColor = 'rgba(234, 179, 8, 0.2)';
        statusDiv.style.border = '1px solid #eab308';
        statusDiv.style.color = '#fef08a';
      } else if (type === 'success') {
        statusDiv.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
        statusDiv.style.border = '1px solid #22c55e';
        statusDiv.style.color = '#86efac';
      }
    }
  }

  hideConnectionStatus() {
    const statusDiv = document.getElementById('connection-status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  initializeTurnUI() {
    const currentTurn = this.networkManager.getCurrentTurn();
    const turnNumber = this.networkManager.getTurnNumber();
    const isMyTurn = this.networkManager.isMyTurn();

    console.log('Initializing turn UI:', { currentTurn, turnNumber, isMyTurn, playerCount: this.players.length });

    this.updateTurnUI({ currentTurn, turnNumber }, false); // Don't show notification on init

    // Update button state based on player count
    this.updateEndTurnButton();
  }

  updateTurnUI(data, showNotification = true) {
    const isMyTurn = this.networkManager.isMyTurn();
    const turnStatusDiv = document.getElementById('turn-status');
    const turnNumberSpan = document.getElementById('turn-number');

    console.log('Updating turn UI:', {
      currentTurn: data.currentTurn,
      turnNumber: data.turnNumber,
      isMyTurn,
      playerCount: this.players.length,
      playerShip: this.networkManager.getPlayerShip()
    });

    // Update turn number
    if (turnNumberSpan) {
      turnNumberSpan.textContent = data.turnNumber;
    }

    // Update turn status
    if (turnStatusDiv) {
      if (this.players.length < 2) {
        turnStatusDiv.textContent = 'WAITING FOR OPPONENT';
        turnStatusDiv.className = 'turn-status waiting';
      } else if (isMyTurn) {
        turnStatusDiv.textContent = 'YOUR TURN';
        turnStatusDiv.className = 'turn-status active';
      } else {
        turnStatusDiv.textContent = "OPPONENT'S TURN";
        turnStatusDiv.className = 'turn-status waiting';
      }
    }

    // Update End Turn button
    this.updateEndTurnButton();

    // Show brief notification when turn changes (only if 2 players and not initial load)
    if (this.players.length >= 2 && showNotification) {
      this.showTurnChangeNotification(isMyTurn);
    }
  }

  updateEndTurnButton() {
    const endTurnBtn = document.getElementById('end-turn-btn');
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const isMyTurn = this.networkManager.isMyTurn();

    if (endTurnBtn) {
      // Disable if not player's turn OR if waiting for opponent
      endTurnBtn.disabled = !isMyTurn || this.players.length < 2;
    }

    if (rollDiceBtn) {
      // Enable roll dice button only on player's turn with 2 players
      rollDiceBtn.disabled = !isMyTurn || this.players.length < 2;
    }
  }

  showTurnChangeNotification(isMyTurn) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('turn-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'turn-notification';
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        padding: 2rem 3rem;
        border-radius: 12px;
        border: 3px solid ${isMyTurn ? '#22c55e' : '#ef4444'};
        text-align: center;
        z-index: 200;
        font-size: 2rem;
        font-weight: 700;
        color: ${isMyTurn ? '#22c55e' : '#ef4444'};
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(notification);
    }

    notification.textContent = isMyTurn ? 'YOUR TURN!' : "OPPONENT'S TURN";
    notification.style.borderColor = isMyTurn ? '#22c55e' : '#ef4444';
    notification.style.color = isMyTurn ? '#22c55e' : '#ef4444';
    notification.style.opacity = '1';

    // Hide after 2 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 2000);
  }

  endTurn() {
    console.log('EndTurn called. Current state:', {
      isMyTurn: this.networkManager.isMyTurn(),
      currentTurn: this.networkManager.getCurrentTurn(),
      playerShip: this.networkManager.getPlayerShip(),
      playerCount: this.players.length
    });

    if (!this.networkManager.isMyTurn()) {
      console.log('Cannot end turn - not your turn');
      return;
    }

    // Check if opponent is in the game
    if (this.players.length < 2) {
      this.showConnectionStatus('⚠️ Waiting for opponent to join before ending turn', 'warning');
      setTimeout(() => this.hideConnectionStatus(), 3000);
      return;
    }

    console.log('Sending end-turn event to server...');
    this.networkManager.endTurn();
  }
}

// Initialize and start the application
const app = new MultiplayerApp();

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}

// Export for global access
window.MultiplayerApp = app;
