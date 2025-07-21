// Load your FeatureCollection (replace with your asset ID or variable)
var roi = ee.FeatureCollection('projects/ee-smrhosseiniii/assets/golestan/Golestan');

// Load the SRTM 30m DEM dataset
var dataset = ee.Image('USGS/SRTMGL1_003');

// Select the elevation band
var elevation = dataset.select('elevation');

// Clip the elevation data to the FeatureCollection
var elevationClipped = elevation.clip(roi);

// Define a fancier visualization palette with more distinct colors
var elevationVis = {
  min: -10,
  max: 6500,
  palette: [
    '#0000FF', // Deep blue for low elevations
    '#00FF00', // Green for mid-low
    '#FFFF00', // Yellow for mid
    '#FF8C00', // Orange for mid-high
    '#FF0000', // Red for high elevations
    '#FFFFFF'  // White for highest peaks
  ],
  opacity: 0.8 // Slight transparency for better map overlay
};

// Center the map on the region
Map.centerObject(roi, 10);

// Add the clipped elevation layer with a descriptive name
Map.addLayer(elevationClipped, elevationVis, 'SRTM Elevation (30m)');

// Create a legend panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white
    border: '1px solid black'
  }
});

// Add a title to the legend
var legendTitle = ui.Label({
  value: 'Elevation (meters)',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// Define elevation ranges and corresponding colors for the legend
var elevationRanges = [
  { value: -10, label: '< 0 m', color: '#0000FF' },
  { value: 1000, label: '0 - 1000 m', color: '#00FF00' },
  { value: 3000, label: '1000 - 3000 m', color: '#FFFF00' },
  { value: 5000, label: '3000 - 5000 m', color: '#FF8C00' },
  { value: 6500, label: '> 5000 m', color: '#FF0000' }
];

// Function to create a legend item
var makeLegendItem = function(range) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: range.color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var description = ui.Label({
    value: range.label,
    style: { margin: '0 0 4px 6px' }
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.flow('horizontal')
  });
};

// Add each elevation range to the legend
elevationRanges.forEach(function(range) {
  legend.add(makeLegendItem(range));
});

// Add the legend to the map
Map.add(legend);

// Export the clipped DEM to Google Drive
Export.image.toDrive({
  image: elevationClipped,
  description: 'SRTM_30m_Elevation',
  folder: 'GEE_Exports',
  fileFormat: 'GeoTIFF',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

// Optional: Print metadata to console for verification
print('SRTM Dataset:', dataset);
print('Clipped Elevation:', elevationClipped);
print('Region:', roi);
