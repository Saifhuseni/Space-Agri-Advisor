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
                'x-rapidapi-key': '8f247f29a9mshcc62da477bc1604p151e01jsn195be6d27678',
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
        const nonRecommendedCrops = [];

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
            if (case1 || case2 || case3) {
                recommendedCrops.push({ crop: crop.crop, matchType: case1 ? "Ideal" : case2 ? "Potential" : "Caution" });
            } else if (case4) {
                nonRecommendedCrops.push({ crop: crop.crop });
            }
        }

        return { recommendedCrops, nonRecommendedCrops };
    } catch (error) {
        console.error(error);
        return { recommendedCrops: [], nonRecommendedCrops: [] };
    }
};

function generateHTMLResponse(cropData) {
  const { recommendedCrops, nonRecommendedCrops } = cropData;

  let recommendedHTML = '<div class="crop-list"><h2>Recommended Crops</h2>';
  recommendedHTML += '<ul>';
  recommendedCrops.forEach(crop => {
      recommendedHTML += `<li class="crop-item">${crop.crop} - <strong>${crop.matchType}</strong></li>`;
  });
  recommendedHTML += '</ul></div>';

  let nonRecommendedHTML = '<div class="crop-list"><h2>Non-Recommended Crops</h2>';
  nonRecommendedHTML += '<ul>';
  nonRecommendedCrops.forEach(crop => {
      nonRecommendedHTML += `<li class="crop-item">${crop.crop}</li>`;
  });
  nonRecommendedHTML += '</ul></div>';

  return `
      <!DOCTYPE html>
      <html>
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Crop Recommendation</title>
              <style>
                  body { 
                      font-family: 'Arial', sans-serif; 
                      margin: 0; 
                      padding: 0; 
                      background-color: #f0f0f0; 
                      color: #333; 
                  }
                  .container { 
                      width: 80%; 
                      max-width: 1200px; 
                      margin: 20px auto; 
                      padding: 20px; 
                      background-color: #ffffff; 
                      border-radius: 8px; 
                      box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
                      overflow: hidden; 
                  }
                  h2 { 
                      color: #6a1b9a; 
                      border-bottom: 3px solid #6a1b9a; 
                      padding-bottom: 10px; 
                      margin-bottom: 20px; 
                      font-size: 1.8rem; 
                      font-weight: bold; 
                  }
                  ul { 
                      list-style-type: none; 
                      padding: 0; 
                  }
                  li { 
                      padding: 10px 0; 
                      border-bottom: 1px solid #ddd; 
                      font-size: 1.1rem; 
                  }
                  li:last-child { 
                      border-bottom: none; 
                  }
                  .crop-item { 
                      color: #4a148c; 
                  }
                  .crop-item strong { 
                      color: #d500f9; 
                  }
                  .crop-section { 
                      margin-bottom: 20px; 
                  }
                  .container::before {
                      content: '';
                      display: block;
                      width: 50px;
                      height: 5px;
                      background-color: #6a1b9a;
                      margin-bottom: 20px;
                  }
                  .grid-container {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 20px;
                  }
                  .crop-list {
                      background-color: #ffffff;
                      border: 1px solid #ddd;
                      border-radius: 8px;
                      padding: 15px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="grid-container">
                      ${recommendedHTML}
                      ${nonRecommendedHTML}
                  </div>
              </div>
          </body>
      </html>
  `;
}

app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});