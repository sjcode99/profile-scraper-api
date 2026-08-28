// src/run_tests.ts
import * as fs from "fs";
import * as path from "path";

import { parseProfileHtml } from "./services/linkedin.client.js";

function verifyParser() {
  const filePath = path.join(process.cwd(), "src", "test_profile.html");

  if (!fs.existsSync(filePath)) {
    console.error(`Please create the mock HTML file at: ${filePath}`);
    return;
  }

  const mockHtml = fs.readFileSync(filePath, "utf8");

  console.log("Running parser on mock HTML...");
  const profile = parseProfileHtml(mockHtml);

  console.log("\n--- Parsed Profile Result ---");
  console.log(JSON.stringify(profile, null, 2));

  // Print verification summary
  console.log("\n✅ Extracted Data Summary:");
  console.log(`Name: ${profile.name || "N/A"}`);
  console.log(`Headline: ${profile.headline || "N/A"}`);
  console.log(`Location: ${profile.location || "N/A"}`);
  console.log(`Profile Image: ${profile.profileImage || "N/A"}`);
  console.log(
    `About: ${profile.about ? profile.about.slice(0, 100) + "..." : "N/A"}`,
  );

  console.log(`\nExperience (${profile.experience.length} items):`);
  profile.experience.forEach((exp) => {
    console.log(` - ${exp.title} at ${exp.company} (${exp.duration})`);
  });

  console.log(`\nEducation (${profile.education.length} items):`);
  profile.education.forEach((edu) => {
    console.log(` - ${edu.degree} at ${edu.school} (${edu.duration})`);
  });

  console.log(`\nSkills (${profile.skills.length} items):`);
  console.log(` - ${profile.skills.join(", ") || "None"}`);
  console.log(`\nCertifications (${profile.certifications.length} items):`);
  console.log(` - ${profile.certifications.join(", ") || "None"}`);
  console.log(`\nLanguages (${profile.languages.length} items):`);
  console.log(` - ${profile.languages.join(", ") || "None"}`);
}

verifyParser();
