const express = require('express');


const SOIL_GRIDS_API_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';

const app = express();
const PORT = 8000;

app.get('/fetch-data', async (req, res) => {
    const latitude = req.query.lat; // Extract latitude from query parameters
    const longitude = req.query.lon; // Extract longitude from query parameters

    // Validate latitude and longitude
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).send('Invalid latitude or longitude');
    }

    try {
        const url = `https://isitwater-com.p.rapidapi.com/?latitude=${latitude}&longitude=${longitude}`;
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': '6fbc9f0d2bmsh07f4deb3961e08bp148e41jsn460d4d2ce469',
                'x-rapidapi-host': 'isitwater-com.p.rapidapi.com'
            }
        };

        const response = await fetch(url, options);
        const result = await response.json(); // Parse JSON response

        if (result.water !== true) {
            // Fetch SoilGrids data only if the location is not water
            const soilGridsResponse = await fetch(`${SOIL_GRIDS_API_URL}?lat=${latitude}&lon=${longitude}&properties=phh2o&depth=0-5cm`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (soilGridsResponse.ok) {
                const data = await soilGridsResponse.json();
                console.log('Data received from SoilGrids API:', data);
                res.json(data);
            } else {
                res.status(soilGridsResponse.status).send('Error fetching data from SoilGrids API');
            }
        } else {
            console.log('Location is water, no soil data available.');
            res.status(204).send('Location is water, no soil data available.');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

app.get('/', (req, res) => res.send("Hello World"));

app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
