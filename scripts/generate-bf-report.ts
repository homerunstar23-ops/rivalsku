import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { getDb } from "../src/lib/db";
import {
  buildBlackFridayIndex,
  buildBlackFridayReport,
  renderBlackFridayReportHtml,
  type BlackFridayReport,
} from "../src/lib/bf-report";

export type SampleDefinition = {
  slug: string;
  title: string;
  brandName: string;
  brandUrl: string;
  category: string;
  description: string;
  competitorDomains: string[];
};

const SAMPLE_DEFINITIONS: SampleDefinition[] = [
  {
    slug: "home-bedding",
    title: "Home & Bedding — Black Friday 2026 Competitor Report",
    brandName: "Sample Linen & Bedding Brand",
    brandUrl: "cultiver.com / ettitude.com vertical",
    category: "Home Goods",
    description:
      "Tracks Coyuchi, SNOWE, Piglet in Bed, Cozy Earth, and Linoto across Nov 20–25: 97% catalog-wide markdowns, early Nov 21 drops, and banner shifts.",
    competitorDomains: [
      "coyuchi.com",
      "snowe.co",
      "pigletinbed.com",
      "cozyearth.com",
      "linoto.com",
    ],
  },
  {
    slug: "apparel-sleepwear",
    title: "Apparel & Sleepwear — Black Friday 2026 Competitor Report",
    brandName: "Sample Sleepwear & Womenswear Brand",
    brandUrl: "lakepajamas.com / christydawn.com vertical",
    category: "Apparel",
    description:
      "Tracks Lunya, Eberjey, Hill House Home, and DÔEN: 37.5%–76% markdowns, 67+ new holiday launches, and full-price vs. flash-sale splits.",
    competitorDomains: [
      "lunya.co",
      "eberjey.com",
      "hillhousehome.com",
      "shopdoen.com",
    ],
  },
  {
    slug: "menswear",
    title: "Menswear — Black Friday 2026 Competitor Report",
    brandName: "Sample Heritage & Performance Menswear Brand",
    brandUrl: "taylorstitch.com / ministryofsupply.com vertical",
    category: "Apparel",
    description:
      "Tracks American Giant, Marine Layer, UNTUCKit, Cuts Clothing, and Alex Mill: 1,821 Nov 24 price cuts, 25% sitewide banners, and 850+ OOS variants.",
    competitorDomains: [
      "american-giant.com",
      "marinelayer.com",
      "untuckit.com",
      "cutsclothing.com",
      "alexmill.com",
    ],
  },
];

function renderPdfFromHtml(htmlPath: string, pdfPath: string): boolean {
  const chromeCandidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  const chrome = chromeCandidates.find((p) => fs.existsSync(p));
  if (!chrome) return false;
  try {
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    execFileSync(
      chrome,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        `--print-to-pdf=${pdfPath}`,
        "--print-to-pdf-no-header",
        `file://${path.resolve(htmlPath)}`,
      ],
      { stdio: "pipe", timeout: 30000 },
    );
    return fs.existsSync(pdfPath);
  } catch (err) {
    console.warn("[RivalSKU] PDF generation skipped:", err);
    return false;
  }
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function main() {
  const db = getDb();
  const buildSnapshot = process.argv.includes("--build-snapshot");

  if (buildSnapshot) {
    const index = buildBlackFridayIndex(db);
    const samples: Array<SampleDefinition & { report: BlackFridayReport }> = [];
    const samplesDir = path.resolve(process.cwd(), "public", "samples");
    fs.mkdirSync(samplesDir, { recursive: true });

    for (const def of SAMPLE_DEFINITIONS) {
      const report = buildBlackFridayReport(db, {
        slug: def.slug,
        title: def.title,
        brandName: def.brandName,
        brandUrl: def.brandUrl,
        category: def.category,
        competitorDomains: def.competitorDomains,
      });
      samples.push({ ...def, report });

      const html = renderBlackFridayReportHtml(report);
      const htmlPath = path.join(samplesDir, `${def.slug}.html`);
      const pdfPath = path.join(samplesDir, `${def.slug}.pdf`);
      fs.writeFileSync(htmlPath, html, "utf8");
      const pdfOk = renderPdfFromHtml(htmlPath, pdfPath);
      console.log(
        `  sample ${def.slug}: ${report.competitors.length} competitors, html=${htmlPath}${pdfOk ? `, pdf=${pdfPath}` : ""}`,
      );
    }

    const outJson = path.resolve(process.cwd(), "src", "data", "bf-2026-snapshot.json");
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(
      outJson,
      JSON.stringify({ index, samples }, null, 2),
      "utf8",
    );
    console.log(`[RivalSKU] Snapshot written to ${outJson}`);
    return;
  }

  const brandName = parseArg("--brand") || "Custom Shopify Brand";
  const brandUrl = parseArg("--brand-url") || "";
  const category = parseArg("--category") || "Apparel";
  const compsRaw = parseArg("--competitors") || "";
  const outHtml = path.resolve(parseArg("--out") || "./bf-report.html");
  const outPdf = parseArg("--pdf") ? path.resolve(parseArg("--pdf")!) : undefined;

  const competitorDomains = compsRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (competitorDomains.length === 0) {
    console.error(
      "Usage:\n  tsx scripts/generate-bf-report.ts --build-snapshot\n  tsx scripts/generate-bf-report.ts --brand 'Taylor Stitch' --category 'Apparel' --competitors 'american-giant.com,marinelayer.com,alexmill.com' --out ./report.html [--pdf ./report.pdf]",
    );
    process.exit(1);
  }

  const report = buildBlackFridayReport(db, {
    slug: "custom",
    title: `${brandName} — Black Friday 2026 Competitor Report`,
    brandName,
    brandUrl: brandUrl || null,
    category,
    competitorDomains,
  });

  const html = renderBlackFridayReportHtml(report);
  fs.mkdirSync(path.dirname(outHtml), { recursive: true });
  fs.writeFileSync(outHtml, html, "utf8");
  console.log(`[RivalSKU] Wrote HTML report to ${outHtml}`);

  if (outPdf) {
    const ok = renderPdfFromHtml(outHtml, outPdf);
    console.log(ok ? `[RivalSKU] Wrote PDF report to ${outPdf}` : "[RivalSKU] PDF generation failed.");
  }
}

main();
