import express from "express";
import { Readable } from "node:stream";

const app = express();
const port = Number(process.env.PORT || 3444);

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, port });
});

app.post("/proxy", async (req, res) => {
  const { url, method = "POST", headers = {}, body } = req.body || {};

  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: { message: "A valid target url is required." } });
    return;
  }

  const outgoingHeaders = Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => {
      if (typeof value !== "string") return false;
      const normalized = key.toLowerCase();
      return normalized !== "host" && normalized !== "content-length" && normalized !== "origin";
    })
  );

  try {
    const upstream = await fetch(url, {
      method,
      headers: outgoingHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    res.status(upstream.status);

    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }

    const transferEncoding = upstream.headers.get("transfer-encoding");
    if (transferEncoding) {
      res.setHeader("Transfer-Encoding", transferEncoding);
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.status(502).json({
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

app.listen(port, () => {
  console.log(`[proxy] listening on http://localhost:${port}`);
});
