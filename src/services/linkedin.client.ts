export interface LinkedInResponse {
  status: number;
  statusText: string;
  finalUrl: string;
  contentType: string | null;
  headers: Record<string, string>;
  htmlLength: number;
  parsedProfile: ParsedProfile | null;
}

export interface ParsedProfile {
  name: string;
  headline: string;
  location: string;
  about: string;
  profileImage: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    duration: string;
  }>;
  skills: string[];
  certifications: string[];
  languages: string[];
}

export async function fetchLinkedInProfile(
  url: string,
): Promise<LinkedInResponse> {
  // Use browser-like headers to avoid the 999 Request Denied error
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Ch-Ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  const html = await response.text();

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let parsedProfile: ParsedProfile | null = null;

  if (response.status === 200) {
    parsedProfile = parseProfileHtml(html);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    headers,
    htmlLength: html.length,
    parsedProfile,
  };
}

interface JSONLDAddress {
  addressLocality?: string;
  addressCountry?: string;
}

interface JSONLDRoleMember {
  startDate?: string | number;
  endDate?: string | number;
  roleName?: string;
}

interface JSONLDOrganization {
  name?: string;
  member?: JSONLDRoleMember;
}

interface JSONLDEducation {
  name?: string;
  member?: JSONLDRoleMember;
}

interface JSONLDPerson {
  name?: string;
  description?: string;
  address?: JSONLDAddress;
  jobTitle?: string | string[];
  worksFor?: JSONLDOrganization | JSONLDOrganization[];
  alumniOf?: JSONLDEducation | JSONLDEducation[];
  awards?: string | string[] | Array<{ name?: string }>;
  knowsLanguage?: string | string[] | Array<{ name?: string }>;
  image?: string | { contentUrl?: string };
}

