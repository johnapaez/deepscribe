# Deployment Guide for Namecheap Hosting

This guide will walk you through deploying your DeepScribe application to Namecheap shared hosting with Node.js support.

## Prerequisites

1. Namecheap hosting account with Node.js support
2. Domain pointing to your hosting account
3. DeepSeek API key
4. cPanel access

## Step-by-Step Deployment

### 1. Prepare Your Local Environment

First, configure for subdirectory deployment and build the production version:

**Important**: If your app will be deployed to a subdirectory (e.g., `yourdomaincom/deepscribe`), make sure the `base` path in `client/vite.config.js` matches your deployment path:

```javascript
// client/vite.config.js
export default defineConfig({
  base: '/deepscribe/', // Change this to match your deployment subdirectory
  // ... rest of config
})
```

Then build the frontend:

```bash
# Navigate to client directory
cd client

# Install dependencies if not already done
npm install

# Build for production
npm run build
```

This creates a `dist` folder with optimized production files.

### 2. Prepare Files for Upload

Create a deployment folder with these files:
```
deployment/
├── server.js                 # Main server file
├── package.json              # Backend dependencies
├── client/
│   └── dist/                 # Built frontend files
└── .env                      # Environment variables
```

**Important**: Do NOT include:
- `node_modules/` folders
- `.git/` directory
- Development files
- `client/src/` (only include `client/dist/`)

### 3. Configure Environment Variables

Create a `.env` file in your deployment folder:

```env
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

### 4. Upload to Namecheap

#### Option A: File Manager (Recommended)

1. **Log into cPanel**
   - Go to your Namecheap account
   - Access cPanel for your domain

2. **Open File Manager**
   - Navigate to File Manager
   - Go to your domain's root directory (NOT public_html for Node.js apps)

3. **Upload Files**
   - Create a new folder for your app (e.g., `deepscribe`)
   - Upload your deployment files to this folder
   - Extract any zip files you uploaded

#### Option B: FTP/SFTP

1. Use your preferred FTP client
2. Connect using your cPanel credentials
3. Upload files to your app directory

### 5. Setup Node.js Application in cPanel

1. **Find Node.js App Section**
   - In cPanel, look for "Setup Node.js App" or "Node.js Apps"
   - Click to open the interface

2. **Create New Application**
   - Click "Create Application"
   - Fill in the configuration:

   ```
   Node.js Version: 18.x (or latest available)
   Application Mode: Production
   Application Root: /path/to/your/app/folder
   Application URL: https://yourdomain.com/deepscribe
   Application Startup File: server.js
   ```

3. **Set Environment Variables**
   In the Node.js app interface, add these environment variables:
   
   | Name | Value |
   |------|-------|
   | `DEEPSEEK_API_KEY` | Your DeepSeek API key |
   | `NODE_ENV` | production |
   | `FRONTEND_URL` | https://yourdomain.com |

### 6. Install Dependencies

1. **In the Node.js App Interface**
   - Look for "Run NPM Install" button
   - Click it and wait for installation to complete
   - This installs all dependencies listed in package.json

2. **Alternative: SSH Method**
   If available, you can use SSH:
   ```bash
   # Enter virtual environment
   source /home/username/nodevenv/domain.com/18/bin/activate
   
   # Navigate to app directory
   cd /path/to/your/app
   
   # Install dependencies
   npm install --production
   ```

### 7. Start Your Application

1. **Start the App**
   - In the Node.js app interface, click "Start App"
   - Wait for the application to start
   - You should see a "Running" status

2. **Test Your Application**
   - Visit `https://yourdomain.com/deepscribe` in a browser
   - You should see the DeepScribe interface
   - Test creating a story to verify everything works

## Important: Subdirectory Configuration

**If you're deploying to a subdirectory** (which is common with shared hosting), ensure these settings match your deployment path:

