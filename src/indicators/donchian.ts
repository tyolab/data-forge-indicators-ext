import { assert } from 'chai';
import { ISeries, Series, DataFrame, IDataFrame } from 'data-forge';

/**
 * A record in the output donchian_channel bands dataframe.
 */
export interface IDonchianChannel {
    /**
     * Middle value in the donchian_channel band, the average value for the particular period.
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

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        donchian_channel (period: number): IDataFrame<any, IDonchianChannel>;
        donchian_channel_update (period: number, update_period: number, key?: string): IDataFrame<any, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        donchian_channel (period: number): IDataFrame<any, IDonchianChannel>;
        donchian_channel_update (period: number, update_period: number, key?: string): IDataFrame<any, any>;
    }
}

function computeDonchianChannel<IndexT = any>(window: IDataFrame<IndexT, number>): IDonchianChannel {
    const highSeries = window.getSeries('high');
    const lowSeries = window.getSeries('low');

    const HH = highSeries.max();
    const LL = lowSeries.min();

    const value: IDonchianChannel = {
        upper: HH,
        middle: (HH + LL) / 2,
        lower: LL
    };
    return value;
}

/**
 * Compute channel bands for a input series for a specified period of time.
 *
 * @param period - The time period for which to compute channel bands.
 * 
 * @returns Returns a dataframe with columns upper, middle, lower.
 */
function donchian_channel<IndexT = any> (
    this: IDataFrame<IndexT, number>, 
    period: number = 20
    ): IDataFrame<IndexT, IDonchianChannel> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.donchian_channel' to be a number that specifies the time period of the moving average.");

    return this.rollingWindow(period)
        .select<[IndexT, IDonchianChannel]>(window => {


            return [
                window.getIndex().last(), 
                computeDonchianChannel(window)
            ];
        })
        .withIndex(pair => pair[0])
        .inflate(pair => pair[1]);
};

 function donchian_channel_update<IndexT = any> (
    this: IDataFrame<number, any>, 
    period: number, 
    update_period: number = 1,
    key?: string
    ): IDataFrame<number, any> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.donchian_channel' to be a number that specifies the time period of the moving average.");


    let pos: number = this.count() - update_period;
    key = key || 'donchian_channel';

    for (let i = pos; i < this.count(); ++i) {
        let last_pos = i - period;
        let window = this.between(last_pos, i);
        let row = this.at(i);
        const value = computeDonchianChannel(window);
        row[key] = value;
    }

    return this;
};

DataFrame.prototype.donchian_channel = donchian_channel;
DataFrame.prototype.donchian_channel_update = donchian_channel_update;