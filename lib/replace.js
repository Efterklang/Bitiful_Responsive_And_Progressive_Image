// 引入 thumbhash 库
const { thumbHashToDataURL } = require("./thumbhash")

// Base64 decode function
function decodeBase64ToArray(base64) {
    try {
        // 清理 base64 字符串
        const cleanBase64 = base64.replace(/\s/g, '');
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

// 获取 thumbhash 并转换为 data URL
async function getDataURL(imageUrl, cache = null) {
    file_name = imageUrl.split('/').pop().split('?')[0];
    try {
        // 首先检查缓存
        if (cache) {
            const cachedDataURL = cache.getCachedDataURL(imageUrl);
            if (cachedDataURL) {
                console.log(`[BITIFUL] ✅ ${file_name} 缓存命中`);
                // 统计缓存命中
                cache.incrementCacheHits();
                return cachedDataURL;
            }
        }

        console.log(`[BITIFUL] ❌ ${file_name} 缓存未命中，正在获取...`);

        // 统计实际请求
        if (cache) {
            cache.incrementApiRequests();
        }

        // 缤纷云返回的是 thumbhash base64
        const thumbhashUrl = `${imageUrl.split('?')[0]}?fmt=thumbhash`;
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
        console.warn('Failed to generate thumbhash:', error.message);
        return null;
    }
}

/**
 * 检查图片是否支持媒体处理，例如Bitiful支持thumbhash, Cloudflare不支持
 * @param {string} img_url
 * @param {Array<string>} supported_domains 支持媒体处理的域名列表,例如`["assets.vluv.space", "s3.bitiful.net", "bitiful.com"]`
 * @param {Array<string>} exclude_formats 不进行媒体处理的图片格式,例如`['svg', 'gif']`
 * @returns {boolean}
 */
function isImageSupported(img_url, supported_domains, exclude_formats) {
    const hasSupportedDomain = supported_domains.some(domain => img_url.includes(domain));
    const file_extension = img_url.split('.').pop().split('?')[0].toLowerCase();
    const hasSupportedExt = !exclude_formats.includes(file_extension);
    return hasSupportedDomain && hasSupportedExt;
}

/**
 * @param {string} img_link 例如`<img src="https://demo.bitiful.com/girl.jpeg" alt="">`
 * @param {string} img_src 例如`https://demo.bitiful.com/girl.jpeg`
 * @param {object} config user config in config.yaml
 * @param {boolean} shouldLazyLoad 是否添加loading="lazy"，默认前两张图不添加
 * @param {string|null} dataURL 例如`data:image/png;base64,iVBORw...`，未获取到则为null
 * @returns {string}
 */
function buildImageHTML(img_link, img_src, config, shouldLazyLoad, dataURL) {
    // 生成 srcset
    const srcset = config.srcset_widths
        .map(width => {
            const url = img_src.includes('?')
                ? `${img_src}&w=${width}`
                : `${img_src}?w=${width}`;
            return `${url} ${width}w`;
        })
        .join(', ');

    // 提取并清理原属性
    const cleanAttributes = img_link
        .replace(/<img\s+/, '')
        .replace(/\s*\/?>$/, '')
        .replace(/src="[^"]*"\s*/, '');

    // 构建主图片标签
    const imgTag = [
        `<img src="${img_src}" srcset="${srcset}"`,
        config.add_max_width ? `sizes="${config.max_widths}"` : '',
        shouldLazyLoad ? 'loading="lazy" decoding="async"' : '',
        `onload="this.classList.add('loaded')"`,
        cleanAttributes
    ].filter(Boolean).join(' ') + '>';

    const thumbhashPlaceHolder = `<img class="thumbhash-placeholder" src="${dataURL}">`;

    return dataURL ? `<div class="progressive_img_container">${imgTag}${thumbhashPlaceHolder}</div>` : imgTag;
}

const main = async (html_content, cfg = {}) => {
    const config = {
        srcset_widths: [200, 400, 600, 800, 1200, 2000, 3000],
        add_max_width: false,
        max_widths: '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px',
        enable_lazy_loading: true,
        lazy_skip_first: 2,
        supported_domains: ["assets.vluv.space", "s3.bitiful.net", "bitiful.com"],
        exclude_formats: ['svg', 'gif'],
        cache: {
            enable: false,
            ...cfg.cache
        },
        ...cfg  // 用户自定义配置覆盖上面的默认值
    };

    // 初始化缓存（如果启用）
    let cacheInstance = global.bitifulCacheInstance;

    const img_reg_exp = /<img[^>]+src=\"(.+?)\"[^>]*>/gm;
    const img_link_list = [...html_content.matchAll(img_reg_exp)];

    // 统计支持的图片数量
    const supportedImages = img_link_list.filter(([, img_link]) =>
        isImageSupported(img_link, config.supported_domains, config.exclude_formats)
    );

    const thumbhashResults = await Promise.all(
        img_link_list.map(([, img_link]) =>
            isImageSupported(img_link, config.supported_domains, config.exclude_formats) ? getDataURL(img_link, cacheInstance) : null
        )
    );

    let imageCount = 0;

    return html_content.replace(img_reg_exp, (img_link, img_src) => {
        if (!isImageSupported(img_src, config.supported_domains, config.exclude_formats)) {
            return img_link;
        }

        const shouldLazyLoad = config.enable_lazy_loading && ++imageCount > config.lazy_skip_first;
        const thumbhash = thumbhashResults[imageCount - 1];

        return buildImageHTML(img_link, img_src, config, shouldLazyLoad, thumbhash);
    });
}

module.exports = main;
