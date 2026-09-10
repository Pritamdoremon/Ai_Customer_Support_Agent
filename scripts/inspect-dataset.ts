import fs from "fs";
import path from "path";
import csv from "csv-parser";

const filePath = path.join(
  process.cwd(),
  "data",
  "raw",
  "extracted",
  "twcs",
  "twcs.csv",
);

const brandCounts = new Map<string, number>();

fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", (row) => {
    if (row.inbound === "False") {
      const brand = row.author_id;

      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    }
  })
  .on("end", () => {
    const topBrands = [...brandCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 20);

    console.log("\nTop brand/support accounts:\n");

    for (const [brand, count] of topBrands) {
      console.log(`${brand.padEnd(25)} ${count}`);
    }
  })
  .on("error", (error) => {
    console.error("Failed to read dataset:", error);
    process.exitCode = 1;
  });