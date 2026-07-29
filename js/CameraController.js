import * as THREE from 'three';

export class CameraController {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        
        this.targetPosition = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        
        this.isMoving = false;
        this.speed = 0;
        this.maxSpeed = 50;
        this.smoothing = 0.02;
        
        // Camera rotation for cinematic angles
        this.targetRotation = new THREE.Euler();
        this.currentRotation = new THREE.Euler();
        
        // Field of view for dynamic FOV effects
        this.targetFOV = 60;
        this.currentFOV = 60;
    }

    moveTo(target, duration = 5) {
        this.targetPosition.copy(target);
        this.isMoving = true;
        this.moveDuration = duration;
        this.moveStartTime = Date.now();
    }

    lookAt(target) {
        this.camera.lookAt(target);
    }

    update(delta, elapsed) {
        if (this.isMoving) {
            const progress = Math.min(1, (Date.now() - this.moveStartTime) / (this.moveDuration * 1000));
            
            // Smooth easing function (ease-in-out-cubic)
            const easedProgress = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Interpolate position
            this.camera.position.lerpVectors(
                this.currentPosition.clone(),
                this.targetPosition,
                easedProgress
            );
            
            // Dynamic speed based on progress
            this.speed = Math.sin(progress * Math.PI) * this.maxSpeed;
            
            // Look slightly ahead in the direction of travel
            const lookAhead = this.targetPosition.clone().lerp(
                this.camera.position.clone(),
                0.3
            );
            this.camera.lookAt(lookAhead);
            
            if (progress >= 1) {
                this.isMoving = false;
                this.speed = 0;
            }
        }
        
        // Update current position reference
        this.currentPosition.copy(this.camera.position);
        
        // Dynamic FOV for speed effect
        const targetFOVBasedOnSpeed = 60 + this.speed * 0.5;
        this.currentFOV += (targetFOVBasedOnSpeed - this.currentFOV) * this.smoothing;
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();
    }

    setSpeed(speed) {
        this.speed = speed;
        this.maxSpeed = speed;
    }

    getPosition() {
        return this.camera.position.clone();
    }

    getVelocity() {
        return this.velocity.clone();
    }

    shake(intensity = 0.5) {
        // Add camera shake for dramatic moments
        const shakeX = (Math.random() - 0.5) * intensity;
        const shakeY = (Math.random() - 0.5) * intensity;
        const shakeZ = (Math.random() - 0.5) * intensity;
        
        this.camera.position.x += shakeX;
        this.camera.position.y += shakeY;
        this.camera.position.z += shakeZ;
    }

    warpEffect(duration = 2) {
        // Simulate warp speed effect with FOV and motion blur
        const startTime = Date.now();
        
        const warpInterval = setInterval(() => {
            const progress = (Date.now() - startTime) / (duration * 1000);
            
            if (progress >= 1) {
                clearInterval(warpInterval);
                this.camera.fov = 60;
                this.camera.updateProjectionMatrix();
                return;
            }
            
            // Stretch FOV dramatically
            this.camera.fov = 60 + progress * 100;
            this.camera.updateProjectionMatrix();
        }, 16);
    }
}
