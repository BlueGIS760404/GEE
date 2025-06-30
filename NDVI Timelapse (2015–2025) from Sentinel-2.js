// Define the area to analyze
var roi = ee.FeatureCollection("users/your_username/your_asset_name");

// Define range of years for the timelapse
var startYear = 2018;
var endYear = 2025;

// Function to compute June NDVI
function getJuneNDVI(year) {
  var start = ee.Date.fromYMD(year, 6, 1);
  var end = ee.Date.fromYMD(year, 6, 30);
  var collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(roi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(image) {
      var scl = image.select('SCL');
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
      return image.updateMask(mask)
                  .divide(10000)
                  .copyProperties(image, image.propertyNames());
    });
  var composite = collection.median().clip(roi);
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return ndvi.set('year', year);
}

// Create a list of years
var years = ee.List.sequence(startYear, endYear);

// Map the NDVI function over the years
var ndviCollection = ee.ImageCollection.fromImages(
  years.map(function(year) {
    return getJuneNDVI(year);
  })
);

// Apply visualization to convert NDVI to RGB images
var visParams = {min: 0, max: 1, palette: ['white', 'green']};
var visualizedCollection = ndviCollection.map(function(image) {
  return image.visualize(visParams).set('year', image.get('year'));
});

// Visualization parameters for map display
var ndviVisParams = {min: 0, max: 1, palette: ['white', 'green']};

// Add the timelapse to the map for preview
Map.centerObject(roi, 8);
Map.addLayer(visualizedCollection, {}, 'NDVI Timelapse (Visualized)');

// Export the timelapse to Google Drive
Export.video.toDrive({
  collection: visualizedCollection,
  description: 'NDVI_June_Timelapse_' + startYear + '_' + endYear,
  folder: 'NDVI_Timelapse',
  fileNamePrefix: 'NDVI_June_Timelapse',
  region: roi.geometry(),
  crs: 'EPSG:4326',
  maxPixels: 1e13,
  dimensions: 720, // Defines output video resolution (e.g., 720p)
  framesPerSecond: 1
});
