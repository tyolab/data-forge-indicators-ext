import { assert } from 'chai';
import { ISeries, Series, DataFrame, IDataFrame } from 'data-forge';

/**
 * A record in the output bollinger bands dataframe.
 */
export interface IBollingerBand {
    /**
     * The value that the bollinger bands are derived from.
     */
    value: number;

    /**
     * Middle value in the bollinger band, the average value for the particular period.
     */
    middle: number;

    /***
     * The upper value. middle + (standard deviations x X).
     */
    upper: number;

    /***
     * The upper value. middle - (standard deviations x X).
     */
    lower: number;
}

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        bollinger_e (period: number, stdDevMultUpper: number, stdDevMultLower: number): IDataFrame<any, IBollingerBand>;
    }

    interface Series<IndexT, ValueT> {
        bollinger_e (period: number, stdDevMultUpper: number, stdDevMultLower: number): IDataFrame<any, IBollingerBand>;
    }
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        bollinger_e_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        bollinger_e_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }
}

function computeBB<IndexT = any>(window: ISeries<IndexT, number>, stdDevMultUpper: number, stdDevMultLower: number): IBollingerBand {
    const avg = window.average();
    const stddev = window.std();
    
    var bollingerRecord: IBollingerBand = {
        value: window.last(),
        middle: avg,
        upper: avg + (stddev * stdDevMultUpper),
        lower: avg - (stddev * stdDevMultLower),
    }
    return bollingerRecord;
}

/**
 * Compute bollinger bands for a input series for a specified period of time.
 *
 * @param period - The time period for which to compute bollinger bands.
 * @param stdDevMultUpper - The multiple of std dev used to compute the upper band.
 * @param stdDevMultLower - The multiple of std dev used to compute the lower band.
 * 
 * @returns Returns a dataframe with columns value, upper, middle, lower, and stddev.
 */
function bollinger_e<IndexT = any> (
    this: ISeries<IndexT, number>, 
    period: number = 20,
    stdDevMultUpper: number = 2, 
    stdDevMultLower: number = 2
    ): IDataFrame<IndexT, IBollingerBand> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.bollinger' to be a number that specifies the time period of the moving average.");
    assert.isNumber(stdDevMultUpper, "Expected 'stdDevMultUpper' parameter to 'Series.bollinger' to be a number that specifies multipler to compute the upper band from the standard deviation.");
    assert.isNumber(stdDevMultLower, "Expected 'stdDevMultLower' parameter to 'Series.bollinger' to be a number that specifies multipler to compute the upper band from the standard deviation.");

    return this.rollingWindow(period)
        .select<[IndexT, IBollingerBand]>(window => {

            return [
                window.getIndex().last(), 
                computeBB(window, stdDevMultUpper, stdDevMultLower)
            ];
        })
        .withIndex(pair => pair[0])
        .inflate(pair => pair[1]);
};

 function bollinger_e_update<IndexT = any> (
    this: IDataFrame<number, any>, 
    period: number, 
    update_period: number = 1,
    options: any = {},
    ): IDataFrame<number, any> {

    let stdDevMultUpper: number = options.stdDevMultUpper || 2; 
    let stdDevMultLower: number = options.stdDevMultLower || 2;

    assert.isNumber(period, "Expected 'period' parameter to 'Series.bollinger' to be a number that specifies the time period of the moving average.");
    assert.isNumber(stdDevMultUpper, "Expected 'stdDevMultUpper' parameter to 'Series.bollinger' to be a number that specifies multipler to compute the upper band from the standard deviation.");
    assert.isNumber(stdDevMultLower, "Expected 'stdDevMultLower' parameter to 'Series.bollinger' to be a number that specifies multipler to compute the upper band from the standard deviation.");

    let count = this.count(); 
    let pos: number = count - update_period;
    let key = options["key"] || 'bb';
    let value_key = options["value_key"] || 'close';

    for (let i = pos; i < count; ++i) {
        let last_pos = i - period;
        let window = this.between(last_pos, i).getSeries(value_key);
        let row = this.at(i);
        const value = computeBB(window, stdDevMultUpper, stdDevMultLower);
        row[key] = value;
    }

    return this;
};

Series.prototype.bollinger_e = bollinger_e;
DataFrame.prototype.bollinger_e_update = bollinger_e_update;