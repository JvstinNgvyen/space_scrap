import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Game rooms storage
const rooms = new Map();

// Room structure:
// {
//   id: string,
//   players: [{ id, ship, nickname }],
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
        nickname: nickname
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
      nickname: playerNickname
    });

    socket.join(roomId);

    // Notify the joining player
    socket.emit('room-joined', {
      roomId,
      playerShip,
      nickname: playerNickname,
      gameState: room.gameState
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

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Find and cleanup rooms
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        // Notify remaining players
        socket.to(roomId).emit('player-left', {
          playerShip: disconnectedPlayer.ship,
          nickname: disconnectedPlayer.nickname
        });

        // Delete room if empty
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
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
