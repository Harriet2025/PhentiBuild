/**
 * Shared types for the calculation engines (./*.js). The engines take a
 * plain object of numbers/strings and return a plain result object — the
 * exact shapes are documented at the top of each engine file.
 */
export type EngineInput = Record<string, number | string | undefined>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EngineResult = Record<string, any>

export type CalculatorEngine = {
  calculate: (input: EngineInput) => EngineResult
  formatNumber: (value: number, decimals?: number) => string
  roundTo: (value: number, decimals: number) => number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [extra: string]: any
}
