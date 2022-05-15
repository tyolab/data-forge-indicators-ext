import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { max } from 'moment';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        highest(period: number): any;
        lowest(period: number): any;

        highest_update(last_high: any, update_period: number): any;
        lowest_update(last_low: any, update_period: number): any;
    }

    interface DataFrame<IndexT, ValueT> {
        highest(period: number): any;
        lowest(period: number): any;

        highest_update(last_high: any, update_period: number): any;
        lowest_update(last_low: any, update_period: number): any;       
    }
}

function highest<IndexT = any>(this: IDataFrame<number, OHLC>, period: number = 365): any {
    let min = Math.min(this.count(), period);
    let max_value = 0;
    let max_day = this.last();

    let dataframe = this.between(this.count() - min, this.count() - 1);

    for (const day of dataframe) {
        if (day.high && day.high >= max_value) {
            max_value = day.high;
            max_day = day;
        }
    }
    return max_day;
}

function lowest<IndexT = any>(this: IDataFrame<number, OHLC>, period: number = 365): any {
    let min = Math.min(this.count(), period);
    let min_value = Number.MAX_SAFE_INTEGER;
    let min_day = this.last();

    let dataframe = this.between(this.count() - min, this.count() - 1);

    for (const day of dataframe) {
        if (day.low && day.low <= min_value) {
            min_value = day.low;
            min_day = day;
        }
    }
    return min_day;
}

function lowest_update<IndexT = number>(this: IDataFrame<number, any>, last_low: any, update_period: number): any {
    let pos: number = this.count() - update_period;
    let new_low = last_low;

    for (let i = pos; i < this.count(); ++i) {
        let day = this.at(i);

        if (day.low && day.low <= new_low.low) {
            new_low = day;
        }

    }
    return new_low;
}

function highest_update<IndexT = number>(this: IDataFrame<number, any>, last_high: any, update_period: number): any {
    let pos: number = this.count() - update_period;
    let new_high = last_high;

    for (let i = pos; i < this.count(); ++i) {
        let day = this.at(i);

        if (day.high && day.high >= new_high.high) {
            new_high = day;
        }
    }
    return new_high;
}

DataFrame.prototype.highest = highest;
DataFrame.prototype.highest_update = highest_update;
DataFrame.prototype.lowest = lowest;
DataFrame.prototype.lowest_update = lowest_update;