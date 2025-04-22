//HTTP server using MongoDB 
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');


const MONGO_URI = 'mongodb+srv://sridhanvi07:webProgramming101@publiccompanies.j0ees6h.mongodb.net/';
const DB_NAME   = 'Stock';
const COLL_NAME = 'PublicCompanies';

// Serve static index.html
function serveIndex(res) {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

// Handle the /process?query request
async function handleProcess(reqUrl, res) {
  const { query } = url.parse(reqUrl, true);
  const userInput = (query.query || '').trim();
  const type     = query.type;

  if (!userInput || !type) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Missing query or type');
  }

  // Buildingg Mongo filter
  const filter =
    type === 'ticker'
      ? { ticker: userInput.toUpperCase() }
      : { company: { $regex: userInput, $options: 'i' } };

  let client;
  try {
    client = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLL_NAME);

    const results = await collection.find(filter).toArray();
    console.log('Matches:', results);

    // Build HTML response
    let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Results</title></head><body>`;
    html += `<h1>Search Results for "${userInput}" (${type})</h1><ul>`;
    if (results.length > 0) {
      results.forEach(doc => {
        html += `<li>${doc.company} (${doc.ticker}): $${doc.price}</li>`;
      });
    } else {
      html += '<li>No matches found.</li>';
    }
    html += `</ul><p><a href="/">New Search</a></p></body></html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } catch (err) {
    console.error('Error during processing:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  } finally {
    if (client) await client.close();
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname === '/') {
    serveIndex(res);
  } else if (parsed.pathname === '/process') {
    handleProcess(req.url, res);
  } else if (parsed.pathname.endsWith('.js')) {
    const jsPath = path.join(__dirname, parsed.pathname);
    fs.readFile(jsPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
