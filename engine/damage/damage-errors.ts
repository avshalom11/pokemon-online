// Shared error class for the Damage Engine — split out from
// damage-calculation.ts so both it and type-chart.ts can throw the same
// error without a circular import between the two.
export class DamageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DamageValidationError";
  }
}
