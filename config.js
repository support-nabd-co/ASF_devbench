module.exports = {
    // Server configuration
    port: process.env.PORT || 3001,
    
    // Database configuration
    database: {
        path: process.env.DB_PATH || './devbench.db'
    },
    
    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'devbench-secret-key',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    // SSH configuration for provision script
    ssh: {
        user: process.env.SSH_USER || 'asf',
        host: process.env.SSH_HOST || 'asf-tb.duckdns.org',
        password: process.env.SSH_PASS || 'ASF'
    },
    
    // Provision script configuration
    provision: {
        scriptPath: process.env.PROVISION_SCRIPT || './provision_vm.sh',
        timeout: 30 * 60 * 1000, // 30 minutes
        statusCheckInterval: 60 * 1000 // 1 minute
    },
    
    // Default admin user
    defaultAdmin: {
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@nabd-co.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
    },
    
    // Validation rules
    validation: {
        username: /^[a-zA-Z]+$/, // Only letters for admin usernames
        devbenchName: /^[a-zA-Z0-9_-]+$/ // Letters, numbers, hyphens, underscores for devbench names
    }
};