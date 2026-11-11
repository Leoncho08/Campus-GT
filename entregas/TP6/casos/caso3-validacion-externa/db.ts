import sql from "mssql";

export const pool = new sql.ConnectionPool({
  server: process.env.DB_SERVER ?? "",
  database: process.env.DB_DATABASE ?? "",
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  options: { trustServerCertificate: true }
});

export const poolConectado = pool.connect();
