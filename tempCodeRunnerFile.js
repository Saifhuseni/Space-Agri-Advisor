

const express = require('express');
//const fetch = require('node-fetch'); // Ensure node-fetch is installed: npm install node-fetch

const SOIL_GRIDS_API_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';

const app = express();
const PORT = 8000;

app.listen(PORT, () => console.log(`It's live on ${PORT}`));

app.get('/fetch-data', async (req, res) => {
   
    const latitude = 40.73061;  // Replace with actual latitude
    const longitude = -73.935242;  // Replace with actual longitude

    try {
        const response = await fetch(`${SOIL_GRIDS_API_URL}?lat=${latitude}&lon=${longitude}&properties=phh2o&depth=0-5cm`, {
            method: 'GET', 
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Data received from SoilGrids API:', data);
            res.json(data);
        } else {
            res.status(response.status).send('Error fetching data from SoilGrids API');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

app.get('/', (req, res) => res.send("Hello World"));