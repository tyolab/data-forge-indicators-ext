import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { max } from 'moment';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        highest_range(): number;
    }

    interface DataFrame<IndexT, ValueT> {
        highest_range(): number;
    }
}

/**
 * 
 * @param this 
 * @returns 
 */
function highest_range<IndexT = any>(this: IDataFrame<IndexT, OHLC>): number {

    return this.rollingWindow(2)
    .select<[IndexT, number]>((window) => {
        
        const day1 = window.first();
        const day2 = window.last();
        const r1 = Math.abs(day2.high - day2.low);
        const r2 = Math.abs(day2.high - day1.close);
        const r3 = Math.abs(day2.low - day1.close);
        const r = Math.max(r1, Math.max(r2, r3));

        return [
            window.getIndex().last(),
            r
        ];
    })
    .withIndex(pair1 => pair1[0])
    .select(pair1 => pair1[1])
    .max();
}

DataFrame.prototype.highest_range = highest_range;