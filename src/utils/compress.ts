import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { ArrayIterable } from 'data-forge/build/lib/iterables/array-iterable';
import { OHLC } from '../indicators/ohlc';

const MILLION_SECONDS_OF_ONE_MINUTE = 60 * 1000;

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

export interface TickColumns {
    time: string;
    last_trade_price: string;
    last_trade_size: string;
}

function padding(num: number) {
    return num < 10 ? '0' + num : num;
}

function date2yyyymmddms(d: Date): string {
    let mm = d.getMonth() + 1;
    let dd = d.getDate();
    let hh = d.getHours();
    return '' + d.getFullYear() + padding(mm) + padding(dd)  + padding(hh) + padding(d.getMinutes());
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        tickToMinutes(columns?: TickColumns): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame, from?: TimeFrame): IDataFrame<IndexT, any>;
        compress(timeframe: TimeFrame): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        tickToMinutes(columns?: TickColumns): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame, from?: TimeFrame): IDataFrame<IndexT, any>;
        compress(timeframe: TimeFrame): IDataFrame<IndexT, any>;
    }
}

/**
 * Turn the tick data into minutes data.
 * 
 * for this function,
 * we are suppose to see three columns: 
 * - time
 * - last_trade_price
 * - last_trade_size
 * 
 * For the tick data, we shouldn't really care the time difference due to the timezones, as we try to monitor the movements of the market in a smaller timeframe.
 * 
 * @param this 
 * @param timeframe 
 */
function tickToMinutes<IndexT = any>(this: IDataFrame<IndexT, any>, columns?: TickColumns): IDataFrame<number, any> {
    if (columns === undefined) 
        columns = {time: 'time', last_trade_price: 'last_trade_price', last_trade_size: 'last_trade_size'};
    if (!columns.time)
        columns.time = 'time';
    if (!columns.last_trade_price)
        columns.last_trade_price = 'last_trade_price';
    if (!columns.last_trade_size)
        columns.last_trade_size = 'last_trade_size';
    
    let rows: [any][any] = []
    const df = this;
    let last_minute = undefined, last_tick_time = undefined;
    let last_tick_minute_str = undefined;
    let last_open = undefined, last_close = undefined, last_high = undefined, last_low = undefined, last_volume = 0;
    for (const tick of df) {
        last_minute = tick[columns.time];
        let tick_minute = date2yyyymmddms(last_minute);
        let price = tick[columns.last_trade_price];

        if (last_tick_minute_str === undefined) {
            last_tick_minute_str = tick_minute;
            last_high = last_low = last_open = price;
            last_volume = 0; // tick[columns.last_trade_size];
        }

        if (tick_minute !== last_tick_minute_str) {
            let row = [];
            row.push(last_tick_time);
            row.push(last_open);
            row.push(last_high);
            row.push(last_low);
            row.push(last_close);
            row.push(last_volume);
            rows.push(row);

            last_tick_time = last_minute;
            last_tick_minute_str = tick_minute;
            last_close = last_high = last_low = last_open = price;
            last_volume = tick[columns.last_trade_size] || 0;
            continue;
        }

        last_volume += tick[columns.last_trade_size];
        if (price > last_high)
            last_high = price;
        if (price < last_low)
            last_low = price;
        last_close = price;
        last_tick_time = last_minute;
    }

    if (last_minute) {
        let row = [];
        row.push(last_tick_time);
        row.push(last_open);
        row.push(last_high);
        row.push(last_low);
        row.push(last_close);
        row.push(last_volume);
        rows.push(row);
    }

    return new DataFrame<number, any>({
        rows: rows,
        columnNames: ['time', 'open', 'high', 'low', 'close', 'volume'],
    });;
}

/**
 * Compress OHLC data in minutes into a new dataframe with larger timeframe.
 * 
 * @param this 
 * @param timeframe 
 * @returns 
 */
function compressMinutes<IndexT = any>(this: IDataFrame<IndexT, OHLC>, timeframe: TimeFrame, from?: TimeFrame): IDataFrame<number, any> {
    from = from || TimeFrame.Minutes_1;
    let span: number = timeframe - from;
    assert.isAbove(span, 1, "Expected timeframe to be greater than 1");
    let apart = span * MILLION_SECONDS_OF_ONE_MINUTE;

    let rows: [any][any] = [];
    const df = this;
    let last_minute = undefined, last_tick_time = undefined;
    let last_minute_checked = undefined;
    let last_open = undefined, last_close = undefined, last_high = undefined, last_low = undefined, last_volume = 0;
    for (const min_row of df) {
        last_minute = min_row.time;

        if (last_minute_checked === undefined) {
            last_minute_checked = last_minute;
            last_open = min_row.open;
            last_close = min_row.close;
            last_high = min_row.high;
            last_low = min_row.low;
            last_volume = min_row.volume || 0;
        }

        if (last_minute.getTime() - last_minute_checked.getTime() > apart) {
            let row = [];
            row.push(last_tick_time);
            row.push(last_open);
            row.push(last_high);
            row.push(last_low);
            row.push(last_close);
            row.push(last_volume);
            rows.push(row);

            last_tick_time = last_minute_checked = last_minute;
            last_open = min_row.open;
            last_close = min_row.close;
            last_high = min_row.high;
            last_low = min_row.low;
            last_volume = min_row.volume || 0;
            continue;
        }

        last_volume += min_row.volume || 0;
        if (!last_high || min_row.high > last_high)
            last_high = min_row.high;
        if (!last_low || min_row.low < last_low)
            last_low = min_row.low;
        last_close = min_row.close;
        last_tick_time = last_minute;
    }

    if (last_minute) {
        let row = [];
        row.push(last_minute);
        row.push(last_open);
        row.push(last_high);
        row.push(last_low);
        row.push(last_close);
        row.push(last_volume);
        rows.push(row);
    }

    return new DataFrame<number, any>({
        rows: rows,
        columnNames: ['time', 'open', 'high', 'low', 'close', 'volume'],
    });;
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
