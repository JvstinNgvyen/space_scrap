import { GameEngine } from './src/GameEngine.js';

class App {
  constructor() {
    this.gameEngine = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('App: Initializing...');
      
      // Show loading message
      const loadingElement = document.getElementById('loading');
      if (loadingElement) loadingElement.textContent = 'Loading 3D Board Game...';
      
      // Initialize GameEngine
      this.gameEngine = new GameEngine();
      await this.gameEngine.init();
      
      // Make GameEngine globally accessible for debugging
      window.gameEngine = this.gameEngine;
      
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      // Hide loading screen
      if (loadingElement) loadingElement.style.display = 'none';
      
      console.log('App: Initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showErrorMessage('Failed to start the game. Please refresh and try again.');
    }
  }

  setupEventListeners() {
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

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.destroy();
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

  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 1000;
    `;
    errorDiv.innerHTML = `
      <h2>Error</h2>
      <p>${message}</p>
      <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px;">Retry</button>
    `;
    document.body.appendChild(errorDiv);
  }

  start() {
    if (this.isInitialized && this.gameEngine) {
      this.gameEngine.start();
    }
  }

  destroy() {
    if (this.gameEngine) {
      this.gameEngine.dispose();
    }
  }
}

// Initialize and start the application
const app = new App();

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init().then(() => app.start());
  });
} else {
  app.init().then(() => app.start());
}

// Export for global access
window.GameApp = app;