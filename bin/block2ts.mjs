#!/usr/bin/env node
import { blockNumToTimestamp } from '../lib.mjs'
import esMain from 'es-main';

async function main() {
    const blockNum = Number(process.argv[2]);
    if (!blockNum) {
        console.error('Please pass a valid block number.');
        process.exit(1);
    }

    const ts = await blockNumToTimestamp(blockNum);
    console.log(ts);
}

if (esMain(import.meta)) {
    await main();
}
