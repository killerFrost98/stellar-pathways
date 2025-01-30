import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  ArrowHelper,
  BufferGeometry,
  Clock,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line, LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Sprite, SpriteMaterial,
  TextureLoader,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Earth3d } from './helpers/EarthComponent';
import { Planet } from './helpers/PlanetComponent';
import { rungeKutta4 } from './helpers/RK4Componnet';
import { StarPoints, Sun } from './helpers/SunComponent';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-solar-system',
  templateUrl: './solar-system.component.html',
  styleUrls: ['./solar-system.component.css'],
})
export class SolarSystemComponent implements AfterViewInit, OnDestroy {

  @ViewChild('rendererCanvas') private canvas!: ElementRef;

  EARHRADIUS: number = 6371.0 / 1000000;
  camDistance = 3.141;
  utcTime = 0;
  currentFact = '';
  pyData = {
    svs: {
      sun: [0, 0, 0, 0, 0, 0],
      mercury: [0, 0, 0, 0, 0, 0],
      venus: [0, 0, 0, 0, 0, 0],
      earth: [0, 0, 0, 0, 0, 0],
      moon: [0, 0, 0, 0, 0, 0],
      mars: [0, 0, 0, 0, 0, 0],
      jupiter: [0, 0, 0, 0, 0, 0],
      saturn: [0, 0, 0, 0, 0, 0],
      uranus: [0, 0, 0, 0, 0, 0],
      neptune: [0, 0, 0, 0, 0, 0],
      pluto: [0, 0, 0, 0, 0, 0],
      earth_norms: {
        sun: [0, 0, 0],
        moon: [0, 0, 0]
      },
      timestamp: 0
    },
    pluto_scale: 1,
    dt_sim_scale: 0
  };

  private camera!: PerspectiveCamera;
  private scene!: Scene;
  private renderer!: WebGLRenderer;
  private clock: Clock = new Clock();
  private stats!: Stats;
  private labelRenderer!: CSS2DRenderer;
  private controls!: OrbitControls;
  private sun!: Sun;
  private planetMeshes: { [key: string]: any } = {};
  private target!: Vector3;
  private spaceTime = 0;
  private dtSimScale = 1;
  private bodies: any[] = [];
  private bodies2: any[] = [];
  private otime = 0;
  private mercuryOrbit: number[][] = [[], [], []];
  private venusOrbit: number[][] = [[], [], []];
  private earthOrbit: number[][] = [[], [], []];
  private moonOrbit: number[][] = [[], [], []];
  private marsOrbit: number[][] = [[], [], []];
  private jupiterOrbit: number[][] = [[], [], []];
  private saturnOrbit: number[][] = [[], [], []];
  private uranusOrbit: number[][] = [[], [], []];
  private neptuneOrbit: number[][] = [[], [], []];
  private plutoOrbit: number[][] = [[], [], []];
  private sunOrbit: number[][] = [[], [], []];
  private o1!: DynOrbits;
  private o2!: DynOrbits;
  private o3!: DynOrbits;
  private o4!: DynOrbits;
  private o5!: DynOrbits;
  private o6!: DynOrbits;
  private o7!: DynOrbits;
  private o8!: DynOrbits;
  private o9!: DynOrbits;
  private o10!: DynOrbits;
  private stars!: StarPoints;
  private rotCorrection = 1; // earth may now be flipped :|

  constructor(private http: HttpClient) { }

  ngAfterViewInit(): void {
    this.loadPlanetsData().subscribe(data => {
      this.pyData = data;
      this.init();
    });
  }

  loadPlanetsData(): Observable<any> {
    return this.http.get('./assets/solar-system/positions/positions.json');
  }

