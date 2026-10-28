import express from 'express';
import bcrypt from 'bcrypt';
import session from 'express-session';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import {
    signupSchema,
    hashpasstoken,
    Admin,
    Adviser,
    AdviceRequest,
    Message
} from './models.js';

import { scraptwo } from "./test_scraper.js";

import nodemailer from 'nodemailer';
import crypto, { hash } from 'crypto';

import path from 'path';
import { fileURLToPath } from 'url';


// ======================================================
// PATH SETUP
// ======================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ======================================================
// MONGODB
// ======================================================

await mongoose.connect(
    'mongodb://localhost:27017/ProductSuggestion'
);

console.log("MongoDB connected");


// ======================================================
// EXPRESS
// ======================================================

const app = express();

const port = 4005;


// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
// ======================================================
// SESSION
// ======================================================

const sessionMiddleware = session({

    secret: "mySecretKey",

    resave: false,

    saveUninitialized: false,

    cookie: {
        maxAge: 30 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }

});


app.use(sessionMiddleware);


// ======================================================
// FRONTEND
// ======================================================

// IMPORTANT:
// This serves the landingpage.html that is in the
// SAME folder as apps.js.
//
// Do NOT use a hard-coded Windows path.

app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'landingpage.html')
    );

});


// ======================================================
// ADMIN LOGIN — separate page from the main site
// ======================================================

app.get('/admin-login', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'admin-login.html')
    );

});


app.get('/admin', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'admin-dashboard.html')
    );

});


app.get('/adviser', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'adviser-inbox.html')
    );

});


// ======================================================
// USER SIGNUP
// ======================================================

app.post('/signin', async (req, res) => {

    try {

        const {
            email,
            username,
            password,
            signupInterest,
            suggestionCategoriesGroup
        } = req.body;


        if (
            !email ||
            !username ||
            !password
        ) {

            return res.status(400).json({

                message: "All required fields are needed"

            });

        }


        // ==================================================
        // "GIVING" -> this is really an adviser application,
        // not a regular user. Create it in the Adviser
        // collection (pending, needs admin approval) instead
        // of a plain SigninFrom user, so the signup form is
        // actually connected to the adviser database.
        // ==================================================

        if (signupInterest === 'giving') {

            if (!suggestionCategoriesGroup) {

                return res.status(400).json({

                    message:
                        "Please choose a category you want to give advice in"

                });

            }


            const existingAdviser =
                await Adviser.findOne({

                    email

                });


            if (existingAdviser) {

                return res.status(400).json({

                    message:
                        "An adviser with that email already exists"

                });

            }


            const adviserHashpass =
                await bcrypt.hash(password, 10);


            const adviser =
                await Adviser.create({

                    name: username,

                    email,

                    password: adviserHashpass,

                    specialty: suggestionCategoriesGroup,

                    isOnline: false,

                    status: 'pending'

                });


            return res.json({

                message:
                    "Application submitted. An admin needs to approve your account before you can log in as an adviser.",

                adviser: {

                    _id: adviser._id,

                    name: adviser.name,

                    email: adviser.email,

                    specialty: adviser.specialty,

                    status: adviser.status

                }

            });

        }


        // ==================================================
        // "GETTING" (default) -> regular user account
        // ==================================================

        // Check existing user

        const existingUser =
            await signupSchema.findOne({

                email

            });


        if (existingUser) {

            return res.status(400).json({

                message: "Email already registered"

            });

        }


        // Hash password

        const hashpass =
            await bcrypt.hash(password, 10);


        // Create user

        const signinData =
            new signupSchema({

                email,

                username,

                password: hashpass,

                signupInterest,

                suggestionCategoriesGroup

            },{
                versionKey:false
            });


        const data =
            await signinData.save();


        if (data) {

            return res.json({

                message: "succesful registration"

            });

        }


        return res.status(500).json({

            message: "Registration failed"

        });


    } catch (error) {

        console.log(
            "SIGNUP ERROR:",
            error
        );

        return res.status(500).json({

            message: "Server Error"

        });

    }

});


// ======================================================
// DASHBOARD
// ======================================================

