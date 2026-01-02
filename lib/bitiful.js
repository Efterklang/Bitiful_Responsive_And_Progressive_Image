const { thumbHashToDataURL } = require("./thumbhash.js");

function getBaseUrl(url) {
	return url.split("?")[0];
}

/**
 * 封装统一的 Fetch 逻辑
 */
async function fetchBitiful(url, format) {
	const targetUrl = `${getBaseUrl(url)}?fmt=${format}`;
	const response = await fetch(targetUrl);
	if (!response.ok)
		throw new Error(`Fetch ${format} failed: ${response.statusText}`);
	return response;
}

/**
 * 获取图片尺寸
 */
async function getDimension(imageUrl, cache = null) {
	try {
		if (cache) {
			const cached = cache.getCachedDimensions(imageUrl);
			if (cached) return cached;
		}

		const fileName = getBaseUrl(imageUrl).split("/").pop();
		console.log(`[BITIFUL] ❌ ${fileName} 尺寸缓存未命中`);

		const response = await fetchBitiful(imageUrl, "info");
		const { ImageWidth: width, ImageHeight: height } = await response.json();

		if (typeof width === "number" && typeof height === "number") {
			const result = { width, height };
			cache?.setCachedDimensions(imageUrl, width, height);
			return result;
		}
		return null;
	} catch (error) {
		console.warn(`[BITIFUL] Dimension error for ${imageUrl}:`, error.message);
		return null;
	}
}

/**
 * 获取 Thumbhash DataURL
 */
async function getDataURL(imageUrl, cache = null) {
	try {
		if (cache) {
			const cached = cache.getCachedDataURL(imageUrl);
			if (cached) return cached;
		}

		const fileName = getBaseUrl(imageUrl).split("/").pop();
		console.log(`[BITIFUL] ❌ ${fileName} Hash缓存未命中`);

		const response = await fetchBitiful(imageUrl, "thumbhash");
		const base64String = await response.text();

		// 使用 Node.js 的 Buffer 替代原有的循环解码
		const thumbhashBytes = new Uint8Array(
			Buffer.from(base64String.trim(), "base64"),
		);
		const dataURL = thumbHashToDataURL(thumbhashBytes);

		if (dataURL && cache) {
			cache.setCachedDataURL(imageUrl, dataURL);
		}

		return dataURL;
	} catch (error) {
		console.warn(`[BITIFUL] Thumbhash error for ${imageUrl}:`, error.message);
		return null;
	}
}

module.exports = { getDimension, getDataURL };
