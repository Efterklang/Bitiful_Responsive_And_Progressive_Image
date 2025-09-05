const { Octokit } = require('@octokit/core');

class ThumbhashCache {
    constructor(config = {}) {
        this.config = {
            enable: false,
            gist_id: null,
            github_token: null,
            cache_file: 'thumbhash_cache.json',
            ...config
        };
        this.cache = {};
        this.isDirty = false; // 标记缓存是否有更新
        this.octokit = null; // Octokit实例
    }

    // 初始化Octokit实例
    initOctokit() {
        if (!this.octokit && this.config.github_token) {
            this.octokit = new Octokit({
                auth: this.config.github_token
            });
        }
        return this.octokit;
    }

    // 从GitHub Gist下载缓存文件
    async downloadCacheFromGist() {
        try {
            console.log('[bitiful_toolkit] Downloading cache from GitHub Gist...');

            const octokit = this.initOctokit();

            const response = await octokit.request('GET /gists/{gist_id}', {
                gist_id: this.config.gist_id,
            });

            const gistData = response.data;
            const cacheFile = gistData.files[this.config.cache_file];
            this.cache = JSON.parse(cacheFile.content || '{}');
        } catch (error) {
            console.warn('[bitiful_toolkit] Failed to download cache from gist:', error.message);
            return false;
        }
    }

    // 上传缓存到GitHub Gist
    async uploadCacheToGist() {
        if (!this.config.enable || !this.config.gist_id || !this.config.github_token || !this.isDirty) {
            console.log('[bitiful_toolkit] Skipping gist upload: disabled, missing config, or no changes');
            return false;
        }

        try {
            console.log('[bitiful_toolkit] Uploading cache to GitHub Gist...');

            const octokit = this.initOctokit();
            if (!octokit) {
                throw new Error('Failed to initialize Octokit');
            }

            const cacheContent = JSON.stringify(this.cache, null, 2);

            const response = await octokit.request('PATCH /gists/{gist_id}', {
                gist_id: this.config.gist_id,
                files: {
                    [this.config.cache_file]: {
                        content: cacheContent
                    }
                },
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (response.status !== 200) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            console.log(`[bitiful_toolkit] Cache uploaded to gist, ${Object.keys(this.cache).length} items`);
            this.isDirty = false;
            return true;
        } catch (error) {
            console.warn('[bitiful_toolkit] Failed to upload cache to gist:', error.message);
            return false;
        }
    }

    // 获取缓存的data URL
    getCachedDataURL(imageUrl) {
        return this.cache[imageUrl] || null;
    }

    // 设置缓存项
    setCachedDataURL(imageUrl, dataURL) {
        if (dataURL && this.cache[imageUrl] !== dataURL) {
            this.cache[imageUrl] = dataURL;
            this.isDirty = true;
        }
    }

    // 获取缓存统计信息
    getStats() {
        return {
            totalItems: Object.keys(this.cache).length,
            isDirty: this.isDirty,
            cacheEnabled: this.config.enable
        };
    }
}

module.exports = ThumbhashCache;
