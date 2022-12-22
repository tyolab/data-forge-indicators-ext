import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { ArrayIterable } from 'data-forge/build/lib/iterables/array-iterable';
import { OHLC } from '../indicators/ohlc';

const MILLION_SECONDS_OF_ONE_MINUTE = 60 * 1000;

export enum TimeFrame {
    Tick = 0,               // "tick",
    Minute_1 = 1,           // "1m",
    Minutes_2 = 2,          // "2m",
    Minutes_3 = 3,          // "3m",
    Minutes_5 = 5,          // "5m",
    Minutes_15 = 15,        //  "15m",
    Minutes_30 = 30,        // "30m",
    Hour_1 = 60,            // "1h",
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

function trim_seconds(old_d: Date) {
    let d = new Date(old_d.getTime());
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        tickToMinutes(columns?: TickColumns): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame, from: TimeFrame): IDataFrame<IndexT, any>;
        compress(timeframe: TimeFrame): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        tickToMinutes(columns?: TickColumns): IDataFrame<IndexT, any>;
        compressMinutes(timeframe: TimeFrame, from: TimeFrame): IDataFrame<IndexT, any>;
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
function tickToMinutes<IndexT>(this: IDataFrame<IndexT, any>, columns?: TickColumns): IDataFrame<IndexT, any> {
    columns = columns || {time: 'time', last_trade_price: 'last_trade_price', last_trade_size: 'last_trade_size'};
    if (!columns.time)
        columns.time = 'time';
    if (!columns.last_trade_price)
        columns.last_trade_price = 'last_trade_price';
    if (!columns.last_trade_size)
        columns.last_trade_size = 'last_trade_size';
    
    let col_name_time = columns.time;
    let col_name_last_trade_price = columns.last_trade_price;
    let col_name_last_trade_size = columns.last_trade_size;
    
    let df = this
    .withSeries('open', this.deflate(tick => tick[col_name_last_trade_price]))
    .withSeries('high', this.deflate(tick => tick[col_name_last_trade_price]))
    .withSeries('close', this.deflate(tick => tick[col_name_last_trade_price]))
    .withSeries('low', this.deflate(tick => tick[col_name_last_trade_price]))
    .withSeries('volume', this.deflate(tick => tick[col_name_last_trade_size] || 0))
    .dropSeries([col_name_last_trade_price, col_name_last_trade_size]);

    if (col_name_time !== 'time') {
        let obj: any = {};
        obj[col_name_time] = 'time';
        df = df.renameSeries(obj);
    }
    return this.compressMinutes(TimeFrame.Minute_1, TimeFrame.Tick);
}

/**
 * Compress OHLC data in minutes into a new dataframe with larger timeframe.
 * 
 * @param this 
 * @param timeframe 
 * @returns 
 */
function compressMinutes<IndexT>(this: IDataFrame<IndexT, OHLC>, timeframe: TimeFrame, from: TimeFrame): IDataFrame<IndexT, any> {

    assert.isAbove(timeframe, 0, "Expected timeframe to be greater than 0");

    let span: number;
    if (from <= TimeFrame.Minute_1)
        span = timeframe - from;
    else {
        // because if the bar created from this function
        // the bar time will be the last tick / bar time
        // so we need to add the span to the time
        span = timeframe;
    }

    assert.isAbove(span, 0, "Expected timeframe span to be greater than 0");
    let apart = span * MILLION_SECONDS_OF_ONE_MINUTE;

    let rows: [any][any] = [];
    const df = this;
    let last_time = undefined, last_tick_time = undefined;
    let last_minute_checked = undefined;
    let last_open = undefined, last_close = undefined, last_high = undefined, last_low = undefined, last_volume = 0;
    for (const min_row of df) {
        last_time = min_row.time;

        if (last_minute_checked === undefined || (last_time.getTime() - last_minute_checked.getTime()) > apart) {

            if (last_minute_checked) {
                let row = [];
                row.push(last_tick_time);
                row.push(last_open);
                row.push(last_high);
                row.push(last_low);
                row.push(last_close);
                row.push(last_volume);
                rows.push(row);
            }

            last_tick_time = last_minute_checked = trim_seconds(last_time);

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
        last_tick_time = trim_seconds(last_time);
    }

    if (last_tick_time) {
        let row = [];
        row.push(last_tick_time);
        row.push(last_open);
        row.push(last_high);
        row.push(last_low);
        row.push(last_close);
        row.push(last_volume);
        rows.push(row);
    }

    return new DataFrame<IndexT, any>({
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
