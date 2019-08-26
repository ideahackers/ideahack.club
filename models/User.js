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
    isVerified: {
        type: Boolean,
        required: true
    }
});
// @todo Are we even saving names to User schema???
// @body @1fabunicorn
mongoose.model('User', UserSchema);