import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

import { computeATR } from './utils';
declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, number>;
        atr_update(period: number, key?: string): IDataFrame<IndexT, number>;
    }

    interface DataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, number>;
        atr_update(period: number, key?: string): IDataFrame<IndexT, number>;
    }
}

function atr<IndexT = any>(this: IDataFrame<IndexT, OHLC>, period: number = 14): ISeries<IndexT, number> {
    // as we can do the first day's range
   return this.rollingWindow(period + 1)
        .select<[IndexT, number]>((window1) => {
            
            let ranges = window1.rollingWindow(2)
            .select<number>(window => {
                const day1 = window.first();
                const day2 = window.last();

                return computeATR(day1, day2);
            });

            return [
                window1.getIndex().last(),
                ranges.average()
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function atr_update<IndexT = number>(this: IDataFrame<number, any>, period: number, key?: string): IDataFrame<number, number> {
    let pos: number = this.count() - period;
    key = key || 'atr';

    for (let i = pos; i < this.count(); ++i) {
        const lastRow = this.at(pos - 1);
        let row = this.at(i);
        row[key] = computeATR(lastRow, row);

    }
    return this;
}
DataFrame.prototype.atr = atr;
DataFrame.prototype.atr_update = atr_update;