import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

export enum TimeFrame {
    Minutes_1 = 1, // "1m",
    Minutes_2 = 2, // "2m",
    Minutes_3 = 3, // "3m",
    Minutes_15 = 15,  //  "15m",
    Minutes_30 = 30, // "30m",
    Hours_1 = 60, // "1h",
    Hours_4 = 240, // "4h",
    Day =  1440, // "day",
    Week = 10080, // "week",
    Month = 43800, // "month"
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        compress(period: number): IDataFrame<IndexT, OHLC>;
    }

    interface DataFrame<IndexT, ValueT> {
        compress(period: number): IDataFrame<IndexT, OHLC>;
    }
}

/**
 * We don't not use time/date as index as it is not convienent 
 * Support only day to week and month for now.
 * 
 * And assuming you know what you are doing. we can only compress days to weeks, weeks to months.
 * 
 * @param this 
 * @param timeframe 
 * @returns 
 */
function compress<IndexT = any>(this: IDataFrame<IndexT, OHLC>, timeframe: TimeFrame): IDataFrame<IndexT, any> {
    // const lastIndex = this.getIndex().last();
    // assert.isNumber(lastIndex, "Expected the index for the data frame is a number.");
    
    let rows: any[] = [];
    // compress day data to week
    // it is easy to 
    let maxtrading: number = 0;
    if (timeframe === TimeFrame.Week)
        maxtrading = 7;
    else if (timeframe === TimeFrame.Month)
        maxtrading = 31;

    // for market normally we use Monday as start sunday (if there is) as end
    // we can't use Series.window function for it
    let row: any = undefined;
    const df = this;
    var lasttrading = undefined;
    var lastday = undefined;
    for (const value of df) {
        const d = value.time;
        let day: number = 0;
        if (timeframe === TimeFrame.Week) {
            day = d.getDay();

            if (day === 0) {
                day = maxtrading;
            }
        }
        else if (timeframe === TimeFrame.Month)
            day = d.getDate();
        else
            break;

        if (lasttrading === undefined) 
            lasttrading = day;
        if (lastday === undefined)
            lastday = value;

        if (day < lasttrading /* && week === undefined */) {
            if (row !== undefined) {
                row.close = lastday.close;
                rows.push(row);
            }
            row = undefined;
        }

        if (row === undefined)
            row = {time: value.time, open: value.open, high: value.high, low: value.low, close: value.close} as OHLC;

        if (value.high > row.high)
            row.high = value.high;
        if (value.low < row.low)
            row.low = value.low;

        lasttrading = day;
        lastday = value;
    }

    if (row !== undefined && lastday !== undefined) {
        row.close = lastday.close;
        rows.push(row);
    }
    rows = rows;
    new DataFrame({rows: rows});

   return new DataFrame({rows: rows});
}

DataFrame.prototype.compress = compress;