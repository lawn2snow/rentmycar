/**
 * RentMyCar - Google Drive File Upload Handler
 * Handles document uploads for vehicle registration
 */

// Folder name for storing uploaded documents
const UPLOAD_FOLDER_NAME = 'RentMyCar_Uploads';

/**
 * Get or create the upload folder in Google Drive
 */
function getUploadFolder() {
  const folders = DriveApp.getFoldersByName(UPLOAD_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  }

  // Create the folder if it doesn't exist
  return DriveApp.createFolder(UPLOAD_FOLDER_NAME);
}

/**
 * Get or create a subfolder for a specific user
 */
function getUserFolder(userId) {
  const mainFolder = getUploadFolder();
  const userFolderName = 'user_' + userId;

  const subFolders = mainFolder.getFoldersByName(userFolderName);

  if (subFolders.hasNext()) {
    return subFolders.next();
  }

  return mainFolder.createFolder(userFolderName);
}

/**
 * Upload a file to Google Drive
 * @param {Object} data - Contains file info: fileName, fileData (base64), mimeType, userId, documentType
 * @param {string} sessionToken - User's session token
 */
function uploadFile(data, sessionToken) {
  try {
    // Validate session
    const user = validateSession(sessionToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate required fields
    if (!data.fileName || !data.fileData || !data.mimeType) {
      return { success: false, error: 'Missing required fields: fileName, fileData, mimeType' };
    }

    // Decode base64 file data
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );

    // Get user's folder
    const userFolder = getUserFolder(user.userId);

    // Create subfolder for document type if specified
    let targetFolder = userFolder;
    if (data.documentType) {
      const typeFolders = userFolder.getFoldersByName(data.documentType);
      if (typeFolders.hasNext()) {
        targetFolder = typeFolders.next();
      } else {
        targetFolder = userFolder.createFolder(data.documentType);
      }
    }

    // Create the file in Drive
    const file = targetFolder.createFile(fileBlob);

    // Set file sharing to "Anyone with link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get the file URL
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    const downloadUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

    return {
      success: true,
      file: {
        id: fileId,
        name: file.getName(),
        url: fileUrl,
        downloadUrl: downloadUrl,
        mimeType: data.mimeType,
        size: file.getSize(),
        documentType: data.documentType || 'general',
        uploadedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: 'File upload failed: ' + error.message
    };
  }
}

/**
 * Upload multiple files at once
 * @param {Object} data - Contains files array with file info
 * @param {string} sessionToken - User's session token
 */
function uploadMultipleFiles(data, sessionToken) {
  try {
    // Validate session
    const user = validateSession(sessionToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!data.files || !Array.isArray(data.files)) {
      return { success: false, error: 'Missing files array' };
    }

    const uploadedFiles = [];
    const errors = [];

    data.files.forEach((fileData, index) => {
      try {
        const result = uploadFile({
          fileName: fileData.fileName,
          fileData: fileData.fileData,
          mimeType: fileData.mimeType,
          documentType: fileData.documentType
        }, sessionToken);

        if (result.success) {
          uploadedFiles.push(result.file);
        } else {
          errors.push({ index, fileName: fileData.fileName, error: result.error });
        }
      } catch (err) {
        errors.push({ index, fileName: fileData.fileName, error: err.message });
      }
    });

    return {
      success: true,
      uploadedFiles: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      totalUploaded: uploadedFiles.length,
      totalFailed: errors.length
    };

  } catch (error) {
    return {
      success: false,
      error: 'Multiple file upload failed: ' + error.message
    };
  }
}

/**
 * Delete a file from Google Drive
 * @param {Object} data - Contains fileId
 * @param {string} sessionToken - User's session token
 */
function deleteFile(data, sessionToken) {
  try {
    // Validate session
    const user = validateSession(sessionToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!data.fileId) {
      return { success: false, error: 'Missing fileId' };
    }

    const file = DriveApp.getFileById(data.fileId);

    // Verify the file is in user's folder (security check)
    const userFolder = getUserFolder(user.userId);
    const parents = file.getParents();
    let isOwned = false;

    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() === userFolder.getId() ||
          parent.getParents().hasNext() && parent.getParents().next().getId() === userFolder.getId()) {
        isOwned = true;
        break;
      }
    }

    if (!isOwned) {
      return { success: false, error: 'Access denied: You can only delete your own files' };
    }

    // Move to trash
    file.setTrashed(true);

    return {
      success: true,
      message: 'File deleted successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: 'File deletion failed: ' + error.message
    };
  }
}

/**
 * Get list of user's uploaded files
 * @param {Object} data - Optional filters: documentType
 * @param {string} sessionToken - User's session token
 */
function getUserFiles(data, sessionToken) {
  try {
    // Validate session
    const user = validateSession(sessionToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userFolder = getUserFolder(user.userId);
    const files = [];

    // Get all files in user folder and subfolders
    function getFilesRecursive(folder, documentType) {
      const folderFiles = folder.getFiles();
      while (folderFiles.hasNext()) {
        const file = folderFiles.next();
        files.push({
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl(),
          downloadUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
          mimeType: file.getMimeType(),
          size: file.getSize(),
          documentType: documentType || 'general',
          createdAt: file.getDateCreated().toISOString()
        });
      }

      const subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        const subFolder = subFolders.next();
        getFilesRecursive(subFolder, subFolder.getName());
      }
    }

    getFilesRecursive(userFolder, null);

    // Filter by document type if specified
    let filteredFiles = files;
    if (data && data.documentType) {
      filteredFiles = files.filter(f => f.documentType === data.documentType);
    }

    return {
      success: true,
      files: filteredFiles,
      totalFiles: filteredFiles.length
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to get files: ' + error.message
    };
  }
}

/**
 * Handle file routes
 */
function handleFiles(path, method, data, sessionToken) {
  // POST /files/upload - Upload single file
  if (path === '/files/upload' && method === 'POST') {
    return uploadFile(data, sessionToken);
  }

  // POST /files/upload-multiple - Upload multiple files
  if (path === '/files/upload-multiple' && method === 'POST') {
    return uploadMultipleFiles(data, sessionToken);
  }

  // POST /files/delete - Delete a file
  if (path === '/files/delete' && method === 'POST') {
    return deleteFile(data, sessionToken);
  }

  // GET /files - List user's files
  if (path === '/files' && method === 'GET') {
    return getUserFiles(data, sessionToken);
  }

  return { success: false, error: 'Files endpoint not found' };
}
