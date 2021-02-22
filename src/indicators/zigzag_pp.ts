import { assert } from 'chai';
import { ISeries, Series } from 'data-forge';

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

    let extrema: any = [];
    let stack: any = [];
    let self = this;

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

            extrema.push(minPair);
            extrema.push(maxPair);

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
            let diff = Math.abs(maxPair[1] - minPair[1]);
            // not enough bars we need to marge them to the neibouring window
            // if (maxPair[0] - minPair[0] < depth)  {

            // }
            // else {
                e2 = minPair[0] + 1;
                e3 = maxPair[0] - 1;
            // }

            //if (minPair[0] > depth) {
                s1 = start;
                e1 = minPair[0] - 1;
            //}

            //if (end - maxPair[0] > depth) {
                s3 = maxPair[0] + 1;
                e3 = end;
                
            let higher = maxPair[0] > minPair[0];
            //}
                
            // if the midwindow is less than bars of depth, it is ok, 
            //if (e1 > s1)
            if (direction == 0) {
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s1, e1],
                    extremum: [null, higher ? minPair : maxPair]
                });
                stack.push({
                    direction: higher ? 1 : -1,
                    window: [s2, e2],
                    extremum: [higher ? minPair : maxPair, higher ? maxPair : minPair, null]
                });
                stack.push({
                    direction: higher ? -1 : 1,
                    window: [s3, e3],
                    extremum: [higher ? maxPair : minPair, null]
                });
            }
            else if (direction == 1) {

            }
            else {
                
            }
        }

    }

    stackLoop(this, 0, this.count() - 1);

    while (stack.length > 0) {
        let todo = stack.shift();
        stackLoop(self.between(todo.window[0], todo.window[1]), todo.window[0], todo.window[1], todo.direction, todo.extremum);
    }

    return this.rollingWindow(depth)
        .select<[IndexT, number]>(window => [window.getIndex().last(), window.average()])
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
}

Series.prototype.zigzag_pp = zigzag_pp;