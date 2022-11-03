import { pathToFileURL} from 'node:url';
import { Client } from 'splinterlands-dhive-sl';

const estimatedBlockSpeed = 3000

/**
 * @return {Client}
 */
function getClient(){
	return new Client();
}

/**
 * @param {Client} client
 */
function killClient(client){
	return client.destroy();
}

/**
 * A tuple representing a current point in time
 * @typedef { { blockNum: number, timestamp: Date} } Reference
 */

/**
 * @param {Client} client
 * @return {Promise<Reference>}
 */
async function getHead(client) {
	const blockNum = await client.blockchain.getCurrentBlockNum('irreversible');
	const header = await client.database.getBlockHeader(blockNum);
	const timestamp = new Date(`${header.timestamp}Z`);
	return { blockNum, timestamp };
}

/**
 * @param {Client} client
 * @param {number} blockNum
 * @return {Promise<Date | null>}
 */
async function getPastTimestamp(client, blockNum) {
	const header = await client.database.getBlockHeader(blockNum);
	if (header === null) {
		return null;
	}
	return new Date(`${header.timestamp}Z`);
}
/**
 * @param {Client} client
 * @param {number} blockNum
 * @param {Reference} reference
 * @return {Date}
 */
function estimateFutureTimestamp(client, blockNum, reference) {
	const difference = blockNum - reference.blockNum;
	const predictedMs = estimatedBlockSpeed * difference;
	return new Date(reference.timestamp.valueOf() + predictedMs);
}


/**
 *
 * @param {Date} t1
 * @param {Date} t2
 * @return {number} Integer expected block number difference
 */
function diff(t1, t2) {
	return (t1 - t2) / estimatedBlockSpeed;
}

/**
 * @param {Client} client
 * @param {Date} timestamp
 * @param {Reference} reference
 * @return {Promise<number | null>} Estimated earliest block number that exceeded `date`, or null
 */
async function getPastBlockNum(client, timestamp, reference) {
	const blockNum = reference.blockNum - diff(reference.timestamp, timestamp);
	const revisedTimestamp = await getPastTimestamp(client, blockNum);

	if (revisedTimestamp === null) {
		return null;
	}

	if (revisedTimestamp < timestamp) {
		return blockNum + diff(timestamp, revisedTimestamp);
	}
	return blockNum;
}

/**
 * @param {Client} client
 * @param {Date} timestamp
 * @param {Reference} reference
 * @return {number} Estimated earliest block number that exceeded `date`
 */
function estimateFutureBlockNum(client, timestamp, reference) {
	return reference.blockNum + diff(timestamp, reference.timestamp);
}

/**
 * @callback ClientReferenceCallback
 * @param {Client} client
 * @param {Reference} reference
 */

/**
 *
 * @param {ClientReferenceCallback} callback
 */
async function withClientReference(callback) {
	let client
	try {
		client = getClient();
		const reference = await getHead(client);
		return await callback(client, reference);
	} finally {
		client && killClient(client);
	}
}

/**
 * @param {number} blockNum
 * @return {Promise<Date>}
 */
export async function blockNumToTimestamp(blockNum) {
	const timestamp = await withClientReference((client, reference) => {
		if (blockNum > reference.blockNum) {
			return estimateFutureTimestamp(client, blockNum, reference);
		} else if (blockNum < reference.blockNum) {
			return getPastTimestamp(client, blockNum);
		} else {
			return reference.timestamp;
		}
	});
	return timestamp;
}

/**
 * @param {Date} timestamp
 * @return {Promise<number | null>}
 */
export async function timestampToBlockNum(timestamp) {
	const blockNum = await withClientReference((client, reference) => {
		if (timestamp > reference.timestamp) {
			return estimateFutureBlockNum(client, timestamp, reference);
		} else if (timestamp < reference.timestamp) {
			return getPastBlockNum(client, timestamp, reference);
		} else {
			// Extremely unlikely for this to happen
			return reference.blockNum;
		}
	});
	return blockNum;
}
