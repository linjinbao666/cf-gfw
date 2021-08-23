// 需要反代的地址
const upstream = 'gist.github.com'
// 反代地址的子路径
const upstreamPath = '/'
// 反代网站的移动端域名
const upstreamMobile = 'gist.github.com'

// 是否使用 https
const useHttps = true

// 禁止使用该 worker 的国家代码
const blockedRegion = ['KP', 'SY', 'PK', 'CU']

// 禁止使用该 worker 的 ip 地址
const blockedIp = ['0.0.0.0', '127.0.0.1']

// 是否关闭缓存
const disableCache = false
// 替换条件
const contentTypes = [
  'text/plain',
  'text/html'
]
// 反代网站中其他需要被替换的地址
const replaceDict = {
  '$upstream': '$workerDomain',
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  const region = request.headers.get('cf-ipcountry') || '';
  const ip = request.headers.get('cf-connecting-ip');

  if (blockedRegion.includes(region.toUpperCase())) {
    return new Response('Access denied: WorkersProxy is not available in your region yet.', {
      status: 403
    });
  }

  if (blockedIp.includes(ip)) {
    return new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
      status: 403
    });
  }

  const upstreamDomain = isMobile(request.headers.get('user-agent')) ? upstreamMobile : upstream;

  // 构建上游请求地址
  let url = new URL(request.url);
  const workerDomain = url.host;
  
  url.protocol = useHttps ? 'https:' : 'http';
  url.pathname = url.pathname === '/' ? upstreamPath : upstreamPath + url.pathname;
  url.host = upstreamDomain;

  // 构建上游请求头
  const newRequestHeaders = new Headers(request.headers);
  newRequestHeaders.set('Host', upstreamDomain);
  newRequestHeaders.set('Referer', url.protocol + '//' + workerDomain);

  // 获取上游响应
  const originalResponse = await fetch(url.href, {
    method: request.method,
    headers: newRequestHeaders
  })

  const connectionUpgrade = newRequestHeaders.get("Upgrade");
  if (connectionUpgrade && connectionUpgrade.toLowerCase() === "websocket") {
    return originalResponse;
  }

  let originalResponseClone = originalResponse.clone();

  // 构建响应头
  let responseHeaders = originalResponseClone.headers;
  let newResponseHeaders = buildResponseHeaders(responseHeaders);
  if (newResponseHeaders.get("x-pjax-url")) {
    newResponseHeaders.set("x-pjax-url", responseHeaders.get("x-pjax-url").replace("//" + upstreamDomain, "//" + workerDomain));
  }

  // 构建响应体
  let originalText;
  const contentType = newResponseHeaders.get('content-type');
  if (contentType != null) {
    const types = contentType.replace(' ','').split(';')
    if (types.includes('charset=utf-8')){
      for (let i of contentTypes) {
        if (types.includes(i)){
          originalText = await replaceResponseText(originalResponseClone, upstreamDomain, workerDomain);
          break
        }
      }
    }
  } else {
    originalText = originalResponseClone.body
  }

  return new Response(originalText, {
    status: originalResponseClone.status,
    headers: newResponseHeaders
  })
}

function isMobile(userAgent) {
  userAgent = userAgent || ''
  let agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
  for (let v = 0; v < agents.length; v++) {
    if (userAgent.indexOf(agents[v]) > 0) {
      return true;
    }
  }
}

function buildResponseHeaders(originalHeaders) {
  const result = new Headers(originalHeaders);
  if (disableCache) {
    result.set('Cache-Control', 'no-store');
  }
  result.set('access-control-allow-origin', '*');
  result.set('access-control-allow-credentials', true);
  result.delete('content-security-policy');
  result.delete('content-security-policy-report-only');
  result.delete('clear-site-data');

  return result
}

async function replaceResponseText(response, upstreamDomain, workerDomain) {
  let text = await response.text()
  const placeholders = {
    "$upstream": upstreamDomain,
    "$workerDomain": workerDomain
  }

  for (let origin in replaceDict) {
    let target = replaceDict[origin]

    origin = placeholders[origin] || origin
    target = placeholders[target] || target

    const re = new RegExp(origin, 'g')
    text = text.replace(re, target);
  }

  return text;
}