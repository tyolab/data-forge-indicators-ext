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
        ema_update_df(period: number, update_period: number, key?: string, valueKey?: string): IDataFrame<IndexT, any>;
        ema_update_df_from(period: number, update_period: number, dataFrame: IDataFrame<IndexT, ValueT>, key?: string, valueKey?: string): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        ema_update_df(period: number, update_period: number, key?: string, valueKey?: string): IDataFrame<IndexT, any>;
        ema_update_df_from(period: number, update_period: number, dataFrame: IDataFrame<IndexT, ValueT>, key?: string, valueKey?: string): IDataFrame<IndexT, any>;
    }
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

/**
 * 
 * @param this this is the data frame
 * @param dataFrame 
 * @param period 
 * @param update_period 
 * @param key 
 * @param valueKey 
 * @returns 
 */
function ema_update_df_from<IndexT = number>(this: IDataFrame<number, any>, period: number, update_period: number = 1, dataFrame: IDataFrame<number, any> = this, key?: string, valueKey?: string): IDataFrame<number, any> {
    var thisCount = this.count();
    var dataCount = dataFrame.count();

    /**
     * There isn't enough data to calculate the EMA
     */
    if (dataCount < (period + 1))
        return this;

    // assert.isTrue(this.count() <= dataFrame.count(), "Expected 'DataFrame.ema_update_df_from' to be called on a DataFrame that has a smaller number of rows than the source DataFrame.");

    assert.isTrue(this.count() > 0, "Expected 'DataFrame.ema_update_df_from' to be called on a DataFrame that has at least one row.");

    assert.isNumber(period, "Expected 'period' parameter to 'DataFrame' to be a number that specifies the time period of the moving average.");

    key = key || 'ema';
    valueKey = valueKey || 'close';

    // and we will update the end of course
    let newDataFrame = this;
    var pos = update_period > dataCount ? 1 : dataCount - update_period;
    --pos;
    if (pos < period)
        pos = period;
    var lastRow = undefined;
    if (pos < thisCount) {
        lastRow = newDataFrame.at(pos);
        while (lastRow && lastRow[key] === undefined) {
            if (pos >= (period)) {
                var tempDataFrame = dataFrame.between(pos - period, pos - 1);
                var sma = tempDataFrame.getSeries(valueKey).average();
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
    for (let i = pos; i < dataFrame.count(); ++i) {
        let valueRow = dataFrame.at(i);
        let row = newDataFrame.at(i);
        const multiplier = (2 / (period + 1));

        assert.isDefined(valueRow[valueKey], "Expected 'DataFrame.ema_update_df' to be called on a DataFrame that has a '" + valueKey + "' column.");

        let newValue = valueRow[valueKey];
        const value = computeEma(newValue, preValue, multiplier);

        if (i < thisCount)
            row[key] = value;
        else {
            var newRow: any = {};
            newRow[key] = value;
            newRow[valueKey] = newValue;
            newDataFrame = newDataFrame.appendPair([i, newRow]);
        }

        preValue = value;
    }
    return newDataFrame;
}

function ema_update_df<IndexT = number>(this: IDataFrame<number, any>, period: number, update_period: number = 1, key?: string, valueKey?: string): IDataFrame<number, any> {
    return ema_update_df_from.call(this, period, update_period, this, key, valueKey);
}

DataFrame.prototype.ema_update_df = ema_update_df;
DataFrame.prototype.ema_update_df_from = ema_update_df_from;

Series.prototype.ema_update = ema_update;
Series.prototype.ema_e = ema_e;