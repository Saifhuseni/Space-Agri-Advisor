const express = require('express');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const uri = "mongodb://localhost:27017/Space-Agri-Advisor";

// Connect to MongoDB
mongoose.connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Connection error", err));

// Define your schemas with indexes
const PhSchema = new Schema({
  min: Number,
  max: Number
});
PhSchema.index({ min: 1, max: 1 });

const ClaySchema = new Schema({
  min: Number,
  max: Number
});
ClaySchema.index({ min: 1, max: 1 });

const SandSchema = new Schema({
  min: Number,
  max: Number
});
SandSchema.index({ min: 1, max: 1 });

const SiltSchema = new Schema({
  min: Number,
  max: Number
});
SiltSchema.index({ min: 1, max: 1 });

const OcdSchema = new Schema({
  min: Number,
  max: Number
});
OcdSchema.index({ min: 1, max: 1 });

const CecSchema = new Schema({
  min: Number,
  max: Number
});
CecSchema.index({ min: 1, max: 1 });

const CropSchema = new Schema({
  crop: String,
  ph: PhSchema,
  clay: ClaySchema,
  sand: SandSchema,
  silt: SiltSchema,
  ocd: OcdSchema,
  cec: CecSchema,
  seasons: String
});

const Crop = mongoose.model('crops', CropSchema);

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
                'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY',
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

                if (soilData) {
                    const recommendedCrops = await findRecommendedCrops(soilData);

                    // Render the response as an HTML page
                    res.send(generateHTMLResponse(recommendedCrops));
                } else {
                    res.status(500).send('Error processing soil data');
                }
            } else {
                res.status(soilGridsResponse.status).send('Error fetching data from SoilGrids API');
            }
        } else {
            console.log('Location is water, no soil data available.');
            res.write("<h1>Invalid location selected. Suspected to be a water body.</h1>");
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

function mapSoilData(data) {
    if (!data || !data.properties || !data.properties.layers) {
        return null;
    }

    const properties = data.properties.layers.reduce((acc, layer) => {
        const name = layer.name;
        const depth = layer.depths.find(d => d.label === '0-5cm');
        if (depth) {
            const min = depth.values['Q0.05'] / layer.unit_measure.d_factor;
            const max = depth.values['Q0.95'] / layer.unit_measure.d_factor;
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

const findRecommendedCrops = async (soilData) => {
    try {
        if (!soilData) {
            throw new Error('No soil data provided');
        }

        const crops = await Crop.find();
        const recommendedCrops = [];
        const notRecommendedCrops = [];

        for (const crop of crops) {
            let case1 = true, case2 = true, case3 = false, case4 = false;
            const properties = ['ph', 'clay', 'sand', 'silt', 'ocd', 'cec'];

            for (const prop of properties) {
                const cropProp = crop[prop];
                const soilProp = soilData[prop];

                if (cropProp && soilProp) {
                    const cropMin = cropProp.min;
                    const cropMax = cropProp.max;
                    const soilMin = soilProp.min;
                    const soilMax = soilProp.max;

                    // Case 1
                    if (!(soilMin > cropMin && soilMax < cropMax)) case1 = false;
                    // Case 2
                    if (!(soilMin < cropMin && soilMax > cropMax)) case2 = false;
                    // Case 3
                    if ((soilMax <= cropMin || soilMin >= cropMax)) case3 = true;
                    // Case 4
                    if ((soilMin < cropMin && soilMax < cropMax) || (soilMax > cropMax && soilMin > cropMin)) case4 = true;
                }
            }

            // Decision making
            if (case1 || case2) {
                recommendedCrops.push(crop.crop);
            } else if (case3 || case4) {
                notRecommendedCrops.push(crop.crop);
            }
        }

        return { recommendedCrops, notRecommendedCrops };
    } catch (error) {
        console.error(error);
        return { recommendedCrops: [], notRecommendedCrops: [] };
    }
};

// Function to generate HTML response
function generateHTMLResponse({ recommendedCrops, notRecommendedCrops }) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Crop Recommendations</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                .container {
                    display: flex;
                    justify-content: space-around;
                }
                .list-container {
                    width: 45%;
                    border: 1px solid #ccc;
                    padding: 20px;
                    border-radius: 10px;
                    background-color: #f9f9f9;
                }
                .list-container h2 {
                    text-align: center;
                    color: #444;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                li {
                    margin: 5px 0;
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }
            </style>
        </head>
        <body>
            <h1>Crop Recommendations</h1>
            <div class="container">
                <div class="list-container">
                    <h2>Recommended Crops</h2>
                    <ul>
                        ${recommendedCrops.map(crop => `<li>${crop}</li>`).join('')}
                    </ul>
                </div>
                <div class="list-container">
                    <h2>Not Recommended Crops</h2>
                    <ul>
                        ${notRecommendedCrops.map(crop => `<li>${crop}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `;
}

app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
