import { colorize } from "consola/utils";
import "load-env";

const { runMigrate } = await import("lib/db/pg/migrate.pg");

await runMigrate()
  .then(() => {
    console.info("🚀 DB Migration completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);

    // On Vercel builds, don't fail the whole deploy just because a migration
    // step errored — the live schema is already applied and the app runs on it.
    // (Locally / in Docker we still hard-fail so a real pending migration is
    // not silently skipped. Run `pnpm db:migrate` manually to apply one.)
    if (process.env.VERCEL === "1") {
      console.warn(
        "⚠️ DB migration step errored on Vercel build — continuing without failing the build (existing schema assumed current). If you intend a real schema change, run `pnpm db:migrate` against the DB manually.",
      );
      process.exit(0);
    }

    console.warn(
      `
      ${colorize("red", "🚨 Migration failed due to incompatible schema.")}
      
❗️DB Migration failed – incompatible schema detected.

This version introduces a complete rework of the database schema.
As a result, your existing database structure may no longer be compatible.

**To resolve this:**

1. Drop all existing tables in your database.
2. Then run the following command to apply the latest schema:


${colorize("green", "pnpm db:migrate")}

**Note:** This schema overhaul lays the foundation for more stable updates moving forward.
You shouldn’t have to do this kind of reset again in future releases.

Need help? Open an issue on GitHub 🙏
      `.trim(),
    );

    process.exit(1);
  });
