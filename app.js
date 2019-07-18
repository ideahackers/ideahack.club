const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');


const app = express();

// Connection for connecting to Atlas DB


// Load routes
const index = require('./routes/index');
const user = require('./routes/user');

// Load configs
const db = require('./config/mongodb');

// Passport config
require('./config/passport')(passport);

// Connect to MongoDB Server
mongoose.connect(db.mongoURI, {
    useNewUrlParser: true
})
    .then(() => {
        console.log(`MongoDB Connected -> ${db.mongoURI}`)
    })
    .catch(err => {
        console.error(`Failed to connect to MongoDB Server -> ${db.mongoURI}`);
        console.error(`Cause: ${err}`)
    });


// Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(methodOverride('_method'));

app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
}));

// passport middleware, must be after express middleware
app.use(passport.initialize());
app.use(passport.session());

// Use Connect-Flash
app.use(flash());

// Global Vars for flash
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Host static content for www
app.use(express.static('www'));

// Use routes
app.use('/', index);
app.use("/user", user);

// Page not found [404] route
app.get('*', function(req, res){
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