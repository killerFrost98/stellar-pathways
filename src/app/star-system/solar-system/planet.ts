export interface Planet {
  name: string;
  radius: number;  // km
  distanceFromSun: number;  // million km
  orbitalPeriod: number;  // Earth days
  rotationPeriod: number;  // Earth days
  textureUrl: string;
  inclination: number;  // degrees
  eccentricity: number;
}
