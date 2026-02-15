const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { parse, format } = require('date-fns');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const codesData = require('./upload/codes.json');
const CODE_MAP = codesData.codes;

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  const normalizedCode = code.trim().toUpperCase();

  if (CODE_MAP[normalizedCode]) {
    let directory = CODE_MAP[normalizedCode];
    
    res.cookie('authorized_directory', normalizedCode, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'strict' });
    
    res.json({ valid: true, redirect: `/letters/${directory}` });
  } else {
    res.json({ valid: false, message: 'Invalid code. Please try again.' });
  }
});

let checkAuth = (req, res, next) => {
  const path = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const reqDirectory = path.split('/')[0];
  const authorizedDirectory = CODE_MAP[req.cookies.authorized_directory];

  if (!authorizedDirectory || authorizedDirectory !== reqDirectory) {
    return res.redirect('/');
  }

  next();
}

app.get('/letters/*slug', checkAuth, (req, res) => {
  const requestedPath = Array.isArray(req.params.slug)
    ? req.params.slug.join('/')
    : req.params.slug;

  const fullPath = path.join(__dirname, 'upload', requestedPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('Not found');
  }

  const stats = fs.statSync(fullPath);

  if (stats.isFile()) {
    return res.sendFile(fullPath);
  }

  fs.readdir(fullPath, (err, items) => {
    if (err) {
      return res.status(500).send('Server error');
    }

    const pathParts = requestedPath.split('/');
    const slug = pathParts[0];
    const subpath = pathParts.slice(1).join('/');

    const isRootLevel = pathParts.length === 1;
    res.send(generateDirectoryHtml(slug, subpath, items, isRootLevel));
  });
});

const generateDirectoryHtml = (slug, subpath, items, isRootLevel) => {
  const listItems = items.map(item => {
    const itemPath = path.join(__dirname, 'upload', slug, subpath, item);
    const isDirectory = fs.statSync(itemPath).isDirectory();
    
    if (isDirectory) {
      return `
        <li>
          <a href="/letters/${slug}/${subpath ? subpath + '/' : ''}${item}">
            <span class="file-icon">📁</span>
            <span>${formatDateFolder(item)}</span>
          </a>
        </li>
      `;
    } else {
      return `
        <li>
          <a href="/letters/${slug}/${subpath ? subpath + '/' : ''}${item}" target="_blank">
            <span class="file-icon">${getFileIcon(item)}</span>
            <span>${item}</span>
          </a>
        </li>
      `;
    }
  }).join('');

  let backUrl, backText;
  if (!subpath) {
    backUrl = '/';
    backText = '← back';
  } else {
    const pathParts = subpath.split('/');
    if (pathParts.length === 1) {
      backUrl = `/letters/${slug}`;
      backText = '← back to all dates';
    } else {
      pathParts.pop();
      backUrl = `/letters/${slug}/${pathParts.join('/')}`;
      backText = '← back';
    }
  }
  const backLink = `<a href="${backUrl}" class="back-link">${backText}</a>`;

  let heading;
  if (!subpath) {
    heading = `letters for ${slug}`;
  } else {
    const dateFolderName = subpath.split('/')[0];
    const formattedDate = formatDateFolder(dateFolderName);
    heading = `letters from ${formattedDate}`;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap');        
        
        * {
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Roboto Mono', monospace;
          background: #faf8f3;
          color: #333;
          padding: 40px 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 10px;
          font-weight: normal;
        }
        p {
          color: #666;
          margin-bottom: 30px;
        }
        .file-list {
          list-style: none;
        }
        .file-list li {
          margin: 15px 0;
          padding: 15px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .file-list li:hover {
          border-color: #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .file-list a {
          text-decoration: none;
          color: #333;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .file-icon {
          font-size: 1.5rem;
          font-family: "Noto Color Emoji", sans-serif;
          font-weight: 400;
          font-style: normal;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: #666;
          text-decoration: none;
        }
        .back-link:hover {
          color: #333;
        }
        .empty {
          text-align: center;
          color: #999;
          padding: 40px;
        }
      </style>
    </head>
    <body>
      ${backLink}
      <h1>${heading}</h1>
      <p>${isRootLevel ? 'your collection of letters, scans, and recordings' : 'files from this date'}</p>

      ${items.length > 0 ? `
        <ul class="file-list">
          ${listItems}
        </ul>
      ` : `
        <div class="empty">No ${isRootLevel ? 'dates' : 'files'} yet. Rushil will add some soon!</div>
      `}
    </body>
    </html>`;
}

function formatDateFolder(folderName) {
  const dateMatch = folderName.match(/^(\d{2})(\d{2})(\d{2})$/);

  if (!dateMatch) {
    return folderName;
  }

  return format(parse(folderName, 'MMddyy', new Date()), 'MMMM do, yyyy');
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'txt': '📄',
    'pdf': '📄',
    'doc': '📄',
    'docx': '📄',
    'mp3': '🎵',
    'm4a': '🎵',
    'wav': '🎵',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'mp4': '🎬',
    'mov': '🎬',
  };
  return icons[ext] || '📎';
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

app.use('/api/verify-code', limiter);

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});