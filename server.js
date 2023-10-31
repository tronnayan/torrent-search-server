const express = require('express');
const getInfo = require('./torrentSearch.js');
const WebTorrent = require('webtorrent');


const app = express();
const port = 3000;
const client = new WebTorrent();

// Middleware to parse JSON requests
app.use(express.json());

function streamTorrent(torrent, res) {
  console.log('streamTorrent - waiting to start stream');
  console.log('Torrent metaData:', torrent.metadata);

    // Wait for the torrent's metadata to be downloaded
    torrent.on('metadata', () => {
      console.log('Metadata event triggered');
    });
    torrent.on('infoHash', () => {
      console.log('Info Hash event triggered');
    });

    // torrent.on('download', (bytes) => {
    //   console.log('Download event triggered', bytes);
    // });

    torrent.on('error', (err) => {
      console.log('Torrent error:', err);
    });


  torrent.on('ready', () => {
    const file = torrent.files[0];

    if (!file) {
      return res.status(404).send('File not found in the torrent');
    }
    console.log(`file ${file.name}`)
    const range = res.range(file.length);
    if (!range) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', file.length);
      res.setHeader('Content-Type', 'video/mp4');
      if (res.method === 'HEAD') return res.end();
      return file.createReadStream().pipe(res);
    }

    if (Array.isArray(range)) {
      res.statusCode = 206; // Partial Content
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.length}`);
      res.setHeader('Content-Length', range.end - range.start + 1);
      res.setHeader('Content-Type', 'video/mp4');
      const stream = file.createReadStream({ start: range.start, end: range.end });
      stream.pipe(res);
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
      });
    } else {
      res.status(416); // Requested Range Not Satisfiable
      res.setHeader('Content-Range', `bytes */${file.length}`);
      res.end();
    }

    res.on('close', () => {
      console.log('Client disconnected, stopping the stream');
    });
  });
}




// app.get('/search', async (req, res) => {
//   console.log("inside search");
//   const query = req.query.q;
//   if (!query) {
//     return res.status(400).json({ error: 'Query parameter "q" is required' });
//   }
//
//   const limit = parseInt(req.query.limit) || 20;
//   try {
//     const results = await getInfo(query, limit);
//     if (!results.success) {
//       return res.status(404).json({ error: 'No results found' });
//     }
//     res.json(results);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.get('/search', async (req, res) => {
  console.log("Inside search");
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const limit = parseInt(req.query.limit) || 1; // Set limit to 1 if you only need the first result
  try {
    const results = await getInfo(query, limit);
    if (!results || !results.popularTorrents || results.popularTorrents.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const firstTorrent = results.popularTorrents[0];
    const magnetURI = firstTorrent.magnet;

    // Check if torrent is already added
    const existingTorrent = client.get(magnetURI);
    console.log(`magnetURI ${magnetURI}`)
    if (existingTorrent && existingTorrent.ready) {
      console.log('Torrent already added, using the existing torrent');
      streamTorrent(existingTorrent, res);
    }
    else {
      client.add(magnetURI, torrent => {
        console.log('Torrent added, starting to stream');
        console.log('Torrent added:', torrent.infoHash);
        streamTorrent(torrent, res);
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
