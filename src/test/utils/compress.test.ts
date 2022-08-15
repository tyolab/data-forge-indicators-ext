import { assert, expect } from 'chai';
import 'mocha';
import 'data-forge-fs';
import "../../index";
import * as path from 'path';

import { gold_dataframe } from '../data';
import { TimeFrame } from '../../utils/compress';

describe('compress', () => {

    it('compress', async function () {
        const df = gold_dataframe;
            
        // const df = origdf
        //     .withSeries('time', origdf.getSeries('date').select(d => {
        //         var parts = d.split("/");
        //         return new Date(parseInt(parts[2], 10),
        //         parseInt(parts[1], 10) - 1,
        //         parseInt(parts[0], 10));
        //     }))
        //     .parseDates('time', "DD/MM/YYYY"); // didn't work
        //     ;
        
        const df2 = df.compress(TimeFrame.Week);
        const series2 = df2.getSeries('close');

        expect(df2.count()).to.equal(53);

        const df3 = df.compress(TimeFrame.Month);
        expect(df3.count()).to.equal(12);
    });

});
