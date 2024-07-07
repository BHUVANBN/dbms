const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'batman2003',
    database: 'social_media_app', // Specify the database name
    multipleStatements: true // Allow multiple statements in a single query
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to database');

    const setupDatabase = `

        CREATE DATABASE IF NOT EXISTS social_media_app;
        USE social_media_app;

        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE,
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT
        );

        CREATE TABLE IF NOT EXISTS likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT,
            username VARCHAR(255),
            UNIQUE KEY (post_id, username), -- Ensure only one like per user per post
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (username) REFERENCES users(username)
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT,
            username VARCHAR(255),
            comment TEXT,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (username) REFERENCES users(username)
        );

        INSERT INTO posts (content) VALUES ('https://via.placeholder.com/150')
        ON DUPLICATE KEY UPDATE content=content;
    `;

    db.query(setupDatabase, (err, results) => {
        if (err) {
            console.error('Error setting up the database:', err);
            return;
        }
        console.log('Database setup complete');
    });
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Route for login page
app.get('/login', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
        <style>
            body {
                background-color: #121212;
                color: #ffffff;
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }
            form {
                background-color: #1e1e1e;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                width: 300px;
            }
            input {
                display: block;
                width: calc(100% - 20px);
                margin: 10px 0;
                padding: 10px;
                border: none;
                border-radius: 4px;
                background-color: #333333;
                color: #ffffff;
            }
            button {
                background-color: #55aaff;
                color: #ffffff;
                border: none;
                padding: 10px;
                border-radius: 4px;
                cursor: pointer;
                width: calc(100% - 20px);
                margin: 10px 0;
            }
            button:hover {
                background-color: #0077cc;
            }
        </style>
    </head>
    <body>
        <form action="/login" method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit" style="margin: 10px 20px 10px 10px ;">Login</button>
        </form>
    </body>
    </html>
    `);
});

// Handle login
app.post('/login', (req, res) => {
    const { username, email, password } = req.body;
    let hashedPassword = bcrypt.hashSync(password, 8);

    const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.query(query, [username, email, hashedPassword], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            res.send('Error registering user. Please try again.');
            return;
        }
        req.session.username = username;
        res.redirect('/post');
    });
});

// Route for post page
app.get('/post', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }

    const postId = 1; // Assuming a single post for simplicity
    const likesQuery = `SELECT COUNT(*) AS count FROM likes WHERE post_id = ?`;
    const isLikedQuery = `SELECT * FROM likes WHERE post_id = ? AND username = ?`;
    const commentsQuery = `SELECT username, comment FROM comments WHERE post_id = ?`;

    db.query(likesQuery, [postId], (err, likesResult) => {
        if (err) {
            console.error('Error fetching likes:', err);
            res.send('Error fetching post data. Please try again.');
            return;
        }

        db.query(isLikedQuery, [postId, req.session.username], (err, isLikedResult) => {
            if (err) {
                console.error('Error checking if liked:', err);
                res.send('Error fetching post data. Please try again.');
                return;
            }

            db.query(commentsQuery, [postId], (err, commentsResult) => {
                if (err) {
                    console.error('Error fetching comments:', err);
                    res.send('Error fetching post data. Please try again.');
                    return;
                }

                res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous"/>
                    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Post</title>
                    <script src="https://kit.fontawesome.com/0ede8ffe84.js" crossorigin="anonymous"></script>
                    <style>
                        body {
                            background-color: #121212;
                            color: #ffffff;
                            font-family: 'Roboto', sans-serif;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                        }
                        .post {
                            background-color: #1e1e1e;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                            width: 400px;
                            text-align: center;
                            position: relative;
                        }
                        .post img {
                            width: 100%;
                            height: auto;
                            border-radius: 8px;
                            margin-bottom: 10px;
                        }
                        .like-icon {
                            cursor: pointer;
                        }
                        .liked {
                            color: red;
                        }
                        .comment-icon {
                            cursor: pointer;
                        }
                        .comment-section {
                            display: none;
                            background-color: #333333;
                            padding: 10px;
                            margin-top: 10px;
                            border-radius: 4px;
                        }
                        .comment-section.active {
                            display: block;
                        }
                        .comment-section ul {
                            list-style-type: none;
                            padding: 0;
                        }
                        .comment-section ul li {
                            color: #ffffff;
                            margin-bottom: 5px;
                        }
                        .x-icon {
                            cursor: pointer;
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            color: #ffffff;
                            font-size: 1.5rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="post" style="padding:30px;">
                        <img src="https://via.placeholder.com/150" alt="Post Image">
                        <div style="padding:10px;">
                            <span class="like-icon ${isLikedResult.length > 0 ? 'liked' : ''}" data-post-id="${postId}" onclick="toggleLike(this)"><i class="fa-solid fa-heart"></i></span>
                            <span id="likes-count">${likesResult[0].count}</span> Likes
                        </div>
                        <div style="">
                            <span class="comment-icon" onclick="toggleComment()"><i class="fa-regular fa-comment"></i></span>
                            <span>Comments</span>
                            <div id="comment-section" class="comment-section">
                                <form action="/comment" method="POST"  >
                                    <div>
                                        <input type="hidden" name="postId" value="${postId}">
                                        <input type="hidden" name="username" value="${req.session.username}">
                                        <input type="text" style="margin:0px; padding:5px;" name="comment" placeholder="Add a comment" required>
                                    </div>
                                    
                                </form>
                                
                                <ul style="margin:10px;" >
                                    ${commentsResult.map(comment => `<li>${comment.username}: ${comment.comment}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <span class="x-icon" onclick="exitPage()"><i class="fa-solid fa-xmark fa-rotate-90"></i></span>
                    </div>

                    <script>
                        function toggleLike(likeElement) {
                            const postId = likeElement.getAttribute('data-post-id');
                            const isLiked = likeElement.classList.contains('liked');

                            fetch('/like', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ postId, isLiked })
                            })
                            .then(response => response.json())
                            .then(data => {
                                const likesCountElement = document.getElementById('likes-count');
                                if (data.action === 'liked') {
                                    likeElement.classList.add('liked');
                                    likesCountElement.textContent = parseInt(likesCountElement.textContent) + 1;
                                } else if (data.action === 'unliked') {
                                    likeElement.classList.remove('liked');
                                    likesCountElement.textContent = parseInt(likesCountElement.textContent) - 1;
                                }
                            })
                            .catch(error => console.error('Error liking post:', error));
                        }

                        function toggleComment() {
                            const commentSection = document.getElementById('comment-section');
                            commentSection.classList.toggle('active');
                        }

                        function exitPage() {
                            window.location.href = '/thank-you';
                        }
                    </script>
                </body>
                </html>
                `);
            });
        });
    });
});

// Handle like
app.post('/like', (req, res) => {
    const { postId } = req.body;
    const username = req.session.username;

    // Check if the user has already liked the post
    const isLikedQuery = `SELECT * FROM likes WHERE post_id = ? AND username = ?`;
    db.query(isLikedQuery, [postId, username], (err, isLikedResult) => {
        if (err) {
            console.error('Error checking if liked:', err);
            res.status(500).send('Error processing like');
            return;
        }

        if (isLikedResult.length >= 1) {
            // User has already liked the post, so unlike it
            const deleteLikeQuery = `DELETE FROM likes WHERE post_id = ? AND username = ?`;
            db.query(deleteLikeQuery, [postId, username], (err, result) => {
                if (err) {
                    console.error('Error deleting like:', err);
                    res.status(500).send('Error processing like');
                    return;
                }
                res.send({ action: 'unliked' });
            });
        } else {
            // User has not liked the post, so like it
            const addLikeQuery = `INSERT INTO likes (post_id, username) VALUES (?, ?)`;
            db.query(addLikeQuery, [postId, username], (err, result) => {
                if (err) {
                    console.error('Error adding like:', err);
                    res.status(500).send('Error processing like');
                    return;
                }
                res.send({ action: 'liked' });
            });
        }
    });
});

// Handle comment
app.post('/comment', (req, res) => {
    const { postId, username, comment } = req.body;

    const addCommentQuery = `INSERT INTO comments (post_id, username, comment) VALUES (?, ?, ?)`;
    db.query(addCommentQuery, [postId, username, comment], (err, result) => {
        if (err) {
            console.error('Error adding comment:', err);
            res.status(500).send('Error adding comment');
            return;
        }
        res.redirect('/post');
    });
});

// Thank you page
app.get('/thank-you', (req, res) => {
    res.send(` <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #121212;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .thank-you-container {
            text-align: center;
            background-color: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #ffff;
        }
        p {
            color: #666666;
            margin-top: 10px;
        }
    </style>
<body>
    <div class="thank-you-container">
        <h1>Thank You!</h1>
        <p>Your message or action has been successfully completed.</p>
    </div>
</body>`);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
