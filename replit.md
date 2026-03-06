# Psicometria Online Blog - CMS & Content Migration System

## Overview
This project is a custom Content Management System (CMS) for the Psicometria Online Blog, dedicated to psychometrics and quantitative research. It aims to replicate and enhance the functionality of the original WordPress site, blog.psicometrionline.com.br, providing a robust platform for content creation, management, and automated migration from WordPress. The blog features a dynamic, magazine-style home page with configurable sections, comprehensive SEO tools, and analytics, striving to be a leading resource in its niche.

## User Preferences
- Portuguese language throughout the UI
- Blue/academic color scheme matching original WordPress blog
- Content in psychometrics and quantitative research domain

## System Architecture
The project utilizes a full-stack architecture. The backend is built with **Express.js** and **Drizzle ORM** for PostgreSQL, handling data storage, API endpoints, and content crawling. The frontend is a **React** application, developed with **Vite**, **TanStack Query** for data fetching, and **Wouter** for routing. **Tailwind CSS** with **shadcn/ui** components ensures a consistent and academic-themed user interface.

Key features include:
- **Content Management:** A comprehensive admin dashboard with a sortable table view for managing posts (columns: Título, Autor, Categorias, Tags, Data, Links Recebidos, Links Enviados, Ações). Internal link metrics track how many other blog posts link to/from each post. All columns support ascending/descending sort, including server-side sorting for link counts, categories (alphabetical by first name), and tags. Categories, tags, and authors in the table are clickable links navigating to their respective management pages. Link counts are clickable, opening a popover listing the specific linked posts with edit links. `GET /api/admin/posts/:id/internal-links` returns `{ inbound: [{id, title, slug}], outbound: [{id, title, slug}] }`. **Category/Tag detail pages** at `/admin/categorias/:slug` and `/admin/tags/:slug` provide mini-analytics per category/tag: total posts, total views, and a sortable table of posts (by title, date, views, inbound/outbound links) with link count popovers.
- **Rich Text Editing:** Integration of **TipTap** editor with custom extensions for mathematical equations (KaTeX) and a specialized citation box.
- **WordPress Migration:** A custom **Cheerio**-based crawler extracts posts from WordPress/Elementor, supplemented by the WP REST API for categories and tags.
- **SEO & Readability:** An integrated SEO assistant, similar to Yoast, provides real-time analysis for focus keywords, meta descriptions, and content optimization (16 SEO checks, 6 readability checks). It includes a Google search preview, a Portuguese grammar/spelling checker using the LanguageTool API, and **Yoast-style inline highlighting** — clicking any readability check (passive voice, sentence length, paragraph length, etc.) highlights all problematic text in the editor with a lilac background using `@tiptap/extension-highlight`.
- **Dynamic Home Page:** A magazine-style home page with 11 configurable sections, allowing administrators to curate content display.
- **Media Management:** A centralized media library supports image browsing, uploading, and management, including duplicate detection and usage tracking.
- **Analytics:** A dashboard provides post view analytics with charts and filters.
- **Container System:** A flexible system for embedding images within post content, allowing for rules-based image group assignment and intelligent placement.
- **Authentication:** Admin access is secured via Replit Auth integration.
- **Post Structure & Validation:** Posts require at least one category and tag. Deletion of categories/tags triggers an orphan check, reassigning affected posts to an "Indefinida" category/tag if necessary.

## External Dependencies
- **PostgreSQL:** Primary database for all application data.
- **Replit Auth:** For secure administrator authentication.
- **WordPress REST API:** Used for importing categories and tags during content migration.
- **LanguageTool API:** Utilized for Portuguese grammar and spelling checks within the post editor.
- **KaTeX:** For rendering mathematical equations in the rich text editor.