import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, number>;
    }

    interface DataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, number>;
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
                const r1 = Math.abs(day2.high - day2.low);
                const r2 = Math.abs(day2.high - day1.close);
                const r3 = Math.abs(day2.low - day1.close);
                const r = Math.max(r1, Math.max(r2, r3));
                return r;
            });

            return [
                window1.getIndex().last(),
                ranges.average()
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

DataFrame.prototype.atr = atr;