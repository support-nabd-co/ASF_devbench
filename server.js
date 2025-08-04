const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// JWT Secret - In production, use a secure random string from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';

// Script path - now local instead of SSH
const PROVISION_SCRIPT_PATH = './provision_vm.sh';

// Initialize Firebase Admin SDK with better error handling
let db;
try {
  // Try to get Firebase config from environment variable
  const firebaseConfigStr = process.env.FIREBASE_CONFIG;
  const appId = process.env.APP_ID || 'devbench-app';
  
  console.log('🔍 Checking Firebase configuration...');
  console.log(`📝 APP_ID: ${appId}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  
  if (!firebaseConfigStr) {
    throw new Error('FIREBASE_CONFIG environment variable is not set');
  }
  
  console.log('✅ FIREBASE_CONFIG environment variable found');
  console.log(`📏 Config length: ${firebaseConfigStr.length} characters`);
  
  let firebaseConfig;
  try {
    firebaseConfig = JSON.parse(firebaseConfigStr);
    console.log('✅ Firebase config JSON parsed successfully');
  } catch (parseError) {
    throw new Error(`Failed to parse FIREBASE_CONFIG JSON: ${parseError.message}`);
  }
  
  if (!firebaseConfig.project_id) {
    throw new Error('Firebase config is missing project_id');
  }
  
  if (!firebaseConfig.private_key) {
    throw new Error('Firebase config is missing private_key');
  }
  
  if (!firebaseConfig.client_email) {
    throw new Error('Firebase config is missing client_email');
  }
  
  console.log(`🏷️  Project ID: ${firebaseConfig.project_id}`);
  console.log(`📧 Client Email: ${firebaseConfig.client_email}`);
  
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    projectId: firebaseConfig.project_id
  });
  
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized successfully');
  console.log(`📊 Using Firestore project: ${firebaseConfig.project_id}`);
  console.log(`🏷️  App ID: ${appId}`);
  
  // Test database connection
  console.log('🔍 Testing Firestore connection...');
  await db.collection('_health_check').doc('test').set({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'connected'
  });
  console.log('✅ Firestore connection test successful');
  
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('⚠️  Please check your FIREBASE_CONFIG environment variable');
  console.log('💡 Expected format: JSON string with service account credentials');
  console.log('🔧 Required fields: type, project_id, private_key_id, private_key, client_email, client_id, auth_uri, token_uri');
  
  // Log additional debugging info
  if (process.env.FIREBASE_CONFIG) {
    console.log('🔍 FIREBASE_CONFIG exists but has issues');
    console.log(`📏 Length: ${process.env.FIREBASE_CONFIG.length} characters`);
    console.log(`🔤 First 100 chars: ${process.env.FIREBASE_CONFIG.substring(0, 100)}...`);
  } else {
    console.log('❌ FIREBASE_CONFIG environment variable is completely missing');
  }
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

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Admin access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired admin token' });
    }
    
    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
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

    // Check if user exists in Firestore
    if (db) {
      const appId = process.env.APP_ID || 'devbench-app';
      const userRef = db.collection('artifacts').doc(appId).collection('users').doc(trimmedUsername);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(401).json({ error: 'User not found. Please contact an administrator to create your account.' });
      }

      const userData = userDoc.data();
      if (userData.disabled) {
        return res.status(401).json({ error: 'Account is disabled. Please contact an administrator.' });
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
 * POST /api/admin/login
 * Admin authentication endpoint
 * Returns a JWT token with admin privileges
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate admin credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate JWT token with admin flag (expires in 24 hours)
    const token = jwt.sign(
      { username: ADMIN_USERNAME, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
    console.log(`✅ Admin logged in: ${username}`);

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during admin login' });
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

    const appId = process.env.APP_ID || 'devbench-app';
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
 * Create a new devbench by triggering the local provision_vm.sh script
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
    const appId = process.env.APP_ID || 'devbench-app';
    
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

    // Execute local provision_vm.sh script asynchronously
    executeLocalScript(newDevbenchRef, trimmedDevbenchName, username);

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
 * Execute local provision_vm.sh script to provision VM
 * Updates Firestore document with results
 */
async function executeLocalScript(devbenchRef, devbenchName, username) {
  try {
    console.log(`🔄 Starting local script execution for devbench: ${devbenchName}`);
    
    // Create combined devbench name: <username>+<devbench name>
    const combinedDevbenchName = `${username}+${devbenchName}`;
    
    // Execute the provision script with new argument format
    const command = `${PROVISION_SCRIPT_PATH} create ${combinedDevbenchName}`;
    console.log(`🔄 Executing command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    console.log(`✅ Local script execution completed for devbench: ${devbenchName}`);
    console.log('📄 Command output:', stdout);
    
    if (stderr) {
      console.warn('⚠️ Script stderr:', stderr);
    }

    // Parse the script output
    let details = {};
    try {
      // Try to parse as JSON first
      details = JSON.parse(stdout);
    } catch (parseError) {
      // If not JSON, treat as plain text and extract useful information
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      details = {
        output: stdout,
        summary: lines[lines.length - 1] || 'VM provisioned successfully'
      };

      // Try to extract IP address from output
      const ipMatch = stdout.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        details.ip = ipMatch[1];
        details.sshCommand = `ssh user@${ipMatch[1]}`;
      }
    }

    // Update Firestore document with success
    await devbenchRef.update({
      status: 'Active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      details: details,
      combinedName: combinedDevbenchName
    });

    console.log(`✅ Updated devbench ${devbenchName} status to Active`);

  } catch (error) {
    console.error(`❌ Local script execution failed for devbench: ${devbenchName}`, error);

    // Update Firestore document with error
    try {
      await devbenchRef.update({
        status: 'Error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        details: {
          error: error.message,
          stderr: error.stderr || 'Unknown error occurred'
        }
      });
    } catch (updateError) {
      console.error(`❌ Failed to update devbench status to Error:`, updateError);
    }
  }
}

