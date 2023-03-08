const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let userSchema = mongoose.Schema({
    fullName: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    profilePic: {
        type: schemaType.String,
        default: ""
    },
    number: {
        type: schemaType.String,
        required: true,
    },
    emailVerified: {
        type: schemaType.Boolean,
        default: false,
    },
    email: {
        type: schemaType.String,
        required: true,
        trim: true,
        validate: {
            validator: (value) => {
                const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return value.match(re);
            },
            message: "Please enter a valid email!"
        },
    },
    password: {
        type: schemaType.String,
        required: true,
    },
    address: {
        type: schemaType.String,
        default: ""
    },
    zipCode: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    city: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    state: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    businessType: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    otp: {
        type: schemaType.Number,
    },
    balanceAmount: {
        type: schemaType.String,
        default: "0.00"
    },
    subscribed: {
        type: schemaType.Boolean,
        default: false,
    },
    enquiry: [
        {
            type: schemaType.ObjectId,
            ref: "enquiry",
        }
    ],
    orders: [
        {
            type: schemaType.ObjectId,
            ref: "order",
        }
    ],
    transactions: [
        {
            type: schemaType.ObjectId,
            ref: "payment"
        }
    ],
    receipts: [
        {
            type: schemaType.ObjectId,
            ref: "payment"
        }
    ],
    bills: [
        {
            type: schemaType.ObjectId,
            ref: "bill",
        }
    ],



});

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;