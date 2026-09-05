/**
 * MediaPipe Hands (Lite) & Webcam Capture Manager
 * 
 * Strict Privacy & Security:
 * - 100% Client-Side: Zero network transmission of video or coordinates.
 * - Explicit Consent: Started ONLY upon user trigger.
 * - Clean Lifecycle: Complete stream track teardown when disabled.
 * - Downscaled Input: 320x240 capture to preserve CPU & 8GB RAM integrated graphics.
 * - Frame Throttling: Inference runs on every Nth frame to keep render loop 60 FPS.
 */

import { CONFIG } from './config.js';
import { GestureAnalyzer } from './gesture-analyzer.js';

export class HandTracker {
  constructor(callbacks = {}) {
    this.callbacks = Object.assign({
      onStatusChange: () => {},
      onGesture: () => {},
      onError: () => {}
    }, callbacks);

    this.videoElement = null;
    this.pipCanvas = null;
    this.pipCtx = null;
    this.stream = null;
    this.handsModel = null;
    this.analyzer = new GestureAnalyzer();

    this.isActive = false;
    this.isModelLoaded = false;
    this.frameCounter = 0;
    this.frameThrottle = CONFIG.tracking.frameThrottle;
    this.isProcessingFrame = false;
    this.animationFrameId = null;

    this.initElements();
  }

  /**
   * Initializes internal hidden video element and PiP canvas.
   */
  initElements() {
    // Hidden video element for webcam feed
    this.videoElement = document.createElement('video');
    this.videoElement.setAttribute('autoplay', '');
    this.videoElement.setAttribute('muted', '');
    this.videoElement.setAttribute('playsinline', ''); // Essential for iOS Safari
    this.videoElement.width = CONFIG.tracking.videoWidth;
    this.videoElement.height = CONFIG.tracking.videoHeight;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    // Get PiP debug canvas from DOM if present
    this.pipCanvas = document.getElementById('pip-canvas');
    if (this.pipCanvas) {
      this.pipCanvas.width = CONFIG.tracking.videoWidth;
      this.pipCanvas.height = CONFIG.tracking.videoHeight;
      this.pipCtx = this.pipCanvas.getContext('2d');
    }
  }

  /**
   * Loads MediaPipe Hands library in Lite configuration (`modelComplexity: 0`).
   */
  async loadModel() {
    if (this.isModelLoaded && this.handsModel) return;

    if (typeof window.Hands === 'undefined') {
      throw new Error('MediaPipe Hands library is not loaded. Check script tag or network.');
    }

    this.handsModel = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.handsModel.setOptions({
      maxNumHands: CONFIG.tracking.maxHands,
      modelComplexity: CONFIG.tracking.modelComplexity, // 0 = Lite
      minDetectionConfidence: CONFIG.tracking.minDetectionConfidence,
      minTrackingConfidence: CONFIG.tracking.minTrackingConfidence
    });

    this.handsModel.onResults((results) => this.handleResults(results));
    this.isModelLoaded = true;
  }

  /**
   * Starts webcam capture upon explicit user button click.
   */
  async start() {
    if (this.isActive) return;

    this.callbacks.onStatusChange({ status: 'starting', message: 'Requesting camera...' });

    try {
      // 1. Ensure MediaPipe Hands model is initialized
      await this.loadModel();

      // 2. Request webcam with downscaled dimensions for integrated GPU performance
      const constraints = {
        audio: false,
        video: {
          width: { ideal: CONFIG.tracking.videoWidth },
          height: { ideal: CONFIG.tracking.videoHeight },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;

      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      this.isActive = true;
      this.callbacks.onStatusChange({ status: 'active', message: 'Camera Active (Local Only)' });

      // Start throttled tracking loop
      this.trackLoop();
    } catch (err) {
      this.stop();
      let errorMsg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access was denied. You can still use touch/mouse controls!';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No webcam found on this device.';
      }
      this.callbacks.onError(errorMsg, err);
      this.callbacks.onStatusChange({ status: 'error', message: errorMsg });
    }
  }

  /**
   * Main tracking loop with frame-skipping throttling.
   */
  trackLoop() {
    if (!this.isActive) return;

    this.frameCounter++;

    // Only send video frame to MediaPipe model on throttled intervals
    if (this.frameCounter % this.frameThrottle === 0 && !this.isProcessingFrame) {
      if (this.videoElement.readyState >= 2) {
        this.isProcessingFrame = true;
        this.handsModel.send({ image: this.videoElement })
          .catch((err) => console.warn('Frame processing dropped:', err))
          .finally(() => {
            this.isProcessingFrame = false;
          });
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.trackLoop());
  }

  /**
   * Handles landmark results returned from MediaPipe Hands.
   */
  handleResults(results) {
    if (!this.isActive) return;

    // Draw PiP thumbnail with skeleton overlay
    this.renderPiP(results);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const gestureData = this.analyzer.analyze(landmarks);
      if (gestureData) {
        this.callbacks.onGesture(gestureData);
      }
    } else {
      this.callbacks.onGesture(null);
    }
  }

  /**
   * Renders a lightweight PiP video feed and hand landmark skeleton.
   */
  renderPiP(results) {
    if (!this.pipCtx || !this.pipCanvas) return;

    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    // Mirror preview horizontally for natural webcam mirror feel
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    // Draw video frame
    if (this.videoElement && this.videoElement.readyState >= 2) {
      ctx.drawImage(this.videoElement, 0, 0, w, h);
    }

    // Draw landmarks if detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw connections (skeleton bones)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
        [5, 9], [9, 13], [13, 17]             // Palm base
      ];

      ctx.strokeStyle = 'rgba(0, 242, 255, 0.75)';
      ctx.lineWidth = 2.5;

      for (const [start, end] of connections) {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }

      // Draw landmark nodes
      ctx.fillStyle = '#ff007f';
      for (let i = 0; i < landmarks.length; i++) {
        const p = landmarks[i];
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, i === 4 || i === 8 ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Sets frame throttling frequency (e.g. 2 for normal, 4 for low power).
   */
  setThrottle(val) {
    this.frameThrottle = Math.max(1, Math.min(6, Math.round(val)));
  }

  /**
   * Stops camera stream immediately, cleans up MediaStream tracks and pauses loop.
   */
  stop() {
    this.isActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.pipCtx && this.pipCanvas) {
      this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);
    }

    this.callbacks.onStatusChange({ status: 'inactive', message: 'Camera Inactive' });
    this.callbacks.onGesture(null);
  }

  /**
   * Pauses tracking (e.g. when tab is backgrounded).
   */
  pause() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resumes tracking when tab is visible again.
   */
  resume() {
    if (this.isActive && !this.animationFrameId) {
      this.trackLoop();
    }
  }

  /**
   * Total cleanup when destroying application.
   */
  dispose() {
    this.stop();
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
    this.handsModel = null;
  }
}
