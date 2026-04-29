export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

// Headers to strip
const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

// Fake landing page HTML
const LANDING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloud Edge Services</title>
    <meta name="description" content="High-performance edge computing and content delivery solutions">
    <meta name="robots" content="index, follow">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 60px 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: #667eea;
        }
        p {
            font-size: 1.1em;
            margin-bottom: 15px;
            color: #666;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .feature {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .feature h3 {
            color: #764ba2;
            margin-bottom: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 0.9em;
            color: #999;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 30px;
            font-size: 0.9em;
        }
        .stat-item {
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Edge Services</h1>
        <p>Lightning-fast global content delivery powered by edge computing</p>
        <p>Distributed across 100+ locations worldwide for optimal performance</p>
        
        <div class="features">
            <div class="feature">
                <h3>🚀 Ultra Fast</h3>
                <p>Sub-50ms response times globally</p>
            </div>
            <div class="feature">
                <h3>🔒 Secure</h3>
                <p>Enterprise-grade encryption</p>
            </div>
            <div class="feature">
                <h3>🌍 Global</h3>
                <p>Anycast network for reliability</p>
            </div>
        </div>

        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">99.99%</div>
                <div>Uptime SLA</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">100+</div>
                <div>Edge Locations</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">24/7</div>
                <div>Support</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Status: <strong style="color: #28a745;">Operational</strong></p>
            <p>Powered by Vercel Edge Network</p>
        </div>
    </div>
</body>
</html>`;

function getClientIp(req) {
  return req.headers.get("x-real-ip") || 
         req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         "unknown";
}

function addNormalHeaders(headers) {
  headers.set("server", "Vercel");
  headers.set("x-powered-by", "Next.js");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=0, must-revalidate");
  }
  
  return headers;
}

export default async function handler(req) {
  const clientIp = getClientIp(req);
  const url = new URL(req.url);
  const path = url.pathname;

  // Serve landing page for root
  if (path === "/") {
    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600"
    });
    addNormalHeaders(headers);
    return new Response(LANDING_PAGE, { status: 200, headers });
  }

  // Serve fake favicon
  if (path === "/favicon.ico") {
    return new Response(null, { 
      status: 204,
      headers: { "cache-control": "public, max-age=86400" }
    });
  }

  // Serve robots.txt
  if (path === "/robots.txt") {
    return new Response("User-agent: *\nAllow: /\n", {
      status: 200,
      headers: { 
        "content-type": "text/plain",
        "cache-control": "public, max-age=86400"
      }
    });
  }

  // Health check endpoint (looks like API monitoring)
  if (path === "/api/health" || path === "/health") {
    return new Response(
      JSON.stringify({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        region: process.env.VERCEL_REGION || "unknown"
      }), 
      {
        status: 200,
        headers: { 
          "content-type": "application/json",
          "cache-control": "no-cache"
        }
      }
    );
  }

  // Sitemap endpoint (makes it look even more like a real site)
  if (path === "/sitemap.xml") {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${req.headers.get("host")}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new Response(sitemap, {
      status: 200,
      headers: { 
        "content-type": "application/xml",
        "cache-control": "public, max-age=86400"
      }
    });
  }

  // Check if TARGET_DOMAIN is set
  if (!TARGET_BASE) {
    return new Response(LANDING_PAGE, { 
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }

  // Main proxy logic - NO RATE LIMITING
  try {
    const targetUrl = TARGET_BASE + path + url.search;

    // Build outgoing headers
    const out = new Headers();
    for (const [k, v] of req.headers) {
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip" || k === "x-forwarded-for") continue;
      out.set(k, v);
    }
    
    out.set("x-forwarded-for", clientIp);
    
    // Add realistic headers if missing
    if (!out.has("user-agent")) {
      out.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    }
    if (!out.has("accept")) {
      out.set("accept", "*/*");
    }

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    // Direct streaming proxy
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

    // Clone response headers and add normal server headers
    const responseHeaders = new Headers(upstreamRes.headers);
    addNormalHeaders(responseHeaders);

    // Simple passthrough - no wrapping, no counting
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders
    });

  } catch (err) {
    console.error("relay error:", err);
    
    // Return generic error page
    const errorPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>502 Bad Gateway</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .error-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
        }
        h1 {
            color: #e74c3c;
            font-size: 3em;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>502</h1>
        <h2>Bad Gateway</h2>
        <p>The server encountered a temporary error and could not complete your request.</p>
        <p>Please try again in a few moments.</p>
    </div>
</body>
</html>`;

    return new Response(errorPage, { 
      status: 502,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "30"
      }
    });
  }
}
