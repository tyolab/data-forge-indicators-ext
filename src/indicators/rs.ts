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
        rs_update(comparative: IDataFrame<IndexT, number>, length: number, key: string, valueKey: string): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        rs_update(comparative: IDataFrame<IndexT, any>, length: number, key: string, valueKey: string): IDataFrame<IndexT, any>;
    }
}

function rs<IndexT = any>(this: ISeries<IndexT, number>, comparative: ISeries<IndexT, number>, length: number = 50): ISeries<IndexT, number> {

    if (!comparative) {

        return this;
    }
    assert.equal(this.count(), comparative.count(), "The two series much contain same number of values");

    // as we can do the first day's range
   return this.rollingWindow(length)
        .select<[IndexT, number]>((window) => {
            const day1 = window.first();
            const day2 = window.last();
            const index1 = window.getIndex().first();
            const index2 = window.getIndex().last();
            const c1 = comparative.at(index1) || 1;
            const c2 = comparative.at(index2) || 1;

            // @ts-ignore
            return [
                window.getIndex().last(),
                (day2 / day1) / (c2 / c1) -1
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function rs_update<IndexT = any>(this: IDataFrame<number, any>, comparative: IDataFrame<number, any>, period: number, key: string, valueKey: string): IDataFrame<number, number> {

    if (!comparative) {

        return this;
    }
    assert.equal(this.count(), comparative.count(), "The two data frames much contain same number of values");

    let pos: number = this.count() - period;
    key = key || 'atr';

    for (let i = pos; i < this.count(); ++i) {
        let last_pos = i - period;
        let window = this.between(last_pos, i).getSeries(valueKey);
        let row = this.at(i);
        row[key] = computeATR(lastRow, row);

    }
    return this;
}

Series.prototype.rs = rs;