async function dashboard(req, res) {

    try {

        // No session

        if (
            !req.session ||
            !req.session.data ||
            !req.session.role
        ) {

            return res.status(401).json({

                success: false,

                message: "Not logged in"

            });

        }


        const id =
            req.session.data;

        const role =
            req.session.role;


        // ==================================================
        // ADMIN
        // ==================================================

        if (role === "admin") {

            const admin =
                await Admin
                    .findById(id)
                    .select("-password");


            if (!admin) {

                return res.status(401).json({

                    success: false,

                    message: "Admin not found"

                });

            }


            return res.json({

                success: true,

                message: "logged in",

                role: "admin",

                user: {

                    id: admin._id,

                    username: admin.username,

                    email: admin.email,

                    role: "admin"

                }

            });

        }


        // ==================================================
        // ADVISER
        // ==================================================

        if (role === "adviser") {

            const adviser =
                await Adviser
                    .findById(id)
                    .select("-password");


            if (!adviser) {

                return res.status(401).json({

                    success: false,

                    message: "Adviser not found"

                });

            }


            return res.json({

                success: true,

                message: "logged in",

                role: "adviser",

                user: {

                    id: adviser._id,

                    name: adviser.name,

                    email: adviser.email,

                    specialty: adviser.specialty,

                    isOnline: adviser.isOnline,

                    role: "adviser"

                }

            });

        }


        // ==================================================
        // NORMAL USER
        // ==================================================

        if (role === "user") {

            const user =
                await signupSchema
                    .findById(id)
                    .select("-password");


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message: "User not found"

                });

            }


            return res.json({

                success: true,

                message: "logged in",

                role: "user",

                user: {

                    id: user._id,

                    name: user.username,

                    username: user.username,

                    email: user.email,

                    role: "user"

                }

            });

        }


        return res.status(401).json({

            success: false,

            message: "Invalid session role"

        });


    } catch (error) {

        console.log(
            "DASHBOARD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

}


app.get('/dashboard', dashboard);


// ======================================================
// NORMAL USER LOGIN
// ======================================================

app.post('/login', async (req, res) => {

    try {

        const {
            email,
            pass
        } = req.body;


        console.log("");
        console.log("========== LOGIN DEBUG ==========");

        console.log(
            "Email:",
            email
        );

        console.log(
            "Password received:",
            pass
        );

        console.log(
            "Password type:",
            typeof pass
        );


        // --------------------------------------------------
        // FIND USER
        // --------------------------------------------------

        const user =
            await signupSchema.findOne({
                email
            });


        console.log(
            "User found:",
            !!user
        );


        if (!user) {

            return res.json({

                message: "Register First"

            });

        }


        console.log(
            "Stored password:",
            user.password
        );

        console.log(
            "Stored password length:",
            user.password?.length
        );


        // --------------------------------------------------
        // CHECK PASSWORD
        // --------------------------------------------------

        const isMatch =
            await bcrypt.compare(
                pass,
                user.password
            );


        console.log(
            "Password match:",
            isMatch
        );

        console.log(
            "================================="
        );


        if (!isMatch) {

            return res.json({

                message: "Wrong Password"

            });

        }


        // --------------------------------------------------
        // SESSION
        // --------------------------------------------------

        req.session.data =
            user._id.toString();

        req.session.role =
            'user';

        req.session.cookie.maxAge =
            30 * 60 * 1000;


        console.log(
            "Login successful"
        );

        console.log(
            "Session ID:",
            req.sessionID
        );


        // --------------------------------------------------
        // SAVE SESSION BEFORE RESPONSE
        // --------------------------------------------------

        req.session.save((error) => {

            if (error) {

                console.log(
                    "USER SESSION SAVE ERROR:",
                    error
                );

                return res.status(500).json({

                    message:
                        "Could not create session"

                });

            }


            return res.json({

                success: true,

                message: "logged in",

                role: "user",

                user: {

                    id: user._id,

                    name: user.username,

                    username: user.username,

                    email: user.email,

                    role: "user"

                }

            });

        });


    } catch (error) {

        console.log(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({

            message: "Server Error"

        });

    }

});


// ======================================================
// FORGOT PASSWORD
// ======================================================

app.post('/forget', async (req, res) => {

    try {

        const {
            email
        } = req.body;


        const token =
            crypto
                .randomBytes(32)
                .toString('hex');


        const hashtoken =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');


        console.log(token);


        const transport =
            nodemailer.createTransport({

                host: 'smtp.gmail.com',

                secure: true,

                port: 465,

                auth: {

                    user:
                        'ps9023079938@gmail.com',

                    pass:
                        'cbom qqvy txey wtjw'

                }

            });


        const to =
            email;


        const sub =
            'Your Reset password Request';


        const msg = `
            <p>The Email is Send Sucessfully</p>

            <a href='http://localhost:${port}/reset-password?token=${token}'>
                Reset Password
            </a>
        `;


        function sendMail(
            to,
            sub,
            msg
        ) {

            transport.sendMail({

                to,

                subject: sub,

                html: msg

            });

        }


        sendMail(
            to,
            sub,
            msg
        );


        console.log(
            req.body.email
        );


        const findemail =
            await signupSchema.findOne({

                email: email

            });


        if (!findemail) {

            console.log({

                errormsg:
                    "The User is not Register"

            });


            return res.json({

                message:
                    "The User is not Register"

            });

        }


        const tokensave =
            new hashpasstoken({

                userId:
                    findemail._id,

                hashToken:
                    hashtoken,

                exprireAt:
                    new Date(
                        Date.now() +
                        3 * 60 * 1000
                    )

            },{
                versionKey:false
            });


        const save =
            await tokensave.save();


        if (save) {

            console.log({

                message:
                    "the Token is Sucessully Send In Email"

            });


            return res.json({

                message:
                    "Email is Sucessfully Send"

            });

        }


        return res.status(500).json({

            message:
                "Could not save reset token"

        });


    } catch (err) {

        console.log(
            "FORGOT PASSWORD ERROR:",
            err.message
        );

        return res.status(500).json({

            message:
                "Server Error"

        });

    }

});


// ======================================================
// RESET PASSWORD
// ======================================================

app.get('/reset-password', async (req, res) => {

    try {

        const token =
            req.query.token;


        console.log(token);


        if (!token) {

            return res.status(400).send(
                "Invalid reset token"
            );

        }


        const hashtokens =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');


        const findhash =
            await hashpasstoken.findOne({

                hashToken:
                    hashtokens

            });

            const id = findhash.userId;
            console.log(id);


        if (!findhash) {

            return res.status(401).send({

                error:
                    "The Token is invalid"

            });

        }


        console.log({

            heshtoken:
                hashtokens

        });


        if (
            findhash.exprireAt <
            new Date()
        ) {

            return res.status(400).send(
                "The Token is Expired"
            );

        }


        console.log({

            message:
                "The Token is Verified"

        });


        
    res.redirect(`/updatepass?_id=${id}`)
    } catch (error) {

        console.log(
            "RESET ERROR:",
            error
        );

        return res.status(500).send(
            "Server Error"
        );

    }

});


// ======================================================
// UPDATE PASSWORD PAGE
// ======================================================
app.get('/updatepass' , (req,res)=>{
     res.sendFile(path.join(__dirname,"resetpass.html"));
})  

app.post('/changepass',async(req,res)=>{
    let{id,pass} = req.body;
    console.log({pass})

            const hash =
            await bcrypt.hash(pass, 10);


    const user = await signupSchema.findOne({_id:id})
    let update = await signupSchema.updateOne({_id:id},{
        $set:{
            password:hash
        }
    });

    if(update){
         res.json({suc:"The Password  is Sucessfully Update"});
    }else{
        res.status(401).json({msg:"The Password is Not Update"});
    }
    console.log(user)
   
})

// ======================================================
// PRODUCT SCRAPER
// ==========================
// ============================

app.post("/product", async (req, res) => {

    try {

        const {
            search,
            budget
        } = req.body;


        if (!search) {

            return res.status(400).json({

                error:
                    "Search is required"

            });

        }


        console.log(
            "Product search:",
            search
        );

        console.log(
            "Budget:",
            budget
        );


        const result =
            await scraptwo(
                search +
                " under " +
                budget
            );


        return res.json(
            result
        );


    } catch (error) {

        console.log(
            "PRODUCT ERROR:",
            error
        );

        return res.status(500).json({

            error:
                "Product scraping failed"

        });

    }

});


// ======================================================
// LOGOUT
// ======================================================

app.post('/logout', (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            return res.status(500).json({

                message:
                    "Logout failed"

            });

        }


        res.clearCookie(
            'connect.sid'
        );


        res.json({

            message:
                "Logged out successfully"

        });

    });

});


