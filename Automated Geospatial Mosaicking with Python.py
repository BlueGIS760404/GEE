import os
import glob
import geopandas as gpd
import rasterio
from rasterio.mask import mask
from rasterio.merge import merge
from rasterio.crs import CRS

# Set PROJ_LIB to avoid PROJ conflicts (update path as needed)
os.environ["PROJ_LIB"] = "C:\\Python39\\Lib\\site-packages\\rasterio\\proj_data"  # Adjust to your rasterio or GDAL PROJ path

# Paths
shapefile_path = "...path\\boundary.shp"
tiles_dir = "...path\\tiles"  # Directory containing Landsat tiles
output_mosaic_path = "...path\\mosaic_output.tif"

# Initialize lists to avoid NameError
clipped_rasters = []
temp_files = []

try:
    # Read the shapefile and get its CRS
    gdf = gpd.read_file(shapefile_path)
    shapefile_crs = gdf.crs
    if shapefile_crs is None:
        raise ValueError("Shapefile has no CRS defined. Please assign a valid CRS (e.g., EPSG:4326).")
    print(f"Shapefile CRS: {shapefile_crs}")

    # Get list of all TIFF files in the tiles directory
    tile_paths = glob.glob(os.path.join(tiles_dir, "*.tif"))
    if not tile_paths:
        raise ValueError(f"No TIFF files found in {tiles_dir}")
    print(f"Found {len(tile_paths)} tiles: {tile_paths}")

    # Process each tile: clip to shapefile extent
    for i, tile_path in enumerate(tile_paths):
        print(f"Processing tile {i+1}/{len(tile_paths)}: {tile_path}")
        
        with rasterio.open(tile_path) as src:
            # Check the tile's CRS
            tile_crs = src.crs
            if tile_crs is None:
                raise ValueError(f"Tile {tile_path} has no CRS defined.")
            print(f"Tile CRS: {tile_crs}")

            # Ensure the tile and shapefile CRS match (reproject shapefile if needed)
            if tile_crs != shapefile_crs:
                print(f"Warning: Tile CRS ({tile_crs}) does not match shapefile CRS ({shapefile_crs}). Reprojecting shapefile geometry.")
                gdf_reprojected = gdf.to_crs(tile_crs)
            else:
                gdf_reprojected = gdf

            # Clip the tile to the shapefile geometry
            clipped_image, clipped_transform = mask(src, gdf_reprojected.geometry, crop=True)

            # Create a temporary in-memory raster for the clipped image
            temp_profile = src.profile
            temp_profile.update({
                "height": clipped_image.shape[1],
                "width": clipped_image.shape[2],
                "transform": clipped_transform,
                "crs": tile_crs  # Use tile's CRS temporarily for clipping
            })

            # Save clipped image to a temporary file (required for mosaicking)
            temp_file = f"temp_clipped_{i}.tif"
            with rasterio.open(temp_file, "w", **temp_profile) as dst:
                dst.write(clipped_image)
            temp_files.append(temp_file)

            # Store the clipped raster for mosaicking
            clipped_rasters.append(rasterio.open(temp_file))

    # Mosaic the clipped rasters
    print("Mosaicking clipped tiles...")
    mosaic, mosaic_transform = merge(clipped_rasters)

    # Update the mosaic profile with the shapefile's CRS
    mosaic_profile = clipped_rasters[0].profile
    mosaic_profile.update({
        "height": mosaic.shape[1],
        "width": mosaic.shape[2],
        "transform": mosaic_transform,
        "crs": shapefile_crs  # Set output CRS to shapefile's CRS
    })

    # Save the mosaicked raster
    with rasterio.open(output_mosaic_path, "w", **mosaic_profile) as dst:
        dst.write(mosaic)

    print(f"Mosaicked raster saved as {output_mosaic_path} with CRS: {shapefile_crs}")

except Exception as e:
    print(f"Error occurred: {e}")

finally:
    # Close all rasterio datasets safely
    for raster in clipped_rasters:
        if raster and not raster.closed:
            raster.close()
    # Clean up temporary files
    for temp_file in temp_files:
        if os.path.exists(temp_file):
            os.remove(temp_file)
            print(f"Deleted temporary file: {temp_file}")
