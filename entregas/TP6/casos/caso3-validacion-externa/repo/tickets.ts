import { pool } from "../db";

export async function getTicketById(id: number) {
  const result = await pool
    .request()
    .query(`SELECT Id, Titulo, Estado FROM Tickets WHERE Id = ${id}`);
  return result.recordset[0] ?? null;
}
