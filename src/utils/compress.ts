import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { ArrayIterable } from 'data-forge/build/lib/iterables/array-iterable';
import { OHLC } from './ohlc';

export enum TimeFrame {
    Tick = 0,               // "tick",
    Minutes_1 = 1,          // "1m",
    Minutes_2 = 2,          // "2m",
    Minutes_3 = 3,          // "3m",
    Minutes_5 = 5,          // "5m",
    Minutes_15 = 15,        //  "15m",
    Minutes_30 = 30,        // "30m",
    Hours_1 = 60,           // "1h",
    Hours_4 = 240,          // "4h",
    Day =  1440,            // "day",
    Week = 10080,           // "week",
    Month = 43800,          // "month"
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        tickToMinutes(timeframe: TimeFrame): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame): IDataFrame<IndexT, any>;
        compress(timeframe: TimeFrame): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        tickToMinutes(timeframe: TimeFrame): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame): IDataFrame<IndexT, any>;
        compress(timeframe: TimeFrame): IDataFrame<IndexT, any>;
    }
}

/**
 * Turn the tick data into minutes data.
 * The tick data contains an extra column for the time.
 * 
 * @param this 
 * @param timeframe 
 */
function tickToMinutes<IndexT = any>(this: IDataFrame<IndexT, any>, timeframe: TimeFrame): IDataFrame<IndexT, any> {
}

function compressMinutes<IndexT = any>(this: IDataFrame<IndexT, OHLC>, timeframe: TimeFrame): IDataFrame<IndexT, any> {
}

/**
 *
 * Support only day to week and month for now.
 * 
 * And assuming you know what you are doing. we can only compress days to weeks, days to months.
 * 
 * @param this 
 * @param timeframe 
 * @returns 
 */
function compress<IndexT = any>(this: IDataFrame<IndexT, OHLC>, timeframe: TimeFrame): IDataFrame<IndexT, any> {
    // considering there is a tax return sale on June like in Australia or maybe other places as well, 
    // so the strict canlender month compressing could be a good idea;
    // also it would be more accurate to reflect the market movement

    let rows: any[] = [];
    // compress day data to week
    // it is easy to 
    let maxtrading: number = 0;
    if (timeframe === TimeFrame.Week)
        maxtrading = 7;
    else if (timeframe === TimeFrame.Month) 
        maxtrading = 31;

    // for market normally we use Monday as the start of the week
    // and Sunday (if there is) as the end
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
        else
            row.time = value.time;

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

   let newdf = new DataFrame<IndexT, any>({values: new ArrayIterable(rows)});
   return newdf;
}
DataFrame.prototype.tickToMinutes = tickToMinutes;
DataFrame.prototype.compressMinutes = compressMinutes;
DataFrame.prototype.compress = compress;
