# 项目描述

该项目整理了cloudflare workers的部分实现，例如代理github，代理谷歌等等，解决中国大陆境内的网络访问问题。其原理为利用cloudflare的全球CDN网络，部署边缘计算服务，达到突破GFW的目的。
此项目内可以当作模版使用。


## 使用方法

- npm install -g wrangler
- source wrangler.env 
- cd gfw && wrangler publish

wrangler.env 文件为环境变量，用于访问cloudflare api

```code
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ACCOUNT_ID=""
```

## 部分代理站点

- https://github.amrom.workers.dev
- https://gfw.amrom.workers.dev
- https://gh.amrom.workers.dev

