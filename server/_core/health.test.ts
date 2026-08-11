import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { registerHealthRoute } from "./health";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("GET /health", () => {
  it("returns ok response when database is not configured", async () => {
    delete process.env.DATABASE_URL;

    const app = express();
    registerHealthRoute(app);
    const server = createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.database).toEqual({ status: "not_configured" });

    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });
});
