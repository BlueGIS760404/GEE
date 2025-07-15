// Define a random ROI (can be replaced with your own geometry)
var roi = ee.Geometry.Rectangle([-122.5, 37.0, -121.5, 38.0]); // Near San Francisco

Map.centerObject(roi, 9);
Map.addLayer(roi, {color: 'red'}, 'ROI');

// Load MODIS MOD13Q1 dataset (16-day composite, 250m resolution)
var modis = ee.ImageCollection('MODIS/006/MOD13Q1')
              .filterBounds(roi)
              .filterDate('2022-01-01', '2022-12-31');

// Extract and scale EVI band
var eviCollection = modis.select('EVI').map(function(image) {
  return image
    .multiply(0.0001)  // Scale factor
    .copyProperties(image, image.propertyNames());
});

// Reduce to a single image (median)
var eviMedian = eviCollection.median().clip(roi);

// Visualization parameters
var eviVis = {
  min: 0,
  max: 0.8,
  palette: ['white', 'lightgreen', 'green', 'darkgreen']
};

// Add to map
Map.addLayer(eviMedian, eviVis, 'Median EVI 2022');


// -------------------------
// Add a custom legend
// -------------------------

// Create the legend panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create legend title
var legendTitle = ui.Label({
  value: 'EVI Legend',
  style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0'}
});
legend.add(legendTitle);

// Define color bar parameters
var palette = eviVis.palette;
var names = ['0.0: Barren (Urban/Snow/Water)', '0.2: Sparse Growth (Dry Grasslands)', '0.4: Moderate Vegetation (Healthy Crops)', '0.6+: Dense Canopy (Forests)'];

for (var i = 0; i < palette.length; i++) {
  var colorBox = ui.Label('', {
    backgroundColor: palette[i],
    padding: '8px',
    margin: '0 0 4px 0'
  });
  var description = ui.Label(names[i], {margin: '0 0 4px 6px'});
  var legendItem = ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal'));
  legend.add(legendItem);
}

// Add legend to map
Map.add(legend);
