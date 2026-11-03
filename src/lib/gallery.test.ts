import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { GALLERY_LIMIT, fitWithin, galleryPhotoUrl, isOwnGalleryPath } from "./gallery";

const TECH = "6f1c2b3a-1111-4222-8333-444455556666";

test("a pro may only add files in their own folder", () => {
  assert.ok(isOwnGalleryPath(TECH, `${TECH}/0b8f6d2e-9c1a-4f3b-8e7d-112233445566.jpg`));
  assert.ok(!isOwnGalleryPath(TECH, `other/0b8f6d2e-9c1a-4f3b-8e7d-112233445566.jpg`));
  assert.ok(!isOwnGalleryPath(TECH, `${TECH}/../x.jpg`));
  assert.ok(!isOwnGalleryPath(TECH, `${TECH}/0b8f6d2e-9c1a-4f3b-8e7d-112233445566.png`));
});

test("photos shrink to fit, never grow", () => {
  assert.deepEqual(fitWithin(4032, 3024, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 });
});

test("public URL and the database limit match", () => {
  assert.equal(
    galleryPhotoUrl("https://x.supabase.co/", "a/b.jpg"),
    "https://x.supabase.co/storage/v1/object/public/gallery/a/b.jpg",
  );
  const sql = readFileSync("supabase/migrations/20261023000000_work_gallery.sql", "utf8");
  assert.ok(sql.includes(`>= ${GALLERY_LIMIT} then`));
});
