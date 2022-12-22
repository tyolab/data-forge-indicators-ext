
import * as dataForge from 'data-forge';
import * as fs from 'fs';
import * as zlib from 'zlib'
import * as readline from 'readline'
// @ts-ignore
import PapaParse from 'papaparse';

import { ReadLineOptions } from 'readline';
import { IDataFrame, DataFrame, ICSVOptions } from 'data-forge';

export interface ITickCSVOptions extends ICSVOptions {
    offset?: number;
}

export interface ISyncFileReader {
    parseTicksData (config?: ITickCSVOptions): Promise<IDataFrame<any, any>>;
}

class SyncFileReader implements ISyncFileReader {

    filename: string;

    constructor(filename: string) {
        this.filename = filename;
    }

    parseTicksData(config?: ITickCSVOptions): Promise<IDataFrame<any, any>> {

        async function parseData(filename: string, config?: ITickCSVOptions): Promise<IDataFrame<any, any>> {
            let stream: NodeJS.ReadableStream = fs.createReadStream(filename);
            if(/\.gz$/i.test(filename)) {
                stream = stream.pipe(zlib.createGunzip())
            }
            let options: ReadLineOptions = {
                input: stream,
            }
            let lineReader: any = readline.createInterface(options);
            
            // if using papaparse, use the config object to specify the delimiter
            // rows = rows.map(row => {
            //     return row.map(cell => isString(cell) ? cell.trim() : cell); // Trim each cell that is still a string.
            // });
            let rows: string[][] = [];
            for await (const line of lineReader) {
                let row = line.split(',').map((cell: string) => typeof (cell) === 'string' ? cell.trim() : cell);
                rows.push(row);
            }
        
            if (rows.length === 0) {
                return new DataFrame<number, any>();
            }
        
            let columnNames;
            let offset = 0;
            if (config && config.columnNames) {
                columnNames = config.columnNames;
            }
            else {
                if (config && config.offset)
                    offset = config.offset;
                else
                    offset = 1;
            }
            while (offset > 0) {
                rows.shift();
                offset--;
            }
        
            return new DataFrame<number, any>({
                rows: rows,
                columnNames: columnNames,
            });
        }

        return parseData(this.filename, config);
    }
}

declare module "data-forge" {
    export function readGzipFile(filename: string): ISyncFileReader
}

export function readGzipFile(filename: string): ISyncFileReader {
    return new SyncFileReader(filename);
}

(dataForge as any).readGzipFile = readGzipFile;
