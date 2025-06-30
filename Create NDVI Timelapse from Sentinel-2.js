// Define the area to analyze
var roi = ee.FeatureCollection("users/your_username/your_asset_name");

// Transform the ROI geometry to EPSG:4326
var roiTransformed = roi.geometry().transform('EPSG:4326', 10); // 10m max error for transformation

// Define range of years for the timelapse
var startYear = 2018;
var endYear = 2025;

// Function to compute and classify June NDVI
function getJuneNDVI(year) {
  // Define date range (June 1 - June 30)
  var start = ee.Date.fromYMD(year, 6, 1);
  var end = ee.Date.fromYMD(year, 6, 30);

  // Load Sentinel-2 imagery, filter, and mask
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

  // Create median composite and compute NDVI
  var composite = collection.median().clip(roi);
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');

  // Classify NDVI values
  var ndviClasses = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  var classified = ndvi.gte(ndviClasses[0])
    .add(ndvi.gte(ndviClasses[1]))
    .add(ndvi.gte(ndviClasses[2]))
    .add(ndvi.gte(ndviClasses[3]))
    .add(ndvi.gte(ndviClasses[4]))
    .subtract(1)
    .clip(roi)
    .rename('NDVI_class');

  return classified.set('year', year);
}

// Create a list of years
var years = ee.List.sequence(startYear, endYear);

// Map the NDVI function over the years to create classified collection
var classifiedCollection = ee.ImageCollection.fromImages(
  years.map(function(year) {
    return getJuneNDVI(year);
  })
);

// Apply visualization to convert classified images to RGB
var classVisParams = {
  min: 0,
  max: 4,
  palette: ['red', 'yellow', 'lightgreen', 'green', 'darkgreen']
};
var visualizedCollection = classifiedCollection.map(function(image) {
  return image.visualize(classVisParams).set('year', image.get('year'));
});

// Add year text to each frame for clarity
var visualizedCollectionWithText = visualizedCollection.map(function(image) {
  var year = image.get('year');
  var text = ee.Image().paint({
    featureCollection: ee.FeatureCollection([
      ee.Feature(roiTransformed.centroid(), {label: year})
    ]),
    color: 'label',
    width: 2
  }).visualize({palette: ['white']});
  return image.blend(text).set('year', year);
});

// Add the timelapse to the map for preview
Map.centerObject(roi, 8);
Map.addLayer(visualizedCollectionWithText, {}, 'Classified NDVI Timelapse');

// Create a GIF using ui.Thumbnail for preview
var thumb = ui.Thumbnail({
  image: visualizedCollectionWithText,
  params: {
    dimensions: '512x512', // Suitable for LinkedIn
    region: roiTransformed,
    framesPerSecond: 1,
    crs: 'EPSG:4326'
  },
  style: {
    position: 'bottom-right',
    width: '512px'
  }
});
Map.add(thumb);

// Export the timelapse to Google Drive for manual GIF creation
Export.video.toDrive({
  collection: visualizedCollectionWithText,
  description: 'Classified_NDVI_June_Timelapse_' + startYear + '_' + endYear,
  folder: 'NDVI_Timelapse',
  fileNamePrefix: 'Classified_NDVI_June_Timelapse',
  region: roiTransformed, // Use transformed geometry
  dimensions: 512, // Matches thumbnail size for LinkedIn
  maxPixels: 1e13,
  framesPerSecond: 1
});

// Create and add a legend for the classified NDVI
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    backgroundColor: 'white'
  }
});

var legendTitle = ui.Label({
  value: 'NDVI Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

var classLabels = [
  'No vegetation (0-0.2)',
  'Low vegetation (0.2-0.4)',
  'Moderate vegetation (0.4-0.6)',
  'Healthy vegetation (0.6-0.8)',
  'Very healthy vegetation (0.8-1.0)'
];

for (var i = 0; i < classLabels.length; i++) {
  var color = classVisParams.palette[i];
  var description = ui.Label({
    value: classLabels[i],
    style: {margin: '0 0 4px 6px'}
  });
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var legendItem = ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  legend.add(legendItem);
}

Map.add(legend);
