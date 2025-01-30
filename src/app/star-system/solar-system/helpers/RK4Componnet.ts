const G: number = 6.67430e-20; // Gravitational constant (m^3 kg^-1 s^-2)
const scaleFactor: number = 1e-21; // scaled in python by 1e-7

interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
}

interface Acceleration {
  ax: number;
  ay: number;
  az: number;
}

interface StepData {
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
}



function calculateAccelerations(positions: Body[]): Acceleration[] {
  const accelerations: Acceleration[] = positions.map(() => ({ ax: 0, ay: 0, az: 0 }));

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx: number = positions[j].x - positions[i].x;
      const dy: number = positions[j].y - positions[i].y;
      const dz: number = positions[j].z - positions[i].z;
      const distance: number = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance === 0) continue;

      // Compute gravitational force magnitude
      const forceMagnitude: number = scaleFactor * (G * positions[i].mass * positions[j].mass) / (distance * distance);

      // Compute accelerations
      const ax: number = (forceMagnitude * dx) / (distance * positions[i].mass);
      const ay: number = (forceMagnitude * dy) / (distance * positions[i].mass);
      const az: number = (forceMagnitude * dz) / (distance * positions[i].mass);

      // Update accelerations
      accelerations[i].ax += ax;
      accelerations[i].ay += ay;
      accelerations[i].az += az;

      accelerations[j].ax -= ax * (positions[i].mass / positions[j].mass);
      accelerations[j].ay -= ay * (positions[i].mass / positions[j].mass);
      accelerations[j].az -= az * (positions[i].mass / positions[j].mass);
    }
  }

  return accelerations;
}


function cloneState(bodies: Body[]): Body[] {
  return bodies.map(body => ({
    x: body.x,
    y: body.y,
    z: body.z,
    vx: body.vx,
    vy: body.vy,
    vz: body.vz,
    mass: body.mass,
  }));
}

function integrateStep(state: Body[], k: StepData[], scale: number): Body[] {
  return state.map((body, i) => ({
    x: body.x + k[i].vx * scale,
    y: body.y + k[i].vy * scale,
    z: body.z + k[i].vz * scale,
    vx: body.vx + k[i].ax * scale,
    vy: body.vy + k[i].ay * scale,
    vz: body.vz + k[i].az * scale,
    mass: body.mass,
  }));
}

function rungeKutta4(bodies: Body[], dt: number): void {

  const state: Body[] = cloneState(bodies);

  const a1: Acceleration[] = calculateAccelerations(state);
  const k1: StepData[] = state.map((body, i) => ({
    vx: body.vx,
    vy: body.vy,
    vz: body.vz,
    ax: a1[i].ax,
    ay: a1[i].ay,
    az: a1[i].az,
  }));

  const stateK2: Body[] = integrateStep(state, k1, dt / 2);
  const a2: Acceleration[] = calculateAccelerations(stateK2);
  const k2: StepData[] = stateK2.map((body, i) => ({
    vx: body.vx,
    vy: body.vy,
    vz: body.vz,
    ax: a2[i].ax,
    ay: a2[i].ay,
    az: a2[i].az,
  }));

  const stateK3: Body[] = integrateStep(state, k2, dt / 2);
  const a3: Acceleration[] = calculateAccelerations(stateK3);
  const k3: StepData[] = stateK3.map((body, i) => ({
    vx: body.vx,
    vy: body.vy,
    vz: body.vz,
    ax: a3[i].ax,
    ay: a3[i].ay,
    az: a3[i].az,
  }));

  const stateK4: Body[] = integrateStep(state, k3, dt);
  const a4: Acceleration[] = calculateAccelerations(stateK4);
  const k4: StepData[] = stateK4.map((body, i) => ({
    vx: body.vx,
    vy: body.vy,
    vz: body.vz,
    ax: a4[i].ax,
    ay: a4[i].ay,
    az: a4[i].az,
  }));

  bodies.forEach((body, i) => {
    body.x += (dt / 6) * (k1[i].vx + 2 * k2[i].vx + 2 * k3[i].vx + k4[i].vx);
    body.y += (dt / 6) * (k1[i].vy + 2 * k2[i].vy + 2 * k3[i].vy + k4[i].vy);
    body.z += (dt / 6) * (k1[i].vz + 2 * k2[i].vz + 2 * k3[i].vz + k4[i].vz);

    body.vx += (dt / 6) * (k1[i].ax + 2 * k2[i].ax + 2 * k3[i].ax + k4[i].ax);
    body.vy += (dt / 6) * (k1[i].ay + 2 * k2[i].ay + 2 * k3[i].ay + k4[i].ay);
    body.vz += (dt / 6) * (k1[i].az + 2 * k2[i].az + 2 * k3[i].az + k4[i].az);
  });
}

export { rungeKutta4, Body }