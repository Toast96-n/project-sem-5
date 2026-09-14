import express from 'express'
import bcrypt, { hash } from 'bcrypt';
import session from 'express-session';
import mongoose from 'mongoose';
import { signupSchema } from './models.js';
import { scraptwo } from "./test_scraper.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { hashpasstoken } from './models.js';

let connect = await mongoose.connect('mongodb://localhost:27017/ProductSuggestion')
const app = express();
const port = 4005;

app.use(express.json())
app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
    cookie:{
        maxAge: 30 * 60 * 1000
    }
}))

app.get('/', (req,res)=>{


     res.sendFile('C:/Users/dhru_/Desktop/project sem 5/landingpage.html');
});


app.post('/signin',async(req,res)=>{
    let {email,username,password,signupInterest,suggestionCategoriesGroup} = req.body;
    

    

    let hashpass = await bcrypt.hash(password,10);
   
    
    const signinData = new signupSchema({
        
        email,
        username,
        password:hashpass,
        signupInterest,
        suggestionCategoriesGroup
    });

    let data = await signinData.save();

    if(data){
        res.json({message:"succesful registration"});
    }else{
        console.log(error.msg())
    }

});


function dashboard(req, res, user) {
    if (!req.session.data) {
        return res.redirect('/login');
    }

    return res.json({
        message: "logged in",
        user: {
            name: user.username,
            email: user.email
        }
    });
}

app.get('/dashboard', async (req, res) => {
    try {
        if (!req.session.data) {
            return res.redirect('/login');
        }

        const user = await signupSchema.findById(req.session.data);

        if (!user) {
            return res.redirect('/login');
        }

        return dashboard(req, res, user);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server Error"
        });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { email, pass } = req.body;

        const user = await signupSchema.findOne({ email });

        if (!user) {
            return res.json({
                message: "Register First"
            });
        }

        const isMatch = await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            return res.json({
                message: "Wrong Password"
            });
        }

        // Save user ID in session
        req.session.data = user._id;
        req.session.cookie.maxAge = 30 * 60 * 1000;

        console.log("Login successful");
        console.log("Session ID:", req.sessionID);

        // Send user data back
        return dashboard(req, res, user);

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Server Error"
        });
    }
});

        app.post('/forget',async(req,res)=>{
            try{
                const {email} = req.body;
                const token = await crypto.randomBytes(32).toString('hex');
            let hashtoken = await crypto.createHash('sha256').update(token).digest('hex');
        
            console.log(token)
            const transport = nodemailer.createTransport({
                host:'smtp.gmail.com',
                secure:true,
                port:465,
                auth:{
                    user:'ps9023079938@gmail.com',
                    pass:'cbom qqvy txey wtjw'
                }
            })
        
            let to=email;
            let sub = 'Your Reset password Request'
            let msg = `
            <p>The Email is Send Sucessfully</p>
                <a href='http://localhost:${port}/reset-password?token=${token}'>Reset Password</a>
            `;
        
               function sendMail(to,sub,msg){
                transport.sendMail({
                    to,
                    subject:sub,
                    html:msg
                })
           }
        
           sendMail(to,sub,msg);
           console.log(req.body.email);
           let findemail = await signupSchema.findOne({email:email})
        
           if(!findemail){
            console.log({errormsg:"The User is not Register"});
            res.json(findemail);
           }else{
                const tokensave = new hashpasstoken({
                userId:findemail._id,
                hashToken:hashtoken,
                exprireAt: new Date(Date.now() + 10 * 60 * 1000)
            });
        
            let save = await tokensave.save();
             if(save){
                console.log({message:"the Token is Sucessully Send In Email"});
                res.json({message:"Email is Sucessfully Send"});
            }
        }
            }catch(err){
                console.log(err.message)
            }
})

app.get('/reset-password',async(req,res)=>{
    let token = req.query.token
    console.log(token);
    let hashtokens = crypto.createHash('sha256').update(token).digest('hex');
    let findhash = await hashpasstoken.findOne({hashToken:hashtokens});
    if(findhash){
        console.log({heshtoken : hashtokens});
    }if(findhash.exprireAt < new Date()){
        res.status(400).send("The Token is Expired");
    }if(findhash && findhash.exprireAt > new Date()){
        console.log({message:"The Token is Verified"});
        res.redirect('/updatepass');
    }else{
        res.status(401).send({error:"The Token is invalid and Expired"});
    }

})

app.get('/updatepass',(req,res)=>{
   res.send(`<script> alert("the request is send sucessfully");</script>`)
})


app.post("/product",async (req,res)=>{

     const { search,budget } = req.body;

        if (!search) {
            return res.status(400).json({
                error: "Search is required"
            });
        }

  const result = await scraptwo(search+" under "+budget);
  
   return  res.json(result);

});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            message: "Logged out successfully"
        });
    });
});


app.listen(port ,()=>{
    console.log(`http://localhost:${port}`)
});
