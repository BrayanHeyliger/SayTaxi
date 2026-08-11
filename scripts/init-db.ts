import { execSync } from "node:child_process";
import mysql from "mysql2/promise";

async function ensureDatabaseExists() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const parsedUrl = new URL(databaseUrl);
  const dbName = parsedUrl.pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("DATABASE_URL database name contains unsupported characters");
  }

  if (!dbName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  const rootConnection = await mysql.createConnection({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
  });

  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await rootConnection.end();
}

async function createIndexes() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = mysql.createPool(databaseUrl);

  const [dbNameRows] = await pool.query<any[]>("SELECT DATABASE() AS dbName");
  const dbName = dbNameRows[0]?.dbName;

  const ensureIndex = async (tableName: string, indexName: string, definition: string) => {
    const [rows] = await pool.query<any[]>(
      `SELECT COUNT(1) AS count
       FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
      [dbName, tableName, indexName],
    );

    if (rows[0]?.count === 0) {
      await pool.query(`CREATE INDEX ${indexName} ON ${tableName} (${definition})`);
    }
  };

  await ensureIndex("trips", "idx_trips_status", "status");
  await ensureIndex("trips", "idx_trips_client_id", "clientId");
  await ensureIndex("drivers", "idx_drivers_online", "isOnline");

  await pool.end();
}

async function run() {
  await ensureDatabaseExists();

  execSync("pnpm drizzle-kit migrate", {
    stdio: "inherit",
    env: process.env,
  });

  await createIndexes();

  execSync("pnpm tsx scripts/seed-data.ts", {
    stdio: "inherit",
    env: process.env,
  });
}

run().catch((error) => {
  console.error("[init-db] failed", error);
  process.exit(1);
});
