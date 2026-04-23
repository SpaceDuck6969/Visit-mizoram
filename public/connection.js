const mysql = require('mysql2/promise');

// 1. Create the Database Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: 'root', // Replace with your actual password
    database: 'hotel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 2. Function to Test the Connection
async function testDbConnection() {
    try {
        // Try to get a connection from the pool
        const connection = await pool.getConnection();
        
        console.log("✅ Successfully connected to MySQL database!");
        
        // Always release the connection back to the pool when done testing
        connection.release(); 
    } catch (error) {
        console.error("❌ Database connection failed.");
        console.error("Error Details:", error.message);
        
        // Optional: stop the server if the database is completely down
        // process.exit(1); 
    }
}

// 3. Run the test
testDbConnection();

// Export the pool so server.js can use it
module.exports = pool;