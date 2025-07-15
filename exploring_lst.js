// Load and process Landsat 8 data
var image = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterDate('2022-06-01', '2022-06-30')
  .filterBounds(ee.Geometry.Point([-122.292, 37.901]))
  .sort('CLOUD_COVER')
  .first();

// Convert to Celsius
var lst_celsius = image.select('ST_B10')
  .multiply(0.00341802)
  .add(149.0)
  .subtract(273.15)
  .rename('LST_Celsius');

// Define the region of interest (e.g., a small bounding box around the point)
var region = ee.Geometry.Point([-122.292, 37.901]).buffer(5000).bounds();

// Compute min and max LST values for the region
var stats = lst_celsius.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: region,
  scale: 30,
  maxPixels: 1e9
});

// Extract min and max values (with fallback in case of null values)
var minTemp = ee.Number(stats.get('LST_Celsius_min')).divide(1).max(0); // Fallback to 0 if null
var maxTemp = ee.Number(stats.get('LST_Celsius_max')).divide(1).min(100); // Fallback to 100 if null

// Create visualization parameters with dynamic min and max
var lstVis = {
  min: minTemp.getInfo(), // Convert to client-side number
  max: maxTemp.getInfo(), // Convert to client-side number
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

// Display map
Map.centerObject(image, 9);
Map.addLayer(lst_celsius, lstVis, 'Land Surface Temp (°C)');

// Create the legend panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    backgroundColor: 'white',
    border: '1px solid #ccc'
  }
});

// Add title
legend.add(ui.Label('Land Surface Temp (°C)', {
  fontWeight: 'bold',
  fontSize: '14px',
  margin: '0 0 8px 0'
}));

// Create color bar container
var gradientContainer = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {height: '20px'}
});

// Add each color segment
var colors = lstVis.palette;
var segmentCount = colors.length;
colors.forEach(function(color) {
  gradientContainer.add(ui.Panel({
    style: {
      backgroundColor: color,
      height: '20px',
      width: (100/segmentCount) + '%',
      padding: '0px',
      margin: '0px'
    }
  }));
});

legend.add(gradientContainer);

// Add dynamic labels based on min and max
var labels = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '0px'}
});

// Generate 5 temperature labels between min and max (client-side)
var numLabels = 5;
var minTempVal = lstVis.min;
var maxTempVal = lstVis.max;
var step = (maxTempVal - minTempVal) / (numLabels - 1);
var tempLabels = [];
for (var i = 0; i < numLabels; i++) {
  tempLabels.push(minTempVal + step * i);
}

// Add labels to the panel
tempLabels.forEach(function(temp) {
  labels.add(ui.Label(temp.toFixed(1) + '°C', {
    margin: '0 13px 0 0',
    fontSize: '10px'
  }));
});

legend.add(labels);

// Add legend to map
Map.add(legend);
