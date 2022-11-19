/**
 * @file rs.ts
 * 
 * 
 */

import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        rs(comparative: ISeries<IndexT, number>, length: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        rs(comparative: ISeries<IndexT, number>, length: number): ISeries<IndexT, number>;
    }
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        rs_update(comparative: IDataFrame<number, any>, length: number, update_period: number, key?: string, value_key?: string): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        rs_update(comparative: IDataFrame<number, any>, length: number, update_period: number, key?: string, value_key?: string): IDataFrame<IndexT, any>;
    }
}

function computeRS<IndexT = any>(window: ISeries<IndexT, any>, comparative: ISeries<IndexT, any>) {
    const day1 = window.first();
    const day2 = window.last();
    const c1 = comparative.first() || 1;
    const c2 = comparative.last() || 1;
    return (day2 / day1) / (c2 / c1) -1;
}

function rs<IndexT = any>(this: ISeries<IndexT, number>, comparative: ISeries<IndexT, number>, length: number = 50): ISeries<IndexT, number> {

    if (!comparative) {
        return this;
    }
    assert.equal(this.count(), comparative.count(), "The two series must contain same number of values");

    // as we can do the first day's range
   return this.rollingWindow(length)
        .select<[IndexT, number]>((window) => {
            const index1 = window.getIndex().first();
            const index2 = window.getIndex().last();
            let window2 = comparative.between(index1, index2);
            // @ts-ignore
            return [
                window.getIndex().last(),
                computeRS(window, window2)
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function rs_update<IndexT = number>(this: IDataFrame<number, any>, comparative: IDataFrame<number, any>, period: number, update_period: number = 1, key?: string, value_key?: string): IDataFrame<number, any> {

    if (!comparative) {
        return this;
    }
    assert.equal(this.count(), comparative.count(), "The two dataframes must contain same number of values");

    let count = this.count(); 
    let pos: number = count - update_period;
    key = key || 'rs';
    value_key = value_key || 'close';

    for (let i = pos; i < count; ++i) {
        let last_pos = i - period;
        let window = this.between(last_pos, i).getSeries(value_key);
        let window2 = comparative.between(last_pos, i).getSeries(value_key); 
        let row = this.at(i);
        const value = computeRS(window, window2);
        row[key] = value;
    }

    return this;
}

Series.prototype.rs = rs;