import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        ema_e(period: number): ISeries<IndexT, any>;
        ema_update(newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        ema_e(period: number): ISeries<IndexT, any>;
        ema_update(newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number>;
    }
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        ema_update_df(period: number, key: string, valueKey: string): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        ema_update_df(period: number, key: string, valueKey: string): IDataFrame<IndexT, any>;
    }
}

//
// Compute exponent weighted average with previous ema.
//
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

function ema_e<IndexT = any>(this: ISeries<IndexT, number>, period: number): ISeries<IndexT, any> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.ema' to be a number that specifies the time period of the moving average.");

    const multiplier = (2 / (period + 1));
    let preValue = this.take(period).average();
    // WhichIndex.Start may be the right side of the series in this sense.
    let series = this.skip(period);
    let counter = 0;
    let newSeries = series.map((window, index) => {
        let emaValue = computeEma(window, preValue, multiplier);
        preValue = emaValue;
        ++counter;
        return emaValue;
    });
    // we should only use this way, as the selector above can be called so many times
    let pairs = newSeries.toPairs();
    return new Series({pairs: pairs});

    /**
     * The following code is for refrencing
     * As the selector will be called many times whenever iterators are iterated.
     * So the result won't be accurate, as each round generats different results
     * and only the first round is correct.
     */
    // return this
    //     .rollingWindow(1) // data-forge has a bug that when rolling window equals one, the first one gets repeated twic
    //     .select<[IndexT, number]>(window => {
    //     // .select((row) => {
    //         let emaValue = computeEma(window.last(), preValue, multiplier);
    //         // let emaValue = computePeriodEma(preValue, window.toArray(), multiplier);
    //         preValue = emaValue;
    //         return [
    //             window.getIndex().last(),
    //             emaValue
    //         ];
    //     })
    // .withIndex(function (pair) { return pair[0]; })
    // .inflate(function (pair) { return pair[1]; });
}

function ema_update<IndexT = any>(this: ISeries<IndexT, number>, newIndex: IndexT, newValue: number, period: number): ISeries<IndexT, number> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.ema' to be a number that specifies the time period of the moving average.");

    // and we will update the end of course
    const preValue = this.last();
    const multiplier = (2 / (period + 1));
    const value = computeEma(newValue, preValue, multiplier);
    return this.appendPair([newIndex, value]);
}

function ema_update_df<IndexT = number>(this: IDataFrame<number, any>, period: number, key: string, valueKey: string): IDataFrame<number, any> {

    assert.isNumber(period, "Expected 'period' parameter to 'DataFrame' to be a number that specifies the time period of the moving average.");

    // and we will update the end of course
    let pos: number = this.count() - period;
    const lastRow = this.at(pos - 1);
    let preValue = lastRow[key];

    for (let i = pos; i < this.count(); ++i) {
        let row = this.at(i);
        const multiplier = (2 / (period + 1));
        let newValue = row[valueKey];
        const value = computeEma(newValue, preValue, multiplier);
        row[key] = value;
        preValue = value;
    }
    return this;
}

DataFrame.prototype.ema_update_df = ema_update_df;

Series.prototype.ema_update = ema_update;
Series.prototype.ema_e = ema_e;