const main = require("./lib/replace");
const ThumbhashCache = require("./lib/cache");
const { readFileSync } = require("fs")
const { join } = require("path");

const log = hexo.log;

// 获取环境变量名，默认为 'CI'
const envName = hexo.config.bitiful_toolkit?.env_name || 'CI';

if (!hexo.config.bitiful_toolkit || !hexo.config.bitiful_toolkit.enable || process.env[envName] !== 'true') {
    // 本地测试环境不启用，省点米；在cicd pipeline里设置对应环境变量为 true 的话才执行
    log.info("[bitiful_toolkit] Skip Image Processing...");
    return;
}

// 初始化缓存实例
let cacheInstance = null;
if (hexo.config.bitiful_toolkit.cache && hexo.config.bitiful_toolkit.cache.enable) {
    cacheInstance = new ThumbhashCache({
        ...hexo.config.bitiful_toolkit.cache,
        github_token: process.env.GITHUB_TOKEN || hexo.config.bitiful_toolkit.cache.github_token
    });
    global.bitifulCacheInstance = cacheInstance;

    // 在生成开始前下载缓存，优先级设置为8，确保在大多数操作之前执行
    hexo.extend.filter.register('before_generate', async function () {
        log.info("[bitiful_toolkit] Initializing thumbhash cache...");

        // 尝试下载GitHub Gist缓存
        await cacheInstance.downloadCacheFromGist();

        const stats = cacheInstance.getStats();
        log.info(`[bitiful_toolkit] Cache initialized with ${stats.totalItems} items`);
    }, 8);

    // 在生成结束后上传缓存
    hexo.extend.filter.register('after_generate', async function () {
        if (cacheInstance) {
            const stats = cacheInstance.getStats();
            log.info(`[bitiful_toolkit] Processing complete, cache has ${stats.totalItems} items`);

            // 如果有更新，上传到GitHub Gist
            if (stats.isDirty) {
                log.info("[bitiful_toolkit] Uploading updated cache to GitHub Gist...");
                await cacheInstance.uploadCacheToGist();
            } else {
                log.info("[bitiful_toolkit] No cache updates, skipping upload");
            }
        }
    });
}

if (hexo.config.bitiful_toolkit.inject_css) {
    // 将style/progressive_image注入到head
    hexo.extend.generator.register("bitiful_assets", () => {
        const progressiveCSS = readFileSync(join(__dirname, "style/progressive_image.css"), "utf-8");
        return [
            {
                path: "css/progressive_image.css",
                data: () => progressiveCSS
            }
        ];
    });
    hexo.extend.injector.register("head_end", () => `<link rel="stylesheet" href="${hexo.config.root}css/progressive_image.css">`);
}

if (hexo.config.bitiful_toolkit.all) {
    log.info("[bitiful_toolkit] process all image");
    hexo.extend.filter.register(
        "after_render:html", async function (html) {
            log.info("html: ", html);
            html = await main(html, hexo.config.bitiful_toolkit);
            return html;
        }, 15
    );
} else {
    log.info("[bitiful_toolkit] process post images");
    hexo.extend.filter.register(
        "before_post_render", async function (data) {
            data.content = await main(data.content, hexo.config.bitiful_toolkit);
            return data;
        }, 15
    );
}
