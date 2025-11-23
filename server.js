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
    console.log('WebSocket connection established');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.userId) {
                clients.set(data.userId, ws);
                console.log(`User ${data.userId} registered for WebSocket updates`);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        // Remove this connection from all users
        for (const [userId, client] of clients.entries()) {
            if (client === ws) {
                clients.delete(userId);
                console.log(`User ${userId} WebSocket disconnected`);
                break;
            }
        }
    });
});

// Broadcast to specific user
const broadcastToUser = (userId, message) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
        try {
            client.send(JSON.stringify(message));
            console.log(`Sent message to user ${userId}:`, message.type);
        } catch (error) {
            console.error(`Error sending message to user ${userId}:`, error);
            clients.delete(userId);
        }
    } else {
        console.log(`No active WebSocket for user ${userId}`);
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

// User info endpoint for WebSocket registration
app.get('/api/user-info', requireAuth, (req, res) => {
    res.json({
        userId: req.session.userId,
        username: req.session.username,
        isAdmin: req.session.isAdmin
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

// Help page
app.get('/help', requireAuth, (req, res) => {
    res.render('help', { 
        username: req.session.username
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
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const devbenchId = this.lastID;
            console.log(`Created devbench record with ID: ${devbenchId}, full name: ${fullName}`);
            
            // Start the provision script
            setTimeout(() => {
                executeProvisionScript('create', fullName, req.session.userId, devbenchId);
            }, 1000); // Small delay to ensure WebSocket is ready
            
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
    console.log(`Executing provision script: ${command} ${vmName} for user ${userId}`);
    
    const scriptPath = config.provision.scriptPath;
    let output = '';
    
    // Check if script exists
    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found: ${scriptPath}`);
        broadcastToUser(userId, {
            type: 'script_output',
            devbenchId,
            data: `Error: Script not found at ${scriptPath}\n`
        });
        
        // Update database to reflect error
        db.run('UPDATE devbenches SET status = ? WHERE id = ?', ['error', devbenchId]);
        return;
    }
    
    // Send initial message
    broadcastToUser(userId, {
        type: 'script_output',
        devbenchId,
        data: `Starting ${command} operation for ${vmName}...\n`
    });
    
    const child = spawn('bash', [scriptPath, command, vmName], {
        cwd: process.cwd(),
        env: process.env
    });
    
    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`Script output: ${chunk.trim()}`);
        
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
        console.log(`Script error: ${chunk.trim()}`);
        
        broadcastToUser(userId, {
            type: 'script_output',
            devbenchId,
            data: `ERROR: ${chunk}`
        });
    });
    
    child.on('error', (error) => {
        console.error(`Script execution error:`, error);
        broadcastToUser(userId, {
            type: 'script_output',
            devbenchId,
            data: `Execution Error: ${error.message}\n`
        });
        
        db.run('UPDATE devbenches SET status = ? WHERE id = ?', ['error', devbenchId]);
    });
    
    child.on('close', (code) => {
        console.log(`Script finished with exit code: ${code}`);
        
        if (command === 'create') {
            if (code === 0) {
                // Parse the output to extract VM name, SSH port, and VNC port
                const vmNameMatch = output.match(/VM_NAME=(.+)/);
                const sshPortMatch = output.match(/SSH_PORT=(\d+)/);
                const vncPortMatch = output.match(/VNC_PORT=(\d+)/);
                
                if (vmNameMatch && sshPortMatch && vncPortMatch) {
                    const actualName = vmNameMatch[1].trim();
                    const sshPort = sshPortMatch[1];
                    const vncPort = vncPortMatch[1];
                    
                    // Generate SSH and VNC info
                    const sshInfo = sshPort;
                    const vncInfo = vncPort;
                    
                    console.log(`Updating database: ${actualName}, SSH Port: ${sshPort}, VNC Port: ${vncPort}`);
                    
                    db.run(`UPDATE devbenches SET 
                            actual_name = ?, status = 'active', 
                            ssh_info = ?, vnc_info = ?, updated_at = CURRENT_TIMESTAMP 
                            WHERE id = ?`, 
                           [actualName, sshInfo, vncInfo, devbenchId], (err) => {
                        if (err) {
                            console.error('Database update error:', err);
                        } else {
                            console.log('Database updated successfully');
                        }
                    });
                } else {
                    console.log('Could not parse VM info from output');
                    db.run('UPDATE devbenches SET status = ? WHERE id = ?', ['error', devbenchId]);
                }
            } else {
                console.log('Script failed, updating status to error');
                db.run('UPDATE devbenches SET status = ? WHERE id = ?', ['error', devbenchId]);
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
        
        child.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        child.on('close', (code) => {
            // Parse status from output - look for "active" or "inactive" in the output
            let status = 'inactive';
            if (output.includes('active')) {
                status = 'active';
            }
            
            console.log(`Status check for ${devbench.actual_name}: ${status} (exit code: ${code})`);
            
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
            
            child.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                // Parse status from output - look for "active" in the output
                let status = 'inactive';
                if (output.includes('active')) {
                    status = 'active';
                }
                
                if (status !== devbench.status) {
                    console.log(`Status changed for ${devbench.actual_name}: ${devbench.status} -> ${status}`);
                    
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
    console.log(`Database path: ${config.database.path}`);
    console.log(`Provision script path: ${config.provision.scriptPath}`);
    
    // Check if provision script exists
    const fs = require('fs');
    if (fs.existsSync(config.provision.scriptPath)) {
        console.log('✓ Provision script found');
    } else {
        console.log('✗ Provision script NOT found');
    }
});