#!/usr/bin/env node
import { timestampToBlockNum } from '../lib.mjs'
import esMain from 'es-main';

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

async function main() {
    const arg = process.argv[2];
    const epoch = Number(arg)
    const ts = isNaN(epoch) ? new Date(arg) : new Date(epoch);
    if (!(isValidDate(ts))) {
        console.error('Please pass a valid ISO date object, or a unix epoch number (in ms).');
        process.exit(1);
    }

    const blockNum = await timestampToBlockNum(ts);
    if (blockNum === null) {
        console.error(`Estimated block number for ${ts} is null.`);
        process.exit(1);
    } else {
        console.log(blockNum);
    }
}

if (esMain(import.meta)) {
    await main();
}
