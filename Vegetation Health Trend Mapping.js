// Define the area to analyze
// var roi = ee.FeatureCollection("users/your_username/your_asset_name");

// Transform the ROI geometry to EPSG:4326
var roiTransformed = roi.geometry().transform('EPSG:4326', 10); // 10m max error for transformation

// Define range of years for the analysis
var startYear = 2018;
var endYear = 2025;
var years = ee.List.sequence(startYear, endYear);

// Function to compute mean NDVI and add a time band for trend analysis
function getMeanNDVI(year) {
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
  var time = ee.Image.constant(year).float().rename('time');
  return ndvi.addBands(time).set('system:time_start', start.millis());
}

// Create NDVI time series with time band
var ndviCollection = ee.ImageCollection.fromImages(
  years.map(function(year) {
    return getMeanNDVI(year);
  })
);

// Perform linear regression to get trend
var trend = ndviCollection.select(['time', 'NDVI']).reduce(ee.Reducer.linearFit());
var slope = trend.select('scale').clip(roi); // Slope indicates NDVI trend

// Classify the NDVI trend slope
var slopeClasses = [-0.02, -0.005, 0.005, 0.02]; // Thresholds for classification
var classifiedTrend = ee.Image(0)
  .where(slope.lte(slopeClasses[0]), 0) // Strong decrease
  .where(slope.gt(slopeClasses[0]).and(slope.lte(slopeClasses[1])), 1) // Slight decrease
  .where(slope.gt(slopeClasses[1]).and(slope.lte(slopeClasses[2])), 2) // Stable
  .where(slope.gt(slopeClasses[2]).and(slope.lte(slopeClasses[3])), 3) // Slight increase
  .where(slope.gt(slopeClasses[3]), 4) // Strong increase
  .clip(roi)
  .rename('trend_class');

// Visualize classified trend
var trendVisParams = {
  min: 0,
  max: 4,
  palette: ['darkred', 'red', 'gray', 'lightgreen', 'darkgreen']
};
Map.centerObject(roi, 8);
Map.addLayer(classifiedTrend, trendVisParams, 'Classified NDVI Trend');

// Add a legend for the classified trend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '10px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white background
    border: '1px solid black'
  }
});

var legendTitle = ui.Label({
  value: 'NDVI Trend (2018-2025)',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 8px 0',
    padding: '0',
    color: '#333'
  }
});
legend.add(legendTitle);

var classLabels = [
  'Strong Decrease (<-0.02/yr)',
  'Slight Decrease (-0.02 to -0.005/yr)',
  'Stable (-0.005 to 0.005/yr)',
  'Slight Increase (0.005 to 0.02/yr)',
  'Strong Increase (>0.02/yr)'
];

for (var i = 0; i < classLabels.length; i++) {
  var color = trendVisParams.palette[i];
  var description = ui.Label({
    value: classLabels[i],
    style: {
      fontSize: '14px',
      margin: '4px 0 4px 8px',
      color: '#333'
    }
  });
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '10px',
      margin: '4px 0 4px 0'
    }
  });
  var legendItem = ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  legend.add(legendItem);
}

Map.add(legend);

// Export the classified trend to Google Drive
Export.image.toDrive({
  image: classifiedTrend,
  description: 'Classified_NDVI_Trend_' + startYear + '_' + endYear,
  folder: 'NDVI_Trend',
  fileNamePrefix: 'Classified_NDVI_Trend',
  region: roiTransformed,
  scale: 10, // Sentinel-2 resolution
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
