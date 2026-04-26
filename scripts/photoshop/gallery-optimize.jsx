// =============================================================================
// gallery-optimize.jsx
//
// Batch-resize a folder of photos into the (full + thumb) pair the website
// gallery expects. Drop-in replacement for the legacy `sips` pipeline:
// produces sRGB JPEGs with predictable file sizes and Photoshop-quality
// resampling instead of the OS-level nearest-neighbour-ish output sips
// gives.
//
// HOW TO USE
//   1. Photoshop -> File -> Scripts -> Browse...
//   2. Pick this file.
//   3. In the dialog, select the folder containing your source photos.
//   4. Output lands in `<input>/full/` and `<input>/thumb/` next to the
//      originals - originals are not touched.
//
// CONFIG (edit the constants at the top of the IIFE)
//   FULL_LONG_SIDE_PX  - longest side of the "full" variant in pixels
//   THUMB_LONG_SIDE_PX - longest side of the "thumb" variant
//   FULL_QUALITY       - JPEG quality 0-12 (8 ~= q80, matches sips q80)
//   THUMB_QUALITY      - JPEG quality 0-12 (7 ~= q70-75)
//
// NOTES
//   - Color profile is converted to sRGB before resize (gallery standard).
//   - Source files left untouched. Re-running the script overwrites
//     existing full/thumb output with the same names.
//   - Recognised inputs: jpg / jpeg / png / tif / tiff (case-insensitive).
// =============================================================================

#target photoshop

(function () {
  // -------- Config --------
  var FULL_LONG_SIDE_PX  = 1600;
  var THUMB_LONG_SIDE_PX = 600;
  var FULL_QUALITY       = 8; // 0-12, 8 ~= q80
  var THUMB_QUALITY      = 7; // 0-12, 7 ~= q70-75
  // ------------------------

  var inputFolder = Folder.selectDialog("Select folder with source photos");
  if (!inputFolder) return;

  var fullDir  = new Folder(inputFolder.fsName + "/full");
  var thumbDir = new Folder(inputFolder.fsName + "/thumb");
  if (!fullDir.exists)  fullDir.create();
  if (!thumbDir.exists) thumbDir.create();

  var files = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff)$/i);
  if (!files.length) {
    alert("No image files (jpg / png / tif) in:\n" + inputFolder.fsName);
    return;
  }

  // Save user's ruler preference + force pixels for predictable resize.
  var savedUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var processed = 0;
  var skipped   = 0;

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!(f instanceof File)) { skipped++; continue; }

    var doc = null;
    try {
      doc = app.open(f);

      // Convert to sRGB so colours look the same in browsers regardless of
      // what profile the source had (Adobe RGB, ProPhoto, untagged, ...).
      doc.convertProfile(
        "sRGB IEC61966-2.1",
        Intent.RELATIVECOLORIMETRIC,
        true,
        true
      );
      doc.flatten();

      var origW = doc.width.value;
      var origH = doc.height.value;
      var longest = origW > origH ? origW : origH;

      var baseName = f.name.replace(/\.[^.]+$/, "");

      // ---- Full variant ----
      var fullScale = FULL_LONG_SIDE_PX / longest;
      doc.resizeImage(
        UnitValue(origW * fullScale, "px"),
        UnitValue(origH * fullScale, "px"),
        72,
        ResampleMethod.BICUBICSHARPER
      );
      saveJpeg(
        doc,
        new File(fullDir.fsName + "/" + baseName + ".jpg"),
        FULL_QUALITY
      );

      // ---- Thumb variant (downsample further from current state) ----
      var nowLongest = doc.width.value > doc.height.value
        ? doc.width.value : doc.height.value;
      var thumbScale = THUMB_LONG_SIDE_PX / nowLongest;
      doc.resizeImage(
        UnitValue(doc.width.value  * thumbScale, "px"),
        UnitValue(doc.height.value * thumbScale, "px"),
        72,
        ResampleMethod.BICUBICSHARPER
      );
      saveJpeg(
        doc,
        new File(thumbDir.fsName + "/" + baseName + ".jpg"),
        THUMB_QUALITY
      );

      doc.close(SaveOptions.DONOTSAVECHANGES);
      processed++;
    } catch (e) {
      alert("Error on " + f.name + ":\n" + e.message);
      if (doc) {
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
      }
      skipped++;
    }
  }

  app.preferences.rulerUnits = savedUnits;

  alert(
    "Done.\n\n" +
    "Processed: " + processed + "\n" +
    "Skipped:   " + skipped   + "\n\n" +
    "Full  -> " + fullDir.fsName + "\n" +
    "Thumb -> " + thumbDir.fsName
  );

  function saveJpeg(targetDoc, outFile, quality) {
    var opts = new JPEGSaveOptions();
    opts.quality            = quality;
    opts.embedColorProfile  = true;
    opts.formatOptions      = FormatOptions.STANDARDBASELINE;
    opts.matte              = MatteType.NONE;
    targetDoc.saveAs(outFile, opts, true /* asCopy */, Extension.LOWERCASE);
  }
})();
