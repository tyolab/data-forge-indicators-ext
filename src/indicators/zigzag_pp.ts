import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';
import { IDataFrame, DataFrame } from 'data-forge';
import { OHLC } from './ohlc';

/**
 * ZigZag++ as implemented in the tradingview
 * 
 * the indicator (extrema) groups the price the linearly up or down 
 */
declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        zigzag_pp(depth: number, deviation: number): ISeries<IndexT, number>;
    }

    interface DataFrame<IndexT, ValueT> {
        zigzag_pp(depth: number, deviation: number): ISeries<IndexT, number>;
    }
}

function zigzag_pp<IndexT = any>(this: IDataFrame<IndexT, OHLC>, depth: number = 12, deviation: number = 5): ISeries<IndexT, number> {

	assert.isNumber(depth, "Expected 'depth' parameter to 'Series.sma' to be a number that specifies the time depth of the moving average.");

    let stack: any = [];
    let self = this.resetIndex();
    let count = self.count();
 
    let extrema: number[] = new Array(count);
    for (var i = 0; i < extrema.length; ++i) {
        extrema[i] = 0.0;
    }

    let max = function (window: IDataFrame<number, OHLC>):number[] {
        let max:number = 0;
        let maxIndex = -1;
        window.forEach((value, index) => {
            max = Math.max(max, value.high);
            if (max == value.high)
                maxIndex = index;
        });
        return [maxIndex, max];
    }

    let min = function (window: IDataFrame<number, OHLC>):number[] {
        let min:number = 0;
        let minIndex = -1;
        window.forEach((value, index) => {
            if (min == 0) {
                min = value.low;
                minIndex = index;
            }
            min = Math.min(min, value.low);
            if (min == value.low)
                minIndex = index;
        });
        return [minIndex, min];
    }

    var stackLoop = function (window: IDataFrame<number, OHLC>, start: number, end: number, direction: number = 0, extremum: any = null) {
        let leftExtremum = extremum && extremum[0]? extremum[0] : null;
        let rightExtremum = extremum && extremum[1]? extremum[1] : null; 

        if (window.count() > depth) {

            let maxPair:number[] = max(window);
            let minPair:number[] = min(window);
            
            // put the offset back
            maxPair[0] += start;
            minPair[0] += start;

            let higher = maxPair[0] > minPair[0];

            /**
             * If this part of the price has the same trend of the parent trend 
             * we will just skip it
             */
            if (!leftExtremum && !rightExtremum) {
                if (higher && rightExtremum[1] > leftExtremum[1])
                    return;
                else if (!higher && leftExtremum[1] > rightExtremum[1])
                    return;
            }

            let le: any | undefined | null = higher? minPair : maxPair;
            let re: any | undefined | null = higher? maxPair : minPair;

            // for penny stocks
            let mintick = 0.001;
            if (minPair[1] > 0.1 && minPair[1] <= 1)
                mintick = 0.05;
            else if (minPair[1] > 1 && minPair[1] <= 10)
                mintick = 0.25;
            else if (minPair[1] > 10)
                mintick = 0.5;
            
            /**
             * object
             * {direction: 1/-1, window: []}
             */
            var s1: number = 0, s2: number = 0, s3: number = 0, e1: number = 0, e2: number = 0, e3: number = 0;

            s2 = le[0] + 1;
            e2 = re[0] - 1;
            if (e2 - s2 > depth) {
                stack.push({
                    direction: higher ? 1 : -1,
                    window: [s2, e2],
                    extremum: [le, re]
                });
            }
            else {
                let df = Math.abs(le[1] - re[1]) - deviation * mintick;
                if (df < 0) {
                    // just use the left one
                    re = le;
                    // if (direction > 0)
                    //     le = re;
                    // else
                    //     re = le;
                }
            }

            s1 = start;
            e1 = le[0] - 1;
            if (e1 - s1 < depth) {
                // don't need to put it into the stack
                if (leftExtremum) {
                    let df = Math.abs(leftExtremum[1] - le[1]) - deviation * mintick;
                    if (df < 0) {
                        le = null;
                    }

                }
            }
            else {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s1, e1],
                    extremum: [leftExtremum, le]  // left side of the window
                });
            }

            s3 = re[0] + 1;
            e3 = end;
            if (e3 -s3 < depth) {
                // don't need to put it into the stack
                if (rightExtremum) {
                    let df = Math.abs(rightExtremum[1] - re[1]) - deviation * mintick;
                    if (df < 0) {
                        // too small the different beween the extrema is, we will only use one
                        // if (higher) {
                        //     re = (rightExtremum[1] < re[1] ? rightExtremum : re)
                        // }
                        // else {
                        //     re = (rightExtremum[1] > re[1] ? rightExtremum : re)
                        // }
                        re = null;
                    }

                }
            }
            else {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s3, e3],
                    extremum: [re, rightExtremum]  // right side of the window
                });
            }
            
            if (le) {
                extrema[le[0]] = (le[1]);
            }

            if (re && (!le || re[0] != le[0]))
                extrema[re[0]] = re[1];
        }

    }

    stackLoop(self, 0, this.count() - 1);

    while (stack.length > 0) {
        let todo = stack.shift();
        var from =todo.window[0], to= todo.window[1];
        let win: IDataFrame<number, OHLC> = self.between(from, to);
        win.bake();     
        stackLoop(win, from, to, todo.direction, todo.extremum);
    }

    return new Series({values: extrema});
}

DataFrame.prototype.zigzag_pp = zigzag_pp;