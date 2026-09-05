/**
 * Interaction Controls (Mouse, Touch & Keyboard Fallbacks)
 * Provides seamless navigation when camera/hand-tracking is off or disabled.
 */

export class InteractionControls {
  constructor(domElement, particleSystem, callbacks = {}) {
    this.domElement = domElement;
    this.particleSystem = particleSystem;
    this.callbacks = Object.assign({
      onShapeChange: () => {},
      onLowPowerToggle: () => {},
      onCameraToggle: () => {},
      onFpsToggle: () => {}
    }, callbacks);

    // Mouse state
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };
    
    // Touch state
    this.touchStartDist = 0;
    this.touchInitialExpansion = 1.0;
    this.isPinching = false;

    // Smoothing rotation targets
    this.targetRotationY = 0;
    this.targetRotationX = 0;

    this.bindEvents();
  }

  bindEvents() {
    const el = this.domElement;

    // --- Mouse Events ---
    el.addEventListener('mousedown', (e) => this.onMouseDown(e), { passive: false });
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: false });
    window.addEventListener('mouseup', () => this.onMouseUp(), { passive: true });
    el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // --- Touch Events ---
    el.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    el.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    el.addEventListener('touchend', () => this.onTouchEnd(), { passive: true });

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onMouseDown(e) {
    // Only capture if left mouse button and not clicking an interactive UI element
    if (e.button !== 0 || e.target.closest('#hud, button, input, select')) return;
    this.isDragging = true;
    this.prevMousePos = { x: e.clientX, y: e.clientY };
  }

  onMouseMove(e) {
    if (this.isDragging && this.particleSystem.pointsMesh) {
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;

      this.particleSystem.pointsMesh.rotation.y += dx * 0.006;
      this.particleSystem.pointsMesh.rotation.x += dy * 0.006;

      this.prevMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(e) {
    if (e.target.closest('#hud, button, input, select')) return;
    e.preventDefault();

    // Wheel delta adjusts particle expansion
    const delta = -Math.sign(e.deltaY) * 0.15;
    const nextExp = Math.max(0.2, Math.min(3.0, this.particleSystem.targetExpansion + delta));
    this.particleSystem.setExpansion(nextExp);
  }

  onTouchStart(e) {
    if (e.target.closest('#hud, button, input, select')) return;

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isPinching = true;
      this.touchStartDist = this.getTouchDistance(e.touches[0], e.touches[1]);
      this.touchInitialExpansion = this.particleSystem.targetExpansion;
    }
  }

  onTouchMove(e) {
    if (e.target.closest('#hud, button, input, select')) return;

    if (e.touches.length === 1 && this.isDragging && this.particleSystem.pointsMesh) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.prevMousePos.x;
      const dy = e.touches[0].clientY - this.prevMousePos.y;

      this.particleSystem.pointsMesh.rotation.y += dx * 0.008;
      this.particleSystem.pointsMesh.rotation.x += dy * 0.008;

      this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && this.isPinching) {
      e.preventDefault();
      const currentDist = this.getTouchDistance(e.touches[0], e.touches[1]);
      const factor = currentDist / (this.touchStartDist || 1);
      const nextExp = Math.max(0.2, Math.min(3.0, this.touchInitialExpansion * factor));
      this.particleSystem.setExpansion(nextExp);
    }
  }

  onTouchEnd() {
    this.isDragging = false;
    this.isPinching = false;
  }

  getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  onKeyDown(e) {
    // Avoid capturing inputs if user is focusing a form control
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    switch (e.key) {
      case '1':
        this.callbacks.onShapeChange('heart');
        break;
      case '2':
        this.callbacks.onShapeChange('flower');
        break;
      case '3':
        this.callbacks.onShapeChange('saturn');
        break;
      case '4':
        this.callbacks.onShapeChange('fireworks');
        break;
      case '5':
        this.callbacks.onShapeChange('helix');
        break;
      case '6':
        this.callbacks.onShapeChange('sphere');
        break;
      case ' ': // Spacebar = explosion shockwave
        e.preventDefault();
        this.particleSystem.explode(2.0);
        break;
      case 'l':
      case 'L':
        this.callbacks.onLowPowerToggle();
        break;
      case 'f':
      case 'F':
        this.callbacks.onFpsToggle();
        break;
      case 'c':
      case 'C':
        this.callbacks.onCameraToggle();
        break;
    }
  }

  dispose() {
    // Cleanup listeners
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
