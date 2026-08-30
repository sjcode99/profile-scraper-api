# LinkedIn Profile Scraper API

A lightweight Hono and TypeScript API designed to scrape and parse LinkedIn public profiles. It supports extraction of detailed professional information using both structured JSON-LD data and raw HTML fallback parsing.

---

## Features

- **HTTP Bypass:** Mimics browser requests using realistic headers to decrease the likelihood of triggering LinkedIn's anti-bot blocks.
- **JSON-LD Parsing:** Primary extraction method targeting embedded `application/ld+json` (`Person` schema).
- **HTML Fallback Parsing:** In the absence of JSON-LD data, scans the HTML structure directly (supporting common styles like public resumes).
- **Extracted Fields:**
  - Basic Info: Name, Headline, Location, About summary, and Profile Image URL.
  - Lists: Experience, Education, Skills, Certifications, and Languages.
- **Dual API Routes:** Supports both `GET` and `POST` methods for easy testing.
- **Strict Type-Safety:** Pure TypeScript implementation with zero `any` types.

---

## Setup & Installation

### Prerequisites

- Node.js (v18+)
- npm

### 1. Install Dependencies

Run the following command to install the required packages:

```bash
npm install
```

### 2. Run the Development Server

Starts the Hono dev server with hot-reloading enabled (using `tsx watch`):

```bash
npm run dev
```

The server will start running on **`http://localhost:3000`**.

### 3. Production Build & Start

Compile the TypeScript code to JavaScript and run the server:

```bash
npm run build
npm run start
```

---

## API Documentation

### Get Profile Data

Fetches and parses a public LinkedIn profile using a vanity name or full profile URL.

- **Endpoint:** `/api/profile/*`
- **Methods:** `GET` | `POST`
- **Headers:** `Content-Type: application/json`

The endpoint automatically extracts the vanity name from a wide variety of formats. You can pass:

**URL without protocol:** `www.linkedin.com/in/williamhgates`

#### Request Examples:

- **Via GET (Browser or Postman):**

  ```text
  // Using URL without protocol
  GET http://localhost:3000/api/profile/www.linkedin.com/in/satyanadella
  ```

#### Example Response (Success - 200 OK)

```json
{
  "success": true,
  "profile": {
    "vanityName": "janedoe",
    "linkedinUrl": "https://www.linkedin.com/in/janedoe",
    "name": "Jane Doe",
    "headline": "Software Engineer | Frontend Developer | React, TypeScript, Node.js",
    "location": "San Francisco, California, United States",
    "about": "Passionate Software Engineer with 5+ years of experience building modern web applications...",
    "profileImage": "https://media.licdn.com/dms/image/example",
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Acme Corp",
        "duration": "Jan 2022 - Present"
      },
      {
        "title": "Junior Developer",
        "company": "TechStart Inc",
        "duration": "Jun 2020 - Dec 2021"
      }
    ],
    "education": [
      {
        "school": "State University",
        "degree": "Bachelor of Science, Computer Science",
        "duration": "2016 - 2020"
      }
    ],
    "skills": ["JavaScript", "TypeScript", "React", "Node.js"],
    "certifications": ["AWS Certified Cloud Practitioner"],
    "languages": ["English", "Spanish"]
  }
}
```

---

## Testing Offline

To verify the HTML parsing logic without hitting LinkedIn's live servers (preventing rate limit blocks), you can run the offline test suite:

```bash
npx tsx src/run_tests.ts
```

This reads [`src/test_profile.html`](file:///c:/Users/Suraj/Desktop/tross/src/test_profile.html) and prints a summary of the extracted data to ensure all selectors are operating correctly.

### Testing with your own LinkedIn Profile:

1. **Download your LinkedIn profile as a PDF:** Go to your LinkedIn profile page, click **More** in the header, and select **Save to PDF**.
2. **Convert the PDF to HTML:** Use any online PDF-to-HTML converter or AI tool to convert your downloaded PDF file into an HTML file.
3. **Set up the test file:** Replace the contents of [`src/test_profile.html`](file:///c:/Users/Suraj/Desktop/tross/src/test_profile.html) with your converted HTML code.
4. Run the test script again to verify the extraction works on your layout.

---

## Known Limitations

1.  **Request Denials (Status Code 999):**
    LinkedIn implements aggressive security at the edge (Akamai/custom firewalls). Direct server requests (especially from cloud/datacenter IP ranges) are highly susceptible to receiving a `999 Request denied` status code.
    - _Remediation:_ For production environments, route requests through premium residential proxy services or utilize rotating User-Agents.
2.  **Data Masking:**
    For certain profiles (depending on individual privacy settings), LinkedIn masks current job titles, company names, or other details with asterisks (e.g., `******`) for logged-out / guest views.
3.  **Layout Stability:**
    The HTML fallback parser relies on regular expressions matching specific section headings and list structures. If LinkedIn rolls out layout updates to guest-view headers or lists, these selectors may require adjustments.
