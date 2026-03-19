import express from "express";
import { Readable } from "node:stream";

const app = express();
const port = Number(process.env.PORT || 3444);

app.use(express.json({ limit: "10mb" }));

// 1. Enhanced CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  
  const requestHeaders = req.headers["access-control-request-headers"];
  if (requestHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  } else {
    res.setHeader("Access-Control-Allow-Headers", "*");
  }

  if (req.method === "OPTIONS") {
    console.log(`[CORS] Preflight approved for: ${req.url}`);
    res.status(204).end();
    return;
  }

  next();
});

// 2. Health Check
app.get("/health", (_req, res) => {
  res.json({ ok: true, port });
});

// 3. Main Proxy Route
app.post("/proxy", async (req, res) => {
  console.log(`\n=========================================`);
  console.log(`[Proxy] Received POST request from frontend.`);
  
  const { url, method = "POST", headers = {}, body } = req.body || {};

  console.log(`[Proxy] Target URL: ${url || "UNDEFINED"}`);

  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: { message: "A valid target url is required." } });
  }

  const outgoingHeaders = Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => {
      if (typeof value !== "string") return false;
      const normalized = key.toLowerCase();
      return normalized !== "host" && normalized !== "content-length" && normalized !== "origin";
    })
  );

  console.log(`[Proxy] Forwarding request to upstream API...`);

  try {
    const upstream = await fetch(url, {
      method,
      headers: outgoingHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    console.log(`[Upstream Response] Status: ${upstream.status} ${upstream.statusText}`);

    // ERROR INTERCEPTION: If the API rejects the request (e.g. 400 Bad Request)
    // We read the error body, log it to the server console, and send it as JSON to frontend.
    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`[API Error] The upstream API rejected the request!`);
      console.error(`[API Error Details]: ${errorText}`);
      
      res.status(upstream.status).type('application/json').send(errorText);
      return;
    }

    // SUCCESS PATH: Forward headers and stream the successful response
    res.status(upstream.status);

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);

    const transferEncoding = upstream.headers.get("transfer-encoding");
    if (transferEncoding) res.setHeader("Transfer-Encoding", transferEncoding);

    if (!upstream.body) {
      console.log(`[Proxy] No body returned from upstream. Ending response.`);
      return res.end();
    }

    console.log(`[Proxy] Streaming response back to frontend...`);
    Readable.fromWeb(upstream.body).pipe(res);

  } catch (error) {
    console.error(`[Network Error] Failed to fetch upstream:`, error);
    res.status(502).json({
      error: { message: error instanceof Error ? error.message : String(error) }
    });
  }
});

app.listen(port, () => {
  console.log(`[Server] Proxy is listening on http://localhost:${port}`);
});