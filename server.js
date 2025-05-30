import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new sqlite3.Database('./stories.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories (id)
  )`);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files with proper MIME types - MUST be before API routes and catch-all
app.use('/deepscribe/assets', express.static(join(__dirname, 'client/dist/assets'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Serve other static files (like favicon, etc.)
app.use('/deepscribe', express.static(join(__dirname, 'client/dist'), {
  index: false, // Don't serve index.html for static requests
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Apply rate limiting to API routes
app.use('/deepscribe/api', limiter);

// DeepSeek API integration
async function generateStoryContent(prompt, context = '') {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a creative fiction writer. Write engaging, descriptive stories with rich characters and immersive settings. Keep responses focused on storytelling without meta-commentary.'
        },
        {
          role: 'user',
          content: context ? `${context}\n\nContinue the story: ${prompt}` : prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.8,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw new Error('Failed to generate story content');
  }
}

// Generate chapter summary
async function generateChapterSummary(content) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following chapter in 2-3 sentences, focusing on key plot points and character developments.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Chapter summary unavailable';
  }
}

// API Routes

// Get all stories
app.get('/deepscribe/api/stories', (req, res) => {
  db.all(
    'SELECT * FROM stories ORDER BY updated_at DESC',
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

// Get story by ID with chapters
app.get('/deepscribe/api/stories/:id', (req, res) => {
  const storyId = req.params.id;
  
  db.get('SELECT * FROM stories WHERE id = ?', [storyId], (err, story) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    db.all(
      'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number',
      [storyId],
      (err, chapters) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }
        
        res.json({ ...story, chapters });
      }
    );
  });
});

// Create new story
app.post('/deepscribe/api/stories', (req, res) => {
  const { title, genre } = req.body;
  const storyId = uuidv4();

  db.run(
    'INSERT INTO stories (id, title, genre) VALUES (?, ?, ?)',
    [storyId, title, genre],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }
      
      res.json({ id: storyId, title, genre });
    }
  );
});

// Generate new chapter
app.post('/deepscribe/api/stories/:id/chapters', async (req, res) => {
  const storyId = req.params.id;
  const { prompt } = req.body;

  try {
    // Get story and existing chapters for context
    const story = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM stories WHERE id = ?', [storyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const chapters = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number DESC LIMIT 3',
        [storyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Build context from recent chapters
    let context = `Story: "${story.title}" (${story.genre})\n\n`;
    if (chapters.length > 0) {
      context += 'Recent chapters:\n';
      chapters.reverse().forEach(chapter => {
        context += `Chapter ${chapter.chapter_number}: ${chapter.summary || chapter.content.substring(0, 200)}...\n\n`;
      });
    }

    // Generate new chapter content
    const content = await generateStoryContent(prompt, context);
    const summary = await generateChapterSummary(content);
    
    const chapterId = uuidv4();
    const chapterNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;

    // Save chapter
    db.run(
      'INSERT INTO chapters (id, story_id, chapter_number, content, summary) VALUES (?, ?, ?, ?, ?)',
      [chapterId, storyId, chapterNumber, content, summary],
      function(err) {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        // Update story timestamp
        db.run('UPDATE stories SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [storyId]);

        res.json({
          id: chapterId,
          story_id: storyId,
          chapter_number: chapterNumber,
          content,
          summary
        });
      }
    );

  } catch (error) {
    console.error('Chapter generation error:', error);
    res.status(500).json({ error: 'Failed to generate chapter' });
  }
});

// Delete story
app.delete('/deepscribe/api/stories/:id', (req, res) => {
  const storyId = req.params.id;
  
  db.run('DELETE FROM chapters WHERE story_id = ?', [storyId], (err) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    db.run('DELETE FROM stories WHERE id = ?', [storyId], (err) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }
      
      res.json({ message: 'Story deleted successfully' });
    });
  });
});

// Serve React app for subdirectory routes (AFTER static files and API routes)
app.get('/deepscribe/*', (req, res) => {
  // Don't serve index.html for asset requests
  if (req.path.includes('/assets/') || 
      req.path.endsWith('.js') || 
      req.path.endsWith('.css') || 
      req.path.endsWith('.ico') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.svg')) {
    return res.status(404).send('Not Found');
  }
  
  res.sendFile(join(__dirname, 'client/dist/index.html'));
});

// Root redirect (optional - redirects domain root to your app)
app.get('/', (req, res) => {
  res.redirect('/deepscribe/');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 