import { assert } from 'chai';
import { ISeries, Series, DataFrame, IDataFrame } from 'data-forge';

import { computeEma, computePeriodEma } from './utils';

import "./ema_e";

/**
 * A record in the output macd bands dataframe.
 */
export interface IMacdEntry {
    /**
     * Short period exponential moving average.
     */
    shortEMA?: number;

    /**
     * Long period exponential moving average.
     */
    longEMA?: number;

    /**
     * Difference between short and long emas (this is the macd or 'moving average convergence divergence');
     */
    macd?: number;

    /**
     * The 'signal line', an exponential moving average of the macd.
     */
    signal?: number;

    /**
     * Difference between the macd and the signal line.
     */
    histogram?: number;

    // /**
    //  * Short Period.
    //  */
    // shortPeriod?: number;

    // /**
    //  * Long Period.
    //  */
    // longPeriod?: number;

    // /**
    //  * Signal Period.
    //  */
    // signalPeriod?: number;
}

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        macd_e2 (shortPeriod: number, longPeriod: number, signalPeriod: number): ISeries<any, IMacdEntry>;
        macd_e (shortPeriod: number, longPeriod: number, signalPeriod: number): IDataFrame<any, IMacdEntry>;
    }

    interface Series<IndexT, ValueT> {
        macd_e2 (shortPeriod: number, longPeriod: number, signalPeriod: number): ISeries<any, IMacdEntry>;
        macd_e (shortPeriod: number, longPeriod: number, signalPeriod: number): IDataFrame<any, IMacdEntry>;
    }
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        macd_e_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        macd_e_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }
}

/**
 * Compute macd for a series.
 *
 * @param shortPeriod - The time period of the short moving average.
 * @param longPeriod - The time period of the long moving average.
 * @param signalPeriod - The time period for the macd signal line.
 * 
 * @returns Returns a dataframe for the computed macd indicator.
 */
function macd_e<IndexT = any> (
    this: ISeries<IndexT, number>, 
    shortPeriod: number,
    longPeriod: number,
    signalPeriod: number
    ): IDataFrame<IndexT, IMacdEntry> {

    assert.isNumber(shortPeriod, "Expected 'shortPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the short moving average.");
    assert.isNumber(longPeriod, "Expected 'longPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the long moving average.");
    assert.isNumber(signalPeriod, "Expected 'signalPeriod' parameter to 'Series.macd' to be a number that specifies the time period for the macd signal line.");

    const shortEMA = this.ema_e(shortPeriod)
    const longEMA = this.ema_e(longPeriod);
    const macd = shortEMA/* .skip(longPeriod - shortPeriod) */
        .zip(longEMA, (short, long) => short - long);
    const signal = macd.ema_e(signalPeriod);
    const histogram = macd/* .skip(signalPeriod) */
        .zip(signal, (macd, signal) => {
            let diff = macd - signal;
            return diff;
        }
    );  

    let df1 = DataFrame.merge([
        shortEMA.inflate(shortEMA => ({ shortEMA } as any)),
        longEMA.inflate(longEMA => ({ longEMA } as any))]);
    
    return df1.withSeries('macd', macd)
        .withSeries('signal', signal)
        .withSeries('histogram', histogram);
};

function macd_e2<IndexT = number> (
    this: ISeries<number, number>, 
    shortPeriod: number,
    longPeriod: number,
    signalPeriod: number
    ): ISeries<IndexT, IMacdEntry> {

    assert.isNumber(shortPeriod, "Expected 'shortPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the short moving average.");
    assert.isNumber(longPeriod, "Expected 'longPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the long moving average.");
    assert.isNumber(signalPeriod, "Expected 'signalPeriod' parameter to 'Series.macd' to be a number that specifies the time period for the macd signal line.");

    let rows: IMacdEntry[] = [];
    let i = 0;
    let preShortEMA: number, preLongEMA: number, preSignal: number;
    let shortPeriodMultiplier = 2 / (shortPeriod + 1);
    let longPeriodMultiplier = 2 / (longPeriod + 1);
    let signalPeriodMultiplier = 2 / (signalPeriod + 1);
    for (let value of this) {
        let row: IMacdEntry = {};
        if (i < shortPeriod) {
            let window = this.between(0, i);
            preShortEMA = row.shortEMA = window.average();
        }
        else {
            preShortEMA = row.shortEMA = computeEma(value, preShortEMA!, shortPeriodMultiplier);
        }

        if (i < longPeriod) {
            let window = this.between(0, i);
            preLongEMA = row.longEMA = window.average();
        }
        else {
            preLongEMA = row.longEMA = computeEma(value, preLongEMA!, longPeriodMultiplier);
        }

        row.macd = preShortEMA - preLongEMA;
        rows.push(row);
        ++i;
    }

    i = 0;
    for (let row of rows) {
        if (i < signalPeriod) {
            let array = rows.slice(0, i);
            let window = new DataFrame(array).getSeries('macd');
            preSignal = row.signal = window.average();
        }   
        else {
            preSignal = row.signal = computeEma(row.macd!, preSignal!, signalPeriodMultiplier);
        }
        row.histogram = row.macd! - preSignal;
        ++i;
    }
    return new Series(rows);
};