// ======================================================
// AUTH MIDDLEWARE
// ======================================================


// ------------------------------------------------------
// ADMIN
// ------------------------------------------------------

function requireAdmin(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.data ||
        req.session.role !== 'admin'
    ) {

        return res.status(403).json({

            message:
                "Admin login required"

        });

    }


    next();

}


// ------------------------------------------------------
// ADVISER
// ------------------------------------------------------

function requireAdviser(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.data ||
        req.session.role !== 'adviser'
    ) {

        return res.status(403).json({

            message:
                "Adviser login required"

        });

    }


    next();

}


// ------------------------------------------------------
// ANY LOGGED IN USER
// ------------------------------------------------------

function requireAnyLogin(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.data
    ) {

        return res.status(401).json({

            message:
                "Please log in first"

        });

    }


    next();

}


// ======================================================
// ADMIN LOGIN
// ======================================================

app.post('/admin/login', async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;


        console.log("");
        console.log("========== ADMIN LOGIN ==========");

        console.log(
            "Username:",
            username
        );


        if (
            !username ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Username and password are required"

            });

        }


        // ------------------------------------------------
        // FIND ADMIN
        // ------------------------------------------------

        const admin =
            await Admin.findOne({

                username:
                    username

            });


        console.log(
            "Admin found:",
            !!admin
        );


        if (!admin) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin not found"

            });

        }


        // ------------------------------------------------
        // PASSWORD
        // ------------------------------------------------

        const isMatch =
            await bcrypt.compare(
                password,
                admin.password
            );


        console.log(
            "Admin password match:",
            isMatch
        );


        if (!isMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Wrong Password"

            });

        }


        // ------------------------------------------------
        // SESSION
        // ------------------------------------------------

        req.session.data =
            admin._id.toString();

        req.session.role =
            'admin';

        req.session.cookie.maxAge =
            30 * 60 * 1000;


        // ------------------------------------------------
        // SAVE SESSION
        // ------------------------------------------------

        req.session.save((error) => {

            if (error) {

                console.log(
                    "ADMIN SESSION SAVE ERROR:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not create admin session"

                });

            }


            console.log(
                "Admin login successful"
            );

            console.log(
                "Session ID:",
                req.sessionID
            );

            console.log(
                "================================="
            );


            return res.json({

                success: true,

                message:
                    "logged in",

                role:
                    "admin",

                user: {

                    id:
                        admin._id,

                    username:
                        admin.username,

                    email:
                        admin.email,

                    role:
                        "admin"

                }

            });

        });


    } catch (error) {

        console.log(
            "ADMIN LOGIN ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server Error"

        });

    }

});


