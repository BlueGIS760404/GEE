// ===================================
// 1. Load Data and Define ROI
// ===================================
var gsw = ee.Image("JRC/GSW1_4/GlobalSurfaceWater");
var occurrence = gsw.select('occurrence');
var change = gsw.select('change_abs');

// Define region of interest: Bangladesh
var roi = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
  .filter(ee.Filter.eq('country_na', 'Bangladesh'));

Map.centerObject(roi, 7);

// ===================================
// 2. Visualization Parameters
// ===================================
var occVis = {
  min: 0,
  max: 100,
  palette: ['white', 'blue']
};

var changeVis = {
  min: -100,
  max: 100,
  palette: ['red', 'white', 'green']
};

// ===================================
// 3. Create Legends with Gradient
// ===================================
function makeLegendPanel(options) {
  var panel = ui.Panel({
    style: {position: 'bottom-left', padding: '8px 15px'}
  });

  // Title
  panel.add(ui.Label({
    value: options.title,
    style: {
      fontWeight: 'bold',
      fontSize: '14px',
      margin: '0 0 4px 0',
      padding: '0'
    }
  }));

  // Gradient color bar
  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat()
      .select(0)
      .multiply((options.max - options.min) / 100)
      .add(options.min)
      .int(),
    params: {
      bbox: [0, 0, 100, 10],
      dimensions: '100x10',
      format: 'png',
      min: options.min,
      max: options.max,
      palette: options.palette
    },
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '20px'}
  });

  panel.add(colorBar);

  // Min, mid, max labels
  panel.add(ui.Panel({
    widgets: [
      ui.Label(options.min),
      ui.Label({
        value: ((options.min + options.max) / 2).toFixed(0),
        style: {textAlign: 'center', stretch: 'horizontal'}
      }),
      ui.Label(options.max)
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  }));

  return panel;
}

var legendOccurrence = makeLegendPanel({
  title: 'Water Occurrence (%)',
  palette: occVis.palette,
  min: occVis.min,
  max: occVis.max
});

var legendChange = makeLegendPanel({
  title: 'Water Change (%)',
  palette: changeVis.palette,
  min: changeVis.min,
  max: changeVis.max
});

// ===================================
// 4. Add Layer Selector UI
// ===================================
var selector = ui.Select({
  items: ['Occurrence', 'Change'],
  value: 'Occurrence',
  onChange: function(value) {
    Map.layers().reset();
    Map.widgets().remove(legendOccurrence);
    Map.widgets().remove(legendChange);

    if (value === 'Occurrence') {
      Map.addLayer(occurrence.clip(roi), occVis, 'Water Occurrence');
      Map.add(legendOccurrence);
    } else {
      Map.addLayer(change.clip(roi), changeVis, 'Water Change');
      Map.add(legendChange);
    }
  }
});

var controlPanel = ui.Panel([
  ui.Label('Select Layer:'),
  selector
], ui.Panel.Layout.flow('vertical'));

controlPanel.style().set({position: 'top-left', padding: '10px'});
Map.add(controlPanel);

// ===================================
// 5. Initial Layer and Legend
// ===================================
Map.addLayer(occurrence.clip(roi), occVis, 'Water Occurrence');
Map.add(legendOccurrence);

// ===================================
// 6. Export to Google Drive
// ===================================
Export.image.toDrive({
  image: occurrence.clip(roi),
  description: 'WaterOccurrence_Bangladesh',
  folder: 'GEE_Exports',
  scale: 30,
  region: roi.geometry(),
  maxPixels: 1e13
});
