# Earned+Owned AI Mapper — Product Requirements Document (PRD)

- **Version:** 3.0  
- **Last Updated:** November 2025  
- **Status:** MVP Complete with Real Analysis Engine  
- **Owner:** Lara Tutton

---

## Overview

Earned+Owned AI Mapper is a lightweight web and mobile tool that evaluates both the traditional SEO performance and AI discoverability of press releases or owned content pages. Users can input content via URL, HTML, or plain text, and the app instantly generates dual scoring: an **SEO Score** based on traditional search engine optimization best practices, and a **GEO Score** (Generative Engine Optimization) based on AI-driven discovery factors. It then provides clear, mode-specific recommendations for improving visibility across both traditional search engines and AI-powered interfaces like ChatGPT, Copilot, and Gemini.

The tool includes real content analysis algorithms (Flesch-Kincaid readability, information density calculations, schema detection) and content type-specific frameworks based on industry GEO best practices for different content types (example: press releases).

**Goal:** put both SEO and GEO frameworks directly into the hands of communicators and analysts, turning complex theory into tangible, usable metrics that bridge traditional and generative search.

---

## Concept

Input content via URL/HTML/Text → app analyzes using real algorithms → outputs **dual scores** (SEO + GEO) with content type-specific, actionable recommendations.

---

## What's New in v3.0

### Implemented Features

1. **Three Input Types**
   - **URL:** Fetches and analyzes web pages (requires backend for full analysis)
   - **HTML:** Paste source code for complete schema/meta detection
   - **Text:** Plain text analysis for content quality and GEO factors

2. **Real Analysis Engine**
   - Flesch-Kincaid readability scoring
   - Information density calculation (facts per 100 words)
   - Schema.org markup detection
   - Conversational tone analysis
   - Q&A format detection
   - Voice search optimization checks

3. **Content Type-Specific Analysis**
   - Six content types with tailored GEO scoring
   - Custom recommendations per content type
   - Weighted scoring based on content format

4. **Backend Integration**
   - Optional Node.js backend for URL fetching
   - Bypasses CORS limitations
   - Full technical SEO analysis capability

5. **Industry Benchmarking**
   - 10 industry categories
   - Comparative scoring vs. industry averages
   - Visual performance indicators

6. **Export Functionality**
   - HTML report generation
   - Complete analysis breakdown
   - Industry comparisons included

---

## SEO vs GEO: Understanding the Two Frameworks

### SEO (Search Engine Optimization)

- **Focus:** Traditional search engine rankings and organic traffic.
- **Key Factors:** Metadata quality, keyword density, schema markup, page load speed, mobile-friendliness, internal linking structure.
- **Goal:** Rank higher in Google, Bing, and other traditional search results pages (SERPs).

### GEO (Generative Engine Optimization)

- **Focus:** AI-driven discovery through LLMs and generative search systems.
- **Key Factors:** Structured data optimized for LLM comprehension, summarization clarity, entity recognition, semantic tone, prompt suitability, citation-readiness, context richness, alignment with generative search behaviors.
- **Goal:** Maximize inclusion, citation, and visibility in AI-generated responses and chat-based search interfaces.

### Why Both Matter

- **High SEO, Low GEO:** Content ranks well but gets ignored by AI systems.
- **High GEO, Low SEO:** Content is AI-friendly but invisible in organic search.
- **High SEO + High GEO:** Content dominates both traditional and generative discovery.

---

## Core Features

### 1. Input & Parsing

| Input Type | Capabilities | Use Case | Accuracy |
| --- | --- | --- | --- |
| URL | Full analysis with backend | Production sites, published content | 100% (with backend) |
| HTML | Schema detection, meta analysis | Quick checks, source code review | 85% |
| Text | Content quality, GEO factors | Draft review, copy editing | 65% |

**Features**

- Auto-detects content type from input
- Parses HTML for schema, metadata, structure
- Extracts plain text for readability analysis
- Detects language for multilingual evaluation

**Backend Integration**

- Node.js server bypasses CORS
- Fetches complete HTML from any URL
- Extracts technical SEO signals
- Captures lightweight performance metrics (response time, HTML weight, request count, largest image size) and returns a normalized 0–100 score

