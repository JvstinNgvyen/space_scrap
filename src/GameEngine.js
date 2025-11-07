import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export class GameEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.clock = new THREE.Clock();

    // Ship-related properties
    this.redShip = null;
    this.blueShip = null;
    this.currentShip = null;
    this.transformControls = null;
    this.orbitControls = null;
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();

    this.isRunning = false;
    this.animationId = null;

    // Multiplayer properties
    this.networkManager = null;
    this.isMultiplayer = false;
    this.playerShip = null; // Which ship this player controls
    this.isMyTurn = true; // Track if it's this player's turn (default true for single-player)

    // Black hole properties
    // this.blackHoles = []; // Array to store black hole objects
    // this.blackHoleCollisionRadius = 1.5; // Collision radius for black holes
    // this.lastTeleportTime = 0; // Cooldown for teleportation
    // this.teleportCooldown = 1000; // Minimum time between teleports (ms)

    // Dice properties
    this.dice1 = 1;
    this.dice2 = 1;
    this.lastRollTotal = 2;
    this.diceRollCallbacks = [];
  }

  async init() {
    try {
      console.log("GameEngine: Initializing...");

      this.setupCanvas();
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();

      // Load the Blender scene
      await this.loadBlenderScene();

      // Setup orbit controls
      this.setupOrbitControls();

      // Setup ship controls after Blender scene loads
      this.setupBlenderShipControls();

      this.setupTransformKeyboards();

      // Spawn black holes after scene is loaded
      // this.spawnBlackHoles();

      console.log("GameEngine initialized successfully");
    } catch (error) {
      console.error("Failed to initialize GameEngine:", error);
      throw error;
    }
  }

  setupCanvas() {
    this.canvas = document.querySelector("canvas.game-canvas");
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "game-canvas";
      document.body.appendChild(this.canvas);
    }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enhanced shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Better color and lighting
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 3;

    console.log("Renderer setup complete");
  }

  setupScene() {
    this.scene = new THREE.Scene();

    // Simple background
    this.scene.background = new THREE.Color(0x222244);

    // Add subtle fog for depth
    this.scene.fog = new THREE.Fog(0x222244, 30, 80);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 15, 10);
    this.camera.lookAt(0, 0, 0);
  }

  setupLighting() {
    // Ambient light - reduced for more dramatic lighting
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.15);
    this.scene.add(ambientLight);

    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight("#ffffff", 1.2);
    mainLight.position.set(10, 20, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -25;
    mainLight.shadow.camera.right = 25;
    mainLight.shadow.camera.top = 25;
    mainLight.shadow.camera.bottom = -25;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    // Rim light for ships (dramatic blue-tinted)
    const rimLight = new THREE.DirectionalLight("#4fc3f7", 0.8);
    rimLight.position.set(-15, 5, -10);
    this.scene.add(rimLight);

    // Warm fill light from opposite side
    const fillLight = new THREE.DirectionalLight("#ffb74d", 0.4);
    fillLight.position.set(-8, -10, 5);
    this.scene.add(fillLight);

    // Hemisphere light for subtle environmental lighting
    const hemisphereLight = new THREE.HemisphereLight(
      "#ffffff",
      "#ffffff",
      0.25
    );
    this.scene.add(hemisphereLight);

    // Spotlight for dramatic board lighting
    const spotlight = new THREE.SpotLight("#ffffff", 1.0);
    spotlight.position.set(0, 25, 8);
    spotlight.target.position.set(0, 0, 0);
    spotlight.angle = Math.PI / 4;
    spotlight.penumbra = 0.3;
    spotlight.decay = 2;
    spotlight.distance = 50;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    this.scene.add(spotlight);
    this.scene.add(spotlight.target);

    // Add some point lights for ship highlights
    const shipLight1 = new THREE.PointLight("#00e676", 0.6, 12);
    shipLight1.position.set(7.5, -7.5, 3); // Blue ship area
    this.scene.add(shipLight1);

    const shipLight2 = new THREE.PointLight("#f44336", 0.6, 12);
    shipLight2.position.set(-7, 7.1, 3); // Red ship area
    this.scene.add(shipLight2);

    // Additional spotlight for ship illumination
    const shipSpotlight = new THREE.SpotLight("#ffffff", 1.5);
    shipSpotlight.position.set(0, 15, 10);
    shipSpotlight.target.position.set(0, 0, 2);
    shipSpotlight.angle = Math.PI / 3;
    shipSpotlight.penumbra = 0.4;
    shipSpotlight.decay = 1.5;
    shipSpotlight.distance = 30;
    shipSpotlight.castShadow = true;
    shipSpotlight.shadow.mapSize.width = 1024;
    shipSpotlight.shadow.mapSize.height = 1024;
    this.scene.add(shipSpotlight);
    this.scene.add(shipSpotlight.target);

    // Subtle board edge lighting
    const boardLight = new THREE.RectAreaLight("#ffffff", 0.3, 20, 20);
    boardLight.position.set(0, 0, -2);
    boardLight.lookAt(0, 0, 0);
    this.scene.add(boardLight);

    // Additional atmospheric lighting
    // Corner accent lights
    const cornerLight1 = new THREE.PointLight("#ff6b6b", 0.4, 15);
    cornerLight1.position.set(10, 8, 10);
    this.scene.add(cornerLight1);

    const cornerLight2 = new THREE.PointLight("#4ecdc4", 0.4, 15);
    cornerLight2.position.set(-10, 8, 10);
    this.scene.add(cornerLight2);

    const cornerLight3 = new THREE.PointLight("#45b7d1", 0.4, 15);
    cornerLight3.position.set(10, 8, -10);
    this.scene.add(cornerLight3);

    const cornerLight4 = new THREE.PointLight("#f9ca24", 0.4, 15);
    cornerLight4.position.set(-10, 8, -10);
    this.scene.add(cornerLight4);

    // Dramatic overhead lighting ring
    const ringRadius = 12;
    const ringHeight = 20;
    const numRingLights = 8;

    for (let i = 0; i < numRingLights; i++) {
      const angle = (i / numRingLights) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;

      const ringLight = new THREE.SpotLight("#ffffff", 0.6);
      ringLight.position.set(x, ringHeight, z);
      ringLight.target.position.set(0, 0, 0);
      ringLight.angle = Math.PI / 6;
      ringLight.penumbra = 0.5;
      ringLight.decay = 1.5;
      ringLight.distance = 30;

      this.scene.add(ringLight);
      this.scene.add(ringLight.target);
    }

    // Under-board glow lighting
    const underLight1 = new THREE.PointLight("#6c5ce7", 0.3, 20);
    underLight1.position.set(0, -5, 0);
    this.scene.add(underLight1);

    // Side panel lighting for depth
    const sideLight1 = new THREE.DirectionalLight("#ff7675", 0.3);
    sideLight1.position.set(25, 5, 0);
    this.scene.add(sideLight1);

    const sideLight2 = new THREE.DirectionalLight("#74b9ff", 0.3);
    sideLight2.position.set(-25, 5, 0);
    this.scene.add(sideLight2);

    // Volumetric-style lighting
    const volumeLight1 = new THREE.SpotLight("#fd79a8", 0.4);
    volumeLight1.position.set(8, 18, 8);
    volumeLight1.target.position.set(0, 0, 0);
    volumeLight1.angle = Math.PI / 4;
    volumeLight1.penumbra = 0.8;
    volumeLight1.decay = 2;
    volumeLight1.distance = 25;
    this.scene.add(volumeLight1);
    this.scene.add(volumeLight1.target);

    const volumeLight2 = new THREE.SpotLight("#00b894", 0.4);
    volumeLight2.position.set(-8, 18, -8);
    volumeLight2.target.position.set(0, 0, 0);
    volumeLight2.angle = Math.PI / 4;
    volumeLight2.penumbra = 0.8;
    volumeLight2.decay = 2;
    volumeLight2.distance = 25;
    this.scene.add(volumeLight2);
    this.scene.add(volumeLight2.target);

    // Additional ship area lighting
    const redShipAreaLight = new THREE.SpotLight("#e17055", 0.8);
    redShipAreaLight.position.set(-5, 12, 5);
    redShipAreaLight.target.position.set(-7, 0, 7);
    redShipAreaLight.angle = Math.PI / 8;
    redShipAreaLight.penumbra = 0.6;
    redShipAreaLight.decay = 2;
    redShipAreaLight.distance = 20;
    this.scene.add(redShipAreaLight);
    this.scene.add(redShipAreaLight.target);

    const blueShipAreaLight = new THREE.SpotLight("#0984e3", 0.8);
    blueShipAreaLight.position.set(5, 12, -5);
    blueShipAreaLight.target.position.set(7, 0, -7);
    blueShipAreaLight.angle = Math.PI / 8;
    blueShipAreaLight.penumbra = 0.6;
    blueShipAreaLight.decay = 2;
    blueShipAreaLight.distance = 20;
    this.scene.add(blueShipAreaLight);
    this.scene.add(blueShipAreaLight.target);

    // Dramatic back lighting
    const backLight = new THREE.DirectionalLight("#dda0dd", 0.5);
    backLight.position.set(0, 8, -20);
    this.scene.add(backLight);

    // Additional atmospheric hemisphere lights
    const atmosLight = new THREE.HemisphereLight("#e17055", "#74b9ff", 0.1);
    this.scene.add(atmosLight);

    console.log("Comprehensive lighting setup complete");
  }

  async loadBlenderScene() {
    try {
      // Setup DRACOLoader
      this.dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );
      this.gltfLoader.setDRACOLoader(this.dracoLoader);

      // Load board texture
      const textureLoader = new THREE.TextureLoader();
      const boardTexture = await textureLoader.loadAsync(
        "/Game_Board_Default.png"
      );

      // Configure texture
      boardTexture.wrapS = THREE.RepeatWrapping;
      boardTexture.wrapT = THREE.RepeatWrapping;
      boardTexture.colorSpace = THREE.SRGBColorSpace;

      const gltf = await this.gltfLoader.loadAsync("./scene_export.gltf");

      if (gltf.scene) {
        this.scene.add(gltf.scene);

        // Enable shadows and apply board texture
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Apply board texture to objects that look like the board
            if (child.name && child.name.toLowerCase().includes("board")) {
              console.log("Applying texture to board:", child.name);
              if (child.material) {
                child.material.map = boardTexture;
                child.material.needsUpdate = true;
              }
            }

            // Alternative: apply to large flat meshes (likely the board)
            if (child.geometry && child.geometry.boundingBox) {
              child.geometry.computeBoundingBox();
              const box = child.geometry.boundingBox;
              const size = box.getSize(new THREE.Vector3());

              // If it's a large, relatively flat object, it's probably the board
              if (size.x > 10 && size.z > 10 && size.y < 2) {
                console.log(
                  "Applying texture to large flat object (likely board):",
                  child.name || "unnamed"
                );
                if (child.material) {
                  child.material.map = boardTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
          }
        });

        console.log("Blender scene loaded successfully with board texture");
      }
    } catch (error) {
      console.error("Failed to load Blender scene:", error);
      // Don't throw - allow game to continue without Blender scene
    }
  }

  setupBlenderShipControls() {
    try {
      console.log("Setting up ship controls...");
      this.findShipsInScene();

      // Setup Transform Controls for the first ship found
      if (this.redShip || this.blueShip) {
        this.currentShip = this.redShip || this.blueShip;
        this.setupTransformControls();
        console.log("Ship controls setup complete for:", this.currentShip.name);
      } else {
        console.warn("No ships found in Blender scene");
      }
    } catch (error) {
      console.error("Failed to setup Blender ship controls:", error);
    }
  }

  findShipsInScene() {
    if (!this.scene) return;

    const redShips = [];
    const blueShips = [];

    // Search through all objects in the scene to find ships
    this.scene.traverse((object) => {
      if (object.name) {
        const name = object.name.toLowerCase();

        // Look for red ship variations
        if (
          (name.includes("red") && name.includes("ship")) ||
          (name.includes("ship") && name.includes("red")) ||
          name === "redship" ||
          name === "ship_red" ||
          name === "red_ship"
        ) {
          redShips.push(object);
          console.log("Found red ship:", object.name, object.position);
        }

        // Look for blue ship variations
        if (
          (name.includes("blue") && name.includes("ship")) ||
          (name.includes("ship") && name.includes("blue")) ||
          name === "blueship" ||
          name === "ship_blue" ||
          name === "blue_ship"
        ) {
          blueShips.push(object);
          console.log("Found blue ship:", object.name, object.position);
        }

        // Also log all objects with 'ship' in the name for debugging
        if (name.includes("ship")) {
          console.log("Found ship-like object:", object.name, object);
        }
      }
    });

    // Keep only the first red ship, hide the duplicates
    if (redShips.length > 1) {
      console.log(
        `Found ${redShips.length} red ships. Keeping first one, hiding duplicates.`
      );
      this.redShip = redShips[0];

      // Hide duplicate red ships
      for (let i = 1; i < redShips.length; i++) {
        console.log("Hiding duplicate red ship:", redShips[i].name);
        redShips[i].visible = false;
      }
    } else {
      this.redShip = redShips[0] || null;
    }

    // Keep only the first blue ship, hide the duplicates
    if (blueShips.length > 1) {
      console.log(
        `Found ${blueShips.length} blue ships. Keeping first one, hiding duplicates.`
      );
      this.blueShip = blueShips[0];

      // Hide duplicate blue ships
      for (let i = 1; i < blueShips.length; i++) {
        console.log("Hiding duplicate blue ship:", blueShips[i].name);
        blueShips[i].visible = false;
      }
    } else {
      this.blueShip = blueShips[0] || null;
    }

    if (!this.redShip && !this.blueShip) {
      console.log("No ships found by name. Searching by material color...");
      this.findShipsByMaterial();
    }
  }

  findShipsByMaterial() {
    // Alternative approach: find ships by material color
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const material = Array.isArray(object.material)
          ? object.material[0]
          : object.material;

        if (material.color) {
          // Check if material is red-ish
          if (
            material.color.r > 0.7 &&
            material.color.g < 0.3 &&
            material.color.b < 0.3
          ) {
            this.redShip = object.parent || object;
            console.log(
              "Found red ship by material:",
              object.name || "unnamed",
              object
            );
          }

          // Check if material is blue-ish
          if (
            material.color.b > 0.7 &&
            material.color.r < 0.3 &&
            material.color.g < 0.3
          ) {
            this.blueShip = object.parent || object;
            console.log(
              "Found blue ship by material:",
              object.name || "unnamed",
              object
            );
          }
        }
      }
    });
  }

  setupTransformControls() {
    if (!this.currentShip || !this.camera || !this.renderer) {
      console.warn("Cannot setup transform controls - missing dependencies:", {
        currentShip: !!this.currentShip,
        camera: !!this.camera,
        renderer: !!this.renderer,
      });
      return;
    }

    // Create TransformControls (Three.js equivalent of PivotControls)
    this.transformControls = new TransformControls(
      this.camera,
      this.renderer.domElement
    );

    // Configure similar to PivotControls settings
    this.transformControls.setMode("translate"); // Start with translation mode
    this.transformControls.setSize(1.0); // Make them more visible
    this.transformControls.showX = true;
    this.transformControls.showY = true;
    this.transformControls.showZ = true;

    // Make controls more visible
    this.transformControls.enabled = true;
    this.transformControls.visible = true;

    // Attach to current ship
    this.transformControls.attach(this.currentShip);
    this.scene.add(this.transformControls);

    // Add event listeners for transform controls
    this.transformControls.addEventListener("dragging-changed", (event) => {
      console.log("Transform controls dragging:", event.value);
      if (this.orbitControls) {
        this.orbitControls.enabled = !event.value; // Disable orbit controls while dragging
      }
    });

    this.transformControls.addEventListener("change", () => {
      console.log("Ship position changed:", this.currentShip.position);

      // Only allow changes if it's the player's turn
      if (this.isMultiplayer && !this.isMyTurn) {
        console.log("Cannot modify ship - not your turn");
        return;
      }

      // Send ship update to network if in multiplayer mode
      if (this.isMultiplayer && this.networkManager && this.currentShip) {
        const shipType = this.currentShip === this.redShip ? 'red' : 'blue';
        this.sendShipUpdate(shipType);
      }
    });

    console.log(
      "Transform controls (PivotControls equivalent) initialized for ship:",
      this.currentShip.name
    );
  }

  setupOrbitControls() {
    if (!this.camera || !this.renderer) return;

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground

    console.log("Orbit controls initialized");
  }

  setupTransformKeyboards() {
    // Add keyboard event listeners for switching transform modes
    this.boundOnTransformKeyDown = this.onTransformKeyDown.bind(this);
    document.addEventListener("keydown", this.boundOnTransformKeyDown);
  }

  // Black Hole Methods
  // createBlackHole(position) {
  //   // Create black hole group to hold all visual elements
  //   const blackHoleGroup = new THREE.Group();
  //   blackHoleGroup.position.copy(position);

  //   // Create the main black hole sphere (event horizon)
  //   const blackHoleGeometry = new THREE.SphereGeometry(1.2, 32, 32);
  //   const blackHoleMaterial = new THREE.MeshStandardMaterial({
  //     color: 0x000000,
  //     emissive: 0x1a0033,
  //     emissiveIntensity: 2,
  //     metalness: 1,
  //     roughness: 0.2,
  //   });
  //   const blackHoleMesh = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
  //   blackHoleGroup.add(blackHoleMesh);

  //   // Create accretion disk (glowing ring around black hole)
  //   const diskGeometry = new THREE.TorusGeometry(1.8, 0.3, 16, 100);
  //   const diskMaterial = new THREE.MeshStandardMaterial({
  //     color: 0xff6600,
  //     emissive: 0xff3300,
  //     emissiveIntensity: 3,
  //     transparent: true,
  //     opacity: 0.7,
  //     side: THREE.DoubleSide,
  //   });
  //   const diskMesh = new THREE.Mesh(diskGeometry, diskMaterial);
  //   diskMesh.rotation.x = Math.PI / 2; // Make it horizontal
  //   blackHoleGroup.add(diskMesh);

  //   // Create outer glow effect
  //   const glowGeometry = new THREE.SphereGeometry(2, 32, 32);
  //   const glowMaterial = new THREE.MeshBasicMaterial({
  //     color: 0x6600ff,
  //     transparent: true,
  //     opacity: 0.3,
  //     side: THREE.BackSide,
  //   });
  //   const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  //   blackHoleGroup.add(glowMesh);

  //   // Add point light for dramatic effect
  //   const blackHoleLight = new THREE.PointLight(0x6600ff, 2, 10);
  //   blackHoleLight.position.set(0, 0, 0);
  //   blackHoleGroup.add(blackHoleLight);

  //   // Store references for animation
  //   blackHoleGroup.userData.disk = diskMesh;
  //   blackHoleGroup.userData.glow = glowMesh;
  //   blackHoleGroup.userData.core = blackHoleMesh;

  //   // Add to scene
  //   this.scene.add(blackHoleGroup);
  //   this.blackHoles.push(blackHoleGroup);

  //   console.log("Black hole created at:", position);
  //   return blackHoleGroup;
  // }

  // spawnBlackHoles() {
  //   // Spawn 2-4 black holes randomly on the board
  //   const numBlackHoles = Math.floor(Math.random() * 3) + 2; // 2-4 black holes

  //   console.log(`Spawning ${numBlackHoles} black holes...`);

  //   for (let i = 0; i < numBlackHoles; i++) {
  //     // Random position on the board (within reasonable bounds)
  //     const x = (Math.random() - 0.5) * 20; // -10 to 10
  //     const y = 2; // Above the board
  //     const z = (Math.random() - 0.5) * 20; // -10 to 10

  //     const position = new THREE.Vector3(x, y, z);
  //     this.createBlackHole(position);
  //   }
  // }

  // checkBlackHoleCollisions() {
  //   if (!this.currentShip || this.blackHoles.length === 0) return;

  //   const currentTime = Date.now();

  //   // Check cooldown
  //   if (currentTime - this.lastTeleportTime < this.teleportCooldown) {
  //     return;
  //   }

  //   const shipPosition = this.currentShip.position;

  //   // Check each black hole for collision
  //   for (const blackHole of this.blackHoles) {
  //     const blackHolePosition = blackHole.position;
  //     const distance = shipPosition.distanceTo(blackHolePosition);

  //     // If ship is within collision radius, teleport it
  //     if (distance < this.blackHoleCollisionRadius) {
  //       console.log("Ship entered black hole! Teleporting...");
  //       this.teleportShip(this.currentShip);
  //       this.lastTeleportTime = currentTime;

  //       // Visual feedback: make the black hole pulse
  //       this.pulseBlackHole(blackHole);
  //       break; // Only teleport once per frame
  //     }
  //   }
  // }

  // teleportShip(ship) {
  //   if (!ship) return;

  //   // Generate random teleport destination on the board
  //   const newX = (Math.random() - 0.5) * 18; // -9 to 9 (slightly smaller than board)
  //   const newY = ship.position.y; // Keep same height
  //   const newZ = (Math.random() - 0.5) * 18; // -9 to 9

  //   const oldPosition = ship.position.clone();

  //   // Teleport the ship
  //   ship.position.set(newX, newY, newZ);

  //   console.log(`Ship teleported from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})`);

  //   // Send update to network if in multiplayer mode
  //   if (this.isMultiplayer && this.networkManager && this.currentShip) {
  //     const shipType = this.currentShip === this.redShip ? 'red' : 'blue';
  //     this.sendShipUpdate(shipType);
  //   }

  //   // Visual feedback - flash effect
  //   this.createTeleportEffect(oldPosition);
  //   this.createTeleportEffect(ship.position);
  // }

  // pulseBlackHole(blackHole) {
  //   // Animate the black hole to pulse when a ship enters it
  //   const disk = blackHole.userData.disk;
  //   const glow = blackHole.userData.glow;

  //   if (disk && glow) {
  //     const originalDiskScale = disk.scale.clone();
  //     const originalGlowScale = glow.scale.clone();

  //     // Quick pulse animation
  //     const pulseDuration = 300;
  //     const startTime = Date.now();

  //     const animatePulse = () => {
  //       const elapsed = Date.now() - startTime;
  //       const progress = Math.min(elapsed / pulseDuration, 1);

  //       // Pulse effect using sine wave
  //       const scale = 1 + Math.sin(progress * Math.PI) * 0.5;

  //       disk.scale.copy(originalDiskScale).multiplyScalar(scale);
  //       glow.scale.copy(originalGlowScale).multiplyScalar(scale);

  //       if (progress < 1) {
  //         requestAnimationFrame(animatePulse);
  //       } else {
  //         // Reset to original scale
  //         disk.scale.copy(originalDiskScale);
  //         glow.scale.copy(originalGlowScale);
  //       }
  //     };

  //     animatePulse();
  //   }
  // }

  // createTeleportEffect(position) {
  //   // Create a particle burst effect at teleport location
  //   const particleCount = 20;
  //   const particles = new THREE.Group();

  //   for (let i = 0; i < particleCount; i++) {
  //     const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  //     const particleMaterial = new THREE.MeshBasicMaterial({
  //       color: 0x00ffff,
  //       transparent: true,
  //       opacity: 1,
  //     });
  //     const particle = new THREE.Mesh(particleGeometry, particleMaterial);

  //     // Random direction
  //     const theta = Math.random() * Math.PI * 2;
  //     const phi = Math.random() * Math.PI;

  //     particle.userData.velocity = new THREE.Vector3(
  //       Math.sin(phi) * Math.cos(theta) * 0.2,
  //       Math.sin(phi) * Math.sin(theta) * 0.2,
  //       Math.cos(phi) * 0.2
  //     );

  //     particle.position.copy(position);
  //     particles.add(particle);
  //   }

  //   this.scene.add(particles);

  //   // Animate particles
  //   const startTime = Date.now();
  //   const duration = 1000;

  //   const animateParticles = () => {
  //     const elapsed = Date.now() - startTime;
  //     const progress = elapsed / duration;

  //     if (progress < 1) {
  //       particles.children.forEach(particle => {
  //         particle.position.add(particle.userData.velocity);
  //         particle.material.opacity = 1 - progress;
  //       });
  //       requestAnimationFrame(animateParticles);
  //     } else {
  //       // Clean up
  //       this.scene.remove(particles);
  //       particles.children.forEach(particle => {
  //         particle.geometry.dispose();
  //         particle.material.dispose();
  //       });
  //     }
  //   };

  //   animateParticles();
  // }

  onTransformKeyDown(event) {
    if (!this.transformControls) return;

    // In multiplayer mode, block transform mode changes if not player's turn
    if (this.isMultiplayer && !this.isMyTurn && ['KeyG', 'KeyR', 'KeyS'].includes(event.code)) {
      console.log("Cannot change transform mode - not your turn");
      return;
    }

    switch (event.code) {
      case "KeyG": // Translate mode
        this.transformControls.setMode("translate");
        console.log("Transform mode: Translate");
        break;
      case "KeyR": // Rotate mode
        this.transformControls.setMode("rotate");
        console.log("Transform mode: Rotate");
        break;
      case "KeyS": // Scale mode
        this.transformControls.setMode("scale");
        console.log("Transform mode: Scale");
        break;
      case "Digit1": // Switch to red ship
        this.switchToRedShip();
        break;
      case "Digit2": // Switch to blue ship
        this.switchToBlueShip();
        break;
      case "Escape": // Detach controls
        this.transformControls.detach();
        console.log("Transform controls detached");
        break;
    }
  }

  // Method to switch between ships
  switchToRedShip() {
    if (this.redShip) {
      // In multiplayer, only allow switching to assigned ship
      if (this.isMultiplayer && this.playerShip && this.playerShip !== 'red') {
        console.log("Cannot switch to red ship - not assigned to you");
        return;
      }

      this.currentShip = this.redShip;
      if (this.transformControls) {
        this.transformControls.attach(this.currentShip);
      }
      console.log("Switched to red ship");
    }
  }

  switchToBlueShip() {
    if (this.blueShip) {
      // In multiplayer, only allow switching to assigned ship
      if (this.isMultiplayer && this.playerShip && this.playerShip !== 'blue') {
        console.log("Cannot switch to blue ship - not assigned to you");
        return;
      }

      this.currentShip = this.blueShip;
      if (this.transformControls) {
        this.transformControls.attach(this.currentShip);
      }
      console.log("Switched to blue ship");
    }
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.clock.start();
      this.gameLoop();
      console.log("GameEngine started");
    }
  }

  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      console.log("GameEngine stopped");
    }
  }

  gameLoop() {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.gameLoop());

    this.update();
    this.render();
  }

  update() {
    // Update orbit controls
    if (this.orbitControls) {
      this.orbitControls.update();
    }

    // Animate black holes
    // const time = this.clock.getElapsedTime();
    // this.blackHoles.forEach(blackHole => {
    //   // Rotate the accretion disk
    //   if (blackHole.userData.disk) {
    //     blackHole.userData.disk.rotation.z = time * 2;
    //   }

    //   // Pulsate the glow
    //   if (blackHole.userData.glow) {
    //     const pulse = Math.sin(time * 3) * 0.15 + 1;
    //     blackHole.userData.glow.scale.setScalar(pulse);
    //   }

    //   // Rotate the core slowly
    //   if (blackHole.userData.core) {
    //     blackHole.userData.core.rotation.y = time * 0.5;
    //   }
    // });

    // Check for black hole collisions
    // this.checkBlackHoleCollisions();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  dispose() {
    this.stop();

    // Clean up transform controls
    if (this.boundOnTransformKeyDown) {
      document.removeEventListener("keydown", this.boundOnTransformKeyDown);
    }

    if (this.transformControls) {
      this.transformControls.detach();
      this.transformControls.dispose();
    }

    if (this.orbitControls) {
      this.orbitControls.dispose();
    }

    // Clean up black holes
    // this.blackHoles.forEach(blackHole => {
    //   blackHole.traverse(child => {
    //     if (child.geometry) {
    //       child.geometry.dispose();
    //     }
    //     if (child.material) {
    //       child.material.dispose();
    //     }
    //   });
    //   this.scene.remove(blackHole);
    // });
    // this.blackHoles = [];

    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    console.log("GameEngine disposed");
  }

  // Utility methods for external access
  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }
  getRenderer() {
    return this.renderer;
  }
  getShip() {
    return this.currentShip;
  }
  getRedShip() {
    return this.redShip;
  }
  getBlueShip() {
    return this.blueShip;
  }
  getTransformControls() {
    return this.transformControls;
  }
  getOrbitControls() {
    return this.orbitControls;
  }

  // Debug methods
  showTransformControls() {
    if (this.transformControls && this.currentShip) {
      this.transformControls.attach(this.currentShip);
      this.transformControls.visible = true;
      console.log(
        "Transform controls attached and visible for:",
        this.currentShip.name
      );
      return true;
    }
    console.warn("Transform controls or current ship not available");
    return false;
  }

  hideTransformControls() {
    if (this.transformControls) {
      this.transformControls.detach();
      console.log("Transform controls detached");
    }
  }

  // Multiplayer methods
  enableMultiplayer(networkManager, playerShip) {
    this.networkManager = networkManager;
    this.isMultiplayer = true;
    this.playerShip = playerShip;
    this.isMyTurn = networkManager.isMyTurn();

    console.log(`Multiplayer enabled. You control the ${playerShip} ship.`);

    // Setup network callbacks
    this.networkManager.onShipUpdated((data) => {
      this.applyRemoteShipUpdate(data.ship, data.transform);
    });

    // NOTE: We don't set up onTurnChanged here because it would overwrite
    // the MultiplayerApp's callback. Instead, MultiplayerApp will call
    // handleTurnChanged() directly when it receives the event.

    // Auto-select the player's assigned ship
    if (playerShip === 'red') {
      this.switchToRedShip();
    } else if (playerShip === 'blue') {
      this.switchToBlueShip();
    }

    // Update controls based on initial turn state
    this.updateControlsForTurn();
  }

  disableMultiplayer() {
    this.networkManager = null;
    this.isMultiplayer = false;
    this.playerShip = null;
    this.isMyTurn = true; // Reset to true for single-player
    console.log("Multiplayer disabled");
  }

  handleTurnChanged(data) {
    const wasMyTurn = this.isMyTurn;
    this.isMyTurn = this.networkManager.isMyTurn();

    console.log(`GameEngine: Turn changed to ${data.currentTurn}. Was my turn: ${wasMyTurn}, Now my turn: ${this.isMyTurn}, My ship: ${this.playerShip}`);

    this.updateControlsForTurn();
  }

  updateControlsForTurn() {
    if (!this.transformControls) {
      console.log('GameEngine: No transform controls to update');
      return;
    }

    if (this.isMultiplayer) {
      // Enable or disable transform controls based on turn
      this.transformControls.enabled = this.isMyTurn;

      // Visual feedback: make controls less visible when disabled
      if (this.isMyTurn) {
        this.transformControls.visible = true;
      } else {
        this.transformControls.visible = false;
      }

      console.log(`GameEngine: Transform controls ${this.isMyTurn ? 'enabled' : 'disabled'} for turn. Controls enabled=${this.transformControls.enabled}, visible=${this.transformControls.visible}`);
    } else {
      // Single-player: always enabled
      this.transformControls.enabled = true;
      this.transformControls.visible = true;
    }
  }

  setTurnState(isMyTurn) {
    this.isMyTurn = isMyTurn;
    this.updateControlsForTurn();
  }

  sendShipUpdate(shipType) {
    if (!this.networkManager || !this.isMultiplayer) return;

    const ship = shipType === 'red' ? this.redShip : this.blueShip;
    if (!ship) return;

    const transform = {
      position: {
        x: ship.position.x,
        y: ship.position.y,
        z: ship.position.z
      },
      rotation: {
        x: ship.rotation.x,
        y: ship.rotation.y,
        z: ship.rotation.z
      },
      scale: {
        x: ship.scale.x,
        y: ship.scale.y,
        z: ship.scale.z
      }
    };

    this.networkManager.sendShipUpdate(shipType, transform);
  }

  applyRemoteShipUpdate(shipType, transform) {
    const ship = shipType === 'red' ? this.redShip : this.blueShip;
    if (!ship || !transform) return;

    // Don't apply updates to the ship we control
    if (this.playerShip === shipType) return;

    // Apply position
    if (transform.position) {
      ship.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    // Apply rotation
    if (transform.rotation) {
      ship.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z
      );
    }

    // Apply scale
    if (transform.scale) {
      ship.scale.set(
        transform.scale.x,
        transform.scale.y,
        transform.scale.z
      );
    }
  }

  getNetworkManager() {
    return this.networkManager;
  }

  // Dice rolling methods
  rollDice() {
    // Roll two dice (1-6 each)
    this.dice1 = Math.floor(Math.random() * 6) + 1;
    this.dice2 = Math.floor(Math.random() * 6) + 1;
    this.lastRollTotal = this.dice1 + this.dice2;

    console.log(`Dice rolled: ${this.dice1} + ${this.dice2} = ${this.lastRollTotal}`);

    // Notify all registered callbacks
    this.diceRollCallbacks.forEach(callback => {
      try {
        callback(this.dice1, this.dice2, this.lastRollTotal);
      } catch (error) {
        console.error('Error in dice roll callback:', error);
      }
    });

    return {
      dice1: this.dice1,
      dice2: this.dice2,
      total: this.lastRollTotal
    };
  }

  onDiceRoll(callback) {
    if (typeof callback === 'function') {
      this.diceRollCallbacks.push(callback);
    }
  }

  getDiceValues() {
    return {
      dice1: this.dice1,
      dice2: this.dice2,
      total: this.lastRollTotal
    };
  }
}
