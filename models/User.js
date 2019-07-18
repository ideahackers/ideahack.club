// User Login Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema

const UserSchema = new Schema({
    userName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        required: true
    }
});
mongoose.model('User', UserSchema);``;