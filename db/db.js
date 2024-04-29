const { Database, aql } = require('arangojs');
require('dotenv').config();

const db = new Database({
    url: 'http://arangodb:8529',
    databaseName: '_system',
    auth: { username: 'root', password: 'dbpass' },
});

async function checkDuplicateCollection(collectionName, isEdge = false) {
    const collection = db.collection(collectionName);
    const exists = await collection.exists();
    if (!exists) {
        if (isEdge) {
            await db.createEdgeCollection(collectionName);
        } else {
            await db.createCollection(collectionName);
        }
    }
    return collection;
}

async function handleGetCrimes(req, res) {
    const crimeData = req.body;

    const suspects = crimeData.suspects;
    delete crimeData.suspects;

    const crimeScene = crimeData.crimeScene;
    delete crimeData.crimeScene;

    const crimesCollection = await checkDuplicateCollection('crimes');
    const metadata = await crimesCollection.save(crimeData);
    const crime = await crimesCollection.document(metadata._key);

    const crimeScenesCollection = await checkDuplicateCollection('crime_scenes');
    const crimeSceneMetadata = await crimeScenesCollection.save(crimeScene);
    const storedCrimeScene = await crimeScenesCollection.document(crimeSceneMetadata._key);

    const crimesAtScenesCollection = await checkDuplicateCollection('crimes_at_scenes', true);
    await crimesAtScenesCollection.save({
        _from: crime._id,
        _to: storedCrimeScene._id
    });

    const suspectsCollection = await checkDuplicateCollection('suspects');
    const crimesCommittedBySuspectsCollection = await checkDuplicateCollection('crimes_committed_by_suspects', true);

    for (const suspectData of suspects) {
        let suspect;
        // Check if the suspect already exists in the database
        const cursor = await db.query(aql`
            FOR suspect IN ${suspectsCollection}
            FILTER suspect.name == ${suspectData.name}
            RETURN suspect
        `);
        const existingSuspect = await cursor.next();
        if (existingSuspect) {
            // If the suspect already exists, use their existing _id
            suspect = existingSuspect;
        } else {
            // If the suspect doesn't exist, create a new document in the suspects collection
            const savedSuspect = await suspectsCollection.save(suspectData);
            suspect = await suspectsCollection.document(savedSuspect._key);
        }
    
        // Check if a relation already exists 
        const relationshipCursor = await db.query(aql`
            FOR edge IN ${crimesCommittedBySuspectsCollection}
            FILTER edge._from == ${crime._id} AND edge._to == ${suspect._id}
            RETURN edge
        `);
        const existingRelationship = await relationshipCursor.next();
    
        //create a new one if not
        if (!existingRelationship) {
            await crimesCommittedBySuspectsCollection.save({
                _from: crime._id,
                _to: suspect._id
            });
        }
    }

    res.sendStatus(200);
}


async function getCrimes() {
    try {
        const crimesCollection = db.collection('crimes');
        const crimesAtScenesCollection = db.collection('crimes_at_scenes');
        const suspectsCollection = db.collection('suspects');
        const crimesCommittedBySuspectsCollection = db.collection('crimes_committed_by_suspects');
        const cursor = await db.query(aql`
            FOR crime IN ${crimesCollection}
                LET crimeScene = FIRST(
                    FOR scene, edge IN 1..1 OUTBOUND crime ${crimesAtScenesCollection}
                    RETURN scene
                )
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
                    "id": crime._id,
                    "lat": crime.lat,
                    "lon": crime.lon,
                    "type": crime.type,
                    "category": crime.category,
                    "description": crime.description,
                    "severity": crime.severity,
                    "crimeScene": crimeScene,
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

async function resetData() {
    const collections = await db.listCollections();
    for (const collection of collections) {
        const collectionInstance = db.collection(collection.name);
        await collectionInstance.drop();
    }
    console.log('All collections deleted.');
}

module.exports = { db, handleGetCrimes, getCrimes, resetData, checkDuplicateCollection };