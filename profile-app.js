// Profile Page Application
class ProfileManager {
  constructor() {
    this.profileKey = 'space_scrap_profile';
    this.statsKey = 'space_scrap_stats';
    this.defaultProfile = {
      nickname: '',
      preferredShip: 'red',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    this.defaultStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0
    };
  }

  // Load profile from localStorage
  loadProfile() {
    try {
      const profileData = localStorage.getItem(this.profileKey);
      if (!profileData) return { ...this.defaultProfile };

      const profile = JSON.parse(profileData);
      return { ...this.defaultProfile, ...profile };
    } catch (error) {
      console.error('ProfileManager: Failed to load profile', error);
      return { ...this.defaultProfile };
    }
  }

  // Save profile to localStorage
  saveProfile(profileData) {
    try {
      const profile = {
        ...profileData,
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.profileKey, JSON.stringify(profile));
      console.log('ProfileManager: Profile saved', profile);
      return true;
    } catch (error) {
      console.error('ProfileManager: Failed to save profile', error);
      return false;
    }
  }

  // Load stats from localStorage
  loadStats() {
    try {
      const statsData = localStorage.getItem(this.statsKey);
      if (!statsData) return { ...this.defaultStats };

      const stats = JSON.parse(statsData);
      return { ...this.defaultStats, ...stats };
    } catch (error) {
      console.error('ProfileManager: Failed to load stats', error);
      return { ...this.defaultStats };
    }
  }

  // Save stats to localStorage
  saveStats(statsData) {
    try {
      localStorage.setItem(this.statsKey, JSON.stringify(statsData));
      console.log('ProfileManager: Stats saved', statsData);
      return true;
    } catch (error) {
      console.error('ProfileManager: Failed to save stats', error);
      return false;
    }
  }

  // Reset stats
  resetStats() {
    try {
      localStorage.removeItem(this.statsKey);
      console.log('ProfileManager: Stats reset');
      return true;
    } catch (error) {
      console.error('ProfileManager: Failed to reset stats', error);
      return false;
    }
  }

  // Calculate win rate
  calculateWinRate(stats) {
    if (stats.gamesPlayed === 0) return 0;
    return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
  }

  // Update game result (call this after a game ends)
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

// Initialize profile manager
const profileManager = new ProfileManager();

// DOM elements
const nicknameInput = document.getElementById('nickname');
const shipOptions = document.querySelectorAll('.ship-option');
const profileForm = document.getElementById('profileForm');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');
const gamesPlayedEl = document.getElementById('gamesPlayed');
const gamesWonEl = document.getElementById('gamesWon');
const winRateEl = document.getElementById('winRate');

// State
let selectedShip = 'red';

// Show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 3000);
}

// Update stats display
function updateStatsDisplay() {
  const stats = profileManager.loadStats();
  gamesPlayedEl.textContent = stats.gamesPlayed;
  gamesWonEl.textContent = stats.gamesWon;
  winRateEl.textContent = `${profileManager.calculateWinRate(stats)}%`;
}

// Load and display profile
function loadProfileData() {
  const profile = profileManager.loadProfile();

  // Set nickname
  nicknameInput.value = profile.nickname || '';

  // Set selected ship
  selectedShip = profile.preferredShip || 'red';
  shipOptions.forEach(option => {
    if (option.dataset.ship === selectedShip) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });

  // Update stats display
  updateStatsDisplay();
}

// Handle ship selection
shipOptions.forEach(option => {
  option.addEventListener('click', () => {
    selectedShip = option.dataset.ship;
    shipOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
  });
});

// Handle form submission
profileForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const nickname = nicknameInput.value.trim();

  // Validate nickname
  if (!nickname) {
    showStatus('please enter a nickname', 'error');
    return;
  }

  if (nickname.length < 2) {
    showStatus('nickname must be at least 2 characters', 'error');
    return;
  }

  // Save profile
  const profileData = {
    nickname,
    preferredShip: selectedShip,
    createdAt: profileManager.loadProfile().createdAt || Date.now()
  };

  const success = profileManager.saveProfile(profileData);

  if (success) {
    showStatus('profile saved successfully!', 'success');
  } else {
    showStatus('failed to save profile', 'error');
  }
});

// Handle reset button
resetButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset your statistics? This cannot be undone.')) {
    const success = profileManager.resetStats();
    if (success) {
      updateStatsDisplay();
      showStatus('statistics reset successfully', 'success');
    } else {
      showStatus('failed to reset statistics', 'error');
    }
  }
});

// Load profile data on page load
loadProfileData();

// Export for use in other modules
export { profileManager, ProfileManager };