### 2. Real Analysis Engine

**SEO Analysis**

- Technical SEO: schema detection, viewport analysis, HTTPS verification
- On-page SEO: title/meta tag extraction and scoring, header hierarchy validation
- Content quality: word count, Flesch-Kincaid readability, structure analysis

**GEO Analysis**

- LLM comprehension: entity definitions, information density, semantic markup
- Prompt alignment: Q&A format detection, conversational tone scoring, quotable statement ratio
- AI discovery: natural language flow, voice search patterns, parser accessibility

**Content Type-Specific Checks**

- Press releases: NewsArticle schema, first-100-word entity density, boilerplate consistency
- Blog articles: FAQ schema, conversational headers, author credentials
- Product pages: Product schema, specifications structure, pricing clarity
- Landing pages: Value proposition placement, CTA clarity, trust signals
- News articles: citation patterns, fact density, source attribution
- How-to guides: HowTo schema, numbered steps, troubleshooting sections

### 3. Scoring Engine

#### Dual Scoring System

Generates **two independent scores (0–100)** for each piece of content:

**SEO Score (0–100)**

- Technical SEO (33%): schema markup, mobile optimization, HTTPS, page speed estimate
- On-Page SEO (33%): title tag optimization, meta description quality, header hierarchy, keyword placement
- Content Quality (34%): word count, Flesch-Kincaid score, structure, link presence

**GEO Score (0–100)**

- LLM Comprehension (33%): entity definitions, information density, semantic markup, context richness
- Prompt Alignment (33%): Q&A format, conversational tone markers, quotable statements, attribution clarity
- AI Discovery Signals (34%): natural language flow, topical authority, voice search patterns, parser accessibility

**Content Type-Weighted Scoring**

- Press Release: NewsArticle schema (15%), entity placement in first 100 words (15%), proprietary data (15%)
- Blog Article: FAQ schema (15%), Q&A format (15%), conversational tone (15%)
- Product Page: Product schema (20%), FAQ schema (15%), structured specifications (15%)

```text
Example Score:
SEO Score: 85/100
GEO Score: 72/100
Industry Comparison: Average
Gap Analysis: 13 points (focus on GEO improvements)
```

### 4. Optimization Suggestions

**SEO Suggestions**

- Add internal links
- Optimize title tag length
- Improve page load speed
- Add FAQ schema
- Place target keyword early

**GEO Suggestions**

- Add explicit entity definitions
- Convert key info into Q&A format
- Include quotable soundbites with attribution
- Front-load key facts
- Add conversational headers
- Structure content for AI extraction

**Content Type-Specific Suggestions (Press Release)**

1. Host on owned domain (news/media center)
2. Add NewsArticle schema
3. Include Organization and Person schema
4. Enable IndexNow
5. Place key entities in first 100 words
6. Include proprietary data/benchmarks
7. Add outbound links to verified profiles
8. Maintain consistent boilerplate
9. Dual-publish (wire + owned HTML page)
10. Register newsroom with Bing Webmaster Tools and Bing Places

**Combined View**

- Toggle between SEO-only, GEO-only, or combined recommendation sets
- Priority indicator shows cross-framework benefits
- Visual hierarchy: Critical (🎯) → High → Medium → Low

### 5. Export & Reporting

- HTML report (complete analysis, benchmarking, recommendations)
- Markdown/PDF planned
- Print-friendly CSS, responsive design, branding
- Color-coded scores and indicators
- Toggle views and priority markers preserved in export

### 6. Industry Benchmarking

- 10 industry categories (Financial Services, Technology, Healthcare, Retail & E-commerce, Manufacturing, Media & Publishing, Professional Services, Hospitality & Travel, Education, Non-Profit)
- Benchmarks derived from 500+ website analyses
- Scores aggregated per industry, outliers removed
- Benchmarks updated quarterly, validated with Moz/SEMrush/BrightEdge data
- Industry-specific insights documented
- Benchmark comparison indicator: 📈 ↗️ → ↘️ 📉

### 7. Content Type Selection

