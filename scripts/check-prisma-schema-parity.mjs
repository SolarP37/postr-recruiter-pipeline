import { readFile } from "node:fs/promises";

const sqliteSchemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const postgresSchemaPath = new URL(
  "../prisma/postgresql/schema.prisma",
  import.meta.url,
);

function modelBlocks(schema) {
  const blocks = new Map();
  const pattern = /^(enum|model)\s+(\w+)\s+\{[\s\S]*?^\}/gm;

  for (const match of schema.matchAll(pattern)) {
    const [, kind, name] = match;
    blocks.set(`${kind}:${name}`, match[0].replace(/\s+/g, " ").trim());
  }

  return blocks;
}

const [sqliteSchema, postgresSchema] = await Promise.all([
  readFile(sqliteSchemaPath, "utf8"),
  readFile(postgresSchemaPath, "utf8"),
]);

const sqliteBlocks = modelBlocks(sqliteSchema);
const postgresBlocks = modelBlocks(postgresSchema);
const keys = new Set([...sqliteBlocks.keys(), ...postgresBlocks.keys()]);
const differences = [];

for (const key of [...keys].sort()) {
  if (sqliteBlocks.get(key) !== postgresBlocks.get(key)) {
    differences.push(key);
  }
}

if (differences.length > 0) {
  console.error(
    `Prisma schemas differ in: ${differences.join(", ")}. ` +
      "Keep local SQLite and production PostgreSQL models synchronized.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `Prisma schema parity verified across ${keys.size} models and enums.`,
  );
}