// ======================================================
// GET ALL ADVISERS
// ADMIN ONLY
// ======================================================

app.get(
    '/admin/advisers',
    requireAdmin,
    async (req, res) => {

        try {

            const advisers =
                await Adviser
                    .find()
                    .select('-password')
                    .sort({
                        createdAt: -1
                    });


            res.json({

                advisers

            });


        } catch (error) {

            console.log(
                "GET ADVISERS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// GET PENDING ADVISERS (awaiting approval)
// ADMIN ONLY
//
// Admin no longer creates adviser accounts. Advisers sign
// themselves up via POST /adviser/register and land here
// with status "pending" until an admin approves them.
// ======================================================

app.get(
    '/admin/advisers/pending',
    requireAdmin,
    async (req, res) => {

        try {

            const pending =
                await Adviser
                    .find({ status: 'pending' })
                    .select('-password')
                    .sort({
                        createdAt: -1
                    });


            res.json({

                advisers:
                    pending

            });


        } catch (error) {

            console.log(
                "GET PENDING ADVISERS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// APPROVE ADVISER
// ADMIN ONLY
// ======================================================

app.patch(
    '/admin/advisers/:id/approve',
    requireAdmin,
    async (req, res) => {

        try {

            const updated =
                await Adviser.findByIdAndUpdate(

                    req.params.id,

                    {
                        status: 'approved'
                    },

                    {
                        new: true
                    }

                ).select('-password');


            if (!updated) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            // Let anyone browsing the (approved-only) adviser
            // list know it may have changed.

            io.emit(
                'advisers_updated'
            );


            res.json({

                message:
                    "Adviser approved",

                adviser:
                    updated

            });


        } catch (error) {

            console.log(
                "APPROVE ADVISER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// REJECT ADVISER
// ADMIN ONLY
// ======================================================

app.patch(
    '/admin/advisers/:id/reject',
    requireAdmin,
    async (req, res) => {

        try {

            const updated =
                await Adviser.findByIdAndUpdate(

                    req.params.id,

                    {
                        status: 'rejected'
                    },

                    {
                        new: true
                    }

                ).select('-password');


            if (!updated) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            res.json({

                message:
                    "Adviser rejected",

                adviser:
                    updated

            });


        } catch (error) {

            console.log(
                "REJECT ADVISER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// UPDATE ADVISER
// ADMIN ONLY
// ======================================================

app.patch(
    '/admin/advisers/:id',
    requireAdmin,
    async (req, res) => {

        try {

            // Admin only manages advisers now (approve / reject /
            // delete / change category) — it no longer edits an
            // adviser's identity fields, so only "specialty" is
            // accepted here.

            const {
                specialty,
                name
            } = req.body;


            const updates = {};

            if (typeof specialty === 'string' && specialty.trim()) {
                updates.specialty = specialty.trim();
            }

            if (typeof name === 'string' && name.trim()) {
                updates.name = name.trim();
            }


            if (Object.keys(updates).length === 0) {

                return res.status(400).json({

                    message:
                        "Name or specialty is required"

                });

            }


            const updated =
                await Adviser.findByIdAndUpdate(

                    req.params.id,

                    updates,

                    {
                        new: true
                    }

                ).select('-password');


            if (!updated) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            res.json({

                message:
                    "Adviser updated",

                adviser:
                    updated

            });


        } catch (error) {

            console.log(
                "UPDATE ADVISER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// DELETE ADVISER
// ADMIN ONLY
// ======================================================

app.delete(
    '/admin/advisers/:id',
    requireAdmin,
    async (req, res) => {

        try {

            const deleted =
                await Adviser.findByIdAndDelete(
                    req.params.id
                );


            if (!deleted) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            res.json({

                message:
                    "Adviser removed"

            });


        } catch (error) {

            console.log(
                "DELETE ADVISER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// ADVISER SELF-REGISTRATION
// PUBLIC — anyone can apply, admin approves afterwards
// ======================================================

app.post(
    '/adviser/register',
    async (req, res) => {

        try {

            const {
                name,
                email,
                password,
                specialty
            } = req.body;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                !name ||
                !email ||
                !password ||
                !specialty
            ) {

                return res.status(400).json({

                    message:
                        "All fields are required"

                });

            }


            // ------------------------------------------------
            // CHECK EXISTING
            // ------------------------------------------------

            const existing =
                await Adviser.findOne({

                    email

                });


            if (existing) {

                return res.status(400).json({

                    message:
                        "An adviser with that email already exists"

                });

            }


            // ------------------------------------------------
            // HASH PASSWORD
            // ------------------------------------------------

            const hashed =
                await bcrypt.hash(
                    password,
                    10
                );


            // ------------------------------------------------
            // CREATE ADVISER — starts "pending"
            // ------------------------------------------------

            const adviser =
                await Adviser.create({

                    name,

                    email,

                    password:
                        hashed,

                    specialty,

                    isOnline:
                        false,

                    status:
                        'pending'

                });


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            res.json({

                message:
                    "Application submitted. An admin needs to approve your account before you can log in.",

                adviser: {

                    _id:
                        adviser._id,

                    name:
                        adviser.name,

                    email:
                        adviser.email,

                    specialty:
                        adviser.specialty,

                    status:
                        adviser.status

                }

            });


        } catch (error) {

            console.log(
                "ADVISER REGISTER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// ADVISER LOGIN
// ======================================================

app.post(
    '/adviser/login',
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            console.log("");
            console.log(
                "========== ADVISER LOGIN =========="
            );

            console.log(
                "Email:",
                email
            );


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required"

                });

            }


            // ------------------------------------------------
            // FIND ADVISER
            // ------------------------------------------------

            const adviser =
                await Adviser.findOne({

                    email

                });


            console.log(
                "Adviser found:",
                !!adviser
            );


            if (!adviser) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Register First"

                });

            }


            // ------------------------------------------------
            // PASSWORD
            // ------------------------------------------------

            const isMatch =
                await bcrypt.compare(
                    password,
                    adviser.password
                );


            console.log(
                "Password match:",
                isMatch
            );


            if (!isMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Wrong Password"

                });

            }


            // ------------------------------------------------
            // APPROVAL STATUS
            // ------------------------------------------------

            if (adviser.status === 'pending') {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your application is still awaiting admin approval."

                });

            }


            if (adviser.status === 'rejected') {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your adviser application was not approved. Contact the admin for details."

                });

            }


            // ------------------------------------------------
            // SESSION
            // ------------------------------------------------

            req.session.data =
                adviser._id.toString();

            req.session.role =
                'adviser';

            req.session.cookie.maxAge =
                30 * 60 * 1000;


            // ------------------------------------------------
            // SAVE SESSION
            // ------------------------------------------------

            req.session.save((error) => {

                if (error) {

                    console.log(
                        "ADVISER SESSION SAVE ERROR:",
                        error
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not create adviser session"

                    });

                }


                console.log(
                    "Adviser login successful"
                );

                console.log(
                    "Session ID:",
                    req.sessionID
                );

                console.log(
                    "==================================="
                );


                return res.json({

                    success: true,

                    message:
                        "logged in",

                    role:
                        'adviser',

                    user: {

                        id:
                            adviser._id,

                        _id:
                            adviser._id,

                        name:
                            adviser.name,

                        email:
                            adviser.email,

                        specialty:
                            adviser.specialty,

                        isOnline:
                            adviser.isOnline,

                        role:
                            "adviser"

                    }

                });

            });


        } catch (error) {

            console.log(
                "ADVISER LOGIN ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// ADVISER ONLINE/OFFLINE STATUS
// ======================================================

app.patch(
    '/adviser/status',
    requireAdviser,
    async (req, res) => {

        try {

            const {
                isOnline
            } = req.body;


            const adviser =
                await Adviser.findByIdAndUpdate(

                    req.session.data,

                    {
                        isOnline:
                            !!isOnline
                    },

                    {
                        new: true
                    }

                ).select('-password');


            if (!adviser) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            // Tell connected clients that adviser list changed

            io.emit(
                'advisers_updated'
            );


            res.json({

                message:
                    "Status updated",

                adviser

            });


        } catch (error) {

            console.log(
                "ADVISER STATUS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// PUBLIC ADVISER LIST
// ======================================================

app.get(
    '/advisers',
    async (req, res) => {

        try {

            const {
                category
            } = req.query;


            // Any approved adviser in the category is shown,
            // online or offline — the user can still send a
            // chat request either way, and the adviser will
            // see it whenever they sign in.

            const filter = {

                $or: [
                    { status: 'approved' },
                    { status: { $exists: false } },
                    { status: null }
                ]

            };


            if (category) {

                filter.specialty =
                    category;

            }


            const advisers =
                await Adviser
                    .find(filter)
                    .select('-password')
                    .sort({
                        isOnline: -1
                    });


            res.json({

                advisers

            });


        } catch (error) {

            console.log(
                "PUBLIC ADVISERS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// CREATE ADVICE REQUEST
// USER ONLY
// ======================================================

app.post(
    '/advice/request',
    async (req, res) => {

        // ------------------------------------------------
        // CHECK USER LOGIN
        // ------------------------------------------------

        if (
            req.session.role !== 'user' ||
            !req.session.data
        ) {

            return res.status(401).json({

                message:
                    "Please log in as a user first"

            });

        }


        try {

            const {
                adviserId,
                category,
                subcategory,
                budget
            } = req.body;


            if (!adviserId) {

                return res.status(400).json({

                    message:
                        "Adviser is required"

                });

            }


            // ------------------------------------------------
            // FIND ADVISER
            // ------------------------------------------------

            const adviser =
                await Adviser.findById(
                    adviserId
                );


            if (!adviser) {

                return res.status(404).json({

                    message:
                        "Adviser not found"

                });

            }


            // ------------------------------------------------
            // CREATE REQUEST
            // ------------------------------------------------

            const request =
                await AdviceRequest.create({

                    userId:
                        req.session.data,

                    adviserId,

                    category,

                    subcategory,

                    budget,

                    status:
                        'active'

                });


            // ------------------------------------------------
            // NOTIFY THE ADVISER IN REAL TIME
            // ------------------------------------------------

            const requester =
                await signupSchema
                    .findById(req.session.data)
                    .select('username');


            io
                .to(`adviser_${adviserId}`)
                .emit('new_advice_request', {

                    _id:
                        request._id,

                    userName:
                        requester ? requester.username : 'A user',

                    category:
                        request.category,

                    subcategory:
                        request.subcategory,

                    budget:
                        request.budget,

                    createdAt:
                        request.createdAt

                });


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            res.json({

                message:
                    "Request created",

                request: {

                    _id:
                        request._id,

                    adviserName:
                        adviser.name,

                    adviserSpecialty:
                        adviser.specialty

                }

            });


        } catch (error) {

            console.log(
                "ADVICE REQUEST ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// GET MY ADVICE REQUESTS
// ======================================================

app.get(
    '/advice/mine',
    requireAnyLogin,
    async (req, res) => {

        try {

            let filter;


            if (
                req.session.role ===
                'adviser'
            ) {

                filter = {

                    adviserId:
                        req.session.data

                };

            } else {

                filter = {

                    userId:
                        req.session.data

                };

            }


            const requests =
                await AdviceRequest
                    .find(filter)

                    .populate(
                        'adviserId',
                        'name specialty'
                    )

                    .populate(
                        'userId',
                        'username'
                    )

                    .sort({
                        createdAt: -1
                    });


            res.json({

                requests

            });


        } catch (error) {

            console.log(
                "MY ADVICE ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// GET CHAT MESSAGES
// ======================================================

app.get(
    '/advice/:id/messages',
    requireAnyLogin,
    async (req, res) => {

        try {

            // ------------------------------------------------
            // FIND REQUEST
            // ------------------------------------------------

            const request =
                await AdviceRequest.findById(
                    req.params.id
                );


            if (!request) {

                return res.status(404).json({

                    message:
                        "Not found"

                });

            }


            // ------------------------------------------------
            // CHECK PARTICIPANT
            // ------------------------------------------------

            const isParticipant =

                String(request.userId) ===
                String(req.session.data)

                ||

                String(request.adviserId) ===
                String(req.session.data);


            // Admin is also allowed

            if (
                !isParticipant &&
                req.session.role !== 'admin'
            ) {

                return res.status(403).json({

                    message:
                        "Forbidden"

                });

            }


            // ------------------------------------------------
            // GET MESSAGES
            // ------------------------------------------------

            const messages =
                await Message
                    .find({

                        requestId:
                            req.params.id

                    })
                    .sort({
                        createdAt: 1
                    });


            res.json({

                messages

            });


        } catch (error) {

            console.log(
                "GET MESSAGES ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Server Error"

            });

        }

    }
);


// ======================================================
// HTTP SERVER
// ======================================================

const httpServer =
    createServer(app);


// ======================================================
// SOCKET.IO
// ======================================================

const io =
    new SocketIOServer(
        httpServer,
        {

            cors: {

                origin: true,

                credentials: true

            }

        }
    );


// ======================================================
// SHARE EXPRESS SESSION WITH SOCKET.IO
// ======================================================

const wrapMiddleware =
    middleware =>
        (socket, next) =>
            middleware(
                socket.request,
                {},
                next
            );


io.use(
    wrapMiddleware(
        sessionMiddleware
    )
);


// ======================================================
// SOCKET AUTHENTICATION
// ======================================================

io.use(
    (socket, next) => {

        const socketSession =
            socket.request.session;


        if (
            !socketSession ||
            !socketSession.data
        ) {

            return next(
                new Error(
                    "Not logged in"
                )
            );

        }


        next();

    }
);


// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on(
    'connection',
    (socket) => {

        const socketSession =
            socket.request.session;


        const role =
            socketSession.role;


        const id =
            socketSession.data;


        console.log(
            "Socket connected:",
            socket.id,
            "Role:",
            role,
            "ID:",
            id
        );


        // ==================================================
        // ADVISER PERSONAL ROOM
        // Lets us push a notification straight to this adviser
        // the moment a user creates an advice request for them,
        // without them needing to have a chat open yet.
        // ==================================================

        if (
            role === 'adviser' &&
            id
        ) {

            socket.join(
                `adviser_${id}`
            );

        }


        // ==================================================
        // JOIN ADVICE REQUEST
        // ==================================================

        socket.on(
            'join_request',
            async ({ requestId }) => {

                try {

                    if (!requestId) {
                        return;
                    }


                    // ------------------------------------------------
                    // FIND REQUEST
                    // ------------------------------------------------

                    const request =
                        await AdviceRequest.findById(
                            requestId
                        );


                    if (!request) {

                        console.log(
                            "Request not found:",
                            requestId
                        );

                        return;

                    }


                    // ------------------------------------------------
                    // CHECK PARTICIPANT
                    // ------------------------------------------------

                    const isParticipant =

                        (
                            role === 'user' &&
                            String(
                                request.userId
                            ) ===
                            String(id)
                        )

                        ||

                        (
                            role === 'adviser' &&
                            String(
                                request.adviserId
                            ) ===
                            String(id)
                        );


                    if (!isParticipant) {

                        console.log(
                            "Socket participant check failed"
                        );

                        return;

                    }


                    // ------------------------------------------------
                    // JOIN ROOM
                    // ------------------------------------------------

                    socket.join(
                        `request_${requestId}`
                    );


                    console.log(
                        "Joined room:",
                        `request_${requestId}`
                    );


                    // ------------------------------------------------
                    // LOAD OLD MESSAGES
                    // ------------------------------------------------

                    const messages =
                        await Message
                            .find({
                                requestId
                            })
                            .sort({
                                createdAt: 1
                            });


                    socket.emit(
                        'chat_history',
                        messages
                    );


                } catch (error) {

                    console.log(
                        "JOIN REQUEST ERROR:",
                        error
                    );

                }

            }
        );


        // ==================================================
        // SEND MESSAGE
        // ==================================================

        socket.on(
            'send_message',
            async ({
                requestId,
                text
            }) => {

                try {

                    // ------------------------------------------------
                    // CHECK TEXT
                    // ------------------------------------------------

                    if (
                        !text ||
                        !text.trim()
                    ) {

                        return;

                    }


                    if (!requestId) {

                        return;

                    }


                    // ------------------------------------------------
                    // FIND REQUEST
                    // ------------------------------------------------

                    const request =
                        await AdviceRequest.findById(
                            requestId
                        );


                    if (!request) {

                        return;

                    }


                    // ------------------------------------------------
                    // CHECK PARTICIPANT
                    // ------------------------------------------------

                    const isParticipant =

                        (
                            role === 'user' &&
                            String(
                                request.userId
                            ) ===
                            String(id)
                        )

                        ||

                        (
                            role === 'adviser' &&
                            String(
                                request.adviserId
                            ) ===
                            String(id)
                        );


                    if (!isParticipant) {

                        return;

                    }


                    // ------------------------------------------------
                    // CREATE MESSAGE
                    // ------------------------------------------------

                    const message =
                        await Message.create({

                            requestId,

                            senderRole:
                                role,

                            senderId:
                                id,

                            text:
                                text.trim()

                        });


                    // ------------------------------------------------
                    // SEND TO BOTH USERS
                    // ------------------------------------------------

                    io
                        .to(
                            `request_${requestId}`
                        )
                        .emit(
                            'receive_message',
                            message
                        );


                } catch (error) {

                    console.log(
                        "SEND MESSAGE ERROR:",
                        error
                    );

                }

            }
        );


        // ==================================================
        // SOCKET DISCONNECT
        // ==================================================

        socket.on(
            'disconnect',
            () => {

                console.log(
                    "Socket disconnected:",
                    socket.id
                );

            }
        );

    }
);


// ======================================================
// START SERVER
// ======================================================

httpServer.listen(
    port,
    () => {

        console.log("");
        console.log(
            "=========================================="
        );

        console.log(
            "        WISEFIND SERVER RUNNING"
        );

        console.log(
            "=========================================="
        );

        console.log("");

        console.log(
            `http://localhost:${port}`
        );

        console.log("");

        console.log(
            "Admin login:"
        );

        console.log(
            `http://localhost:${port}/admin-login`
        );

        console.log("");

        console.log(
            "=========================================="
        );

    }
);