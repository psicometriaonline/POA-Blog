# Psicometria Online Blog - CMS & Content Migration System

## Overview
A custom blog CMS recreating blog.psicometrionline.com.br, a psychometrics/quantitative research blog. Features a complete content management system with automated WordPress content migration via crawling. Built with Express + React + PostgreSQL. Home page has a magazine-style layout with 11 configurable sections.

## Project Architecture
- **Backend**: Express.js with Drizzle ORM (PostgreSQL)
- **Frontend**: React with Vite, TanStack Query, Wouter routing
- **Auth**: Replit Auth integration for admin access
- **Styling**: Tailwind CSS with shadcn/ui components, blue/academic theme
- **Rich Text**: TipTap editor for post editing
- **Crawling**: Cheerio-based WordPress/Elementor post extraction + WP REST API for categories/tags

## Key Files
- `shared/schema.ts` - Database schema (posts, categories, tags, banners, free_materials, site_settings, comments, post_views)
- `server/storage.ts` - Database CRUD operations + home page data aggregation
- `server/routes.ts` - API endpoints (public + admin)
- `server/crawler.ts` - WordPress post crawler using Cheerio
- `client/src/pages/home.tsx` - Magazine-style home page with 11 configurable sections
- `client/src/pages/post.tsx` - Individual post page (two-column layout, breadcrumb, social sharing, comments)
- `client/src/components/hero-bar.tsx` - Reusable hero section (categories dropdown, search, email signup)
- `client/src/pages/category.tsx` - Category listing page
- `client/src/pages/tag.tsx` - Tag listing page
- `client/src/pages/search.tsx` - Search results page
- `client/src/pages/admin/dashboard.tsx` - Admin CMS dashboard
- `client/src/pages/admin/post-editor.tsx` - Post editor with TipTap
- `client/src/pages/admin/manage-categories.tsx` - Category management
- `client/src/pages/admin/manage-tags.tsx` - Tag management
- `client/src/pages/admin/crawl.tsx` - WordPress import tool
- `client/src/pages/admin/home-settings.tsx` - Home page section configuration
- `client/src/pages/admin/manage-authors.tsx` - Author management
- `client/src/pages/admin/analytics.tsx` - Post views analytics with charts and filters
- `client/src/pages/admin/containers.tsx` - Container management (image groups, rules, preview)

## Database Schema
- `authors` - Author profiles (name, photo, bio) - linked to posts via authorId
- `posts` - Blog posts with title, slug, content, status, featured image, viewCount, authorId, disabledContainers (JSON array of heading indices to skip container images)
- `categories` - Post categories with slug
- `tags` - Post tags with slug
- `post_categories` - Many-to-many junction table
- `post_tags` - Many-to-many junction table
- `banners` - Configurable banner ads (sidebar/horizontal slots)
- `free_materials` - Downloadable materials section
- `comments` - Post comments (authorName, authorEmail, content, isApproved)
- `post_views` - Individual post view events with timestamps (for analytics)
- `image_groups` - Groups of images for container system (name, description)
- `image_bank_items` - Individual images in groups (groupId, imageUrl, altText, title, isActive, sortOrder)
- `container_rules` - Rules mapping image groups to containers based on criteria (containerType, criteriaType, criteriaValue, imageGroupId, maxImages, priority, linkUrl)
- `site_settings` - Key-value store for home page configuration
- Auth tables from Replit Auth integration

## Home Page Sections (configurable from admin)
1. Hero banner with headline, subtitle, email signup
2. Recent posts grid (4 posts) + sidebar banners
3. Horizontal banner
4. Featured category section (admin-selected)
5. Newsletter signup
6. Most read posts (by viewCount) + category navigation
7. Diverse categories (up to 3 admin-selected)
8. "You may also like" random posts
9. Row category sections (2 admin-selected)
10. Free materials download section

## Routes
### Public
- `/` - Home page with magazine layout
- `/:slug` - Individual post (SEO-friendly, no /post/ prefix, matches original WP URLs)
- `/categoria/:slug` - Posts by category
- `/tag/:slug` - Posts by tag
- `/busca` - Search page

### Admin (requires Replit Auth)
- `/admin` - Dashboard with post management
- `/admin/post/:id` - Post editor (new or edit)
- `/admin/categorias` - Category management
- `/admin/tags` - Tag management
- `/admin/crawl` - WordPress content importer
- `/admin/home` - Home page section configuration
- `/admin/autores` - Author management
- `/admin/metricas` - Post views analytics dashboard
- `/admin/conteineres` - Container management (image groups, rules, preview)

### API
- `GET /api/home` - Aggregated home page data (all sections in one request)
- `GET /api/banners?slot=` - Public banners (active only)
- `GET /api/posts/:id/most-read-category?categoryId=` - Top 3 most-read in category
- `GET /api/posts/:id/comments` - Comments for a post
- `POST /api/posts/:id/comments` - Create comment (authorName, authorEmail, content)
- `GET/POST/PUT/DELETE /api/admin/banners` - Banner CRUD
- `GET/POST/PUT/DELETE /api/admin/materials` - Free materials CRUD
- `GET /api/authors` - Public authors list
- `POST/PUT/DELETE /api/admin/authors` - Author CRUD
- `GET/PUT /api/admin/settings` - Site settings (key-value)
- `GET /api/admin/analytics/timeseries?start=&end=&granularity=` - View time series (hourly/daily/monthly)
- `GET /api/admin/analytics/posts?start=&end=&sort=` - Post views summary
- `GET/POST/PUT/DELETE /api/admin/image-groups` - Image group CRUD
- `GET/POST/PUT/DELETE /api/admin/image-bank` - Image bank item CRUD
- `GET/POST/PUT/DELETE /api/admin/container-rules` - Container rule CRUD
- `GET /api/posts/:id/container-images` - Resolved container images for a post
- `POST /api/admin/upload` - File upload (multipart, stores in uploads/ dir, returns URL)

## User Preferences
- Portuguese language throughout the UI
- Blue/academic color scheme matching original WordPress blog
- Content in psychometrics and quantitative research domain
