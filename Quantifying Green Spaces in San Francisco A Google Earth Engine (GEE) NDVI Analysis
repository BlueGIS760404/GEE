// Define San Francisco polygon
var sanFrancisco = ee.Geometry.Polygon([
  [[-122.52, 37.70], [-122.36, 37.70], 
  [-122.36, 37.78], [-122.52, 37.78]]
]);

// Load Landsat 8 Surface Reflectance data without QA-based cloud mask
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(sanFrancisco)
  .filterDate('2023-01-01', '2023-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 5));
  // .filter(ee.Filter.lt('CLOUD_COVER', 5))
  // .map(function(img) {
  //   var qa = img.select('QA_PIXEL');
  //   var cloudMask = qa.bitwiseAnd(1 << 3).eq(0)
  //     .and(qa.bitwiseAnd(1 << 4).eq(0))
  //     .and(qa.bitwiseAnd(1 << 1).eq(0))
  //     .and(qa.bitwiseAnd(1 << 2).eq(0))
  //     .and(qa.bitwiseAnd(1 << 5).eq(0));
  //   return img.updateMask(cloudMask);
  // });
  
// Print the collection metadata for debugging
var minDate = landsat.aggregate_min('system:time_start');
var maxDate = landsat.aggregate_max('system:time_start');
print('Date range:', 
  ee.Date(minDate).format('YYYY-MM-dd'), 
  'to', 
  ee.Date(maxDate).format('YYYY-MM-dd')
);
print('Number of images in collection:', landsat.size());
  
// // Function to calculate coverage percentage of ROI
// var calculateCoverage = function(image) {
//   var intersection = image.geometry().intersection(sanFrancisco, 1);
//   var coverage = intersection.area().divide(sanFrancisco.area()).multiply(100);
//   return image.set('coverage', coverage);
// }

// // Apply coverage calculation and sort by coverage (descending) then cloud cover
// var landsatWithCoverage = landsat.map(calculateCoverage);
// var image = landsatWithCoverage
//   .sort('coverage', false)
//   .sort('CLOUD_COVER')
//   .first()
//   .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5']);
  
// // Visualize the area and image
// Map.centerObject(sanFrancisco, 11);
// Map.addLayer(sanFrancisco, {color: 'FF0000'}, 'SF Polygon');
// Map.addLayer(image, {bands: ['SR_B5', 'SR_B4', 'SR_B3'], min: 0, max: 30000}, 'Landsat 8');
// Map.addLayer(image.geometry(), {color: 'blue', opacity: 0.5}, 'Image Footprint');

// // Print metadata for debugging
// print('Number of images in collection:', landsat.size());
// print('Image date:', image.date().format('YYYY-MM-dd'));
// print('Available bands:', image.bandNames());
// print('Polygon area (km²):', ee.Number(sanFrancisco.area().divide(1e6)).multiply(100).round().divide(100));
// print('Coverage (%):', ee.Number(image.get('coverage')).multiply(100).round().divide(100));

// Conclusion: No single image fully covers the ROI (Coverage (%): 8.78). As a result, we create a Mosaic.

// Create mosaic and select bands
var image = landsat
  .mosaic()
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'])
  // .multiply(0.0000275)
  // .add(0.0)
  // .clamp(0, 1)
  .clip(sanFrancisco);

// Visualize the ROI and image
Map.centerObject(sanFrancisco, 11);
print('Polygon area (km²):', ee.Number(sanFrancisco.area().divide(1e6)).multiply(100).round().divide(100));
Map.addLayer(sanFrancisco, {color: 'FF0000'}, 'SF Polygon');
Map.addLayer(image, {bands: ['SR_B5', 'SR_B4', 'SR_B3'], min: 0, max: 30000}, 'Landsat 8 Mosaic');

// Calculate min/max stats for raw image bands
var imageStats = image.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: sanFrancisco,
  scale: 30,
  maxPixels: 1e10
});
// Print image stats
print('Raw image min and max:', imageStats);

// Count pixels with high values (> 36,363 DN) to assess outlier extent
var highValueMask = image.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5']).gt(36363);
var highValueCount = highValueMask.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: sanFrancisco,
  scale: 30,
  maxPixels: 1e10
});
print('Number of pixels > 36,363 DN (outliers) per band:', highValueCount);

// Export raw image in UTM Zone 10N
Export.image.toDrive({
  image: image,
  description: 'Landsat8_SanFrancisco_Polygon_Mosaic_UTM10N',
  folder: 'GEE_Exports',
  region: sanFrancisco,
  scale: 30,
  crs: 'EPSG:32610',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

// Calculate NDVI: (NIR - Red) / (NIR + Red)
// Landsat 8 bands: NIR = SR_B5, Red = SR_B4
var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4'])
  .rename('NDVI');
var ndviClipped = ndvi.clip(sanFrancisco);

// Visualize the NDVI
Map.addLayer(ndviClipped, {min: -1, max: 1, palette: ['red', 'yellow', 'green']}, 'NDVI');

// Calculate min/max stats for NDVI
var ndviStats = ndviClipped.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: sanFrancisco,
  scale: 30,
  maxPixels: 1e10
})
// Print min and max NDVI values
print('NDVI min and max:', ndviStats);

// Add NDVI metadata
var ndviWithMetadata = ndviClipped.set({
  'sensor': 'Landsat 8',
  'date_range': '2023-01-01 to 2023-12-31',
  'cloud_cover_max': 5,
  'crs': 'EPSG:32610',
  'scale': 30,
  'purpose': 'NDVI for green space quantification',
  'band': 'NDVI',
  'ndvi_formula': '(SR_B5 - SR_B4) / (SR_B5 + SR_B4)',
  'ndvi_min': -0.9578048149106911,
  'ndvi_max': 0.6500560807562891
});

// Export NDVI in UTM Zone 10N
Export.image.toDrive({
  image: ndviWithMetadata,
  description: 'Landsat8_SanFrancisco_NDVI_UTM10N',
  folder: 'GEE_Exports',
  region: sanFrancisco,
  scale: 30,
  crs: 'EPSG:32610',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
