import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';

/**
 * ZigZag++ as implemented in the tradingview
 * 
 * the indicator (extrema) groups the price the linearly up or down 
 */

export interface IZigZag_PP {
    /**
     * "hh", "hl", "lh", "ll"
     */
    point: string;
}

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        zigzag_pp(period: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        zigzag_pp(period: number): ISeries<IndexT, number>;
    }
}

function zigzag_pp<IndexT = any>(this: ISeries<IndexT, number>, period: number): ISeries<IndexT, number> {

	assert.isNumber(period, "Expected 'period' parameter to 'Series.sma' to be a number that specifies the time period of the moving average.");

    return this.rollingWindow(period)
        .select<[IndexT, number]>(window => [window.getIndex().last(), window.average()])
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
}

Series.prototype.zigzag_pp = zigzag_pp;