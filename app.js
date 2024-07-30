const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bookstore'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    const sql = 'SELECT * FROM books';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving book list');
        }
        res.render('index', { books: results });
    });
});

app.get('/addbooks', (req, res) => {
    res.render('addbooks');
});

app.post('/addbooks', upload.single('image'), (req, res) => {
    const { name, quantity, price, description, genre } = req.body;
    let image = req.file ? req.file.filename : null;

    const sql = 'INSERT INTO books (name, quantity, price, description, genre, image) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, quantity, price, description, genre, image], (error, results) => {
        if (error) {
            console.error('Error adding book:', error);
            res.status(500).send('Error adding book');
        } else {
            res.redirect('/');
        }
    });
});
//chatgpt
app.get('/genres/:genre', (req, res) => {
    const { genre } = req.params;
    const sql = 'SELECT * FROM books WHERE genre = ?';
    connection.query(sql, [genre], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving books by genre');
        }
        res.render('index', { books: results });
    });
});

app.get('/books/:bookId', (req, res) => {
    const { bookId } = req.params;
    const sql = 'SELECT * FROM books WHERE bookId = ?';
    connection.query(sql, [bookId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving book');
        }
        if (results.length > 0) {
            res.render('book', { books: results[0] });
        } else {
            res.status(404).send('Book not found');
        }
    });
});
//chatgpt
app.get('/search', (req, res) => {
    const { query } = req.query;
    const sql = 'SELECT * FROM books WHERE name LIKE ? OR genre LIKE ?';
    const searchQuery = `%${query}%`;
    
    connection.query(sql, [searchQuery, searchQuery], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving search results');
        }
        res.render('index', { books: results, searchQuery: query });
    });
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.post('/contact', (req, res) => {
    const { name, email, phone, feedback } = req.body;
    // Handle form submission logic here
    res.redirect('/thankyou');
});

app.get('/thankyou', (req, res) => {
    res.render('thankyou');
});

app.get('/editbooks/:id', (req, res) => {
    const bookId = req.params.id;
    const sql = 'SELECT * FROM books WHERE bookId = ?';

    connection.query(sql, [bookId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving book ID');
        }
        if (results.length > 0) {
            res.render('editbooks', { books: results[0] });
        } else {
            res.status(404).send('Book not found');
        }
    });
});

app.post('/editbooks/:id', upload.single('image'), (req, res) => {
    const bookId = req.params.id;
    const { name, quantity, price, description, genre } = req.body;
    let image = req.body.currentImage; // Default to current image
    if (req.file) {
        image = req.file.filename; // Use new uploaded image if available
    }

    const sql = 'UPDATE books SET name = ?, quantity = ?, price = ?, description = ?, image = ?, genre = ? WHERE bookId = ?';

    connection.query(sql, [name, quantity, price, description, image, genre, bookId], (error, results) => {
        if (error) {
            console.error('Error updating book:', error);
            return res.status(500).send('Error updating book');
        }
        res.redirect('/');
    });
});

app.get('/deletebook/:id', (req, res) => {
    const bookId = req.params.id;
    const sql = 'DELETE FROM books WHERE bookId = ?';
    connection.query(sql, [bookId], (error, results) => {
        if (error) {
            console.error("Error deleting book:", error);
            res.status(500).send('Error deleting book');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/cart', (req, res) => {
    const cartQuery = 'SELECT * FROM cart';
    
    connection.query(cartQuery, (cartError, cartResults) => {
        if (cartError) {
            console.error('Database query error:', cartError.message);
            return res.status(500).send('Error retrieving cart');
        }
        res.render('cart', { cart: cartResults });
    });
});
//chatgpt
app.post('/add-to-cart/:itemId', (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;

    fetchBookDetailsFromDatabase(itemId, (error, item) => {
        if (error) {
            console.error('Error getting item details:', error.message);
            return res.status(500).send('Error getting item details');
        }

        const sqlCheck = 'SELECT * FROM cart WHERE cartId = ?';
        connection.query(sqlCheck, [itemId], (err, results) => {
            if (err) {
                console.error('Error checking cart:', err.message);
                return res.status(500).send('Error checking cart');
            }

            if (results.length > 0) {
                const newQuantity = results[0].quantity + parseInt(quantity, 10);
                const sqlUpdate = 'UPDATE cart SET quantity = ? WHERE cartId = ?';
                connection.query(sqlUpdate, [newQuantity, itemId], (err, updateResults) => {
                    if (err) {
                        console.error('Error updating cart item:', err.message);
                        return res.status(500).send('Error updating cart item');
                    }
                    console.log('Cart item updated successfully.');
                    res.redirect('/cart');
                });
            } else {
                const sqlInsert = 'INSERT INTO cart (cartId, name, quantity, price) VALUES (?, ?, ?, ?)';
                connection.query(sqlInsert, [itemId, item.name, quantity, item.price], (err, insertResults) => {
                    if (err) {
                        console.error('Error adding item to cart:', err.message);
                        return res.status(500).send('Error adding item to cart');
                    }
                    console.log('Item added to cart.');
                    res.redirect('/cart');
                });
            }
        });
    });
});

function fetchBookDetailsFromDatabase(bookId, callback) {
    const sql = 'SELECT * FROM books WHERE bookId = ?';
    connection.query(sql, [bookId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            callback(error, null);
        } else {
            if (results.length > 0) {
                callback(null, results[0]);
            } else {
                const notFoundError = new Error('Book not found');
                callback(notFoundError, null);
            }
        }
    });
}

app.post('/update-cart/:cartId', (req, res) => {
    const { cartId } = req.params;
    const { quantity } = req.body;

    const sql = 'UPDATE cart SET quantity = ? WHERE cartId = ?';

    connection.query(sql, [quantity, cartId], (err, result) => {
        if (err) {
            console.error('Error updating cart item:', err.message);
            return res.status(500).send('Error updating cart item');
        }
        console.log('Cart item updated successfully.');
        res.redirect('/cart');
    });
});

app.post('/delete-from-cart/:cartId', (req, res) => {
    const { cartId } = req.params;

    const sql = 'DELETE FROM cart WHERE cartId = ?';
    connection.query(sql, [cartId], (err, result) => {
        if (err) {
            console.error('Error deleting cart item:', err.message);
            return res.status(500).send('Error deleting cart item');
        }
        console.log('Cart item deleted successfully.');
        res.redirect('/cart');
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "Admin" && password === "Admin12345") {
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/payment', (req, res) => {
    res.render('payment');
});
//chatgpt
app.post('/process-payment', (req, res) => {
    const { paymentOption, cardNumber, expiryDate } = req.body;
    console.log(`Processing payment for ${paymentOption} card ending in ${cardNumber}`);
    res.render('thankyou2');
});

app.get('/credit-card', (req, res) => {
    res.render('credit-card'); 
});

app.get('/debit-card', (req, res) => {
    res.render('debit-card'); 
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
