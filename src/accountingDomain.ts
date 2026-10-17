export type Money = number;
export function validAmount(value: number): boolean { return Number.isFinite(value) && value >= 0; }
