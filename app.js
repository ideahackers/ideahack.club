// Load in development environment vars if in development
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const Sentry = require('@sentry/node');
const exphbs = require('express-handlebars');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

passport = require('passport');

const app = express();

// Sentry Error Logging Middleware
Sentry.init({dsn: process.env.SENTRY_DSN});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});


// *************************** LOADS ***************************************  //
// Load routes
const index = require('./routes/index');
const user = require('./routes/user');
const resetPassword = require('./routes/resetPassword');
const emailConf = require('./routes/emailConf');
const register = require('./routes/register');

// Load Mongoose Configs
const db = require('./config/mongodb');

// Load Global Functions
const globals = require('./config/globals');

// Passport Config
require('./config/passport')(passport);

// Connect to MongoDB Server
mongoose.connect(db.mongoURI, {
    useNewUrlParser: true
})
    .then(() => {
        console.log(`MongoDB Connected -> ${db.mongoURI}`)
    })
    .catch(err => {
        Sentry.captureMessage(
            `Failed to connect to MongoDB Server -> ${db.mongoURI}`
        );
        Sentry.captureMessage(`Cause: ${err}`)
    });

// Handlebars Middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Body Parser Middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Method Override Middleware
app.use(methodOverride('_method'));

// Local Passport Configs
app.use(session({
    secret: process.env.PASSPORT_SECRET,
    resave: true,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect-Flash + Global Vars
app.use(flash());
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Set global vars from config js
app.use(globals);

// Host static content for www
app.use(express.static('www'));

// Use Controller routes
app.use('/', index);
app.use("/user", user);
app.use("/user/reset", resetPassword);
app.use("/user/confirmation/", emailConf);
app.use("/user/register/", register);

// Page not found [404] route
app.get('*', function (req, res) {
    res.status(404);
    res.render('404', {
        path: req.path
    });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server listening @ ${port}`);
    console.log(`Exit app with SIGTERM (^C)`);
});

// Exit nicely
process.on('SIGTERM', () => {
    port.close(() => {
        console.log('Process terminated');
    })
});