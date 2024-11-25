import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface PlanetConfig {
  name: string;
  semiMajorAxis: number;
  eccentricity: number;
  color: number;
  orbitalPeriod: number;
  roughness: number;
  metalness: number;
}

@Component({
  selector: 'app-solar-system',
  templateUrl: './solar-system.component.html',
  styleUrl: './solar-system.component.css'
})
export class SolarSystemComponent implements AfterViewInit {
  @ViewChild('rendererCanvas') private canvasRef!: ElementRef;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private sun!: THREE.Mesh;
  private planets: Map<string, {
    mesh: THREE.Mesh,
    orbit: THREE.EllipseCurve,
    time: number
  }> = new Map();
  private rocket: THREE.Mesh | null = null;
  private rocketTrajectory: THREE.EllipseCurve | null = null;
  private rocketProgress: number = 0;
  isRocketLaunched: boolean = false;

  // Standard sizes
  private readonly STANDARD_PLANET_SIZE = 0.02;
  private readonly SUN_SIZE = this.STANDARD_PLANET_SIZE * 2;
  private readonly ROCKET_SIZE = this.STANDARD_PLANET_SIZE * 0.5;
  private readonly ROCKET_SPEED = 0.0005; // Adjust for faster/slower rocket movement

  // Actual scaled values (in AU and Earth days)
  private readonly PLANET_CONFIGS: PlanetConfig[] = [
    {
      name: 'Mercury',
      semiMajorAxis: 0.387,
      eccentricity: 0.206,
      color: 0xC0C0C0,
      orbitalPeriod: 88,
      roughness: 0.7,
      metalness: 0.3
    },
    {
      name: 'Venus',
      semiMajorAxis: 0.723,
      eccentricity: 0.007,
      color: 0xFAD5A5,
      orbitalPeriod: 225,
      roughness: 0.5,
      metalness: 0.4
    },
    {
      name: 'Earth',
      semiMajorAxis: 1.0,
      eccentricity: 0.017,
      color: 0x6B93D6,
      orbitalPeriod: 365,
      roughness: 0.6,
      metalness: 0.2
    },
    {
      name: 'Mars',
      semiMajorAxis: 1.524,
      eccentricity: 0.093,
      color: 0xE27B58,
      orbitalPeriod: 687,
      roughness: 0.8,
      metalness: 0.2
    },
    {
      name: 'Jupiter',
      semiMajorAxis: 5.203,
      eccentricity: 0.048,
      color: 0xC88B3A,
      orbitalPeriod: 4333,
      roughness: 0.4,
      metalness: 0.6
    },
    {
      name: 'Saturn',
      semiMajorAxis: 9.537,
      eccentricity: 0.054,
      color: 0xEAD6B8,
      orbitalPeriod: 10759,
      roughness: 0.3,
      metalness: 0.7
    },
    {
      name: 'Uranus',
      semiMajorAxis: 19.191,
      eccentricity: 0.047,
      color: 0xB5E3E3,
      orbitalPeriod: 30687,
      roughness: 0.5,
      metalness: 0.5
    },
    {
      name: 'Neptune',
      semiMajorAxis: 30.069,
      eccentricity: 0.009,
      color: 0x4B70DD,
      orbitalPeriod: 60190,
      roughness: 0.4,
      metalness: 0.6
    }
  ];