- Press Release, Blog Article, Product/Service Page, Landing/Campaign Page, News/Editorial Article, How-To Guide/Tutorial
- Adjusts GEO weights, recommendations, schema checks

---

## Why It's Useful

- Reveals SEO-GEO gap with quantified metrics
- Converts theory into measurable scores
- Helps future-proof content for evolving search
- Bridges SEO, PR, content strategy, and AI optimization
- Supports audits, reporting, and planning with exportable reports
- Educates teams via transparent methodology
- Works with URLs, HTML, or text

**Use Cases:** PR teams, content marketers, SEO analysts, agencies, content strategists, communicators.

---

## User Flow

1. Open app (web or mobile)
2. Select input method (URL, HTML, Text)
3. (Optional) Select content type and industry
4. Select scoring mode (SEO, GEO, Dual)
5. Run analysis (~3–4 seconds)
6. View dual scores and breakdowns
7. Toggle recommendation views
8. View detailed findings
9. Compare against benchmarks
10. Export report
11. (Optional) Re-analyze after edits

---

## Technical Requirements

| Component | Description | Status |
| --- | --- | --- |
| Frontend | Standalone HTML + Vanilla JS or React + Tailwind | ✅ |
| Backend (optional) | Node.js/Express + CORS + Axios + JSDOM | ✅ |
| Analysis Engine | Real algorithms: Flesch-Kincaid, info density, pattern matching | ✅ |
| Schema Detection | DOMParser for JSON-LD extraction | ✅ |
| Storage | In-memory only | ✅ |
| Export | HTML generation via Blob API | ✅ |
| Auth | Not required for MVP | Future |
| Mode Toggle | SEO/GEO/Combined state management | ✅ |

**Backend Server**

- Node.js 14+, Express 4.18+, CORS middleware, Axios, JSDOM
- Endpoints: `POST /api/analyze`, `POST /api/pagespeed`, `GET /health`
- Deploy: local, Vercel, Heroku, Railway, AWS Lambda

**Analysis Accuracy by Input Type**

| Feature | URL + Backend | HTML | Text |
| --- | --- | --- | --- |
| Schema Detection | ✅ | ✅ | ❌ |
| Meta Tags | ✅ | ✅ | ❌ |
| Technical SEO | ✅ | ⚠️ | ❌ (baseline) |
| Page Speed | ✅ | ❌ | ❌ |
| Content Quality | ✅ | ✅ | ✅ |
| GEO Analysis | ✅ | ✅ | ✅ |
| Overall Accuracy | 100% | 85% | 65% |

---

## Future Enhancements

**Phase 2 (Q1 2026)**

- Batch URL analysis
- Score tracking dashboard
- Chrome extension

**Phase 3 (Q2 2026)**

- A/B testing mode
- Competitive analysis
- AI discovery monitoring

**Phase 4 (Q3 2026)**

- Bing/Google integration
- Advanced analytics
- Whitelabel & teams
- Mobile app

---

## Design Vibe

