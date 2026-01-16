/**
 * RentMyCar - Utility Functions
 */

/**
 * Generate a UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hash a password using SHA-256 with salt
 */
function hashPassword(password, salt) {
  if (!salt) {
    salt = generateUUID();
  }
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + password
  );
  const hashString = hash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  return salt + ':' + hashString;
}

/**
 * Verify a password against a hash
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const newHash = hashPassword(password, salt);
  return newHash === storedHash;
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  const bytes = [];
  for (let i = 0; i < 32; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return Utilities.base64Encode(bytes);
}

/**
 * Get the spreadsheet instance
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Get a specific sheet by name
 */
function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

/**
 * Convert sheet data to array of objects
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const objects = [];

  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    objects.push(obj);
  }

  return objects;
}

/**
 * Find a row by column value
 */
function findRowByValue(sheet, columnIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      return { rowIndex: i + 1, data: data[i] };
    }
  }
  return null;
}

/**
 * Create a JSON response
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields
 */
function validateRequired(data, fields) {
  const missing = [];
  for (const field of fields) {
    if (!data[field] || data[field].toString().trim() === '') {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Parse JSON safely
 */
function safeParseJSON(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue || [];
  }
}

/**
 * Format date for sheet storage
 */
function formatDate(date) {
  return Utilities.formatDate(date || new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Calculate days between two dates
 */
function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}
