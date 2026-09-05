/**
 * Main Application Orchestrator
 * Connects Three.js, ParticleSystem, MediaPipe HandTracker, Controls, and UI HUD.
 */

import { CONFIG } from './config.js';
import { ParticleSystem } from './particle-system.js';
import { HandTracker } from './hand-tracker.js';
import { InteractionControls } from './controls.js';
import { PerformanceManager } from './performance.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.particleSystem = null;
    this.handTracker = null;
    this.controls = null;
    this.perfManager = null;

    this.clock = new THREE.Clock();
    this.animationId = null;

    this.initThree();
    this.initSystems();
    this.initUI();
    this.animate();
  }

  /**
   * Initializes Three.js Scene, Perspective Camera, and WebGLRenderer.
   */
  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07080d, 0.0018);

    // 2. Camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.rendering.fov,
      width / height,
      CONFIG.rendering.near,
      CONFIG.rendering.far
    );
    this.camera.position.z = CONFIG.rendering.cameraZ;

    // 3. Renderer tuned for integrated graphics
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: window.devicePixelRatio < 2, // Enable antialias only on standard DPI to save GPU
      alpha: false,
      depth: false, // Depth buffer not needed for additive particles
      stencil: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x07080d, 1.0);
    this.container.appendChild(this.renderer.domElement);

    // Resize listener
    window.addEventListener('resize', () => this.onResize(), false);
  }

  /**
   * Initializes particle engine, hand tracker, controls, and performance manager.
   */
  initSystems() {
    // 1. Particle System
    this.particleSystem = new ParticleSystem(this.scene);

    // 2. Hand Tracker with callbacks
    this.handTracker = new HandTracker({
      onStatusChange: (status) => this.updateCameraStatusUI(status),
      onGesture: (gestureData) => this.handleGestureInput(gestureData),
      onError: (msg) => this.showToast(msg, 'error')
    });

    // 3. Performance & Low Power Manager
    this.perfManager = new PerformanceManager(
      this.renderer,
      this.particleSystem,
      this.handTracker,
      (isLowPower) => this.updateLowPowerUI(isLowPower)
    );

    // 4. Interaction Controls (Mouse / Touch / Keyboard)
    this.controls = new InteractionControls(window, this.particleSystem, {
      onShapeChange: (shape) => this.setShape(shape),
      onLowPowerToggle: () => this.perfManager.toggleLowPower(),
      onCameraToggle: () => this.toggleCamera(),
      onFpsToggle: () => this.perfManager.toggleFps()
    });
  }

  /**
   * Binds UI controls, sliders, shape selectors, and drawer toggle.
   */
  initUI() {
    // Camera toggle button
    const camBtn = document.getElementById('btn-toggle-cam');
    if (camBtn) {
      camBtn.addEventListener('click', () => this.toggleCamera());
    }

    // Low power button
    const lowPowerBtn = document.getElementById('btn-low-power');
    if (lowPowerBtn) {
      lowPowerBtn.addEventListener('click', () => this.perfManager.toggleLowPower());
    }

    // FPS button
    const fpsBtn = document.getElementById('btn-toggle-fps');
    if (fpsBtn) {
      fpsBtn.addEventListener('click', () => this.perfManager.toggleFps());
    }

    // Explosion button
    const explodeBtn = document.getElementById('btn-explode');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', () => this.particleSystem.explode(2.2));
    }

    // Shape buttons
    const shapeButtons = document.querySelectorAll('.shape-btn');
    shapeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-shape');
        this.setShape(shape);
      });
    });

    // Quality (particle count) slider
    const countSlider = document.getElementById('slider-particle-count');
    const countLabel = document.getElementById('label-particle-count');
    if (countSlider && countLabel) {
      countSlider.value = this.particleSystem.count;
      countLabel.textContent = Number(countSlider.value).toLocaleString();

      countSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        countLabel.textContent = val.toLocaleString();
        this.particleSystem.setParticleCount(val);
      });
    }

    // Particle size slider
    const sizeSlider = document.getElementById('slider-particle-size');
    const sizeLabel = document.getElementById('label-particle-size');
    if (sizeSlider && sizeLabel) {
      sizeSlider.value = this.particleSystem.particleSize;
      sizeLabel.textContent = Number(sizeSlider.value).toFixed(1);

      sizeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sizeLabel.textContent = val.toFixed(1);
        this.particleSystem.setSize(val);
      });
    }

    // Expansion slider
    const expSlider = document.getElementById('slider-expansion');
    const expLabel = document.getElementById('label-expansion');
    if (expSlider && expLabel) {
      expSlider.value = 1.0;
      expLabel.textContent = '1.0x';

      expSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        expLabel.textContent = `${val.toFixed(1)}x`;
        this.particleSystem.setExpansion(val);
      });
    }

    // Color theme select
    const paletteSelect = document.getElementById('select-palette');
    if (paletteSelect) {
      paletteSelect.addEventListener('change', (e) => {
        this.particleSystem.setPalette(e.target.value);
      });
    }

    // Drawer toggle
    const drawerToggle = document.getElementById('btn-drawer-toggle');
    const drawer = document.getElementById('controls-drawer');
    if (drawerToggle && drawer) {
      drawerToggle.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
      });
    }

    // PiP minimize toggle
    const pipMinimize = document.getElementById('btn-pip-minimize');
    const pipBox = document.getElementById('pip-container');
    if (pipMinimize && pipBox) {
      pipMinimize.addEventListener('click', () => {
        pipBox.classList.toggle('minimized');
      });
    }

    // Update initial Low Power UI state
    this.updateLowPowerUI(this.perfManager.isLowPowerMode);
  }

  /**
   * Switches the active shape and updates UI button active states.
   */
  setShape(shapeName) {
    if (shapeName === 'lotus') shapeName = 'flower';
    this.particleSystem.setShape(shapeName);

    const buttons = document.querySelectorAll('.shape-btn');
    buttons.forEach((btn) => {
      const btnShape = btn.getAttribute('data-shape');
      const isActive = btnShape === shapeName || (btnShape === 'flower' && shapeName === 'lotus') || (btnShape === 'lotus' && shapeName === 'flower');
      btn.classList.toggle('active', isActive);
    });
  }

  /**
   * Toggles camera capture on / off.
   */
  async toggleCamera() {
    if (this.handTracker.isActive) {
      this.handTracker.stop();
    } else {
      await this.handTracker.start();
    }
  }

  /**
   * Updates camera status badge and action button.
   */
  updateCameraStatusUI(statusObj) {
    const badge = document.getElementById('camera-status-badge');
    const camBtn = document.getElementById('btn-toggle-cam');
    const pipContainer = document.getElementById('pip-container');

    if (!badge || !camBtn) return;

    if (statusObj.status === 'active') {
      badge.className = 'status-badge active';
      badge.innerHTML = '<span class="pulse-dot"></span><span>Camera Active (Local Only)</span>';
      camBtn.textContent = 'Stop Camera';
      camBtn.classList.add('danger');
      if (pipContainer) pipContainer.classList.add('visible');
    } else if (statusObj.status === 'starting') {
      badge.className = 'status-badge pending';
      badge.innerHTML = '<span class="spinner-dot"></span><span>Starting Camera...</span>';
      camBtn.textContent = 'Starting...';
    } else {
      badge.className = 'status-badge inactive';
      badge.innerHTML = '<span class="status-dot"></span><span>Camera Off</span>';
      camBtn.textContent = 'Enable Camera';
      camBtn.classList.remove('danger');
      if (pipContainer) pipContainer.classList.remove('visible');

      // Clear gesture label when camera stops
      this.updateGestureUI(null);
    }
  }

  /**
   * Handles gesture data from hand tracker.
   */
  handleGestureInput(gestureData) {
    this.updateGestureUI(gestureData);

    if (!gestureData) return;

    // 1. Particle Expansion / Contraction
    this.particleSystem.setExpansion(gestureData.expansion);

    // Sync expansion slider display
    const expSlider = document.getElementById('slider-expansion');
    const expLabel = document.getElementById('label-expansion');
    if (expSlider && expLabel) {
      expSlider.value = gestureData.expansion.toFixed(2);
      expLabel.textContent = `${gestureData.expansion.toFixed(1)}x`;
    }

    // 2. Modulate Color Hue via hand horizontal position
    this.particleSystem.setHueOffset(gestureData.hueOffset);

    // 3. Smooth Particle Cloud 3D Tilt
    if (this.particleSystem.pointsMesh) {
      const targetRotY = (gestureData.centroidX - 0.5) * 1.5;
      const targetRotX = (gestureData.centroidY - 0.5) * 1.2;
      this.particleSystem.pointsMesh.rotation.y += (targetRotY - this.particleSystem.pointsMesh.rotation.y) * 0.05;
      this.particleSystem.pointsMesh.rotation.x += (targetRotX - this.particleSystem.pointsMesh.rotation.x) * 0.05;
    }

    // 4. One-shot gesture triggered shape change
    if (gestureData.shapeTrigger) {
      this.setShape(gestureData.shapeTrigger);
      this.showToast(`Gesture: Switched to ${gestureData.shapeTrigger.toUpperCase()}!`, 'info');
    }
  }

  /**
   * Updates on-screen gesture badge.
   */
  updateGestureUI(gestureData) {
    const gestureBadge = document.getElementById('gesture-readout');
    if (!gestureBadge) return;

    if (!gestureData || !gestureData.detectedGesture || gestureData.detectedGesture === 'None') {
      gestureBadge.textContent = 'Gestures: Standby (Use Mouse/Touch)';
      gestureBadge.classList.remove('active');
    } else {
      const action = gestureData.expansion > 1.25 ? 'Expanding 🖐️' : gestureData.expansion < 0.8 ? 'Contracting ✊' : 'Balanced';
      gestureBadge.textContent = `Gesture: ${gestureData.detectedGesture} | ${action}`;
      gestureBadge.classList.add('active');
    }
  }

  /**
   * Updates Low Power Mode UI indicator.
   */
  updateLowPowerUI(isLowPower) {
    const btn = document.getElementById('btn-low-power');
    if (btn) {
      btn.classList.toggle('active', isLowPower);
      btn.textContent = isLowPower ? '⚡ Low Power: ON' : '⚡ Low Power: OFF';
    }

    // Update slider UI value if count was modified
    const countSlider = document.getElementById('slider-particle-count');
    const countLabel = document.getElementById('label-particle-count');
    if (countSlider && countLabel && this.particleSystem) {
      countSlider.value = this.particleSystem.count;
      countLabel.textContent = this.particleSystem.count.toLocaleString();
    }
  }

  /**
   * Displays temporary toast notification.
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast visible ${type}`;
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 4500);
  }

  /**
   * Window resize handler.
   */
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Main animation loop.
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Skip all rendering when tab is not visible to save CPU/battery
    if (!this.perfManager.isTabVisible) return;

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update Particle System physics
    if (this.particleSystem) {
      this.particleSystem.update(delta, time);
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    // Update FPS & Performance monitor
    this.perfManager.tick(performance.now());
  }

  /**
   * Disposes all resources.
   */
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.particleSystem) this.particleSystem.dispose();
    if (this.handTracker) this.handTracker.dispose();
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}

// Instantiate application once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
