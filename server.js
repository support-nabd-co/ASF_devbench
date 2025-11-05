const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Database setup
const db = new sqlite3.Database(config.database.path);

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // DevBenches table
    db.run(`CREATE TABLE IF NOT EXISTS devbenches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        actual_name TEXT,
        status TEXT DEFAULT 'inactive',
        ssh_info TEXT,
        vnc_info TEXT,
        vm_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create default admin user if not exists
    const adminPassword = bcrypt.hashSync(config.defaultAdmin.password, 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, is_admin) 
            VALUES (?, ?, ?, 1)`, [config.defaultAdmin.username, config.defaultAdmin.email, adminPassword]);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: config.session.maxAge }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.userId && req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Access denied');
    }
};

// WebSocket connections for real-time updates
const clients = new Map();

wss.on('connection', (ws, req) => {
    const userId = req.session?.userId;
    if (userId) {
        clients.set(userId, ws);
        
        ws.on('close', () => {
            clients.delete(userId);
        });
    }
});

// Broadcast to specific user
const broadcastToUser = (userId, message) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        if (req.session.isAdmin) {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin === 1;
        
        if (user.is_admin) {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin routes
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
    db.all(`SELECT u.*, COUNT(d.id) as devbench_count 
            FROM users u 
            LEFT JOIN devbenches d ON u.id = d.user_id 
            WHERE u.is_admin = 0 
            GROUP BY u.id`, (err, users) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        
        db.all(`SELECT d.*, u.username 
                FROM devbenches d 
                JOIN users u ON d.user_id = u.id 
                ORDER BY d.created_at DESC`, (err, devbenches) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Database error');
            }
            
            res.render('admin', { users, devbenches });
        });
    });
});

