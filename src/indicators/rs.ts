/**
 * @file rs.ts
 * 
 * 
 */

import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        rs(comparative: ISeries<IndexT, number>, length: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        rs(comparative: ISeries<IndexT, number>, length: number): ISeries<IndexT, number>;
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
                (day1 / day2) / (c1 / c2) -1
            ];
        })
        .withIndex(pair1 => pair1[0])
        .select(pair1 => pair1[1]);
}

Series.prototype.rs = rs;