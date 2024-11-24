// solar-system.component.ts
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';

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
  private centerSphere!: THREE.Mesh;
  private orbitingSphere!: THREE.Mesh;
  private ellipseCurve!: THREE.EllipseCurve;
  private time = 0;

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.createScene();
    this.animate();
  }

  private createScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high resolution
    this.renderer.setSize(window.innerWidth, window.innerHeight);


    this.addSun();

    this.addPlanets();

    // Lights
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);

    // Add orbit visualization (optional)
    const points = this.ellipseCurve.getPoints(100); // More points for smoother curve
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    this.scene.add(orbitLine);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addSun() {
    // Center sphere
    const centerSphereGeometry = new THREE.SphereGeometry(0.5, 64, 64); // Higher segments for smoothness
    const centerSphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.8,
      metalness: 0.2
    });
    this.centerSphere = new THREE.Mesh(centerSphereGeometry, centerSphereMaterial);
    this.scene.add(this.centerSphere);
  }

  addPlanets() {
    this.addMercury();
  }

  addMercury() {
    // Orbiting sphere
    const orbitingSphereGeometry = new THREE.SphereGeometry(0.2, 64, 64); // Higher segments
    const orbitingSphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.2,
      metalness: 0.7
    });
    this.orbitingSphere = new THREE.Mesh(orbitingSphereGeometry, orbitingSphereMaterial);
    this.scene.add(this.orbitingSphere);

    // Create elliptical curve
    this.ellipseCurve = new THREE.EllipseCurve(
      0, 0,            // Center x, y
      2, 1.5,          // xRadius, yRadius
      0, 2 * Math.PI,  // startAngle, endAngle
      false,           // clockwise
      0               // rotation
    );
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    // Update orbiting sphere position using EllipseCurve
    this.time += 0.005;
    this.updateMercury();
    this.renderer.render(this.scene, this.camera);
  }

  updateMercury() {
    const position = this.ellipseCurve.getPoint(this.time % 1);
    this.orbitingSphere.position.set(position.x, position.y, 0);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => { });
  }
}