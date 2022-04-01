/**
 * 
 */

export function computeATR(day1: any, day2: any): number {
    const r1 = Math.abs(day2.high - day2.low);
    const r2 = Math.abs(day2.high - day1.close);
    const r3 = Math.abs(day2.low - day1.close);
    const r = Math.max(r1, Math.max(r2, r3));
    return r;
}