app.post('/admin/add-user', requireAuth, requireAdmin, (req, res) => {
    const { username, email, password } = req.body;
    
    // Validate username (no spaces, numbers, or special characters)
    if (!config.validation.username.test(username)) {
        return res.status(400).json({ error: 'Username must contain only letters' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
           [username, email, hashedPassword], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

app.post('/admin/delete-user/:id', requireAuth, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Delete user's devbenches first
    db.run('DELETE FROM devbenches WHERE user_id = ?', [userId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Delete user
        db.run('DELETE FROM users WHERE id = ? AND is_admin = 0', [userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        });
    });
});

app.post('/admin/reset-password/:id', requireAuth, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    db.run('UPDATE users SET password = ? WHERE id = ? AND is_admin = 0', 
           [hashedPassword, userId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// User dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    
    db.all('SELECT * FROM devbenches WHERE user_id = ? ORDER BY created_at DESC', 
           [req.session.userId], (err, devbenches) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        
        res.render('dashboard', { 
            username: req.session.username, 
            devbenches 
        });
    });
});

// DevBench operations
app.post('/create-devbench', requireAuth, (req, res) => {
    const { name } = req.body;
    
    // Validate devbench name (only letters, numbers, hyphens, underscores)
    if (!config.validation.devbenchName.test(name)) {
        return res.status(400).json({ 
            error: 'DevBench name can only contain letters, numbers, hyphens, and underscores' 
        });
    }
    
    const fullName = `${req.session.username}_${name}`;
    
    // Check if devbench already exists
    db.get('SELECT * FROM devbenches WHERE user_id = ? AND name = ?', 
           [req.session.userId, name], (err, existing) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (existing) {
            return res.status(400).json({ error: 'DevBench with this name already exists' });
        }
        
        // Insert into database first
        db.run('INSERT INTO devbenches (user_id, name, status) VALUES (?, ?, ?)', 
               [req.session.userId, name, 'creating'], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            const devbenchId = this.lastID;
            
            // Start the provision script
            executeProvisionScript('create', fullName, req.session.userId, devbenchId);
            
            res.json({ success: true, devbenchId });
        });
    });
});

app.post('/delete-devbench/:id', requireAuth, (req, res) => {
    const devbenchId = req.params.id;
    
    db.get('SELECT * FROM devbenches WHERE id = ? AND user_id = ?', 
           [devbenchId, req.session.userId], (err, devbench) => {
        if (err || !devbench) {
            return res.status(404).json({ error: 'DevBench not found' });
        }
        
        if (devbench.actual_name) {
            executeProvisionScript('delete', devbench.actual_name, req.session.userId, devbenchId);
        }
        
        db.run('DELETE FROM devbenches WHERE id = ?', [devbenchId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        });
    });
});

app.post('/activate-devbench/:id', requireAuth, (req, res) => {
    const devbenchId = req.params.id;
    
    db.get('SELECT * FROM devbenches WHERE id = ? AND user_id = ?', 
           [devbenchId, req.session.userId], (err, devbench) => {
        if (err || !devbench) {
            return res.status(404).json({ error: 'DevBench not found' });
        }
        
        if (devbench.actual_name) {
            executeProvisionScript('activate', devbench.actual_name, req.session.userId, devbenchId);
        }
        
        res.json({ success: true });
    });
});

// Function to execute provision script
function executeProvisionScript(command, vmName, userId, devbenchId) {
    const scriptPath = config.provision.scriptPath;
    const child = spawn('bash', [scriptPath, command, vmName]);
    
    let output = '';
    
    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Broadcast real-time output to user
        broadcastToUser(userId, {
            type: 'script_output',
            devbenchId,
            data: chunk
        });
    });
    
    child.stderr.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        broadcastToUser(userId, {
            type: 'script_output',
            devbenchId,
            data: chunk
        });
    });
    
    child.on('close', (code) => {
        if (command === 'create' && code === 0) {
            // Parse the output to extract actual VM name and connection info
            const actualNameMatch = output.match(/✅ VM '([^']+)' started with IP:/);
            const ipMatch = output.match(/VM IP: (\d+\.\d+\.\d+\.\d+)/);
            const sshMatch = output.match(/SSH: (.+)/);
            const vncMatch = output.match(/VNC: (.+)/);
            
            if (actualNameMatch) {
                const actualName = actualNameMatch[1];
                const vmIp = ipMatch ? ipMatch[1] : null;
                const sshInfo = sshMatch ? sshMatch[1] : null;
                const vncInfo = vncMatch ? vncMatch[1] : null;
                
                db.run(`UPDATE devbenches SET 
                        actual_name = ?, status = 'active', vm_ip = ?, 
                        ssh_info = ?, vnc_info = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`, 
                       [actualName, vmIp, sshInfo, vncInfo, devbenchId]);
            }
        }
        
        broadcastToUser(userId, {
            type: 'script_complete',
            devbenchId,
            exitCode: code
        });
    });
}

// Status check endpoint
app.get('/check-status/:id', requireAuth, (req, res) => {
    const devbenchId = req.params.id;
    
    db.get('SELECT * FROM devbenches WHERE id = ? AND user_id = ?', 
           [devbenchId, req.session.userId], (err, devbench) => {
        if (err || !devbench || !devbench.actual_name) {
            return res.json({ status: 'unknown' });
        }
        
        const child = spawn('bash', [config.provision.scriptPath, 'status', devbench.actual_name]);
        let output = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.on('close', (code) => {
            const status = output.trim() === 'active' ? 'active' : 'inactive';
            
            db.run('UPDATE devbenches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                   [status, devbenchId]);
            
            res.json({ status });
        });
    });
});

// Periodic status check (every minute)
setInterval(() => {
    db.all('SELECT * FROM devbenches WHERE actual_name IS NOT NULL', (err, devbenches) => {
        if (err) return;
        
        devbenches.forEach(devbench => {
            const child = spawn('bash', [config.provision.scriptPath, 'status', devbench.actual_name]);
            let output = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                const status = output.trim() === 'active' ? 'active' : 'inactive';
                
                if (status !== devbench.status) {
                    db.run('UPDATE devbenches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                           [status, devbench.id]);
                    
                    // Notify user of status change
                    broadcastToUser(devbench.user_id, {
                        type: 'status_update',
                        devbenchId: devbench.id,
                        status
                    });
                }
            });
        });
    });
}, config.provision.statusCheckInterval);

const PORT = config.port;
server.listen(PORT, () => {
    console.log(`DevBench Manager running on port ${PORT}`);
});