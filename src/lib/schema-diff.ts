import pg from "pg";
import { DiffEntry } from "./format.js";

interface TableInfo {
  table_schema: string;
  table_name: string;
}

interface ColumnInfo {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getTables(client: pg.Client, schema: string): Promise<TableInfo[]> {
  const res = await client.query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`,
    [schema]
  );
  return res.rows;
}

async function getColumns(client: pg.Client, schema: string): Promise<ColumnInfo[]> {
  const res = await client.query(
    `SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1
     ORDER BY table_schema, table_name, ordinal_position`,
    [schema]
  );
  return res.rows;
}

export async function computeSchemaDiff(
  connStrA: string,
  connStrB: string,
  schema = "public"
): Promise<DiffEntry[]> {
  const clientA = new pg.Client(connStrA);
  const clientB = new pg.Client(connStrB);

  try {
    await Promise.all([clientA.connect(), clientB.connect()]);

    const [tablesA, tablesB] = await Promise.all([
      getTables(clientA, schema),
      getTables(clientB, schema),
    ]);

    const [columnsA, columnsB] = await Promise.all([
      getColumns(clientA, schema),
      getColumns(clientB, schema),
    ]);

    const diffs: DiffEntry[] = [];

    const tableMapA = new Map(tablesA.map((t) => [`${t.table_schema}.${t.table_name}`, t]));
    const tableMapB = new Map(tablesB.map((t) => [`${t.table_schema}.${t.table_name}`, t]));

    const colMapA = new Map<string, ColumnInfo[]>();
    const colMapB = new Map<string, ColumnInfo[]>();

    for (const col of columnsA) {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!colMapA.has(key)) colMapA.set(key, []);
      colMapA.get(key)!.push(col);
    }

    for (const col of columnsB) {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!colMapB.has(key)) colMapB.set(key, []);
      colMapB.get(key)!.push(col);
    }

    // Find tables added/removed
    for (const [key, table] of tableMapA) {
      if (!tableMapB.has(key)) {
        diffs.push({
          type: "removed",
          table: table.table_name,
          detail: `Schema: ${table.table_schema}`,
        });
      }
    }

    for (const [key, table] of tableMapB) {
      if (!tableMapA.has(key)) {
        diffs.push({
          type: "added",
          table: table.table_name,
          detail: `Schema: ${table.table_schema}`,
        });
      }
    }

    // Find modified tables (column differences)
    for (const [key, table] of tableMapA) {
      if (!tableMapB.has(key)) continue;

      const colsA = colMapA.get(key) || [];
      const colsB = colMapB.get(key) || [];

      const colDetailMapA = new Map(colsA.map((c) => [c.column_name, c]));
      const colDetailMapB = new Map(colsB.map((c) => [c.column_name, c]));

      const columnChanges: string[] = [];

      // Columns removed
      for (const colA of colsA) {
        if (!colDetailMapB.has(colA.column_name)) {
          columnChanges.push(`- ${colA.column_name} (${colA.data_type})`);
        }
      }

      // Columns added
      for (const colB of colsB) {
        if (!colDetailMapA.has(colB.column_name)) {
          columnChanges.push(`+ ${colB.column_name} (${colB.data_type})`);
        }
      }

      // Columns modified (type/nullability changes)
      for (const colB of colsB) {
        const colA = colDetailMapA.get(colB.column_name);
        if (!colA) continue;

        const typeDiff = colA.data_type !== colB.data_type;
        const nullDiff = colA.is_nullable !== colB.is_nullable;
        const defaultDiff = colA.column_default !== colB.column_default;

        if (typeDiff) {
          columnChanges.push(`~ ${colB.column_name}: ${colA.data_type} → ${colB.data_type}`);
        } else if (nullDiff) {
          columnChanges.push(`~ ${colB.column_name}: nullable=${colA.is_nullable} → ${colB.is_nullable}`);
        } else if (defaultDiff) {
          columnChanges.push(`~ ${colB.column_name}: default changed`);
        }
      }

      if (columnChanges.length > 0) {
        diffs.push({
          type: "modified",
          table: table.table_name,
          detail: columnChanges.join("; "),
        });
      }
    }

    return diffs;
  } finally {
    try { await clientA.end(); } catch { /* ignore */ }
    try { await clientB.end(); } catch { /* ignore */ }
  }
}
