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
      const serverUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin;

      console.log('MultiplayerApp: Connecting to server:', serverUrl);
      this.loadingDiv.textContent = `Connecting to ${serverUrl}...`;

      await this.networkManager.connect(serverUrl);

      console.log('MultiplayerApp: Connected successfully!');
      this.setupEventListeners();
      this.setupNetworkCallbacks();

      // Show lobby
      this.loadingDiv.style.display = 'none';
      this.lobbyDiv.classList.remove('hidden');

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
      this.leaveGame();
    });

    // Room code input formatting
    this.roomCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
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

      // Start the game
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });

    // Player left
    this.networkManager.onPlayerLeft((data) => {
      console.log('Player left:', data);
      this.showStatus('Opponent left the game', 'error');

      // Return to lobby
      setTimeout(() => {
        this.returnToLobby();
      }, 2000);
    });

    // Error
    this.networkManager.onError((data) => {
      console.error('Network error:', data);
      this.showStatus(data.message || 'An error occurred', 'error');
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
  }

  leaveGame() {
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
