import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import 'data-forge-indicators';
import { Series } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';

describe('ema', () => {

    it('ema', async function () {

        let series = new Series({
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
                22.40]
        });

        const expectedEma = [
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
        ]


        // for last 10 days sma
        // window function acctually return a series of 3 windows in this case
        // let periodSeries: any = series.window(10, WhichIndex.Start).select(window => window.average());
        let periodSeries = series.take(10).average();
        let sma = periodSeries.toFixed(2); // .average();
        expect(sma).to.equal('22.22');

        const emaSeries = series.ema_e(10).bake();
        const emaSeries1 = series.ema(10).bake();

        // adding new value
        series.appendPair([30, 22.17]);
        const lastEma = '22.92';


        expect(1).to.equal(1);
    });

});
