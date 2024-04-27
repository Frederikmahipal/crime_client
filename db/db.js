const { Database, aql } = require('arangojs');
require('dotenv').config();

const db = new Database({
    url: 'http://arangodb:8529',
    databaseName: '_system',
    auth: { username: 'root', password: 'dbpass' },
});

async function handleGetCrimes(req, res) {
    const crimeData = req.body;
    const suspects = crimeData.suspects;
    delete crimeData.suspects;

    const crimesCollection = db.collection('crimes');
    const crimesExists = await crimesCollection.exists();
    if (!crimesExists) {
        await db.createCollection('crimes');
    }

    const crime = await crimesCollection.save(crimeData);

    const suspectsCollection = db.collection('suspects');
    const suspectsExists = await suspectsCollection.exists();
    if (!suspectsExists) {
        await db.createCollection('suspects');
    }

    const crimesCommittedBySuspectsCollection = db.collection('crimes_committed_by_suspects');
    const crimesCommittedBySuspectsExists = await crimesCommittedBySuspectsCollection.exists();
    if (!crimesCommittedBySuspectsExists) {
        await db.createEdgeCollection('crimes_committed_by_suspects');
    }

    for (const suspectData of suspects) {
        const suspect = await suspectsCollection.save(suspectData);
        await crimesCommittedBySuspectsCollection.save({
            _from: crime._id,
            _to: suspect._id
        });
    }

    res.sendStatus(200);
}

async function getCrimes() {
    try {
        const crimesCollection = db.collection('crimes'); 
        const suspectsCollection = db.collection('suspects');
        const crimesCommittedBySuspectsCollection = db.collection('crimes_committed_by_suspects');
        const cursor = await db.query(aql`
            FOR crime IN ${crimesCollection}
                LET suspects = (
                    FOR suspect IN ${suspectsCollection}
                    FILTER suspect._id IN (
                    FOR edge IN ${crimesCommittedBySuspectsCollection}
                    FILTER edge._from == crime._id
                    RETURN edge._to
                )
                RETURN suspect
            )
            RETURN {
                "id": crime._id, // Add this line
                "lat": crime.lat,
                "lon": crime.lon,
                "type": crime.type,
                "description": crime.description,
                "severity": crime.severity,
                "suspects": suspects
            }
        `);

        const crimes = await cursor.all();
       
        return crimes;
    } catch (error) {
        console.error('Error getting crimes from db:', error);
        throw error;
    }
}

module.exports = { db, handleGetCrimes, getCrimes };