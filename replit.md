# Psicometria Online Blog - CMS & Content Migration System

## Overview
This project is a custom Content Management System (CMS) for the Psicometria Online Blog, specializing in psychometrics and quantitative research. It aims to replicate and enhance the functionality of the original WordPress site, providing a robust platform for content creation, management, and automated migration. Key features include a dynamic, magazine-style home page with configurable sections, comprehensive SEO tools, and integrated analytics, positioning it as a leading resource in its field.

## User Preferences
- Portuguese language throughout the UI
- Blue/academic color scheme matching original WordPress blog
- Content in psychometrics and quantitative research domain

## System Architecture
The project employs a full-stack architecture. The backend is built with Express.js and Drizzle ORM for PostgreSQL. The frontend is a React application, using Vite, TanStack Query for data fetching, and Wouter for routing. Tailwind CSS with shadcn/ui components ensures a consistent, academic-themed user interface.

**UI/UX Decisions:**
- **Admin Dashboard:** Unified `/admin` page with tabs for Home, Posts, Categories, Tags, and Database, supporting deep-linking. Shared AdminLayout for consistent navigation. Preview tabs offer live previews of public pages.
- **Color Scheme:** Blue/academic theme consistent with the original WordPress blog.
- **Rich Text Editor:** TipTap editor with custom extensions for KaTeX mathematical equations and a specialized citation box. Includes advanced font formatting, editor shortcuts, and an admin floating edit button on public posts.
- **Code Blocks:** Features line numbers, copy button, configurable starting line numbers, and Atom One Dark syntax highlighting.
- **Image Handling:** Images are stored as base64-encoded binary data in PostgreSQL and as filesystem copies. A fallback system serves images from the database if not found on disk, ensuring resilience.

**Technical Implementations:**
- **Content Management:** Comprehensive admin dashboard for posts with sortable tables, internal link metrics, and dedicated management pages for categories, tags, and authors.
- **Citation System:** Configurable APA-style auto-citation system, automatically appended to posts based on admin settings.
- **Comment Moderation:** WordPress-style comment management with spam detection, status tabs, search, and bulk actions.
- **Suggested & Most Read Posts:** Dynamic content sections based on tags/categories and view counts.
- **Banner System:** 8 unique named banner slots with configurable activation and auto-migration from legacy slots.
- **Subscriber Management:** Lead capture system with admin interface for search, deletion, and CSV export.
- **WordPress Migration:** Custom Cheerio-based crawler supplemented by WP REST API for posts, categories, tags, and comments.
- **Dynamic Header & Footer:** Fully configurable menu items, CTA buttons, social links, and link lists via the CMS.
- **SEO & Readability:** Integrated SEO assistant with real-time analysis, Google search preview, Portuguese grammar/spelling checker (LanguageTool), and Yoast-style inline highlighting for problematic text.
- **Category/Tag Page Sidebars:** Configurable sidebars with academy banners, most-read, and recently posted sections.
- **Dynamic Home Page:** Magazine-style home page with 11 configurable sections.
- **Media Management:** Centralized media library with image browsing, uploading, duplicate detection, and usage tracking.
- **Analytics:** Comprehensive dashboard with unique visitor tracking, referrer tracking, various chart types, and per-post analytics.
- **Container System:** Flexible system for embedding images with rules-based group assignment and intelligent placement.
- **Broken Link Scanner:** Admin tool (Database > Links Quebrados) that scans all published posts, banners, and settings for broken internal/external links. Stores results in `broken_links` table with URL, status code, page context. Handles internal path validation, protocol-relative URLs, query strings, and 405 fallbacks.
- **Authentication:** Admin access secured via Replit Auth with an `admin_users` authorization table. The `isAuthenticated` middleware verifies both OIDC session validity and admin email authorization. Bootstrap: the first user to log in when the table is empty is auto-registered as admin. An "Admins" sub-tab in Database allows managing authorized emails.
- **Post Structure:** Validation requires at least one category and tag; deletion of categories/tags triggers orphan checks.

**Performance Optimizations:**
- **Content Stripping:** Post listing API endpoints exclude the `content` field to reduce response sizes.
- **Database Indexes:** Composite and single-column indexes on `posts.status` and `posts.published_at` for faster queries.

## External Dependencies
- **PostgreSQL:** Primary database.
- **Replit Auth:** For secure administrator authentication.
- **WordPress REST API:** Used for importing categories and tags during content migration.
- **LanguageTool API:** For Portuguese grammar and spelling checks.
- **KaTeX:** For rendering mathematical equations in the rich text editor.