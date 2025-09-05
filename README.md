# Bitiful_toolkit

## Intro

> [!NOTE]
>
> A very compact representation of an image placeholder. Store it inline with your data and show it while the real image is loading for a smoother loading experience. It's similar to BlurHash but with the following advantages:
>
> - Encodes more detail in the same space
> - Also encodes the aspect ratio
> - Gives more accurate colors
> - Supports images with alpha
> - Despite doing all of these additional things, the code for ThumbHash is still similar in complexity to the code for BlurHash. One potential drawback compared to BlurHash is that the parameters of the algorithm are not configurable (everything is automatically configured).
>
> The code for this is available at https://github.com/evanw/thumbhash and contains implementations for JavaScript, Rust, Swift, and Java. You can use npm install thumbhash to install the JavaScript package and cargo add thumbhash to install the Rust package.
>
> <img width="1760" height="640" alt="1756906220972" src="https://github.com/user-attachments/assets/74f6a198-9ed7-4374-9522-c2efc7fac852" />

progressive_image 会请求 bitiful server，拿到 thumbhash base64 text，多次运行可能会浪费请求次数，bitiful 计费参考[计费概述 - 缤纷云文档](https://docs.bitiful.com/prices/basic#%E5%85%8D%E8%B4%B9%E9%A2%9D%E5%BA%A6)
因此本地测试环境设置不启用；如需开启，设置`$env.CI = true`，CI/CD Pipeline 同理；

```js
if (
  !hexo.config.bitiful_toolkit ||
  !hexo.config.bitiful_toolkit.enable ||
  process.env.CI !== "true"
) {
  //
  log.info("[bitiful_toolkit] Skip Image Processing...");
  return;
}
```

本次测试时，可以直接运行`bun run test`，在浏览器打开`/test/output/index.html`查看效果。效果如图所示

[README.webm](https://github.com/user-attachments/assets/90dc98bd-37e0-4f44-b761-1772bcd63343)

## TODO-List

- [x] config.yaml 中 bitiful_toolkit 新增 env_name 选项，可自定义环境变量名
- [x] 缓存 img_url: data-url 键值对到 github gist(`thumbhash_kv.json`)
  - 每次 cicd build 前，将 github gist 下载到本地指定位置。
  - 在获取 img url 对应的 data-url 前，先检查本地缓存是否存在 img_url 对应的 data-url
    - 如果存在，直接使用 data-url
    - 否则，请求 bitiful 服务获取 thumbhash base64 text，并转换为 data-url 后存储到本地缓存
  - build 完成后，对应的本地缓存文件上传到 github gist，供下次使用

## Setup

`bun add git+https://github.com/Efterklang/Bitiful_Responsive_And_Progressive_Image`

```yaml config.yaml
bitiful_toolkit:
  enable: true
  env_name: "CI" # 如果存在环境变量CI的值为true，才进行图片处理
  all: false
  srcset_widths: [200, 400, 600, 800, 1200, 2000, 3000]
  add_max_width: false
  max_widths: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  enable_lazy_loading: true
  lazy_skip_first: 2
  supported_domains: ["assets.vluv.space", "s3.bitiful.net", "bitiful.com"]
  exclude_formats: ['svg', 'gif'],
  inject_css: true
  cache:
    enable: true
    gist_id: "your-gist-id"
    github_token: "${GITHUB_TOKEN}" # 从环境变量读取
    cache_file: "thumbhash_cache.json"
```

### 缓存功能说明

新增的缓存功能可以将图片 URL 到 data-url 的映射关系缓存到 GitHub Gist，避免重复请求 Bitiful 服务：

1. **缓存配置**：

   - `cache.enable`: 是否启用缓存功能
   - `cache.gist_id`: GitHub Gist 的 ID，用于存储缓存文件
   - `cache.github_token`: GitHub 访问令牌，建议通过环境变量`GITHUB_TOKEN`设置
   - `cache.cache_file`: 缓存文件名，默认为`thumbhash_cache.json`

2. **工作流程**：

   - 构建开始前：自动从 GitHub Gist 下载缓存文件
   - 图片处理时：优先检查缓存，命中则直接使用，未命中才请求 Bitiful API
   - 构建结束后：将更新的缓存文件上传到 GitHub Gist

3. **环境变量设置**：

   ```bash
   export GITHUB_TOKEN="your-github-personal-access-token"
   ```

4. **创建 GitHub Gist**：
   - 访问 https://gist.github.com
   - 创建一个新的 Gist，文件名为 `thumbhash_cache.json`
   - 初始内容可以是空的 JSON 对象：`{}`
   - 复制 Gist ID（URL 中的字符串）到配置文件

## Ref

- [ThumbHash: A very compact representation of an image placeholder](https://evanw.github.io/thumbhash/)
- [图像 BlurHash 与 ThumbHash 哈希占位技术： - 缤纷云文档](https://docs.bitiful.com/bitiful-s4/features/hash-placeholder)
- [REST API endpoints for gists - GitHub Docs](https://docs.github.com/en/rest/gists/gists)