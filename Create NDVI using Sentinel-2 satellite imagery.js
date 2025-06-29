// 1. LOAD REGION OF INTEREST (ROI) =====
// Define the area to analyze (imported as an Earth Engine asset)
var roi = ee.FeatureCollection("users/your_username/your_asset_name");

// 2. SET ANALYSIS YEAR =====
// Choose the year for NDVI computation (e.g., 2018)
var year = 2018;

// 3. FUNCTION TO COMPUTE JUNE NDVI =====
/**
 * Computes NDVI for June of a given year.
 * @param {number} year - The year of analysis.
 * @returns {ee.Image} NDVI image clipped to ROI.
 */
function getJuneNDVI(year) {
  // Define date range (June 1 - June 30)
  var start = ee.Date.fromYMD(year, 6, 1);
  var end = ee.Date.fromYMD(year, 6, 30);

  // Load Sentinel-2 imagery, filter by ROI, date, and cloud cover
  var collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(roi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    // Apply cloud & shadow masking using Scene Classification Layer (SCL)
    .map(function(image) {
      var scl = image.select('SCL');
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)); // Exclude clouds, shadows, water
      return image.updateMask(mask)
                  .divide(10000) // Scale reflectance values
                  .copyProperties(image, image.propertyNames());
    });

  // Create median composite and compute NDVI
  var composite = collection.median().clip(roi);
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return ndvi.set('year', year); // Attach year as metadata
}

// ===== 4. GENERATE NDVI IMAGE =====
var ndviImage = getJuneNDVI(year);

// ===== 5. CLASSIFY NDVI VALUES =====
// Define classification ranges and labels
var ndviClasses = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
var classLabels = [
  'No vegetation',
  'Low vegetation',
  'Moderate vegetation',
  'Healthy vegetation',
  'Very healthy vegetation'
];

// Classify the NDVI image
var classified = ndviImage.gte(ndviClasses[0])
  .add(ndviImage.gte(ndviClasses[1]))
  .add(ndviImage.gte(ndviClasses[2]))
  .add(ndviImage.gte(ndviClasses[3]))
  .add(ndviImage.gte(ndviClasses[4]))
  .subtract(1)
  .clip(roi)
  .rename('NDVI_class');

// Set visualization parameters
var ndviVisParams = {min: 0, max: 1, palette: ['white', 'green']};
var classVisParams = {
  min: 0,
  max: 4,
  palette: ['red', 'yellow', 'lightgreen', 'green', 'darkgreen']
};

// ===== 6. VISUALIZE RESULTS =====
Map.centerObject(roi, 8); // Center map on ROI
Map.addLayer(ndviImage, ndviVisParams, 'NDVI June ' + year);
Map.addLayer(classified, classVisParams, 'NDVI Classes ' + year);

// ===== 7. CREATE AND ADD LEGEND =====
// Create a panel to hold the legend
var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px',
    backgroundColor: 'white'
  }
});

// Create legend title
var legendTitle = ui.Label({
  value: 'NDVI Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

// Add the title to the panel
legend.add(legendTitle);

// Create and add the legend items
for (var i = 0; i < classLabels.length; i++) {
  var color = classVisParams.palette[i];
  var label = classLabels[i] + ' (' + 
              ndviClasses[i].toFixed(1) + '-' + 
              ndviClasses[i+1].toFixed(1) + ')';
  
  // Create the colored box
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  
  // Create the label
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });
  
  // Create a row for this legend item
  var legendItem = ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  
  legend.add(legendItem);
}

// Add the legend to the map
Map.add(legend);

// ===== 8. EXPORT RESULTS =====
// Export raw NDVI image
Export.image.toDrive({
  image: ndviImage,
  description: 'NDVI_June_' + year,
  folder: 'NDVI_June',
  fileNamePrefix: 'NDVI_June_' + year,
  region: roi.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Export classified NDVI image
Export.image.toDrive({
  image: classified,
  description: 'NDVI_Classes_June_' + year,
  folder: 'NDVI_June',
  fileNamePrefix: 'NDVI_Classes_June_' + year,
  region: roi.geometry(),
  scale: 10,
  maxPixels: 1e13
});
