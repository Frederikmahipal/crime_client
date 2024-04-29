const express = require('express');
const app = express();
const path = require('path');
const { handleGetCrimes, getCrimes, resetData } = require('./db/db.js');



app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/get-crimes', handleGetCrimes);

app.get('/crimes', async (req, res) => {
    const crimes = await getCrimes();
    res.json(crimes);
  });

app.post('/reset', async (req, res) => {
    await resetData();
    res.sendStatus(200);
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});