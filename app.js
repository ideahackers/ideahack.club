const express = require('express');
const exphbs = require('express-handlebars');

// Load routes
const index = require('./routes/index');

const app = express();

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