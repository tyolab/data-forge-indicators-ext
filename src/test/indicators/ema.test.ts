import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import 'data-forge-indicators';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';

describe('ema', () => {

    it('ema', async function () {

        /** 
         * different way of creating a dataframe
        let df = new DataFrame({
            columnNames: ["pos", "value"],
            index: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
            values: [22.27,
                22.19,
                22.08,
                22.17,
                22.18,
                22.13,
                22.23,
                22.43,
                22.24,
                22.29,
                22.15,
                22.39,
                22.38,
                22.61,
                23.36,
                24.05,
                23.75,
                23.83,
                23.95,
                23.63,
                23.82,
                23.87,
                23.65,
                23.19,
                23.10,
                23.33,
                22.68,
                23.10,
                22.40
            ]
        });
        // let series = df.inflate(v =>)
        */

       let df = new DataFrame({
           columnNames: ["pos", "value"],
           rows: [
            [1, 22.27],
            [2, 22.19],
            [3, 22.08],
            [4, 22.17],
            [5, 22.18],
            [6, 22.13],
            [7, 22.23],
            [8, 22.43],
            [9, 22.24],
            [10, 22.29],
            [11, 22.15],
            [12, 22.39],
            [13, 22.38],
            [14, 22.61],
            [15, 23.36],
            [16, 24.05],
            [17, 23.75],
            [18, 23.83],
            [19, 23.95],
            [20, 23.63],
            [21, 23.82],
            [22, 23.87],
            [23, 23.65],
            [24, 23.19],
            [25, 23.10],
            [26, 23.33],
            [27, 22.68],
            [28, 23.10],
            [29, 22.40]
           ]
       });

        const expectedEmas = [
            '22.22',
            '22.21',
            '22.24',
            '22.27',
            '22.33',
            '22.52',
            '22.80',
            '22.97',
            '23.13',
            '23.28',
            '23.34',
            '23.43',
            '23.51',
            '23.54',
            '23.47',
            '23.40',
            '23.39',
            '23.26',
            '23.23',
            '23.08',          
        ];

        const newdf = df.setIndex('pos');

        const row = newdf.at(27);
        expect(row.value).to.equal(22.68);

        // for last 10 days sma
        // window function acctually return a series of 3 windows in this case
        // let periodSeries: any = series.window(10, WhichIndex.Start).select(window => window.average());

        let series = newdf.getSeries('value');
        let sma = series.take(10).average();
        let smaStr = sma.toFixed(2); // .average();
        expect(smaStr).to.equal('22.22');

        const emaSeries = series.ema_e(10).bake();
        const emarow = emaSeries.at(11);
        expect(emarow.toFixed(2)).to.equal('22.21');

        // adding new value
        const newSeries = series.appendPair([30, 22.17]).bake();
        const newEmaSeries = emaSeries.ema_update(30, 22.17, 10).bake();
        const lastEma = newEmaSeries.last();
        const expectedEma = '22.92'; expect(lastEma.toFixed(2)).to.equal(expectedEma);

        // const mergedSeries = series.skip(10).merge(newEmaSeries);
        // const zippedSeries = series.skip(10).zip(newEmaSeries);
        const emadf = df.withSeries('ema', newEmaSeries);
        const lastemarow = emadf.at(25);

       expect(lastemarow.ema.toFixed(2)).to.equal('23.40');
    });

});
