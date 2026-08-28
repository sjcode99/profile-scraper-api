import { Hono } from "hono";
import { fetchLinkedInProfile } from "../services/linkedin.client.js";
import { extractVanityName } from "../utils/url.js";

const linkedinRoutes = new Hono();

const handleProfileRequest = async (c: any) => {
  let input = c.req.param("*") || "";

  if (!input) {
    const path = c.req.path;
    const marker = "/profile/";
    const index = path.indexOf(marker);
    if (index !== -1) {
      input = path.substring(index + marker.length);
    }
  }

  if (!input) {
    return c.json(
      {
        success: false,
        error: "LinkedIn profile URL required",
      },
      400,
    );
  }

  const vanityName = extractVanityName(input);

  if (!vanityName) {
    return c.json(
      {
        success: false,
        error: "Invalid LinkedIn URL format",
      },
      400,
    );
  }

  const linkedinUrl = `https://www.linkedin.com/in/${vanityName}`;

  try {
    const result = await fetchLinkedInProfile(linkedinUrl);

    if (result.status !== 200) {
      return c.json(
        {
          success: false,
          error: `Failed to fetch LinkedIn profile: ${result.statusText} (${result.status})`,
          response: {
            status: result.status,
            statusText: result.statusText,
          },
        },
        result.status >= 400 && result.status < 600 ? result.status : 500,
      );
    }

    return c.json({
      success: true,
      profile: {
        vanityName,
        linkedinUrl,
        ...result.parsedProfile,
      },
    });
  } catch {
    return c.json(
      {
        success: false,
        error: "Failed to fetch LinkedIn profile",
      },
      500,
    );
  }
};

// Register wildcard routes only
linkedinRoutes.get("/profile/*", handleProfileRequest);
linkedinRoutes.post("/profile/*", handleProfileRequest);

export default linkedinRoutes;
