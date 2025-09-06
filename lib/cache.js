const fs = require('fs');
const path = require('path');

class ThumbhashCache {
    constructor(config = {}) {
        this.config = {
            enable: false,
            cache_file: '.thumbcache.json',
            hexo_root: process.cwd(), // Hexo 根目录
            cache_key_type: 'img_src', // 'img_src' 或 'img_filename'
            ...config
        };
        this.cache = {};
        this.isDirty = false; // 标记缓存是否有更新
        this.cacheFilePath = path.join(this.config.hexo_root, this.config.cache_file);

        // 统计信息
        this.stats = {
            apiRequests: 0,
            cacheHits: 0
        };
    }

    // 生成缓存键
    generateCacheKey(imageUrl) {
        if (this.config.cache_key_type === 'img_filename') {
            // 使用文件名作为键
            const urlObj = new URL(imageUrl);
            return path.basename(urlObj.pathname);
        } else {
            // 默认使用完整URL作为键
            return imageUrl;
        }
    }

    // 从本地文件加载缓存
    loadCacheFromFile() {
        try {
            console.log('[BITIFUL] Loading cache from local file...');

            if (fs.existsSync(this.cacheFilePath)) {
                const cacheContent = fs.readFileSync(this.cacheFilePath, 'utf8');
                this.cache = JSON.parse(cacheContent || '{}');
                console.log(`[BITIFUL] Cache loaded from ${this.cacheFilePath}, ${Object.keys(this.cache).length} items`);
            } else {
                console.log('[BITIFUL] Cache file not found, starting with empty cache');
                this.cache = {};
            }
            return true;
        } catch (error) {
            console.warn('[BITIFUL] Failed to load cache from file:', error.message);
            this.cache = {};
            return false;
        }
    }

    // 保存缓存到本地文件
    async saveCacheToFile() {
        if (!this.config.enable || !this.isDirty) {
            console.log('[BITIFUL] Skipping cache save: disabled or no changes');
            return false;
        }

        try {
            console.log('[BITIFUL] Saving cache to local file...');

            const cacheContent = JSON.stringify(this.cache, null, 2);

            // 确保目录存在
            const cacheDir = path.dirname(this.cacheFilePath);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            fs.writeFileSync(this.cacheFilePath, cacheContent, 'utf8');

            console.log(`[BITIFUL] Cache saved to ${this.cacheFilePath}, ${Object.keys(this.cache).length} items`);
            this.isDirty = false;
            return true;
        } catch (error) {
            console.warn('[BITIFUL] Failed to save cache to file:', error.message);
            return false;
        }
    }

    // 获取缓存的data URL
    getCachedDataURL(imageUrl) {
        const cacheKey = this.generateCacheKey(imageUrl);
        return this.cache[cacheKey] || null;
    }

    // 设置缓存项
    setCachedDataURL(imageUrl, dataURL) {
        const cacheKey = this.generateCacheKey(imageUrl);
        if (dataURL && this.cache[cacheKey] !== dataURL) {
            this.cache[cacheKey] = dataURL;
            this.isDirty = true;
        }
    }

    // 重置统计信息
    resetStats() {
        this.stats = {
            apiRequests: 0,
            cacheHits: 0
        };
    }

    // 增加API请求数量
    incrementApiRequests() {
        this.stats.apiRequests++;
    }

    // 增加缓存命中数量
    incrementCacheHits() {
        this.stats.cacheHits++;
    }

    // 获取缓存统计信息
    getStats() {
        const totalRequests = this.stats.apiRequests + this.stats.cacheHits;
        return {
            totalItems: Object.keys(this.cache).length,
            isDirty: this.isDirty,
            cacheEnabled: this.config.enable,
            ...this.stats,
            totalRequests,
            cacheHitRate: totalRequests > 0 ? ((this.stats.cacheHits / totalRequests) * 100).toFixed(1) : 0
        };
    }
}

module.exports = ThumbhashCache;
