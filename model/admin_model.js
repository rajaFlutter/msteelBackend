const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let adminSchema = mongoose.Schema({
    fullName: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    number: {
        type: schemaType.String,
        required: true,
        trim: true,
    },
    profilePic: {
        type: schemaType.String,
        default: "",
    },
    password: {
        type: schemaType.String,
        required: true,
    },
    otp: {
        type: schemaType.String,
        default: "",
    },
    enquiry: [
        {
            type: schemaType.ObjectId,
            ref: "enquiry"
        }
    ],
    stock: [
        {
            type: schemaType.ObjectId,
            ref: "stock",
        }
    ],
    orders: [
        {
            type: schemaType.ObjectId,
            ref: "order"
        }
    ],
    payment: [
        {
            type: schemaType.ObjectId,
            ref: "payment",
        }
    ],
    bills: [
        {
            type: schemaType.ObjectId,
            ref: "bill",
        }
    ],
    advertisement: [
        {
            image: {
                type: schemaType.String,
            },
            url: {
                type: schemaType.String,
            }
        }
    ],
});

const adminModel = mongoose.model("admin", adminSchema);

module.exports = adminModel;