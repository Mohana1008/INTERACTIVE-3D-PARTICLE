/**
 * Hand Gesture & Landmark Analyzer
 * Extracts physical interaction parameters (pinch, spread, finger count, orientation)
 * from 21 MediaPipe 3D hand landmarks with temporal smoothing (low-pass filter).
 * 
 * Accurately detects:
 * - ☝️ Pointing Index (1 finger)  -> Saturn & Concentric Rings
 * - ✌️ Peace / Victory (2 fingers) -> Blooming Sacred Lotus Flower
 * - ❤️ Pinch Heart               -> 3D Volumetric Heart
 * - 🖐️ Open Palm (5 fingers)      -> Cosmic Fireworks / Nebula
 * - ✊ Closed Fist (0 fingers)    -> Pulsing Geodesic Sphere
 * - 🧬 3 Fingers Extended        -> DNA Double Helix
 */

export class GestureAnalyzer {
  constructor() {
    // Smoothed values to avoid jumpiness
    this.smoothedExpansion = 1.0;
    this.smoothedCentroidX = 0.5;
    this.smoothedCentroidY = 0.5;
    this.smoothedTilt = 0;

    // Gesture stability & one-shot triggering
    this.pendingShape = null;
    this.pendingShapeCount = 0;
    this.thresholdFrames = 3;   // ~150ms of stable gesture to trigger shape transition
    this.activeShape = null;    // Last confirmed gesture shape
  }

  /**
   * Euclidean distance between two 3D landmarks.
   */
  dist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Analyzes landmarks returned by MediaPipe Hands.
   * @param {Array} landmarks - 21 normalized hand landmarks (x, y, z)
   * @returns {Object} - Gesture analysis result
   */
  analyze(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return null;
    }

