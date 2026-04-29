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
  // Make it look like a normal web server/CDN
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
        version: "1.0.0",
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

  // Check if TARGET_DOMAIN is set
  if (!TARGET_BASE) {
    return new Response(LANDING_PAGE, { 
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }

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
    
    // Forward client IP
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

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders
    });

  } catch (err) {
    console.error("relay error:", err);
    
    // Return generic error page (doesn't reveal it's a proxy)
    const errorPage = `<!DOCTYPE html>
<html>
<head><title>502 Bad Gateway</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
  <h1>502 Bad Gateway</h1>
  <p>The server encountered a temporary error.</p>
  <p>Please try again in a few moments.</p>
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
