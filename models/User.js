// User Login Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema

const UserSchema = new Schema({
    userName: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        required: true
    },
    isVerified: {
        type: Boolean,
        required: true
    },
    image_url: {
        type: String,
        required: false
    },
    register: {
        type: Schema.Types.ObjectId,
        ref: 'register'
    }
});

mongoose.model('User', UserSchema);