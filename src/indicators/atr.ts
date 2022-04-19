import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

import { computeATR } from './utils';

export interface IAtr {
    /**
     * The ATR number.
     */
    avg: number;

    /**
     * The Standard Deviation of the ATR.
     */
    std: number;
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, IAtr>;
        atr_update(period: number, key?: string): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, IAtr>;
        atr_update(period: number, key?: string): IDataFrame<IndexT, any>;
    }
}

function atr<IndexT = any>(this: IDataFrame<IndexT, OHLC>, period: number = 14): ISeries<IndexT, IAtr> {
    // as we can do the first day's range
   return this.rollingWindow(period + 1)
        .select<[IndexT, IAtr]>((window1) => {
            
            let ranges = window1.rollingWindow(2)
            .select<number>(window => {
                const day1 = window.first();
                const day2 = window.last();

                return computeATR(day1, day2);
            });

            let atr_v: IAtr = {
                avg: ranges.average(),
                std: ranges.std()
            }   

            return [
                window1.getIndex().last(),
                atr_v
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function atr_update<IndexT = number>(this: IDataFrame<number, any>, period: number = 1, key?: string): IDataFrame<number, any> {
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