export function parseProfileHtml(html: string): ParsedProfile {
  let personData: JSONLDPerson | null = null;

  // 1. Find and parse the application/ld+json blocks
  const regexLdJson =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regexLdJson.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed["@type"] === "Person") {
        personData = parsed;
        break;
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        const found = parsed["@graph"].find((x) => x["@type"] === "Person");
        if (found) {
          personData = found;
          break;
        }
      } else if (Array.isArray(parsed)) {
        const found = parsed.find((x) => x["@type"] === "Person");
        if (found) {
          personData = found;
          break;
        }
      }
    } catch {}
  }

  // 2. Extract profile fields
  let name = personData?.name || "";
  if (!name) {
    const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : "";
  }

  let headline = personData?.description || "";
  if (!headline) {
    const headlineMatch = html.match(
      /<p[^>]*class="[^"]*(?:title|headline)[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    );
    headline = headlineMatch
      ? headlineMatch[1]
          .replace(/<[^>]+>/g, "")
          .trim()
          .replace(/\s+/g, " ")
      : "";
  }

  let location = "";
  if (personData?.address) {
    const locality = personData.address.addressLocality || "";
    const country = personData.address.addressCountry || "";
    location = [locality, country].filter(Boolean).join(", ");
  } else {
    const locationMatch = html.match(
      /<p[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    );
    location = locationMatch
      ? locationMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";
  }

  // Extract Profile Image
  let profileImage = "";
  if (personData?.image) {
    if (typeof personData.image === "string") {
      profileImage = personData.image;
    } else if (personData.image.contentUrl) {
      profileImage = personData.image.contentUrl;
    }
  }
  if (!profileImage) {
    // Match any image with classes like profile-photo, avatar, photo, etc.
    const imgMatch = html.match(
      /<img[^>]*class="[^"]*(?:profile-photo|avatar|photo|image)[^"]*"[^>]*src="([^"]*)"/i,
    );
    profileImage = imgMatch ? imgMatch[1] : "";
  }

  // Extract About from HTML (since JSON-LD may be truncated)
  let about = personData?.description || "";
  const aboutHtmlMatch = html.match(
    /<h2[^>]*>\s*(?:About|Summary)\s*<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  );
  if (aboutHtmlMatch) {
    const text = aboutHtmlMatch[1]
      .replace(/<[^>]+>/g, "")
      .trim()
      .replace(/\s+/g, " ");
    if (text && text.length > about.length) {
      about = text;
    }
  }

  // Extract Experience
  const experience: Array<{
    title: string;
    company: string;
    duration: string;
  }> = [];
  if (personData?.worksFor) {
    const works = Array.isArray(personData.worksFor)
      ? personData.worksFor
      : [personData.worksFor];
    works.forEach((org: JSONLDOrganization, index: number) => {
      const company = org.name || "";
      let title = "Professional Role";
      if (personData.jobTitle) {
        if (Array.isArray(personData.jobTitle)) {
          title = personData.jobTitle[index] || personData.jobTitle[0] || title;
        } else if (typeof personData.jobTitle === "string") {
          title = personData.jobTitle;
        }
      }

      let duration = "Present";
      if (org.member?.startDate) {
        const start = org.member.startDate;
        const end = org.member.endDate || "Present";
        duration = `${start} - ${end}`;
      }
      experience.push({ title, company, duration });
    });
  }

  // Fallback Experience parsing from HTML elements
  if (experience.length === 0) {
    const expSectionMatch = html.match(
      /<h[2-3][^>]*>[^<]*Experience[^<]*<\/h[2-3]>([\s\S]*?)(?:<\/section>|<h[1-3])/i,
    );
    if (expSectionMatch) {
      const expListHtml = expSectionMatch[1];
      const itemRegex =
        /<article[^>]*>([\s\S]*?)<\/article>|<div[^>]*class="[^"]*timeline-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(expListHtml)) !== null) {
        const itemHtml = itemMatch[1] || itemMatch[2] || "";
        if (!itemHtml) continue;

        const companyMatch = itemHtml.match(
          /<span[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/span>|<h4[^>]*>([\s\S]*?)<\/h4>/i,
        );
        const company = companyMatch
          ? (companyMatch[1] || companyMatch[2])
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "Unknown Company";

        const titleMatch = itemHtml.match(
          /<div[^>]*class="[^"]*role[^"]*"[^>]*>([\s\S]*?)<\/div>|<h3[^>]*>([\s\S]*?)<\/h3>/i,
        );
        const title = titleMatch
          ? (titleMatch[1] || titleMatch[2])
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "Professional Role";

        const durationMatch = itemHtml.match(
          /<span[^>]*class="[^"]*meta[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
        );
        const duration = durationMatch
          ? durationMatch[1]
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "Present";

        experience.push({ title, company, duration });
      }
    }
  }

  // Extract Education
  const education: Array<{ school: string; degree: string; duration: string }> =
    [];
  if (personData?.alumniOf) {
    const alumni = Array.isArray(personData.alumniOf)
      ? personData.alumniOf
      : [personData.alumniOf];
    alumni.forEach((edu: JSONLDEducation) => {
      const school = edu.name || "";
      const degree = edu.member?.roleName || "Student / Graduate";
      let duration = "";
      if (edu.member?.startDate) {
        const start = edu.member.startDate;
        const end = edu.member.endDate || "";
        duration = end ? `${start} - ${end}` : `${start}`;
      }
      education.push({ school, degree, duration });
    });
  }

  // Fallback Education parsing from HTML elements
  if (education.length === 0) {
    const eduSectionMatch = html.match(
      /<h[2-3][^>]*>[^<]*Education[^<]*<\/h[2-3]>([\s\S]*?)(?:<\/section>|<h[1-3])/i,
    );
    if (eduSectionMatch) {
      const eduListHtml = eduSectionMatch[1];
      const itemRegex =
        /<article[^>]*>([\s\S]*?)<\/article>|<div[^>]*class="[^"]*timeline-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(eduListHtml)) !== null) {
        const itemHtml = itemMatch[1] || itemMatch[2] || "";
        if (!itemHtml) continue;

        const schoolMatch = itemHtml.match(
          /<span[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/span>|<h4[^>]*>([\s\S]*?)<\/h4>/i,
        );
        const school = schoolMatch
          ? (schoolMatch[1] || schoolMatch[2])
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "Unknown School";

        const degreeMatch = itemHtml.match(
          /<div[^>]*class="[^"]*role[^"]*"[^>]*>([\s\S]*?)<\/div>|<h3[^>]*>([\s\S]*?)<\/h3>/i,
        );
        const degree = degreeMatch
          ? (degreeMatch[1] || degreeMatch[2])
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "Student / Graduate";

        const durationMatch = itemHtml.match(
          /<span[^>]*class="[^"]*meta[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
        );
        const duration = durationMatch
          ? durationMatch[1]
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "";

        education.push({ school, degree, duration });
      }
    }
  }

  // Extract Skills
  const skills: string[] = [];
  const skillsHeaderMatch = html.match(
    /<h[2-3][^>]*>[^<]*Skills[^<]*<\/h[2-3]>([\s\S]*?)(?:<\/section>|<h[1-3]|\Z)/i,
  );
  if (skillsHeaderMatch) {
    const skillListHtml = skillsHeaderMatch[1];
    const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(skillListHtml)) !== null) {
      const text = itemMatch[1]
        .replace(/<[^>]+>/g, "")
        .trim()
        .replace(/\s+/g, " ");
      if (text && !skills.includes(text) && text.length < 60) {
        skills.push(text);
      }
    }
  }

  // Extract Certifications
  const certifications: string[] = [];
  if (personData?.awards) {
    const awards = Array.isArray(personData.awards)
      ? personData.awards
      : [personData.awards];
    awards.forEach((award: string | { name?: string }) => {
      const name = typeof award === "string" ? award : award.name || "";
      if (name && !certifications.includes(name)) {
        certifications.push(name);
      }
    });
  }
  if (certifications.length === 0) {
    const certMatch = html.match(
      /<h[2-3][^>]*>[^<]*(?:Certifications|Licenses)[^<]*<\/h[2-3]>([\s\S]*?)(?:<\/section>|<h[1-3]|\Z)/i,
    );
    if (certMatch) {
      const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(certMatch[1])) !== null) {
        const text = itemMatch[1]
          .replace(/<[^>]+>/g, "")
          .trim()
          .replace(/\s+/g, " ");
        if (text && !certifications.includes(text) && text.length < 150) {
          certifications.push(text);
        }
      }
    }
  }

  // Extract Languages
  const languages: string[] = [];
  if (personData?.knowsLanguage) {
    const langs = Array.isArray(personData.knowsLanguage)
      ? personData.knowsLanguage
      : [personData.knowsLanguage];
    langs.forEach((lang: string | { name?: string }) => {
      const name = typeof lang === "string" ? lang : lang.name || "";
      if (name && !languages.includes(name)) {
        languages.push(name);
      }
    });
  }
  if (languages.length === 0) {
    const langMatch = html.match(
      /<h[2-3][^>]*>[^<]*Languages?[^<]*<\/h[2-3]>([\s\S]*?)(?:<\/section>|<h[1-3]|\Z)/i,
    );
    if (langMatch) {
      const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(langMatch[1])) !== null) {
        const text = itemMatch[1]
          .replace(/<[^>]+>/g, "")
          .trim()
          .replace(/\s+/g, " ");
        if (text && !languages.includes(text) && text.length < 50) {
          languages.push(text);
        }
      }
    }
  }

  return {
    name,
    headline,
    location,
    about,
    profileImage,
    experience,
    education,
    skills,
    certifications,
    languages,
  };
}
