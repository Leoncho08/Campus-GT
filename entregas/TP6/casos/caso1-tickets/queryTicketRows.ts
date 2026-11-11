import { execFile } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const executeFileAsync = promisify(execFile);
const SQL_COMMAND_MAXIMUM_COLUMN_WIDTH = 8000;
const SQL_COMMAND_MAXIMUM_BUFFER_BYTES = 10 * 1024 * 1024;

export async function queryTicketRows(): Promise<unknown[]> {
  const databaseServer = process.env.DB_SERVER ?? "";
  const databaseName = process.env.DB_DATABASE ?? "";

  if (databaseServer.trim().length === 0) {
    throw new Error("DB_SERVER is missing. Create a .env file in the project root.");
  }

  const { stdout } = await executeFileAsync(
    "sqlcmd",
    [
      "-S", databaseServer,
      "-d", databaseName,
      "-E",
      "-y", String(SQL_COMMAND_MAXIMUM_COLUMN_WIDTH),
      "-h", "-1",
      "-Q", "SET NOCOUNT ON; SELECT * FROM Tickets FOR JSON PATH;"
    ],
    { maxBuffer: SQL_COMMAND_MAXIMUM_BUFFER_BYTES }
  );

  const jsonText = stdout.trim();
  if (jsonText.length === 0) {
    return [];
  }

  const parsedRows: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsedRows)) {
    throw new Error("SQL Server did not return a JSON array of tickets.");
  }

  return parsedRows;
}
