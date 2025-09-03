const main = require("./lib/replace");
const { readFileSync } = require("fs")
const { join } = require("path");

const log = hexo.log;

if (!hexo.config.bitiful_toolkit || !hexo.config.bitiful_toolkit.enable || process.env.CI !== 'true') {
    // 本地测试环境不启用，省点米；在cicd pipeline里设置env.CI = true的话才执行
    log.info("[bitiful_toolkit] Skip Image Processing...");
    return;
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
        "after_render:html", function (html) {
            html = main(html, hexo.config.bitiful_toolkit);
            return html;
        }, 15
    );
} else {
    log.info("[bitiful_toolkit] process post images");
    hexo.extend.filter.register(
        "after_post_render", function (data) {
            data.content = main(data.content, hexo.config.bitiful_toolkit);
            return data;
        }, 15
    );
}
