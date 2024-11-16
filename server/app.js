const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./database');
const jwt = require('jsonwebtoken');  // JWT for authentication
const bcrypt = require('bcrypt');     // bcrypt for password hashing
const cors = require('cors');

const SECRET_KEY = '123456789';

// Middleware parsing JSON bodies
app.use(express.json());

// Enable CORS for all requests
app.use(cors());

// Helper: Authenticate JWT Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;  // Attach user to request
        next();
    });
}

// Helper: Authorize based on user roles
function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        next();
    };
}

// Root route for the base URL ("/")
app.get('/', (req, res) => {
    res.send('Welcome to the Smart Inventory Manager API');
});

// Route: User Registration
app.post('/register', async (req, res, next) => {
    const { username, password, role, fullName, email } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'All required fields are missing' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, password, role, fullName, email) VALUES (?, ?, ?, ?, ?)";
        db.run(sql, [username, hashedPassword, role, fullName, email], function(err) {
            if (err) return next(err);
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    } catch (err) {
        next(err);
    }
});

// Route: User Login (JWT Generation)
app.post('/login', (req, res, next) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: user.username, role: user.role, fullName: user.fullName }, SECRET_KEY);
        res.json({ token, role: user.role, username: user.username, fullName: user.fullName });
    });
});

// Route: Fetch all inventory items (Requires authentication)
app.get('/inventory', authenticateToken, (req, res, next) => {
    const { sortBy } = req.query;

    let sql = "SELECT * FROM inventory";
    if (sortBy === 'quantity') {
        sql += " ORDER BY quantity";
    } else if (sortBy === 'id') {
        sql += " ORDER BY id";
    }

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching inventory:', err); // Added for debugging
            return next(err);
        }
        console.log('Inventory items fetched:', rows); // Added for debugging
        res.json(rows);
    });
});

/** might delete below */

//for fetching an item by ID
app.get('/inventory/:id', authenticateToken, (req, res, next) => {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);


    console.log('Received request for item with ID:', id); // Debugging line

    const sql = "SELECT * FROM inventory WHERE id = ?";
    db.get(sql, [parsedId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return next(err);
        }
        if (!row) {
            console.warn(`Item with ID ${id} not found in the database`); // Debugging line
            return res.status(404).json({ error: 'Item not found' });
        }
        console.log('Item found:', row); // Debugging line
        res.json(row);
    });
});

// Route: Add new inventory item (Admin role required)
app.post('/inventory', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { name, quantity, description = '', additionalData = {} } = req.body;

    console.log('Adding item:', { name, quantity, description, additionalData }); // Added for debugging

    if (!name || typeof name !== 'string' || name.trim() === '' || !quantity || typeof quantity !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const sql = "INSERT INTO inventory (name, quantity, description, additional_data) VALUES (?, ?, ?, ?)";
    db.run(sql, [name, quantity, description, JSON.stringify(additionalData)], function(err) {
        if (err) {
            console.error('Error adding item to database:', err); // Added for debugging
            return next(err);
        }
        res.status(201).json({ message: 'Item added', item: { id: this.lastID, name, quantity, description, additionalData } });
    });
});

// Route: Update inventory item (Admin role required)
app.put('/inventory/:id', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { id } = req.params;
    const { name, quantity, description, additionalData } = req.body;

    if ((name && typeof name !== 'string') || (quantity && typeof quantity !== 'number')) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const sql = "UPDATE inventory SET name = ?, quantity = ?, description = ?, additional_data = ? WHERE id = ?";
    db.run(sql, [name, quantity, description, JSON.stringify(additionalData), id], function(err) {
        if (err) return next(err);
        if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item updated', item: { id, name, quantity, description, additionalData } });
    });
});

// Route: Delete inventory item (Admin role required)
app.delete('/inventory/:id', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { id } = req.params;

    const sql = "DELETE FROM inventory WHERE id = ?";
    db.run(sql, id, function(err) {
        if (err) return next(err);
        if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item deleted' });
    });
});

// Route: Fetch all users (Admin role required)
app.get('/users', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const sql = "SELECT id, username, role, fullName, email FROM users";
    db.all(sql, [], (err, rows) => {
        if (err) return next(err);
        res.json(rows);
    });
});

// Route: Update user information
app.put('/users/:id', authenticateToken, (req, res, next) => {
    const { id } = req.params;
    const { fullName, email } = req.body;

    // Only admins can update roles
    if (req.user.role !== 'admin' && req.user.id != id) {
        return res.status(403).json({ error: 'Not authorized to update this user.' });
    }

    const sql = "UPDATE users SET fullName = ?, email = ? WHERE id = ?";
    db.run(sql, [fullName, email, id], function(err) {
        if (err) return next(err);
        if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated', user: { id, fullName, email } });
    });
});

// Route: Delete user (Admin role required)
app.delete('/users/:id', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { id } = req.params;

    const sql = "DELETE FROM users WHERE id = ?";
    db.run(sql, id, function(err) {
        if (err) return next(err);
        if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    });
});


// Logout (front-end will handle token removal)
app.post('/logout', (req, res) => {
    // No server-side logic needed; the client should remove the JWT from storage.
    res.json({ message: 'Logged out successfully' });
});

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
