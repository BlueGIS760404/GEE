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

// Visualization parameters
var lstVis = {
  min: 20,
  max: 40,
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

// Display map
Map.centerObject(image, 9);
Map.addLayer(lst_celsius, lstVis, 'Land Surface Temp (°C)');

// =============================================
// FINAL WORKING LEGEND SOLUTION
// =============================================

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
var colorBar = ui.Panel({
  style: {
    height: '20px',
    margin: '0 0 4px 0',
    backgroundColor: 'blue' // Starting color
  }
});

// Create the gradient using multiple panels
var gradientContainer = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {height: '20px'}
});

// Add each color segment
var colors = lstVis.palette;
var segmentCount = colors.length;
colors.forEach(function(color, i) {
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

// Add labels
var labels = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '0px'}
});

[20, 25, 30, 35, 40].forEach(function(temp) {
  labels.add(ui.Label(temp + '°C', {
    margin: '0 13px 0 0',
    fontSize: '10px'
  }));
});

legend.add(labels);

// Add legend to map
Map.add(legend);
