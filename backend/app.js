import express from 'express'
import bcrypt, { hash } from 'bcrypt';
import session from 'express-session';
import mongoose from 'mongoose';
import { signupSchema } from './model.js';
import { scrap } from "./ai.js";


let connect = await mongoose.connect('mongodb://localhost:27017/ProductSuggestion')
const app = express();
const port = 3000;

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


app.post("/product",async (req,res)=>{

     const { search,budget } = req.body;

        if (!search) {
            return res.status(400).json({
                error: "Search is required"
            });
        }

  const result = await scrap(search+" under "+budget);
  
   return  res.json(result);

});


app.listen(port ,()=>{
    console.log(`http://localhost:${port}`)
});
