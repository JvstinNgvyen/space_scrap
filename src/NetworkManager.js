import { io } from 'socket.io-client';

export class NetworkManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.roomId = null;
    this.playerShip = null; // 'red' or 'blue'
    this.nickname = null;
    this.currentTurn = null; // 'red' or 'blue'
    this.turnNumber = 0;
    this.callbacks = {
      onRoomCreated: null,
      onRoomJoined: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onPlayerDisconnected: null,
      onPlayerReconnected: null,
      onReconnected: null,
      onShipUpdated: null,
      onTurnChanged: null,
      onError: null,
      onConnected: null,
      onDisconnected: null
    };
  }

  connect(serverUrl = 'http://localhost:3000') {
    console.log('NetworkManager: Connecting to server...', serverUrl);

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      console.log('NetworkManager: Socket.IO instance created');

      this.setupSocketListeners();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('NetworkManager: Connection timeout after 20 seconds');
          reject(new Error('Connection timeout - server may not be running'));
        }, 20000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.log('NetworkManager: Connected to server successfully!');
          if (this.callbacks.onConnected) {
            this.callbacks.onConnected();
          }
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('NetworkManager: Connection error:', error);
          // Don't reject immediately, let it retry
        });

        this.socket.on('disconnect', (reason) => {
          console.log('NetworkManager: Disconnected:', reason);
        });
      });
    } catch (error) {
      console.error('NetworkManager: Failed to create socket:', error);
      return Promise.reject(error);
    }
  }

  setupSocketListeners() {
    // Room created event
    this.socket.on('room-created', (data) => {
      console.log('NetworkManager: Room created:', data);
      this.roomId = data.roomId;
      this.playerShip = data.playerShip;
      this.nickname = data.nickname;
      this.currentTurn = data.currentTurn;
      this.turnNumber = data.turnNumber;

      // Save session for reconnection
      this.saveSession();

      if (this.callbacks.onRoomCreated) {
        this.callbacks.onRoomCreated(data);
      }
    });

    // Room joined event
    this.socket.on('room-joined', (data) => {
      console.log('NetworkManager: Room joined:', data);
      this.roomId = data.roomId;
      this.playerShip = data.playerShip;
      this.nickname = data.nickname;
      this.currentTurn = data.currentTurn;
      this.turnNumber = data.turnNumber;

      // Save session for reconnection
      this.saveSession();

      if (this.callbacks.onRoomJoined) {
        this.callbacks.onRoomJoined(data);
      }
    });

    // Another player joined
    this.socket.on('player-joined', (data) => {
      console.log('NetworkManager: Player joined:', data);

      if (this.callbacks.onPlayerJoined) {
        this.callbacks.onPlayerJoined(data);
      }
    });

    // Player left permanently
    this.socket.on('player-left', (data) => {
      console.log('NetworkManager: Player left permanently:', data);

      if (this.callbacks.onPlayerLeft) {
        this.callbacks.onPlayerLeft(data);
      }
    });

    // Player disconnected (temporarily)
    this.socket.on('player-disconnected', (data) => {
      console.log('NetworkManager: Player disconnected:', data);

      if (this.callbacks.onPlayerDisconnected) {
        this.callbacks.onPlayerDisconnected(data);
      }
    });

    // Player reconnected
    this.socket.on('player-reconnected', (data) => {
      console.log('NetworkManager: Player reconnected:', data);

      if (this.callbacks.onPlayerReconnected) {
        this.callbacks.onPlayerReconnected(data);
      }
    });

    // Successfully reconnected to room
    this.socket.on('reconnected', (data) => {
      console.log('NetworkManager: Reconnected to room:', data);
      this.roomId = data.roomId;
      this.playerShip = data.playerShip;
      this.nickname = data.nickname;
      this.currentTurn = data.currentTurn;
      this.turnNumber = data.turnNumber;

      if (this.callbacks.onReconnected) {
        this.callbacks.onReconnected(data);
      }
    });

    // Ship updated by remote player
    this.socket.on('ship-updated', (data) => {
      console.log('NetworkManager: Ship updated:', data);

      if (this.callbacks.onShipUpdated) {
        this.callbacks.onShipUpdated(data);
      }
    });

    // Turn changed event
    this.socket.on('turn-changed', (data) => {
      console.log('NetworkManager: Turn changed:', data);
      this.currentTurn = data.currentTurn;
      this.turnNumber = data.turnNumber;

      if (this.callbacks.onTurnChanged) {
        this.callbacks.onTurnChanged(data);
      }
    });

    // Error event
    this.socket.on('error', (data) => {
      console.error('NetworkManager: Error:', data);

      if (this.callbacks.onError) {
        this.callbacks.onError(data);
      }
    });

    // Disconnected event
    this.socket.on('disconnect', () => {
      console.log('NetworkManager: Disconnected from server');
      this.isConnected = false;

      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected();
      }
    });
  }

  createRoom(nickname = 'Player 1') {
    if (!this.socket || !this.isConnected) {
      console.error('NetworkManager: Not connected to server');
      return;
    }

    console.log('NetworkManager: Creating room...');
    this.socket.emit('create-room', { nickname });
  }

  joinRoom(roomId, nickname = 'Player 2') {
    if (!this.socket || !this.isConnected) {
      console.error('NetworkManager: Not connected to server');
      return;
    }

    console.log('NetworkManager: Joining room:', roomId);
    this.socket.emit('join-room', { roomId, nickname });
  }

  reconnectToRoom() {
    if (!this.socket || !this.isConnected) {
      console.error('NetworkManager: Not connected to server');
      return false;
    }

    const session = this.loadSession();
    if (!session || !session.roomId || !session.playerShip) {
      console.log('NetworkManager: No valid session to reconnect');
      return false;
    }

    console.log('NetworkManager: Attempting to reconnect to room:', session.roomId);
    this.socket.emit('reconnect-room', {
      roomId: session.roomId,
      playerShip: session.playerShip
    });

    return true;
  }

  sendShipUpdate(ship, transform) {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    // Only send updates for the ship this player controls
    if (ship !== this.playerShip) {
      return;
    }

    this.socket.emit('ship-update', {
      roomId: this.roomId,
      ship,
      transform
    });
  }

  sendTransformModeChange(mode) {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    this.socket.emit('transform-mode-change', {
      roomId: this.roomId,
      mode
    });
  }

  sendShipSelectionChange(ship) {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    this.socket.emit('ship-selection-change', {
      roomId: this.roomId,
      ship
    });
  }

  endTurn() {
    if (!this.socket || !this.isConnected || !this.roomId) {
      console.error('NetworkManager: Cannot end turn - not connected or not in room');
      return;
    }

    console.log('NetworkManager: Ending turn');
    this.socket.emit('end-turn', {
      roomId: this.roomId
    });
  }

  getRoomInfo() {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    this.socket.emit('get-room-info', { roomId: this.roomId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.roomId = null;
      this.playerShip = null;
      this.nickname = null;
      console.log('NetworkManager: Disconnected');
    }
  }

  // Callback setters
  onRoomCreated(callback) {
    this.callbacks.onRoomCreated = callback;
  }

  onRoomJoined(callback) {
    this.callbacks.onRoomJoined = callback;
  }

  onPlayerJoined(callback) {
    this.callbacks.onPlayerJoined = callback;
  }

  onPlayerLeft(callback) {
    this.callbacks.onPlayerLeft = callback;
  }

  onShipUpdated(callback) {
    this.callbacks.onShipUpdated = callback;
  }

  onError(callback) {
    this.callbacks.onError = callback;
  }

  onConnected(callback) {
    this.callbacks.onConnected = callback;
  }

  onDisconnected(callback) {
    this.callbacks.onDisconnected = callback;
  }

  onPlayerDisconnected(callback) {
    this.callbacks.onPlayerDisconnected = callback;
  }

  onPlayerReconnected(callback) {
    this.callbacks.onPlayerReconnected = callback;
  }

  onReconnected(callback) {
    this.callbacks.onReconnected = callback;
  }

  onTurnChanged(callback) {
    this.callbacks.onTurnChanged = callback;
  }

  // Getters
  getPlayerShip() {
    return this.playerShip;
  }

  getRoomId() {
    return this.roomId;
  }

  getNickname() {
    return this.nickname;
  }

  isInRoom() {
    return this.roomId !== null;
  }

  getCurrentTurn() {
    return this.currentTurn;
  }

  getTurnNumber() {
    return this.turnNumber;
  }

  isMyTurn() {
    return this.currentTurn === this.playerShip;
  }

  // Session management for reconnection
  saveSession() {
    if (this.roomId && this.playerShip && this.nickname) {
      const session = {
        roomId: this.roomId,
        playerShip: this.playerShip,
        nickname: this.nickname,
        timestamp: Date.now()
      };
      localStorage.setItem('space_scrap_session', JSON.stringify(session));
      console.log('NetworkManager: Session saved', session);
    }
  }

  loadSession() {
    try {
      const sessionData = localStorage.getItem('space_scrap_session');
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session is less than 1 hour old
      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - session.timestamp > ONE_HOUR) {
        console.log('NetworkManager: Session expired');
        this.clearSession();
        return null;
      }

      console.log('NetworkManager: Session loaded', session);
      return session;
    } catch (error) {
      console.error('NetworkManager: Failed to load session', error);
      return null;
    }
  }

  clearSession() {
    localStorage.removeItem('space_scrap_session');
    console.log('NetworkManager: Session cleared');
  }

  hasSession() {
    const session = this.loadSession();
    return session !== null;
  }

  // Profile management
  saveProfile(profileData) {
    try {
      const profile = {
        ...profileData,
        lastUpdated: Date.now()
      };
      localStorage.setItem('space_scrap_profile', JSON.stringify(profile));
      console.log('NetworkManager: Profile saved', profile);
      return true;
    } catch (error) {
      console.error('NetworkManager: Failed to save profile', error);
      return false;
    }
  }

  loadProfile() {
    try {
      const profileData = localStorage.getItem('space_scrap_profile');
      if (!profileData) return null;

      const profile = JSON.parse(profileData);
      console.log('NetworkManager: Profile loaded', profile);
      return profile;
    } catch (error) {
      console.error('NetworkManager: Failed to load profile', error);
      return null;
    }
  }

  getProfileNickname() {
    const profile = this.loadProfile();
    return profile ? profile.nickname : null;
  }

  getPreferredShip() {
    const profile = this.loadProfile();
    return profile ? profile.preferredShip : 'red';
  }

  // Game statistics
  loadStats() {
    try {
      const statsData = localStorage.getItem('space_scrap_stats');
      if (!statsData) {
        return {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0
        };
      }

      const stats = JSON.parse(statsData);
      return stats;
    } catch (error) {
      console.error('NetworkManager: Failed to load stats', error);
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0
      };
    }
  }

  saveStats(statsData) {
    try {
      localStorage.setItem('space_scrap_stats', JSON.stringify(statsData));
      console.log('NetworkManager: Stats saved', statsData);
      return true;
    } catch (error) {
      console.error('NetworkManager: Failed to save stats', error);
      return false;
    }
  }

  updateGameResult(won) {
    const stats = this.loadStats();
    stats.gamesPlayed += 1;
    if (won) {
      stats.gamesWon += 1;
    } else {
      stats.gamesLost += 1;
    }
    this.saveStats(stats);
    return stats;
  }
}
