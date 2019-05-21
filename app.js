const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Host static content for www
app.use(express.static('www'));

app.get('/', (req,res) => {
    res.send('<h1>Welcome to this server!</h1>');
});

app.listen(port, () => {
    console.log(`Server listening @ ${port}`);
});