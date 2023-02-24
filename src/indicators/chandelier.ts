import { assert } from 'chai';
import { ISeries, Series, DataFrame, IDataFrame } from 'data-forge';

import { computeRange } from './utils';

export interface IChandelierExit {
    /**
     * .
     */
    long: number;

    /**
     * 
     */
    short: number;

}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        chandelier_exit (period: number, multiplier: number): ISeries<any, IChandelierExit>;
        chandelier_exit_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        chandelier_exit (period: number, multiplier: number): ISeries<any, IChandelierExit>;
        chandelier_exit_update (period: number, update_period: number, options: any): IDataFrame<any, any>;
    }
}

function computeChandelierExit<IndexT>(window: IDataFrame<IndexT, any>, multiplier: number): IChandelierExit {
    let max = 0;
    let min = -1;
    let ranges;
    let last = window.last();
    if (typeof last.range === 'number')
        ranges = window.deflate(row => row.range);
    else
        ranges = window.rollingWindow(2)
        .select<number>(window2 => {
            const day1 = window2.first();
            const day2 = window2.last();

            if (min === -1)
                min = day2.low;
            
            if (day2.low < min)
                min = day2.low;

            if (day2.high > max)
                max = day2.high;

            return computeRange(day1, day2);
        });

    let atr = ranges.average();
    let long = max  - atr * multiplier;
    let short = min + atr * multiplier;
    let value: IChandelierExit = {
        long: long,
        short: short
    };
    return value;
}

function chandelier_exit<IndexT = any> (
    this: IDataFrame<IndexT, any>, 
    period: number = 20,
    multiplier: number = 3
    ): ISeries<IndexT, IChandelierExit> {

    assert.isNumber(period, "Expected 'period' parameter to 'Series.chandelier_exit' to be a number that specifies the time period of the moving average.");

    return this.rollingWindow(period + 1)
    .select<[IndexT, IChandelierExit]>((window) => {

        return [
            window.getIndex().last(),
            computeChandelierExit(window, multiplier)
        ];
    })
    .withIndex(pair1 => pair1[0])
    .select(pair1 => pair1[1]);
};


 function chandelier_exit_update<IndexT = any> (
    this: IDataFrame<number, any>, 
    period: number, 
    update_period: number = 1,
    options: any = {},
    ): IDataFrame<number, any> {

    let key: string = options['key'] || "chandelier_exit";
    let multiplier: number = options['multiplier'] || 3;

    assert.isNumber(period, "Expected 'period' parameter to 'Series.chandelier_exit' to be a number that specifies the time period of the moving average.");

    let count = this.count(); 
    let pos: number = count - update_period;

    for (let i = pos; i < count; ++i) {
        let last_pos = i - period + 1;
        if (last_pos < 0)
            continue;
        let window = this.between(last_pos, i);
        let row = this.at(i);
        row[key] = computeChandelierExit(window, multiplier);
    }

    return this;
};

DataFrame.prototype.chandelier_exit = chandelier_exit;
DataFrame.prototype.chandelier_exit_update = chandelier_exit_update;