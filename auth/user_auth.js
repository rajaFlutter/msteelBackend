require("dotenv").config();
const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../model/user_model");
const { jwtKey, adminKey } = require("../constData");
const auth = require("../middleware/token_auth");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const adminModel = require("../model/admin_model");
const orderModel = require("../model/orders_model");
const enquiryModel = require("../model/enquiry_model");
const fs = require("fs");
const stockModel = require("../model/stock_model");
const advertisementModel = require("../model/advertisement_model");

// Twilio credentials
var accountSid = process.env.ACCOUNTSID;
var authToken = process.env.AUTHTOKEN;
var twilioNumber = process.env.TWILIONUMBER;
const serviceSid = process.env.SERVICESID;


const client = require('twilio')(accountSid, authToken);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});


const userAuth = express.Router();


// signup api
userAuth.post("/user/signup", async (req, res) => {
    try {
        const { fullName, number, email, password, zipCode, city, state, businessType } = req.body;
        console.log(number);
        const existingUserEmail = await userModel.findOne({ email: email });
        if (existingUserEmail) return res.status(400).json({ msg: "User with same email already exist!" });
        console.log("a");
        const existingUserNumber = await userModel.findOne({ number: number });
        if (existingUserNumber) return res.status(400).json({ msg: "User with same number already exist!" });
        const hashedPassword = await bcryptjs.hash(password, 8);
        let randomNumber = Math.floor(1000 + Math.random() * 9000);

        console.log(hashedPassword);

        let user = new userModel({
            fullName,
            number,
            email,
            password: hashedPassword,
            zipCode,
            city,
            otp: randomNumber,
            state,
            businessType
        });

        user = await user.save();
        const token = jwt.sign({ id: user._id }, jwtKey);

        console.log({ ...user._doc, token: token });
        res.json({ ...user._doc, token: token });

        // otp sending 
        console.log("service sid");
        console.log(serviceSid);
        console.log(twilioNumber);
        client.messages.create({
            body: `Your OTP is ${randomNumber}`,
            messagingServiceSid: serviceSid,
            to: "+919549196262"
        }).then(message => {
            console.log(message.sid);
            console.log(message);

        }).done();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resend otp
userAuth.post("/user/resendOTP", async (req, res) => {
    try {
        const { number } = req.body;
        console.log(number);
        const existingUser = await userModel.find({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        let randomNumber = Math.floor(1000 + Math.random() * 9000);

        await userModel.findOneAndUpdate({ number: number }, { $set: { otp: randomNumber } });
        res.json({ ...existingUser._doc });
        client.messages.create({
            body: `Your OTP is ${randomNumber}`,
            messagingServiceSid: serviceSid,
            to: "+919024350276"
        }).then(message => {
            console.log(message.sid);
            console.log(message);
        }).done();
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// login api
userAuth.post("/user/login", async (req, res) => {
    try {
        const { number, password } = req.body;
        console.log(number);
        const existingUser = await userModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const isMatch = await bcryptjs.compare(password, existingUser.password);
        if (!isMatch) return res.status(400).json({ msg: "Incorrect Password" });

        const token = jwt.sign({ id: existingUser._id }, jwtKey);
        stockModel.find().populate("stockData").exec((err, stockData) => {
            if (err) return res.status(400).json({ error: err.message });
            advertisementModel.find().exec((err, adResult) => {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ ...existingUser._doc, token: token, stock: stockData, advertisements: adResult });

            });

        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// otp verification
userAuth.post("/user/otpVerification", async (req, res) => {
    try {
        const { otp, number } = req.body;
        const existingUser = await userModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        if (parseInt(otp) === existingUser.otp) {
            res.json({ ...existingUser._doc });
        }
        else {
            return res.status(400).json({ msg: "Invalid OTP" });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// forgot password api
userAuth.post("/user/forgotpassword", async (req, res) => {
    try {
        const { number } = req.body;
        const existingUser = await userModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        let randomNumber = Math.floor(1000 + Math.random() * 9000);

        client.messages.create({
            body: `Your OTP is ${randomNumber}`,
            messagingServiceSid: serviceSid,
            to: number
        }).then(message => {
            console.log(message.sid);
            userModel.findByIdAndUpdate(existingUser._id, { $set: { otp: randomNumber } }, { new: true }, (err, result) => {
                res.json({ ...result._doc });
            })
        }).done();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// change password
userAuth.post("/user/changePassword", async (req, res) => {
    try {
        const { password, userId } = req.body;
        const hashedPassword = await bcryptjs.hash(password, 8);
        userModel.findByIdAndUpdate(userId, { $set: { password: hashedPassword } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json({ ...result._doc });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



//get all Enquiry api
userAuth.get("/user/getAllEnquiry", auth, async (req, res) => {
    try {
        const existingUser = await userModel.findById(req.user).populate("enquiry");
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        res.json({ ...existingUser._doc });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});



// send enquiry api
userAuth.post("/user/sendEnquiry", auth, upload.single("image"), async (req, res) => {
    try {
        const { enquiryMsg, enquiryDate } = req.body;

        const imagePath = req.file.path;
        console.log(req.file);
        console.log("files");
        console.log(req.files);
        const existingUser = await userModel.findById(req.user);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });


        cloudinary.uploader.upload(imagePath, async (error, result) => {
            if (error) return res.status(400).json({ msg: error.message });

            const userEnquiry = {
                userId: req.user,
                enquiry: enquiryMsg,
                images: result.url,
                enquiryDate: enquiryDate
            }

            let enquiry = new enquiryModel({
                user: userEnquiry
            });

            enquiry = await enquiry.save();

            userModel.findByIdAndUpdate(req.user, { $push: { enquiry: enquiry._id } }, { new: true }, (err, result) => {
                if (err) return res.status.json({ msg: err.message });
                userModel.findById(req.user).populate("enquiry").exec((err, result) => {
                    if (err) return res.status(400).json({ msg: err.message });
                    res.json(result);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.log(err);
                        }
                    })
                });
            });

        });




    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get stock list according to location
userAuth.get("/user/stockList", auth, async (req, res) => {
    try {
        const location = req.query.loc;
        const existingUser = await userModel.findById(req.user);
        if (!existingUser) return req.status(400).json({ msg: "User not found!" });
        stockModel.find({ stateName: location }).populate("stockData").exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(result);
        });

    } catch (error) {
        res.status.json({ error: error.message });
    }
});

// send order api
userAuth.post("/user/sendOrder", auth, async (req, res) => {
    try {
        const { date, time, fullName, number, state, netPrice, orderQuantity, orderAmount, stockId, stockDataId } = req.body;

        const existingUser = await userModel.findById(req.user);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const orderList = await orderModel.find();
        const totalOrders = orderList.length;

        const productData = {
            stock: stockId,
            stockData: stockDataId
        }


        let order = new orderModel({
            date,
            time,
            fullName,
            number,
            state,
            product: productData,
            netPrice,
            orderQuantity,
            orderAmount,
            orderNumber: (totalOrders + 1),
        });

        order = await order.save();

        adminModel.findOneAndUpdate({}, { $push: { orders: order._id } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ error: err.message });

            userModel.findByIdAndUpdate(req.user, { $push: { orders: order._id } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ error: err.message });
                res.json(result);
            });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// get all order details api
userAuth.get("/user/getAllOrders", auth, async (req, res) => {
    try {
        const currMonth = new Date().toDateString().split(" ")[1];
        let newOrder = [];
        let oldOrder = [];
        const existingUser = await userModel.findById(req.user);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        userModel.findById(req.user).populate({
            path: "orders",
            populate: ["product.stock", "product.stockData"]
        }).exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });

            for (let index = 0; index < result.orders.length; index++) {
                const element = result.orders[index];
                const orderMonth = new Date(element.date).toDateString().split(" ")[1];
                if (currMonth === orderMonth) {
                    newOrder.push(element)
                }
                else {
                    oldOrder.push(element);
                }

            }

            res.json({ newOrder, oldOrder });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all Bills
userAuth.get("/user/getAllBills", auth, async (req, res) => {
    try {
        userModel.findById(req.user).populate("bills").exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });
            console.log(result);
            res.json(result);
        });


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all Transactions
userAuth.get("/user/getAllTransactions", auth, async (req, res) => {
    try {
        userModel.findById(req.user).populate("transactions").exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });
            console.log(result);
            res.json(result);
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all Receipts
userAuth.get("/user/getAllReceipts", auth, async (req, res) => {
    try {
        userModel.findById(req.user).populate("receipts").exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(result);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All User Details
userAuth.get("/user/getAllDetails", auth, async (req, res) => {
    try {
        userModel.findById(req.user).exec((err, result) => {
            if (err) return res.status(400).json({ error: err.message });
            stockModel.find().populate("stockData").exec((err, stockResult) => {
                console.log("stockData");
                console.log(stockResult[0].stockData);
                if (err) return res.status(400).json({ error: err.message });
                advertisementModel.find().exec((err, adResult) => {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ ...result._doc, stock: stockResult, advertisements: adResult });

                });
            });
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// update user profile
userAuth.post("/user/updateProfile", auth, upload.single("profilePic"), async (req, res) => {
    try {
        const { fullName, number, email, zipCode, city, state, businessType, address } = req.body;
        const imagePath = req.file.path;

        cloudinary.uploader.upload(imagePath, async (error, result) => {
            if (error) return res.status(400).json({ error: error.message });
            userModel.findByIdAndUpdate(req.user, { $set: { fullName: fullName, number: number, email: email, zipCode: zipCode, city: city, state: state, businessType: businessType, address: address, profilePic: result.url } }, { new: true }).exec((err, userData) => {
                if (err) return res.status(400).json({ error: err.message });
                stockModel.find().populate("stockData").exec((err, stockData) => {
                    if (err) return res.status(400).json({ error: err.message });
                    advertisementModel.find().exec((err, adResult) => {
                        if (err) return res.status(400).json({ error: err.message });
                        res.json({ ...userData._doc, stock: stockData, advertisements: adResult });

                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});










module.exports = userAuth;