const fs = require("node:fs/promises");
const path = require("node:path");

class ThumbhashCache {
	constructor(config = {}) {
		this.config = {
			cache_file: "thumbcache.json",
			hexo_root: process.cwd(), // Hexo 根目录
			...config,
		};
		this.cache = {};
		this.hasUpdated = false;
		this.cacheFilePath = path.join(
			this.config.hexo_root,
			this.config.cache_file,
		);

		// 统计信息
		this.stats = {
			apiRequests: 0,
			cacheHits: 0,
		};
	}

	// 从本地文件加载缓存
	async loadCacheFromFile() {
		try {
			console.log("[BITIFUL] Loading cache from local file...");

			if (
				await fs
					.access(this.cacheFilePath)
					.then(() => true)
					.catch(() => false)
			) {
				const cacheContent = await fs.readFile(this.cacheFilePath, "utf8");
				this.cache = JSON.parse(cacheContent || "{}");
				console.log(
					`[BITIFUL] Cache loaded from ${this.cacheFilePath}, ${Object.keys(this.cache).length} items`,
				);
			} else {
				console.log(
					"[BITIFUL] Cache file not found, starting with empty cache",
				);
				this.cache = {};
			}
			return true;
		} catch (error) {
			console.warn("[BITIFUL] Failed to load cache from file:", error.message);
			this.cache = {};
			return false;
		}
	}

	// 保存缓存到本地文件
	async saveCacheToFile() {
		if (!this.config.enable || !this.hasUpdated) {
			console.log("[BITIFUL] Skipping cache save: disabled or no changes");
			return false;
		}

		try {
			console.log("[BITIFUL] Saving cache to local file...");
			const cacheContent = JSON.stringify(this.cache, null, 2);
			await fs.writeFile(this.cacheFilePath, cacheContent, "utf8");
			console.log(
				`[BITIFUL] Cache saved to ${this.cacheFilePath}, ${Object.keys(this.cache).length} items`,
			);
			this.hasUpdated = false;
			return true;
		} catch (error) {
			console.warn("[BITIFUL] Failed to save cache to file:", error.message);
			return false;
		}
	}

	// 获取缓存的data URL
	getCachedDataURL(imageUrl) {
		if (this.cache[imageUrl]) {
			this.stats.cacheHits++;
			const value = this.cache[imageUrl];
			// 向后兼容：如果旧格式直接是字符串，则直接返回
			if (typeof value === "string") return value;
			// 新格式为对象
			if (value && typeof value === "object") return value.dataURL || null;
			return null;
		}
		this.stats.apiRequests++;
		return null;
	}

	// 获取缓存的尺寸信息
	getCachedDimensions(imageUrl) {
		const entry = this.cache[imageUrl];
		if (!entry) {
			this.stats.apiRequests++;
			return null;
		}
		this.stats.cacheHits++;
		if (
			typeof entry === "object" &&
			Number.isFinite(entry?.width) &&
			Number.isFinite(entry?.height)
		) {
			return { width: entry.width, height: entry.height };
		}
		return null;
	}

	// 设置缓存项
	setCachedDataURL(imageUrl, dataURL) {
		if (!dataURL) return;
		const prev = this.cache[imageUrl];
		if (typeof prev === "object") {
			if (prev.dataURL !== dataURL) {
				this.cache[imageUrl] = { ...prev, dataURL };
				this.hasUpdated = true;
			}
		} else {
			// 兼容旧格式：如果是字符串或不存在，则写为新对象格式
			if (prev !== dataURL) {
				this.cache[imageUrl] = { dataURL };
				this.hasUpdated = true;
			}
		}
	}

	// 设置尺寸缓存
	setCachedDimensions(imageUrl, width, height) {
		if (!Number.isFinite(width) || !Number.isFinite(height)) return;
		const prev = this.cache[imageUrl];
		if (prev.width !== width || prev.height !== height) {
			this.cache[imageUrl] = { ...prev, width, height };
			this.hasUpdated = true;
		}
	}

	// 获取缓存统计信息
	getStats() {
		const totalRequests = this.stats.apiRequests + this.stats.cacheHits;
		return {
			totalItems: Object.keys(this.cache).length,
			isDirty: this.hasUpdated,
			cacheEnabled: this.config.enable,
			...this.stats,
			totalRequests,
			cacheHitRate:
				totalRequests > 0
					? ((this.stats.cacheHits / totalRequests) * 100).toFixed(1)
					: 0,
		};
	}
}

module.exports = ThumbhashCache;