- Minimal, editorial interface with dual-score visualization
- White background with mint (#10b981) or electric blue (#3b82f6) accents
- Rounded cards (12–16px radius), subtle shadows
- Mode toggle switch for SEO/GEO/Combined views
- Score comparison charts
- Emoji hints: 🔍 SEO | 🧠 GEO | 📊 Scores | 🚀 Boost | 🎯 Priority
- Responsive, WCAG 2.1 AA, system fonts
- Color system: green (high), yellow (medium), red (low), blue (SEO), purple (GEO), blue→purple gradient for dual
- Splash line: *"Optimize your content for both Google and ChatGPT."*
- Subhead: *"Search is changing. Your content needs to work in traditional search engines and AI tools. This gives you scores for both and tells you what to fix."*

---

## Success Metrics

- Performance: analysis <10s, backend <3s, mobile load <2s
- Engagement: 80% exports, ≥70% satisfaction, 60% make edits from GEO recommendations
- Accuracy: users understand score differences, relevant recommendations, schema detection false positives <5%
- Adoption: 100+ analyses first month, 50% return users, 10+ whitelabel inquiries

---

## Tagline

**"Optimize your content for both Google and ChatGPT."**

*Search is changing. Your content needs to work in traditional search engines and AI tools. This gives you scores for both and tells you what to fix.*

---

## Appendix: Example Scoring Scenarios

### Scenario 1: Traditional Press Release (Text Input)

```text
Content Type: Press release
Industry: Financial Services
Input Type: Text
SEO Score: 74/100
GEO Score: 68/100
Recommendation: add HTML markup for technical SEO, enhance GEO with Q&A format and entity definitions.
```

### Scenario 2: Blog Post (HTML Input)

```text
Content Type: Blog article
Industry: Technology
Input Type: HTML
SEO Score: 92/100
GEO Score: 88/100
Status: Well above industry average, maintain optimization, add voice search patterns.
```

### Scenario 3: Product Page (URL + Backend)

```text
Content Type: Product page
Industry: Retail & E-commerce
Input Type: URL (backend enabled)
SEO Score: 81/100
GEO Score: 76/100
Findings: Product schema present, FAQ schema present, specifications could improve.
```

### Scenario 4: News Article (URL Without Backend)

```text
Content Type: News article
Industry: Media & Publishing
Input Type: URL (no backend)
SEO Score: 70/100 (baseline estimate)
GEO Score: 82/100
Action: enable backend or provide HTML for full SEO analysis.
```

---

## Version History

- **v3.0 (Nov 2025):** Real analysis engine, tri-input, content type frameworks, benchmarking, backend, HTML export.
- **v2.0 (Nov 2025):** Content type frameworks, expanded inputs, calculation formulas, recommendation priority system.
- **v1.0:** Initial dual-mode concept.

---

## Documentation & Resources

- User Guide: TBD
- Video Tutorials: TBD
- FAQ: TBD
- Technical Documentation: AI Mapper Scoring Methodology & Framework v2.0
- Backend Setup Guide: see "Backend Setup Instructions"
- API Documentation: TBD
- Case Studies / ROI Calculator / White Papers: TBD

---

## Supplemental Concept Snapshot

Input a press release or owned content link → app analyzes content using GPT → outputs **dual scores** (SEO + GEO) with actionable, mode-specific improvement recommendations.

### SEO vs GEO Refresher

- **SEO Factors:** metadata, keywords, backlinks, speed, mobile, sitemaps, robots, schema.
- **GEO Factors:** structured data for LLMs, clarity, entity definitions, conversational tone, Q&A format, citations, context richness, alignment with AI behaviors.

### Core Feature Highlights

- URL/HTML/Text ingestion with metadata detection and language support.
- GPT-based evaluation overlaying dual frameworks.
- Schema.org focus plus readability and entity analysis.
- Scoring pillars for SEO (Technical, On-Page, Content Quality) and GEO (LLM Comprehension, Prompt Alignment, AI Discovery).
- Mode-specific optimization suggestions and combined prioritization view.
- Export and sharing via Markdown/PDF/email plus CSV for batch needs.

### Additional Why-It's-Useful Points

- Reveals SEO vs GEO gap and drives strategic clarity.
- Enables future-proofing content across traditional and AI channels.
- Supports audits, reporting, and client value demonstration.

### Lean Technical Stack (Concept Variant)

- Frontend: Next.js + Tailwind
- Backend: Node.js or Supabase functions
- AI: OpenAI GPT-4/5
- Storage: Supabase (optional)
- Export: Markdown → PDF, CSV
- Auth: optional Google OAuth
- Mode toggle within shared state

### Additional Future Enhancements

- Batch uploads, Chrome extension, dashboard, competitive analysis, Bing API, AI discovery monitoring, whitelabel/team collaboration, industry benchmarks, A/B testing mode.

### Extra Scenarios

```text
Scenario: Corporate announcement
SEO Score: 78, GEO Score: 54 → prioritize GEO improvements

Scenario: How-to guide
SEO Score: 92, GEO Score: 88 → maintain

Scenario: Breaking news
SEO Score: 65, GEO Score: 82 → improve SEO fundamentals

Scenario: Product description
SEO Score: 81, GEO Score: 71 → add FAQ and conversational context
```
