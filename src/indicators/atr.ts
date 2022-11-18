import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

import { computeRange as computeRange } from './utils';

export interface IAtr {
    /**
     * The ATR number.
     */
    avg: number;

    /**
     * The Standard Deviation of the ATR.
     */
    std: number;

    /**
     * The percentage of change, Normalized ATR.
     */
    p: number;

    /**
     * The percentage of change, Normalized ATR.
     */
    normalized: number;    
}

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, IAtr>;
        atr_update(period: number, update_period: number, options: any): IDataFrame<IndexT, any>;
    }

    interface DataFrame<IndexT, ValueT> {
        atr(period: number): ISeries<IndexT, IAtr>;
        atr_update(period: number, update_period: number, options: any): IDataFrame<IndexT, any>;
    }
}

function atr<IndexT = any>(this: IDataFrame<IndexT, any>, period: number = 14): ISeries<IndexT, IAtr> {
    let last = this.last();
    let range_key = 'range';
    let range_key_with_prefix = 'range' + period;
    if (typeof last[range_key_with_prefix] === 'number')
        range_key = range_key_with_prefix;

    if (typeof last[range_key] === 'number') {
        return this.rollingWindow(period)
            .select<[IndexT, IAtr]>(window => {
    
                let ranges = window.deflate(row => row[range_key]);
                let avg = ranges.average();

                let day2 = window.last();

                let p: number = day2.close > day2.open ? avg / day2.low : avg / day2.high; 

                let atr_v: IAtr = {
                    avg: avg,
                    std: ranges.std(),
                    p: p,
                    normalized: avg / day2.close
                }   
                return [day2.index, atr_v];
            })
            .withIndex(pair1 => pair1[0])
            .select(pair1 => pair1[1]);;
    }

    // as we can do the first day's range
   return this.rollingWindow(period + 1)
        .select<[IndexT, IAtr]>((window1) => {
            
            let ranges = window1.rollingWindow(2)
            .select<number>(window => {
                const day1 = window.first();
                const day2 = window.last();

                return computeRange(day1, day2);
            });

            let avg = ranges.average();
            let idx = window1.getIndex().last();
            let last_bar = window1.last(); // window1.at(idx); 

            /**
            * volatility correlates directly with the profitility 
            * 
            * the percentage of change 
            * measure the volatility 
            * 
            * if green, atr / low
            * if red, atr / high
            */
            let p: number = last_bar.close > last_bar.open ? avg / last_bar.low : avg / last_bar.high; 

            let atr_v: IAtr = {
                avg: avg,
                std: ranges.std(),
                p: p,
                normalized: avg / last_bar.close
            }   

            return [
                idx,
                atr_v
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

function atr_update<IndexT = number>(this: IDataFrame<number, any>, period: number, update_period: number = 1, options: any = {}): IDataFrame<number, any> {
    let key: string = options['key'] || 'atr';

    let pos: number = this.count() - update_period;
    let last = this.last();
    let range_key = 'range';

    for (let i = pos; i < this.count(); ++i) {
        const lastRow = this.at(pos - 1);
        let row = this.at(i);

        let first_pos = i - period - 1;
        if (first_pos >= 0) {
            let ranges;
            if (typeof last.range === 'number') {
                let window = this.skip(first_pos + 1).take(period);
                ranges = window.deflate(row => row.range);
            }
            else {
                let window = this.skip(first_pos).take(period + 1);
                ranges = window.rollingWindow(2)
                    .select<number>(window2 => {
                    const day1 = window2.first();
                    const day2 = window2.last();

                    return computeRange(day1, day2);
                });
            }

            let avg = ranges.average();

            /**
            * volatility correlates directly with the profitility 
            * 
            * the percentage of change 
            * measure the volatility 
            * 
            * if green, atr / low
            * if red, atr / high
            */
            let p: number = last.close > last.open ? avg / last.low : avg / last.high; 

            let atr_v: IAtr = {
                avg: avg,
                std: ranges.std(),
                p: p,
                normalized: avg / last.close
            }   
            row[key] = atr_v;
        }
    }
    return this;
}
DataFrame.prototype.atr = atr;
DataFrame.prototype.atr_update = atr_update;