  ngOnDestroy(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose()
    }
  }


  private init(): void {

    // BASIC SETUP
    // ==================================================================================
    this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, .0001, 3000);
    this.camera.position.set(.5, .2, 4);
    this.scene = new Scene();
    this.scene.background = new Color(0x141414);
    this.renderer = new WebGLRenderer({ antialias: true, canvas: this.canvas.nativeElement });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    // CONTROLS
    // ==================================================================================
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    document.body.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
    this.controls.update();

    // SUN
    // ==================================================================================
    const suntex = "/assets/solar-system/images/lens_flare_1.jpeg";
    const flareCircle = "/assets/solar-system/images/lens_flare_circle_64x64.jpeg";
    const flareHex = "/assets/solar-system/images/lens_flare_hexagon_256x256.jpeg";
    this.sun = new Sun();
    this.sun.setModelOne(suntex, flareCircle, flareHex);
    this.scene.add(this.sun);
    this.sun.setPosition(this.pyData.svs.sun[0], this.pyData.svs.sun[1], this.pyData.svs.sun[2]);

    // PLANETS
    // ==================================================================================
    const sp = 1000000;
    //scaling factor, from python we use a 1e-7, here we sclae by 1e-6, so planets are 10 bigger
    const ringSprite = new TextureLoader().load("/assets/solar-system/images/ring.png");

    this.planetMeshes =
    {
      'mercury': { 'mesh': null },
      'venus': { 'mesh': null },
      'earth': { 'mesh': null },
      'moon': { 'mesh': null },
      'mars': { 'mesh': null },
      'jupiter': { 'mesh': null },
      'saturn': { 'mesh': null },
      'uranus': { 'mesh': null },
      'neptune': { 'mesh': null },
      'pluto': { 'mesh': null }
    }

    const mercury = new Planet(2439.7 / sp, 0xada8a5, this.camera, this.scene);
    mercury.init(
      "/assets/solar-system/images/2k_mercury.jpeg",
      "/assets/solar-system/images/2k_mercury_dark.png",
      this.pyData.svs.mercury, 0.0, ringSprite
    );
    this.scene.add(mercury);
    this.planetMeshes['mercury'].mesh = mercury;

    const venus = new Planet(6051.8 / sp, 0xf8e2b0, this.camera, this.scene);
    venus.init(
      "/assets/solar-system/images/2k_venus.jpeg",
      "/assets/solar-system/images/2k_venus_dark.png",
      this.pyData.svs.venus, 177.4 * Math.PI / 180, ringSprite
    );
    this.scene.add(venus);
    this.planetMeshes['venus'].mesh = venus;

    const earth = new Earth3d(this.camera);
    earth.loadTextures("/assets/solar-system/images/8081_earthmap10k.jpg", "/assets/solar-system/images/8081_earthlights10k.jpg");
    this.scene.add(earth);
    earth.setPosition(this.pyData.svs.earth[0], this.pyData.svs.earth[1], this.pyData.svs.earth[2])
    earth.setSunOrigin();

    /*

    A messy attempt to orient the Earth correctly with respect to the Sun and Moon.


    We calculate the Sun's latitude, longitude, and XYZ coordinates in an ECEF frame.
    Then, we rotate the Earth so that the ECEF vector aligns with its ECI Sun vector using a quaternion.
    This aligns the vector, but now the Earth is incorrectly rotated with respect to the ECI Sun vector.
    Next, we use the Moon's ECI position to rotate the Earth around the ECI Sun vector
    until its potential Moon latitude, longitude, and XYZ coordinates are as close as possible.

    */
    const sunFromEarth = new Vector3(
      this.pyData.svs.sun[0] - this.pyData.svs.earth[0],
      this.pyData.svs.sun[1] - this.pyData.svs.earth[1],
      this.pyData.svs.sun[2] - this.pyData.svs.earth[2]).normalize();
    const sunEcef = this.pyData.svs.earth_norms.sun;
    const moonEcef = this.pyData.svs.earth_norms.moon;
    const quaternionPointEarth = new Quaternion();
    quaternionPointEarth.setFromUnitVectors(
      new Vector3(sunEcef[0], sunEcef[1], sunEcef[2]),
      sunFromEarth
    );
    earth.applyQuaternion(quaternionPointEarth);
    const dummyEarth = new Group();
    dummyEarth.position.copy(earth.position);
    dummyEarth.applyQuaternion(quaternionPointEarth);
    const dummyPos = new Object3D();
    dummyPos.position.set(moonEcef[0], moonEcef[1], moonEcef[2]);
    dummyEarth.add(dummyPos);
    const moonR = new Vector3(this.pyData.svs.moon[0], this.pyData.svs.moon[1], this.pyData.svs.moon[2]).sub(earth.position);
    moonR.normalize().multiplyScalar(this.EARHRADIUS);
    let minDistanceMoonLatLon = 1000000000000;
    let angelMoonCorrection = 0;
    const _moonSpinVect = new Vector3();
    dummyPos.getWorldPosition(_moonSpinVect);
    if (_moonSpinVect.y < 0) { this.rotCorrection = -1; }
    for (let i = 0; i < 2 * Math.PI; i += .01) {
      dummyEarth.rotateOnWorldAxis(sunFromEarth, .01);
      dummyPos.getWorldPosition(_moonSpinVect);
      _moonSpinVect.sub(earth.position);
      if (moonR.distanceToSquared(_moonSpinVect) < minDistanceMoonLatLon) {
        minDistanceMoonLatLon = moonR.distanceToSquared(_moonSpinVect);
        angelMoonCorrection = i;
      }
    }
    earth.rotateOnWorldAxis(sunFromEarth, angelMoonCorrection);

    this.planetMeshes['earth'].mesh = earth;
    const arrowHelper = new ArrowHelper(
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 0),
      this.EARHRADIUS * 1.5, 0x6b93d6);
    earth.add(arrowHelper);
    const earthRing = new Sprite(new SpriteMaterial({
      map: ringSprite,
      color: 0x6b93d6,
      depthTest: false
    }));
    earth.add(earthRing);

    const moon = new Planet(1737.4 / sp, 0xe5e5e5, this.camera, this.scene);
    moon.initWithoutRing(
      "/assets/solar-system/images/2k_moon.jpeg",
      "/assets/solar-system/images/moonuv_dark.jpg",
      this.pyData.svs.moon, 6.8 * Math.PI / 180
    );
    this.scene.add(moon);
    this.planetMeshes['moon'].mesh = moon;

    const mars = new Planet(3389.5 / sp, 0xE27B58, this.camera, this.scene);
    mars.init(
      "/assets/solar-system/images/2k_mars.jpeg",
      "/assets/solar-system/images/2k_mars_dark.png",
      this.pyData.svs.mars, 25.19 * Math.PI / 180, ringSprite
    );
    this.scene.add(mars);
    this.planetMeshes['mars'].mesh = mars;

    const jupiter = new Planet(69911 / sp, 0x90614D, this.camera, this.scene);
    jupiter.init(
      "/assets/solar-system/images/2k_jupiter.jpeg",
      "/assets/solar-system/images/2k_jupiter_dark.png",
      this.pyData.svs.jupiter, 3.13 * Math.PI / 180, ringSprite
    );
    this.scene.add(jupiter);
    this.planetMeshes['jupiter'].mesh = jupiter;

    const saturn = new Planet(58232 / sp, 0xe2bf7d, this.camera, this.scene);
    saturn.init(
      "/assets/solar-system/images/2k_saturn.jpeg",
      "/assets/solar-system/images/2k_saturn_dark.png",
      this.pyData.svs.saturn, 26.73 * Math.PI / 180, ringSprite
    );
    this.scene.add(saturn);
    this.planetMeshes['saturn'].mesh = saturn;

    const rstart = saturn.r * 1.3;
    const rend = saturn.r + rstart;
    const rmid = rstart + (rend - rstart) / 2;
    const satring = "/assets/solar-system/images/2k_saturn_ring_alpha.png";
    const satringGeo = new RingGeometry(rstart, rend, 128);
    const pos = satringGeo.attributes['position'];
    const satv = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      satv.fromBufferAttribute(pos, i);
      satringGeo.attributes['uv'].setXY(i, satv.length() < rmid ? 0 : 1, 1); // 5<6>7
    }
    const satringMat = new MeshBasicMaterial({
      map: new TextureLoader().load(satring),
      color: 0xffffff,
      side: DoubleSide,
      transparent: true
    });
    const saturnRing = new Mesh(satringGeo, satringMat);
    saturnRing.rotation.x = Math.PI / 2 * 95;
    saturn.add(saturnRing);

    const uranus = new Planet(25362 / sp, 0xafdbf5, this.camera, this.scene);
    uranus.init(
      "/assets/solar-system/images/2k_uranus.jpeg",
      "/assets/solar-system/images/2k_uranus_dark.png",
      this.pyData.svs.uranus, 97.77 * Math.PI / 180, ringSprite
    );
    this.scene.add(uranus);
    this.planetMeshes['uranus'].mesh = uranus;

    const neptune = new Planet(24622 / sp, 0x657BA6, this.camera, this.scene);
    neptune.init(
      "/assets/solar-system/images/2k_neptune.jpeg",
      "/assets/solar-system/images/2k_neptune_dark.png",
      this.pyData.svs.neptune, 28.32 * Math.PI / 180, ringSprite
    );
    this.scene.add(neptune);
    this.planetMeshes['neptune'].mesh = neptune;

    const pluto = new Planet(1188.3 / sp, 0xced2d9, this.camera, this.scene);
    pluto.init(
      "/assets/solar-system/images/2k_pluto.jpeg",
      "/assets/solar-system/images/2k_pluto_dark.png",
      this.pyData.svs.pluto, 120 * Math.PI / 180, ringSprite
    );
    this.scene.add(pluto);
    this.planetMeshes['pluto'].mesh = pluto;


    // MORE PLANET DATA & RK4
    // ==================================================================================
    const tau = 2 * Math.PI;
    const mercurySideral = tau / (1407.6 * 60 * 60);
    const venusSideral = tau / (-5832.5 * 60 * 60);
    const earthSideral = tau / (23.9 * 60 * 60);
    const moonSideral = tau / (655.7 * 60 * 60);
    const marsSideral = tau / (24.6 * 60 * 60);
    const jupiterSideral = tau / (9.9 * 60 * 60);
    const saturnSideral = tau / (10.7 * 60 * 60);
    const uranusSideral = tau / (-17.2 * 60 * 60);
    const neptuneSideral = tau / (16.1 * 60 * 60);
    const plutoSideral = tau / (153.3 * 60 * 60);

    // const masses = [
    //     1.989e30,  // Sun
    //     3.301e23,  // Mercury
    //     4.867e24,  // Venus
    //     5.972e24,  // Earth
    //     7.342e22,  // Moon
    //     6.417e23,  // Mars
    //     1.898e27,  // Jupiter
    //     5.683e26,  // Saturn
    //     8.681e25,  // Uranus
    //     1.024e26,  // Neptune
    //     1.309e22  // Pluto
    // ];

    this.bodies = []
    this.bodies.push({
      mass: 1.989e30,
      x: this.pyData.svs.sun[0], y: this.pyData.svs.sun[1], z: this.pyData.svs.sun[2],
      vx: this.pyData.svs.sun[3], vy: this.pyData.svs.sun[4], vz: this.pyData.svs.sun[5]
      // sun
    })
    this.bodies.push({
      mass: 3.301e23,
      x: this.pyData.svs.mercury[0], y: this.pyData.svs.mercury[1], z: this.pyData.svs.mercury[2],
      vx: this.pyData.svs.mercury[3], vy: this.pyData.svs.mercury[4], vz: this.pyData.svs.mercury[5]
      // mercury
    })
    this.bodies.push({
      mass: 4.867e24,
      x: this.pyData.svs.venus[0], y: this.pyData.svs.venus[1], z: this.pyData.svs.venus[2],
      vx: this.pyData.svs.venus[3], vy: this.pyData.svs.venus[4], vz: this.pyData.svs.venus[5]
      // venus
    })
    this.bodies.push({
      mass: 5.972e24,
      x: this.pyData.svs.earth[0], y: this.pyData.svs.earth[1], z: this.pyData.svs.earth[2],
      vx: this.pyData.svs.earth[3], vy: this.pyData.svs.earth[4], vz: this.pyData.svs.earth[5]
      // earth
    })
    this.bodies.push({
      mass: 7.342e22,
      x: this.pyData.svs.moon[0], y: this.pyData.svs.moon[1], z: this.pyData.svs.moon[2],
      vx: this.pyData.svs.moon[3], vy: this.pyData.svs.moon[4], vz: this.pyData.svs.moon[5]
      // moon
    })
    this.bodies.push({
      mass: 6.417e23,
      x: this.pyData.svs.mars[0], y: this.pyData.svs.mars[1], z: this.pyData.svs.mars[2],
      vx: this.pyData.svs.mars[3], vy: this.pyData.svs.mars[4], vz: this.pyData.svs.mars[5]
      // mars
    })
    this.bodies.push({
      mass: 1.898e27,
      x: this.pyData.svs.jupiter[0], y: this.pyData.svs.jupiter[1], z: this.pyData.svs.jupiter[2],
      vx: this.pyData.svs.jupiter[3], vy: this.pyData.svs.jupiter[4], vz: this.pyData.svs.jupiter[5]
      // jupiter
    })
    this.bodies.push({
      mass: 5.683e26,
      x: this.pyData.svs.saturn[0], y: this.pyData.svs.saturn[1], z: this.pyData.svs.saturn[2],
      vx: this.pyData.svs.saturn[3], vy: this.pyData.svs.saturn[4], vz: this.pyData.svs.saturn[5]
      // saturn
    })
    this.bodies.push({
      mass: 8.681e25,
      x: this.pyData.svs.uranus[0], y: this.pyData.svs.uranus[1], z: this.pyData.svs.uranus[2],
      vx: this.pyData.svs.uranus[3], vy: this.pyData.svs.uranus[4], vz: this.pyData.svs.uranus[5]
      // uranus
    })
    this.bodies.push({
      mass: 1.024e26,
      x: this.pyData.svs.neptune[0], y: this.pyData.svs.neptune[1], z: this.pyData.svs.neptune[2],
      vx: this.pyData.svs.neptune[3], vy: this.pyData.svs.neptune[4], vz: this.pyData.svs.neptune[5]
      // neptune
    })
    this.bodies.push({
      mass: 1.309e22 * this.pyData.pluto_scale,
      x: this.pyData.svs.pluto[0], y: this.pyData.svs.pluto[1], z: this.pyData.svs.pluto[2],
      vx: this.pyData.svs.pluto[3], vy: this.pyData.svs.pluto[4], vz: this.pyData.svs.pluto[5]
      // pluto
    })


    this.target = earth.position;
    this.camera.position.copy(earth.position);
    this.camera.position.normalize().multiplyScalar(.05).add(earth.position);
    this.camera.position.y += .001;


    // STARS
    // ==================================================================================
    const assignSRGB = (texture: any) => {
      texture.colorSpace = SRGBColorSpace;
    };
    const starSprite = new TextureLoader().load("/assets/solar-system/images/eyes_nasa.png", assignSRGB);
    this.stars = new StarPoints(10000, starSprite);
    this.scene.add(this.stars);

    // LINE ORBITS
    // ==================================================================================

    this.bodies2 = []
    this.bodies2.push({
      mass: 1.989e30,
      x: this.pyData.svs.sun[0], y: this.pyData.svs.sun[1], z: this.pyData.svs.sun[2],
      vx: this.pyData.svs.sun[3], vy: this.pyData.svs.sun[4], vz: this.pyData.svs.sun[5]
      // sun
    })
    this.bodies2.push({
      mass: 3.301e23,
      x: this.pyData.svs.mercury[0], y: this.pyData.svs.mercury[1], z: this.pyData.svs.mercury[2],
      vx: this.pyData.svs.mercury[3], vy: this.pyData.svs.mercury[4], vz: this.pyData.svs.mercury[5]
      // mercury
    })
    this.bodies2.push({
      mass: 4.867e24,
      x: this.pyData.svs.venus[0], y: this.pyData.svs.venus[1], z: this.pyData.svs.venus[2],
      vx: this.pyData.svs.venus[3], vy: this.pyData.svs.venus[4], vz: this.pyData.svs.venus[5]
      // venus
    })
    this.bodies2.push({
      mass: 5.972e24,
      x: this.pyData.svs.earth[0], y: this.pyData.svs.earth[1], z: this.pyData.svs.earth[2],
      vx: this.pyData.svs.earth[3], vy: this.pyData.svs.earth[4], vz: this.pyData.svs.earth[5]
      // earth
    })
    this.bodies2.push({
      mass: 7.342e22,
      x: this.pyData.svs.moon[0], y: this.pyData.svs.moon[1], z: this.pyData.svs.moon[2],
      vx: this.pyData.svs.moon[3], vy: this.pyData.svs.moon[4], vz: this.pyData.svs.moon[5]
      // moon
    })
    this.bodies2.push({
      mass: 6.417e23,
      x: this.pyData.svs.mars[0], y: this.pyData.svs.mars[1], z: this.pyData.svs.mars[2],
      vx: this.pyData.svs.mars[3], vy: this.pyData.svs.mars[4], vz: this.pyData.svs.mars[5]
      // mars
    })
    this.bodies2.push({
      mass: 1.898e27,
      x: this.pyData.svs.jupiter[0], y: this.pyData.svs.jupiter[1], z: this.pyData.svs.jupiter[2],
      vx: this.pyData.svs.jupiter[3], vy: this.pyData.svs.jupiter[4], vz: this.pyData.svs.jupiter[5]
      // jupiter
    })
    this.bodies2.push({
      mass: 5.683e26,
      x: this.pyData.svs.saturn[0], y: this.pyData.svs.saturn[1], z: this.pyData.svs.saturn[2],
      vx: this.pyData.svs.saturn[3], vy: this.pyData.svs.saturn[4], vz: this.pyData.svs.saturn[5]
      // saturn
    })
    this.bodies2.push({
      mass: 8.681e25,
      x: this.pyData.svs.uranus[0], y: this.pyData.svs.uranus[1], z: this.pyData.svs.uranus[2],
      vx: this.pyData.svs.uranus[3], vy: this.pyData.svs.uranus[4], vz: this.pyData.svs.uranus[5]
      // uranus
    })
    this.bodies2.push({
      mass: 1.024e26,
      x: this.pyData.svs.neptune[0], y: this.pyData.svs.neptune[1], z: this.pyData.svs.neptune[2],
      vx: this.pyData.svs.neptune[3], vy: this.pyData.svs.neptune[4], vz: this.pyData.svs.neptune[5]
      // neptune
    })
    this.bodies2.push({
      mass: 1.309e22 * this.pyData.pluto_scale,
      x: this.pyData.svs.pluto[0], y: this.pyData.svs.pluto[1], z: this.pyData.svs.pluto[2],
      vx: this.pyData.svs.pluto[3], vy: this.pyData.svs.pluto[4], vz: this.pyData.svs.pluto[5]
      // pluto
    })


    this.dtSimScale = this.pyData.dt_sim_scale;
    this.spaceTime = this.pyData.svs.timestamp;
    this.utcTime = Math.floor(this.spaceTime);
    for (let i = 0; i < 2000; i += 1) {

      this.mercuryOrbit[0].push(this.bodies2[1].x);
      this.mercuryOrbit[1].push(this.bodies2[1].y);
      this.mercuryOrbit[2].push(this.bodies2[1].z);

      this.venusOrbit[0].push(this.bodies2[2].x);
      this.venusOrbit[1].push(this.bodies2[2].y);
      this.venusOrbit[2].push(this.bodies2[2].z);

      this.earthOrbit[0].push(this.bodies2[3].x);
      this.earthOrbit[1].push(this.bodies2[3].y);
      this.earthOrbit[2].push(this.bodies2[3].z);

      this.moonOrbit[0].push(this.bodies2[4].x);
      this.moonOrbit[1].push(this.bodies2[4].y);
      this.moonOrbit[2].push(this.bodies2[4].z);

      this.marsOrbit[0].push(this.bodies2[5].x);
      this.marsOrbit[1].push(this.bodies2[5].y);
      this.marsOrbit[2].push(this.bodies2[5].z);

      this.jupiterOrbit[0].push(this.bodies2[6].x);
      this.jupiterOrbit[1].push(this.bodies2[6].y);
      this.jupiterOrbit[2].push(this.bodies2[6].z);

      this.saturnOrbit[0].push(this.bodies2[7].x);
      this.saturnOrbit[1].push(this.bodies2[7].y);
      this.saturnOrbit[2].push(this.bodies2[7].z);

      this.uranusOrbit[0].push(this.bodies2[8].x);
      this.uranusOrbit[1].push(this.bodies2[8].y);
      this.uranusOrbit[2].push(this.bodies2[8].z);

      this.neptuneOrbit[0].push(this.bodies2[9].x);
      this.neptuneOrbit[1].push(this.bodies2[9].y);
      this.neptuneOrbit[2].push(this.bodies2[9].z);

      this.plutoOrbit[0].push(this.bodies2[10].x);
      this.plutoOrbit[1].push(this.bodies2[10].y);
      this.plutoOrbit[2].push(this.bodies2[10].z);

      this.sunOrbit[0].push(this.bodies2[0].x);
      this.sunOrbit[1].push(this.bodies2[0].y);
      this.sunOrbit[2].push(this.bodies2[0].z);

      for (let j = 0; j < 32; j += 1) {
        rungeKutta4(this.bodies2, 1000);
        this.otime += 1000;
      }
    }
    console.log(this.otime / 3.154e7);

    this.o1 = new DynOrbits(Math.floor(.5 * 2000 * 0.239), mercury.colorHex); // 88/365  days to orbit, cut it off
    this.o1.setLine(this.mercuryOrbit);
    this.scene.add(this.o1);

    this.o2 = new DynOrbits(Math.floor(.5 * 2000 * 0.61), venus.colorHex);
    this.o2.setLine(this.venusOrbit);
    this.scene.add(this.o2);

    this.o3 = new DynOrbits(.495 * 2000, 0x6b93d6);
    this.o3.setLine(this.earthOrbit);
    this.scene.add(this.o3);

    this.o4 = new DynOrbits(.495 * 2000, moon.colorHex);
    this.o4.setLine(this.moonOrbit);
    this.scene.add(this.o4);

    this.o5 = new DynOrbits(Math.floor(.5 * 2000 * 1.86), mars.colorHex);
    this.o5.setLine(this.marsOrbit);
    this.scene.add(this.o5);

    this.o6 = new DynOrbits(2000, jupiter.colorHex);
    this.o6.setLine(this.jupiterOrbit);
    this.scene.add(this.o6);

    this.o7 = new DynOrbits(2000, saturn.colorHex);
    this.o7.setLine(this.saturnOrbit);
    this.scene.add(this.o7);

    this.o8 = new DynOrbits(2000, uranus.colorHex);
    this.o8.setLine(this.uranusOrbit);
    this.scene.add(this.o8);

    this.o9 = new DynOrbits(2000, neptune.colorHex);
    this.o9.setLine(this.neptuneOrbit);
    this.scene.add(this.o9);

    this.o10 = new DynOrbits(2000, pluto.colorHex);
    this.o10.setLine(this.plutoOrbit);
    this.scene.add(this.o10);

    this.animate();
    this.addCSSLabels();
  }


  // ANIMATE
  // ==================================================================================
  private animate(): void {

    const animDt = this.clock.getDelta();
    this.stars.twinkle(animDt);
    const dt = this.dtSimScale * animDt;

    this.spaceTime += dt;
    this.utcTime = Math.floor(this.spaceTime);

    const cam2target = new Vector3().copy(this.camera.position);
    this.camDistance = cam2target.distanceTo(this.target) * 1e5 * 1e2;

    rungeKutta4(this.bodies, dt);
    this.planetMeshes['mercury'].mesh.updateFromRK4(this.bodies[1], dt * (2 * Math.PI / (1407.6 * 60 * 60)));
    this.planetMeshes['venus'].mesh.updateFromRK4(this.bodies[2], dt * (2 * Math.PI / (-5832.5 * 60 * 60)));
    this.planetMeshes['moon'].mesh.updateFromRK4(this.bodies[4], dt * (2 * Math.PI / (655.7 * 60 * 60)));
    this.planetMeshes['mars'].mesh.updateFromRK4(this.bodies[5], dt * (2 * Math.PI / (24.6 * 60 * 60)));
    this.planetMeshes['jupiter'].mesh.updateFromRK4(this.bodies[6], dt * (2 * Math.PI / (9.9 * 60 * 60)));
    this.planetMeshes['saturn'].mesh.updateFromRK4(this.bodies[7], dt * (2 * Math.PI / (10.7 * 60 * 60)));
    this.planetMeshes['uranus'].mesh.updateFromRK4(this.bodies[8], dt * (2 * Math.PI / (-17.2 * 60 * 60)));
    this.planetMeshes['neptune'].mesh.updateFromRK4(this.bodies[9], dt * (2 * Math.PI / (16.1 * 60 * 60)));
    this.planetMeshes['pluto'].mesh.updateFromRK4(this.bodies[10], dt * (2 * Math.PI / (153.3 * 60 * 60)));

    const earth = this.planetMeshes['earth'].mesh as Earth3d;
    earth.setPosition(this.bodies[3].x, this.bodies[3].y, this.bodies[3].z);
    earth.rotation.y += -dt * (2 * Math.PI / (23.9 * 60 * 60)) * (this.rotCorrection || 1);
    earth.updateAllRotations();
    earth.setSunOrigin();

    this.controls.target.copy(this.target);
    this.controls.update();
    this.stats.update();

    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };



  onPlanetSelect(event: any): void {
    const key = event.target.value.toLowerCase();
    this.target = this.planetMeshes[key].mesh.position;
    this.currentFact = this.getRandomFact(key);
  }

  // FUN FACTS
  // ==================================================================================
  private planetFacts: { [key: string]: string[] } = {
    mercury: [
      "It’s not known who discovered Mercury",
      "Up until 1965 it was thought that the same side of Mercury constantly faced the Sun",
      "Thirteen times a century Mercury can be observed from the Earth passing across the Sun's face",
      "Mercury is the second densest planet"
    ],
    venus: [
      "A day on Venus lasts longer than a year",
      "Venus rotates in the opposite direction",
      "Pressure felt on Venus’ surface is equivalent to that deep beneath the sea on Earth",
      "The same side of Venus always faces the Earth when at their closest (possibly due to the Earth’s gravitational influence)",
      "Venus doesn’t have any moons, and we aren’t sure why"
    ],
    earth: [
      "Earth is the densest planet",
      "Earth’s rotation is gradually slowing",
      "Earth’s satellite (the Moon) is the largest satellite of any planet in our solar system"
    ],
    moon: [
      "The Moon is the second densest satellite",
      "The Moon has quakes - not called earthquakes but moonquakes",
      "The Moon is drifting away from the Earth",
      "During totality, the moon blocks out the sun so precisely, that only the sun's corona (outer atmosphere) is visible. There is no reason this effect should happen with the precision it does"
    ],
    mars: [
      "Mars is the second smallest planet in the solar system",
      "Mars and Earth have approximately the same total land area (because of Earth's water)",
      "One day Mars will have a ring, Mars’ largest moon Phobos will be torn apart by gravitational forces",
      "Sunsets on Mars are blue"
    ],
    jupiter: [
      "Jupiter is two and a half times more massive than all the other planets in the solar system combined",
      "Jupiter has the shortest day of all the planets",
      "Jupiter's Great Red Spot is red due to an unknown chemical composition"
    ],
    saturn: [
      "Saturn is the most distant planet that can be seen with the naked eye",
      "Saturn is the flattest planet due to its low density and fast rotation",
      "Saturn has 146 moons"
    ],
    uranus: [
      "Uranus is the first planet discovered with the use of a telescope",
      "Uranus has an axial tilt of 98 degrees. It is often described as “rolling around the Sun on its side.”",
      "Uranus hits the coldest temperatures of any planet",
      "Only one spacecraft has flown by Uranus"
    ],
    neptune: [
      "Neptune was first observed in 1846. Its position was first determined using mathematical predictions",
      "Only one spacecraft has flown by Neptune",
      "Neptune has supersonic winds"
    ],
    pluto: [
      "Pluto had not completed a full orbit around the Sun since its discovery before it was reclassified as not a planet",
      "Pluto significantly impacted the definition of a planet",
      "Pluto has five known moons",
      "Pluto is usually farther away from the Sun than Neptune, but sometimes it comes closer"
    ]
  };
  private getRandomFact(planetName: string): string {
    const facts = this.planetFacts[planetName];
    if (!facts) { return `No facts available for the planet "${planetName}".`; }
    const randomIndex = Math.floor(Math.random() * facts.length);
    return facts[randomIndex];
  }

  // THREEJS CSS LABELS
  // ==================================================================================
  private addCSSLabels() {
    this.createLabelCSS("Mercury", this.planetMeshes['mercury'].mesh);
    this.createLabelCSS("Venus", this.planetMeshes['venus'].mesh);
    this.createLabelCSS("Moon", this.planetMeshes['moon'].mesh);
    this.createLabelCSS("Mars", this.planetMeshes['mars'].mesh);
    this.createLabelCSS("Jupiter", this.planetMeshes['jupiter'].mesh);
    this.createLabelCSS("Saturn", this.planetMeshes['saturn'].mesh);
    this.createLabelCSS("Uranus", this.planetMeshes['uranus'].mesh);
    this.createLabelCSS("Neptune", this.planetMeshes['neptune'].mesh);
    this.createLabelCSS("Pluto", this.planetMeshes['pluto'].mesh);

    const earthDiv = document.createElement('div');
    earthDiv.className = 'markerLabel';
    earthDiv.textContent = "Earf";
    const earthLabel = new CSS2DObject(earthDiv);
    const earth = this.planetMeshes['earth'].mesh as Earth3d;
    earthLabel.position.set(this.EARHRADIUS * 1.25, this.EARHRADIUS * 1.25, 0);
    earthLabel.center.set(0, 1);
    earth.add(earthLabel);
    earthLabel.layers.set(0);
    earthDiv.addEventListener("pointerdown", (event) => {
      const key = "earth";
      this.target = this.planetMeshes[key].mesh.position;
      this.currentFact = this.getRandomFact(key);

    })
  }


  private createLabelCSS(name: string, mesh: any): void {
    const Div = document.createElement('div');
    Div.className = 'markerLabel';
    Div.textContent = name;
    const Label = new CSS2DObject(Div);
    Label.position.set(mesh.r * 1.25, mesh.r * 1.25, 0);
    Label.center.set(0, 1);
    mesh.add(Label);
    Label.layers.set(0);
    Div.addEventListener("pointerdown", (event) => {
      const key = name.toLowerCase();
      this.target = this.planetMeshes[key].mesh.position;
      this.currentFact = this.getRandomFact(key);

    })
  }
}

class DynOrbits extends Line {
  N: number;
  positions: Float32Array;

  constructor(N: number, color: number = 0xffb6c1) {
    const geomOrbit = new BufferGeometry();
    geomOrbit.setAttribute('position', new Float32BufferAttribute(new Float32Array(N * 3), 3)); // Use Float32BufferAttribute
    const materialOrbit = new LineBasicMaterial({ color: color });

    super(geomOrbit, materialOrbit); // Call Line constructor with geometry and material

    this.N = N;
    this.positions = (this.geometry.attributes['position'] as Float32BufferAttribute).array as Float32Array;
    this.frustumCulled = false; // Correctly set frustumCulled on the Line object
    // this.computeLineDistances(); // If you intend to use this, uncomment
  }

  setLine(data: number[][]): void { // Type 'data' as a tuple of number arrays
    for (let i = 0; i < this.N; i++) {
      const idx = i * 3;
      this.positions[idx] = data[0][i];
      this.positions[idx + 1] = data[1][i];
      this.positions[idx + 2] = data[2][i];
    }
    this.geometry.attributes['position'].needsUpdate = true;
  }
}