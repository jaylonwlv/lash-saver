import { test } from "node:test";
import assert from "node:assert/strict";
import { bareHost, isAppHost, servedOnCustomHost } from "./custom-host";

test("hosts are bared of www, port and case", () => {
  assert.equal(bareHost("www.StudioNova.com:443"), "studionova.com");
  assert.equal(bareHost(null), null);
});

test("the app's own hosts are never a pro's domain", () => {
  assert.ok(isAppHost("getdibs.pro", "getdibs.pro"));
  assert.ok(isAppHost("lash-saver.vercel.app", "getdibs.pro"));
  assert.ok(isAppHost("localhost", "getdibs.pro"));
  assert.ok(!isAppHost("studionova.com", "getdibs.pro"));
});

test("a pro's domain serves their page and pay links only", () => {
  assert.ok(servedOnCustomHost("/"));
  assert.ok(servedOnCustomHost("/pay/k7m2x9qa4h"));
  assert.ok(servedOnCustomHost("/_next/static/chunks/a.js"));
  assert.ok(servedOnCustomHost("/api/page-visit"));
  assert.ok(servedOnCustomHost("/api/domain-check"));
  assert.ok(!servedOnCustomHost("/dashboard"));
  assert.ok(!servedOnCustomHost("/login"));
  assert.ok(!servedOnCustomHost("/other-pro"));
});
