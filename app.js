require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const { handleGetCrimes, getCrimes, resetData, getMostWanted, getAllSuspects} = require('./db/db.js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const PORT = 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const secretKey = process.env.JWT_SECRET;
const token = jwt.sign({}, secretKey);

app.post('/get-crimes', handleGetCrimes);

app.get('/crimes', async (req, res) => {
  try {
    const crimes = await getCrimes();
    res.json(crimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching crimes' });
  }
});

app.get('/suspects', async (req, res) => {
  try {
    const suspects = await getAllSuspects();
    res.json(suspects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching suspects' });
  }
});

app.get('/most-wanted', async (req, res) => {
  try {
    const mostWanted = await getMostWanted();
    res.json(mostWanted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching most wanted' });
  }
});

app.post('/reset', async (req, res) => {
  try {
    await resetData();
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while resetting data' });
  }
});

// https://uw-cs.onrender.com/get-crimes
// http://host.docker.internal:3000/get-crimes
//get new crimes from server 1 every 5 seconds, and post them to server 2
setInterval(async () => {
  try {
    const response = await axios.get('http://host.docker.internal:3000/get-crimes', { 
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    const newCrimes = response.data;
    await axios.post('http://localhost:8000/get-crimes', newCrimes);
  } catch (error) {
    console.error(error);
  }
}, 5000);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});