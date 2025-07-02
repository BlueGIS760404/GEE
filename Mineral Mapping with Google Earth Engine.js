// ==================== AOI & DATA ====================
var aoi = ee.Geometry.Rectangle([70.5, 30.5, 71.5, 31.5]); // Update coordinates as needed

var image = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(aoi)
  .filterDate('2020-01-01', '2020-12-31')
  .filterMetadata('CLOUD_COVER', 'less_than', 10)
  .median()
  .clip(aoi);

// Scale reflectance
var srImage = image.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .multiply(0.0000275)
  .add(-0.2)
  .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);

// ==================== INDICES ====================
var ferrousIron = srImage.select('SWIR2').divide(srImage.select('NIR')).rename('FerrousIronIndex');
var clayMinerals = srImage.select('SWIR1').divide(srImage.select('SWIR2')).rename('ClayMineralRatio');

// ==================== VISUALIZATION ====================
var ferrousVis = {min: 0.5, max: 2, palette: ['white', 'yellow', 'orange', 'red']};
var clayVis = {min: 0.5, max: 2, palette: ['white', 'cyan', 'blue', 'purple']};

// ==================== ADD LAYERS ====================
Map.centerObject(aoi, 9);
Map.addLayer(ferrousIron, ferrousVis, 'Ferrous Iron Index');
Map.addLayer(clayMinerals, clayVis, 'Clay Mineral Ratio');
Map.addLayer(srImage.select(['Red', 'Green', 'Blue']), {min: 0, max: 0.3}, 'True Color Image');

// ==================== LEGEND FUNCTION ====================
function addLegend(title, palette, min, max, position) {
  var legend = ui.Panel({
    style: {
      position: position,
      padding: '8px 15px'
    }
  });

  var legendTitle = ui.Label({
    value: title,
    style: {
      fontWeight: 'bold',
      fontSize: '14px',
      margin: '0 0 6px 0'
    }
  });

  // Create vertical gradient image
  var lon = ee.Image.pixelLonLat().select('latitude');
  var gradient = lon.multiply((max - min) / 100.0).add(min);
  var legendImage = gradient.visualize({min: min, max: max, palette: palette});

  var thumbnail = ui.Thumbnail({
    image: legendImage,
    params: {bbox: '0,0,10,100', dimensions: '10x300'}, // increased height
    style: {stretch: 'vertical', margin: '0px 8px', maxHeight: '300px'}
  });

  // Labels for top and bottom
  var topLabel = ui.Label(max.toFixed(2), {fontSize: '12px', margin: '0 0 4px 0'});
  var bottomLabel = ui.Label(min.toFixed(2), {fontSize: '12px', margin: '270px 0 0 0'}); // Adds more space!

  var labelPanel = ui.Panel({
    widgets: [topLabel, bottomLabel],
    layout: ui.Panel.Layout.flow('vertical')
  });

  var legendPanel = ui.Panel({
    widgets: [thumbnail, labelPanel],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  legend.add(legendTitle);
  legend.add(legendPanel);
  Map.add(legend);
}

// ==================== ADD LEGENDS ====================
addLegend('Ferrous Iron Index', ferrousVis.palette, ferrousVis.min, ferrousVis.max, 'bottom-left');
addLegend('Clay Mineral Ratio', clayVis.palette, clayVis.min, clayVis.max, 'bottom-right');
