import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';

import { gold_dataframe } from '../data';

describe('bandwidth_e', () => {

    it('bandwidth_e', async function () {

       const df = gold_dataframe;

       const newseries = df.getSeries('close').bollinger_e(20, 2, 2);

       const bandwidth = newseries.bandwidth_e();

       console.log(bandwidth.count())
    });

});
