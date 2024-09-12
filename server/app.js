const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./database');
const jwt = require('jsonwebtoken');  // JWT for authentication
const bcrypt = require('bcrypt');     // bcrypt for password hashing

const SECRET_KEY = '123456789';

// Middleware parsing JSON bodies
app.use(express.json());

// Helper: Authenticate JWT Token
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

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
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    db.run(sql, [username, hashedPassword, role], function(err) {
        if (err) return next(err);
        res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    });
});

// Route: User Login (JWT Generation)
app.post('/login', (req, res, next) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY);
        res.json({ token });
    });
});

// Route: Fetch all inventory items (Requires authentication)
app.get('/inventory', authenticateToken, (req, res, next) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) return next(err);
        res.json(rows);
    });
});

// Route: Fetch low-stock items (Requires authentication)
app.get('/inventory/low-stock', authenticateToken, (req, res, next) => {
    const lowStockThreshold = 5;  // Example threshold
    db.all("SELECT * FROM inventory WHERE quantity < ?", [lowStockThreshold], (err, rows) => {
        if (err) return next(err);
        res.json(rows);
    });
});

// Route: Add new inventory item (Admin role required)
app.post('/inventory', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { name, quantity, threshold = 5 } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '' || !quantity || typeof quantity !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const sql = "INSERT INTO inventory (name, quantity, threshold) VALUES (?, ?, ?)";
    db.run(sql, [name, quantity, threshold], function(err) {
        if (err) return next(err);
        res.status(201).json({ message: 'Item added', item: { id: this.lastID, name, quantity, threshold } });
    });
});

// Route: Update inventory item (Admin role required)
app.put('/inventory/:id', authenticateToken, authorizeRole('admin'), (req, res, next) => {
    const { id } = req.params;
    const { name, quantity, threshold } = req.body;

    if ((name && typeof name !== 'string') || (quantity && typeof quantity !== 'number') || (threshold && typeof threshold !== 'number')) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const sql = "UPDATE inventory SET name = ?, quantity = ?, threshold = ? WHERE id = ?";
    db.run(sql, [name, quantity, threshold, id], function(err) {
        if (err) return next(err);
        if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item updated', item: { id, name, quantity, threshold } });
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

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});