/**
 * POST /api/devbenches/activate
 * Activate a devbench by calling the provision script with activate command
 */
app.post('/api/devbenches/activate', authenticateToken, async (req, res) => {
  try {
    const { devbenchId } = req.body;
    const username = req.user.username;

    if (!devbenchId) {
      return res.status(400).json({ error: 'Devbench ID is required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = process.env.APP_ID || 'devbench-app';
    const devbenchRef = db.collection('artifacts').doc(appId)
      .collection('users').doc(username)
      .collection('devbenches').doc(devbenchId);

    // Get devbench document
    const devbenchDoc = await devbenchRef.get();
    if (!devbenchDoc.exists) {
      return res.status(404).json({ error: 'Devbench not found' });
    }

    const devbenchData = devbenchDoc.data();
    const combinedName = devbenchData.combinedName || `${username}+${devbenchData.name}`;

    // Execute activate command
    const command = `${PROVISION_SCRIPT_PATH} activate ${combinedName}`;
    console.log(`🔄 Executing activate command: ${command}`);

    const { stdout, stderr } = await execAsync(command);
    console.log(`✅ Activate command completed for devbench: ${devbenchData.name}`);
    console.log('📄 Command output:', stdout);

    // Update devbench status
    await devbenchRef.update({
      status: 'Active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivated: admin.firestore.FieldValue.serverTimestamp(),
      activateOutput: stdout
    });

    res.json({
      success: true,
      message: 'Devbench activated successfully',
      output: stdout
    });

  } catch (error) {
    console.error('❌ Error activating devbench:', error);
    res.status(500).json({ 
      error: 'Failed to activate devbench',
      details: error.message 
    });
  }
});

/**
 * GET /api/devbenches/status/:devbenchId
 * Get the current status of a devbench by calling the provision script
 */
app.get('/api/devbenches/status/:devbenchId', authenticateToken, async (req, res) => {
  try {
    const { devbenchId } = req.params;
    const username = req.user.username;

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = process.env.APP_ID || 'devbench-app';
    const devbenchRef = db.collection('artifacts').doc(appId)
      .collection('users').doc(username)
      .collection('devbenches').doc(devbenchId);

    // Get devbench document
    const devbenchDoc = await devbenchRef.get();
    if (!devbenchDoc.exists) {
      return res.status(404).json({ error: 'Devbench not found' });
    }

    const devbenchData = devbenchDoc.data();
    const combinedName = devbenchData.combinedName || `${username}+${devbenchData.name}`;

    // Execute status command
    const command = `${PROVISION_SCRIPT_PATH} status ${combinedName}`;
    console.log(`🔄 Executing status command: ${command}`);

    const { stdout, stderr } = await execAsync(command);
    console.log(`✅ Status command completed for devbench: ${devbenchData.name}`);
    console.log('📄 Status output:', stdout);

    // Parse status (should return "active" or "not active")
    const statusOutput = stdout.trim().toLowerCase();
    const isActive = statusOutput.includes('active') && !statusOutput.includes('not active');

    // Update devbench with current status
    await devbenchRef.update({
      status: isActive ? 'Active' : 'Inactive',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastStatusCheck: admin.firestore.FieldValue.serverTimestamp(),
      statusOutput: stdout
    });

    res.json({
      devbenchId: devbenchId,
      name: devbenchData.name,
      combinedName: combinedName,
      status: isActive ? 'Active' : 'Inactive',
      isActive: isActive,
      statusOutput: stdout,
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking devbench status:', error);
    res.status(500).json({ 
      error: 'Failed to check devbench status',
      details: error.message 
    });
  }
});

// User Management API Endpoints (Admin only)

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = process.env.APP_ID || 'devbench-app';
    const usersRef = db.collection('artifacts').doc(appId).collection('users');
    const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
    
    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      });
    });

    res.json(users);
    console.log(`✅ Admin fetched ${users.length} users`);

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { username, email, fullName } = req.body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required and must be a non-empty string' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const trimmedUsername = username.trim();
    const appId = process.env.APP_ID || 'devbench-app';
    const userRef = db.collection('artifacts').doc(appId).collection('users').doc(trimmedUsername);
    
    // Check if user already exists
    const existingUser = await userRef.get();
    if (existingUser.exists) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const userData = {
      username: trimmedUsername,
      email: email || '',
      fullName: fullName || '',
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.username
    };

    await userRef.set(userData);

    res.status(201).json({
      id: trimmedUsername,
      ...userData,
      createdAt: new Date()
    });
    
    console.log(`✅ Admin created new user: ${trimmedUsername}`);

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:username
 * Update user (admin only)
 */
app.put('/api/admin/users/:username', authenticateAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { email, fullName, disabled } = req.body;

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = process.env.APP_ID || 'devbench-app';
    const userRef = db.collection('artifacts').doc(appId).collection('users').doc(username);
    
    // Check if user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.username
    };

    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (disabled !== undefined) updateData.disabled = disabled;

    await userRef.update(updateData);

    const updatedUser = await userRef.get();
    res.json({
      id: username,
      ...updatedUser.data(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Admin updated user: ${username}`);

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:username
 * Delete user (admin only)
 */
app.delete('/api/admin/users/:username', authenticateAdmin, async (req, res) => {
  try {
    const { username } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const appId = process.env.APP_ID || 'devbench-app';
    const userRef = db.collection('artifacts').doc(appId).collection('users').doc(username);
    
    // Check if user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user and all their devbenches
    const devbenchesRef = userRef.collection('devbenches');
    const devbenchesSnapshot = await devbenchesRef.get();
    
    // Delete all devbenches in a batch
    const batch = db.batch();
    devbenchesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user document
    batch.delete(userRef);
    
    await batch.commit();

    res.json({ message: 'User and all associated data deleted successfully' });
    console.log(`✅ Admin deleted user: ${username}`);

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

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
