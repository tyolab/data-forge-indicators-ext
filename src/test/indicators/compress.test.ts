import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import 'data-forge-fs';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';

import "../../index";
import * as path from 'path';

import { readJSON, writeJSON } from './test-utils';
import { TimeFrame } from '../../indicators/compress';

describe('compress', () => {

    it('compress', async function () {
        const origdf = await dataForge.readFileSync("./src/test/data/STW.csv")
            .parseCSV({ dynamicTyping: true });
            
        const df = origdf
            .withSeries('time', origdf.getSeries('date').select(d => {
                var parts = d.split("/");
                return new Date(parseInt(parts[2], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[0], 10));
            }))
            //.parseDates('time', "DD/MM/YYYY"); // didn't work
            ;
        
        const df2 = df.compress(TimeFrame.Week);
        expect(df2.count()).to.equal(52);
        
        const df3 = df2.compress(TimeFrame.Month);
        expect(df3.count()).to.equal(12);
    });

});
