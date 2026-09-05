/**
 * Particle System & Hand Tracking Configuration
 * Tuned for laptops with integrated graphics (e.g. 8GB RAM) and mobile devices.
 */

export const CONFIG = {
  // Particle counts
  particles: {
    defaultCount: 8000,
    minCount: 1000,
    maxCount: 25000,
    lowPowerCount: 3500,
    mobileDefaultCount: 4500,
    baseSize: 3.2,
    minSize: 1.0,
    maxSize: 8.0,
    lerpSpeed: 0.045,      // Speed of shape morphing interpolation
    dampening: 0.92,       // Velocity dampening
    turbulence: 0.35       // Subtle organic hovering motion
  },

  // Camera & MediaPipe Hand Tracking
  tracking: {
    videoWidth: 320,       // Downscaled resolution to conserve CPU & memory
    videoHeight: 240,
    frameThrottle: 2,      // Run model inference every Nth frame (2 = ~20-30 FPS)
    lowPowerThrottle: 4,   // Run inference every 4th frame in low power mode (~15 FPS)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    modelComplexity: 0,    // 0 = Lite (crucial for integrated GPU / low RAM)
    maxHands: 1
  },

  // Color Palettes
  palettes: {
    nebula: {
      name: 'Cosmic Nebula',
      primaryHue: 0.75,    // Violet / Purple
      secondaryHue: 0.52,  // Cyan / Blue
      accentHue: 0.95      // Pink / Magenta
    },
    cyberpunk: {
      name: 'Cyberpunk Neon',
      primaryHue: 0.92,    // Neon Pink
      secondaryHue: 0.50,  // Electric Cyan
      accentHue: 0.15      // Amber / Gold
    },
    aurora: {
      name: 'Northern Aurora',
      primaryHue: 0.38,    // Emerald Green
      secondaryHue: 0.52,  // Turquoise
      accentHue: 0.70      // Deep Indigo
    },
    solar: {
      name: 'Solar Flare',
      primaryHue: 0.08,    // Deep Orange
      secondaryHue: 0.14,  // Bright Gold
      accentHue: 0.01      // Radiant Crimson
    }
  },

  // Rendering Settings
  rendering: {
    fov: 60,
    near: 0.1,
    far: 2000,
    cameraZ: 140,
    defaultPixelRatio: Math.min(window.devicePixelRatio || 1, 1.75),
    lowPowerPixelRatio: 1.0
  }
};
