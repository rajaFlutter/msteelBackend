const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

const orderSchema = mongoose.Schema({

    date: {
        type: schemaType.String,
    },
    time: {
        type: schemaType.String,
    },
    fullName: {
        type: schemaType.String,
    },
    number: {
        type: schemaType.String,
    },
    state: {
        type: schemaType.String,
    },
    plantLoc: {
        type: schemaType.String,
    },
    product: {
        type: schemaType.ObjectId,
        ref: "stock"
    },
    netPrice: {
        type: schemaType.Number,
    },
    orderQuantity: {
        type: schemaType.Number,
    },
    orderAmount: {
        type: schemaType.Number,
    },
    amountLeft: {
        typ: schemaType.Number,
    },
    status: {
        type: schemaType.String,
        default: "pending",
    },
    orderNumber: {
        type: schemaType.Number,
    }
});

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;