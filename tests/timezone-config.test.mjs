import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("Docker images and Compose default to Asia/Bangkok", () => {
  for (const path of ["Dockerfile", "Dockerfile.dev"]) {
    const source = read(path);
    assert.match(source, /ENV TZ=Asia\/Bangkok/);
    assert.match(source, /apk add --no-cache[^\n]*tzdata/);
  }

  for (const path of [
    "docker-compose.yml",
    "docker-compose.dev.yml",
    "docker-compose.server.yml",
  ]) {
    assert.match(read(path), /TZ: \$\{TZ:-Asia\/Bangkok\}/);
  }
});

test("environment templates and server guide configure Bangkok time with NTP", () => {
  assert.match(read(".env.example"), /^TZ=Asia\/Bangkok$/m);
  assert.match(read(".env.server.example"), /^TZ=Asia\/Bangkok$/m);

  const guide = read("SERVER_INSTALL.md");
  assert.match(guide, /timedatectl set-timezone Asia\/Bangkok/);
  assert.match(guide, /timedatectl set-ntp true/);
});
