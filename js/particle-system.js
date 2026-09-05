/**
 * Three.js 3D Particle System
 * High performance point cloud with smooth mathematical shape morphing,
 * spring-based physics, procedural glow texture, and dynamic HSL color shifts.
 */

import { CONFIG } from './config.js';
import { ShapeGenerators } from './math-shapes.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = CONFIG.particles.defaultCount;
    this.currentShape = 'heart';
    this.palette = CONFIG.palettes.nebula;
    
    // Physics & Gesture control variables
    this.expansion = 1.0;          // 0.2 (contracted) to 3.0 (expanded)
    this.targetExpansion = 1.0;
    this.colorHueOffset = 0.0;     // 0.0 to 1.0 hue wheel offset
    this.particleSize = CONFIG.particles.baseSize;
    this.rotationSpeedY = 0.003;
    this.rotationSpeedX = 0.001;

    // References for clean disposal
    this.geometry = null;
    this.material = null;
    this.pointsMesh = null;
    this.glowTexture = null;

    // Buffer arrays
    this.positions = null;
    this.targetPositions = null;
    this.velocities = null;
    this.colors = null;

    // Cache of precalculated shape targets for quick morphing
    this.shapeCache = {};

    this.init();
  }

  /**
   * Generates a soft procedural radial glow point sprite texture via offscreen canvas.
   * Zero external image download, pure local memory, lightweight (64x64).
   */
  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(230, 245, 255, 0.85)');
    gradient.addColorStop(0.5, 'rgba(120, 180, 255, 0.35)');
    gradient.addColorStop(0.8, 'rgba(60, 100, 255, 0.08)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false; // Save memory on integrated GPU
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Initializes buffers, geometry, and material.
   */
  init() {
    this.shapeCache = {};

    // 1. Generate target coordinates for current shape
    this.targetPositions = this.getShapeCoordinates(this.currentShape, this.count);

    // 2. Initialize current positions and velocities
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);

    // Start with particles randomly scattered near targets
    for (let i = 0; i < this.count * 3; i++) {
      this.positions[i] = this.targetPositions[i] + (Math.random() - 0.5) * 40;
      this.velocities[i] = (Math.random() - 0.5) * 0.2;
    }

    // Initialize initial colors
    this.updateColors();

    // 3. Create Three.js BufferGeometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // 4. Create Material with Additive Blending for luminous glow
    if (!this.glowTexture) {
      this.glowTexture = this.createGlowTexture();
    }

    this.material = new THREE.PointsMaterial({
      size: this.particleSize,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    // 5. Create Points Mesh and add to Scene
    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.pointsMesh);
  }

  /**
   * Retrieves or computes shape coordinates for a given count.
   */
  getShapeCoordinates(shapeName, count) {
    const key = `${shapeName}_${count}`;
    if (!this.shapeCache[key]) {
      const generator = ShapeGenerators[shapeName] || ShapeGenerators.heart;
      this.shapeCache[key] = generator(count);
    }
    return this.shapeCache[key];
  }

  /**
   * Switch active shape template with smooth morphing.
   */
  setShape(shapeName) {
    if (shapeName === 'lotus') shapeName = 'flower';
    if (this.currentShape === shapeName && this.targetPositions) return;
    this.currentShape = shapeName;
    this.targetPositions = this.getShapeCoordinates(shapeName, this.count);
    this.updateColors();

    // Give a slight velocity nudge for dynamic burst feel during morphing
    for (let i = 0; i < this.count * 3; i += 3) {
      this.velocities[i] += (Math.random() - 0.5) * 1.2;
      this.velocities[i + 1] += (Math.random() - 0.5) * 1.2;
      this.velocities[i + 2] += (Math.random() - 0.5) * 1.2;
    }
  }

  /**
   * Updates particle count dynamically (e.g. from quality slider or low-power mode).
   * Safely disposes old geometry and re-allocates contiguous buffers.
   */
  setParticleCount(newCount) {
    newCount = Math.max(CONFIG.particles.minCount, Math.min(CONFIG.particles.maxCount, Math.round(newCount)));
    if (newCount === this.count) return;

    // Remove old mesh from scene
    if (this.pointsMesh) {
      this.scene.remove(this.pointsMesh);
    }
    // Cleanly dispose old geometry
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    this.count = newCount;
    this.init();
  }

  /**
   * Updates color palette or base hue offset.
   */
  setPalette(paletteKey) {
    if (CONFIG.palettes[paletteKey]) {
      this.palette = CONFIG.palettes[paletteKey];
      this.updateColors();
    }
  }

  /**
   * Computes particle colors according to distance from origin and active palette.
   */
  updateColors() {
    if (!this.colors || !this.targetPositions) return;

    const p = this.palette;
    const baseHue = (p.primaryHue + this.colorHueOffset) % 1.0;
    const secHue = (p.secondaryHue + this.colorHueOffset) % 1.0;
    const colorObj = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.targetPositions[idx];
      const y = this.targetPositions[idx + 1];
      const z = this.targetPositions[idx + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      
      // Normalized radial gradient: core vs exterior
      const factor = Math.min(1.0, dist / 60.0);
      const hue = (baseHue + (secHue - baseHue) * factor) % 1.0;
      const saturation = 0.85 + 0.15 * Math.sin(i * 0.1);
      const lightness = 0.55 + 0.25 * (1.0 - factor); // Center is brighter

      colorObj.setHSL(hue, saturation, lightness);
      this.colors[idx] = colorObj.r;
      this.colors[idx + 1] = colorObj.g;
      this.colors[idx + 2] = colorObj.b;
    }

    if (this.geometry && this.geometry.attributes.color) {
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  /**
   * Physics & animation update tick.
   * @param {number} delta - Frame delta time in seconds
   * @param {number} time - Elapsed time in seconds
   */
  update(delta, time) {
    if (!this.positions || !this.targetPositions || !this.geometry) return;

    // Smoothly interpolate expansion factor
    this.expansion += (this.targetExpansion - this.expansion) * 0.12;

    const lerpSpeed = CONFIG.particles.lerpSpeed;
    const dampening = CONFIG.particles.dampening;
    const turbulence = CONFIG.particles.turbulence;
    const exp = this.expansion;

    const pos = this.positions;
    const target = this.targetPositions;
    const vel = this.velocities;

    // Loop through all particles
    for (let i = 0; i < this.count * 3; i += 3) {
      // 1. Target scaled by expansion factor
      const tx = target[i] * exp;
      const ty = target[i + 1] * exp;
      const tz = target[i + 2] * exp;

      // 2. Spring force towards target
      const fx = (tx - pos[i]) * lerpSpeed;
      const fy = (ty - pos[i + 1]) * lerpSpeed;
      const fz = (tz - pos[i + 2]) * lerpSpeed;

      // 3. Subtle harmonic turbulence to give living organic breath
      const noise = Math.sin(time * 2.0 + i * 0.05) * turbulence;

      vel[i] = (vel[i] + fx) * dampening;
      vel[i + 1] = (vel[i + 1] + fy + noise * 0.2) * dampening;
      vel[i + 2] = (vel[i + 2] + fz) * dampening;

      pos[i] += vel[i];
      pos[i + 1] += vel[i + 1];
      pos[i + 2] += vel[i + 2];
    }

    // Flag BufferAttribute for GPU upload
    this.geometry.attributes.position.needsUpdate = true;

    // Continuous subtle auto-rotation
    if (this.pointsMesh) {
      this.pointsMesh.rotation.y += this.rotationSpeedY;
      this.pointsMesh.rotation.x += this.rotationSpeedX;
    }
  }

  /**
   * Sets particle visual size.
   */
  setSize(size) {
    this.particleSize = Math.max(CONFIG.particles.minSize, Math.min(CONFIG.particles.maxSize, size));
    if (this.material) {
      this.material.size = this.particleSize;
    }
  }

  /**
   * Set target expansion factor from hand pinch or mouse wheel.
   */
  setExpansion(factor) {
    this.targetExpansion = Math.max(0.15, Math.min(3.5, factor));
  }

  /**
   * Adjust color hue wheel offset dynamically (e.g. hand horizontal sweep).
   */
  setHueOffset(offset) {
    this.colorHueOffset = offset % 1.0;
    this.updateColors();
  }

  /**
   * Trigger a shockwave explosion impulse (e.g. on gesture or spacebar).
   */
  explode(intensity = 1.5) {
    for (let i = 0; i < this.count * 3; i += 3) {
      const pLen = Math.sqrt(this.positions[i] ** 2 + this.positions[i + 1] ** 2 + this.positions[i + 2] ** 2) || 1;
      const nx = this.positions[i] / pLen;
      const ny = this.positions[i + 1] / pLen;
      const nz = this.positions[i + 2] / pLen;
      const speed = (Math.random() * 4.0 + 2.0) * intensity;

      this.velocities[i] += nx * speed;
      this.velocities[i + 1] += ny * speed;
      this.velocities[i + 2] += nz * speed;
    }
  }

  /**
   * Disposes all WebGL memory buffers, textures, and geometry to prevent leaks.
   */
  dispose() {
    if (this.pointsMesh) {
      this.scene.remove(this.pointsMesh);
      this.pointsMesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.glowTexture) {
      this.glowTexture.dispose();
      this.glowTexture = null;
    }
    this.positions = null;
    this.targetPositions = null;
    this.velocities = null;
    this.colors = null;
    this.shapeCache = {};
  }
}
