
require('dotenv').config();
const express = require('express');
const { createServer } = require('vite');
const geminiHandler = require('./api/gemini');

async function start() {
  const app = express();
  const port = process.env.PORT || 5173;

  // Create Vite server in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  // Middleware to parse JSON bodies (Vercel does this automatically, Express needs help)
  app.use(express.json());

  // Mount the API handler manually for local dev
  // This simulates how Vercel routes /api/* requests
  app.post('/api/gemini', async (req, res) => {
    try {
        await geminiHandler(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).end('Internal Server Error');
    }
  });

  // Use Vite's connect instance as middleware
  app.use(vite.middlewares);

  // Serve the HTML for all other routes
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      // 1. Read index.html
      let template = require('fs').readFileSync('index.html', 'utf-8');
      
      // 2. Apply Vite HTML transforms (injects HMR client, etc.)
      template = await vite.transformIndexHtml(url, template);

      // 3. Send back
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(port, () => {
    console.log(`\n  🚀 NeuroVoki Local Server running at http://localhost:${port}\n`);
    console.log(`  🔑 API Key status: ${process.env.API_KEY ? 'Loaded ✅' : 'Missing ❌ (Check .env file)'}\n`);
  });
}

start();
