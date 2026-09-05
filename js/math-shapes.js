/**
 * 3D Mathematical Parametric Shape Generators
 * Generates coordinate arrays [x, y, z] for smooth particle morphing.
 */

export const ShapeGenerators = {
  /**
   * 1. 3D Volumetric Heart
   * Parametric cardioid curves filled with internal volume and natural taper.
   */
  heart: (count, scale = 2.8) => {
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Random parameter t along the heart perimeter
      const t = Math.PI * 2 * Math.random();
      // Dispersion factor inside the heart volume
      const r = Math.pow(Math.random(), 0.4);

      // Classic parametric 2D heart curves
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      
      // Z depth with volumetric taper: thicker at center, tapering near edges
      const maxZ = 7 * (1 - Math.abs(t - Math.PI) / Math.PI);
      const z = (Math.random() * 2 - 1) * maxZ * (1.2 - r * 0.5);

      coords[idx] = x * r * scale;
      coords[idx + 1] = y * r * scale + 6; // Center vertically
      coords[idx + 2] = z * scale * 1.5;
    }
    return coords;
  },

  /**
   * 2. Blooming 3D Sacred Lotus Flower
   * Multi-layered blooming petals with radial phyllotaxis and upward curving petals.
   */
  flower: (count, scale = 3.6) => {
    const coords = new Float32Array(count * 3);
    const petals = 6; // Petal symmetry
    const layers = 5;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Layer index from center (0) to outer tip (1)
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      
      // Petal shape modulation
      const petalShape = Math.sin(petals * theta * 0.5);
      const radius = (u * 14 + 2) * (0.65 + 0.35 * Math.abs(petalShape));

      // Upward cup curvature for inner petals, outward bloom for outer
      const height = Math.sin(u * Math.PI * 0.8) * 8 - (u * 4) + (Math.random() - 0.5) * 1.2;

      coords[idx] = Math.cos(theta) * radius * scale;
      coords[idx + 1] = height * scale - 4;
      coords[idx + 2] = Math.sin(theta) * radius * scale;
    }
    return coords;
  },

  /**
   * 3. Saturn & Rings
   * Spherical planetary core with tilted concentric rings and Cassini division gap.
   */
  saturn: (count, scale = 1.3) => {
    const coords = new Float32Array(count * 3);
    const planetParticleCount = Math.floor(count * 0.32); // 32% for planet, 68% for rings
    const ringParticleCount = count - planetParticleCount;

    // Tilt angle of Saturn's axis (~26.7 degrees)
    const tilt = 26.7 * (Math.PI / 180);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    // 1. Generate Planet Sphere (Fibonacci spiral / spherical shell)
    const planetRadius = 22 * scale;
    for (let i = 0; i < planetParticleCount; i++) {
      const idx = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = planetRadius * Math.cbrt(Math.random() * 0.85 + 0.15); // Volume fill

      const px = r * Math.sin(phi) * Math.cos(theta);
      const py = r * Math.sin(phi) * Math.sin(theta) * 0.92; // Slightly oblate spheroid
      const pz = r * Math.cos(phi);

      // Apply axial tilt
      coords[idx] = px;
      coords[idx + 1] = py * cosTilt - pz * sinTilt;
      coords[idx + 2] = py * sinTilt + pz * cosTilt;
    }

    // 2. Generate Rings with Cassini Division gap
    const ringInner = 30 * scale;
    const ringOuter = 65 * scale;
    const cassiniInner = 46 * scale;
    const cassiniOuter = 49 * scale;

    for (let i = 0; i < ringParticleCount; i++) {
      const idx = (planetParticleCount + i) * 3;
      
      // Distribute radius, skipping Cassini division
      let r = ringInner + Math.random() * (ringOuter - ringInner);
      if (r > cassiniInner && r < cassiniOuter) {
        // Push slightly inward or outward from gap
        r = Math.random() > 0.5 ? cassiniInner - Math.random() * 2 : cassiniOuter + Math.random() * 2;
      }

      const theta = Math.random() * Math.PI * 2;
      const thickness = (Math.random() - 0.5) * 1.8 * scale;

      const rx = Math.cos(theta) * r;
      const ry = thickness;
      const rz = Math.sin(theta) * r;

      // Apply same axial tilt to the rings
      coords[idx] = rx;
      coords[idx + 1] = ry * cosTilt - rz * sinTilt;
      coords[idx + 2] = ry * sinTilt + rz * cosTilt;
    }

    return coords;
  },

  /**
   * 4. Fireworks / Cosmic Nebula
   * Spherical explosion shockwave with trailing radial streamers and organic twist.
   */
  fireworks: (count, scale = 1.4) => {
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      // Spherical direction vector
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      // Non-linear blast velocity: dense outer shell + trailing sparks
      const blastPower = Math.pow(Math.random(), 0.35);
      const baseSpeed = 48 * scale * blastPower;

      // Direction unit vector
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.sin(phi) * Math.sin(theta);
      const dz = Math.cos(phi);

      // Slight downward gravity drift on older spark trails
      const gravity = Math.pow(1 - blastPower, 2) * -12 * scale;

      // Spiral twist to make it look like an ethereal cosmic supernova
      const twist = (1 - blastPower) * 0.8;
      const twistedX = dx * Math.cos(twist) - dz * Math.sin(twist);
      const twistedZ = dx * Math.sin(twist) + dz * Math.cos(twist);

      coords[idx] = twistedX * baseSpeed;
      coords[idx + 1] = dy * baseSpeed + gravity;
      coords[idx + 2] = twistedZ * baseSpeed;
    }
    return coords;
  },

  /**
   * 5. Double Helix / DNA Strand
   * Intertwining double spirals with connecting horizontal base pair rungs.
   */
  helix: (count, scale = 1.8) => {
    const coords = new Float32Array(count * 3);
    const strandParticles = Math.floor(count * 0.72); // 72% for the 2 outer strands
    const rungParticles = count - strandParticles;     // 28% for base rungs

    const heightTotal = 90 * scale;
    const radius = 22 * scale;
    const turns = 3.5;

    // 1. Two main spiral strands
    for (let i = 0; i < strandParticles; i++) {
      const idx = i * 3;
      const t = (i / strandParticles) * (turns * Math.PI * 2);
      const strand = i % 2 === 0 ? 0 : Math.PI; // Phase offset of 180 deg
      const y = (i / strandParticles - 0.5) * heightTotal;
      const noise = (Math.random() - 0.5) * 2.2 * scale;

      coords[idx] = Math.cos(t + strand) * radius + noise;
      coords[idx + 1] = y;
      coords[idx + 2] = Math.sin(t + strand) * radius + noise;
    }

    // 2. Connecting base pair rungs
    for (let i = 0; i < rungParticles; i++) {
      const idx = (strandParticles + i) * 3;
      // Quantize rungs to periodic steps
      const rungIndex = Math.floor((i / rungParticles) * (turns * 8));
      const t = (rungIndex / (turns * 8)) * (turns * Math.PI * 2);
      const y = (rungIndex / (turns * 8) - 0.5) * heightTotal;

      // Interpolate along the chord between strand 1 and strand 2
      const chordPos = (Math.random() * 2 - 1); // -1 to +1 across the center
      const noise = (Math.random() - 0.5) * 1.5 * scale;

      coords[idx] = Math.cos(t) * radius * chordPos + noise;
      coords[idx + 1] = y + (Math.random() - 0.5) * 1.2;
      coords[idx + 2] = Math.sin(t) * radius * chordPos + noise;
    }

    return coords;
  },

  /**
   * 6. Pulsing Geodesic Sphere (Fibonacci Supernova)
   * Uniformly spaced golden ratio spherical lattice with harmonic wave oscillation.
   */
  sphere: (count, scale = 2.4) => {
    const coords = new Float32Array(count * 3);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const baseRadius = 26 * scale;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Fibonacci spiral on sphere
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);

      // Volume dispersion + harmonic ripple
      const ripple = Math.sin(phi * 6) * Math.cos(theta * 4) * 2.5;
      const r = (baseRadius + ripple) * Math.cbrt(0.2 + 0.8 * Math.random());

      coords[idx] = r * Math.sin(phi) * Math.cos(theta);
      coords[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[idx + 2] = r * Math.cos(phi);
    }
    return coords;
  }
};

// Aliases for seamless naming
ShapeGenerators.lotus = ShapeGenerators.flower;

