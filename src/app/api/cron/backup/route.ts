import { gunzipSync, gzipSync } from "node:zlib";
import { del, get, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { buildBackupSnapshot, validateBackupSnapshot } from "@/lib/backup";
import { reportOperationalError } from "@/lib/operations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const snapshot = await buildBackupSnapshot();
    const validation = validateBackupSnapshot(snapshot);
    if (validation.length) throw new Error(validation.join(" "));
    const encoded = gzipSync(Buffer.from(JSON.stringify(snapshot)));
    const stamp = snapshot.createdAt.replaceAll(":", "-");
    const pathname = `backups/${stamp}.json.gz`;
    await put(pathname, encoded, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/gzip",
    });

    const stored = await get(pathname, { access: "private", useCache: false });
    if (!stored || stored.statusCode !== 200 || !stored.stream) {
      throw new Error("The new backup could not be read back from private storage.");
    }
    const downloaded = Buffer.from(await new Response(stored.stream).arrayBuffer());
    const recovered = JSON.parse(gunzipSync(downloaded).toString("utf8"));
    const recoveryValidation = validateBackupSnapshot(recovered);
    if (recoveryValidation.length) {
      throw new Error(`Backup recovery verification failed: ${recoveryValidation.join(" ")}`);
    }

    const existing = await list({ prefix: "backups/", limit: 1000 });
    const retentionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const expired = existing.blobs
      .filter((blob) => new Date(blob.uploadedAt).getTime() < retentionCutoff)
      .map((blob) => blob.url);
    if (expired.length) await del(expired);

    await audit("BACKUP_COMPLETED", "DatabaseBackup", pathname, {
      counts: snapshot.counts,
      bytes: encoded.byteLength,
      expiredRemoved: expired.length,
      recoveryVerified: true,
    });
    return NextResponse.json({
      ok: true,
      createdAt: snapshot.createdAt,
      counts: snapshot.counts,
      bytes: encoded.byteLength,
      expiredRemoved: expired.length,
      recoveryVerified: true,
    });
  } catch (error) {
    await reportOperationalError("daily_database_backup", error);
    return NextResponse.json(
      { error: "Backup failed and was recorded for review." },
      { status: 500 },
    );
  }
}
