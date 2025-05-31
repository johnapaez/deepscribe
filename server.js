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
import crypto from 'crypto';

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
    password_hash TEXT,
    is_protected INTEGER DEFAULT 0,
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

  // Add password protection columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE stories ADD COLUMN password_hash TEXT`, () => {});
  db.run(`ALTER TABLE stories ADD COLUMN is_protected INTEGER DEFAULT 0`, () => {});
});

// Password hashing utilities
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, hashedPassword) {
  if (!hashedPassword) return false;
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

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

// Get all stories (without sensitive data)
app.get('/deepscribe/api/stories', (req, res) => {
  db.all(
    'SELECT id, title, genre, is_protected, created_at, updated_at, status FROM stories ORDER BY updated_at DESC',
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

// Get story by ID with chapters (requires password if protected)
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

    // If story is protected, don't return content without password verification
    if (story.is_protected) {
      res.status(403).json({ 
        error: 'Story is password protected',
        requiresPassword: true,
        story: {
          id: story.id,
          title: story.title,
          genre: story.genre,
          is_protected: story.is_protected,
          created_at: story.created_at,
          updated_at: story.updated_at
        }
      });
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

// Verify story password and get full story data
app.post('/deepscribe/api/stories/:id/verify', (req, res) => {
  const storyId = req.params.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  db.get('SELECT * FROM stories WHERE id = ?', [storyId], (err, story) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    if (!story.is_protected || !verifyPassword(password, story.password_hash)) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Password is correct, return full story data
    db.all(
      'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number',
      [storyId],
      (err, chapters) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }
        
        // Remove password hash from response
        const { password_hash, ...storyData } = story;
        res.json({ ...storyData, chapters });
      }
    );
  });
});

// Set password for a story
app.post('/deepscribe/api/stories/:id/password', (req, res) => {
  const storyId = req.params.id;
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  const passwordHash = hashPassword(password);

  db.run(
    'UPDATE stories SET password_hash = ?, is_protected = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, storyId],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }
      
      res.json({ message: 'Password set successfully' });
    }
  );
});

// Remove password protection from a story
app.delete('/deepscribe/api/stories/:id/password', (req, res) => {
  const storyId = req.params.id;
  const { password } = req.body;

  // First verify the current password
  db.get('SELECT password_hash FROM stories WHERE id = ?', [storyId], (err, story) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    if (!verifyPassword(password, story.password_hash)) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Password verified, remove protection
    db.run(
      'UPDATE stories SET password_hash = NULL, is_protected = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [storyId],
      function(err) {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }
        
        res.json({ message: 'Password protection removed' });
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
      
      res.json({ id: storyId, title, genre, is_protected: 0 });
    }
  );
});

// Generate new chapter (requires password if story is protected)
app.post('/deepscribe/api/stories/:id/chapters', async (req, res) => {
  const storyId = req.params.id;
  const { prompt, password } = req.body;

  try {
    // Get story and verify access
    const story = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM stories WHERE id = ?', [storyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check password if story is protected
    if (story.is_protected && !verifyPassword(password, story.password_hash)) {
      return res.status(401).json({ error: 'Invalid password' });
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