# DeepScribe - AI Story Generator

A modern, full-stack web application that uses DeepSeek's LLM to generate engaging fictional stories. Users can create new stories, continue existing ones, and maintain story context across multiple chapters.

## Features

- 🤖 **AI-Powered Storytelling**: Leverages DeepSeek's advanced language model
- 📚 **Chapter Management**: Automatically organizes stories into chapters with summaries
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 💾 **Story Persistence**: SQLite database for reliable story storage
- 🔄 **Context Awareness**: Maintains story context across chapters
- 📱 **Mobile Friendly**: Responsive design works on all devices
- ⚡ **Fast Performance**: Built with Vite and optimized for speed

## Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **DeepSeek API** - AI story generation
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

## Getting Started

### Prerequisites

- Node.js 18+ 
- DeepSeek API key ([Get one here](https://platform.deepseek.com/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd deepscribe
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your DeepSeek API key:
   ```
   DEEPSEEK_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 3000) and frontend (port 5173).

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Deployment to Namecheap Hosting

### Step 1: Prepare Your Application

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Create production environment file**
   Create a `.env` file in the root directory:
   ```
   DEEPSEEK_API_KEY=your_actual_api_key_here
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://yourdomain.com
   ```

### Step 2: Upload to Namecheap

1. **Prepare files for upload**
   - Exclude `node_modules`, `.git`, and development files
   - Include: `server.js`, `package.json`, `client/dist/`, `.env`, and any other necessary files

2. **Upload via cPanel File Manager**
   - Log into your Namecheap cPanel
   - Go to File Manager
   - Navigate to your domain's directory (not `public_html` for Node.js apps)
   - Upload and extract your files

### Step 3: Setup Node.js Application

1. **Access Setup Node.js App in cPanel**
   - Find "Setup Node.js App" in your cPanel
   - Click "Create Application"

2. **Configure the application**
   - **Node.js Version**: 18.x or higher
   - **Application Mode**: Production
   - **Application Root**: Path to your uploaded files
   - **Application URL**: Your domain name
   - **Application Startup File**: `server.js`

3. **Set Environment Variables**
   - Add your environment variables in the Node.js app interface:
     - `DEEPSEEK_API_KEY`: Your DeepSeek API key
     - `NODE_ENV`: production
     - `FRONTEND_URL`: Your domain URL

4. **Install Dependencies**
   - In the Node.js app interface, click "Run NPM Install"
   - Wait for installation to complete

5. **Start the Application**
   - Click "Start App" in the interface
   - Your application should now be live!

### Step 4: SSL Configuration

Namecheap automatically handles SSL certificates, so your app will be available over HTTPS without additional configuration.

## Project Structure

```
deepscribe/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── App.jsx        # Main app component
│   ├── dist/              # Built frontend (after npm run build)
│   └── package.json       # Frontend dependencies
├── server.js              # Express backend server
├── package.json           # Backend dependencies
├── stories.db             # SQLite database (created automatically)
└── README.md             # This file
```

## API Endpoints

- `GET /api/stories` - Get all stories
- `GET /api/stories/:id` - Get story with chapters
- `POST /api/stories` - Create new story
- `POST /api/stories/:id/chapters` - Generate new chapter
- `DELETE /api/stories/:id` - Delete story

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS in production | No |

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request protection
- **Rate Limiting**: API endpoint protection
- **Input Validation**: SQL injection prevention
- **Content Security Policy**: XSS protection

## Troubleshooting

### Common Issues

1. **"Failed to generate story content"**
   - Check your DeepSeek API key
   - Verify your API quota/billing status
   - Check network connectivity

2. **"Database error"**
   - Ensure write permissions for SQLite file
   - Check disk space on hosting

3. **Application won't start on Namecheap**
   - Verify Node.js version compatibility
   - Check that all dependencies installed correctly
   - Review application logs in cPanel

### Namecheap-Specific Notes

- Use the Node.js app interface in cPanel, not traditional PHP hosting
- SSL is automatically handled by Namecheap
- Database files are stored in your application directory
- Environment variables are set through the Node.js app interface

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Namecheap's Node.js hosting documentation
- Create an issue in the repository

---

Made with ❤️ using DeepSeek AI and modern web technologies. 