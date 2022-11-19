import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

import { computeRange as computeRange } from './utils';

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        range(period: number): ISeries<IndexT, number>;
        range_update(period: number, options: any): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        range(period: number): ISeries<IndexT, number>;
        range_update(period: number, update_period: number, options: any): IDataFrame<IndexT, any>;
    }
}

function range<IndexT = any>(this: IDataFrame<IndexT, OHLC>, period: number = 14): ISeries<IndexT, number> {
    // as we can do the first day's range
   return this.rollingWindow(2)
        .select<[IndexT, number]>(window => {
            const day1 = window.first();
            const day2 = window.last();

            return [
                window.getIndex().last(),
                computeRange(day1, day2)
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function range_update<IndexT = number>(this: IDataFrame<number, any>, period: number, update_period: number = 1, options: any = {}): IDataFrame<number, any> {
    let key: string = options['key'] || 'range';
    let count = this.count(); 
    let pos: number = count - update_period;

    for (let i = pos; i < count; ++i) {
        const lastRow = this.at(pos - 1);
        let row = this.at(i);
        row[key] = computeRange(lastRow, row);
    }
    return this;
}
DataFrame.prototype.range = range;
DataFrame.prototype.range_update = range_update;