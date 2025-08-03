const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const SSH = require('ssh2-promise');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret - In production, use a secure random string from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// SSH Configuration
const SSH_CONFIG = {
  host: 'asf-tb.duckdns.org',
  username: 'asf',
  password: 'ASF'
};

// Initialize Firebase Admin SDK
// Assumes __firebase_config and __app_id are available as global variables or environment variables
let db;
try {
  const firebaseConfig = global.__firebase_config || JSON.parse(process.env.FIREBASE_CONFIG || '{}');
  const appId = global.__app_id || process.env.APP_ID || 'default-app';
  
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: firebaseConfig.databaseURL
  });
  
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('⚠️  Make sure __firebase_config and __app_id are properly configured');
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

/**
 * GET /api/health
 * Health check endpoint for Docker container monitoring
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

/**
 * POST /api/login
 * Simple authentication endpoint that accepts any non-empty username
 * Returns a JWT token for subsequent API calls
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;

    // Basic validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required and must be a non-empty string' });
    }

    const trimmedUsername = username.trim();

    // Create user document in Firestore if it doesn't exist
    if (db) {
      const appId = global.__app_id || process.env.APP_ID || 'default-app';
      const userRef = db.collection('artifacts').doc(appId).collection('users').doc(trimmedUsername);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          username: trimmedUsername,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Created new user: ${trimmedUsername}`);
      }
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { username: trimmedUsername },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
    console.log(`✅ User logged in: ${trimmedUsername}`);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * GET /api/devbenches
 * Fetch all devbenches for the authenticated user
 * Returns an array of devbench objects with real-time data
 */
app.get('/api/devbenches', authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = global.__app_id || process.env.APP_ID || 'default-app';
    const devbenchesRef = db.collection('artifacts').doc(appId)
      .collection('users').doc(username)
      .collection('devbenches');

    const snapshot = await devbenchesRef.orderBy('createdAt', 'desc').get();
    
    const devbenches = [];
    snapshot.forEach(doc => {
      devbenches.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      });
    });

    res.json(devbenches);
    console.log(`✅ Fetched ${devbenches.length} devbenches for user: ${username}`);

  } catch (error) {
    console.error('❌ Error fetching devbenches:', error);
    res.status(500).json({ error: 'Failed to fetch devbenches' });
  }
});

/**
 * POST /api/devbenches/create
 * Create a new devbench by triggering the remote shell script via SSH
 * Updates Firestore with real-time status updates
 */
app.post('/api/devbenches/create', authenticateToken, async (req, res) => {
  try {
    const { devbenchName } = req.body;
    const { username } = req.user;

    // Validation
    if (!devbenchName || typeof devbenchName !== 'string' || devbenchName.trim().length === 0) {
      return res.status(400).json({ error: 'Devbench name is required and must be a non-empty string' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const trimmedDevbenchName = devbenchName.trim();
    const appId = global.__app_id || process.env.APP_ID || 'default-app';
    
    // Create initial devbench document in Firestore
    const devbenchesRef = db.collection('artifacts').doc(appId)
      .collection('users').doc(username)
      .collection('devbenches');

    const newDevbenchRef = await devbenchesRef.add({
      name: trimmedDevbenchName,
      status: 'Creating',
      userId: username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      details: {}
    });

    console.log(`✅ Created devbench document: ${newDevbenchRef.id} for user: ${username}`);

    // Execute SSH command asynchronously
    executeSSHCommand(newDevbenchRef, trimmedDevbenchName, username);

    // Return immediate response
    res.json({
      id: newDevbenchRef.id,
      name: trimmedDevbenchName,
      status: 'Creating',
      userId: username,
      createdAt: new Date(),
      details: {}
    });

  } catch (error) {
    console.error('❌ Error creating devbench:', error);
    res.status(500).json({ error: 'Failed to create devbench' });
  }
});

/**
 * Execute SSH command to provision VM
 * Updates Firestore document with results
 */
async function executeSSHCommand(devbenchRef, devbenchName, username) {
  let ssh;
  
  try {
    console.log(`🔄 Starting SSH connection for devbench: ${devbenchName}`);
    
    // Establish SSH connection
    ssh = new SSH(SSH_CONFIG);
    await ssh.connect();
    console.log(`✅ SSH connected successfully`);

    // Execute the provision script
    const command = `./provision_vm.sh ${devbenchName}`;
    console.log(`🔄 Executing command: ${command}`);
    
    const result = await ssh.exec(command);
    console.log(`✅ SSH command completed for devbench: ${devbenchName}`);
    console.log('📄 Command output:', result);

    // Parse the script output
    let details = {};
    try {
      // Try to parse as JSON first
      details = JSON.parse(result);
    } catch (parseError) {
      // If not JSON, treat as plain text and extract useful information
      const lines = result.split('\n').filter(line => line.trim().length > 0);
      details = {
        output: result,
        summary: lines[lines.length - 1] || 'VM provisioned successfully'
      };

      // Try to extract IP address if present
      const ipMatch = result.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        details.ip = ipMatch[1];
        details.sshCommand = `ssh user@${ipMatch[1]}`;
      }
    }

    // Update Firestore document with success
    await devbenchRef.update({
      status: 'Active',
      details: details,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated devbench ${devbenchName} status to Active`);

  } catch (error) {
    console.error(`❌ SSH execution failed for devbench: ${devbenchName}`, error);

    // Update Firestore document with error
    try {
      await devbenchRef.update({
        status: 'Error',
        details: {
          error: error.message,
          errorDetails: error.toString()
        },
        errorAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated devbench ${devbenchName} status to Error`);
    } catch (updateError) {
      console.error(`❌ Failed to update devbench status to Error:`, updateError);
    }
  } finally {
    // Close SSH connection
    if (ssh) {
      try {
        await ssh.close();
        console.log(`✅ SSH connection closed for devbench: ${devbenchName}`);
      } catch (closeError) {
        console.error(`❌ Error closing SSH connection:`, closeError);
      }
    }
  }
}

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Devbench Manager server running on port ${PORT}`);
  console.log(`🌐 Access the application at: http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at: http://localhost:${PORT}/api/*`);
});

module.exports = app;
