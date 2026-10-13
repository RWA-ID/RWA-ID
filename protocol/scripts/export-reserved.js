/**
 * export-reserved.js — write the reserved-namespace list the site renders.
 *
 *   node scripts/export-reserved.js
 *
 * config/reserved-namespaces.js is the single source (it is what deploy-v4.js
 * reserved onchain); the dashboard reads a JSON copy because Vite will not
 * bundle a CommonJS file from outside its root. test/reservedNamespaces.test.js
 * fails if the copy drifts.
 */
const fs = require("fs");
const path = require("path");
const { DISCLAIMER, GROUPS } = require("../config/reserved-namespaces");

const OUT = path.join(__dirname, "../../apps/dashboard/src/lib/reserved.json");

function build() {
  return {
    disclaimer: DISCLAIMER,
    groups: Object.entries(GROUPS).map(([group, rows]) => ({
      group,
      names: rows.map(([slug, company, domain, logo]) => ({ slug, company, domain, logo })),
    })),
  };
}

if (require.main === module) {
  fs.writeFileSync(OUT, JSON.stringify(build(), null, 2) + "\n");
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}

module.exports = { build, OUT };
