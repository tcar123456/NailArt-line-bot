/**
 * Cloudflare Worker - GAS URL 代理
 * 隱藏真實 GAS URL，前端只看到 Worker URL
 *
 * 環境變數（Worker secret）：
 *   GAS_URL - 真實的 Google Apps Script 部署 URL
 *
 * 部署指令：
 *   wrangler secret put GAS_URL
 *   wrangler deploy
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const gasUrl = env.GAS_URL;

    if (!gasUrl) {
      return new Response(JSON.stringify({ success: false, error: 'Worker 未設定 GAS_URL secret' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    try {
      let gasResponse;

      if (request.method === 'POST') {
        const body = await request.text();

        gasResponse = await fetch(gasUrl, {
          method: 'POST',
          body: body,
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain' }
        });

      } else {
        // GET（JSONP fallback）：帶上所有 query params 轉發
        const url = new URL(request.url);
        const targetUrl = gasUrl + '?' + url.searchParams.toString();

        gasResponse = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow'
        });
      }

      const responseBody = await gasResponse.text();
      const contentType = gasResponse.headers.get('Content-Type') || 'application/json';

      return new Response(responseBody, {
        status: gasResponse.status,
        headers: {
          'Content-Type': contentType,
          ...corsHeaders()
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: '代理請求失敗：' + error.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
