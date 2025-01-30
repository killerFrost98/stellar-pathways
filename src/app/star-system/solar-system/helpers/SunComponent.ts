import {
  Vector3,
  AdditiveBlending,
  BufferGeometry,
  TextureLoader,
  HemisphereLight,
  Points,
  PointsMaterial,
  Float32BufferAttribute
} from 'three';

import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

class Sun extends Lensflare {
  dirlight: HemisphereLight;
  textureLoader: TextureLoader;
  posNorm: Vector3;
  constructor() {
    super()
    this.dirlight = new HemisphereLight(0xFFAA00, 0x00AAFF, 1);
    this.textureLoader = new TextureLoader();
    this.posNorm = new Vector3();
    this.add(this.dirlight);
  }
  loadFlare(path: string, size1: number, size2: number) {
    const tex = this.textureLoader.load(path);
    this.addElement(new LensflareElement(tex, size1, size2));
  }
  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.dirlight.position.set(x, y, z);
    this.posNorm.copy(this.position);
    this.posNorm.normalize();
  }
  setModelOne(suntex: string, flareCircle: string, flareHex: string) {
    this.loadFlare(suntex, 500 / 3, 0);
    this.loadFlare(flareHex, 120, 1.0);
    this.loadFlare(flareCircle, 20, 0.96);
    this.loadFlare(flareCircle, 60, 0.95);
    this.loadFlare(flareHex, 140, 0.85);
  }
}
function randomGaussian() {
  var rand = 0;
  for (var i = 0; i < 6; i += 1) {
    rand += Math.random();
  }
  return (rand / 6) * 2 - 1;
}
class StarPoints extends Points {
  geo: BufferGeometry;
  positionAttribute: any;
  posArray: any;
  colorAttribute: any;
  colorArray: any;
  visibilityAttribute: any;
  visibilityArray: any;
  sizeAttribute: any;
  sizeArray: any;
  timer: number;
  time: number;
  N: number;
  constructor(N: number, sprite: any = null) {
    const color1 = [0.678, 0.847, 0.902];
    const color2 = [1, 0.784, 0.588];
    const color3 = [1, 1, 1];
    const lists = [color1, color2, color3];
    const colors = [];
    const vertices = [];
    const visibility = [];
    const sizes = [];
    const v = new Vector3();
    for (let i = 0; i < N; i++) {
      v.set(randomGaussian(), randomGaussian(), randomGaussian());
      v.normalize().multiplyScalar(1000);
      vertices.push(v.x, v.y, v.z);
      const randomColorIndex = Math.floor(Math.random() * lists.length);
      const chosenColor = lists[randomColorIndex];
      colors.push(chosenColor[0], chosenColor[1], chosenColor[2]);
      visibility.push(1);
      sizes.push(2 * Math.random() + 1);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const material = new PointsMaterial({
      map: sprite,
      size: 5.0,
      blending: AdditiveBlending,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });

    material.onBeforeCompile = function (shader) {
      shader.vertexShader = `
                attribute float sizes;
                attribute float visibility;
                varying float vVisible;
                ${shader.vertexShader}`
        .replace(
          `gl_PointSize = size;`,
          `gl_PointSize = size * sizes;
                    vVisible = visibility;
                    `
        );
      shader.fragmentShader = `
                varying float vVisible;
                ${shader.fragmentShader}`
        .replace(
          `#include <clipping_planes_fragment>`,
          `
                    if (vVisible < 0.5) discard;
                    #include <clipping_planes_fragment>`
        )
    }

    super(geometry, material);
    this.geo = geometry;
    this.positionAttribute = this.geo.getAttribute('position');
    this.posArray = this.positionAttribute.array;
    this.colorAttribute = this.geo.getAttribute('color');
    this.colorArray = this.colorAttribute.array;
    // from shader code
    this.geo.setAttribute("visibility", new Float32BufferAttribute(visibility, 1));
    this.visibilityAttribute = this.geo.getAttribute('visibility');
    this.visibilityArray = this.visibilityAttribute.array;
    this.geo.setAttribute("sizes", new Float32BufferAttribute(sizes, 1));
    this.sizeAttribute = this.geo.getAttribute('sizes');
    this.sizeArray = this.sizeAttribute.array;
    //
    // this.renderOrder = 1;
    this.timer = .1;
    this.time = 0;
    this.N = N;
  }
  posUpdate() { this.positionAttribute.needsUpdate = true; }
  colorUpdate() { this.colorAttribute.needsUpdate = true; }
  sizeUpdate() { this.sizeAttribute.needsUpdate = true; }
  visUpdate() { this.visibilityAttribute.needsUpdate = true; }
  setPosIdx(idx: number, px: number, py: number, pz: number) {
    this.posArray[idx * 3] = px;
    this.posArray[idx * 3 + 1] = py;
    this.posArray[idx * 3 + 2] = pz;
    this.visibilityArray[idx] = 1;
    this.positionAttribute.needsUpdate = true;
    this.visibilityAttribute.needsUpdate = true;
  }
  setColorIdx(idx: number, cx: number, cy: number, cz: number) {
    this.colorArray[idx * 3] = cx;
    this.colorArray[idx * 3 + 1] = cy;
    this.colorArray[idx * 3 + 2] = cz;
    this.colorAttribute.needsUpdate = true;
  }
  setSizeIdx(idx: number, s: number) {
    this.sizeArray[idx] = s;
    this.sizeAttribute.needsUpdate = true;
  }
  twinkle(dt: number) {
    this.time += dt;
    if (this.time > this.timer) {
      for (let i = 0; i < this.N; i += 1) {
        const r = Math.random() * 3000;
        if (r < 1) { this.visibilityArray[i] = 0; }
        else { this.visibilityArray[i] = 1; }
        this.time = 0;
      }
    }
    this.visUpdate();
  }
}

export { Lensflare, LensflareElement, Sun, StarPoints };