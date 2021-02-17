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

    return this.rollingWindow(period)
        .select<[IndexT, number]>(window => {
            var count = window.count();
            var ranges = 0;
            for (var i = 0; i < count; ++i) {
            const day1 = window.first().close;
            const day2 = window.last().open;

            }

            return [
                window.getIndex().last(),
                ranges / period,
            ];
        })
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
}

DataFrame.prototype.atr = atr;