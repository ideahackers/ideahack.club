const express = require('express');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');

const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();


// Load routes
const index = require('./routes/index');
const user = require('./routes/user');

// Load configs
const db = require('./config/mongodb');

// Connect to MongoDB Server
/*mongoose.connect(db.mongoURI, {
    useNewUrlParser: true
})
    .then(() => {
        console.log(`MongoDB Connected -> ${db.mongoURI}`)
    })
    .catch(err => {
        console.error(`Failed to connect to MongoDB Server -> ${db.mongoURI}`);
        console.error(`Cause: ${err}`)
    });*/
mongoose.connect('mongodb://localhost/ideahack-dev', {
    //useMongoClient: true
    useNewUrlParser: true
})
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(methodOverride('_method'));

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