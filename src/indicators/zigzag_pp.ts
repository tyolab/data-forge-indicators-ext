import { assert } from 'chai';
import { DataFrame, ISeries, Series } from 'data-forge';

/**
 * ZigZag++ as implemented in the tradingview
 * 
 * the indicator (extrema) groups the price the linearly up or down 
 */

export interface IZigZag_PP {
    /**
     * "hh", "hl", "lh", "ll"
     */
    point: string;
}

declare module "data-forge/build/lib/series" {
    interface ISeries<IndexT, ValueT> {
        zigzag_pp(depth: number, deviation: number, backStep: number): ISeries<IndexT, number>;
    }

    interface Series<IndexT, ValueT> {
        zigzag_pp(depth: number, deviation: number, backStep: number): ISeries<IndexT, number>;
    }
}

function zigzag_pp<IndexT = any>(this: ISeries<IndexT, number>, depth: number = 12, deviation: number = 5, backStep: number = 3): ISeries<IndexT, number> {

	assert.isNumber(depth, "Expected 'depth' parameter to 'Series.sma' to be a number that specifies the time depth of the moving average.");


    let stack: any = [];
    let self = this;
    let count = this.count();
 
    let extrema: number[] = new Array(count);
    let array = new Array(count);
    for (var i = 0; i < extrema.length; ++i) {
        extrema[i] = 0.0;
    }

    let max = function (window: ISeries<IndexT, number>):number[] {
        let max = 0;
        let maxIndex = -1;
        window.forEach((value, index) => {
            max = Math.max(max, value);
            if (max == value)
                maxIndex = index;
        });
        return [maxIndex, max];
    }

    let min = function (window: ISeries<IndexT, number>):number[] {
        let min = 0;
        let minIndex = -1;
        window.forEach((value, index) => {
            min = Math.min(min, value);
            if (min == value)
                minIndex = index;
        });
        return [minIndex, min];
    }

    var stackLoop = function (window: ISeries<IndexT, number>, start: number, end: number, direction: number = 0, extremum: any = null) {
        let leftExtremum = extremum && extremum[0]? extremum[0] : null;
        let rightExtremum = extremum && extremum[1]? extremum[1] : null; 

        if (window.count() > depth) {

            let maxPair:number[] = max(window);
            let minPair:number[] = min(window);
                            
            let higher = maxPair[0] > minPair[0];
            let le: any | undefined | null = higher? minPair : maxPair;
            let re: any | undefined | null = higher? maxPair : minPair;

            // for penny stocks
            let mintick = 0.001;
            if (minPair[1] > 0.1 && minPair[1] <= 1)
                mintick = 0.05;
            else if (minPair[1] > 1 && minPair[1] <= 10)
                mintick = 0.25;
            else 
                mintick = 0.5;
            
            /**
             * object
             * {direction: 1/-1, window: []}
             */
            var s1: number = 0, s2: number = 0, s3: number = 0, e1: number = 0, e2: number = 0, e3: number = 0;
            //let bd1 = higher && leftExtremum ? Math.abs(start + minPair[0] - leftExtremum[0]);
            //let diff = Math.abs(maxPair[1] - minPair[1]);
            // not enough bars we need to marge them to the neibouring window
            // if (maxPair[0] - minPair[0] < depth)  {

            // }
            // else {
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
            //
            // else
            // don't need to do anything, as the edges of the window have the extrema 
            // 
            //if (minPair[0] > depth) {
            s1 = start;
            e1 = le[0] - 1;
            if (e1 - s1 < depth) {
                // don't need to put it into the stack
                if (leftExtremum) {
                    let df = Math.abs(leftExtremum[1] - le[1]) - deviation * mintick;
                    if (df < 0) {
                        // // too small the different beween the extrema is, we will only use one
                        // if (higher) {
                        //     le = (leftExtremum[1] < le[1] ? leftExtremum : le)
                        // }
                        // else {
                        //     le = (leftExtremum[1] > le[1] ? leftExtremum : le)
                        // }
                        le = null;
                    }

                }
            }
            else {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s1, e1],
                    extremum: [leftExtremum, higher ? minPair : maxPair]
                });
            }
            //}

            //if (end - maxPair[0] > depth) {
                s3 = re[0] + 1;
                e3 = end;
            if (e3 - s3 < depth) {
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
                    extremum: [higher ? maxPair : minPair, rightExtremum]
                });
            }
            
            if (le) {
                extrema[le[0]] = (le[1]);
            }

            if (re && (!le || re[0] != le[0]))
                extrema[re[0]] = re[1];
        }

    }

    stackLoop(this, 0, this.count() - 1);

    while (stack.length > 0) {
        let todo = stack.shift();
        stackLoop(self.between(todo.window[0], todo.window[1]), todo.window[0], todo.window[1], todo.direction, todo.extremum);
    }

    return new Series({values: extrema});
}

Series.prototype.zigzag_pp = zigzag_pp;