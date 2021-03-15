import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        gaps_pp(): ISeries<IndexT, number>;
    }

    interface DataFrame<IndexT, ValueT> {
        gaps_pp(): ISeries<IndexT, number>;
    }
}

/**
 * 
 * @param this 
 * @returns 
 */
function gaps_pp<IndexT = any>(this: IDataFrame<IndexT, OHLC>): ISeries<IndexT, number> {

    return this.rollingWindow(2)
        .select<[IndexT, number]>(window => {
            /**
             * A gap is a meaningful gan when it doesn't get filled on the same day
             */
            const day1 = window.first(); // .close;
            const day2 = window.last(); // .open;

            // Up
            if ((day2.open > day1.close && day2.low > day1.high) 
            ||
            // Down
            (day2.open < day1.close) && day2.high < day1.low) {

                return [
                    window.getIndex().last(),
                    ((day2.open - day1.close) / day1.close) * 100,
                ];
            }
            else {
                return [
                    window.getIndex().last(),
                    0,
                ];
            }
        })
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
}

DataFrame.prototype.gaps_pp = gaps_pp;