// =============================================================================
// export-layers.jsx
//
// For the currently open PSD: export each top-level visible layer as its
// own transparent PNG. Layer names become file names (sanitised to
// [a-zA-Z0-9_-]). Originally hidden layers are skipped (treat them as
// "scratch / not for export").
//
// Useful for: producing icon/brand variants from a single source PSD,
// generating per-language versions of a banner, slicing UI mocks into
// per-component PNGs.
//
// HOW TO USE
//   1. Open the source PSD in Photoshop.
//   2. File -> Scripts -> Browse... -> pick this file.
//   3. Choose the output folder.
//   4. The PSD on screen is left untouched; only PNGs are written.
//
// CONFIG
//   PNG_COMPRESSION - 0 (no compression, large file) .. 9 (max compression).
//                     6 is a good balance.
// =============================================================================

#target photoshop

(function () {
  // -------- Config --------
  var PNG_COMPRESSION = 6;
  // ------------------------

  if (!app.documents.length) {
    alert("Open a PSD first, then run this script.");
    return;
  }
  var doc = app.activeDocument;

  var outFolder = Folder.selectDialog("Select folder to save PNGs");
  if (!outFolder) return;

  var savedUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  // Snapshot top-level layer visibility so we can restore at the end.
  var topLayers = [];
  var origVisibility = [];
  for (var i = 0; i < doc.layers.length; i++) {
    topLayers.push(doc.layers[i]);
    origVisibility.push(doc.layers[i].visible);
  }

  // Hide everything; we'll show one layer at a time.
  for (var j = 0; j < topLayers.length; j++) {
    topLayers[j].visible = false;
  }

  var pngOpts = new PNGSaveOptions();
  pngOpts.compression = PNG_COMPRESSION;
  pngOpts.interlaced  = false;

  var exported = 0;
  var skipped  = 0;

  for (var k = 0; k < topLayers.length; k++) {
    var layer = topLayers[k];

    // Skip layers that were hidden in the source - treat as "scratch".
    if (!origVisibility[k]) { skipped++; continue; }

    layer.visible = true;

    var safeName = String(layer.name).replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safeName) safeName = "layer_" + k;
    var outFile = new File(outFolder.fsName + "/" + safeName + ".png");

    doc.saveAs(outFile, pngOpts, true /* asCopy */, Extension.LOWERCASE);
    exported++;

    layer.visible = false;
  }

  // Restore original visibility.
  for (var m = 0; m < topLayers.length; m++) {
    topLayers[m].visible = origVisibility[m];
  }

  app.preferences.rulerUnits = savedUnits;

  alert(
    "Done.\n\n" +
    "Exported: " + exported + " layers\n" +
    "Skipped:  " + skipped + " (hidden in source)\n\n" +
    "Output: " + outFolder.fsName
  );
})();
