// 引入 thumbhash 库
const { thumbHashToDataURL } = require("./thumbhash")

// Base64 decode function
function decodeBase64ToArray(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// 获取 thumbhash 并转换为 data URL
async function getThumbhashDataURL(imageUrl) {
    try {
        // 缤纷云返回的是 thumbhash base64
        const thumbhashUrl = `${imageUrl.split('?')[0]}?fmt=thumbhash`;
        const response = await fetch(thumbhashUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const thumbhashString = await response.text();
        const thumbhashBytes = decodeBase64ToArray(thumbhashString.trim());
        const dataURL = thumbHashToDataURL(thumbhashBytes);

        return dataURL;
    } catch (error) {
        console.warn('Failed to generate thumbhash:', error);
    }
}

function isImageSupported(img_url, supported_domains, exclude_formats) {
    const hasSupportedDomain = supported_domains.some(domain => img_url.includes(domain));
    const file_extension = img_url.split('.').pop().split('?')[0].toLowerCase();
    const hasSupportedExt = !exclude_formats.includes(file_extension);
    return hasSupportedDomain && hasSupportedExt;
}

function buildImageHTML(matched_str, img_src_str, config, shouldLazyLoad, thumbhash) {
    // 生成 srcset
    const srcset = config.srcset_widths
        .map(width => {
            const url = img_src_str.includes('?')
                ? `${img_src_str}&w=${width}`
                : `${img_src_str}?w=${width}`;
            return `${url} ${width}w`;
        })
        .join(', ');

    // 提取并清理原属性
    const cleanAttributes = matched_str
        .replace(/<img\s+/, '')
        .replace(/\s*\/?>$/, '')
        .replace(/src="[^"]*"\s*/, '');

    // 构建主图片标签
    const imgTag = [
        `<img src="${img_src_str}" srcset="${srcset}"`,
        config.add_max_width ? `sizes="${config.max_widths}"` : '',
        shouldLazyLoad ? 'loading="lazy"' : '',
        `onload="this.classList.add('loaded')"`,
        cleanAttributes
    ].filter(Boolean).join(' ') + '>';

    const thumbhashPlaceHolder = `<img class="thumbhash-placeholder" src="${thumbhash}">`;
    return `<div class="progressive_img_container">${imgTag}${thumbhashPlaceHolder}</div>`;
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
        ...cfg  // 用户自定义配置覆盖上面的默认值
    };

    const img_reg_exp = /<img[^>]+src=\"(.+?)\"[^>]*>/gm;
    const matches = [...html_content.matchAll(img_reg_exp)];

    const thumbhashResults = await Promise.all(
        matches.map(([, img_src]) =>
            isImageSupported(img_src, config.supported_domains, config.exclude_formats) ? getThumbhashDataURL(img_src) : null
        )
    );

    let imageCount = 0;

    return html_content.replace(img_reg_exp, (matched_str, img_src_str) => {
        if (!isImageSupported(img_src_str, config.supported_domains, config.exclude_formats)) {
            return matched_str;
        }

        const shouldLazyLoad = config.enable_lazy_loading && ++imageCount > config.lazy_skip_first;
        const thumbhash = thumbhashResults[imageCount - 1];

        return buildImageHTML(matched_str, img_src_str, config, shouldLazyLoad, thumbhash);
    });
}

module.exports = main;
