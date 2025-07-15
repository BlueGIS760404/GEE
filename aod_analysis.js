// Define ROI (replace with your own coordinates)
var roi = ee.Geometry.Polygon([[[min_lon, min_lat], [max_lon, min_lat], [max_lon, max_lat], [min_lon, max_lat], [min_lon, min_lat]]]);
Map.centerObject(roi, 5);
Map.addLayer(roi, {color: 'blue'}, 'ROI');

// Load and filter MODIS MAIAC AOD
var modis = ee.ImageCollection('MODIS/006/MCD19A2_GRANULES') // 1km MAIAC AOD
    .filterBounds(roi)
    .filterDate('2019-06-01', '2025-06-30')
    .filter(ee.Filter.calendarRange(6, 6, 'month'))
    .select('Optical_Depth_047');

// Check data availability
print('MODIS MAIAC Images Available:', modis.size());

// Calculate mean AOD and clip
var aod = modis.mean().divide(1000).rename('AOD').clip(roi);  // Apply scale factor (÷1000) as per documentation

// Visualize real AOD values
var aodVis = {
  min: 0,
  max: 1,  // You can change this based on your region; e.g., use 0.5 for urban areas
  palette: ['green', 'yellow', 'orange', 'red', 'purple']
};
Map.addLayer(aod, aodVis, 'AOD');

// Add legend for real AOD
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px 15px'}});
legend.add(ui.Label({
    value: 'Real AOD (Optical Depth)',
    style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0px'}
}));

var colorList = ['green', 'yellow', 'orange', 'red', 'purple'];
var valueRanges = ['< 0.2 (Clean)', '0.2–0.4', '0.4–0.6', '0.6–0.8', '> 0.8 (High pollution)'];

for (var i = 0; i < colorList.length; i++) {
  var colorBox = ui.Label('', {backgroundColor: colorList[i], padding: '8px', margin: '0 0 4px 0'});
  var description = ui.Label(valueRanges[i], {margin: '0 0 4px 6px'});
  legend.add(ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal')));
}
Map.add(legend);

// Export real AOD image
Export.image.toDrive({
    image: aod,
    description: 'Real_AOD_1km',
    folder: 'DSSI',
    region: roi,
    scale: 1000,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});
