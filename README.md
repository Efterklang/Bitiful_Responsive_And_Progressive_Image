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
- [ ] 缓存 thumbhash 到本地文件，请求 img url 对应的 data-url 后将其存储到本地，避免浪费 bitiful 请求次数/流量

```plain
before: img_url -> fetch thumbhash base64 -> convert to data-url
after: img_url -> check local cache -> if exist then use it
                                    ->  else fetch thumbhash base64 -> convert to data-url -> store to local cache
```

## Setup

`$bun add git+https://github.com/Efterklang/Bitiful_Responsive_And_Progressive_Image`

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
```

## Ref

- [ThumbHash: A very compact representation of an image placeholder](https://evanw.github.io/thumbhash/)
- [图像 BlurHash 与 ThumbHash 哈希占位技术： - 缤纷云文档](https://docs.bitiful.com/bitiful-s4/features/hash-placeholder)
