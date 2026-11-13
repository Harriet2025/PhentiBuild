/* Types for the converted 2D roof geometry helpers in ./roofGeometry.js. */
export type Point = { x: number; y: number }
export type Shape = { id: string; type: string; points: Point[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare const roofGeometry: Record<string, (...args: any[]) => any>