/**
 * @todo
 */
function macd_e_update<IndexT = any> (
    this: IDataFrame<number, number>, 
    period: number = 0,
    update_period: number = 1, 
    options: any = {}
    ): IDataFrame<number, any> {

    let shortPeriod: number = options.shortPeriod || 12;
    let longPeriod: number = options.longPeriod || 26;
    let signalPeriod: number = options.signalPeriod || 9;
    let signalPeriodMultiplier: number = 2 / (signalPeriod + 1);

    let currentMACD = options.currentMACD;

    if (!currentMACD && !options.key) {
        let deflateKey: string = options.deflateKey || 'close';
        return this.withSeries("macd", this.getSeries(deflateKey).macd_e2(shortPeriod, longPeriod, signalPeriod));
    }

    let with_key = false;
    if (!currentMACD && options.key) {
        currentMACD = this;
        with_key = true;
    }

    assert.isNumber(shortPeriod, "Expected 'shortPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the short moving average.");
    assert.isNumber(longPeriod, "Expected 'longPeriod' parameter to 'Series.macd' to be a number that specifies the time period of the long moving average.");
    assert.isNumber(signalPeriod, "Expected 'signalPeriod' parameter to 'Series.macd' to be a number that specifies the time period for the macd signal line.");

    // let key = options["key"] || 'macd';
    let value_key = options["value_key"] || 'close';
    let key = options["key"] || 'macd';
    // and we will update the end of course
    let count = this.count();
    let pos: number = count - update_period;

    let shortEMAKey = options.shortEMAKey || ("ema" + shortPeriod);
    let longEMAKey = options.longEMAKey ||  ("ema" + longPeriod);
    
    let last: any = this.last();
    let dataFrame = this;
    
    if (!last[shortEMAKey])
        dataFrame = dataFrame.ema_e_update(shortPeriod, update_period, { key: shortEMAKey, value_key: value_key});
    if (!last[longEMAKey])
        dataFrame = dataFrame.ema_e_update(longPeriod, update_period, { key: longEMAKey, value_key: value_key});

    // getting the data
    let currentMacdcount = currentMACD.count();
    for (let i = pos; i < count; ++i) {
        let row: any = dataFrame.at(i);
  
        let shortEMA = row[shortEMAKey];
        let longEMA = row[longEMAKey];
        if (!shortEMA || !longEMA)
            continue;

        let macd = shortEMA - longEMA;
        let signal, index = 0;

        if (currentMacdcount > 0) {
            if (i > 0) {
                let last_row:any = dataFrame.at(i - 1);
                let last_macd = with_key ? last_row[key] : last_row;
                signal = (last_macd && last_macd.signal) ? computeEma(macd, last_macd.signal, signalPeriodMultiplier) : macd;
            }
            else
                signal = macd;
        } 
        else {
            signal = macd;
        }

        let macd_v = {
            shortEMA: shortEMA,
            longEMA: longEMA,
            macd: macd,
            signal: signal,
            histogram: macd - signal
        }

        if (with_key)
            row[options.key] = macd_v;
        else {
            index = currentMACD.getIndex().last();
            ++index;
            currentMACD = currentMACD.appendPair([index, macd_v]).resetIndex();
        }
    }
    return currentMACD;

};

Series.prototype.macd_e = macd_e;
Series.prototype.macd_e2 = macd_e2;
DataFrame.prototype.macd_e_update = macd_e_update;