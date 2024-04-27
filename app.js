require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const { handleGetCrimes, getCrimes } = require('./db/db.js');


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/get-crimes', handleGetCrimes);

app.get('/crimes', async (req, res) => {
    const crimes = await getCrimes();
    res.json(crimes);
  });


const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});