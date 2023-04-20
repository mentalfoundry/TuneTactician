const fs = require('fs');
const xml2js = require('xml2js');
const csvWriter = require('csv-writer').createObjectCsvWriter;

// Function to parse the Rekordbox XML file
async function parseRekordboxXML(filePath) {
    const xmlContent = await fs.promises.readFile(filePath, 'utf8');
    return xml2js.parseStringPromise(xmlContent);
}

// Function to analyze the tracks and create a playlist
function createPlaylist(tracks, startTrackPath, jazzyFactor, numberOfSongs) {
    const startTrack = tracks.find(track => track.$.Location === startTrackPath);
    if (!startTrack) {
        throw new Error('Start track not found in the Rekordbox collection.');
    }

    let currentTrack = startTrack;
    const playlist = [currentTrack];

    // Convert jazzy factor into key difference and BPM difference thresholds
    const keyDifferenceThreshold = jazzyFactor / 2; // Adjust this value based on your preference
    const bpmDifferenceThreshold = 5 + jazzyFactor * 2; // Adjust this value based on your preference

    while (playlist.length < numberOfSongs) {
        const remainingTracks = tracks.filter(track => !playlist.includes(track));
        if (remainingTracks.length === 0) {
            break;
        }

        const currentBPM = parseFloat(currentTrack.$.BPM);
        const currentKey = parseInt(currentTrack.$.KeyIndex, 10);

        let bestMatch;
        let bestScore = Infinity;

        for (const track of remainingTracks) {
            const trackBPM = parseFloat(track.$.BPM);
            const trackKey = parseInt(track.$.KeyIndex, 10);

            const bpmDifference = Math.abs(currentBPM - trackBPM);
            const keyDifference = Math.abs(currentKey - trackKey);

            if (bpmDifference <= bpmDifferenceThreshold && keyDifference <= keyDifferenceThreshold) {
                const score = bpmDifference + keyDifference * 2; // Adjust the weights based on your preference
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = track;
                }
            }
        }

        if (bestMatch) {
            playlist.push(bestMatch);
            currentTrack = bestMatch;
        } else {
            break;
        }
    }

    return playlist.map(track => ({
        title: track.$.Name,
        artist: track.$.Artist,
        album: track.$.Album,
        genre: track.$.Genre,
        bpm: track.$.BPM,
        key: track.$.Key,
    }));
}

// Function to save the playlist as a CSV file
async function savePlaylistAsCSV(playlist, fileName) {
    const writer = csvWriter({
        path: fileName,
        header: [
            { id: 'title', title: 'TITLE' },
            { id: 'artist', title: 'ARTIST' },
            { id: 'album', title: 'ALBUM' },
            { id: 'genre', title: 'GENRE' },
            { id: 'bpm', title: 'BPM' },
            { id: 'key', title: 'KEY' },
        ],
    });
    return writer.writeRecords(playlist);
}

async function main() {
    const rekordboxXMLPath = 'path/to/your/rekordbox.xml';
    const startTrackPath = 'path/to/your/start/track';
    const jazzyFactor = 5; // 0 to 10
    const numberOfSongs = 10;

    const rekordboxData = await parseRekordboxXML(rekordboxXMLPath);
    const tracks = rekordboxData.REKORDBOX.COLLECTION[0].TRACK;

    const playlist = createPlaylist(tracks, startTrackPath, jazzyFactor, numberOfSongs);

    await savePlaylistAsCSV(playlist, 'generated-playlist.csv');
    console.log('Playlist generated and saved as generated-playlist.csv');
}

main();
