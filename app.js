const express = require('express');
const app = express();
const path = require('path');
const { handleGetCrimes, getCrimes, resetData, getMostWanted, getAllSuspects } = require('./db/db.js');



app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/get-crimes', handleGetCrimes);

app.get('/crimes', async (req, res) => {
  const crimes = await getCrimes();
  res.json(crimes);
});

app.get('/suspects', async (req, res) => {
  const suspects = await getAllSuspects();
  res.json(suspects);
});

app.get('/most-wanted', async (req, res) => {
  const mostWanted = await getMostWanted();
  res.json(mostWanted);
});

app.post('/reset', async (req, res) => {
  await resetData();
  res.sendStatus(200);
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});