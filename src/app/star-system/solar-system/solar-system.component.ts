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
  SphereGeometry,
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

  sp = 100000;
  EARHRADIUS: number = 6371.0 / this.sp;
  camDistance = 3.141;
  utcTime = new Date();
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
  private rotCorrection = 1;
  private selectedPlanet: any = null;
  public earthMarsAngle: any = 0;
  public earthMarsLaunchWindowAngle: any = 0;
  public rocketLaunched: boolean = false;
  public rocketArrived: boolean = false;
  public missionToMarsRequested: boolean = false;
  public missionStatus: string = '';
  paused: boolean = false;

  constructor(private http: HttpClient) { }

  ngAfterViewInit(): void {
    this.loadPlanetsData().subscribe(data => {
      this.pyData = data;
      this.init();
    });
  }

  loadPlanetsData(): Observable<any> {
    return this.http.get('assets/solar-system/positions/positions.json');
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
    this.camera.position.set(0, 100, 0);
    this.camera.lookAt(0, 0, 0);

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
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // SUN
    // ==================================================================================
    const suntex = "/stellar-pathways/assets/solar-system/images/lens_flare_1.jpeg";
    const flareCircle = "/stellar-pathways/assets/solar-system/images/lens_flare_circle_64x64.jpeg";
    const flareHex = "/stellar-pathways/assets/solar-system/images/lens_flare_hexagon_256x256.jpeg";
    this.sun = new Sun();
    this.sun.setModelOne(suntex, flareCircle, flareHex);
    this.scene.add(this.sun);
    this.sun.setPosition(this.pyData.svs.sun[0], this.pyData.svs.sun[1], this.pyData.svs.sun[2]);

    // PLANETS
    // ==================================================================================
    const ringSprite = new TextureLoader().load("/stellar-pathways/assets/solar-system/images/ring.png");

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
      'pluto': { 'mesh': null },
      'rocket': { 'mesh': null }
    }

    const mercury = new Planet(2439.7 / this.sp, 0xada8a5, this.camera, this.scene);
    mercury.init(
      "/stellar-pathways/assets/solar-system/images/2k_mercury.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_mercury_dark.png",
      this.pyData.svs.mercury, 0.0, ringSprite
    );
    this.scene.add(mercury);
    this.planetMeshes['mercury'].mesh = mercury;

    const venus = new Planet(6051.8 / this.sp, 0xf8e2b0, this.camera, this.scene);
    venus.init(
      "/stellar-pathways/assets/solar-system/images/2k_venus.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_venus_dark.png",
      this.pyData.svs.venus, 177.4 * Math.PI / 180, ringSprite
    );
    this.scene.add(venus);
    this.planetMeshes['venus'].mesh = venus;

    const earth = new Earth3d(this.camera);
    earth.loadTextures("/stellar-pathways/assets/solar-system/images/8081_earthmap10k.jpg", "/stellar-pathways/assets/solar-system/images/8081_earthlights10k.jpg");
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

    const moon = new Planet(1737.4 / this.sp, 0xe5e5e5, this.camera, this.scene);
    moon.initWithoutRing(
      "/stellar-pathways/assets/solar-system/images/2k_moon.jpeg",
      "/stellar-pathways/assets/solar-system/images/moonuv_dark.jpg",
      this.pyData.svs.moon, 6.8 * Math.PI / 180
    );
    this.scene.add(moon);
    this.planetMeshes['moon'].mesh = moon;

    const mars = new Planet(3389.5 / this.sp, 0xE27B58, this.camera, this.scene);
    mars.init(
      "/stellar-pathways/assets/solar-system/images/2k_mars.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_mars_dark.png",
      this.pyData.svs.mars, 25.19 * Math.PI / 180, ringSprite
    );
    this.scene.add(mars);
    this.planetMeshes['mars'].mesh = mars;

    const jupiter = new Planet(69911 / this.sp, 0x90614D, this.camera, this.scene);
    jupiter.init(
      "/stellar-pathways/assets/solar-system/images/2k_jupiter.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_jupiter_dark.png",
      this.pyData.svs.jupiter, 3.13 * Math.PI / 180, ringSprite
    );
    this.scene.add(jupiter);
    this.planetMeshes['jupiter'].mesh = jupiter;

    const saturn = new Planet(58232 / this.sp, 0xe2bf7d, this.camera, this.scene);
    saturn.init(
      "/stellar-pathways/assets/solar-system/images/2k_saturn.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_saturn_dark.png",
      this.pyData.svs.saturn, 26.73 * Math.PI / 180, ringSprite
    );
    this.scene.add(saturn);
    this.planetMeshes['saturn'].mesh = saturn;

    const rstart = saturn.r * 1.3;
    const rend = saturn.r + rstart;
    const rmid = rstart + (rend - rstart) / 2;
    const satring = "/stellar-pathways/assets/solar-system/images/2k_saturn_ring_alpha.png";
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

    const uranus = new Planet(25362 / this.sp, 0xafdbf5, this.camera, this.scene);
    uranus.init(
      "/stellar-pathways/assets/solar-system/images/2k_uranus.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_uranus_dark.png",
      this.pyData.svs.uranus, 97.77 * Math.PI / 180, ringSprite
    );
    this.scene.add(uranus);
    this.planetMeshes['uranus'].mesh = uranus;

    const neptune = new Planet(24622 / this.sp, 0x657BA6, this.camera, this.scene);
    neptune.init(
      "/stellar-pathways/assets/solar-system/images/2k_neptune.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_neptune_dark.png",
      this.pyData.svs.neptune, 28.32 * Math.PI / 180, ringSprite
    );
    this.scene.add(neptune);
    this.planetMeshes['neptune'].mesh = neptune;

    const pluto = new Planet(1188.3 / this.sp, 0xced2d9, this.camera, this.scene);
    pluto.init(
      "/stellar-pathways/assets/solar-system/images/2k_pluto.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_pluto_dark.png",
      this.pyData.svs.pluto, 120 * Math.PI / 180, ringSprite
    );
    this.scene.add(pluto);
    this.planetMeshes['pluto'].mesh = pluto;

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

    // 1) Create a minimal rocket Planet
    const rocketPlanet = new Planet(
      500 / this.sp,          // A small radius for the rocket, but big enough to see
      0xffffff,          // Rocket color
      this.camera,
      this.scene
    );

    // 2) Use either initWithRing or initWithoutRing. 
    //    Pass a placeholder texture if desired. 
    //    The 4th argument is the 6-element state [x, y, z, vx, vy, vz]; 
    //    initially zero if rocket has not launched.
    rocketPlanet.init(
      "/stellar-pathways/assets/solar-system/images/2k_pluto.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_pluto_dark.png",
      [0, 0, 0, 0, 0, 0],           // position & velocity will be set at launch
      0,                            // tilt
      ringSprite                    // to get the ring circle
    );

    // 3) Initially hide it (not launched). Or place it at Earth.
    rocketPlanet.visible = false;  // Turn visible once launched

    // 4) Add to the scene and store in planetMeshes
    this.scene.add(rocketPlanet);
    this.planetMeshes['rocket'].mesh = rocketPlanet;

    // 5) Give it a CSS label so you see "Rocket" text
    this.createLabelCSS("Rocket", rocketPlanet);

    // 2) Use either initWithRing or initWithoutRing. 
    //    Pass a placeholder texture if desired. 
    //    The 4th argument is the 6-element state [x, y, z, vx, vy, vz]; 
    //    initially zero if rocket has not launched.
    rocketPlanet.init(
      "/stellar-pathways/assets/solar-system/images/2k_pluto.jpeg",
      "/stellar-pathways/assets/solar-system/images/2k_pluto_dark.png",
      [0, 0, 0, 0, 0, 0],           // position & velocity will be set at launch
      0,                            // tilt
      ringSprite                    // to get the ring circle
    );

    // 3) Initially hide it (not launched). Or place it at Earth.
    rocketPlanet.visible = false;  // Turn visible once launched

    // 4) Add to the scene and store in planetMeshes
    this.scene.add(rocketPlanet);
    this.planetMeshes['rocket'].mesh = rocketPlanet;

    // 5) Give it a CSS label so you see "Rocket" text
    this.createLabelCSS("Rocket", rocketPlanet);

    const rocketArrow = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 0.2, 0xff0000);
    // Attach the arrow to the rocket mesh so it moves with it.
    rocketPlanet.add(rocketArrow);
    // Store a reference for later updates.
    this.planetMeshes['rocket'].arrowHelper = rocketArrow;


    // this.target = earth.position;
    // this.camera.position.copy(earth.position);
    // this.camera.position.normalize().multiplyScalar(.05).add(earth.position);
    // this.camera.position.y += .001;


    // STARS
    // ==================================================================================
    const assignSRGB = (texture: any) => {
      texture.colorSpace = SRGBColorSpace;
    };
    const starSprite = new TextureLoader().load("/stellar-pathways/assets/solar-system/images/eyes_nasa.png", assignSRGB);
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

    this.earthMarsLaunchWindowAngle = this.predictLaunchWindow(365.25, 687);
    this.animate();
    this.addCSSLabels();
  }

  private launchHohmannTransfer(): void {

    // 1) Don’t create a second rocket if we already have one in the integrator
    if (this.bodies.find(b => b.label === "rocket")) return;

    this.missionStatus = 'Hohmann transfer in progress...';
    // Indices: 0 = Sun, 3 = Earth, 5 = Mars
    const sunBody = this.bodies[0];
    const earthBody = this.bodies[3];
    const marsBody = this.bodies[5];

    // Positions relative to the Sun (in whatever length-units your integrator uses)
    const rxE = earthBody.x - sunBody.x;
    const ryE = earthBody.y - sunBody.y;
    const rzE = earthBody.z - sunBody.z;
    const rEarth = Math.sqrt(rxE * rxE + ryE * ryE + rzE * rzE);

    const rxM = marsBody.x - sunBody.x;
    const ryM = marsBody.y - sunBody.y;
    const rzM = marsBody.z - sunBody.z;
    const rMars = Math.sqrt(rxM * rxM + ryM * ryM + rzM * rzM);

    // Earth’s orbital velocity (relative to the Sun)
    const vxE = earthBody.vx - sunBody.vx;
    const vyE = earthBody.vy - sunBody.vy;
    const vzE = earthBody.vz - sunBody.vz;
    const vEarthMag = Math.sqrt(vxE * vxE + vyE * vyE + vzE * vzE);

    // Decide if we’re transferring outward or inward
    // (We want outward if Mars is actually farther than Earth.)
    let vTransfer = 0;
    if (rMars > rEarth) {

      // ----- Outward Hohmann transfer to Mars -----
      // Using the ratio approach:
      // v_transfer = vEarth * sqrt( 2*rMars / (rEarth + rMars) )
      const ratio = Math.sqrt((2 * rMars) / (rEarth + rMars));
      vTransfer = vEarthMag * ratio;

    } else {
      // ----- Inward Hohmann (in case Mars is inside Earth’s orbit at this instant) -----
      // v_transfer = vEarth * sqrt( 2*rMars / (rEarth + rMars) ), but that ratio < 1
      // Actually we might want an explicit formula if going truly inward
      const ratio = Math.sqrt((2 * rMars) / (rEarth + rMars));
      vTransfer = vEarthMag * ratio;
    }

    // Delta-v needed
    const deltaV = vTransfer - vEarthMag; // will be + if outward, – if inward

    // Direction = Earth’s velocity direction
    const earthVelDir = new Vector3(vxE, vyE, vzE).normalize();
    const dvx = deltaV * earthVelDir.x;
    const dvy = deltaV * earthVelDir.y;
    const dvz = deltaV * earthVelDir.z;

    // Create the rocket in your integrator’s array
    this.bodies.push({
      label: "rocket",
      mass: 1e-9, // small enough not to perturb anything
      x: earthBody.x,
      y: earthBody.y,
      z: earthBody.z,
      vx: earthBody.vx + dvx,
      vy: earthBody.vy + dvy,
      vz: earthBody.vz + dvz,
    });

    // Make the rocket mesh visible
    this.planetMeshes['rocket'].mesh.visible = true;

    // Mark that we’ve launched
    this.rocketLaunched = true;
    console.log("Hohmann transfer rocket launched!");
  }

  public onMarsMissionClick(): void {
    this.missionToMarsRequested = true;
    this.missionStatus = 'Waiting for launch window';
  }


  private animate(): void {
    if (!this.paused) {
      const animDt = this.clock.getDelta();
      this.stars.twinkle(animDt);
      const dt = this.dtSimScale * animDt;
      this.utcTime = new Date(this.utcTime.getTime() + dt * 1000);

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

      if (this.selectedPlanet) {
        this.controls.target.copy(this.target);
        this.controls.update();
      }
      this.stats.update();

      this.earthMarsAngle = this.calculatePhaseAngle(this.planetMeshes['earth'].mesh.position, this.planetMeshes['mars'].mesh.position);

      //   4a) Before rocket is launched, check the Earth–Mars angle and see if it’s near the window:
      if (this.missionToMarsRequested && !this.rocketLaunched && !this.rocketArrived) {
        // First compute the Earth–Mars phase angle
        const earthPos = earth.position;  // from Earth mesh
        const marsPos = this.planetMeshes['mars'].mesh.position;
        this.earthMarsAngle = this.calculatePhaseAngle(earthPos, marsPos);

        // Compare to your predicted ideal angle
        const angleError = Math.abs(
          (this.earthMarsAngle - this.earthMarsLaunchWindowAngle) / this.earthMarsLaunchWindowAngle
        );
        if (angleError < 0.01) {
          // If you want to auto-launch when we’re within 1% of the ideal angle:
          this.launchHohmannTransfer();
        }
      }

      //   4b) If rocket is launched, find it and update
      const rocketIndex = this.bodies.findIndex(b => b.label === "rocket");
      if (rocketIndex !== -1 && this.rocketLaunched && !this.rocketArrived) {
        const rocketBody = this.bodies[rocketIndex];
        // Update rocket position/rotation (spin factor = 0 for a spacecraft)
        this.planetMeshes['rocket'].mesh.updateFromRK4(rocketBody, dt * 0);

        const velocity = new Vector3(rocketBody.vx, rocketBody.vy, rocketBody.vz);

        // Only update if the velocity has a non-zero length.
        if (velocity.length() > 0) {
          // velocity.normalize();
          // Update the arrow direction to match the velocity vector.
          this.planetMeshes['rocket'].arrowHelper.setDirection(velocity);
        }

        // Check distance to Mars to see if we’ve arrived
        const marsBody = this.bodies[5];
        const dx = rocketBody.x - marsBody.x;
        const dy = rocketBody.y - marsBody.y;
        const dz = rocketBody.z - marsBody.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Adjust threshold for “Mars arrival” as you like
        if (dist < 0.0005) {
          this.rocketArrived = true;
          console.log("Rocket has arrived at Mars!");
        }

        const rocketDistanceFromSun = new Vector3(rocketBody.x, rocketBody.y, rocketBody.z).length();
        const marsDistanceFromSun = new Vector3(marsBody.x, marsBody.y, marsBody.z).length();
        if (rocketDistanceFromSun > marsDistanceFromSun) {
          this.rocketArrived = true;
          this.missionStatus = "Mission successful.";

          const rocketMesh = this.planetMeshes['rocket'].mesh;

          // Remove any CSS2D labels attached to the rocket
          for (let i = rocketMesh.children.length - 1; i >= 0; i--) {
            const child = rocketMesh.children[i];
            // Check if the child is a CSS2DObject
            if (child instanceof CSS2DObject) {
              // Remove the associated DOM element if present
              if (child.element && child.element.parentNode) {
                child.element.parentNode.removeChild(child.element);
              }
              rocketMesh.remove(child);
            }
          }

          this.scene.remove(this.planetMeshes['rocket'].mesh);
          this.bodies.splice(rocketIndex, 1);
        }
      }
    }

    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.clock.stop();
    } else {
      this.clock.start();
    }
  }

  onPlanetSelect(event: any): void {
    const key = event.target.value.toLowerCase();
    this.selectedPlanet = key;
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

  calculatePhaseAngle(earthPosition: Vector3, marsPosition: Vector3): number {
    const crossProductZ = (earthPosition.x * marsPosition.y) - (earthPosition.y * marsPosition.x);

    // Calculate the dot product of the Earth and Mars position vectors
    const dotProduct = (earthPosition.x * marsPosition.x) + (earthPosition.y * marsPosition.y) + (earthPosition.z * marsPosition.z);

    // Calculate the magnitudes of the Earth and Mars position vectors
    const earthMagnitude = Math.sqrt(Math.pow(earthPosition.x, 2) + Math.pow(earthPosition.y, 2) + Math.pow(earthPosition.z, 2));
    const marsMagnitude = Math.sqrt(Math.pow(marsPosition.x, 2) + Math.pow(marsPosition.y, 2) + Math.pow(marsPosition.z, 2));

    // Calculate the cosine of the phase angle
    const cosTheta = dotProduct / (earthMagnitude * marsMagnitude);
    let phaseAngle = Math.acos(cosTheta) * (180 / Math.PI);

    // Determine the direction of the angle (positive if Mars is ahead, negative if Earth is ahead)
    if (crossProductZ < 0) {
      phaseAngle = -phaseAngle;
    }

    return phaseAngle;
  }

  predictLaunchWindow(earthOrbitPeriod: number, marsOrbitPeriod: number): number {
    const requiredPhaseAngle = 180 - 360 * (earthOrbitPeriod / (earthOrbitPeriod + marsOrbitPeriod));
    return requiredPhaseAngle;
    // const synodicPeriod = 1 / Math.abs((1 / earthOrbitPeriod) - (1 / marsOrbitPeriod));
    // // Return the time (in days) until the next launch window based on the synodic period
    // return (requiredPhaseAngle / 360) * synodicPeriod;
  }

  // THREEJS CSS LABELS
  // ==================================================================================
  private addCSSLabels() {
    this.createLabelCSS("Mercury", this.planetMeshes['mercury'].mesh);
    this.createLabelCSS("Venus", this.planetMeshes['venus'].mesh);
    // this.createLabelCSS("Moon", this.planetMeshes['moon'].mesh);
    this.createLabelCSS("Mars", this.planetMeshes['mars'].mesh);
    this.createLabelCSS("Jupiter", this.planetMeshes['jupiter'].mesh);
    this.createLabelCSS("Saturn", this.planetMeshes['saturn'].mesh);
    this.createLabelCSS("Uranus", this.planetMeshes['uranus'].mesh);
    this.createLabelCSS("Neptune", this.planetMeshes['neptune'].mesh);
    this.createLabelCSS("Pluto", this.planetMeshes['pluto'].mesh);

    const earthDiv = document.createElement('div');
    earthDiv.className = 'markerLabel';
    earthDiv.textContent = "Earth";
    earthDiv.style.color = 'white';
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
    Div.style.color = 'white';
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