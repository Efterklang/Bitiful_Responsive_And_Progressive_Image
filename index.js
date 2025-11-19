const main = require("./lib/replace");
const ThumbhashCache = require("./lib/cache");
const { readFileSync } = require("fs")
const { join } = require("path");

const log = hexo.log;

// 获取环境变量名，默认为 'CI'
const envName = hexo.config.bitiful_toolkit?.env_name || 'CI';

if (!hexo.config.bitiful_toolkit || !hexo.config.bitiful_toolkit.enable || process.env[envName] !== 'true') {
  // 本地测试环境不启用，省点米；在cicd pipeline里设置对应环境变量为 true 的话才执行
  return;
}

// 初始化缓存实例
let cacheInstance = null;
if (hexo.config.bitiful_toolkit.cache && hexo.config.bitiful_toolkit.cache.enable) {
  cacheInstance = new ThumbhashCache({
    ...hexo.config.bitiful_toolkit.cache,
    hexo_root: hexo.base_dir // 使用hexo的根目录
  });
  global.bitifulCacheInstance = cacheInstance;

  // 在生成开始前加载缓存，优先级设置为8，确保在大多数操作之前执行
  hexo.extend.filter.register('before_generate', async function () {
    log.info("[BITIFUL] Initializing thumbhash cache...");

    // 重置统计信息
    cacheInstance.resetStats();

    // 从本地文件加载缓存
    cacheInstance.loadCacheFromFile();

    const stats = cacheInstance.getStats();
    log.info(`[BITIFUL] Cache initialized with ${stats.totalItems} items`);
  }, 8);

  // 在生成结束后保存缓存
  hexo.extend.filter.register('after_generate', async function () {
    if (cacheInstance) {
      const stats = cacheInstance.getStats();

      // 输出详细的统计信息
      log.info(`[BITIFUL] 图片处理完成统计:`);
      log.info(`[BITIFUL] - 总请求数: ${stats.totalRequests}`);
      log.info(`[BITIFUL] - 实际API请求数: ${stats.apiRequests}`);
      log.info(`[BITIFUL] - 缓存命中数: ${stats.cacheHits}`);
      log.info(`[BITIFUL] - 缓存命中率: ${stats.cacheHitRate}%`);
      log.info(`[BITIFUL] - 缓存总条目数: ${stats.totalItems}`);

      // 如果有更新，保存到本地文件
      if (stats.isDirty) {
        log.info("[BITIFUL] Saving updated cache to local file...");
        await cacheInstance.saveCacheToFile();
      } else {
        log.info("[BITIFUL] No cache updates, skipping save");
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
  log.info("[BITIFUL] process all image");
  hexo.extend.filter.register(
    "after_render:html", async function (html) {
      log.info("html: ", html);
      html = await main(html, hexo.config.bitiful_toolkit);
      return html;
    }, 15
  );
} else {
  log.info("[BITIFUL] process post images");
  hexo.extend.filter.register(
    "before_post_render", async function (data) {
      data.content = await main(data.content, hexo.config.bitiful_toolkit);
      return data;
    }, 15
  );
}
