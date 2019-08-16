// User Login Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// @todo Refactor to combine both types to together
// @body These two schemas are identical
// Create Schema

const tokenSchema = new Schema({
    _userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
        expires: 43200
    }
});

mongoose.model('tokenSchema', tokenSchema);