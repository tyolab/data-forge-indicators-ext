import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        ema_e(period: number): ISeries<IndexT, number>;
        ema_update(newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        ema_e(period: number): ISeries<IndexT, number>;
        ema_update(newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number>;
    }
}

// Compute exponent weighted average with previous ema.

function computeEma(newValue: number, preValue: number, multiplier: number): number {
    return (multiplier * newValue) + ((1 - multiplier) * preValue);
}


//
// Compute exponent weighted average for a bunch of numbers.
//
function computePeriodEma(preValue: number, values: number[], multiplier: number): number {
    
    if (values.length === 0) {
        return 0;
    }

    let latest = preValue;
    for (let i = 0; i < values.length; ++i) {
        latest = computeEma(values[i], latest, multiplier);
    }

    return latest;
}

function ema_e<IndexT = any>(this: ISeries<IndexT, number>, period: number): ISeries<IndexT, number> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.ema' to be a number that specifies the time period of the moving average.");

    const multiplier = (2 / (period + 1));
    let preValue = this.take(period).average();
    // WhichIndex.Start may be the right side of the series in this sense.
    let series = this.skip(period - 1);
    return series.rollingWindow(1)
        .select((window) => {
            let emaValue = computePeriodEma(preValue, window.toArray(), multiplier);
            preValue = emaValue;
            return emaValue;
        });
}

function ema_update<IndexT = any>(this: Series<IndexT, number>, newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.ema' to be a number that specifies the time period of the moving average.");

    // and we will update the end of course
    const preValue = this.last();
    const multiplier = (2 / (period + 1));
    const value = computeEma(preValue, newValue, multiplier);
    this.appendPair([newIndex, value]);
    return this;
}

Series.prototype.ema_update = ema_update;
Series.prototype.ema_e = ema_e;