# AIWO Shopify New Page

This project was pulled from the current production Shopify theme.

## Production safety

The production Shopify theme is protected.

Live theme:
- Store: shop-aiwo.myshopify.com
- Theme ID: 149342879926

Never:
- push to Shopify
- publish a Shopify theme
- delete a Shopify theme
- rename a Shopify theme
- run theme share
- run theme dev
- run git push

Only the human operator may run Shopify deployment or preview commands.

## Development scope

We are building ONE new isolated Shopify page.

Do not modify existing production functionality.

Treat existing files as read-only unless explicitly approved.

Especially do not modify:
- layout/theme.liquid
- config/settings_data.json
- config/settings_schema.json
- existing templates
- existing sections
- existing snippets
- existing CSS
- existing JavaScript
- header
- footer
- navigation

## New page files

Prefer creating isolated new files such as:

- templates/page.NEW-PAGE.json
- sections/new-page-*.liquid
- snippets/new-page-*.liquid
- assets/new-page.css
- assets/new-page.js

All page-specific CSS must be scoped to the new page.

Do not add global styles.

Do not change existing selectors or storefront behaviour.

Do not install dependencies without approval.

If the new page requires modification of an existing production file:
STOP and explain what needs to change before editing it.

## Before completion

Always run:
- git status
- git diff

Clearly report:
- new files
- modified existing files
- any production-risk changes

The preferred result is that only newly created page-specific files exist.
