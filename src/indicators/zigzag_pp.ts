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
            var maxPair = max(window);
            var minPair = min(window);
            // put the offset back
            maxPair[0] += start;
            minPair[0] += start;
            var higher = maxPair[0] > minPair[0];
            /**
             * @todo
             * No, we don't need this part here, this part will make lots of extrema dispeared
             * but we do need this part in other place
             * ======
             * If this part of the price has the same trend of the parent trend
             * we will just skip it
             */
            // if (leftExtremum && rightExtremum) {
            //     if (higher && rightExtremum[1] > leftExtremum[1])
            //         return;
            //     else if (!higher && leftExtremum[1] > rightExtremum[1])
            //         return;
            // }
            var le: Array<number> = higher ? minPair : maxPair;
            var re: Array<number> = higher ? maxPair : minPair;
            // for penny stocks
            var mintick = 0.001;
            if (minPair[1] > 0.1 && minPair[1] <= 1)
                mintick = 0.005;
            else if (minPair[1] > 1 && minPair[1] <= 10)
                mintick = 0.005;
            else if (minPair[1] > 10)
                mintick = 0.01;
            /**
             * object
             * {direction: 1/-1, window: []}
             */
            var s1 = 0, s2 = 0, s3 = 0, e1 = 0, e2 = 0, e3 = 0;
            var ldf = null, rdf = null;

            s1 = start;
            e1 = le[0] - 1;
            if (e1 - s1 > depth) {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s1, e1],
                    extremum: [leftExtremum, le] // left side of the window
                });
                
            }
            else {
                ldf = leftExtremum ? Math.abs(leftExtremum[1] - le[1]) - deviation * mintick : 1;

                if (ldf < 0) {
                    // the left extremum are not much different
                    le = leftExtremum;
                }
            }
            s3 = re[0] + 1;
            e3 = end;
            if (e3 - s3 > depth) {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s3, e3],
                    extremum: [re, rightExtremum] // right side of the window
                });
            }
            else {
                rdf = rightExtremum ? Math.abs(rightExtremum[1] - re[1]) - deviation * mintick : 1;

                if (rdf < 0) {
                    // the right extremum are not much different with each other
                    // will will simply take the right
                    re = rightExtremum;
                }
            }
            // if the left and right extremum are right at the end, we don't need to slipt again
            if (le != leftExtremum || re != rightExtremum) {
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
                    var mdf = Math.abs(le[1] - re[1]) - deviation * mintick;
                    if (mdf < 0) {
                        // if the middle extremum are not much different, 
                        // they need to be both bigger or smaller than the left / right extremum

                        // so
                        if (leftExtremum && rightExtremum) {
                            if ( (leftExtremum[1] > le[1] && le[1] < rightExtremum) 
                                || 
                                (leftExtremum[1] < le[1] && le[1] > rightExtremum) 
                            ) {
                                if (leftExtremum[1] > le[1]) {
                                    // we pick the smallest one
                                    if (le[1] > re[1])
                                        le[0] = -1;
                                    else
                                        re[0] = -1;
                                }
                                else if (leftExtremum[1] < le[1]) {
                                     // we pick the biggest one
                                     if (le[1] < re[1])
                                        le[0] = -1;
                                    else
                                        re[0] = -1;
                                }
                            }
                        }
                        else {
                            // I don't think that is even possible for the code to come in here
                            // when this is happen
                            // the price actions are just two straight lines
                            console.log("The impossible just happens.");
                            le[0] = -1;
                            re[0] = -1;
                        }
                    }
                }
            }

            if (le[0] > -1 && le != leftExtremum) {
                // now check the left extremum
                var ld = leftExtremum ? le[0] - leftExtremum[0] : depth + 1;
                if (ld > depth)
                    extrema[le[0]] = le[1];
                else if (ld > 1) {
                    // they are not suppose to be together
                    if (null == ldf)
                        ldf = leftExtremum ? Math.abs(leftExtremum[1] - le[1]) - deviation * mintick : 1;
                    if (ldf > 0)
                        extrema[le[0]] = le[1];
                }
            }
            if (re[0] > -1  && re != rightExtremum && (le[0] == -1 || re[0] != le[0])) {
                var rd = rightExtremum ? re[0] - rightExtremum[0] : depth + 1;
                if (rd > depth)
                    extrema[re[0]] = re[1];
                else if (rd > 1) {
                    if (null == rdf)
                        rdf = rightExtremum ? Math.abs(rightExtremum[1] - re[1]) - deviation * mintick : 1;
                    if (rdf > 0)
                        extrema[re[0]] = re[1];
                }
            }
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