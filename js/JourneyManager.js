export class JourneyManager {
    constructor(starSystem, cameraController, nebula) {
        this.starSystem = starSystem;
        this.cameraController = cameraController;
        this.nebula = nebula;
        
        this.currentStar = null;
        this.previousStars = [];
        this.journeyActive = false;
        this.journeyPhase = 'idle'; // idle, accelerating, cruising, approaching, arrived
        
        this.distanceTraveled = 0;
        this.currentSpeed = 0;
        this.journeyStartTime = 0;
        
        this.waypoints = [];
        this.currentWaypointIndex = 0;
    }

    startJourney() {
        this.journeyActive = true;
        this.journeyStartTime = Date.now();
        this.previousStars = [];
        this.distanceTraveled = 0;
        
        // Start from near the Sun
        const startPos = new THREE.Vector3(50, 0, 100);
        this.cameraController.moveTo(startPos, 3);
        
        // Plan first destination
        this.planNextLeg();
    }

    restartJourney() {
        this.journeyActive = false;
        setTimeout(() => this.startJourney(), 1000);
    }

    planNextLeg() {
        if (!this.starSystem || !this.cameraController) return;
        
        const currentPosition = this.cameraController.getPosition();
        const nextStar = this.starSystem.getNextDestination(
            currentPosition,
            this.previousStars
        );
        
        if (nextStar) {
            this.currentStar = nextStar;
            this.previousStars.push(nextStar);
            
            // Keep only last 10 visited stars in memory
            if (this.previousStars.length > 10) {
                this.previousStars.shift();
            }
            
            // Calculate journey parameters
            const targetPosition = new THREE.Vector3(nextStar.x, nextStar.y, nextStar.z);
            const distance = currentPosition.distanceTo(targetPosition);
            
            // Set journey duration based on distance (cinematic pacing)
            const duration = Math.min(20, Math.max(5, distance / 500));
            
            // Create waypoints for interesting camera path
            this.createWaypoints(currentPosition, targetPosition, distance);
            
            this.journeyPhase = 'accelerating';
        }
    }

    createWaypoints(start, end, distance) {
        this.waypoints = [];
        this.currentWaypointIndex = 0;
        
        // Add intermediate waypoints for cinematic curves
        const midPoint = start.clone().lerp(end, 0.5);
        
        // Add some perpendicular offset for curved path
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * distance * 0.3,
            (Math.random() - 0.5) * distance * 0.1,
            (Math.random() - 0.5) * distance * 0.3
        );
        
        midPoint.add(offset);
        
        this.waypoints = [start, midPoint, end];
    }

    update(delta, elapsed) {
        if (!this.journeyActive) return;
        
        const currentPosition = this.cameraController.getPosition();
        
        // Update distance traveled
        if (this.currentStar) {
            const targetPos = new THREE.Vector3(
                this.currentStar.x,
                this.currentStar.y,
                this.currentStar.z
            );
            const remainingDistance = currentPosition.distanceTo(targetPos);
            this.distanceTraveled = this.getTotalDistance() - remainingDistance;
        }
        
        // Update speed based on journey phase
        this.updateSpeed();
        
        // Update nebula density based on position
        if (this.nebula) {
            this.nebula.setCameraPosition(currentPosition);
        }
        
        // Check if we've reached the destination
        if (this.currentStar) {
            const targetPos = new THREE.Vector3(
                this.currentStar.x,
                this.currentStar.y,
                this.currentStar.z
            );
            
            if (currentPosition.distanceTo(targetPos) < 50) {
                this.arriveAtDestination();
            }
        }
        
        // Move to next waypoint if needed
        this.updateWaypointNavigation();
    }

    updateSpeed() {
        switch (this.journeyPhase) {
            case 'accelerating':
                this.currentSpeed += 0.01;
                if (this.currentSpeed >= 1.0) {
                    this.currentSpeed = 1.0;
                    this.journeyPhase = 'cruising';
                }
                break;
                
            case 'cruising':
                this.currentSpeed = 1.0;
                break;
                
            case 'approaching':
                this.currentSpeed -= 0.02;
                if (this.currentSpeed <= 0.3) {
                    this.currentSpeed = 0.3;
                }
                break;
                
            case 'arrived':
                this.currentSpeed = 0;
                break;
        }
        
        this.cameraController.setSpeed(this.currentSpeed * this.cameraController.maxSpeed);
    }

    updateWaypointNavigation() {
        if (this.waypoints.length === 0) return;
        
        const currentWaypoint = this.waypoints[this.currentWaypointIndex];
        const currentPosition = this.cameraController.getPosition();
        
        if (currentPosition.distanceTo(currentWaypoint) < 100) {
            this.currentWaypointIndex++;
            
            if (this.currentWaypointIndex >= this.waypoints.length) {
                // Reached final destination
                this.journeyPhase = 'arrived';
            } else if (this.currentWaypointIndex === this.waypoints.length - 1) {
                // Approaching final waypoint
                this.journeyPhase = 'approaching';
            } else {
                // Continue to next waypoint
                this.cameraController.moveTo(currentWaypoint, 8);
            }
        } else {
            this.cameraController.moveTo(currentWaypoint, 8);
        }
    }

    arriveAtDestination() {
        this.journeyPhase = 'arrived';
        
        // Trigger camera shake for dramatic arrival
        this.cameraController.shake(2);
        
        // Pause briefly before next journey leg
        setTimeout(() => {
            if (this.journeyActive) {
                this.planNextLeg();
            }
        }, 3000);
    }

    getTotalDistance() {
        if (!this.currentStar || !this.cameraController) return 0;
        
        const startPos = new THREE.Vector3(50, 0, 100); // Starting position near Sun
        const targetPos = new THREE.Vector3(
            this.currentStar.x,
            this.currentStar.y,
            this.currentStar.z
        );
        
        return startPos.distanceTo(targetPos);
    }

    getJourneyProgress() {
        const total = this.getTotalDistance();
        if (total === 0) return 0;
        
        return this.distanceTraveled / total;
    }

    getCurrentPhase() {
        return this.journeyPhase;
    }
}

// Need to import THREE for Vector3
import * as THREE from 'three';
