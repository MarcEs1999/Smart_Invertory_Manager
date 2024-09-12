const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./database');

// Middleware parsing JSON bodies
app.use(express.json());

// Root route for the base URL ("/")
app.get('/', (req, res) => {
    res.send('Welcome to the Smart Inventory Manager API');
});

// Route: Fetch all inventory items
app.get('/inventory', (req, res, next) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) {
            return next(err); // Pass the error to the error-handling middleware
        }
        res.json(rows);
    });
});

/* Post function: add a new item */
app.post('/inventory', (req, res, next) => {
    const { name, quantity } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity is required and must be a positive number' });
    }

    const sql = "INSERT INTO inventory (name, quantity) VALUES (?, ?)";
    db.run(sql, [name, quantity], function(err) {
        if (err) {
            return next(err); // Pass the error to the error-handling middleware
        }
        res.status(201).json({
            message: 'Item added successfully',
            item: { id: this.lastID, name, quantity }
        });
    });
});

/* Put function: update an existing item in the inventory */
app.put('/inventory/:id', (req, res, next) => {
    const { id } = req.params;
    const { name, quantity } = req.body;

    // Validate input
    if (name && (typeof name !== 'string' || name.trim() === '')) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    if (quantity && (typeof quantity !== 'number' || quantity <= 0)) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const sql = "UPDATE inventory SET name = ?, quantity = ? WHERE id = ?";
    db.run(sql, [name, quantity, id], function(err) {
        if (err) {
            return next(err); // Pass the error to the error-handling middleware
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({
            message: 'Item updated successfully',
            item: { id, name, quantity }
        });
    });
});

/* Delete function */
app.delete('/inventory/:id', (req, res, next) => {
    const { id } = req.params;

    // Validate input
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const sql = "DELETE FROM inventory WHERE id = ?";
    db.run(sql, id, function(err) {
        if (err) {
            return next(err); // Pass the error to the error-handling middleware
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    });
});

// Error-handling middleware (Move this to the end of your file)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log error details for debugging
    res.status(500).json({
        message: 'An internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
