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

// ===== 5. VISUALIZE RESULTS =====
Map.centerObject(roi, 8); // Center map on ROI
Map.addLayer(ndviImage, {min: 0, max: 1, palette: ['white', 'green']}, 'NDVI June ' + year);

// ===== 6. EXPORT TO GOOGLE DRIVE =====
Export.image.toDrive({
  image: ndviImage,
  description: 'NDVI_June_' + year,
  folder: 'NDVI_June', // Target folder in Drive
  fileNamePrefix: 'NDVI_June_' + year,
  region: roi.geometry(),
  scale: 10, // 10m resolution (Sentinel-2 native)
  maxPixels: 1e13 // Allow large exports
});
