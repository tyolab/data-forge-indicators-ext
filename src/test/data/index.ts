import * as dataForge from 'data-forge'
import 'data-forge-fs';
import * as dataForgeFs from '../../utils/fs';

export let data = [
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
    [29, 22.40],
    [30, 22.92]
];

export let data2 = [
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
    [29, 22.40],
    [30, 22.92],
    [31, 22.74],
    [32, 22.61],
    [33, 22.70],
    [34, 22.68],
    [35, 22.66],
    [36, 22.67],
    [37, 22.66],
    [38, 22.65],
    [39, 22.65],
    [40, 22.64],
    [41, 22.64],
    [42, 22.63],
    [43, 22.63],
    [44, 22.62],
    [45, 22.62],
    [46, 22.61],
    [47, 22.61],
    [48, 22.60],
    [49, 22.60],
];

function parseThisFloat(v: string): number {
    return parseFloat(v.replaceAll(',', ''));
}

let dataframe = dataForge.readFileSync(__dirname + "/gold.csv")
.parseCSV();

let this_dataframe = dataframe
.renameSeries({'"Date"': 'time'})
// .renameSeries({'Price': 'close'})
// .renameSeries({'High': 'high'})
// .renameSeries({'Open': 'open'})
// .renameSeries({'Low': 'low'})
.withSeries('open', dataframe.deflate(day => parseThisFloat(day.Open)))
.withSeries('high', dataframe.deflate(day => parseThisFloat(day.High)))
.withSeries('close', dataframe.deflate(day => parseThisFloat(day.Price)))
.withSeries('low', dataframe.deflate(day => parseThisFloat(day.Low)))
.dropSeries(['Open', 'High', 'Price', 'Low'])
.parseDates('time');

let data_array = this_dataframe.toArray().sort((b1: any, b2: any) => {
    return b1.time.getTime() - b2.time.getTime();
});
export let gold_dataframe = new dataForge.DataFrame(data_array);

export let load_gold_ticks_data = async () => {
    let dataframe = await dataForgeFs.readGzipFile(__dirname + "/gold-ticks.txt.gz")
    .parseTicksData({columnNames: ['symbol', "time", "open", "high", "low", "close", "volume"]}); 

    let this_dataframe = dataframe
    // .renameSeries({'"Date"': 'time'})
    // .withSeries('open', dataframe.deflate(day => parseThisFloat(day.Open)))
    // .withSeries('high', dataframe.deflate(day => parseThisFloat(day.High)))
    // .withSeries('close', dataframe.deflate(day => parseThisFloat(day.Price)))
    // .withSeries('low', dataframe.deflate(day => parseThisFloat(day.Low)))
    // .dropSeries(['Open', 'High', 'Price', 'Low'])
    // .parseDates('time')
    ;
    return this_dataframe;
}