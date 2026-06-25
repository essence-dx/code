# Build and Deploy Guide

This project is built using the custom DX framework. The build process generates a static set of HTML, CSS, and JS files, but these are designed to be served by a web server, not opened directly as file:// URIs.

## Building

To build the project, run the following command in this directory:

```bash
dx build
```

This will output the static assets to the `.dx/www/output` directory.

## Deploying

The generated files in `.dx/www/output` are ready to be deployed to any static web host (e.g., Vercel, Netlify, Nginx, Apache).

**Important:** If you are trying to view the built site locally by opening `index.html` directly in a browser, it will likely appear broken (e.g., missing styles or functionality). This is because the assets are referenced using absolute paths (e.g., `/styles/whiteboard.css`) which require a web server to resolve correctly.

To view your build locally, use a simple local web server to serve the contents of `.dx/www/output`:

```bash
# Example using Python
cd .dx/www/output
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.
