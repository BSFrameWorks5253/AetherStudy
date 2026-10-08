/**
 * ============================================================================
 * AETHERSTUDY ZERO-COST GOOGLE DRIVE STORAGE BRIDGE (100% FREE VIA APPS SCRIPT)
 * ============================================================================
 * 
 * Instructions to deploy:
 * 1. Go to https://script.google.com and log in with your personal Google Account.
 * 2. Click "New project".
 * 3. Delete any code in Code.gs and paste this entire script.
 * 4. (Optional) If you have a specific Drive folder, put the folder ID in FOLDER_ID below.
 *    Otherwise, files will be saved in your Drive root folder.
 * 5. Click "Deploy" -> "New deployment" in the top right.
 * 6. Select type: "Web app" (click the gear icon ⚙ next to "Select type" and pick Web app).
 * 7. Configure:
 *    - Description: AetherStudy Drive Bridge
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"
 * 8. Click "Deploy" and authorize access when prompted.
 * 9. Copy the Web App URL (starts with https://script.google.com/macros/s/.../exec).
 * 10. Paste this URL into your .env and Vercel:
 *     GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *     VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 */

var TARGET_FOLDER_ID = ""; // Optional: Enter your Google Drive Folder ID here, or leave empty for root

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request payload received." });
    }

    var payload = JSON.parse(e.postData.contents);
    var fileName = payload.fileName || ("study-material-" + new Date().getTime() + ".pdf");
    var base64Data = payload.fileBase64 || "";
    var mimeType = payload.mimeType || "application/pdf";
    var subject = payload.subject || "General";
    var folderId = payload.folderId || TARGET_FOLDER_ID;

    if (!base64Data) {
      return jsonResponse({ success: false, error: "Missing file base64 data." });
    }

    // Strip data URL header if present
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }

    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var targetFolder;
    if (folderId && folderId.trim() !== "") {
      try {
        targetFolder = DriveApp.getFolderById(folderId.trim());
      } catch (err) {
        targetFolder = DriveApp.getRootFolder();
      }
    } else {
      targetFolder = DriveApp.getRootFolder();
    }

    var file = targetFolder.createFile(blob);

    // Make file viewable by anyone with link for embedded sandboxed iframe viewer
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var streamUrl = "https://drive.google.com/file/d/" + fileId + "/preview";

    return jsonResponse({
      success: true,
      id: fileId,
      name: fileName,
      streamUrl: streamUrl,
      url: streamUrl,
      sizeBytes: decodedBytes.length,
      subject: subject,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    var fileName = (e && e.parameter && e.parameter.fileName) ? e.parameter.fileName : "";

    // Action 1: Find recently uploaded file by name
    if (action === "find" && fileName) {
      var files = DriveApp.getFilesByName(fileName);
      if (files.hasNext()) {
        var file = files.next();
        var fId = file.getId();
        var sUrl = "https://drive.google.com/file/d/" + fId + "/preview";
        return jsonResponse({
          success: true,
          id: fId,
          name: file.getName(),
          streamUrl: sUrl,
          url: sUrl,
          sizeBytes: file.getSize(),
          uploadedAt: file.getDateCreated().toISOString()
        });
      }
      return jsonResponse({ success: false, error: "File not found yet." });
    }

    // Action 2: Get recent uploaded files
    if (action === "latest") {
      var recent = [];
      var iter = DriveApp.getFiles();
      var max = 15;
      while (iter.hasNext() && recent.length < max) {
        var f = iter.next();
        var id = f.getId();
        recent.push({
          id: id,
          name: f.getName(),
          streamUrl: "https://drive.google.com/file/d/" + id + "/preview",
          sizeBytes: f.getSize(),
          uploadedAt: f.getDateCreated().toISOString()
        });
      }
      return jsonResponse({ success: true, files: recent });
    }

    // Default status ping
    return jsonResponse({
      success: true,
      service: "AetherStudy Google Drive Bridge",
      status: "online",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
