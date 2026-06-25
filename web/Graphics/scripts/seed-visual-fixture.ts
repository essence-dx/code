import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../src/db/client";
import { designFile, designFileShare, user } from "../src/db/schema";
import {
  createVisualFixtureDocument,
  visualFixtureFileId,
  visualFixtureShareToken,
  visualFixtureTimestamp,
} from "../src/features/editor/visual-fixture-document";

config({ path: ".env.local" });

const ownerEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mail.com";
const fileId = process.env.ESSENCE_VISUAL_FILE_ID ?? visualFixtureFileId;
const shareToken =
  process.env.ESSENCE_VISUAL_SHARE_TOKEN ?? visualFixtureShareToken;
const now = new Date(visualFixtureTimestamp);
const db = getDb();

const [owner] = await db
  .select({
    id: user.id,
    email: user.email,
  })
  .from(user)
  .where(eq(user.email, ownerEmail))
  .limit(1);

if (!owner) {
  throw new Error(
    `Seed ${ownerEmail} first with bun run seed:admin before creating the visual fixture.`,
  );
}

const document = createVisualFixtureDocument();
const [existingFile] = await db
  .select({ id: designFile.id })
  .from(designFile)
  .where(eq(designFile.id, fileId))
  .limit(1);

if (existingFile) {
  await db
    .update(designFile)
    .set({
      ownerId: owner.id,
      name: "Visual QA Fixture",
      document,
      scope: "team",
      teamName: "Quality",
      projectName: "Visual Regression",
      favorite: true,
      lastOpenedAt: now,
      trashedAt: null,
      updatedAt: now,
    })
    .where(eq(designFile.id, fileId));
} else {
  await db.insert(designFile).values({
    id: fileId,
    ownerId: owner.id,
    name: "Visual QA Fixture",
    document,
    scope: "team",
    teamName: "Quality",
    projectName: "Visual Regression",
    favorite: true,
    lastOpenedAt: now,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

const [existingShare] = await db
  .select({ id: designFileShare.id })
  .from(designFileShare)
  .where(
    and(
      eq(designFileShare.fileId, fileId),
      eq(designFileShare.token, shareToken),
    ),
  )
  .limit(1);

if (existingShare) {
  await db
    .update(designFileShare)
    .set({
      ownerId: owner.id,
      permissionPreset: "handoff",
      accessLevel: "inspect",
      allowComments: false,
      allowDownload: true,
      expiresAt: null,
      disabledAt: null,
    })
    .where(eq(designFileShare.id, existingShare.id));
} else {
  await db.insert(designFileShare).values({
    id: nanoid(),
    fileId,
    ownerId: owner.id,
    token: shareToken,
    permissionPreset: "handoff",
    accessLevel: "inspect",
    allowComments: false,
    allowDownload: true,
    createdAt: now,
    expiresAt: null,
    disabledAt: null,
  });
}

console.log(`Seeded visual QA fixture for ${owner.email}`);
console.log(`ESSENCE_VISUAL_FILE_ID=${fileId}`);
console.log(`ESSENCE_VISUAL_SHARE_TOKEN=${shareToken}`);
