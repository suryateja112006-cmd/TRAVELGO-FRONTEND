const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const hasConfiguredPort = Boolean(process.env.PORT);
const requestedPort = Number(process.env.PORT || 5500);
const host = "127.0.0.1";
const maxPortFallbackAttempts = 20;
let port = requestedPort;
let fallbackAttempts = 0;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch (error) {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  if (pathname === "/admin" || pathname === "/admin/") {
    pathname = "/admin.html";
  }
  if (pathname === "/staff" || pathname === "/staff/") {
    pathname = "/staff.html";
  }

  const filePath = path.resolve(root, `.${pathname}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      response.writeHead(statError.code === "ENOENT" ? 404 : 500);
      response.end(statError.code === "ENOENT" ? "Not Found" : "Internal Server Error");
      if (statError.code !== "ENOENT") console.error("Could not inspect requested file:", statError);
      return;
    }

    const resolvedPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.readFile(resolvedPath, (readError, content) => {
      if (readError) {
        response.writeHead(readError.code === "ENOENT" ? 404 : 500);
        response.end(readError.code === "ENOENT" ? "Not Found" : "Internal Server Error");
        if (readError.code !== "ENOENT") console.error("Could not read requested file:", readError);
        return;
      }

      response.writeHead(200, {
        "Content-Length": content.length,
        "Content-Type": contentTypes[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !hasConfiguredPort && fallbackAttempts < maxPortFallbackAttempts) {
    fallbackAttempts += 1;
    port += 1;
    console.warn(`Port ${port - 1} is already in use; trying port ${port}.`);
    server.listen(port, host);
    return;
  }

  console.error(`Could not start the frontend server on port ${port}:`, error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`TravelGo frontend is running at http://localhost:${port}`);
});
