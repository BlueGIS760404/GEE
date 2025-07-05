// ---------------------------------------------
// 1. Define Region and Time Range
// ---------------------------------------------
var roi = ee.Geometry.Rectangle([33.0, -3.0, 34.0, -2.0]);  // Example: Kenya region
var startDate = '2018-01-01';
var endDate = '2020-12-31';

// ---------------------------------------------
// 2. Load and Prepare CHIRPS Precipitation (Daily → Monthly Sum)
// ---------------------------------------------
var chirpsDaily = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(roi)
  .filterDate(startDate, endDate);

var monthlyPrecip = ee.ImageCollection(
  ee.List.sequence(0, ee.Date(endDate).difference(ee.Date(startDate), 'month').subtract(1))
    .map(function(m) {
      var start = ee.Date(startDate).advance(m, 'month');
      var end = start.advance(1, 'month');
      var total = chirpsDaily.filterDate(start, end).sum();
      return total.set('system:time_start', start.millis());
    })
);

// ---------------------------------------------
// 3. Load and Prepare MODIS EVI (16-day → Monthly Mean)
// ---------------------------------------------
var evi = ee.ImageCollection('MODIS/006/MOD13Q1')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .select('EVI')
  .map(function(img) {
    return img.multiply(0.0001).copyProperties(img, ['system:time_start']);
  });

var monthlyEVI = ee.ImageCollection(
  ee.List.sequence(0, ee.Date(endDate).difference(ee.Date(startDate), 'month').subtract(1))
    .map(function(m) {
      var start = ee.Date(startDate).advance(m, 'month');
      var end = start.advance(1, 'month');
      var avg = evi.filterDate(start, end).mean();
      return avg.set('system:time_start', start.millis());
    })
);

// ---------------------------------------------
// 4. Join EVI and Precipitation by Time
// ---------------------------------------------
var filterTimeEq = ee.Filter.equals({leftField: 'system:time_start', rightField: 'system:time_start'});
var join = ee.Join.inner();
var joined = join.apply(monthlyPrecip, monthlyEVI, filterTimeEq);

// ---------------------------------------------
// 5. Create Regression ImageCollection (precip + constant + EVI)
// ---------------------------------------------
var regressionCollection = ee.ImageCollection(joined.map(function(pair) {
  var precip = ee.Image(ee.Feature(pair).get('primary')).rename('precip');
  var evi = ee.Image(ee.Feature(pair).get('secondary')).rename('EVI');
  var constant = ee.Image.constant(1).rename('constant');
  return precip.addBands(constant).addBands(evi)
               .set('system:time_start', precip.get('system:time_start'));
}));

// ---------------------------------------------
// 6. Sample Pixels and Limit Total Sample Size
// ---------------------------------------------
var samples = regressionCollection.map(function(image) {
  return image.sample({
    region: roi,
    scale: 5000,
    numPixels: 100,       // Reduce per-image sample size
    geometries: false
  });
}).flatten().limit(3000);  // Avoid GEE's 5000-feature limit

// ---------------------------------------------
// 7. Perform Linear Regression: EVI = a + b × precip
// ---------------------------------------------
var regression = samples.reduceColumns({
  selectors: ['precip', 'constant', 'EVI'],
  reducer: ee.Reducer.linearRegression(2, 1)
});

// Extract coefficients
var coeffs = ee.Array(regression.get('coefficients'));
var slope = coeffs.get([0, 0]);
var intercept = coeffs.get([1, 0]);

// ---------------------------------------------
// 8. Display Results
// ---------------------------------------------
print('Regression Coefficients [slope, intercept]:', coeffs);
print('Slope (precip → EVI):', slope);
print('Intercept:', intercept);

// ---------------------------------------------
// 9. Create Scatter Plot with Trendline
// ---------------------------------------------
var chart = ui.Chart.feature.byFeature(samples, 'precip', ['EVI'])
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Precipitation vs EVI (Sampled)',
    hAxis: {title: 'Precipitation (mm/month)'},
    vAxis: {title: 'EVI'},
    pointSize: 2,
    trendlines: {0: {color: 'red'}}
  });

print(chart);