    const wrist = landmarks[0];

    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];

    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];

    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];

    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];

    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];

    // 1. Hand Centroid (Average of Wrist and Middle MCP)
    const rawCentroidX = (wrist.x + middleMcp.x) * 0.5;
    const rawCentroidY = (wrist.y + middleMcp.y) * 0.5;
    this.smoothedCentroidX += (rawCentroidX - this.smoothedCentroidX) * 0.25;
    this.smoothedCentroidY += (rawCentroidY - this.smoothedCentroidY) * 0.25;

    // 2. Pinch Distance (Thumb Tip to Index Tip)
    const pinchDist = this.dist(thumbTip, indexTip);

    // 3. Overall Hand Spread (Average distance from wrist to all 5 fingertips)
    const spread = (
      this.dist(wrist, thumbTip) +
      this.dist(wrist, indexTip) +
      this.dist(wrist, middleTip) +
      this.dist(wrist, ringTip) +
      this.dist(wrist, pinkyTip)
    ) / 5.0;

    // 4. Map Spread to Particle Expansion Factor:
    // Tight fist: ~0.15 -> expansion 0.35x
    // Open hand:  ~0.42 -> expansion 2.40x
    const rawExpansion = Math.max(0.25, Math.min(2.8, (spread - 0.16) / 0.24 * 1.8 + 0.4));
    this.smoothedExpansion += (rawExpansion - this.smoothedExpansion) * 0.20;

    // 5. Robust Finger Extension Checks (Invariant to 3D wrist rotation)
    // A finger is extended if tip is further from wrist than PIP AND tip is further from MCP than PIP
    const isIndexExt = this.dist(wrist, indexTip) > this.dist(wrist, indexPip) * 1.05 &&
                       this.dist(indexTip, indexMcp) > this.dist(indexPip, indexMcp) * 1.12;

    const isMiddleExt = this.dist(wrist, middleTip) > this.dist(wrist, middlePip) * 1.05 &&
                        this.dist(middleTip, middleMcp) > this.dist(middlePip, middleMcp) * 1.12;

    const isRingExt = this.dist(wrist, ringTip) > this.dist(wrist, ringPip) * 1.05 &&
                      this.dist(ringTip, ringMcp) > this.dist(ringPip, ringMcp) * 1.12;

    const isPinkyExt = this.dist(wrist, pinkyTip) > this.dist(wrist, pinkyPip) * 1.05 &&
                       this.dist(pinkyTip, pinkyMcp) > this.dist(pinkyPip, pinkyMcp) * 1.12;

    // 6. Detect Specific Gestures & Suggested Shapes
    let detectedGesture = 'Tracking Hand';
    let detectedShape = null;

    // Check Thumbs Up: Thumb pointing upward (lower Y), extended, while 4 fingers are curled
    const isThumbUp = (thumbTip.y < thumbMcp.y - 0.035) && 
                      (this.dist(thumbTip, indexMcp) > 0.12) &&
                      (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt);

    // Check OK Sign: Thumb + Index tips touching like a sphere ring, with middle and ring extended
    const isOkSign = (pinchDist < 0.08) && (isMiddleExt && isRingExt);

    // Priority 1: Thumbs Up 👍 -> Pulsing Geodesic Sphere 🔮
    if (isThumbUp) {
      detectedGesture = 'Thumbs Up 👍 (Sphere)';
      detectedShape = 'sphere';
    }
    // Priority 2: OK Sign 👌 -> Pulsing Geodesic Sphere 🔮
    else if (isOkSign) {
      detectedGesture = 'OK Sign 👌 (Sphere)';
      detectedShape = 'sphere';
    }
    // Priority 3: Pinch Heart ❤️ -> Volumetric 3D Heart
    else if (pinchDist < 0.08 && !isRingExt && !isPinkyExt) {
      detectedGesture = 'Pinch Heart ❤️';
      detectedShape = 'heart';
    }
    // Priority 4: Pointing Index Finger ☝️ (1 finger) -> Saturn & Rings 🪐
    else if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
      detectedGesture = 'Pointing ☝️ (Saturn)';
      detectedShape = 'saturn';
    }
    // Priority 5: Peace / Victory Sign ✌️ (2 fingers: Index + Middle) -> Sacred Lotus Flower 🌸
    else if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
      detectedGesture = 'Peace ✌️ (Lotus)';
      detectedShape = 'flower';
    }
    // Priority 6: Three Fingers 🧬 (Index + Middle + Ring) -> DNA Double Helix
    else if (isIndexExt && isMiddleExt && isRingExt && !isPinkyExt) {
      detectedGesture = '3 Fingers 🧬 (DNA Helix)';
      detectedShape = 'helix';
    }
    // Priority 7: Open Palm 🖐️ (All 4 fingers extended + spread) -> Fireworks 🎆
    else if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt && spread > 0.26) {
      detectedGesture = 'Open Palm 🖐️ (Fireworks)';
      detectedShape = 'fireworks';
    }
    // Priority 8: Closed Fist ✊ (All 4 fingers curled, no thumb up) -> Contracts particles without shape change!
    else if (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
      detectedGesture = 'Fist ✊ (Contracting)';
      detectedShape = null; // Pure contraction, preserves current shape!
    }

    // 7. Debounced One-Shot Shape Trigger
    let shapeTrigger = null;
    if (detectedShape) {
      if (detectedShape === this.pendingShape) {
        this.pendingShapeCount++;
        if (this.pendingShapeCount >= this.thresholdFrames) {
          if (this.activeShape !== detectedShape) {
            this.activeShape = detectedShape;
            shapeTrigger = detectedShape; // Fires once upon new gesture recognition
          }
        }
      } else {
        this.pendingShape = detectedShape;
        this.pendingShapeCount = 1;
      }
    } else {
      this.pendingShape = null;
      this.pendingShapeCount = 0;
    }

    // 8. Hand Tilt Angle (rotation around Z axis)
    const rawTilt = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
    this.smoothedTilt += (rawTilt - this.smoothedTilt) * 0.15;

    return {
      centroidX: this.smoothedCentroidX,
      centroidY: this.smoothedCentroidY,
      tilt: this.smoothedTilt,
      pinchDist,
      spread,
      expansion: this.smoothedExpansion,
      detectedGesture,
      shapeTrigger, // Non-null only on the frame when the shape switches
      // Horizontal position maps across color spectrum (0.0 to 1.0)
      hueOffset: (1.0 - this.smoothedCentroidX)
    };
  }
}
