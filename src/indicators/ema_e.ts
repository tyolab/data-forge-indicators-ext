import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';

import { computeEma, computePeriodEma } from './utils';

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
        ema_e_update(period: number, update_period: number, options: any): IDataFrame<IndexT, any>;
        ema_e_update_from(period: number, update_period: number, dataFrame: IDataFrame<IndexT, ValueT>, options: any): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        ema_e_update(period: number, update_period: number, options: any): IDataFrame<IndexT, any>;
        ema_e_update_from(period: number, update_period: number, dataFrame: IDataFrame<IndexT, ValueT>, options: any): IDataFrame<IndexT, any>;
    }
}

function ema_e<IndexT = any>(this: ISeries<any, number>, period: number): ISeries<IndexT, any> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.ema' to be a number that specifies the time period of the moving average.");

    const multiplier = (2 / (period + 1));

    let rows = [];
    let preValue = this.first();
    
    let i = 0;
    for (let value of this) {
        if (i < period) {
            let window = this.between(0, i);
            value = window.average();
        }
        else {
            value = computeEma(value, preValue, multiplier);
        }
        rows.push(value);
        preValue = value;
        ++i;
    }
    return new Series(rows);

    // WhichIndex.Start may be the right side of the series in this sense.
    // let series = this.skip(period);
    // let counter = 0;
    // let newSeries = series.map((window, index) => {
    //     let emaValue = computeEma(window, preValue, multiplier);
    //     preValue = emaValue;
    //     ++counter;
    //     return emaValue;
    // });
    // // we should only use this way, as the selector above can be called so many times
    // let pairs = newSeries.toPairs();
    // return new Series({pairs: pairs});

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

/**
 * 
 * @param this this is the data frame
 * @param dataFrame 
 * @param period 
 * @param update_period 
 * @param key 
 * @param value_key 
 * @returns 
 */
function ema_e_update_from<IndexT = any>(this: IDataFrame<any, any>, period: number, update_period: number = 1, dataFrame: IDataFrame<number, any> = this, options: any = {}): IDataFrame<number, any> {
    var thisCount = this.count();
    var dataCount = dataFrame.count();

    /**
     * There isn't enough data to calculate the EMA
     */
    if (dataCount < (period + 1))
        return this;

    // assert.isTrue(this.count() <= dataFrame.count(), "Expected 'DataFrame.ema_e_update_from' to be called on a DataFrame that has a smaller number of rows than the source DataFrame.");

    assert.isTrue(this.count() > 0, "Expected 'DataFrame.ema_e_update_from' to be called on a DataFrame that has at least one row.");

    assert.isNumber(period, "Expected 'period' parameter to 'DataFrame' to be a number that specifies the time period of the moving average.");

    let key = options["key"] || 'ema';
    let value_key = options["value_key"] || 'close';

    // and we will update the end of course
    let newDataFrame = this;
    var pos = update_period > dataCount ? 1 : dataCount - update_period;
    --pos;
    // the following doesn't make sense
    // if (pos < period)
    //     pos = period;
    var lastRow = undefined;
    if (pos < thisCount) {
        lastRow = newDataFrame.at(pos);
        while (lastRow && lastRow[key] === undefined) {
            if ((pos - period) >= 0) {
                var tempDataFrame = dataFrame.between(pos - period, pos - 1);
                var sma = tempDataFrame.getSeries(value_key).average();
                lastRow[key] = sma;
                break;
            }
            
            ++pos;
            if (pos >= newDataFrame.count())
                break;
            lastRow = newDataFrame.at(pos);
        }
    }
    if (lastRow === undefined)
        return this;

    var preValue = lastRow[key];
    ++pos;
    let last = dataFrame.last();

    assert.isDefined(last[value_key], "Expected 'DataFrame.ema_e_update' to be called on a DataFrame that has a '" + value_key + "' column.");

    const multiplier = (2 / (period + 1));
    for (let i = pos; i < dataCount; ++i) {
        let valueRow = dataFrame.at(i);
        let row = newDataFrame.at(i);

        let newValue = valueRow[value_key];
        const value = computeEma(newValue, preValue, multiplier);

        if (i < thisCount)
            row[key] = value;
        else {
            var newRow: any = {};
            newRow[key] = value;
            newRow[value_key] = newValue;
            newDataFrame = newDataFrame.appendPair([i, newRow]);
        }

        preValue = value;
    }
    return newDataFrame;
}

function ema_e_update<IndexT = number>(this: IDataFrame<number, any>, period: number, update_period: number = 1, options: any): IDataFrame<number, any> {
    return ema_e_update_from.call(this, period, update_period, this, options);
}

DataFrame.prototype.ema_e_update = ema_e_update;
DataFrame.prototype.ema_e_update_from = ema_e_update_from;

Series.prototype.ema_update = ema_update;
Series.prototype.ema_e = ema_e;