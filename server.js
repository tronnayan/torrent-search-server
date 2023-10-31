import express from 'express';
import getInfo from './torrentSearch.js'; // Make sure to use the correct relative path

const app = express();
const port = 3000;
import WebTorrent from 'webtorrent';
const client = new WebTorrent();

app.use(express.json());

function streamTorrent(torrent, res) {
  console.log(`streamTorrent - waiting to start stream`)
  // Wait for the torrent's metadata to be downloaded
  torrent.on('ready', () => {
    const file = torrent.files.find(file => file.name.endsWith('.mp4')) || torrent.files[0]; // Find an mp4 file or just take the first file

    if (!file) {
      return res.status(404).send('File not found in the torrent');
    }

    res.setHeader('Content-Type', 'video/mp4');
    const stream = file.createReadStream();
    stream.pipe(res);

    res.on('close', () => {
      console.log('Client disconnected, stopping the stream');
      stream.destroy();
    });
  });
}


// app.get('/search', async (req, res) => {
//   console.log("Inside search");
//   const query = req.query.q;
//   if (!query) {
//     return res.status(400).json({ error: 'Query parameter "q" is required' });
//   }
//
//   const limit = parseInt(req.query.limit) || 1; // Set limit to 1 if you only need the first result
//   try {
//     const results = await getInfo(query, limit);
//     if (!results || !results.torrents || results.torrents.length === 0) {
//       return res.status(404).json({ error: 'No results found' });
//     }
//
//     const firstTorrent = results.torrents[0];
//     const magnetURI = firstTorrent.magnet;
//
//     // Check if torrent is already added
//     const existingTorrent = client.get(magnetURI);
//     console.log(`magnetURI ${magnetURI}`)
//     if (existingTorrent && existingTorrent.ready) {
//       console.log('Torrent already added, using the existing torrent');
//       streamTorrent(existingTorrent, res);
//     }
//     else {
//       client.add(magnetURI, torrent => {
//         console.log('Torrent added, starting to stream');
//         streamTorrent(torrent, res);
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


app.get('/search', async (req, res) => {
  console.log("inside search");
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const limit = parseInt(req.query.limit) || 20;
  try {
    const results = await getInfo(query, limit);
    if (!results.success) {
      return res.status(404).json({ error: 'No results found' });
    }
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

