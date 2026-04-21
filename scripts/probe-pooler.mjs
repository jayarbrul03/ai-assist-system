import pg from "pg";

const HOSTS = [
  // Supabase Supavisor (newer format)
  "ap-southeast-2.pooler.supabase.com",
  "ap-southeast-1.pooler.supabase.com",
  "us-east-1.pooler.supabase.com",
  "us-west-1.pooler.supabase.com",
  "eu-central-1.pooler.supabase.com",
  // Older aws-0- prefix
  "aws-0-ap-southeast-2.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
];

const ref = "lccshdbtwnjdzsmlebef";
const pw = "DCcS5pvFhTd8u7rE";

for (const host of HOSTS) {
  for (const port of [6543, 5432]) {
    const url = `postgresql://postgres.${ref}:${pw}@${host}:${port}/postgres`;
    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      const r = await client.query("select current_database() as db");
      console.log(`WINNER host=${host}:${port} db=${r.rows[0].db}`);
      await client.end();
      console.log(`URL=${url}`);
      process.exit(0);
    } catch (e) {
      console.log(`fail ${host}:${port} ${(e.message || "").split("\n")[0]}`);
      try { await client.end(); } catch {}
    }
  }
}
process.exit(1);
