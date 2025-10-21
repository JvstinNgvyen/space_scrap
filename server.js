import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration for production and development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || '*'] // In production, use environment variable
    : '*', // In development, allow all origins
  methods: ["GET", "POST"],
  credentials: true
};

const io = new Server(httpServer, {
  cors: corsOptions
});

const PORT = process.env.PORT || 3000;

// Game rooms storage
const rooms = new Map();

// Disconnection grace period (60 seconds)
const DISCONNECTION_GRACE_PERIOD = 60000;

// Room structure:
// {
//   id: string,
//   players: [{ id, ship, nickname, connected, disconnectedAt }],
//   gameState: { redShip: {}, blueShip: {} }
// }

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (data) => {
    const roomId = generateRoomId();
    const nickname = data?.nickname || 'Player 1';

    rooms.set(roomId, {
      id: roomId,
      players: [{
        id: socket.id,
        ship: 'red',
        nickname: nickname,
        connected: true,
        disconnectedAt: null
      }],
      gameState: {
        redShip: { position: null, rotation: null, scale: null },
        blueShip: { position: null, rotation: null, scale: null }
      }
    });

    socket.join(roomId);
    socket.emit('room-created', {
      roomId,
      playerShip: 'red',
      nickname: nickname
    });

    console.log(`Room created: ${roomId} by ${socket.id}`);
  });

  // Join an existing room
  socket.on('join-room', (data) => {
    const { roomId, nickname } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Assign the blue ship to the second player
    const playerShip = 'blue';
    const playerNickname = nickname || 'Player 2';

    room.players.push({
      id: socket.id,
      ship: playerShip,
      nickname: playerNickname,
      connected: true,
      disconnectedAt: null
    });

    socket.join(roomId);

    // Notify the joining player (send them the full player list)
    socket.emit('room-joined', {
      roomId,
      playerShip,
      nickname: playerNickname,
      gameState: room.gameState,
      players: room.players // Send all players including Player 1
    });

    // Notify the other player
    socket.to(roomId).emit('player-joined', {
      playerShip,
      nickname: playerNickname
    });

    console.log(`Player ${socket.id} joined room: ${roomId} as ${playerShip} ship`);
  });

  // Handle ship transformation updates
  socket.on('ship-update', (data) => {
    const { roomId, ship, transform } = data;
    const room = rooms.get(roomId);

    if (!room) return;

    // Update game state
    if (ship === 'red') {
      room.gameState.redShip = transform;
    } else if (ship === 'blue') {
      room.gameState.blueShip = transform;
    }

    // Broadcast to other players in the room
    socket.to(roomId).emit('ship-updated', {
      ship,
      transform
    });
  });

  // Handle ship mode changes (translate, rotate, scale)
  socket.on('transform-mode-change', (data) => {
    const { roomId, mode } = data;
    socket.to(roomId).emit('transform-mode-changed', { mode });
  });

  // Handle ship selection changes
  socket.on('ship-selection-change', (data) => {
    const { roomId, ship } = data;
    socket.to(roomId).emit('ship-selection-changed', { ship });
  });

  // Handle reconnection
  socket.on('reconnect-room', (data) => {
    const { roomId, playerShip } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found or expired' });
      return;
    }

    // Find the player by ship (in case they have a new socket ID)
    const player = room.players.find(p => p.ship === playerShip);

    if (!player) {
      socket.emit('error', { message: 'Player not found in this room' });
      return;
    }

    // Update player's socket ID and mark as connected
    player.id = socket.id;
    player.connected = true;
    player.disconnectedAt = null;

    socket.join(roomId);

    // Send current game state and player list
    socket.emit('reconnected', {
      roomId,
      playerShip,
      nickname: player.nickname,
      gameState: room.gameState,
      players: room.players
    });

    // Notify other players
    socket.to(roomId).emit('player-reconnected', {
      playerShip,
      nickname: player.nickname
    });

    console.log(`Player ${socket.id} reconnected to room: ${roomId} as ${playerShip} ship`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Find and mark player as disconnected (don't remove immediately)
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);

      if (player) {
        player.connected = false;
        player.disconnectedAt = Date.now();

        // Notify remaining players
        socket.to(roomId).emit('player-disconnected', {
          playerShip: player.ship,
          nickname: player.nickname
        });

        console.log(`Player ${player.nickname} (${player.ship}) disconnected from room ${roomId}. Grace period: ${DISCONNECTION_GRACE_PERIOD}ms`);

        // Schedule cleanup after grace period
        setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (!currentRoom) return;

          const currentPlayer = currentRoom.players.find(p => p.ship === player.ship);

          // Only remove if still disconnected after grace period
          if (currentPlayer && !currentPlayer.connected) {
            const playerIndex = currentRoom.players.indexOf(currentPlayer);
            currentRoom.players.splice(playerIndex, 1);

            console.log(`Player ${currentPlayer.nickname} removed from room ${roomId} after grace period`);

            // Notify remaining players
            io.to(roomId).emit('player-left', {
              playerShip: currentPlayer.ship,
              nickname: currentPlayer.nickname
            });

            // Delete room if empty
            if (currentRoom.players.length === 0) {
              rooms.delete(roomId);
              console.log(`Room deleted: ${roomId}`);
            }
          }
        }, DISCONNECTION_GRACE_PERIOD);

        break;
      }
    }
  });

  // Get room info
  socket.on('get-room-info', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    socket.emit('room-info', {
      roomId: room.id,
      players: room.players,
      gameState: room.gameState
    });
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for multiplayer connections`);
});

// Helper function to generate room IDs
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
