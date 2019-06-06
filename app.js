const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');

// Load routes
const index = require('./routes/index');

// Load configs
const db = require('./config/mongodb');

const app = express();

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
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// Host static content for www
app.use(express.static('www'));

// Use routes
app.use('/', index);

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
});