  private readonly SCALE_FACTOR = 1; // Adjust this to scale the entire system
  private readonly TIME_SCALE = 0.1; // Adjust for faster/slower orbits

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.createScene();
    this.animate();
  }

  private createScene() {
    // Scene setup with star background
    this.scene = new THREE.Scene();
    this.createStarBackground();
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Camera
    const neptuneSemiMajorAxis = this.PLANET_CONFIGS[7].semiMajorAxis * this.SCALE_FACTOR;
    const cameraDistance = neptuneSemiMajorAxis * 1.5; // Factor to ensure full visibility
    const cameraHeight = neptuneSemiMajorAxis * 1.2; // Slight angle for better perspective

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(cameraDistance, cameraHeight, cameraDistance);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 20, 100);
    this.controls.update();
    // this.camera.lookAt(0, 0, 0);


    this.addSun();
    this.addPlanets();
    this.addLighting();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private createStarBackground() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.05
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private addSun() {
    const sunGeometry = new THREE.SphereGeometry(this.SUN_SIZE, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFDB813,
      emissive: 0xFDB813,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
  }

  private addPlanets() {
    this.PLANET_CONFIGS.forEach(config => {
      // Create planet with standard size
      const planetGeometry = new THREE.SphereGeometry(
        this.STANDARD_PLANET_SIZE,
        32,
        32
      );
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: config.roughness,
        metalness: config.metalness
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);

      // Create orbit
      const semiMinorAxis = config.semiMajorAxis *
        Math.sqrt(1 - Math.pow(config.eccentricity, 2));
      const orbit = new THREE.EllipseCurve(
        config.eccentricity * config.semiMajorAxis * this.SCALE_FACTOR, 0,
        config.semiMajorAxis * this.SCALE_FACTOR,
        semiMinorAxis * this.SCALE_FACTOR,
        0, 2 * Math.PI,
        false,
        0
      );

      // Visualize orbit
      const points = orbit.getPoints(200);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.3
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      orbitLine.rotateX(Math.PI / 2); // Align orbits to XZ plane
      this.scene.add(orbitLine);

      this.planets.set(config.name, {
        mesh: planet,
        orbit: orbit,
        time: Math.random() // Random starting position
      });
      this.scene.add(planet);
    });
  }

  private addLighting() {
    // Sun light
    const sunLight = new THREE.PointLight(0xFDB813, 2, 10000);
    this.scene.add(sunLight);

    // Ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambientLight);
  }

  private createRocket() {
    // Create rocket mesh
    const rocketGeometry = new THREE.ConeGeometry(
      this.ROCKET_SIZE,
      this.ROCKET_SIZE * 4,
      8
    );
    const rocketMaterial = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      roughness: 0.3,
      metalness: 0.7
    });
    this.rocket = new THREE.Mesh(rocketGeometry, rocketMaterial);
    this.rocket.rotation.x = Math.PI / 2; // Point the rocket along its trajectory
  }

  private calculateHohmannTransfer() {
    const earthConfig = this.PLANET_CONFIGS.find(p => p.name === 'Earth')!;
    const marsConfig = this.PLANET_CONFIGS.find(p => p.name === 'Mars')!;

    // Calculate transfer orbit parameters
    const r1 = earthConfig.semiMajorAxis * this.SCALE_FACTOR;
    const r2 = marsConfig.semiMajorAxis * this.SCALE_FACTOR;
    const a = (r1 + r2) / 2; // Semi-major axis of transfer orbit
    const e = (r2 - r1) / (r2 + r1); // Eccentricity of transfer orbit

    // Create transfer orbit
    const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
    this.rocketTrajectory = new THREE.EllipseCurve(
      0, 0,
      a, b,
      0, Math.PI, // Only need half the ellipse for the transfer
      false,
      0
    );

    // Visualize transfer orbit
    const points = this.rocketTrajectory.getPoints(100);
    const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const trajectoryMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    });
    const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    trajectoryLine.rotateX(Math.PI / 2);
    this.scene.add(trajectoryLine);
  }

  launchRocket() {
    if (this.isRocketLaunched || !this.planets.get('Earth')) return;

    this.isRocketLaunched = true;
    this.createRocket();
    this.calculateHohmannTransfer();

    if (this.rocket) {
      this.scene.add(this.rocket);
      this.rocketProgress = 0;
    }
  }

  private updateRocket() {
    if (!this.rocket || !this.rocketTrajectory || !this.isRocketLaunched) return;

    this.rocketProgress += this.ROCKET_SPEED;

    if (this.rocketProgress >= 1) {
      // Rocket reached Mars, remove it from the scene
      this.scene.remove(this.rocket);
      this.rocket = null;
      return;
    }

    // Calculate rocket position along trajectory
    const position = this.rocketTrajectory.getPoint(this.rocketProgress);
    this.rocket.position.set(position.x, 0, position.y);

    // Calculate direction for rocket to point along trajectory
    if (this.rocketProgress < 1) {
      const nextPosition = this.rocketTrajectory.getPoint(
        Math.min(this.rocketProgress + 0.01, 1)
      );
      const direction = new THREE.Vector3(
        nextPosition.x - position.x,
        0,
        nextPosition.y - position.y
      ).normalize();

      // Update rocket rotation to point along trajectory
      const angle = Math.atan2(direction.z, direction.x);
      this.rocket.rotation.y = angle - Math.PI / 2;
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    // Update planet positions
    this.planets.forEach((planet, name) => {
      const config = this.PLANET_CONFIGS.find(p => p.name === name)!;
      planet.time += (this.TIME_SCALE / config.orbitalPeriod);

      const position = planet.orbit.getPoint(planet.time % 1);
      planet.mesh.position.set(
        position.x,
        0,
        position.y // Using y component for z in 3D space
      );
    });

    this.updateRocket();

    // Rotate sun
    this.sun.rotation.y += 0.001;

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => { });
    // Clean up Three.js resources
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    this.renderer.dispose();
  }
}