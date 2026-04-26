// =============================================================================
// add-watermark.jsx
//
// Batch-overlay a transparent-background watermark PNG (e.g. the brand
// logo from public/brand/) onto every photo in a folder. Watermark is
// scaled to a fraction of the image width and placed in one of the four
// corners with adjustable opacity.
//
// HOW TO USE
//   1. Photoshop -> File -> Scripts -> Browse...
//   2. Pick this file.
//   3. Pick the folder of photos to watermark.
//   4. Pick the watermark PNG (PNG with transparent background).
//   5. Output lands in `<input>/watermarked/` next to the originals.
//
// CONFIG (edit the constants at the top of the IIFE)
//   WATERMARK_WIDTH_RATIO   - watermark width as fraction of image width
//                             (0.12 = 12 % wide)
//   WATERMARK_OPACITY       - 0-100; lower = more transparent
//   WATERMARK_POSITION      - "top-left" | "top-right"
//                             | "bottom-left" | "bottom-right"
//   WATERMARK_PADDING_RATIO - corner padding as fraction of image width
//   OUTPUT_QUALITY          - 0-12 JPEG quality of the watermarked output
// =============================================================================

#target photoshop

(function () {
  // -------- Config --------
  var WATERMARK_WIDTH_RATIO   = 0.12;
  var WATERMARK_OPACITY       = 60;
  var WATERMARK_POSITION      = "bottom-right";
  var WATERMARK_PADDING_RATIO = 0.02;
  var OUTPUT_QUALITY          = 9;
  // ------------------------

  var inputFolder = Folder.selectDialog("Select folder with photos to watermark");
  if (!inputFolder) return;

  var watermarkFile = File.openDialog(
    "Select watermark PNG (transparent background)",
    "PNG:*.png"
  );
  if (!watermarkFile) return;

  var outDir = new Folder(inputFolder.fsName + "/watermarked");
  if (!outDir.exists) outDir.create();

  var files = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff)$/i);
  if (!files.length) {
    alert("No image files in:\n" + inputFolder.fsName);
    return;
  }

  var savedUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  // Open the watermark once, copy to clipboard, then close. Each target
  // image just pastes from clipboard. Avoids the "Background layer can't
  // be duplicated to another document" failure mode when the watermark
  // PNG happens to be flat (no alpha).
  var wmDoc = app.open(watermarkFile);
  app.activeDocument = wmDoc;
  wmDoc.selection.selectAll();
  wmDoc.selection.copy();
  wmDoc.close(SaveOptions.DONOTSAVECHANGES);

  var processed = 0;

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!(f instanceof File)) continue;

    var doc = null;
    try {
      doc = app.open(f);
      app.activeDocument = doc;

      var docW = doc.width.value;
      var docH = doc.height.value;

      // Paste the watermark in as a new layer. It lands centred on the
      // canvas; we'll move it to the chosen corner below.
      doc.paste();
      var wmLayer = doc.activeLayer;

      // Resize watermark layer to the configured fraction of doc width.
      var b = wmLayer.bounds;
      var wmW = b[2].value - b[0].value;
      var targetW = docW * WATERMARK_WIDTH_RATIO;
      var scalePct = (targetW / wmW) * 100;
      wmLayer.resize(scalePct, scalePct, AnchorPosition.MIDDLECENTER);

      // Recompute bounds after resize.
      b = wmLayer.bounds;
      wmW = b[2].value - b[0].value;
      var wmH = b[3].value - b[1].value;

      // Compute target top-left corner in document space.
      var pad = docW * WATERMARK_PADDING_RATIO;
      var targetX, targetY;
      if (WATERMARK_POSITION === "top-left") {
        targetX = pad;             targetY = pad;
      } else if (WATERMARK_POSITION === "top-right") {
        targetX = docW - wmW - pad; targetY = pad;
      } else if (WATERMARK_POSITION === "bottom-left") {
        targetX = pad;             targetY = docH - wmH - pad;
      } else { // bottom-right (default)
        targetX = docW - wmW - pad; targetY = docH - wmH - pad;
      }
      wmLayer.translate(
        UnitValue(targetX - b[0].value, "px"),
        UnitValue(targetY - b[1].value, "px")
      );

      wmLayer.opacity = WATERMARK_OPACITY;

      doc.flatten();

      var baseName = f.name.replace(/\.[^.]+$/, "");
      var outFile = new File(outDir.fsName + "/" + baseName + ".jpg");
      var jpgOpts = new JPEGSaveOptions();
      jpgOpts.quality           = OUTPUT_QUALITY;
      jpgOpts.embedColorProfile = true;
      jpgOpts.formatOptions     = FormatOptions.STANDARDBASELINE;
      doc.saveAs(outFile, jpgOpts, true /* asCopy */, Extension.LOWERCASE);

      doc.close(SaveOptions.DONOTSAVECHANGES);
      processed++;
    } catch (e) {
      alert("Error on " + f.name + ":\n" + e.message);
      if (doc) {
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
      }
    }
  }

  app.preferences.rulerUnits = savedUnits;

  alert(
    "Done.\n\n" +
    "Watermarked: " + processed + " of " + files.length + "\n" +
    "Output:      " + outDir.fsName
  );
})();
