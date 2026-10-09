/**
 * ============================================================================
 * AETHERSTUDY ZERO-COST GOOGLE DRIVE STORAGE BRIDGE (100% FREE VIA APPS SCRIPT)
 * WITH AUTOMATIC ORGANIZED FOLDER HIERARCHY
 * ============================================================================
 * 
 * Instructions to deploy / update:
 * 1. Open https://script.google.com and open your AetherStudy project.
 * 2. Replace the code in Code.gs with this entire script.
 * 3. Click "Deploy" -> "Manage deployments" -> Edit (pencil icon) -> New version -> Deploy.
 * 4. All files uploaded will now be neatly organized into proper Drive folders:
 *    - AetherStudy/Class XII/Book-Keeping & Accountancy/Study Notes
 *    - AetherStudy/Class XII/Economics/Textbooks
 *    - AetherStudy/PYQ Vault/2024/Question Papers
 *    - AetherStudy/PYQ Vault/2024/Solutions
 */

var ROOT_FOLDER_NAME = "AetherStudy";

/**
 * Traverses or creates a folder hierarchy in Google Drive
 */
function getOrCreateFolderHierarchy(parentFolder, pathSegments) {
  var current = parentFolder;
  for (var i = 0; i < pathSegments.length; i++) {
    var rawName = pathSegments[i];
    if (!rawName) continue;
    var name = rawName.toString().trim();
    if (!name) continue;

    var iter = current.getFoldersByName(name);
    if (iter.hasNext()) {
      current = iter.next();
    } else {
      current = current.createFolder(name);
    }
  }
  return current;
}

function toRomanStd(std) {
  if (!std) return "XII";
  var s = std.toString().trim().toUpperCase();
  if (s === "12" || s === "XII") return "XII";
  if (s === "11" || s === "XI") return "XI";
  if (s === "10" || s === "X") return "X";
  if (s === "9" || s === "IX") return "IX";
  return s;
}

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
    var standard = payload.standard || "12";
    var category = payload.category || "notes"; // 'textbook' | 'notes' | 'pyq'
    var year = payload.year || "";
    var isAnswerKey = !!payload.isAnswerKey;
    var customPath = payload.folderPath || "";

    if (!base64Data) {
      return jsonResponse({ success: false, error: "Missing file base64 data." });
    }

    // Strip data URL prefix if present
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }

    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // Determine clean folder segments:
    var pathSegments = [];
    if (customPath) {
      pathSegments = customPath.split("/").map(function(p) { return p.trim(); }).filter(Boolean);
    } else if (year || payload.examType) {
      var yrStr = year ? String(year) : "General";
      var subfolder = isAnswerKey ? "Model Solutions" : "Question Papers";
      pathSegments = [ROOT_FOLDER_NAME, "PYQ Vault", yrStr, subject, subfolder];
    } else {
      var stdStr = "Class " + toRomanStd(standard);
      var catStr = category === "textbook" ? "Official Textbooks" : "Study Notes";
      pathSegments = [ROOT_FOLDER_NAME, stdStr, subject, catStr];
    }

    // Locate or create target folder in Google Drive
    var rootFolder = DriveApp.getRootFolder();
    var targetFolder = getOrCreateFolderHierarchy(rootFolder, pathSegments);

    // Create file inside proper folder
    var file = targetFolder.createFile(blob);

    // Make file viewable by anyone with link for embedded in-app viewing
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var streamUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

    return jsonResponse({
      success: true,
      id: fileId,
      name: fileName,
      streamUrl: streamUrl,
      downloadUrl: downloadUrl,
      url: streamUrl,
      sizeBytes: decodedBytes.length,
      folderId: targetFolder.getId(),
      folderName: targetFolder.getName(),
      folderPath: pathSegments.join("/"),
      subject: subject,
      standard: standard,
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

    // Action 1: Pre-create entire folder structure for AetherStudy
    if (action === "init_structure") {
      var root = getOrCreateFolderHierarchy(DriveApp.getRootFolder(), [ROOT_FOLDER_NAME]);
      var standards = ["Class XII", "Class XI"];
      var subjects = [
        "Book-Keeping & Accountancy",
        "Economics",
        "Organization of Commerce & Management",
        "Mathematics & Statistics",
        "Secretarial Practice",
        "English",
        "Information Technology",
        "Hindi",
        "Marathi"
      ];
      var categories = ["Official Textbooks", "Study Notes"];

      for (var s = 0; s < standards.length; s++) {
        for (var sub = 0; sub < subjects.length; sub++) {
          for (var c = 0; c < categories.length; c++) {
            getOrCreateFolderHierarchy(root, [standards[s], subjects[sub], categories[c]]);
          }
        }
      }

      // PYQ Vault structure: 2026 down to 2014
      var pyqRoot = getOrCreateFolderHierarchy(root, ["PYQ Vault"]);
      for (var y = 2026; y >= 2014; y--) {
        getOrCreateFolderHierarchy(pyqRoot, [String(y), "Question Papers"]);
        getOrCreateFolderHierarchy(pyqRoot, [String(y), "Model Solutions"]);
      }

      return jsonResponse({
        success: true,
        message: "Complete AetherStudy organized folder structure initialized successfully!",
        rootFolderId: root.getId()
      });
    }

    // Action 2: Find file by name
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
          downloadUrl: "https://drive.google.com/uc?export=download&id=" + fId,
          url: sUrl,
          sizeBytes: file.getSize(),
          uploadedAt: file.getDateCreated().toISOString()
        });
      }
      return jsonResponse({ success: false, error: "File not found yet." });
    }

    // Action 3: List all study materials across AetherStudy Google Drive folders
    if (action === "list" || action === "list_all") {
      var allFiles = [];
      var rootIter = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
      if (rootIter.hasNext()) {
        var rFolder = rootIter.next();
        function scanFolder(folder, pathSoFar) {
          var fIter = folder.getFiles();
          while (fIter.hasNext()) {
            var fl = fIter.next();
            var id = fl.getId();
            var name = fl.getName();
            var sUrl = "https://drive.google.com/file/d/" + id + "/preview";
            allFiles.push({
              id: id,
              name: name,
              originalName: name,
              streamUrl: sUrl,
              serverUrl: sUrl,
              url: sUrl,
              mimeType: fl.getMimeType(),
              sizeBytes: fl.getSize(),
              size: (fl.getSize() / (1024 * 1024)).toFixed(2) + " MB",
              uploadedAt: fl.getDateCreated().toISOString(),
              folderPath: pathSoFar
            });
          }
          var subIter = folder.getFolders();
          while (subIter.hasNext()) {
            var subF = subIter.next();
            var nextPath = pathSoFar ? (pathSoFar + "/" + subF.getName()) : subF.getName();
            scanFolder(subF, nextPath);
          }
        }
        scanFolder(rFolder, ROOT_FOLDER_NAME);
      }
      return jsonResponse({
        success: true,
        count: allFiles.length,
        files: allFiles
      });
    }

    // Default status ping
    return jsonResponse({
      success: true,
      service: "AetherStudy Google Drive Bridge",
      folderEngine: "Hierarchical Folder Classifier",
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
