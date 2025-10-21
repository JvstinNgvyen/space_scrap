import { io } from 'socket.io-client';

export class NetworkManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.roomId = null;
    this.playerShip = null; // 'red' or 'blue'
    this.nickname = null;
    this.callbacks = {
      onRoomCreated: null,
      onRoomJoined: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onShipUpdated: null,
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

    // Player left
    this.socket.on('player-left', (data) => {
      console.log('NetworkManager: Player left:', data);

      if (this.callbacks.onPlayerLeft) {
        this.callbacks.onPlayerLeft(data);
      }
    });

    // Ship updated by remote player
    this.socket.on('ship-updated', (data) => {
      console.log('NetworkManager: Ship updated:', data);

      if (this.callbacks.onShipUpdated) {
        this.callbacks.onShipUpdated(data);
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
}
