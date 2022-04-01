import { assert } from 'chai';
import { ISeries, Series, DataFrame, IDataFrame } from 'data-forge';
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
}

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        macd_e (shortPeriod: number, longPeriod: number, signalPeriod: number,  update_period: number, key?: string, valueKey?: string): IDataFrame<any, IMacdEntry>;
    }

    interface Series<IndexT, ValueT> {
        macd_e (shortPeriod: number, longPeriod: number, signalPeriod: number, update_period: number, key?: string, valueKey?: string): IDataFrame<any, IMacdEntry>;
    }
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        macd_e_update (shortPeriod: number, longPeriod: number, signalPeriod: number): IDataFrame<any, IMacdEntry>;
    }

    interface DataFrame<IndexT, ValueT> {
        macd_e_update (shortPeriod: number, longPeriod: number, signalPeriod: number): IDataFrame<any, IMacdEntry>;
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
    const macd = shortEMA.skip(longPeriod - shortPeriod)
        .zip(longEMA, (short, long) => short - long);
    const signal = macd.ema_e(signalPeriod);
    const histogram = macd.skip(signalPeriod)
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

    // return df1.merge([
    //     shortEMA.inflate(shortEMA => ({ shortEMA } as any)),
    //     longEMA.inflate(longEMA => ({ longEMA } as any)),
    //     macd.inflate(macd => ({ macd } as any)),
    //     signal.inflate(signal => ({ signal } as any)),
    //     histogram.inflate(histogram => ({ histogram } as any))
    // ]);

    /*TODO: potential short hand syntax.
    return DataFrame.merge({
        shortEMA,
        longEMA,
        macd,
        signal,
        histogram
    });
    */

    /*TODO: this almost works but doesn't line up the index!
    return new DataFrame({ //todo: need to merge on index!
        index: this.getIndex(),
        columns: {
            shortEMA,
            longEMA,
            macd,
            signal,
            histogram,
        },
    });
    */
};

Series.prototype.macd_e = macd_e;