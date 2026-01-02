const { thumbHashToDataURL } = require("./thumbhash.js");
// biome-ignore lint/correctness/noUnusedVariables: for type annotation
const ThumbhashCache = require("./cache.js");

/**
 *
 * @param {string} imageUrl
 * @param {ThumbhashCache} cache
 * @returns
 */
async function getDimension(imageUrl, cache = null) {
	try {
		// 首先检查缓存（尺寸）
		if (cache) {
			const cachedDims = cache.getCachedDimensions(imageUrl);
			if (cachedDims) return cachedDims;
		}

		console.log(
			`[BITIFUL] ❌ ${imageUrl.split("/").pop().split("?")[0]} 尺寸缓存未命中，正在获取...`,
		);

		// json里 "ImageWidth": 1200, "ImageHeight": 1800,
		const infoUrl = `${imageUrl.split("?")[0]}?fmt=info`;
		const response = await fetch(infoUrl);
		const json = await response.json();

		const width = json.ImageWidth;
		const height = json.ImageHeight;

		if (Number.isFinite(width) && Number.isFinite(height)) {
			if (cache) {
				cache.setCachedDimensions(imageUrl, Number(width), Number(height));
			}
			return { width: Number(width), height: Number(height) };
		}

		return null;
	} catch (error) {
		console.warn(
			`[BITIFUL] Failed to get dimensions for ${imageUrl}:`,
			error.message,
		);
		return null;
	}
}

/**
 *
 * @param {string} imageUrl
 * @param {ThumbhashCache|null} cache
 * @returns {Promise<string|null>}
 */
async function getDataURL(imageUrl, cache = null) {
	try {
		// 首先检查缓存
		if (cache) {
			const cachedDataURL = cache.getCachedDataURL(imageUrl);
			if (cachedDataURL) {
				return cachedDataURL;
			}
		}

		console.log(
			`[BITIFUL] ❌ ${imageUrl.split("/").pop().split("?")[0]} 缓存未命中，正在获取...`,
		);

		// 缤纷云返回的是 thumbhash base64
		const thumbhashUrl = `${imageUrl.split("?")[0]}?fmt=thumbhash`;
		const response = await fetch(thumbhashUrl);

		const thumbhashString = await response.text();
		const thumbhashBytes = decodeBase64ToArray(thumbhashString.trim());
		const dataURL = thumbHashToDataURL(thumbhashBytes);

		// 存入缓存
		if (cache && dataURL) {
			console.log(`[BITIFUL] 将${imageUrl}及其对应的dataUrl写入缓存`);
			cache.setCachedDataURL(imageUrl, dataURL);
		}

		return dataURL;
	} catch (error) {
		console.warn("Failed to generate thumbhash:", error.message);
		return null;
	}
}

function decodeBase64ToArray(base64) {
	try {
		// 清理 base64 字符串
		const cleanBase64 = base64.replace(/\s/g, "");
		const binaryString = atob(cleanBase64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes;
	} catch (error) {
		throw new Error(`Base64 decode failed: ${error.message}`);
	}
}

module.exports = { getDimension, getDataURL };
