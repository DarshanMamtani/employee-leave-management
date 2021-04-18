const express = require('express');
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const initializePassport = require('./passportConfig');

const app = express();
const PORT = process.env.PORT || 3000;
initializePassport(passport);


// * MiddleWares
app.use('/static', express.static("public"));
app.use(express.json());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
    if (req.user) {
        if (req.user.type === "admin")
            res.redirect("/static/admin.html");
        else
            res.redirect("/static/leaveAplicationForm.html");
    } else {
        res.redirect("/static/index.html");
    }
});

// * SignUp route
app.post('/signup', async (req, res) => {
    let { email, uname, password } = req.body;
    let hashPassword = await bcrypt.hash(password, 10);
    let type = "employee";

    // * Checking if user already exist
    pool.query(`SELECT * FROM users WHERE email = $1`, [email], (err, results) => {
        if (err) {
            console.log(err);
        }
        if (results.rows.length > 0) {
            res.status(201).send("User Already Exists");
        }
        // * User does not exist
        else {
            pool.query(
                `INSERT INTO users (email, name, password, type) VALUES ($1, $2, $3, $4) RETURNING userid`,
                [email, uname, hashPassword, type],
                (err, results) => {
                    if (err) {
                        console.log(err);
                    }
                    res.status(200).send("Resgistration Successful. Please Login to Continue");
                }
            ) // End of INSERT query
        } //End of else where registering user i.e. inserting data
    }) // End of SELCT * query i.e. Checking if user exist
});

// * Login route
app.put('/login', passport.authenticate('local'), (req, res) => {
    res.status(200).send("Login Successful !");
});

// * Logout route
app.get('/logout', (req, res) => {
    req.logout();
    res.status(200).send("Logout Successful !");
});

// * Route to submit leave application
app.post('/application', (req, res) => {
    const { desc } = req.body;
    const status = "pending";
    const eid = req.user.userid;
    const employee = req.user.name;

    pool.query(`INSERT INTO leaves (eid, employee, description, status) VALUES ($1, $2, $3, $4)`, [eid, employee, desc, status], (err, results) => {
        if (err) {
            console.log(err);
        }
        res.status(200).send("Application successfully submitted");
    });

});

app.get('/viewApplication', (req, res) => {
    if (req.user.type == 'admin') {
        const status = "pending";
        pool.query(`SELECT * FROM leaves WHERE status = ($1)`, [status], (err, results) => {
            if (err) {
                console.log(err);
            }

            if (results.rows.length > 0) {
                res.status(200).send(results.rows);
            } else {
                res.status(204).send("No Leaves Found !");
            }
        });
    } else {
        pool.query(`SELECT * FROM leaves WHERE eid = ($1)`, [req.user.userid], (err, results) => {
            if (err) {
                console.log(err);
            }

            if (results.rows.length > 0) {
                res.status(200).send(results.rows);
            } else {
                res.status(204).send("No Leaves Found !");
            }
        });
    }
});

// * Accept or Reject leave route
app.put('/process', (req, res) => {
    const { id, status } = req.body;

    pool.query(`UPDATE leaves SET status = $1 WHERE id = $2 RETURNING employee`, [status, id],
        (err, results) => {
            if (err) {
                console.log(err);
            }

            res.status(200).send(status + " leave application of " + results.rows[0].employee);
        }
    );
});


app.listen(PORT, () => {
    console.log("Website running at http://localhost:" + PORT);
});