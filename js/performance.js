/**
 * Performance Monitoring, Low-Power Engine & Resource Management
 * Handles FPS measurement, visibility tab pausing, mobile auto-detection, and safe disposal.
 */

import { CONFIG } from './config.js';

export class PerformanceManager {
  constructor(renderer, particleSystem, handTracker, onModeChange = () => {}) {
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.handTracker = handTracker;
    this.onModeChange = onModeChange;

    // Device detection
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isLowPowerMode = this.isMobile; // Auto-activate low power by default on mobile devices

    // FPS Counter state
    this.fpsVisible = true;
    this.fpsElement = document.getElementById('fps-display');
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameTime = 16.6;

    // Visibility state
    this.isTabVisible = !document.hidden;

    this.initVisibilityListener();
    this.applyModeSettings();
  }

  /**
   * Listens for tab visibility changes to pause rendering and camera capture.
   * Conserves 100% CPU/GPU and battery when tab is backgrounded.
   */
  initVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
      if (document.hidden) {
        if (this.handTracker) this.handTracker.pause();
      } else {
        if (this.handTracker) this.handTracker.resume();
        this.lastTime = performance.now(); // Reset timer to avoid huge delta spike
      }
    });
  }

  /**
   * Updates FPS and frame time measurements each frame.
   */
  tick(currentTime) {
    this.frameCount++;
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 500) { // Update readout every 500ms
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameTime = (elapsed / this.frameCount).toFixed(1);
      this.frameCount = 0;
      this.lastTime = currentTime;
      this.updateHud();
    }
  }

  /**
   * Updates on-screen HUD text.
   */
  updateHud() {
    if (!this.fpsElement || !this.fpsVisible) return;
    const count = this.particleSystem ? this.particleSystem.count.toLocaleString() : '0';
    this.fpsElement.innerHTML = `
      <span class="metric-fps">${this.fps} <small>FPS</small></span>
      <span class="metric-sep">|</span>
      <span class="metric-ms">${this.frameTime} <small>ms</small></span>
      <span class="metric-sep">|</span>
      <span class="metric-count">${count} <small>pts</small></span>
    `;
  }

  /**
   * Toggles FPS counter visibility.
   */
  toggleFps() {
    this.fpsVisible = !this.fpsVisible;
    if (this.fpsElement) {
      this.fpsElement.style.display = this.fpsVisible ? 'flex' : 'none';
    }
    return this.fpsVisible;
  }

  /**
   * Toggles Low Power Mode.
   */
  toggleLowPower() {
    this.isLowPowerMode = !this.isLowPowerMode;
    this.applyModeSettings();
    this.onModeChange(this.isLowPowerMode);
    return this.isLowPowerMode;
  }

  /**
   * Applies graphics and tracking settings for active power mode.
   */
  applyModeSettings() {
    if (this.isLowPowerMode) {
      // 1. Lower pixel ratio to 1.0 (or 0.8 on mobile)
      const ratio = this.isMobile ? 0.9 : CONFIG.rendering.lowPowerPixelRatio;
      this.renderer.setPixelRatio(ratio);

      // 2. Reduce particle count to 3,500
      if (this.particleSystem) {
        this.particleSystem.setParticleCount(CONFIG.particles.lowPowerCount);
      }

      // 3. Throttle hand tracking to every 4th frame
      if (this.handTracker) {
        this.handTracker.setThrottle(CONFIG.tracking.lowPowerThrottle);
      }
    } else {
      // High quality settings
      this.renderer.setPixelRatio(CONFIG.rendering.defaultPixelRatio);

      if (this.particleSystem) {
        const count = this.isMobile ? CONFIG.particles.mobileDefaultCount : CONFIG.particles.defaultCount;
        this.particleSystem.setParticleCount(count);
      }

      if (this.handTracker) {
        this.handTracker.setThrottle(CONFIG.tracking.frameThrottle);
      }
    }
  }

  /**
   * Safe disposal utility for any Three.js 3D Object and its child nodes.
   */
  static disposeHierarchy(obj) {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
