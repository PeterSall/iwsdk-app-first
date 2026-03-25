import { createSystem, VisibilityState, World, Types } from "@iwsdk/core";
import { Euler, Vector3 } from "@iwsdk/core";

/**
 * Desktop locomotion system - enables WASD movement and mouse look in desktop browser mode
 * Disabled in VR mode when XR session is active
 */
export class DesktopLocomotionSystem extends createSystem({}) {
  world!: World;
  private keys: Record<string, boolean> = {};
  private mouse = { x: 0, y: 0 };
  private euler = new Euler(0, 0, 0, "YXZ");
  private direction = new Vector3();
  private isDesktopMode = false;
  private speed = 5; // units per second
  private mouseSensitivity = 0.001;

  init() {
    // World is available as 'this.world' via the ECS system base class
    this.setupEventListeners();
    this.subscribeToVisibilityChanges();
  }

  update(delta: number) {
    if (!this.isDesktopMode) return;

    const camera = this.world.camera;

    // Get movement input
    this.direction.set(0, 0, 0);
    if (this.keys["w"] || this.keys["W"]) this.direction.z -= 1;
    if (this.keys["s"] || this.keys["S"]) this.direction.z += 1;
    if (this.keys["a"] || this.keys["A"]) this.direction.x -= 1;
    if (this.keys["d"] || this.keys["D"]) this.direction.x += 1;

    // Normalize and apply speed
    if (this.direction.length() > 0) {
      this.direction.normalize().multiplyScalar(this.speed * delta);

      // Transform direction by camera's current rotation (relative to world)
      this.direction.applyQuaternion(camera.quaternion);
      camera.position.add(this.direction);
    }
  }

  setWorld(world: World) {
    this.world = world;
    this.setupEventListeners();
    this.subscribeToVisibilityChanges();
  }

  private setupEventListeners() {
    // Keyboard input
    document.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });

    // Mouse input for camera rotation
    document.addEventListener("mousemove", (e) => {
      if (!this.isDesktopMode) return;

      this.mouse.x -= e.movementX * this.mouseSensitivity;
      this.mouse.y -= e.movementY * this.mouseSensitivity;

      // Clamp vertical rotation to prevent flipping
      this.mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouse.y));

      const camera = this.world.camera;

      // Set euler angles (order YXZ means: rotate Y first, then X, then Z)
      this.euler.order = "YXZ";
      this.euler.setFromQuaternion(camera.quaternion);
      this.euler.y = this.mouse.x;
      this.euler.x = this.mouse.y;
      camera.quaternion.setFromEuler(this.euler);
    });

    // Lock pointer on click
    document.addEventListener("click", () => {
      if (this.isDesktopMode && document.pointerLockElement === null) {
        document.documentElement.requestPointerLock();
      }
    });

    // Reset mouse position on pointer lock change
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === null) {
        this.mouse.x = 0;
        this.mouse.y = 0;
      }
    });
  }

  private subscribeToVisibilityChanges() {
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((state) => {
        // Desktop mode is active when NOT in an immersive XR session
        this.isDesktopMode = state === VisibilityState.NonImmersive;

        // Exit pointer lock when entering VR
        if (!this.isDesktopMode && document.pointerLockElement) {
          document.exitPointerLock();
        }
      })
    );
  }
}

/**
 * Setup desktop locomotion system
 * Call this after World.create() to register the system with the world
 */
export function setupDesktopLocomotion(world: World) {
  world.registerSystem(DesktopLocomotionSystem);
}
