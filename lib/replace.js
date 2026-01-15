const { getDimension, getDataURL } = require("./bitiful.js");

/**
 * 检查图片是否支持媒体处理，例如Bitiful支持thumbhash, Cloudflare不支持
 * @param {string} img_url
 * @param {Array<string>} supported_domains 支持媒体处理的域名列表,例如`["assets.vluv.space", "s3.bitiful.net", "bitiful.com"]`
 * @param {Array<string>} exclude_formats 不进行媒体处理的图片格式,例如`['svg', 'gif']`
 * @returns {boolean}
 */
function isImageSupported(img_url, supported_domains, exclude_formats) {
	const hasSupportedDomain = supported_domains.some((domain) =>
		img_url.includes(domain),
	);
	const file_extension = img_url.split(".").pop().split("?")[0].toLowerCase();
	const hasSupportedExt = !exclude_formats.includes(file_extension);
	return hasSupportedDomain && hasSupportedExt;
}

/**
 * @param {string} img_link 例如`<img src="https://demo.bitiful.com/girl.jpeg" alt="">`
 * @param {string} img_src 例如`https://demo.bitiful.com/girl.jpeg`
 * @param {object} config user config in config.yaml
 * @param {boolean} shouldLazyLoad 是否添加loading="lazy"
 * @param {string|null} dataURL 例如`data:image/png;base64,iVBORw...`，未获取到则为null
 * @returns {string}
 */
function buildImageHTML(
	img_link,
	img_src,
	config,
	shouldLazyLoad,
	dataURL,
	dimensions,
) {
	// 生成 srcset
	const srcset = config.srcset_widths
		.map((width) => {
			const url = img_src.includes("?")
				? `${img_src}&w=${width}`
				: `${img_src}?w=${width}`;
			return `${url} ${width}w`;
		})
		.join(", ");

	// 2. 清理原有的 src, width, style 等属性，避免冲突
	// 这种正则能同时处理单双引号
	const cleanAttributes = img_link
		.replace(/<img\s+/i, "")
		.replace(/\s*\/?>$/i, "")
		.replace(/\b(src|width|srcset|loading|style)\s*=\s*["'][^"']*["']/gi, "");

	// 提取用户自定义的 width（从 width 属性或 style 中）
	const widthMatch = img_link.match(/\bwidth\s*=\s*["']?([^"'\s>]+)/i);
	const containerWidth = widthMatch
		? Number.isNaN(widthMatch[1])
			? widthMatch[1]
			: `${widthMatch[1]}px`
		: "100%";

	// 确定容器宽度：优先使用用户自定义宽度，否则使用 100%
	const pic_style = [
		"position: relative",
		"overflow: hidden",
		`width: ${containerWidth}`,
		`background-image: url('${dataURL}')`,
		"background-size: cover",
		"background-repeat: no-repeat",
	];

	if (dimensions?.width) {
		pic_style.push(`max-width: ${dimensions.width}px`);
		pic_style.push(`aspect-ratio: ${dimensions.width} / ${dimensions.height}`);
	}

	const imgTag = `<img src="${img_src}"
        srcset="${srcset}"
        ${shouldLazyLoad ? 'loading="lazy" decoding="async"' : ""}
        style="width:100%; object-fit:cover; transition: opacity 0.3s; ${dataURL ? "opacity:0;" : ""}"
        onload="this.style.opacity=1; this.parentElement.style.backgroundImage='none';"
        ${cleanAttributes.trim()}>`;

	return dataURL
		? `<div class="pic" style="${pic_style.join(";")}">${imgTag}</div>`
		: imgTag;
}
async function main(html_content, cfg) {
	const config = {
		srcset_widths: [400, 600, 800, 1200, 2000, 3000],
		add_max_width: false,
		max_widths: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px",
		enable_lazy_loading: true,
		supported_domains: ["assets.vluv.space", "s3.bitiful.net", "bitiful.com"],
		exclude_formats: ["svg", "gif"],
		...cfg, // 用户自定义配置覆盖上面的默认值
	};

	const cacheInstance = global.bitifulCacheInstance;

	const img_reg_exp = /<img[^>]+src="(.+?)"[^>]*>/gm;

	const matches = Array.from(html_content.matchAll(img_reg_exp));
	if (matches.length === 0) return html_content;

	// 1. 提取并去重需要处理的图片（减少重复的网络/IO请求）
	const uniqueImagesMap = new Map();
	matches.forEach((match) => {
		const src = match[1];
		if (
			isImageSupported(src, config.supported_domains, config.exclude_formats)
		) {
			uniqueImagesMap.set(src, null);
		}
	});

	// 2. 并行获取元数据（合并 Promise，减少分块处理）
	const uniqueSrcs = Array.from(uniqueImagesMap.keys());
	const metadataResults = await Promise.all(
		uniqueSrcs.map(async (src) => {
			const [thumbhash, dimensions] = await Promise.all([
				getDataURL(src, cacheInstance),
				getDimension(src, cacheInstance),
			]);
			return { src, thumbhash, dimensions };
		}),
	);

	// 将结果转回 Map 方便查询
	const dataMap = new Map(metadataResults.map((item) => [item.src, item]));

	// 3. 构造最终 HTML（避免再次正则扫描）
	let resultHtml = "";
	let lastIndex = 0;

	for (const match of matches) {
		const [imgLink, img_src] = match;
		const index = match.index;

		// 拼接上一个匹配项到当前匹配项之间的文本
		resultHtml += html_content.slice(lastIndex, index);

		const data = dataMap.get(img_src);
		if (data) {
			const shouldLazyLoad = config.enable_lazy_loading;
			resultHtml += buildImageHTML(
				imgLink,
				img_src,
				config,
				shouldLazyLoad,
				data.thumbhash,
				data.dimensions,
			);
		} else {
			// 如果图片不支持，原样放回
			resultHtml += imgLink;
		}

		lastIndex = index + imgLink.length;
	}

	// 拼接剩余部分
	resultHtml += html_content.slice(lastIndex);

	return resultHtml;
}

module.exports = main;
