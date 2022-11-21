/**
 * 
 */

export function computeRange(day1: any, day2: any): number {
    const r1 = Math.abs(day2.high - day2.low);
    const r2 = Math.abs(day2.high - day1.close);
    const r3 = Math.abs(day2.low - day1.close);
    const r = Math.max(r1, Math.max(r2, r3));
    return r;
}

//
// Compute exponent weighted average with previous ema.
//
export function computeEma(newValue: number, preValue: number, multiplier: number): number {
    return (multiplier * newValue) + ((1 - multiplier) * preValue);
}


//
// Compute exponent weighted average for a bunch of numbers.
//
export function computePeriodEma(preValue: number, values: number[], multiplier: number): number {
    
    if (values.length === 0) {
        return 0;
    }

    let latest = preValue;
    for (let i = 0; i < values.length; ++i) {
        latest = computeEma(values[i], latest, multiplier);
    }

    return latest;
}