import TorrentSearchApi from 'torrent-search-api';

const providers = ["ThePirateBay"];

for (const provider of providers) {
  try {
    TorrentSearchApi.enableProvider(provider);
  } catch (error) {
    console.error(`Failed to enable provider ${provider}:`, error);
  }
}

async function getInfo(query, limit = 20) {
  return TorrentSearchApi.search(query, "All", limit)
    .then((torrents) => {
      if (torrents.length === 0 || torrents[0].title === "No results returned") {
        return { success: false, query, error: "No results found" };
      }
      const popularTorrents = torrents.filter(torrent => torrent.seeds > 5);
      // const sortedTorrents = popularTorrents.sort((a, b) => b.seeds - a.seeds);
      return { success: true, query, popularTorrents };
    })
    .catch((error) => {
      console.error("Torrent search failed:", error);
      return { success: false, query, error: "Search failed" };
    });
}
export default getInfo;