1. **Vite config** (`client/vite.config.js`):
   ```javascript
   base: '/deepscribe/' // Match your subdirectory
   ```

2. **React Router** (`client/src/App.jsx`):
   ```javascript
   <Router basename="/deepscribe">
   ```

3. **API paths** (`client/src/utils/api.js`):
   ```javascript
   const API_BASE_URL = '/deepscribe/api'
   ```

4. **Server routes** (`server.js`):
   ```javascript
   app.use('/deepscribe', express.static(...))
   app.get('/deepscribe/api/...', ...)
   ```

**After making any path changes, rebuild the frontend:**
```bash
cd client
npm run build
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Assets Loading from Wrong Path

**Error**: Files loading from `domain.com/assets` instead of `domain.com/deepscribe/assets`

**Solutions**:
- Check `base: '/deepscribe/'` in `client/vite.config.js`
- Rebuild frontend: `cd client && npm run build`
- Re-upload the `client/dist/` folder

#### 2. Application Won't Start

**Error**: "Application failed to start"

**Solutions**:
- Check that `server.js` is in the root of your app directory
- Verify all environment variables are set
- Ensure Node.js version is compatible (18.x+)
- Check application logs in cPanel

#### 3. Dependencies Installation Failed

**Error**: "NPM install failed"

**Solutions**:
- Check your `package.json` syntax
- Ensure you have sufficient disk space
- Try installing dependencies individually via SSH

#### 4. Database Errors

**Error**: "Database connection failed"

**Solutions**:
- Ensure SQLite is supported (it usually is)
- Check file permissions
- Verify the app directory is writable

#### 5. API Key Issues

**Error**: "Failed to generate story content"

**Solutions**:
- Verify your DeepSeek API key is correct
- Check your API quota/billing status
- Ensure the environment variable is set correctly

#### 6. CORS Errors

**Error**: "CORS policy blocked"

**Solutions**:
- Verify `FRONTEND_URL` environment variable
- Check that your domain URL is correct
- Ensure SSL is working properly

#### 7. 404 Errors on Page Refresh

**Error**: Page not found when refreshing React routes

**Solutions**:
- Ensure server routes handle subdirectory correctly
- Check that `app.get('/deepscribe/*', ...)` route exists
- Verify static file serving path

### Performance Optimization

1. **Enable Compression**
   The server includes compression middleware for better performance.

2. **Use a CDN**
   Consider using Namecheap's CDN services for static assets.

3. **Monitor Resources**
   - Watch your hosting resource usage
   - Consider upgrading if you hit limits

## Updating Your Application

To update your deployed application:

1. **Build new version locally**
   ```bash
   cd client
   npm run build
   ```

2. **Upload updated files**
   - Replace `client/dist/` folder
   - Update `server.js` if needed
   - Update environment variables if needed

3. **Restart application**
   - In cPanel Node.js interface, click "Restart App"

## Security Considerations

1. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

2. **Environment Variables**
   - Never commit `.env` files to version control
   - Use strong, unique API keys
   - Rotate keys periodically

3. **Monitor Access**
   - Check application logs regularly
   - Monitor for unusual activity
   - Keep backups of your database

## Support

If you encounter issues:

1. **Check Namecheap Documentation**
   - Node.js hosting guides
   - cPanel tutorials

2. **Contact Support**
   - Namecheap hosting support
   - DeepSeek API support

3. **Community Resources**
   - Namecheap community forums
   - Node.js hosting communities

## Final Checklist

Before going live:

- [ ] DeepSeek API key is working
- [ ] Frontend builds without errors
- [ ] Base path configured for subdirectory
- [ ] All environment variables are set
- [ ] Application starts successfully
- [ ] Can create and view stories
- [ ] Assets load from correct subdirectory
- [ ] SSL certificate is active
- [ ] Database is writable
- [ ] Performance is acceptable

Congratulations! Your DeepScribe application should now be live and ready for users to create amazing AI-generated stories. 