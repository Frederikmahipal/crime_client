require('dotenv').config();
const { Database, aql } = require('arangojs');

const db = new Database({
    url: process.env.DB_URL,
    databaseName: process.env.DB_NAME,
    auth: { username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD },
    logger: console,
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

async function initializeCollections() {
    await checkDuplicateCollection('crimes');
    await checkDuplicateCollection('crime_scenes');
    await checkDuplicateCollection('crimes_at_scenes', true);
    await checkDuplicateCollection('suspects');
    await checkDuplicateCollection('crimes_committed_by_suspects', true);
}
initializeCollections().catch(console.error);

async function handleGetCrimes(req, res) {
    const crimesData = req.body;
    const trx = await db.beginTransaction(['crimes', 'crime_scenes', 'suspects', 'crimes_at_scenes', 'crimes_committed_by_suspects']);

    try {
        for (const crimeData of crimesData) {
            const suspects = crimeData.suspects;
            delete crimeData.suspects;

            const crimeScene = crimeData.crimeScene;
            delete crimeData.crimeScene;

            // Check if the crime already exists 
            const crimesCollection = await checkDuplicateCollection('crimes');
            const cursor = await trx.step(() =>
                db.query(aql`
                    FOR crime IN ${crimesCollection}
                    FILTER crime.lat == ${crimeData.lat} AND crime.lon == ${crimeData.lon}
                    RETURN crime
                `)
            );
            const existingCrime = await cursor.next();

            if (existingCrime) {
                // If the crime already exists, skip 
                continue;
            }

            const metadata = await trx.step(() => crimesCollection.save(crimeData));
            const crime = await trx.step(() => crimesCollection.document(metadata._key));

            const crimeScenesCollection = await checkDuplicateCollection('crime_scenes');
            const crimeSceneMetadata = await trx.step(() => crimeScenesCollection.save(crimeScene));
            const storedCrimeScene = await trx.step(() => crimeScenesCollection.document(crimeSceneMetadata._key));

            const crimesAtScenesCollection = await checkDuplicateCollection('crimes_at_scenes', true);
            await trx.step(() => crimesAtScenesCollection.save({
                _from: crime._id,
                _to: storedCrimeScene._id
            }));

            const suspectsCollection = await checkDuplicateCollection('suspects');
            const crimesCommittedBySuspectsCollection = await checkDuplicateCollection('crimes_committed_by_suspects', true);

            for (const suspectData of suspects) {
                let suspect;
                // Check if the suspect already exists in the database
                const cursor = await trx.step(() =>
                    db.query(aql`
                        FOR suspect IN ${suspectsCollection}
                        FILTER suspect.name == ${suspectData.name}
                        RETURN suspect
                    `)
                );
                const existingSuspect = await cursor.next();
                if (existingSuspect) {
                    // If the suspect already exists, use their existing id
                    suspect = existingSuspect;
                } else {
                    // If the suspect doesn't exist, create a new document in the suspects collection
                    const savedSuspect = await trx.step(() => suspectsCollection.save(suspectData));
                    suspect = await trx.step(() => suspectsCollection.document(savedSuspect._key));
                }

                // Check if a relation already exists 
                const relationshipCursor = await trx.step(() =>
                    db.query(aql`
                        FOR edge IN ${crimesCommittedBySuspectsCollection}
                        FILTER edge._from == ${crime._id} AND edge._to == ${suspect._id}
                        RETURN edge
                    `)
                );

                const existingRelationship = await relationshipCursor.next();
                // Create a new one if not
                if (!existingRelationship) {
                    await trx.step(() => crimesCommittedBySuspectsCollection.save({
                        _from: crime._id,
                        _to: suspect._id
                    }));
                }
            }
        }

        await trx.commit();
        res.sendStatus(200);
    } catch (error) {
        await trx.abort();
        console.error("Failed to process crimes:", error);
        res.status(500).send("Internal Server Error");
    }
}


async function getAllSuspects() {
    try {
        const suspectsCollection = db.collection('suspects');
        const crimesCommittedBySuspectsCollection = db.collection('crimes_committed_by_suspects');
        const crimesCollection = db.collection('crimes');
        const cursor = await db.query(aql`
                FOR suspect IN ${suspectsCollection}
                    LET crimes = (
                        FOR crime IN ${crimesCollection}
                        FILTER crime._id IN (
                            FOR edge IN ${crimesCommittedBySuspectsCollection}
                            FILTER edge._to == suspect._id
                            RETURN edge._from
                        )
                        RETURN crime
                    )
                    RETURN MERGE(suspect, { "crimes": crimes })
                `);
        const suspects = await cursor.all();
        return suspects;
    } catch (error) {
        console.error('Error getting suspects from db:', error);
        throw error;
    }
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
                    "reported_at": crime.reported_at,
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

async function getMostWanted() {
    try {
        const suspectsCollection = await checkDuplicateCollection('suspects');
        const crimesCommittedBySuspectsCollection = await checkDuplicateCollection('crimes_committed_by_suspects', true);

        const cursor = await db.query(aql`
            FOR suspect IN ${suspectsCollection}
                LET crimes = (
                    FOR crime, edge IN 1..1 INBOUND suspect ${crimesCommittedBySuspectsCollection}
                    RETURN crime
                )
                LET totalSeverity = SUM(crimes[*].severity)
                LET crimeCount = LENGTH(crimes)
                SORT totalSeverity DESC, crimeCount DESC
                LIMIT 15
                RETURN {
                    "suspect": suspect,
                    "crimes": crimes,
                    "crimeCount": crimeCount,
                    "totalSeverity": totalSeverity
                }
        `);
        const mostWanted = await cursor.all();

        return mostWanted;
    } catch (error) {
        console.error('Error getting most wanted from db:', error);
        throw error;
    }
}

async function getConnectedSuspects(suspectId) {
    try {
        const suspectsCollection = await checkDuplicateCollection('suspects');
        const crimes_committed_by_suspects = await checkDuplicateCollection('crimes_committed_by_suspects', true);

        const aqlQuery = `
            FOR suspect IN ${suspectsCollection}
            FILTER suspect._id == '${suspectId}'
            LET crimeIds = (
                FOR doc IN ${crimes_committed_by_suspects}
                FILTER doc._to == suspect._id
                RETURN doc._from
            )
            FOR crimeId IN crimeIds
            FOR crime IN crimes
            FILTER crime._id == crimeId
            LET connectedSuspects = (
                FOR doc IN ${crimes_committed_by_suspects}
                FILTER doc._from == crime._id && doc._to!= suspect._id
                RETURN DISTINCT doc._to
            )
            RETURN connectedSuspects
        `;
        const result = await db.query(aqlQuery);
    
        return result;
    } catch (error) {
        console.error("Error fetching connected suspects:", error);
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

    await checkDuplicateCollection('crimes');
    await checkDuplicateCollection('crime_scenes');
    await checkDuplicateCollection('crimes_at_scenes', true);
    await checkDuplicateCollection('suspects');
    await checkDuplicateCollection('crimes_committed_by_suspects', true);
}

module.exports = { db, handleGetCrimes, getCrimes, resetData, checkDuplicateCollection, getMostWanted, getAllSuspects };