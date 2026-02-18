# Psicometria Online Blog - CMS & Content Migration System

## Overview
A custom blog CMS recreating blog.psicometrionline.com.br, a psychometrics/quantitative research blog. Features a complete content management system with automated WordPress content migration via crawling. Built with Express + React + PostgreSQL.

## Project Architecture
- **Backend**: Express.js with Drizzle ORM (PostgreSQL)
- **Frontend**: React with Vite, TanStack Query, Wouter routing
- **Auth**: Replit Auth integration for admin access
- **Styling**: Tailwind CSS with shadcn/ui components, blue/academic theme
- **Rich Text**: TipTap editor for post editing
- **Crawling**: Cheerio-based WordPress post extraction

## Key Files
- `shared/schema.ts` - Database schema (posts, categories, tags, many-to-many)
- `server/storage.ts` - Database CRUD operations
- `server/routes.ts` - API endpoints (public + admin)
- `server/crawler.ts` - WordPress post crawler using Cheerio
- `client/src/pages/home.tsx` - Blog home page with post grid
- `client/src/pages/post.tsx` - Individual post page
- `client/src/pages/category.tsx` - Category listing page
- `client/src/pages/tag.tsx` - Tag listing page
- `client/src/pages/search.tsx` - Search results page
- `client/src/pages/admin/dashboard.tsx` - Admin CMS dashboard
- `client/src/pages/admin/post-editor.tsx` - Post editor with TipTap
- `client/src/pages/admin/manage-categories.tsx` - Category management
- `client/src/pages/admin/manage-tags.tsx` - Tag management
- `client/src/pages/admin/crawl.tsx` - WordPress import tool

## Database Schema
- `posts` - Blog posts with title, slug, content, status, featured image
- `categories` - Post categories with slug
- `tags` - Post tags with slug
- `post_categories` - Many-to-many junction table
- `post_tags` - Many-to-many junction table
- Auth tables from Replit Auth integration

## Routes
### Public
- `/` - Home page with paginated posts
- `/post/:slug` - Individual post
- `/categoria/:slug` - Posts by category
- `/tag/:slug` - Posts by tag
- `/busca` - Search page

### Admin (requires Replit Auth)
- `/admin` - Dashboard with post management
- `/admin/post/:id` - Post editor (new or edit)
- `/admin/categorias` - Category management
- `/admin/tags` - Tag management
- `/admin/crawl` - WordPress content importer

## User Preferences
- Portuguese language throughout the UI
- Blue/academic color scheme matching original WordPress blog
- Content in psychometrics and quantitative research domain
