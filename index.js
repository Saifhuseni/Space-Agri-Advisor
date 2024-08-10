const express = require('express');


const SOIL_GRIDS_API_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';

const app = express();
const PORT = 8000;

app.get('/fetch-data', async (req, res) => {
    const latitude = req.query.lat;
    const longitude = req.query.lon;

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
        const result = await response.json();

        if (result.water !== true) {
            const soilGridsResponse = await fetch(`${SOIL_GRIDS_API_URL}?lat=${latitude}&lon=${longitude}&properties=phh2o,clay,sand,silt,ocd,cec&depth=0-5cm`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (soilGridsResponse.ok) {
                const data = await soilGridsResponse.json();
                const soilData = mapSoilData(data);
                res.json(soilData);
            } else {
                res.status(soilGridsResponse.status).send('Error fetching data from SoilGrids API');
            }
        } else {
            console.log('Location is water, no soil data available.');
            // res.status(204).send('Location is water, no soil data available.');
            res.write("<h1>Invalid location selected.Suspected to be a water body.</h1>")
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

function mapSoilData(data) {
    const properties = data.properties.layers.reduce((acc, layer) => {
        const name = layer.name;
        const depth = layer.depths.find(d => d.label === '0-5cm');
        if (depth) {
            const min = depth.values['Q0.05']/ layer.unit_measure.d_factor;
            const max = depth.values['Q0.95']/ layer.unit_measure.d_factor;
            acc[name] = { min, max };
        }
        return acc;
    }, {});

    return {
        ph: properties.phh2o || { min: null, max: null },
        clay: properties.clay || { min: null, max: null },
        sand: properties.sand || { min: null, max: null },
        silt: properties.silt || { min: null, max: null },
        ocd: properties.ocd || { min: null, max: null },
        cec: properties.cec || { min: null, max: null }
    };
}

app.get('/', (req, res) => res.send("Hello World"));

app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
