import mysql from "mysql2/promise";

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const adminOpenId = process.env.ADMIN_OPEN_ID ?? "admin";
  const adminName = process.env.ADMIN_NAME ?? "SayTaxi Admin";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@saytaxi.local";

  const pool = mysql.createPool(databaseUrl);

  await pool.query(
    `INSERT INTO users (openId, name, email, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), role = 'admin'`,
    [adminOpenId, adminName, adminEmail],
  );

  await pool.query(
    `INSERT INTO pricingRules (name, baseFare, costPerKm, costPerMinute, minimumFare, isActive)
     SELECT 'default', '3.50', '1.25', '0.30', '4.00', true
     WHERE NOT EXISTS (SELECT 1 FROM pricingRules WHERE name = 'default')`,
  );

  await pool.end();
}

run().catch((error) => {
  console.error("[seed-data] failed", error);
  process.exit(1);
});
