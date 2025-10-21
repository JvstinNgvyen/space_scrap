# Space Scrap

An interactive 3D board game built with Three.js where players control spaceships on a game board. Now with **multiplayer support**!

## Features

### Single Player Mode
- Control two ships (red and blue) on a 3D game board
- Intuitive transform controls for moving, rotating, and scaling ships
- Beautiful lighting and shadow effects
- Smooth camera controls

### Multiplayer Mode (NEW!)
- **Play with friends over the network**
- Real-time ship synchronization
- Room-based matchmaking system
- Each player controls their own ship (red or blue)
- Simple room code system for easy joining

## Technologies

- **Three.js** (v0.168.0) - 3D graphics and WebGL rendering
- **Socket.IO** (v4.7.0) - Real-time multiplayer communication
- **Express** (v4.18.0) - Backend server
- **Vite** (v5.0.0) - Fast development and building

## Getting Started

### Installation

```bash
npm install
```

### Running the Game

#### Single Player Mode

Start the development server:

```bash
npm run dev
```

Then open your browser to `http://localhost:5173` and click "single player".

#### Multiplayer Mode

For multiplayer, you need to run both the game client and the server:

```bash
npm run dev:multiplayer
```

This will start:
- Vite dev server on `http://localhost:5173`
- Socket.IO server on `http://localhost:3000`

**Note:** You can also run them separately:
```bash
# Terminal 1 - Start the game client
npm run dev

# Terminal 2 - Start the multiplayer server
npm run server
```

### How to Play Multiplayer

1. **Player 1** (Host):
   - Click "multiplayer" on the home page
   - Click "Create Room"
   - Share the room code with Player 2

2. **Player 2** (Guest):
   - Click "multiplayer" on the home page
   - Enter the room code
   - Click "Join Room"

3. The game starts automatically when both players join!

## Controls

### Ship Controls
- **G** - Translate mode (move position)
- **R** - Rotate mode (change orientation)
- **S** - Scale mode (resize ship)
- **1** - Switch to red ship (single player only)
- **2** - Switch to blue ship (single player only)
- **ESC** - Detach controls

### Camera Controls
- **Left Mouse Button** - Rotate camera around the board
- **Right Mouse Button** - Pan camera
- **Mouse Wheel** - Zoom in/out

### Transform Controls
- Click and drag the colored arrows/rings to move, rotate, or scale ships
- X axis - Red
- Y axis - Green
- Z axis - Blue

## Multiplayer Architecture

### Server (`server.js`)
- Handles room creation and management
- Synchronizes ship transformations between players
- Manages player connections and disconnections
- Room-based system with unique codes

### Client (`src/NetworkManager.js`)
- Connects to the Socket.IO server
- Sends local ship updates to server
- Receives and applies remote ship updates
- Handles lobby and matchmaking UI

### Game Engine Integration
- `GameEngine.enableMultiplayer()` - Activates multiplayer mode
- Automatic ship assignment (red or blue)
- Prevents players from controlling opponent's ship
- Real-time position, rotation, and scale synchronization

## Project Structure

```
space_scrap/
├── app.js                      # Single player entry point
├── multiplayer-app.js          # Multiplayer entry point
├── server.js                   # Socket.IO server
├── index.html                  # Home page
├── game.html                   # Single player game page
├── multiplayer.html            # Multiplayer game page
├── src/
│   ├── GameEngine.js          # Core 3D game engine
│   └── NetworkManager.js      # Multiplayer networking
├── static/
│   ├── models/                # 3D models (glTF)
│   └── Game_Board_Default.png # Board texture
└── package.json               # Dependencies and scripts
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

For production deployment, make sure to:
1. Set `NODE_ENV=production`
2. Update the server URL in `multiplayer-app.js` if needed
3. Configure your server to serve the static files and run the Socket.IO server

## Development

### Scripts
- `npm run dev` - Start Vite dev server (single player)
- `npm run server` - Start Socket.IO server only
- `npm run dev:multiplayer` - Start both client and server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Debugging
The game engine is exposed globally for debugging:
- **Single player:** `window.gameEngine`
- **Multiplayer:** `window.gameEngine` and `window.MultiplayerApp`

You can inspect and manipulate the game state from the browser console.

## Troubleshooting

### Multiplayer connection issues
- Make sure the server is running (`npm run server`)
- Check that port 3000 is not blocked by firewall
- Verify both players are on the same network (or use ngrok for remote play)

### Ships not appearing
- Check the browser console for loading errors
- Ensure all static assets are in the correct directories
- Verify the 3D model files are not corrupted

### Performance issues
- Lower the shadow quality in `GameEngine.js`
- Reduce the number of lights
- Check GPU drivers are up to date

## Network Play Over Internet

To play with someone over the internet:

1. Use a service like [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   ```

2. Share the ngrok URL with your friend

3. Update the server URL in `multiplayer-app.js`:
   ```javascript
   const serverUrl = 'https://your-ngrok-url.ngrok.io';
   ```

## License

MIT

## Credits

Built with Three.js, Socket.IO, and modern web technologies.

---

**Have fun playing Space Scrap with friends!** 🚀
