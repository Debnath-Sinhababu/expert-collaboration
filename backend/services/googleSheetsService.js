const { google } = require('googleapis');

class GoogleSheetsService {
  /**
   * Initialize Google Sheets API client
   * @param {string} credentials - Service account credentials JSON or path
   * @returns {google.auth.GoogleAuth} Authenticated client
   */
  static getAuthClient() {
    try {
      // Option 1: Use service account credentials from environment variable (JSON string)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
        return new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
      }
      
      // Option 2: Use service account key file path
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        return new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
      }

      throw new Error('Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
    } catch (error) {
      console.error('Google Sheets auth error:', error);
      throw error;
    }
  }

  /**
   * Read data from Google Sheet
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} range - Sheet range (e.g., 'Sheet1!A1:Z100')
   * @returns {Promise<Array>} Array of rows
   */
  static async readSheet(spreadsheetId, range = 'Sheet1!A1:Z1000') {
    try {
      const auth = await this.getAuthClient();
      const sheets = google.sheets({ version: 'v4', auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // First row is headers
      const headers = rows[0].map(h => (h || '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_'));
      
      // Convert rows to objects
      const data = rows.slice(1).map((row, index) => {
        const obj = { _rowNumber: index + 2 }; // +2 because index starts at 0 and we skip header
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex] ? row[colIndex].trim() : '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error reading Google Sheet:', error);
      throw new Error(`Failed to read Google Sheet: ${error.message}`);
    }
  }

  /**
   * Read data from Google Sheet using public sharing (no auth required)
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} range - Sheet range (e.g., 'Sheet1!A1:Z100')
   * @param {string} gid - Sheet GID (optional, for specific sheet tab)
   * @returns {Promise<Array>} Array of rows
   */
  static async readPublicSheet(spreadsheetId, range = 'Sheet1!A1:Z1000', gid = null) {
    try {
      // Construct CSV export URL
      const exportUrl = gid 
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

      // Use Node.js https/http with redirect following (Google returns 307)
      const https = require('https');
      const http = require('http');
      const fetchWithRedirects = (targetUrl, redirectCount = 0) => {
        const maxRedirects = 5;
        if (redirectCount > maxRedirects) {
          return Promise.reject(new Error('Too many redirects'));
        }
        return new Promise((resolve, reject) => {
          const urlObj = new URL(targetUrl);
          const protocol = urlObj.protocol === 'https:' ? https : http;
          const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ExpertCollaboration/1.0)'
            }
          };
          protocol.get(options, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              const location = response.headers.location;
              const nextUrl = new URL(location, targetUrl).href;
              return fetchWithRedirects(nextUrl, redirectCount + 1).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to fetch sheet: ${response.statusCode} ${response.statusMessage}`));
              return;
            }
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => resolve(data));
            response.on('error', reject);
          }).on('error', reject);
        });
      };

      const csvText = await fetchWithRedirects(exportUrl);
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return [];
      }

      // Parse CSV (simple parser - handles basic cases)
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => (h || '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_'));
      
      const data = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const obj = { _rowNumber: index + 2 };
        headers.forEach((header, colIndex) => {
          obj[header] = values[colIndex] ? values[colIndex].trim() : '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error reading public Google Sheet:', error);
      throw new Error(`Failed to read public Google Sheet: ${error.message}`);
    }
  }
}

module.exports = GoogleSheetsService;
